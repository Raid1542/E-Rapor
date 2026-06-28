/**
 * Nama File: absensiController.js
 * Fungsi: Controller untuk manajemen absensi siswa oleh guru kelas.
 *         Menangani pengambilan dan penyimpanan data absensi (sakit, izin, alpha)
 *         untuk periode PTS dan PAS dengan validasi kelengkapan data.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const absensiModel = require('../../models/guru_kelas/absensiModel');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET ABSENSI SISWA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/absensi/:jenis/:semester
 * Ambil data absensi siswa untuk kelas yang diajar guru.
 * 
 * Fitur:
 *   - Gunakan data kelas dari middleware (req.infoKelasWali)
 *   - Format data sesuai jenis penilaian (PTS/PAS)
 *   - Untuk PAS: include data PTS sebagai referensi
 * 
 * @param {string} req.penilaianContext.jenis - Jenis penilaian (PTS/PAS)
 * @param {string} req.penilaianContext.semester - Nama semester
 * @param {Object} req.infoKelasWali - Info kelas dari middleware
 */
exports.getAbsensiSiswa = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jenis, semester } = req.penilaianContext || {};

        console.log('GET absensi - Request:', {
            userId,
            jenis,
            semester,
            infoKelasWali: req.infoKelasWali
        });

        // Validasi autentikasi
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
            });
        }

        // Ambil data kelas dari middleware
        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({
                success: false,
                message: 'Data kelas tidak ditemukan. Silakan hubungi admin.'
            });
        }

        const kelasId = infoKelas.kelas_id;
        const namaKelas = infoKelas.nama_kelas;
        
        // Ambil semester ID untuk query absensi
        const tahunAjaranId = req.idSemesterAktif;

        console.log('Processed:', { 
            kelasId, 
            namaKelas, 
            tahunAjaranId,
            idInduk: req.idTahunAjaranInduk
        });

        // Validasi data tahun ajaran dan kelas
        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({
                success: false,
                message: 'Data tahun ajaran atau kelas tidak valid'
            });
        }

        // Ambil data absensi dari model
        const absensiList = await absensiModel.getAbsensiByKelas(kelasId, tahunAjaranId);
        console.log('Absensi list:', absensiList.length, 'siswa');

        // Format data sesuai jenis penilaian
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
                // Untuk PAS: include data PTS sebagai referensi
                return {
                    id_siswa: row.id_siswa,
                    nama: row.nama_lengkap,
                    nis: row.nis || '',
                    nisn: row.nisn || '',
                    sakit: row.sakit_total,
                    izin: row.izin_total,
                    alpha: row.alpha_total,
                    sudah_diinput: row.sudah_diinput === 1,
                    pts_sakit: row.sakit_pts,
                    pts_izin: row.izin_pts,
                    pts_alpha: row.alpha_pts
                };
            }
        });

        // Return response
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
        console.error('Error getAbsensiSiswa:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data absensi',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPSERT ABSENSI
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/guru-kelas/absensi
 * Simpan atau update data absensi siswa untuk PTS atau PAS.
 * 
 * Validasi:
 *   - Nilai absensi tidak boleh negatif
 *   - Total absensi tidak boleh lebih dari 90 hari
 *   - Untuk PAS: nilai tidak boleh kurang dari PTS
 *   - Siswa harus terdaftar di kelas guru
 * 
 * Business Rules:
 *   - PTS: simpan ke kolom sakit_pts, izin_pts, alpha_pts
 *   - PAS: simpan ke kolom sakit_total, izin_total, alpha_total
 *   - PAS harus >= PTS (karena PAS adalah total akumulasi)
 * 
 * @param {string} req.body.jenis - Jenis penilaian (PTS/PAS)
 * @param {string} req.body.semester - Nama semester
 * @param {number} req.body.siswa_id - ID siswa
 * @param {number} req.body.sakit - Jumlah hari sakit
 * @param {number} req.body.izin - Jumlah hari izin
 * @param {number} req.body.alpha - Jumlah hari alpha
 */
exports.upsertAbsensi = async (req, res) => {
    try {
        const userId = req.user?.id;
        const jenis = req.body.jenis?.toUpperCase() || req.penilaianContext?.jenis;
        const semester = req.body.semester || req.penilaianContext?.semester;
        const { siswa_id, sakit, izin, alpha } = req.body;

        console.log('POST absensi:', { userId, jenis, semester, siswa_id, sakit, izin, alpha });

        // Validasi autentikasi
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
            });
        }

        // Validasi jenis penilaian
        if (!jenis || !['PTS', 'PAS'].includes(jenis)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis harus PTS atau PAS'
            });
        }

        // Validasi ID siswa
        if (!siswa_id) {
            return res.status(400).json({
                success: false,
                message: 'ID siswa wajib diisi'
            });
        }

        // Sanitasi dan validasi nilai absensi
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

        // Validasi maksimal absensi per komponen
        const MAX_ABSEN = 90;
        if (nilaiSakit > MAX_ABSEN || nilaiIzin > MAX_ABSEN || nilaiAlpha > MAX_ABSEN) {
            return res.status(400).json({
                success: false,
                message: `Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari`
            });
        }

        // Validasi total absensi
        const totalHari = nilaiSakit + nilaiIzin + nilaiAlpha;
        if (totalHari > MAX_ABSEN) {
            return res.status(400).json({
                success: false,
                message: `Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari`
            });
        }

        // Ambil data kelas dari middleware
        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({
                success: false,
                message: 'Data kelas tidak ditemukan. Silakan hubungi admin.'
            });
        }

        const kelasId = infoKelas.kelas_id;
        const tahunAjaranId = req.idSemesterAktif;

        // Validasi data tahun ajaran dan kelas
        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({
                success: false,
                message: 'Data tahun ajaran atau kelas tidak valid'
            });
        }

        // Validasi PTS vs PAS (PAS harus >= PTS)
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

        // Validasi siswa terdaftar di kelas
        const [siswaCheck] = await db.execute(
            `SELECT 1 FROM siswa_kelas sk
            WHERE sk.siswa_id = ? 
            AND sk.kelas_id = ?
            AND sk.id_tahun_ajaran_induk = ?`,
            [siswa_id, kelasId, req.idTahunAjaranInduk]
        );

        if (siswaCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Siswa tidak terdaftar di kelas Anda'
            });
        }

        // Simpan data absensi
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
        console.error('Error upsertAbsensi:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan absensi',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};