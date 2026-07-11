/**
 * Nama File: siswaModel.js
 * Fungsi: Model CRUD siswa (master data) + validasi duplikasi
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA QUERY SQL
// ═════════════════════════════════════════════════════════════════════════════

// Query untuk mengambil semua siswa dengan pagination & filter
const QUERY_GET_ALL_SISWA = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
            s.jenis_kelamin, s.alamat, s.status
    FROM siswa s
`;

// Query untuk mengambil siswa by ID
const QUERY_GET_SISWA_BY_ID = `
  SELECT * FROM siswa WHERE id_siswa = ?
`;

// Query untuk insert siswa baru
const QUERY_CREATE_SISWA = `
    INSERT INTO siswa (nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif', NOW(), NOW())
`;

// Query untuk update siswa
const QUERY_UPDATE_SISWA = `
    UPDATE siswa SET nis = ?, nisn = ?, nama_lengkap = ?, tempat_lahir = ?, tanggal_lahir = ?,
    jenis_kelamin = ?, alamat = ?, status = ?, updated_at = NOW() WHERE id_siswa = ?
`;

// Query untuk soft delete siswa
const QUERY_DELETE_SISWA = `
    UPDATE siswa SET status = 'pindah', updated_at = NOW() WHERE id_siswa = ?
`;

// Query untuk cek NIS sudah ada
const QUERY_CHECK_NIS_EXISTS = `
    SELECT id_siswa FROM siswa WHERE nis = ?
`;

const QUERY_CHECK_NIS_EXISTS_EXCLUDE = `
    SELECT id_siswa FROM siswa WHERE nis = ? AND id_siswa != ?
`;

// Query untuk cek NISN sudah ada
const QUERY_CHECK_NISN_EXISTS = `
    SELECT id_siswa FROM siswa WHERE nisn = ?
`;

const QUERY_CHECK_NISN_EXISTS_EXCLUDE = `
    SELECT id_siswa FROM siswa WHERE nisn = ? AND id_siswa != ?
`;

// Query untuk cek siswa masih terdaftar di kelas
const QUERY_CHECK_SISWA_IN_KELAS = `
    SELECT COUNT(*) as total FROM siswa_kelas WHERE siswa_id = ?
`;

// Query untuk cek nama siswa
const QUERY_CHECK_NAMA_EXISTS = `
    SELECT id_siswa FROM siswa WHERE nama_lengkap = ?
`;

// ═════════════════════════════════════════════════════════════════════════════
// MODEL CLASS
// ═════════════════════════════════════════════════════════════════════════════

class SiswaModel {
    // Ambil semua siswa dengan pagination & filter
    static async getAllSiswa(search = null, status = 'aktif', page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            const params = [];
            const whereConditions = [];

            // Filter status
            if (status && status !== 'semua') {
                whereConditions.push('s.status = ?');
                params.push(status);
            }

            // Filter search
            if (search) {
                whereConditions.push('(s.nama_lengkap LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)');
                const searchParam = `%${search}%`;
                params.push(searchParam, searchParam, searchParam);
            }

            // Build WHERE clause
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Query data
            const query = `${QUERY_GET_ALL_SISWA} ${whereClause} ORDER BY s.nama_lengkap ASC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [rows] = await db.execute(query, params);

            // Query count
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
        } catch (err) {
            console.error('Error getAllSiswa:', err);
            throw new Error('Gagal mengambil data siswa');
        }
    }

    // Ambil siswa by ID
    static async getSiswaById(id) {
        try {
            const [rows] = await db.execute(QUERY_GET_SISWA_BY_ID, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('Error getSiswaById:', err);
            throw new Error('Gagal mengambil data siswa');
        }
    }

    // Tambah siswa baru
    static async createSiswa(data) {
        try {
            const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = data;
            const [result] = await db.execute(QUERY_CREATE_SISWA, [
                nis, nisn || null, nama_lengkap, tempat_lahir || null,
                tanggal_lahir || null, jenis_kelamin, alamat || null
            ]);
            return result.insertId;
        } catch (err) {
            console.error('Error createSiswa:', err);
            throw new Error('Gagal membuat data siswa');
        }
    }

    // Update siswa
    static async updateSiswa(id, data) {
        try {
            const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status } = data;
            const [result] = await db.execute(QUERY_UPDATE_SISWA, [
                nis, nisn || null, nama_lengkap, tempat_lahir || null,
                tanggal_lahir || null, jenis_kelamin, alamat || null,
                status || 'aktif', id
            ]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Error updateSiswa:', err);
            throw new Error('Gagal mengupdate data siswa');
        }
    }

    // Soft delete siswa (ubah status jadi 'pindah')
    static async deleteSiswa(id) {
        try {
            const [result] = await db.execute(QUERY_DELETE_SISWA, [id]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Error deleteSiswa:', err);
            throw new Error('Gagal menghapus data siswa');
        }
    }

    // Cek NIS sudah ada
    static async checkNisExists(nis, excludeId = null) {
        try {
            const query = excludeId ? QUERY_CHECK_NIS_EXISTS_EXCLUDE : QUERY_CHECK_NIS_EXISTS;
            const params = excludeId ? [nis, excludeId] : [nis];
            const [rows] = await db.execute(query, params);
            return rows.length > 0;
        } catch (err) {
            console.error('Error checkNisExists:', err);
            throw new Error('Gagal mengecek NIS');
        }
    }

    // Cek NISN sudah ada
    static async checkNisnExists(nisn, excludeId = null) {
        try {
            const query = excludeId ? QUERY_CHECK_NISN_EXISTS_EXCLUDE : QUERY_CHECK_NISN_EXISTS;
            const params = excludeId ? [nisn, excludeId] : [nisn];
            const [rows] = await db.execute(query, params);
            return rows.length > 0;
        } catch (err) {
            console.error('Error checkNisnExists:', err);
            throw new Error('Gagal mengecek NISN');
        }
    }

    // Cek siswa masih terdaftar di kelas
    static async checkSiswaInKelas(id) {
        try {
            const [rows] = await db.execute(QUERY_CHECK_SISWA_IN_KELAS, [id]);
            return rows[0].total;
        } catch (err) {
            console.error('Error checkSiswaInKelas:', err);
            throw new Error('Gagal mengecek status kelas siswa');
        }
    }

    // Cek nama siswa (untuk warning duplikasi)
    static async checkNamaExists(nama) {
        try {
            const [rows] = await db.execute(QUERY_CHECK_NAMA_EXISTS, [nama]);
            return rows.length > 0;
        } catch (err) {
            console.error('Error checkNamaExists:', err);
            throw new Error('Gagal mengecek nama siswa');
        }
    }
}

module.exports = SiswaModel;