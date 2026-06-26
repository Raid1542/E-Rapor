/**
 * Nama File: penilaianKategoriModel.js
 * Fungsi: Model untuk mengelola kategori nilai akademik
 * UPDATE: 
 *   - ✅ FIX: cekCoverage0to100 filter by jenis_penilaian
 *   - ✅ FIX: Return semua gaps (bukan hanya yang pertama)
 */

const db = require('../../config/db');

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

const getKategoriByMapel = async (mapelId, semesterId, kelasId, jenisPenilaian = null) => {
    let query = `
        SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan, kelas_id, jenis_penilaian
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
    `;
    
    const params = [mapelId, semesterId, kelasId];
    
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

// ✅ FIXED: Filter by jenis_penilaian + Return SEMUA gaps
const cekCoverage0to100 = async (mapelId, semesterId, kelasId, jenisPenilaian = null) => {
    let query = `
        SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ?
        AND kelas_id = ?
    `;
    
    const params = [mapelId, semesterId, kelasId];
    
    // ✅ TAMBAH filter jenis_penilaian
    if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
        query += ` AND jenis_penilaian = ?`;
        params.push(jenisPenilaian);
    }
    
    query += ` ORDER BY min_nilai ASC`;
    
    const [kategoriRows] = await db.execute(query, params);
    
    console.log(`🔍 [Coverage] Mapel: ${mapelId}, Kelas: ${kelasId}, Jenis: ${jenisPenilaian}, Kategori: ${kategoriRows.length}`);
    
    const gaps = [];
    
    // Jika tidak ada kategori sama sekali
    if (kategoriRows.length === 0) {
        return { 
            covered: false, 
            gaps: [{ aspek: 'Akademik', gap: '0-100' }] 
        };
    }
    
    // ✅ Cek gap dari 0 ke min_nilai pertama
    if (kategoriRows[0].min_nilai > 0) {
        gaps.push({ 
            aspek: 'Akademik', 
            gap: `0-${kategoriRows[0].min_nilai - 1}` 
        });
    }
    
    // ✅ Cek gap antar kategori (kumpulkan SEMUA gap)
    for (let i = 0; i < kategoriRows.length - 1; i++) {
        const currentMax = kategoriRows[i].max_nilai;
        const nextMin = kategoriRows[i + 1].min_nilai;
        if (nextMin > currentMax + 1) {
            gaps.push({ 
                aspek: 'Akademik', 
                gap: `${currentMax + 1}-${nextMin - 1}` 
            });
        }
    }
    
    // ✅ Cek gap dari max_nilai terakhir ke 100
    const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
    if (lastMax < 100) {
        gaps.push({ 
            aspek: 'Akademik', 
            gap: `${lastMax + 1}-100` 
        });
    }
    
    console.log(`🔍 [Coverage] Gaps ditemukan: ${gaps.length}`, gaps);
    
    return { 
        covered: gaps.length === 0, 
        gaps: gaps  // ✅ Return array gaps
    };
};

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