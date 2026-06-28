/**
 * Nama File: dashboardController.js
 * Fungsi: Controller untuk statistik dashboard admin dan upload foto profil.
 *         Menyediakan data agregat (jumlah guru, siswa, admin, dll) dan status periode penilaian.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const guruModel = require('../../models/admin/guruModel');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET DASHBOARD STATISTICS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/dashboard/stats
 * Ambil statistik dashboard: jumlah guru, siswa, admin, ekskul, kelas, mapel.
 * Termasuk informasi tahun ajaran aktif dan status PTS/PAS.
 */
const getDashboardStats = async (req, res) => {
    try {
        // Step 1: Ambil tahun ajaran aktif
        const [taAktif] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, tahun_ajaran,
                    status_pts, status_pas
            FROM tahun_ajaran 
            WHERE status = 'aktif' 
            LIMIT 1
        `);

        // Return kosong jika tidak ada tahun ajaran aktif
        if (taAktif.length === 0) {
            return res.json({
                success: true,
                data: {
                    guru: 0, siswa: 0, admin: 0,
                    ekstrakurikuler: 0, kelas: 0, mata_pelajaran: 0,
                    tahun_ajaran: null,
                    semester: null,
                    status_pts: 'nonaktif',
                    status_pas: 'nonaktif'
                }
            });
        }

        const taIdDetail = taAktif[0].id_tahun_ajaran;
        const taIdInduk = taAktif[0].id_tahun_ajaran_induk;
        const semesterAktif = taAktif[0].semester;
        const tahunAjaran = taAktif[0].tahun_ajaran;
        const statusPTS = taAktif[0].status_pts || 'nonaktif';
        const statusPAS = taAktif[0].status_pas || 'nonaktif';

        // Step 2: Count data master
        const [guruRows] = await db.execute(`
            SELECT COUNT(DISTINCT u.id_user) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role IN ('guru_kelas', 'guru_bidang_studi')
                AND u.status = 'aktif'
        `);

        const [siswaRows] = await db.execute(`
            SELECT COUNT(DISTINCT s.id_siswa) AS total
            FROM siswa s
            WHERE s.status = 'aktif'
        `);

        const [adminRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role = 'admin' AND u.status = 'aktif'
        `);

        const [ekskulRows] = await db.execute(`
            SELECT COUNT(*) AS total FROM ekstrakurikuler
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);

        const [kelasRows] = await db.execute(`
            SELECT COUNT(*) AS total FROM kelas
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);

        const [mapelRows] = await db.execute(`
            SELECT COUNT(*) AS total FROM mata_pelajaran
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);

        // Step 3: Return response
        res.json({
            success: true,
            data: {
                guru: Number(guruRows[0].total) || 0,
                siswa: Number(siswaRows[0].total) || 0,
                admin: Number(adminRows[0].total) || 0,
                ekstrakurikuler: Number(ekskulRows[0].total) || 0,
                kelas: Number(kelasRows[0].total) || 0,
                mata_pelajaran: Number(mapelRows[0].total) || 0,
                tahun_ajaran: tahunAjaran,
                semester: semesterAktif,
                id_detail: taIdDetail,
                status_pts: statusPTS,
                status_pas: statusPAS
            }
        });
    } catch (err) {
        console.error('Error getDashboardStats:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat statistik dashboard'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPLOAD PROFILE PHOTO
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/admin/upload-foto
 * Upload foto profil admin/guru.
 */
const uploadFotoProfil = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File foto diperlukan' });
        }

        const userId = req.user.id;
        const fotoPath = `/uploads/${req.file.filename}`;

        // Simpan path ke database
        const success = await guruModel.updateFoto(userId, fotoPath);

        if (!success) {
            return res.status(404).json({ message: 'Guru tidak ditemukan' });
        }

        res.json({
            success: true,
            message: 'Foto profil berhasil diupload',
            fotoPath,
        });
    } catch (err) {
        console.error('Error upload foto profil:', err);
        res.status(500).json({ message: 'Gagal mengupload foto profil' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    getDashboardStats,
    uploadFotoProfil
};