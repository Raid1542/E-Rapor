/**
 * Nama File: pembinaEkskulModel.js
 * Fungsi: Model CRUD pembina ekstrakurikuler.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

const pembinaEkskulModel = {
    /**
     * Ambil semua data pembina ekstrakurikuler.
     */
    async getAll() {
        try {
            const [rows] = await db.execute(`
        SELECT id_pembina_ekstrakurikuler AS id, nama_lengkap, niy, nuptk, tempat_lahir, tanggal_lahir,
                jenis_kelamin, alamat, no_telepon, status, created_at, updated_at
        FROM pembina_ekstrakurikuler
        ORDER BY nama_lengkap ASC
        `);
            return rows;
        } catch (err) {
            throw new Error('Gagal mengambil data pembina ekstrakurikuler');
        }
    },

    /**
     * Ambil detail pembina berdasarkan ID.
     */
    async getById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM pembina_ekstrakurikuler WHERE id_pembina_ekstrakurikuler = ?',
                [id]
            );
            return rows[0] || null;
        } catch (err) {
            throw new Error('Gagal mengambil detail pembina');
        }
    },

    /**
     * Tambah data pembina baru.
     */
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
                data.status || 'aktif'
            ];

            if (connection) {
                const [result] = await connection.execute(query, values);
                return result.insertId;
            }

            const [result] = await db.execute(query, values);
            return result.insertId;
        } catch (err) {
            throw new Error('Gagal membuat data pembina');
        }
    },

    /**
     * Update data pembina.
     */
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
                id
            ];

            if (connection) {
                const [result] = await connection.execute(query, values);
                return result.affectedRows > 0;
            }

            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        } catch (err) {
            throw new Error('Gagal mengupdate data pembina');
        }
    },

    /**
     * Ambil daftar pembina aktif untuk kebutuhan dropdown.
     */
    async getActivePembina() {
        try {
            const [rows] = await db.execute(`
        SELECT id_pembina_ekstrakurikuler AS id, nama_lengkap, niy, nuptk
        FROM pembina_ekstrakurikuler
        WHERE status = 'aktif'
        ORDER BY nama_lengkap ASC
        `);
            return rows;
        } catch (err) {
            throw new Error('Gagal mengambil daftar pembina aktif');
        }
    }
};

module.exports = pembinaEkskulModel;