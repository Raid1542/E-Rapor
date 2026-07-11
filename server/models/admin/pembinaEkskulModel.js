/**
 * Nama File: pembinaEkskulModel.js
 * Fungsi: Model CRUD pembina ekstrakurikuler
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Model pembina ekstrakurikuler
const pembinaEkskulModel = {
    // Ambil semua pembina
    async getAll() {
        try {
            const [rows] = await db.execute(`
        SELECT id_pembina_ekstrakurikuler as id, nama_lengkap, niy, nuptk, tempat_lahir, tanggal_lahir,
                jenis_kelamin, alamat, no_telepon, status, created_at, updated_at
        FROM pembina_ekstrakurikuler
        ORDER BY nama_lengkap ASC
        `);
            return rows;
        } catch (err) {
            console.error('Error getAll:', err);
            throw err;
        }
    },

    // Ambil pembina by ID
    async getById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM pembina_ekstrakurikuler WHERE id_pembina_ekstrakurikuler = ?',
                [id]
            );
            return rows[0] || null;
        } catch (err) {
            console.error('Error getById:', err);
            throw err;
        }
    },

    // Tambah pembina baru
    async create(data, connection = null) {
        try {
            const query = `
        INSERT INTO pembina_ekstrakurikuler 
        (nama_lengkap, niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
            const values = [
                data.nama_lengkap,
                data.niy || null,
                data.nuptk || null,
                data.tempat_lahir,
                data.tanggal_lahir,
                data.jenis_kelamin,
                data.alamat || null,
                data.no_telepon || null,
                data.status || 'aktif',
            ];

            if (connection) {
                const [result] = await connection.execute(query, values);
                return result.insertId;
            }

            const [result] = await db.execute(query, values);
            return result.insertId;
        } catch (err) {
            console.error('Error create:', err);
            throw err;
        }
    },

    // Update pembina
    async update(id, data, connection = null) {
        try {
            const query = `
        UPDATE pembina_ekstrakurikuler 
        SET nama_lengkap = ?, niy = ?, nuptk = ?, tempat_lahir = ?, tanggal_lahir = ?, 
            jenis_kelamin = ?, alamat = ?, no_telepon = ?, status = ?
        WHERE id_pembina_ekstrakurikuler = ?
        `;
            const values = [
                data.nama_lengkap,
                data.niy || null,
                data.nuptk || null,
                data.tempat_lahir,
                data.tanggal_lahir,
                data.jenis_kelamin,
                data.alamat || null,
                data.no_telepon || null,
                data.status || 'aktif',
                id,
            ];

            if (connection) {
                const [result] = await connection.execute(query, values);
                return result.affectedRows > 0;
            }

            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Error update:', err);
            throw err;
        }
    },

    // Ambil pembina aktif untuk dropdown
    async getActivePembina() {
        try {
            const [rows] = await db.execute(`
        SELECT id_pembina_ekstrakurikuler as id, nama_lengkap, niy, nuptk
        FROM pembina_ekstrakurikuler
        WHERE status = 'aktif'
        ORDER BY nama_lengkap ASC
        `);
            return rows;
        } catch (err) {
            console.error('Error getActivePembina:', err);
            throw err;
        }
    },
};

module.exports = pembinaEkskulModel;