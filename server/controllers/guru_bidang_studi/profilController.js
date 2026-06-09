/**
 * Nama File: profilController.js
 * Fungsi: Mengelola profil guru bidang studi (lihat, edit, ganti password, upload foto)
 */

const db = require('../../config/db');
const bcrypt = require('bcrypt');

/**
 * 1. LIHAT PROFIL
 * GET /api/guru-bidang-studi/profil
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
            `SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, foto_path 
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

        // Gabungkan data
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
            message: 'Gagal mengambil profil'
        });
    }
};

/**
 * 2. EDIT PROFIL
 * PUT /api/guru-bidang-studi/profil
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
        } = req.body;

        // Validasi
        if (!nama_lengkap || !email_sekolah) {
            return res.status(400).json({
                success: false,
                message: 'Nama dan email wajib diisi'
            });
        }

        const userId = req.user.id;

        // Update tabel user
        await db.execute(
            `UPDATE user 
        SET nama_lengkap = ?, email_sekolah = ? 
        WHERE id_user = ?`,
            [nama_lengkap, email_sekolah, userId]
        );

        // Update tabel guru
        await db.execute(
            `UPDATE guru 
        SET niy = ?, nuptk = ?, jenis_kelamin = ?, no_telepon = ?, alamat = ? 
        WHERE user_id = ?`,
            [niy, nuptk, jenis_kelamin, no_telepon, alamat, userId]
        );

        // Ambil data terbaru
        const [userRows] = await db.execute(
            `SELECT id_user, nama_lengkap, email_sekolah 
        FROM user 
        WHERE id_user = ?`,
            [userId]
        );

        const [guruRows] = await db.execute(
            `SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, foto_path 
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
            message: 'Gagal memperbarui profil'
        });
    }
};

/**
 * 3. GANTI PASSWORD
 * PUT /api/guru-bidang-studi/ganti-password
 */
exports.gantiPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validasi
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

        // Ambil password lama dari database
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

        // Cek password lama
        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Kata sandi lama salah'
            });
        }

        // Hash password baru
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
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

/**
 * 4. UPLOAD FOTO PROFIL
 * PUT /api/guru-bidang-studi/upload-foto
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

        // Update path foto di database
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