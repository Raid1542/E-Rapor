/**
 * Nama File: penilaianKategoriModel.js
 * Fungsi: Model untuk mengelola kategori nilai akademik (predikat A, B, C, dll)
 *         - CRUD kategori nilai
 *         - Validasi overlap range
 *         - Validasi coverage 0-100
 *         - Cek dampak ke nilai siswa
 * Pembuat: Irwan Nugraha (refactor dari penilaianKategoriController.js)
 * Tanggal: 9 Juni 2026
 */

const db = require('../../config/db');

const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester
        FROM tahun_ajaran 
        WHERE status = 'aktif' 
        LIMIT 1
    `);
    return taRows.length > 0 ? taRows[0] : null;
};

const validateGuruMapel = async (userId, mapelId, tahunAjaranIndukId) => {
    const [rows] = await db.execute(
        `SELECT 1 FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
        [userId, mapelId, tahunAjaranIndukId]
    );
    return rows.length > 0;
};

const getKategoriByMapel = async (mapelId, semesterId) => {
    const [rows] = await db.execute(
        `SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan
            FROM konfigurasi_nilai_rapor
            WHERE mapel_id = ? AND tahun_ajaran_id = ?
            ORDER BY urutan ASC`,
        [mapelId, semesterId]
    );
    return rows;
};

const getKategoriById = async (id) => {
    const [rows] = await db.execute(
        `SELECT id_config, mapel_id, min_nilai, max_nilai, deskripsi, urutan
            FROM konfigurasi_nilai_rapor 
            WHERE id_config = ?`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
};

const getLastUrutan = async (mapelId, semesterId) => {
    const [rows] = await db.execute(
        `SELECT IFNULL(MAX(urutan), 0) as max_urutan
            FROM konfigurasi_nilai_rapor 
            WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
        [mapelId, semesterId]
    );
    return rows[0]?.max_urutan || 0;
};

const cekRangeOverlap = async (mapelId, semesterId, minNilai, maxNilai, excludeId = null) => {
    let query = `
        SELECT id_config, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        AND (
            (? <= max_nilai AND ? >= min_nilai)
        )
    `;
    const params = [mapelId, semesterId, minNilai, maxNilai];

    if (excludeId) {
        query += ` AND id_config != ?`;
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

const formatOverlapInfo = (overlaps) => {
    return overlaps.map(o =>
        `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`
    ).join(', ');
};

const cekCoverage0to100 = async (mapelId, semesterId) => {
    const [kategoriRows] = await db.execute(`
        SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        ORDER BY min_nilai ASC
    `, [mapelId, semesterId]);

    if (kategoriRows.length === 0) {
        return { covered: false, gap: '0-100' };
    }

    // Cek apakah dimulai dari 0
    if (kategoriRows[0].min_nilai > 0) {
        return {
            covered: false,
            gap: `0-${kategoriRows[0].min_nilai - 1}`
        };
    }

    // Cek apakah ada gap antar kategori
    for (let i = 0; i < kategoriRows.length - 1; i++) {
        const currentMax = kategoriRows[i].max_nilai;
        const nextMin = kategoriRows[i + 1].min_nilai;

        if (nextMin > currentMax + 1) {
            return {
                covered: false,
                gap: `${currentMax + 1}-${nextMin - 1}`
            };
        }
    }

    // Cek apakah berakhir di 100
    const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
    if (lastMax < 100) {
        return {
            covered: false,
            gap: `${lastMax + 1}-100`
        };
    }

    return { covered: true };
};

const createKategori = async (data) => {
    const { mapel_id, semester_id, min_nilai, max_nilai, deskripsi } = data;

    // Ambil urutan terakhir
    const lastUrutan = await getLastUrutan(mapel_id, semester_id);
    const urutan = lastUrutan + 1;

    const [result] = await db.execute(
        `INSERT INTO konfigurasi_nilai_rapor 
            (mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [mapel_id, semester_id, min_nilai, max_nilai, deskripsi, urutan]
    );

    return { insertId: result.insertId };
};

const updateKategori = async (id, data) => {
    const { min_nilai, max_nilai, deskripsi, urutan } = data;

    const [result] = await db.execute(
        `UPDATE konfigurasi_nilai_rapor 
            SET 
            min_nilai = ?,
            max_nilai = ?,
            deskripsi = ?,
            urutan = ?
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

const cekNilaiSiswaInRange = async (mapelId, semesterId, minNilai, maxNilai) => {
    const [rows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM nilai_rapor 
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        AND nilai_rapor BETWEEN ? AND ?
    `, [mapelId, semesterId, minNilai, maxNilai]);

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
    // Helper
    getTahunAjaranAktif,
    validateGuruMapel,

    // Read
    getKategoriByMapel,
    getKategoriById,
    getLastUrutan,

    // Validasi
    cekRangeOverlap,
    formatOverlapInfo,
    cekCoverage0to100,
    isUnchanged,

    // Write
    createKategori,
    updateKategori,
    deleteKategori,

    // Dampak
    cekNilaiSiswaInRange,
};