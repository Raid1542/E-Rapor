/**
 * Nama File: siswaPerKelasModel.js
 * Fungsi: Model relasi siswa-kelas per tahun ajaran
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA QUERY SQL
// ═════════════════════════════════════════════════════════════════════════════

// Query untuk mengambil siswa di kelas
const QUERY_GET_SISWA_BY_KELAS = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
            s.jenis_kelamin, s.alamat, s.status, k.id_kelas, k.nama_kelas, k.fase, sk.id_tahun_ajaran_induk
    FROM siswa s
    INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
    INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE sk.kelas_id = ? AND s.status = 'aktif'
`;

// Query untuk mengambil siswa belum punya kelas
const QUERY_GET_SISWA_BELUM_PUNYA_KELAS = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.jenis_kelamin, s.tempat_lahir, s.tanggal_lahir
    FROM siswa s
    WHERE s.status = 'aktif'
    AND NOT EXISTS (SELECT 1 FROM siswa_kelas sk WHERE sk.siswa_id = s.id_siswa AND sk.id_tahun_ajaran_induk = ?)
`;

// Query untuk mengambil detail siswa di kelas tertentu
const QUERY_GET_SISWA_BY_ID_IN_KELAS = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
            s.jenis_kelamin, s.alamat, s.status, k.id_kelas, k.nama_kelas, sk.id_tahun_ajaran_induk
    FROM siswa s
    INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
    INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE s.id_siswa = ? AND sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
`;

// Query untuk assign siswa ke kelas
const QUERY_ASSIGN_SISWA_KE_KELAS = `
    INSERT INTO siswa_kelas (siswa_id, kelas_id, id_tahun_ajaran_induk) VALUES (?, ?, ?)
`;

// Query untuk hapus siswa dari kelas
const QUERY_HAPUS_SISWA_DARI_KELAS = `
    DELETE FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?
`;

// Query untuk cek siswa sudah punya kelas
const QUERY_CHECK_SISWA_PUNYA_KELAS = `
    SELECT sk.kelas_id, k.nama_kelas 
    FROM siswa_kelas sk
    INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?
`;

// ═════════════════════════════════════════════════════════════════════════════
// MODEL CLASS
// ═════════════════════════════════════════════════════════════════════════════

class SiswaPerKelasModel {
    // Ambil siswa di kelas (hanya status aktif)
    static async getSiswaByKelas(kelasId, tahunAjaranId = null) {
        try {
            let query = QUERY_GET_SISWA_BY_KELAS;
            const params = [kelasId];

            if (tahunAjaranId) {
                query += ' AND sk.id_tahun_ajaran_induk = ?';
                params.push(tahunAjaranId);
            }

            query += ' ORDER BY s.nama_lengkap ASC';

            const [rows] = await db.execute(query, params);
            return rows;
        } catch (err) {
            console.error('Error getSiswaByKelas:', err);
            throw new Error('Gagal mengambil data siswa');
        }
    }

    // Ambil siswa belum punya kelas (dengan search opsional)
    static async getSiswaBelumPunyaKelas(tahunAjaranId, search = null) {
        try {
            let query = QUERY_GET_SISWA_BELUM_PUNYA_KELAS;
            const params = [tahunAjaranId];

            if (search) {
                query += ' AND (s.nama_lengkap LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)';
                const searchParam = `%${search}%`;
                params.push(searchParam, searchParam, searchParam);
            }

            query += ' ORDER BY s.nama_lengkap ASC';

            const [rows] = await db.execute(query, params);
            return rows;
        } catch (err) {
            console.error('Error getSiswaBelumPunyaKelas:', err);
            throw new Error('Gagal mengambil data siswa');
        }
    }

    // Ambil detail siswa di kelas tertentu
    static async getSiswaByIdInKelas(siswaId, kelasId, tahunAjaranId) {
        try {
            const [rows] = await db.execute(QUERY_GET_SISWA_BY_ID_IN_KELAS, [
                siswaId, kelasId, tahunAjaranId
            ]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('Error getSiswaByIdInKelas:', err);
            throw new Error('Gagal mengambil detail siswa');
        }
    }

    // Assign siswa ke kelas
    static async assignSiswaKeKelas(siswaId, kelasId, tahunAjaranId, connection = null) {
        try {
            const executor = connection || db;
            await executor.execute(QUERY_ASSIGN_SISWA_KE_KELAS, [
                siswaId, kelasId, tahunAjaranId
            ]);
            return true;
        } catch (err) {
            console.error('Error assignSiswaKeKelas:', err);
            throw new Error('Gagal assign siswa ke kelas');
        }
    }

    // Hapus siswa dari kelas (hapus relasi)
    static async hapusSiswaDariKelas(siswaId, kelasId, tahunAjaranId) {
        try {
            const [result] = await db.execute(QUERY_HAPUS_SISWA_DARI_KELAS, [
                siswaId, kelasId, tahunAjaranId
            ]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('Error hapusSiswaDariKelas:', err);
            throw new Error('Gagal menghapus siswa dari kelas');
        }
    }

    // Cek siswa sudah punya kelas di tahun ajaran ini
    static async checkSiswaPunyaKelas(siswaId, tahunAjaranId) {
        try {
            const [rows] = await db.execute(QUERY_CHECK_SISWA_PUNYA_KELAS, [
                siswaId, tahunAjaranId
            ]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('Error checkSiswaPunyaKelas:', err);
            throw new Error('Gagal mengecek status kelas siswa');
        }
    }
}

module.exports = SiswaPerKelasModel;