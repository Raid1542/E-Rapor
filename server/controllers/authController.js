/**
 * Nama File: authController.js
 * Fungsi: Controller autentikasi (login) dengan JWT token.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const jwt = require('jsonwebtoken');
const { comparePassword } = require('../utils/hash');
const db = require('../config/db');
const userModel = require('../models/authModel');

// Konstanta untuk masa berlaku JWT token
const TOKEN_EXPIRY = '8h';

/**
 * POST /login - Autentikasi user dan generate JWT token.
 * Validasi kredensial, verifikasi role, dan return data profil lengkap.
 */
const login = async (req, res) => {
    const { email_sekolah, password, role: selectedRole } = req.body;

    // Validasi input wajib
    if (!email_sekolah || !password || !selectedRole) {
        return res.status(400).json({
            success: false,
            message: 'Email, password, dan role wajib diisi'
        });
    }

    try {
        // Cari user berdasarkan email
        const [userRows] = await db.execute(
            `SELECT u.id_user, u.email_sekolah, u.password, u.nama_lengkap, u.status, ur.role
        FROM user u 
        JOIN user_role ur ON u.id_user = ur.id_user
        WHERE u.email_sekolah = ?`,
            [email_sekolah]
        );

        // Validasi user tidak ditemukan
        if (userRows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = userRows[0];

        // Cek status akun aktif
        if (user.status !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Akun tidak aktif. Silakan hubungi administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Verifikasi password dengan bcrypt
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Password salah',
                code: 'WRONG_PASSWORD'
            });
        }

        // Validasi role yang dipilih user
        const roles = await userModel.getRolesByUserId(user.id_user);
        if (!roles.includes(selectedRole)) {
            return res.status(403).json({
                success: false,
                message: `Anda tidak memiliki akses sebagai ${selectedRole}`,
                code: 'ROLE_NOT_ALLOWED'
            });
        }

        // Generate JWT token dengan payload user
        const token = jwt.sign(
            { id: user.id_user, role: selectedRole },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        // Ambil data profil guru dari tabel guru
        const [guruRows] = await db.execute(
            `SELECT niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, foto_path 
        FROM guru 
        WHERE user_id = ?`,
            [user.id_user]
        );
        const guruData = guruRows[0] || {};

        // Return response dengan token dan data user lengkap
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
                tanggal_lahir: guruData.tanggal_lahir || null
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server: ' + err.message
        });
    }
};

module.exports = { login };