/**
 * Nama File: siswaPerKelasModel.js
 * Fungsi: Model relasi siswa dan kelas per tahun ajaran.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Tambahkan created_at & updated_at dengan NOW()
const QUERY_ASSIGN_SISWA_KE_KELAS = `
    INSERT INTO siswa_kelas (siswa_id, kelas_id, id_tahun_ajaran_induk)
    VALUES (?, ?, ?)
`;

const QUERY_GET_SISWA_BY_KELAS = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
            s.jenis_kelamin, s.alamat, s.status, k.id_kelas, k.nama_kelas, k.fase, sk.id_tahun_ajaran_induk
    FROM siswa s
    INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
    INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE sk.kelas_id = ? AND s.status = 'aktif'
`;

const QUERY_GET_SISWA_BELUM_PUNYA_KELAS = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.jenis_kelamin, s.tempat_lahir, s.tanggal_lahir
    FROM siswa s
    WHERE s.status = 'aktif'
    AND NOT EXISTS (
        SELECT 1 FROM siswa_kelas sk
        WHERE sk.siswa_id = s.id_siswa AND sk.id_tahun_ajaran_induk = ?
    )
`;

const QUERY_GET_SISWA_BY_ID_IN_KELAS = `
    SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.tempat_lahir, s.tanggal_lahir,
            s.jenis_kelamin, s.alamat, s.status, k.id_kelas, k.nama_kelas, sk.id_tahun_ajaran_induk
    FROM siswa s
    INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
    INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE s.id_siswa = ? AND sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
`;

const QUERY_HAPUS_SISWA_DARI_KELAS = `
    DELETE FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?
`;

const QUERY_CHECK_SISWA_PUNYA_KELAS = `
    SELECT sk.kelas_id, k.nama_kelas
    FROM siswa_kelas sk
    INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?
`;

class SiswaPerKelasModel {
    /**
     * Ambil daftar siswa di kelas tertentu (hanya status aktif).
     */
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
            console.error('DB Error getSiswaByKelas:', err.message);
            if (err.sql) console.error('SQL:', err.sql);
            throw new Error('Gagal mengambil data siswa di kelas');
        }
    }

    /**
     * Ambil daftar siswa yang belum memiliki kelas di tahun ajaran tertentu.
     */
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
            console.error('DB Error getSiswaBelumPunyaKelas:', err.message);
            if (err.sql) console.error('SQL:', err.sql);
            throw new Error('Gagal mengambil data siswa belum punya kelas');
        }
    }

    /**
     * Ambil detail spesifik siswa di kelas dan tahun ajaran tertentu.
     */
    static async getSiswaByIdInKelas(siswaId, kelasId, tahunAjaranId) {
        try {
            const [rows] = await db.execute(QUERY_GET_SISWA_BY_ID_IN_KELAS, [
                siswaId, kelasId, tahunAjaranId
            ]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('DB Error getSiswaByIdInKelas:', err.message);
            if (err.sql) console.error('SQL:', err.sql);
            throw new Error('Gagal mengambil detail siswa di kelas');
        }
    }

    /**
     * Assign siswa ke kelas dengan include created_at & updated_at.
     */
    static async assignSiswaKeKelas(siswaId, kelasId, tahunAjaranId, connection = null) {
        try {
            const executor = connection || db;
            await executor.execute(QUERY_ASSIGN_SISWA_KE_KELAS, [
                siswaId, kelasId, tahunAjaranId
            ]);
            return true;
        } catch (err) {
            // ✅ Buka error asli supaya kelihatan di log
            console.error('DB Error assignSiswaKeKelas:', err.message);
            if (err.sql) console.error('SQL:', err.sql);
            if (err.code) console.error('Error code:', err.code);
            throw new Error('Gagal assign siswa ke kelas: ' + err.message);
        }
    }

    /**
     * Hapus relasi siswa dari kelas tertentu.
     */
    static async hapusSiswaDariKelas(siswaId, kelasId, tahunAjaranId) {
        try {
            const [result] = await db.execute(QUERY_HAPUS_SISWA_DARI_KELAS, [
                siswaId, kelasId, tahunAjaranId
            ]);
            return result.affectedRows > 0;
        } catch (err) {
            console.error('DB Error hapusSiswaDariKelas:', err.message);
            if (err.sql) console.error('SQL:', err.sql);
            throw new Error('Gagal menghapus siswa dari kelas');
        }
    }

    /**
     * Cek apakah siswa sudah memiliki kelas di tahun ajaran ini.
     */
    static async checkSiswaPunyaKelas(siswaId, tahunAjaranId) {
        try {
            const [rows] = await db.execute(QUERY_CHECK_SISWA_PUNYA_KELAS, [
                siswaId, tahunAjaranId
            ]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            console.error('DB Error checkSiswaPunyaKelas:', err.message);
            if (err.sql) console.error('SQL:', err.sql);
            throw new Error('Gagal mengecek status kelas siswa');
        }
    }
}

module.exports = SiswaPerKelasModel;