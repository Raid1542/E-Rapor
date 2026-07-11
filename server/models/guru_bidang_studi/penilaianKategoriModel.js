/**
 * Nama File: penilaianKategoriModel.js
 * Fungsi: Model kategori nilai akademik (filter jenis_penilaian, cek coverage)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA QUERY SQL
// ═════════════════════════════════════════════════════════════════════════════

const QUERY_TAHUN_AJARAN_AKTIF = `
    SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas
    FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
`;

const QUERY_VALIDATE_GURU_MAPEL = `
    SELECT 1 FROM pembelajaran 
    WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_GET_KATEGORI_BY_MAPEL = `
    SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan, kelas_id, jenis_penilaian 
    FROM konfigurasi_nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ?
`;

const QUERY_GET_KATEGORI_BY_ID = `
    SELECT id_config, mapel_id, kelas_id, min_nilai, max_nilai, deskripsi, urutan, jenis_penilaian 
    FROM konfigurasi_nilai_rapor 
    WHERE id_config = ?
`;

const QUERY_GET_LAST_URUTAN = `
    SELECT IFNULL(MAX(urutan), 0) as max_urutan 
    FROM konfigurasi_nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ?
`;

const QUERY_CEK_RANGE_OVERLAP = `
    SELECT id_config, min_nilai, max_nilai, deskripsi 
    FROM konfigurasi_nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ? AND (? <= max_nilai AND ? >= min_nilai)
`;

const QUERY_CEK_COVERAGE_0_TO_100 = `
    SELECT min_nilai, max_nilai 
    FROM konfigurasi_nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ?
`;

const QUERY_CREATE_KATEGORI = `
    INSERT INTO konfigurasi_nilai_rapor (mapel_id, kelas_id, tahun_ajaran_id, jenis_penilaian, min_nilai, max_nilai, deskripsi, urutan) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const QUERY_UPDATE_KATEGORI = `
    UPDATE konfigurasi_nilai_rapor 
    SET min_nilai = ?, max_nilai = ?, deskripsi = ?, urutan = ? 
    WHERE id_config = ?
`;

const QUERY_DELETE_KATEGORI = `
    DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ?
`;

const QUERY_CEK_NILAI_SISWA_IN_RANGE = `
    SELECT COUNT(*) as total 
    FROM nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ? AND nilai_rapor BETWEEN ? AND ?
`;

// ═════════════════════════════════════════════════════════════════════════════
// FUNGSI MODEL
// ═════════════════════════════════════════════════════════════════════════════

// Ambil tahun ajaran yang sedang aktif
const getTahunAjaranAktif = async () => {
    try {
        const [taRows] = await db.execute(QUERY_TAHUN_AJARAN_AKTIF);
        return taRows.length > 0 ? taRows[0] : null;
    } catch (err) {
        console.error('Error getTahunAjaranAktif:', err);
        throw new Error('Gagal mengambil tahun ajaran aktif');
    }
};

// Validasi apakah guru berhak mengajar mapel di semester ini
const validateGuruMapel = async (userId, mapelId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_GURU_MAPEL, [userId, mapelId, semesterId]);
        return rows.length > 0;
    } catch (err) {
        console.error('Error validateGuruMapel:', err);
        throw new Error('Gagal memvalidasi guru mapel');
    }
};

// Ambil kategori nilai per mapel (bisa filter PTS/PAS)
const getKategoriByMapel = async (mapelId, semesterId, kelasId, jenisPenilaian = null) => {
    try {
        let query = QUERY_GET_KATEGORI_BY_MAPEL;
        const params = [mapelId, semesterId, kelasId];
        
        if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
            query += ' AND jenis_penilaian = ?';
            params.push(jenisPenilaian);
        }
        
        query += ' ORDER BY urutan ASC';
        
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (err) {
        console.error('Error getKategoriByMapel:', err);
        throw new Error('Gagal mengambil kategori nilai');
    }
};

// Ambil detail kategori by ID
const getKategoriById = async (id) => {
    try {
        const [rows] = await db.execute(QUERY_GET_KATEGORI_BY_ID, [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('Error getKategoriById:', err);
        throw new Error('Gagal mengambil detail kategori');
    }
};

// Ambil urutan terakhir untuk auto-increment
const getLastUrutan = async (mapelId, semesterId, kelasId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_LAST_URUTAN, [mapelId, semesterId, kelasId]);
        return rows[0]?.max_urutan || 0;
    } catch (err) {
        console.error('Error getLastUrutan:', err);
        throw new Error('Gagal mengambil urutan terakhir');
    }
};

// Cek apakah range nilai tumpang tindih dengan kategori lain
const cekRangeOverlap = async (mapelId, semesterId, minNilai, maxNilai, kelasId, excludeId = null, jenisPenilaian = null) => {
    try {
        let query = QUERY_CEK_RANGE_OVERLAP;
        const params = [mapelId, semesterId, kelasId, minNilai, maxNilai];
        
        if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
            query += ' AND jenis_penilaian = ?';
            params.push(jenisPenilaian);
        }
        
        if (excludeId) {
            query += ' AND id_config != ?';
            params.push(excludeId);
        }
        
        const [overlaps] = await db.execute(query, params);
        return overlaps;
    } catch (err) {
        console.error('Error cekRangeOverlap:', err);
        throw new Error('Gagal mengecek range overlap');
    }
};

// Format pesan overlap agar mudah dibaca
const formatOverlapInfo = (overlaps) => {
    return overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
};

// Cek apakah kategori sudah mencakup 0-100 (return semua gaps)
const cekCoverage0to100 = async (mapelId, semesterId, kelasId, jenisPenilaian = null) => {
    try {
        let query = QUERY_CEK_COVERAGE_0_TO_100;
        const params = [mapelId, semesterId, kelasId];
        
        if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
            query += ' AND jenis_penilaian = ?';
            params.push(jenisPenilaian);
        }
        
        query += ' ORDER BY min_nilai ASC';
        
        const [kategoriRows] = await db.execute(query, params);
        const gaps = [];
        
        // Cek apakah ada kategori sama sekali
        if (kategoriRows.length === 0) {
            return { covered: false, gaps: [{ aspek: 'Akademik', gap: '0-100' }] };
        }
        
        // Cek celah di awal (0 sampai min_nilai pertama)
        if (kategoriRows[0].min_nilai > 0) {
            gaps.push({ aspek: 'Akademik', gap: `0-${kategoriRows[0].min_nilai - 1}` });
        }
        
        // Cek celah antar kategori
        for (let i = 0; i < kategoriRows.length - 1; i++) {
            const currentMax = kategoriRows[i].max_nilai;
            const nextMin = kategoriRows[i + 1].min_nilai;
            if (nextMin > currentMax + 1) {
                gaps.push({ aspek: 'Akademik', gap: `${currentMax + 1}-${nextMin - 1}` });
            }
        }
        
        // Cek celah di akhir (max_nilai terakhir sampai 100)
        const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
        if (lastMax < 100) {
            gaps.push({ aspek: 'Akademik', gap: `${lastMax + 1}-100` });
        }
        
        return { covered: gaps.length === 0, gaps };
    } catch (err) {
        console.error('Error cekCoverage0to100:', err);
        throw new Error('Gagal mengecek coverage 0-100');
    }
};

// Tambah kategori nilai baru
const createKategori = async (data) => {
    try {
        const { mapel_id, semester_id, min_nilai, max_nilai, deskripsi, kelas_id, jenis_penilaian } = data;
        const lastUrutan = await getLastUrutan(mapel_id, semester_id, kelas_id);
        const urutan = lastUrutan + 1;
        
        const [result] = await db.execute(QUERY_CREATE_KATEGORI, [
            mapel_id, kelas_id, semester_id, jenis_penilaian, min_nilai, max_nilai, deskripsi, urutan
        ]);
        
        return { insertId: result.insertId };
    } catch (err) {
        console.error('Error createKategori:', err);
        throw new Error('Gagal membuat kategori');
    }
};

// Update kategori nilai
const updateKategori = async (id, data) => {
    try {
        const { min_nilai, max_nilai, deskripsi, urutan } = data;
        const [result] = await db.execute(QUERY_UPDATE_KATEGORI, [
            min_nilai, max_nilai, deskripsi, urutan, id
        ]);
        return result.affectedRows;
    } catch (err) {
        console.error('Error updateKategori:', err);
        throw new Error('Gagal mengupdate kategori');
    }
};

// Hapus kategori nilai
const deleteKategori = async (id) => {
    try {
        const [result] = await db.execute(QUERY_DELETE_KATEGORI, [id]);
        return result.affectedRows;
    } catch (err) {
        console.error('Error deleteKategori:', err);
        throw new Error('Gagal menghapus kategori');
    }
};

// Cek apakah ada nilai siswa yang masuk range kategori
const cekNilaiSiswaInRange = async (mapelId, semesterId, minNilai, maxNilai, kelasId, jenisPenilaian = null) => {
    try {
        let query = QUERY_CEK_NILAI_SISWA_IN_RANGE;
        const params = [mapelId, semesterId, kelasId, minNilai, maxNilai];

        if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
            query += ' AND jenis_penilaian = ?';
            params.push(jenisPenilaian);
        }

        const [rows] = await db.execute(query, params);
        return rows[0]?.total || 0;
    } catch (err) {
        console.error('Error cekNilaiSiswaInRange:', err);
        throw new Error('Gagal mengecek nilai siswa dalam range');
    }
};

// Cek apakah data tidak berubah (untuk validasi update)
const isUnchanged = (oldData, newData) => {
    return (
        oldData.min_nilai === newData.min_nilai &&
        oldData.max_nilai === newData.max_nilai &&
        oldData.deskripsi.trim() === newData.deskripsi.trim()
    );
};

module.exports = {
    getTahunAjaranAktif, validateGuruMapel, getKategoriByMapel, getKategoriById, getLastUrutan,
    cekRangeOverlap, formatOverlapInfo, cekCoverage0to100, isUnchanged, createKategori,
    updateKategori, deleteKategori, cekNilaiSiswaInRange,
};