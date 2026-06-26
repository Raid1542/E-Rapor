/**
 * Nama File: absensiController.js
 * Fungsi: Controller untuk absensi siswa guru kelas
 * ✅ FIXED: Gunakan req.infoKelasWali dari middleware
 */

const absensiModel = require('../../models/guru_kelas/absensiModel');
const db = require('../../config/db');

/**
 * GET /absensi/:jenis/:semester
 * ✅ FIXED: Pakai req.infoKelasWali dari middleware cekGuruKelasDitugaskan
 * ✅ FIXED: Typo izin_total → row.izin_total
 */
exports.getAbsensiSiswa = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jenis, semester } = req.penilaianContext || {};

        console.log('📥 GET absensi - Request:', {
            userId,
            jenis,
            semester,
            infoKelasWali: req.infoKelasWali
        });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
            });
        }

        // ✅ PAKAI data dari middleware (sudah ter-set)
        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({
                success: false,
                message: 'Data kelas tidak ditemukan. Silakan hubungi admin.'
            });
        }

        const kelasId = infoKelas.kelas_id;
        const namaKelas = infoKelas.nama_kelas;
        
        // ✅ Ambil tahun ajaran aktif (semester_id untuk query absensi)
        const tahunAjaranId = req.idSemesterAktif;  // ← semester_id = 2
        
        console.log('📚 Processed:', { 
            kelasId, 
            namaKelas, 
            tahunAjaranId,
            idInduk: req.idTahunAjaranInduk
        });

        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({
                success: false,
                message: 'Data tahun ajaran atau kelas tidak valid'
            });
        }

        // 2. Ambil data absensi dari model
        const absensiList = await absensiModel.getAbsensiByKelas(kelasId, tahunAjaranId);
        console.log('📋 Absensi list:', absensiList.length, 'siswa');

        // 3. Format data sesuai jenis penilaian
        const formattedData = absensiList.map(row => {
            if (jenis === 'PTS') {
                return {
                    id_siswa: row.id_siswa,
                    nama: row.nama_lengkap,
                    nis: row.nis || '',
                    nisn: row.nisn || '',
                    sakit: row.sakit_pts,
                    izin: row.izin_pts,
                    alpha: row.alpha_pts,
                    sudah_diinput: row.sudah_diinput === 1
                };
            } else {
                // ✅ FIXED: Typo izin_total → row.izin_total
                return {
                    id_siswa: row.id_siswa,
                    nama: row.nama_lengkap,
                    nis: row.nis || '',
                    nisn: row.nisn || '',
                    sakit: row.sakit_total,
                    izin: row.izin_total,  // ✅ FIXED!
                    alpha: row.alpha_total,
                    sudah_diinput: row.sudah_diinput === 1,
                    pts_sakit: row.sakit_pts,
                    pts_izin: row.izin_pts,
                    pts_alpha: row.alpha_pts
                };
            }
        });

        // 4. Return response
        res.json({
            success: true,
            data: {
                kelas_id: kelasId,
                kelas: namaKelas,
                jenis_penilaian: jenis,
                semester: semester,
                absensi: formattedData,
                total: formattedData.length
            }
        });

    } catch (err) {
        console.error('❌ Error getAbsensiSiswa:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data absensi',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * POST /absensi
 * ✅ FIXED: Ambil jenis dari body, pakai req.infoKelasWali
 */
exports.upsertAbsensi = async (req, res) => {
    try {
        const userId = req.user?.id;
        const jenis = req.body.jenis?.toUpperCase() || req.penilaianContext?.jenis;
        const semester = req.body.semester || req.penilaianContext?.semester;
        const { siswa_id, sakit, izin, alpha } = req.body;

        console.log('📥 POST absensi:', { userId, jenis, semester, siswa_id, sakit, izin, alpha });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
            });
        }

        if (!jenis || !['PTS', 'PAS'].includes(jenis)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis harus PTS atau PAS'
            });
        }

        if (!siswa_id) {
            return res.status(400).json({
                success: false,
                message: 'ID siswa wajib diisi'
            });
        }

        const nilaiSakit = parseInt(sakit) || 0;
        const nilaiIzin = parseInt(izin) || 0;
        const nilaiAlpha = parseInt(alpha) || 0;

        // Validasi tidak negatif
        if (nilaiSakit < 0 || nilaiIzin < 0 || nilaiAlpha < 0) {
            return res.status(400).json({
                success: false,
                message: 'Nilai absensi tidak boleh negatif'
            });
        }

        // Validasi maksimal absensi
        const MAX_ABSEN = 90;
        if (nilaiSakit > MAX_ABSEN || nilaiIzin > MAX_ABSEN || nilaiAlpha > MAX_ABSEN) {
            return res.status(400).json({
                success: false,
                message: `Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari`
            });
        }

        const totalHari = nilaiSakit + nilaiIzin + nilaiAlpha;
        if (totalHari > MAX_ABSEN) {
            return res.status(400).json({
                success: false,
                message: `Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari`
            });
        }

        // ✅ PAKAI data dari middleware
        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({
                success: false,
                message: 'Data kelas tidak ditemukan. Silakan hubungi admin.'
            });
        }

        const kelasId = infoKelas.kelas_id;
        const tahunAjaranId = req.idSemesterAktif;  // ← semester_id untuk absensi

        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({
                success: false,
                message: 'Data tahun ajaran atau kelas tidak valid'
            });
        }

        // Validasi PTS vs PAS
        if (jenis === 'PAS') {
            const ptsData = await absensiModel.checkPTSExists(siswa_id, tahunAjaranId);

            if (ptsData) {
                if (nilaiSakit < ptsData.sakit_pts) {
                    return res.status(400).json({
                        success: false,
                        message: `Total sakit (${nilaiSakit}) tidak boleh kurang dari PTS (${ptsData.sakit_pts})`
                    });
                }
                if (nilaiIzin < ptsData.izin_pts) {
                    return res.status(400).json({
                        success: false,
                        message: `Total izin (${nilaiIzin}) tidak boleh kurang dari PTS (${ptsData.izin_pts})`
                    });
                }
                if (nilaiAlpha < ptsData.alpha_pts) {
                    return res.status(400).json({
                        success: false,
                        message: `Total alpha (${nilaiAlpha}) tidak boleh kurang dari PTS (${ptsData.alpha_pts})`
                    });
                }
            }
        }

        // Validasi siswa terdaftar
        const [siswaCheck] = await db.execute(
            `SELECT 1 FROM siswa_kelas sk
            WHERE sk.siswa_id = ? 
            AND sk.kelas_id = ?
            AND sk.id_tahun_ajaran_induk = ?`,
            [siswa_id, kelasId, req.idTahunAjaranInduk]  // ← Pakai id_induk
        );

        if (siswaCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Siswa tidak terdaftar di kelas Anda'
            });
        }

        // Simpan data
        if (jenis === 'PTS') {
            await absensiModel.upsertAbsensiPTS(
                siswa_id, kelasId, tahunAjaranId,
                nilaiSakit, nilaiIzin, nilaiAlpha
            );
        } else {
            await absensiModel.upsertAbsensiPAS(
                siswa_id, kelasId, tahunAjaranId,
                nilaiSakit, nilaiIzin, nilaiAlpha
            );
        }

        res.json({
            success: true,
            message: `Absensi ${jenis} berhasil disimpan`
        });
    } catch (err) {
        console.error('❌ Error upsertAbsensi:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan absensi',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};