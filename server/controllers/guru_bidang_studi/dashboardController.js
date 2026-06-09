/**
 * Nama File: dashboardController.js
 * Fungsi: Mengelola data dashboard guru bidang studi
 *         FIXED: Gunakan id_tahun_ajaran (bukan id_tahun_ajaran_induk)
 */

const db = require('../../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // STEP 1: Ambil Tahun Ajaran Aktif
        const [taRows] = await db.execute(`
            SELECT 
                ta.id_tahun_ajaran,
                ta.id_tahun_ajaran_induk,
                ta.tahun_ajaran,
                ta.semester,
                ta.status_pts,
                ta.status_pas
            FROM tahun_ajaran ta
            WHERE ta.status = 'aktif'
            LIMIT 1
        `);

        if (taRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran aktif tidak ditemukan.',
            });
        }

        const tahunAjaranId = taRows[0].id_tahun_ajaran;
        const { tahun_ajaran, semester, status_pts, status_pas } = taRows[0];

        // STEP 2: Query Mata Pelajaran yang Diajar
        const [mapelRows] = await db.execute(`
            SELECT 
                mp.id_mata_pelajaran,
                mp.nama_mapel AS nama,
                COUNT(DISTINCT p.kelas_id) AS total_kelas,
                (
                    SELECT COUNT(DISTINCT sk.siswa_id)
                    FROM siswa_kelas sk
                    WHERE sk.kelas_id IN (
                        SELECT p2.kelas_id 
                        FROM pembelajaran p2
                        WHERE p2.user_id = ? 
                            AND p2.mapel_id = mp.id_mata_pelajaran
                            AND p2.tahun_ajaran_id = ?
                    )
                    AND sk.tahun_ajaran_id = ?
                ) AS total_siswa
            FROM pembelajaran p
            INNER JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
            WHERE p.user_id = ? 
                AND p.tahun_ajaran_id = ?
            GROUP BY mp.id_mata_pelajaran, mp.nama_mapel
            ORDER BY mp.nama_mapel
        `, [userId, tahunAjaranId, tahunAjaranId, userId, tahunAjaranId]);

        if (mapelRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda belum ditugaskan mengajar di tahun ajaran aktif ini.',
            });
        }

        // STEP 3: Format Data
        const mataPelajaranList = mapelRows.map(row => ({
            nama: row.nama,
            total_kelas: Number(row.total_kelas) || 0,
            total_siswa: Number(row.total_siswa) || 0,
            sudah_dinilai: 0,
            belum_dinilai: Number(row.total_siswa) || 0,
        }));

        // STEP 4: Tentukan Jenis Penilaian Aktif
        let jenis_penilaian_aktif = null;
        if (status_pts === 'aktif') {
            jenis_penilaian_aktif = 'PTS';
        } else if (status_pas === 'aktif') {
            jenis_penilaian_aktif = 'PAS';
        }

        // STEP 5: Return
        res.json({
            success: true,
            data: {
                tahun_ajaran,
                semester,
                jenis_penilaian_aktif,
                mata_pelajaran_list: mataPelajaranList,
            },
        });

    } catch (err) {
        console.error('Error getDashboardData:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data dashboard.',
        });
    }
};