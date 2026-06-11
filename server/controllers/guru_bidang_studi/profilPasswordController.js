/**
 * Nama File: profilController.js
 * Fungsi: Mengelola profil guru bidang studi (lihat, edit, ganti password, upload foto)
 * Update: tempat_lahir & tanggal_lahir ada di tabel guru
 */

const db = require('../../config/db');
const bcrypt = require('bcrypt');

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

        // Validasi
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


        // Ambil data terbaru
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

exports.gantiPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

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

        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Kata sandi lama salah'
            });
        }

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