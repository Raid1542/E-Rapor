/**
 * Nama File: profilController.js
 * Fungsi: Controller manajemen profil guru kelas (edit profil, ganti password, upload foto)
 *         Menangani operasi CRUD untuk data profil guru di tabel user dan guru
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const bcrypt = require('bcrypt');
const guruModel = require('../../models/admin/guruModel');

// ═════════════════════════════════════════════════════════════════════════════
// 1. EDIT PROFIL
// ═════════════════════════════════════════════════════════════════════════════

// Update profil guru (tabel user + guru)
exports.editProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nama_lengkap, email_sekolah, niy, nuptk, jenis_kelamin, no_telepon, alamat } = req.body;

        // Validasi input wajib
        if (!nama_lengkap || !email_sekolah) {
            return res.status(400).json({ message: 'Nama dan email wajib diisi' });
        }

        // Update data user
        await db.execute(
            'UPDATE user SET nama_lengkap = ?, email_sekolah = ? WHERE id_user = ?',
            [nama_lengkap, email_sekolah, userId]
        );

        // Update data guru
        await db.execute(
            'UPDATE guru SET niy = ?, nuptk = ?, jenis_kelamin = ?, no_telepon = ?, alamat = ? WHERE user_id = ?',
            [niy, nuptk, jenis_kelamin, no_telepon, alamat, userId]
        );

        // Ambil data terbaru untuk response
        const [userRows] = await db.execute(
            'SELECT id_user, nama_lengkap, email_sekolah FROM user WHERE id_user = ?',
            [userId]
        );
        const [guruRows] = await db.execute(
            'SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, foto_path FROM guru WHERE user_id = ?',
            [userId]
        );

        // Validasi data ditemukan
        if (userRows.length === 0 || guruRows.length === 0) {
            return res.status(404).json({ message: 'Profil tidak ditemukan' });
        }

        // Return data profil lengkap
        res.json({
            message: 'Profil berhasil diperbarui',
            user: {
                id: userRows[0].id_user,
                role: 'guru kelas',
                nama_lengkap: userRows[0].nama_lengkap,
                email_sekolah: userRows[0].email_sekolah,
                niy: guruRows[0].niy,
                nuptk: guruRows[0].nuptk,
                jenis_kelamin: guruRows[0].jenis_kelamin,
                no_telepon: guruRows[0].no_telepon,
                alamat: guruRows[0].alamat,
                profileImage: guruRows[0].foto_path || null,
            },
        });
    } catch (err) {
        console.error('Error edit profil:', err);
        res.status(500).json({ message: 'Gagal memperbarui profil' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GANTI PASSWORD
// ═════════════════════════════════════════════════════════════════════════════

// Ganti password user (minimal 8 karakter)
exports.gantiPassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        // Validasi input password
        if (!oldPassword || !newPassword || newPassword.length < 8) {
            return res.status(400).json({
                message: 'Password lama & baru wajib, minimal 8 karakter',
            });
        }

        // Ambil password lama dari database
        const [rows] = await db.execute(
            'SELECT password FROM user WHERE id_user = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        // Verifikasi password lama dengan bcrypt
        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Kata sandi lama salah' });
        }

        // Hash password baru dan update ke database
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE user SET password = ? WHERE id_user = ?', [
            newHashedPassword,
            userId,
        ]);

        res.json({ message: 'Kata sandi berhasil diubah' });
    } catch (err) {
        console.error('Error ganti password:', err);
        res.status(500).json({ message: 'Gagal mengubah kata sandi' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPLOAD FOTO
// ═════════════════════════════════════════════════════════════════════════════

// Upload foto profil guru
exports.uploadFotoProfil = async (req, res) => {
    try {
        // Validasi file foto
        if (!req.file) {
            return res.status(400).json({ message: 'File foto diperlukan' });
        }

        const userId = req.user.id;
        const fotoPath = `/uploads/${req.file.filename}`;

        // Update path foto di database
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
        console.error('Error upload foto:', err);
        res.status(500).json({ message: 'Gagal mengupload foto' });
    }
};