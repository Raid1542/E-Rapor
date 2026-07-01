/**
 * Nama File: authController.js
 * Fungsi: Controller autentikasi (login) dengan JWT token
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const jwt = require('jsonwebtoken');
const { comparePassword } = require('../utils/hash');
const db = require('../config/db');
const userModel = require('../models/authModel');

// POST: Login user (validasi kredensial + generate JWT token)
const login = async (req, res) => {
    const { email_sekolah, password, role: selectedRole } = req.body;

    // Validasi input
    if (!email_sekolah || !password || !selectedRole) {
        return res.status(400).json({ success: false, message: 'Email, password, dan role wajib diisi' });
    }

    try {
        // Step 1: Cari user berdasarkan email
        const [userRows] = await db.execute(
            `SELECT u.id_user, u.email_sekolah, u.password, u.nama_lengkap, u.status, ur.role
                FROM user u JOIN user_role ur ON u.id_user = ur.id_user
                WHERE u.email_sekolah = ?`,
            [email_sekolah]
        );

        // ✅ UPDATED: Bedakan error email tidak ditemukan vs password salah
        if (userRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Email tidak ditemukan',
                code: 'EMAIL_NOT_FOUND'
            });
        }

        const user = userRows[0];

        // Step 2: Cek status akun
        if (user.status !== 'aktif') {
            return res.status(403).json({ 
                success: false, 
                message: 'Akun tidak aktif. Silakan hubungi administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Step 3: Verifikasi password
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Password salah',
                code: 'WRONG_PASSWORD'
            });
        }

        // Step 4: Validasi role
        const roles = await userModel.getRolesByUserId(user.id_user);
        if (!roles.includes(selectedRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Anda tidak memiliki akses sebagai ${selectedRole}`,
                code: 'ROLE_NOT_ALLOWED'
            });
        }

        // Step 5: Generate JWT token
        const token = jwt.sign(
            { id: user.id_user, role: selectedRole },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Step 6: Ambil data profil (guru)
        const [guruRows] = await db.execute(
            `SELECT niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, foto_path 
                FROM guru WHERE user_id = ?`,
            [user.id_user]
        );
        const guruData = guruRows[0] || {};

        // Step 7: Return response
        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id_user,
                role: selectedRole,
                roles: roles,
                nama_lengkap: user.nama_lengkap,
                email_sekolah: user.email_sekolah,
                profileImage: guruData.foto_path || null,
                niy: guruData.niy || '',
                nuptk: guruData.nuptk || '',
                jenis_kelamin: guruData.jenis_kelamin || 'Laki-laki',
                alamat: guruData.alamat || '',
                no_telepon: guruData.no_telepon || '',
                tempat_lahir: guruData.tempat_lahir || '',
                tanggal_lahir: guruData.tanggal_lahir || null,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server: ' + err.message });
    }
};

module.exports = { login };