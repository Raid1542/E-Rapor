/**
 * Nama File: siswaModel.js
 * Fungsi: Model CRUD siswa (master data) + validasi duplikasi
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

class SiswaModel {
    /** Ambil semua siswa dengan pagination & filter */
    static async getAllSiswa(search = null, status = 'aktif', page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const params = [];
        const whereConditions = [];

        if (status && status !== 'semua') {
            whereConditions.push('s.status = ?');
            params.push(status);
        }

        if (search) {
            whereConditions.push('(s.nama_lengkap LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
        SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
                s.jenis_kelamin, s.alamat, s.status
        FROM siswa s ${whereClause}
        ORDER BY s.nama_lengkap ASC
        LIMIT ? OFFSET ?
    `;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.execute(query, params);

        const countQuery = `SELECT COUNT(*) as total FROM siswa s ${whereClause}`;
        const countParams = status && status !== 'semua' ? [status] : [];
        if (search) {
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam);
        }
        const [countResult] = await db.execute(countQuery, countParams);

        return {
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        };
    }

    /** Ambil siswa by ID */
    static async getSiswaById(id) {
        const [rows] = await db.execute('SELECT * FROM siswa WHERE id_siswa = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /** Tambah siswa baru */
    static async createSiswa(data) {
        const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = data;
        const [result] = await db.execute(
            `INSERT INTO siswa (nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif', NOW(), NOW())`,
            [nis, nisn || null, nama_lengkap, tempat_lahir || null, tanggal_lahir || null, jenis_kelamin, alamat || null]
        );
        return result.insertId;
    }

    /** Update siswa */
    static async updateSiswa(id, data) {
        const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status } = data;
        const [result] = await db.execute(
            `UPDATE siswa SET nis = ?, nisn = ?, nama_lengkap = ?, tempat_lahir = ?, tanggal_lahir = ?,
        jenis_kelamin = ?, alamat = ?, status = ?, updated_at = NOW() WHERE id_siswa = ?`,
            [nis, nisn || null, nama_lengkap, tempat_lahir || null, tanggal_lahir || null, jenis_kelamin, alamat || null, status || 'aktif', id]
        );
        return result.affectedRows > 0;
    }

    /** Soft delete siswa (ubah status jadi 'pindah') */
    static async deleteSiswa(id) {
        const [result] = await db.execute(
            `UPDATE siswa SET status = 'pindah', updated_at = NOW() WHERE id_siswa = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    /** Cek NIS sudah ada */
    static async checkNisExists(nis, excludeId = null) {
        const query = excludeId
            ? 'SELECT id_siswa FROM siswa WHERE nis = ? AND id_siswa != ?'
            : 'SELECT id_siswa FROM siswa WHERE nis = ?';
        const params = excludeId ? [nis, excludeId] : [nis];
        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    }

    /** Cek NISN sudah ada */
    static async checkNisnExists(nisn, excludeId = null) {
        const query = excludeId
            ? 'SELECT id_siswa FROM siswa WHERE nisn = ? AND id_siswa != ?'
            : 'SELECT id_siswa FROM siswa WHERE nisn = ?';
        const params = excludeId ? [nisn, excludeId] : [nisn];
        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    }

    /** Cek siswa masih terdaftar di kelas */
    static async checkSiswaInKelas(id) {
        const [rows] = await db.execute('SELECT COUNT(*) as total FROM siswa_kelas WHERE siswa_id = ?', [id]);
        return rows[0].total;
    }

    /** Cek nama siswa (untuk warning duplikasi) */
    static async checkNamaExists(nama) {
        const [rows] = await db.execute('SELECT id_siswa FROM siswa WHERE nama_lengkap = ?', [nama]);
        return rows.length > 0;
    }
}

module.exports = SiswaModel;