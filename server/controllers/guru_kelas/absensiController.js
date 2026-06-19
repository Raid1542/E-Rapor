/**
 * Nama File: absensiController.js
 * Fungsi: Controller untuk absensi siswa guru kelas
 * UPDATE: Fix undefined parameter error
 */

const absensiModel = require('../../models/guru_kelas/absensiModel');
const db = require('../../config/db');

/**
 * GET /absensi/:jenis/:semester
 */
exports.getAbsensiSiswa = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jenis, semester } = req.penilaianContext || {};

        console.log('📥 GET absensi - Request:', {
            userId,
            jenis,
            semester,
            user: req.user
        });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
            });
        }

        // 1. Ambil info kelas dan tahun ajaran aktif
        const [kelasInfo] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas, gk.tahun_ajaran_id, ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
             WHERE gk.user_id = ? AND ta.status = 'aktif'
             LIMIT 1`,
            [userId]
        );

        console.log('📚 Kelas info raw:', kelasInfo);

        if (kelasInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.'
            });
        }

        // ✅ Ambil tahun ajaran ID dengan fallback
        const tahunAjaranId = kelasInfo[0].id_tahun_ajaran || kelasInfo[0].tahun_ajaran_id;
        const kelasId = kelasInfo[0].kelas_id;
        const namaKelas = kelasInfo[0].nama_kelas;

        console.log('📚 Processed:', { tahunAjaranId, kelasId, namaKelas });

        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({
                success: false,
                message: 'Data tahun ajaran atau kelas tidak valid',
                debug: kelasInfo[0]
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
 * POST /absensi/:jenis/:semester
 */
exports.upsertAbsensi = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jenis, semester } = req.penilaianContext || {};
        const { siswa_id, sakit, izin, alpha } = req.body;

        console.log('📥 POST absensi:', { userId, jenis, semester, siswa_id, sakit, izin, alpha });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
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

        // ✅ Validasi tidak negatif
        if (nilaiSakit < 0 || nilaiIzin < 0 || nilaiAlpha < 0) {
            return res.status(400).json({
                success: false,
                message: 'Nilai absensi tidak boleh negatif'
            });
        }

        // ✅ VALIDASI BARU: Maksimal absensi per kategori (90 hari)
        const MAX_ABSEN = 90;
        if (nilaiSakit > MAX_ABSEN || nilaiIzin > MAX_ABSEN || nilaiAlpha > MAX_ABSEN) {
            return res.status(400).json({
                success: false,
                message: `Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari`
            });
        }

        // ✅ VALIDASI BARU: Total absensi tidak boleh melebihi hari efektif
        const totalHari = nilaiSakit + nilaiIzin + nilaiAlpha;
        if (totalHari > MAX_ABSEN) {
            return res.status(400).json({
                success: false,
                message: `Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari`
            });
        }

        // Ambil info kelas dan tahun ajaran
        const [kelasInfo] = await db.execute(
            `SELECT gk.kelas_id, gk.tahun_ajaran_id, ta.id_tahun_ajaran
             FROM guru_kelas gk
             JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
             WHERE gk.user_id = ? AND ta.status = 'aktif'
             LIMIT 1`,
            [userId]
        );

        if (kelasInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.'
            });
        }

        const tahunAjaranId = kelasInfo[0].id_tahun_ajaran || kelasInfo[0].tahun_ajaran_id;
        const kelasId = kelasInfo[0].kelas_id;

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

        const [siswaCheck] = await db.execute(
            `SELECT 1 FROM siswa_kelas sk
            WHERE sk.siswa_id = ? 
            AND sk.kelas_id = ?
            AND sk.id_tahun_ajaran_induk = (
                SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?
            )`,
            [siswa_id, kelasId, tahunAjaranId]
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