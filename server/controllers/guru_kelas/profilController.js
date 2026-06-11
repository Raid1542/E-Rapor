/**
 * Nama File: profilController.js
 * Fungsi: Controller untuk profil guru kelas (edit, ganti password, upload foto)
 */

const db = require('../../config/db');
const bcrypt = require('bcrypt');
const guruModel = require('../../models/admin/guruModel');

/**
 * PUT /profil
 * Update data profil guru kelas
 */
exports.editProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            nama_lengkap,
            email_sekolah,
            niy,
            nuptk,
            jenis_kelamin,
            no_telepon,
            alamat,
            tempat_lahir,
            tanggal_lahir,
        } = req.body;

        if (!nama_lengkap || !email_sekolah) {
            return res.status(400).json({
                message: 'Nama dan email wajib diisi'
            });
        }

        // Update tabel user
        await db.execute(
            'UPDATE user SET nama_lengkap = ?, email_sekolah = ? WHERE id_user = ?',
            [nama_lengkap, email_sekolah, userId]
        );

        // Update tabel guru
        await db.execute(
            `UPDATE guru 
       SET niy = ?, nuptk = ?, jenis_kelamin = ?, no_telepon = ?, alamat = ?, 
           tempat_lahir = ?, tanggal_lahir = ?
       WHERE user_id = ?`,
            [niy, nuptk, jenis_kelamin, no_telepon, alamat, tempat_lahir || null, tanggal_lahir || null, userId]
        );

        // Ambil data terbaru
        const [userRows] = await db.execute(
            'SELECT id_user, nama_lengkap, email_sekolah FROM user WHERE id_user = ?',
            [userId]
        );
        const [guruRows] = await db.execute(
            'SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, tempat_lahir, tanggal_lahir, foto_path FROM guru WHERE user_id = ?',
            [userId]
        );

        if (userRows.length === 0 || guruRows.length === 0) {
            return res.status(404).json({ message: 'Profil tidak ditemukan' });
        }

        const user = {
            id: userRows[0].id_user,
            role: 'guru kelas',
            nama_lengkap: userRows[0].nama_lengkap,
            email_sekolah: userRows[0].email_sekolah,
            niy: guruRows[0].niy,
            nuptk: guruRows[0].nuptk,
            jenis_kelamin: guruRows[0].jenis_kelamin,
            no_telepon: guruRows[0].no_telepon,
            alamat: guruRows[0].alamat,
            tempat_lahir: guruRows[0].tempat_lahir,
            tanggal_lahir: guruRows[0].tanggal_lahir,
            profileImage: guruRows[0].foto_path || null,
        };

        res.json({ message: 'Profil berhasil diperbarui', user });
    } catch (err) {
        console.error('Error edit profil guru:', err);
        res.status(500).json({ message: 'Gagal memperbarui profil' });
    }
};

/**
 * PUT /ganti-password
 * Ganti password akun guru kelas
 */
exports.gantiPassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword || newPassword.length < 8) {
            return res.status(400).json({
                message: 'Password lama & baru wajib, minimal 8 karakter'
            });
        }

        const [rows] = await db.execute(
            'SELECT password FROM user WHERE id_user = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Kata sandi lama salah' });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute(
            'UPDATE user SET password = ? WHERE id_user = ?',
            [newHashedPassword, userId]
        );

        res.json({ message: 'Kata sandi berhasil diubah' });
    } catch (err) {
        console.error('Error ganti password:', err);
        res.status(500).json({ message: 'Gagal mengubah kata sandi' });
    }
};

/**
 * PUT /upload_foto
 * Upload foto profil guru kelas
 */
exports.uploadFotoProfil = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File foto diperlukan' });
        }

        const userId = req.user.id;
        const fotoPath = `/uploads/${req.file.filename}`;
        const success = await guruModel.updateFoto(userId, fotoPath);

        if (!success) {
            return res.status(404).json({ message: 'Guru tidak ditemukan di database' });
        }

        res.json({
            success: true,
            message: 'Foto profil berhasil diupload',
            fotoPath,
        });
    } catch (err) {
        console.error('Error upload foto profil guru kelas:', err);
        res.status(500).json({ message: 'Gagal mengupload foto profil' });
    }
};

module.exports = exports;