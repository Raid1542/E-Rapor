/**
 * Nama File: siswaModel.js
 * Fungsi: Model CRUD siswa (master data) dan validasi duplikasi.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 * Update: Tambah console.error untuk debug error TiDB
 */

const db = require('../../config/db');

// Konstanta query SQL
const QUERY_GET_ALL_SISWA = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
            s.jenis_kelamin, s.alamat, s.status
    FROM siswa s
`;

const QUERY_GET_SISWA_BY_ID = `
  SELECT * FROM siswa WHERE id_siswa = ?
`;

const QUERY_CREATE_SISWA = `
    INSERT INTO siswa (nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif', NOW(), NOW())
`;

const QUERY_UPDATE_SISWA = `
    UPDATE siswa 
    SET nis = ?, nisn = ?, nama_lengkap = ?, tempat_lahir = ?, tanggal_lahir = ?,
        jenis_kelamin = ?, alamat = ?, status = ?, updated_at = NOW() 
    WHERE id_siswa = ?
`;

const QUERY_DELETE_SISWA = `
    UPDATE siswa SET status = 'pindah', updated_at = NOW() WHERE id_siswa = ?
`;

const QUERY_CHECK_NIS_EXISTS = `
    SELECT id_siswa FROM siswa WHERE nis = ?
`;

const QUERY_CHECK_NIS_EXISTS_EXCLUDE = `
    SELECT id_siswa FROM siswa WHERE nis = ? AND id_siswa != ?
`;

const QUERY_CHECK_NISN_EXISTS = `
    SELECT id_siswa FROM siswa WHERE nisn = ?
`;

const QUERY_CHECK_NISN_EXISTS_EXCLUDE = `
    SELECT id_siswa FROM siswa WHERE nisn = ? AND id_siswa != ?
`;

const QUERY_CHECK_SISWA_IN_KELAS = `
    SELECT COUNT(*) AS total FROM siswa_kelas WHERE siswa_id = ?
`;

const QUERY_CHECK_NAMA_EXISTS = `
    SELECT id_siswa FROM siswa WHERE nama_lengkap = ?
`;

class SiswaModel {
    /**
     * Ambil semua siswa dengan fitur pagination dan filter.
     */
    static async getAllSiswa(search = null, status = 'aktif', page = 1, limit = 10) {
        try {
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

            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset);
            const query = `${QUERY_GET_ALL_SISWA} ${whereClause} ORDER BY s.nama_lengkap ASC LIMIT ${limitNum} OFFSET ${offsetNum}`;

            const [rows] = await db.execute(query, params);

            const countQuery = `SELECT COUNT(*) AS total FROM siswa s ${whereClause}`;
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
                    limit: limitNum,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limitNum)
                }
            };
        } catch (err) {
            console.error('DB Error getAllSiswa:', err.message);
            if (err.sql) console.error('SQL Query:', err.sql);
            throw new Error('Gagal mengambil data siswa');
        }
    }

    /**
     * Ambil detail siswa berdasarkan ID.
     */
    static async getSiswaById(id) {
        try {
            const [rows] = await db.execute(QUERY_GET_SISWA_BY_ID, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('DB Error getSiswaById:', err.message);
            throw new Error('Gagal mengambil detail siswa');
        }
    }

    /**
     * Tambah data siswa baru.
     */
    static async createSiswa(data) {
        try {
            const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = data;
            const [result] = await db.execute(QUERY_CREATE_SISWA, [
                nis, 
                nisn ? String(nisn).trim() : '', 
                nama_lengkap, 
                tempat_lahir || null,
                tanggal_lahir || null, 
                jenis_kelamin, 
                alamat || null
            ]);
            return result.insertId;
        } catch (err) {
            console.error('DB Error createSiswa:', err.message);
            if (err.sql) console.error('SQL Query:', err.sql);
            throw new Error('Gagal membuat data siswa');
        }
    }

    /**
     * Update data siswa.
     */
    static async updateSiswa(id, data) {
        try {
            const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status } = data;
            const [result] = await db.execute(QUERY_UPDATE_SISWA, [
                nis, 
                nisn ? String(nisn).trim() : '', 
                nama_lengkap, 
                tempat_lahir || null,
                tanggal_lahir || null, 
                jenis_kelamin, 
                alamat || null,
                status || 'aktif', 
                id
            ]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('DB Error updateSiswa:', err.message);
            if (err.sql) console.error('SQL Query:', err.sql);
            throw new Error('Gagal mengupdate data siswa');
        }
    }

    /**
     * Soft delete siswa (mengubah status menjadi 'pindah').
     */
    static async deleteSiswa(id) {
        try {
            const [result] = await db.execute(QUERY_DELETE_SISWA, [id]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('DB Error deleteSiswa:', err.message);
            throw new Error('Gagal menghapus data siswa');
        }
    }

    /**
     * Cek apakah NIS sudah ada (dengan opsi exclude ID untuk update).
     */
    static async checkNisExists(nis, excludeId = null) {
        try {
            const query = excludeId ? QUERY_CHECK_NIS_EXISTS_EXCLUDE : QUERY_CHECK_NIS_EXISTS;
            const params = excludeId ? [nis, excludeId] : [nis];
            const [rows] = await db.execute(query, params);
            return rows.length > 0;
        } catch (err) {
            console.error('DB Error checkNisExists:', err.message);
            throw new Error('Gagal mengecek keberadaan NIS');
        }
    }

    /**
     * Cek apakah NISN sudah ada (dengan opsi exclude ID untuk update).
     */
    static async checkNisnExists(nisn, excludeId = null) {
        try {
            const query = excludeId ? QUERY_CHECK_NISN_EXISTS_EXCLUDE : QUERY_CHECK_NISN_EXISTS;
            const params = excludeId ? [nisn, excludeId] : [nisn];
            const [rows] = await db.execute(query, params);
            return rows.length > 0;
        } catch (err) {
            console.error('DB Error checkNisnExists:', err.message);
            throw new Error('Gagal mengecek keberadaan NISN');
        }
    }

    /**
     * Cek apakah siswa masih terdaftar di kelas.
     */
    static async checkSiswaInKelas(id) {
        try {
            const [rows] = await db.execute(QUERY_CHECK_SISWA_IN_KELAS, [id]);
            return rows[0].total;
        } catch (err) {
            console.error('DB Error checkSiswaInKelas:', err.message);
            throw new Error('Gagal mengecek status kelas siswa');
        }
    }

    /**
     * Cek apakah nama siswa sudah ada (untuk peringatan duplikasi).
     */
    static async checkNamaExists(nama) {
        try {
            const [rows] = await db.execute(QUERY_CHECK_NAMA_EXISTS, [nama]);
            return rows.length > 0;
        } catch (err) {
            console.error('DB Error checkNamaExists:', err.message);
            throw new Error('Gagal mengecek keberadaan nama siswa');
        }
    }
}

module.exports = SiswaModel;