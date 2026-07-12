/**
 * Nama File: authModel.js
 * Fungsi: Model operasi database autentikasi (login, registrasi, password, role)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../config/db');
const hashUtils = require('../utils/hash');

// Konstanta untuk query SQL
const QUERY_FIND_BY_EMAIL = 'SELECT * FROM user WHERE email_sekolah = ?';
const QUERY_FIND_BY_ID = `
    SELECT u.*, g.niy, g.nuptk, g.tempat_lahir, g.tanggal_lahir,
            g.jenis_kelamin, g.alamat, g.no_telepon, g.foto_path  
    FROM user u LEFT JOIN guru g ON u.id_user = g.user_id
    WHERE u.id_user = ?
`;
const QUERY_CREATE_USER = 'INSERT INTO user (email_sekolah, password, nama_lengkap, status, created_at, updated_at) VALUES (?, ?, ?, "aktif", NOW(), NOW())';
const QUERY_CREATE_ROLE = 'INSERT INTO user_role (id_user, role) VALUES (?, ?)';
const QUERY_GET_ROLES = 'SELECT role FROM user_role WHERE id_user = ?';
const QUERY_UPDATE_PASSWORD = 'UPDATE user SET password = ?, updated_at = NOW() WHERE id_user = ?';

const authModel = {
    // Cari user berdasarkan email sekolah (untuk login)
    async findByEmail(email) {
        if (!email) {
            throw new Error('Email wajib diisi');
        }

        try {
            const [rows] = await db.execute(QUERY_FIND_BY_EMAIL, [email]);
            return rows[0];
        } catch (err) {
            console.error('Error findByEmail:', err);
            throw new Error('Gagal mencari user berdasarkan email');
        }
    },

    // Ambil data user lengkap + data guru berdasarkan ID
    async findById(id) {
        if (!id) {
            throw new Error('ID user wajib diisi');
        }

        try {
            const [rows] = await db.execute(QUERY_FIND_BY_ID, [id]);
            return rows[0] || null;
        } catch (err) {
            console.error('Error findById:', err);
            throw new Error('Gagal mencari user berdasarkan ID');
        }
    },

    // Buat user baru + insert role (untuk registrasi)
    async createUser(data) {
        const { email_sekolah, password, nama_lengkap, role } = data;

        if (!email_sekolah || !password || !nama_lengkap) {
            throw new Error('Email, password, dan nama lengkap wajib diisi');
        }

        try {
            const hashedPassword = await hashUtils.hashPassword(password);

            const [result] = await db.execute(QUERY_CREATE_USER, [
                email_sekolah,
                hashedPassword,
                nama_lengkap,
            ]);

            const id_user = result.insertId;

            if (role) {
                await db.execute(QUERY_CREATE_ROLE, [id_user, role]);
            }

            return id_user;
        } catch (err) {
            console.error('Error createUser:', err);
            throw new Error('Gagal membuat user baru');
        }
    },

    // Ambil daftar role user berdasarkan ID (untuk authorization)
    async getRolesByUserId(id_user) {
        if (!id_user) {
            throw new Error('ID user wajib diisi');
        }

        try {
            const [rows] = await db.execute(QUERY_GET_ROLES, [id_user]);
            return rows.map(row => row.role);
        } catch (err) {
            console.error('Error getRolesByUserId:', err);
            throw new Error('Gagal mengambil role user');
        }
    },

    // Update password user
    async updatePassword(id_user, hashedPassword) {
        if (!id_user || !hashedPassword) {
            throw new Error('ID user dan password hash wajib diisi');
        }

        try {
            const [result] = await db.execute(QUERY_UPDATE_PASSWORD, [
                hashedPassword,
                id_user,
            ]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Error updatePassword:', err);
            throw new Error('Gagal mengupdate password user');
        }
    },
};

module.exports = authModel;