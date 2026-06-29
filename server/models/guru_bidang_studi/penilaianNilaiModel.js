/**
 * Nama File: penilaianNilaiModel.js
 * Fungsi: Model input nilai siswa (validasi akses, bobot per kelas, status aktif)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

// Ambil tahun ajaran yang sedang aktif
const getTahunAjaranAktif = async () => {
    const [rows] = await db.execute(`
        SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas
        FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    return rows[0] || null;
};

// Validasi akses guru ke mapel di kelas tertentu
const validateAksesGuru = async (userId, mapelId, kelasId, semesterId) => {
    const [rows] = await db.execute(
        'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
        [userId, mapelId, kelasId, semesterId]
    );
    return rows.length > 0;
};

// Validasi akses guru ke mapel (tanpa filter kelas)
const validateAksesGuruMapel = async (userId, mapelId, semesterId) => {
    const [rows] = await db.execute(
        'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?',
        [userId, mapelId, semesterId]
    );
    return rows.length > 0;
};

// Cek siswa aktif di kelas yang diajar guru + ambil kelas_id
const validateSiswaAktif = async (siswaId, userId, mapelId, semesterId, indukId) => {
    const [rows] = await db.execute(
        `SELECT sk.kelas_id, sk.status FROM siswa_kelas sk
            JOIN pembelajaran p ON sk.kelas_id = p.kelas_id
            WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ? AND sk.id_tahun_ajaran_induk = ?
            LIMIT 1`,
        [siswaId, userId, mapelId, semesterId, indukId]
    );
    if (rows.length === 0) return { valid: false, kelas_id: null, status: null };
    return { valid: rows[0].status === 'Aktif', kelas_id: rows[0].kelas_id, status: rows[0].status };
};

// Ambil nama kelas by ID
const getNamaKelas = async (kelasId) => {
    const [rows] = await db.execute('SELECT nama_kelas FROM kelas WHERE id_kelas = ?', [kelasId]);
    return rows[0]?.nama_kelas || 'Kelas Tidak Diketahui';
};

// Ambil daftar siswa aktif di kelas
const getSiswaByKelas = async (kelasId, indukId) => {
    const [rows] = await db.execute(
        `SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama
            FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND sk.status = 'Aktif'
            ORDER BY s.nama_lengkap`,
        [kelasId, indukId]
    );
    return rows;
};

// Ambil semua komponen penilaian
const getKomponenPenilaian = async () => {
    const [rows] = await db.execute('SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan');
    return rows;
};

// Ambil bobot per komponen (prioritas: spesifik kelas > global)
const getBobotByMapel = async (mapelId, semesterId, kelasId = null) => {
    let query = 'SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1';
    const params = [mapelId, semesterId];
    if (kelasId) { query += ' AND (kelas_id = ? OR kelas_id IS NULL)'; params.push(kelasId); }
    else { query += ' AND kelas_id IS NULL'; }
    const [rows] = await db.execute(query, params);
    const bobotMap = new Map();
    rows.forEach(row => {
        const existing = bobotMap.get(row.komponen_id);
        if (!existing || row.kelas_id !== null) bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0);
    });
    return bobotMap;
};

// Ambil konfigurasi kategori nilai rapor
const getKonfigurasiNilaiRapor = async (mapelId, semesterId, kelasId = null) => {
    let query = 'SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ?';
    const params = [mapelId, semesterId];
    if (kelasId) {
        query += ' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC';
        params.push(kelasId, kelasId);
    } else {
        query += ' AND kelas_id IS NULL ORDER BY min_nilai DESC';
    }
    const [rows] = await db.execute(query, params);
    return rows;
};

// Ambil nilai detail per komponen untuk 1 siswa
const getNilaiDetail = async (siswaId, mapelId, semesterId) => {
    const [rows] = await db.execute(
        'SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?',
        [siswaId, mapelId, semesterId]
    );
    return rows;
};

// Ambil nilai detail untuk banyak siswa sekaligus (batch)
const getNilaiDetailBatch = async (siswaIds, mapelId, semesterId) => {
    if (siswaIds.length === 0) return [];
    const placeholders = siswaIds.map(() => '?').join(',');
    const [rows] = await db.execute(
        `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
        [mapelId, semesterId, ...siswaIds]
    );
    return rows;
};

// Ambil nilai rapor PTS & PAS
const getNilaiRapor = async (mapelId, semesterId, semester) => {
    const [rows] = await db.execute(
        'SELECT siswa_id, nilai_rapor, deskripsi, jenis_penilaian, is_locked FROM nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?',
        [mapelId, semesterId, semester]
    );
    return rows;
};

// Ambil nilai rapor PTS saja
const getNilaiRaporPTS = async (siswaId, mapelId, semesterId, semester) => {
    const [rows] = await db.execute(
        'SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = \'PTS\'',
        [siswaId, mapelId, semesterId, semester]
    );
    return rows.length > 0 ? rows[0].nilai_rapor : 0;
};

// Cek apakah nilai rapor sudah dikunci
const isNilaiRaporLocked = async (siswaId, mapelId, semesterId, semester, jenisPenilaian) => {
    const [rows] = await db.execute(
        'SELECT is_locked FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?',
        [siswaId, mapelId, semesterId, semester, jenisPenilaian]
    );
    return rows.length > 0 && rows[0].is_locked === 1;
};

// Simpan/update nilai detail komponen
const simpanNilaiDetail = async (siswaId, mapelId, komponenId, nilai, semesterId, userId) => {
    await db.execute(
        `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
        [siswaId, mapelId, komponenId, nilai, semesterId, userId]
    );
};

// Hapus nilai detail komponen
const hapusNilaiDetail = async (siswaId, mapelId, komponenId, semesterId) => {
    await db.execute(
        'DELETE FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?',
        [siswaId, mapelId, komponenId, semesterId]
    );
};

// Simpan/update nilai rapor
const simpanNilaiRapor = async (data) => {
    const { siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId } = data;
    await db.execute(
        `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
        [siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId]
    );
};

// Ambil kelas tempat siswa belajar mapel tertentu
const getKelasBySiswa = async (siswaId, mapelId, userId, semesterId) => {
    const [rows] = await db.execute(
        `SELECT sk.kelas_id FROM siswa_kelas sk
            INNER JOIN pembelajaran p ON sk.kelas_id = p.kelas_id
            WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ?
            LIMIT 1`,
        [siswaId, userId, mapelId, semesterId]
    );
    return rows[0]?.kelas_id || null;
};

// Cari deskripsi berdasarkan nilai rapor
const getDeskripsiNilai = (nilai, configRows) => {
    for (const config of configRows) {
        if (nilai >= config.min_nilai && nilai <= config.max_nilai) return config.deskripsi;
    }
    return null;
};

module.exports = {
    getTahunAjaranAktif, validateAksesGuru, validateAksesGuruMapel, validateSiswaAktif, getNamaKelas,
    getSiswaByKelas, getKomponenPenilaian, getBobotByMapel, getKonfigurasiNilaiRapor, getNilaiDetail,
    getNilaiDetailBatch, getNilaiRapor, getNilaiRaporPTS, isNilaiRaporLocked, simpanNilaiDetail,
    hapusNilaiDetail, simpanNilaiRapor, getKelasBySiswa, getDeskripsiNilai,
};