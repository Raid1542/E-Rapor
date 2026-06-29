/**
 * Nama File: authModel.js
 * Fungsi: Model operasi database autentikasi (login, registrasi, password, role)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');
const hashUtils = require('../utils/hash');

const authModel = {
    // Cari user berdasarkan email sekolah (untuk login)
    async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM user WHERE email_sekolah = ?', [email]);
        return rows[0];
    },

    // Ambil data user lengkap + data guru berdasarkan ID
    async findById(id) {
        const [rows] = await db.execute(
            `SELECT u.*, g.niy, g.nuptk, g.tempat_lahir, g.tanggal_lahir,
                    g.jenis_kelamin, g.alamat, g.no_telepon, g.foto_path  
                FROM user u LEFT JOIN guru g ON u.id_user = g.user_id
                WHERE u.id_user = ?`,
            [id]
        );
        return rows[0] || null;
    },

    // Buat user baru + insert role (untuk registrasi)
    async createUser(data) {
        const { email_sekolah, password, nama_lengkap, role } = data;
        const hashedPassword = await hashUtils.hashPassword(password);

        const [result] = await db.execute(
            'INSERT INTO user (email_sekolah, password, nama_lengkap, status, created_at, updated_at) VALUES (?, ?, ?, "aktif", NOW(), NOW())',
            [email_sekolah, hashedPassword, nama_lengkap]
        );

        const id_user = result.insertId;

        if (role) {
            await db.execute('INSERT INTO user_role (id_user, role) VALUES (?, ?)', [id_user, role]);
        }

        return id_user;
    },

    // Ambil daftar role user berdasarkan ID (untuk authorization)
    async getRolesByUserId(id_user) {
        const [rows] = await db.execute('SELECT role FROM user_role WHERE id_user = ?', [id_user]);
        return rows.map(row => row.role);
    },

    // Update password user
    async updatePassword(id_user, hashedPassword) {
        const [result] = await db.execute(
            'UPDATE user SET password = ?, updated_at = NOW() WHERE id_user = ?',
            [hashedPassword, id_user]
        );
        return result.affectedRows > 0;
    },
};

module.exports = authModel;