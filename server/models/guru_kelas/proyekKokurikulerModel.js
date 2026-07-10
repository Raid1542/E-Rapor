/**
 * Nama File: proyekKokurikulerModel.js
 * Fungsi: Model untuk manajemen judul proyek kokurikuler per kelas
 *         Menangani operasi CRUD judul proyek per tahun ajaran
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta untuk query SQL
const QUERY_GET_JUDUL_PROYEK = `
    SELECT id_judul_proyek, id_tahun_ajaran, kelas_id, judul 
    FROM judul_proyek_per_tahun_ajaran 
    WHERE kelas_id = ? AND id_tahun_ajaran = ? 
    LIMIT 1
`;

const QUERY_CHECK_JUDUL_PROYEK = `
    SELECT id_judul_proyek 
    FROM judul_proyek_per_tahun_ajaran 
    WHERE kelas_id = ? AND id_tahun_ajaran = ?
`;

const QUERY_UPDATE_JUDUL_PROYEK = `
    UPDATE judul_proyek_per_tahun_ajaran 
    SET judul = ?, updated_at = NOW() 
    WHERE kelas_id = ? AND id_tahun_ajaran = ?
`;

const QUERY_INSERT_JUDUL_PROYEK = `
    INSERT INTO judul_proyek_per_tahun_ajaran 
    (id_tahun_ajaran, kelas_id, judul, created_at, updated_at) 
    VALUES (?, ?, ?, NOW(), NOW())
`;

const QUERY_DELETE_JUDUL_PROYEK = `
    DELETE FROM judul_proyek_per_tahun_ajaran 
    WHERE kelas_id = ? AND id_tahun_ajaran = ?
`;

// Ambil judul proyek berdasarkan kelas dan tahun ajaran
exports.getJudulProyekByKelas = async (kelasId, tahunAjaranId) => {
    if (!kelasId || !tahunAjaranId) {
        throw new Error('ID kelas dan tahun ajaran wajib diisi');
    }

    try {
        const [rows] = await db.execute(QUERY_GET_JUDUL_PROYEK, [kelasId, tahunAjaranId]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('Error getJudulProyekByKelas:', err);
        throw new Error('Gagal mengambil judul proyek');
    }
};

// Simpan atau update judul proyek (UPSERT)
exports.saveJudulProyek = async (kelasId, tahunAjaranId, judul) => {
    if (!kelasId || !tahunAjaranId || !judul) {
        throw new Error('ID kelas, tahun ajaran, dan judul wajib diisi');
    }

    try {
        // Cek apakah judul sudah ada
        const [existing] = await db.execute(QUERY_CHECK_JUDUL_PROYEK, [kelasId, tahunAjaranId]);

        if (existing.length > 0) {
            // Update judul yang sudah ada
            await db.execute(QUERY_UPDATE_JUDUL_PROYEK, [judul, kelasId, tahunAjaranId]);
            return { id: existing[0].id_judul_proyek, action: 'updated' };
        } else {
            // Insert judul baru
            const [result] = await db.execute(QUERY_INSERT_JUDUL_PROYEK, [tahunAjaranId, kelasId, judul]);
            return { id: result.insertId, action: 'created' };
        }
    } catch (err) {
        console.error('Error saveJudulProyek:', err);
        throw new Error('Gagal menyimpan judul proyek');
    }
};

// Hapus judul proyek
exports.deleteJudulProyek = async (kelasId, tahunAjaranId) => {
    if (!kelasId || !tahunAjaranId) {
        throw new Error('ID kelas dan tahun ajaran wajib diisi');
    }

    try {
        const [result] = await db.execute(QUERY_DELETE_JUDUL_PROYEK, [kelasId, tahunAjaranId]);
        return result.affectedRows > 0;
    } catch (err) {
        console.error('Error deleteJudulProyek:', err);
        throw new Error('Gagal menghapus judul proyek');
    }
};