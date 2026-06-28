/**
 * Nama File: profilController.js
 * Fungsi: Controller untuk manajemen profil guru bidang studi.
 *         Menangani pengambilan, edit profil, ganti password, dan upload foto.
 *         Data profil tersebar di 2 tabel: user (nama, email) dan guru (data lainnya).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const bcrypt = require('bcrypt');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET PROFIL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-bidang-studi/profil
 * Ambil data profil guru bidang studi lengkap.
 * 
 * Response includes:
 *   - Data dari tabel user: id, nama_lengkap, email_sekolah
 *   - Data dari tabel guru: niy, nuptk, jenis_kelamin, no_telepon, alamat,
 *     tempat_lahir, tanggal_lahir, foto_path
 *   - Role: 'guru bidang studi'
 */
exports.getProfil = async (req, res) => {
    try {
        const userId = req.user.id;

        // Ambil data user
        const [userRows] = await db.execute(
            `SELECT id_user, nama_lengkap, email_sekolah 
             FROM user 
             WHERE id_user = ?`,
            [userId]
        );

        // Ambil data guru
        const [guruRows] = await db.execute(
            `SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, 
                    tempat_lahir, tanggal_lahir, foto_path 
             FROM guru 
             WHERE user_id = ?`,
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Gabungkan data user dan guru
        const user = {
            id: userRows[0].id_user,
            role: 'guru bidang studi',
            nama_lengkap: userRows[0].nama_lengkap,
            email_sekolah: userRows[0].email_sekolah,
            niy: guruRows[0]?.niy || null,
            nuptk: guruRows[0]?.nuptk || null,
            jenis_kelamin: guruRows[0]?.jenis_kelamin || null,
            no_telepon: guruRows[0]?.no_telepon || null,
            alamat: guruRows[0]?.alamat || null,
            tempat_lahir: guruRows[0]?.tempat_lahir || null,
            tanggal_lahir: guruRows[0]?.tanggal_lahir || null,
            profileImage: guruRows[0]?.foto_path || null,
        };

        res.json({
            success: true,
            user
        });
    } catch (err) {
        console.error('Error getProfil:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil profil: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. EDIT PROFIL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-bidang-studi/profil
 * Update data profil guru bidang studi.
 * 
 * Update tabel user:
 *   - nama_lengkap, email_sekolah
 * 
 * Update tabel guru:
 *   - niy, nuptk, jenis_kelamin, no_telepon, alamat, tempat_lahir, tanggal_lahir
 * 
 * @param {string} req.body.nama_lengkap - Nama lengkap (wajib)
 * @param {string} req.body.email_sekolah - Email sekolah (wajib)
 * @param {string} req.body.niy - NIY (opsional)
 * @param {string} req.body.nuptk - NUPTK (opsional)
 * @param {string} req.body.jenis_kelamin - Jenis kelamin (opsional)
 * @param {string} req.body.no_telepon - No telepon (opsional)
 * @param {string} req.body.alamat - Alamat (opsional)
 * @param {string} req.body.tempat_lahir - Tempat lahir (opsional)
 * @param {string} req.body.tanggal_lahir - Tanggal lahir (opsional)
 */
exports.editProfil = async (req, res) => {
    try {
        const {
            nama_lengkap,
            email_sekolah,
            niy,
            nuptk,
            jenis_kelamin,
            no_telepon,
            alamat,
            tempat_lahir,
            tanggal_lahir
        } = req.body;

        // Validasi field wajib
        if (!nama_lengkap || !email_sekolah) {
            return res.status(400).json({
                success: false,
                message: 'Nama dan email wajib diisi'
            });
        }

        const userId = req.user.id;

        // Update tabel user (hanya nama & email)
        const [userResult] = await db.execute(
            `UPDATE user 
             SET nama_lengkap = ?, email_sekolah = ? 
             WHERE id_user = ?`,
            [nama_lengkap, email_sekolah, userId]
        );

        // Update tabel guru (data lainnya)
        const [guruResult] = await db.execute(
            `UPDATE guru 
             SET niy = ?, 
                 nuptk = ?, 
                 jenis_kelamin = ?, 
                 no_telepon = ?, 
                 alamat = ?,
                 tempat_lahir = ?,
                 tanggal_lahir = ?
             WHERE user_id = ?`,
            [
                niy || null, 
                nuptk || null, 
                jenis_kelamin || null, 
                no_telepon || null, 
                alamat || null,
                tempat_lahir || null,
                tanggal_lahir || null,
                userId
            ]
        );

        // Ambil data terbaru untuk response
        const [userRows] = await db.execute(
            `SELECT id_user, nama_lengkap, email_sekolah 
             FROM user 
             WHERE id_user = ?`,
            [userId]
        );

        const [guruRows] = await db.execute(
            `SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, 
                    tempat_lahir, tanggal_lahir, foto_path 
             FROM guru 
             WHERE user_id = ?`,
            [userId]
        );

        const user = {
            id: userRows[0].id_user,
            role: 'guru bidang studi',
            nama_lengkap: userRows[0].nama_lengkap,
            email_sekolah: userRows[0].email_sekolah,
            niy: guruRows[0]?.niy || null,
            nuptk: guruRows[0]?.nuptk || null,
            jenis_kelamin: guruRows[0]?.jenis_kelamin || null,
            no_telepon: guruRows[0]?.no_telepon || null,
            alamat: guruRows[0]?.alamat || null,
            tempat_lahir: guruRows[0]?.tempat_lahir || null,
            tanggal_lahir: guruRows[0]?.tanggal_lahir || null,
            profileImage: guruRows[0]?.foto_path || null,
        };

        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            user
        });
    } catch (err) {
        console.error('Error editProfil:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui profil: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. GANTI PASSWORD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-bidang-studi/ganti-password
 * Ganti password dengan verifikasi password lama.
 * 
 * Validasi:
 *   - Password lama dan baru wajib diisi
 *   - Password baru minimal 8 karakter
 *   - Password lama harus cocok dengan yang di database
 * 
 * @param {string} req.body.oldPassword - Password lama
 * @param {string} req.body.newPassword - Password baru (min 8 karakter)
 */
exports.gantiPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validasi input
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password lama dan baru wajib diisi'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal 8 karakter'
            });
        }

        // Ambil password dari database
        const [rows] = await db.execute(
            'SELECT password FROM user WHERE id_user = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Verifikasi password lama
        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Kata sandi lama salah'
            });
        }

        // Hash password baru dan update
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        await db.execute(
            'UPDATE user SET password = ? WHERE id_user = ?',
            [newHashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Kata sandi berhasil diubah'
        });
    } catch (err) {
        console.error('Error gantiPassword:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengubah kata sandi'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. UPLOAD FOTO PROFIL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-bidang-studi/upload-foto
 * Upload foto profil guru.
 * 
 * @param {File} req.file - File foto (dari multer)
 */
exports.uploadFotoProfil = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File foto diperlukan'
            });
        }

        const userId = req.user.id;
        const fotoPath = `/uploads/${req.file.filename}`;

        // Update foto_path di tabel guru
        await db.execute(
            'UPDATE guru SET foto_path = ? WHERE user_id = ?',
            [fotoPath, userId]
        );

        res.json({
            success: true,
            message: 'Foto profil berhasil diupload',
            fotoPath
        });
    } catch (err) {
        console.error('Error uploadFotoProfil:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupload foto'
        });
    }
};