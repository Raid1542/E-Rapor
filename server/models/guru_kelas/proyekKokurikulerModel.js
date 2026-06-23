/**
 * Nama File: proyekKokurikulerModel.js
 * Fungsi: Handle query database untuk judul proyek kokurikuler per kelas
 * ✅ FIXED: Hapus kolom deskripsi
 */

const db = require('../../config/db');

/**
 * Ambil judul proyek berdasarkan kelas dan tahun ajaran
 */
exports.getJudulProyekByKelas = async (kelasId, tahunAjaranId) => {
    const [rows] = await db.execute(`
        SELECT 
            id_judul_proyek,
            id_tahun_ajaran,
            kelas_id,
            judul
        FROM judul_proyek_per_tahun_ajaran
        WHERE kelas_id = ? AND id_tahun_ajaran = ?
        LIMIT 1
    `, [kelasId, tahunAjaranId]);
    
    return rows.length > 0 ? rows[0] : null;
};

/**
 * Simpan atau update judul proyek (UPSERT)
 * ✅ FIXED: Hapus parameter deskripsi
 */
exports.saveJudulProyek = async (kelasId, tahunAjaranId, judul) => {
    const [existing] = await db.execute(`
        SELECT id_judul_proyek 
        FROM judul_proyek_per_tahun_ajaran 
        WHERE kelas_id = ? AND id_tahun_ajaran = ?
    `, [kelasId, tahunAjaranId]);

    if (existing.length > 0) {
        // Update jika sudah ada
        await db.execute(`
            UPDATE judul_proyek_per_tahun_ajaran 
            SET judul = ?, updated_at = NOW()
            WHERE kelas_id = ? AND id_tahun_ajaran = ?
        `, [judul, kelasId, tahunAjaranId]);
        
        return { id: existing[0].id_judul_proyek, action: 'updated' };
    } else {
        // Insert jika belum ada
        const [result] = await db.execute(`
            INSERT INTO judul_proyek_per_tahun_ajaran 
            (id_tahun_ajaran, kelas_id, judul, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
        `, [tahunAjaranId, kelasId, judul]);
        
        return { id: result.insertId, action: 'created' };
    }
};

/**
 * Hapus judul proyek
 */
exports.deleteJudulProyek = async (kelasId, tahunAjaranId) => {
    const [result] = await db.execute(`
        DELETE FROM judul_proyek_per_tahun_ajaran 
        WHERE kelas_id = ? AND id_tahun_ajaran = ?
    `, [kelasId, tahunAjaranId]);
    
    return result.affectedRows > 0;
};