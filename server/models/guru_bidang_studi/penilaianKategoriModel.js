/**
 * Nama File: penilaianKategoriModel.js
 * Fungsi: Model untuk mengelola kategori nilai akademik
 * UPDATE: 
 *   - Fix bug kelas_id, pastikan semua query per kelas spesifik
 *   - ✅ FIX: Tambah status_pts, status_pas di getTahunAjaranAktif
 */

const db = require('../../config/db');

// ✅ FIXED: Tambah status_pts dan status_pas
const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT 
            id_tahun_ajaran, 
            id_tahun_ajaran_induk, 
            semester,
            status_pts,
            status_pas
        FROM tahun_ajaran 
        WHERE status = 'aktif' 
        LIMIT 1
    `);
    return taRows.length > 0 ? taRows[0] : null;
};

const validateGuruMapel = async (userId, mapelId, semesterId) => {
    const [rows] = await db.execute(
        `SELECT 1 FROM pembelajaran 
         WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
        [userId, mapelId, semesterId]
    );
    return rows.length > 0;
};

// ✅ FIX: Filter berdasarkan jenis penilaian aktif
const getKategoriByMapel = async (mapelId, semesterId, kelasId, jenisPenilaian = null) => {
    let query = `
        SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan, kelas_id, jenis_penilaian
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
    `;
    
    const params = [mapelId, semesterId, kelasId];
    
    // ✅ TAMBAH filter jenis_penilaian jika ada
    if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
        query += ` AND jenis_penilaian = ?`;
        params.push(jenisPenilaian);
    }
    
    query += ` ORDER BY urutan ASC`;
    
    const [rows] = await db.execute(query, params);
    return rows;
}

const getKategoriById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id_config, mapel_id, kelas_id, min_nilai, max_nilai, deskripsi, urutan
         FROM konfigurasi_nilai_rapor 
         WHERE id_config = ?`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
};

// ✅ FIX: Hitung urutan hanya untuk kelas spesifik
const getLastUrutan = async (mapelId, semesterId, kelasId) => {
    const query = `
        SELECT IFNULL(MAX(urutan), 0) as max_urutan
        FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
    `;
    
    const [rows] = await db.execute(query, [mapelId, semesterId, kelasId]);
    return rows[0]?.max_urutan || 0;
};

// ✅ FIXED: Tambah parameter jenis_penilaian
const cekRangeOverlap = async (mapelId, semesterId, minNilai, maxNilai, kelasId, excludeId = null, jenisPenilaian = null) => {
    let query = `
        SELECT id_config, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
        AND (? <= max_nilai AND ? >= min_nilai)
    `;
    const params = [mapelId, semesterId, kelasId, minNilai, maxNilai];
    
    // ✅ TAMBAH filter jenis_penilaian
    if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
        query += ` AND jenis_penilaian = ?`;
        params.push(jenisPenilaian);
    }
    
    if (excludeId) {
        query += ` AND id_config != ?`;
        params.push(excludeId);
    }
    
    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

const formatOverlapInfo = (overlaps) => {
    return overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
};

// ✅ FIX: Hitung coverage hanya untuk kelas spesifik
const cekCoverage0to100 = async (mapelId, semesterId, kelasId) => {
    const query = `
        SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
        ORDER BY min_nilai ASC
    `;
    
    const [kategoriRows] = await db.execute(query, [mapelId, semesterId, kelasId]);
    
    if (kategoriRows.length === 0) {
        return { covered: false, gap: '0-100' };
    }
    
    if (kategoriRows[0].min_nilai > 0) {
        return { covered: false, gap: `0-${kategoriRows[0].min_nilai - 1}` };
    }
    
    for (let i = 0; i < kategoriRows.length - 1; i++) {
        const currentMax = kategoriRows[i].max_nilai;
        const nextMin = kategoriRows[i + 1].min_nilai;
        if (nextMin > currentMax + 1) {
            return { covered: false, gap: `${currentMax + 1}-${nextMin - 1}` };
        }
    }
    
    const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
    if (lastMax < 100) {
        return { covered: false, gap: `${lastMax + 1}-100` };
    }
    
    return { covered: true };
};

// ✅ FIXED: Simpan dengan jenis_penilaian
const createKategori = async (data) => {
    const { mapel_id, semester_id, min_nilai, max_nilai, deskripsi, kelas_id, jenis_penilaian } = data;
    
    const lastUrutan = await getLastUrutan(mapel_id, semester_id, kelas_id);
    const urutan = lastUrutan + 1;
    
    const [result] = await db.execute(
        `INSERT INTO konfigurasi_nilai_rapor 
         (mapel_id, kelas_id, tahun_ajaran_id, jenis_penilaian, min_nilai, max_nilai, deskripsi, urutan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mapel_id, kelas_id, semester_id, jenis_penilaian, min_nilai, max_nilai, deskripsi, urutan]
    );
    
    return { insertId: result.insertId };
};

const updateKategori = async (id, data) => {
    const { min_nilai, max_nilai, deskripsi, urutan } = data;
    
    const [result] = await db.execute(
        `UPDATE konfigurasi_nilai_rapor 
         SET min_nilai = ?, max_nilai = ?, deskripsi = ?, urutan = ?
         WHERE id_config = ?`,
        [min_nilai, max_nilai, deskripsi, urutan, id]
    );
    
    return result.affectedRows;
};

const deleteKategori = async (id) => {
    const [result] = await db.execute(
        `DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ?`,
        [id]
    );
    return result.affectedRows;
};

// ✅ FIX: Cek nilai siswa dengan kelas_id spesifik
const cekNilaiSiswaInRange = async (mapelId, semesterId, minNilai, maxNilai, kelasId) => {
    const query = `
        SELECT COUNT(*) as total 
        FROM nilai_rapor 
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
        AND nilai_rapor BETWEEN ? AND ?
    `;
    
    const [rows] = await db.execute(query, [mapelId, semesterId, kelasId, minNilai, maxNilai]);
    return rows[0]?.total || 0;
};

const isUnchanged = (oldData, newData) => {
    return (
        oldData.min_nilai === newData.min_nilai &&
        oldData.max_nilai === newData.max_nilai &&
        oldData.deskripsi.trim() === newData.deskripsi.trim()
    );
};

module.exports = {
    getTahunAjaranAktif,
    validateGuruMapel,
    getKategoriByMapel,
    getKategoriById,
    getLastUrutan,
    cekRangeOverlap,
    formatOverlapInfo,
    cekCoverage0to100,
    isUnchanged,
    createKategori,
    updateKategori,
    deleteKategori,
    cekNilaiSiswaInRange,
};