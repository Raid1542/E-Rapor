/**
 * Nama File: siswaPerKelasModel.js
 * Fungsi: Model untuk operasi database terkait siswa per kelas (Master-First Concept)
 *         Mengelola relasi siswa dengan kelas per tahun ajaran
 * UPDATE: Tambah parameter search di getSiswaBelumPunyaKelas
 */

const db = require('../../config/db');

class SiswaPerKelasModel {
    // ═════════════════════════════════════════════════════════════════════════════
    // GET siswa berdasarkan kelas (HANYA yang status = 'aktif')
    // ═════════════════════════════════════════════════════════════════════════════
    static async getSiswaByKelas(kelasId, tahunAjaranId = null) {
        let query = `
        SELECT 
            s.id_siswa,
            s.nis,
            s.nisn,
            s.nama_lengkap,
            s.tempat_lahir,
            s.tanggal_lahir,
            s.jenis_kelamin,
            s.alamat,
            s.status,
            k.id_kelas,
            k.nama_kelas,
            k.fase,
            sk.id_tahun_ajaran_induk
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
        WHERE sk.kelas_id = ?
          AND s.status = 'aktif'
    `;

        const params = [kelasId];

        if (tahunAjaranId) {
            query += ` AND sk.id_tahun_ajaran_induk = ?`;
            params.push(tahunAjaranId);
        }

        query += ` ORDER BY s.nama_lengkap ASC`;

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async getSiswaBelumPunyaKelas(tahunAjaranId, search = null) {
        let query = `
        SELECT 
            s.id_siswa,
            s.nis,
            s.nisn,
            s.nama_lengkap,
            s.jenis_kelamin,
            s.tempat_lahir,
            s.tanggal_lahir
        FROM siswa s
        WHERE s.status = 'aktif'
        AND NOT EXISTS (
            SELECT 1 FROM siswa_kelas sk 
            WHERE sk.siswa_id = s.id_siswa 
            AND sk.id_tahun_ajaran_induk = ?
        )
    `;

        const params = [tahunAjaranId];

        // Filter search
        if (search) {
            query += ` AND (
            s.nama_lengkap LIKE ? 
            OR s.nis LIKE ? 
            OR s.nisn LIKE ?
        )`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        query += ` ORDER BY s.nama_lengkap ASC`;

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // GET detail siswa di kelas tertentu
    // ═════════════════════════════════════════════════════════════════════════════
    static async getSiswaByIdInKelas(siswaId, kelasId, tahunAjaranId) {
        const [rows] = await db.execute(`
            SELECT 
                s.id_siswa,
                s.nis,
                s.nisn,
                s.nama_lengkap,
                s.tempat_lahir,
                s.tanggal_lahir,
                s.jenis_kelamin,
                s.alamat,
                s.status,
                k.id_kelas,
                k.nama_kelas,
                sk.id_tahun_ajaran_induk
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
            WHERE s.id_siswa = ? 
              AND sk.kelas_id = ? 
              AND sk.id_tahun_ajaran_induk = ?
        `, [siswaId, kelasId, tahunAjaranId]);

        return rows.length > 0 ? rows[0] : null;
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // CREATE: Assign siswa existing ke kelas
    // ═════════════════════════════════════════════════════════════════════════════
    static async assignSiswaKeKelas(siswaId, kelasId, tahunAjaranId, connection = null) {
        const executor = connection || db;

        await executor.execute(`
            INSERT INTO siswa_kelas (siswa_id, kelas_id, id_tahun_ajaran_induk)
            VALUES (?, ?, ?)
        `, [siswaId, kelasId, tahunAjaranId]);

        return true;
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // DELETE: Hapus siswa dari kelas (hapus relasi saja)
    // ═════════════════════════════════════════════════════════════════════════════
    static async hapusSiswaDariKelas(siswaId, kelasId, tahunAjaranId) {
        const [result] = await db.execute(`
            DELETE FROM siswa_kelas 
            WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?
        `, [siswaId, kelasId, tahunAjaranId]);

        return result.affectedRows > 0;
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // CHECK: Apakah siswa sudah punya kelas di tahun ajaran ini
    // ═════════════════════════════════════════════════════════════════════════════
    static async checkSiswaPunyaKelas(siswaId, tahunAjaranId) {
        const [rows] = await db.execute(`
            SELECT sk.kelas_id, k.nama_kelas 
            FROM siswa_kelas sk
            INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
            WHERE sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?
        `, [siswaId, tahunAjaranId]);

        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = SiswaPerKelasModel;