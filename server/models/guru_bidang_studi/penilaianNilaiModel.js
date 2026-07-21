/**
 * Nama File: penilaianNilaiModel.js
 * Fungsi: Model input nilai siswa (validasi akses, bobot per kelas, status aktif).
 *         Menerapkan clamping dan filtering ketat untuk mencegah human error.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta query SQL
const QUERY_TAHUN_AJARAN_AKTIF = `
    SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas
    FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
`;

const QUERY_VALIDATE_AKSES_GURU = `
    SELECT 1 FROM pembelajaran 
    WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_VALIDATE_AKSES_GURU_MAPEL = `
    SELECT 1 FROM pembelajaran 
    WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_VALIDATE_SISWA_AKTIF = `
    SELECT sk.kelas_id, s.status 
    FROM siswa_kelas sk
    JOIN siswa s ON sk.siswa_id = s.id_siswa
    JOIN pembelajaran p ON sk.kelas_id = p.kelas_id
    WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ? AND sk.id_tahun_ajaran_induk = ?
    LIMIT 1
`;

const QUERY_GET_NAMA_KELAS = `
    SELECT nama_kelas FROM kelas WHERE id_kelas = ?
`;

const QUERY_GET_SISWA_BY_KELAS = `
    SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama
    FROM siswa s 
    JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
    WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
    ORDER BY s.nama_lengkap ASC
`;

const QUERY_GET_KOMPONEN_PENILAIAN = `
    SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC
`;

const QUERY_GET_BOBOT_BY_MAPEL = `
    SELECT komponen_id, bobot, kelas_id 
    FROM konfigurasi_mapel_komponen 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1
`;

const QUERY_GET_KONFIGURASI_NILAI_RAPOR = `
    SELECT min_nilai, max_nilai, deskripsi 
    FROM konfigurasi_nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_GET_NILAI_DETAIL = `
    SELECT komponen_id, nilai 
    FROM nilai_detail 
    WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_GET_NILAI_RAPOR = `
    SELECT siswa_id, nilai_rapor, deskripsi, jenis_penilaian, is_locked 
    FROM nilai_rapor 
    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?
`;

const QUERY_GET_NILAI_RAPOR_PTS = `
    SELECT nilai_rapor 
    FROM nilai_rapor 
    WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'
`;

const QUERY_IS_NILAI_RAPOR_LOCKED = `
    SELECT is_locked 
    FROM nilai_rapor 
    WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?
`;

const QUERY_SIMPAN_NILAI_DETAIL = `
    INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()
`;

const QUERY_HAPUS_NILAI_DETAIL = `
    DELETE FROM nilai_detail 
    WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_SIMPAN_NILAI_RAPOR = `
    INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()
`;

const QUERY_GET_KELAS_BY_SISWA = `
    SELECT sk.kelas_id 
    FROM siswa_kelas sk
    INNER JOIN pembelajaran p ON sk.kelas_id = p.kelas_id
    WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ?
    LIMIT 1
`;

/**
 * Ambil tahun ajaran yang sedang aktif.
 */
const getTahunAjaranAktif = async () => {
    try {
        const [rows] = await db.execute(QUERY_TAHUN_AJARAN_AKTIF);
        return rows[0] || null;
    } catch (err) {
        throw new Error('Gagal mengambil tahun ajaran aktif');
    }
};

/**
 * Validasi apakah guru berhak mengajar mapel di kelas tertentu.
 */
const validateAksesGuru = async (userId, mapelId, kelasId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_AKSES_GURU, [userId, mapelId, kelasId, semesterId]);
        return rows.length > 0;
    } catch (err) {
        throw new Error('Gagal memvalidasi akses guru');
    }
};

/**
 * Validasi apakah guru berhak mengajar mapel secara umum di semester ini.
 */
const validateAksesGuruMapel = async (userId, mapelId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_AKSES_GURU_MAPEL, [userId, mapelId, semesterId]);
        return rows.length > 0;
    } catch (err) {
        throw new Error('Gagal memvalidasi akses guru mapel');
    }
};

/**
 * Validasi status aktif siswa di kelas yang diajar guru.
 */
const validateSiswaAktif = async (siswaId, userId, mapelId, semesterId, indukId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_SISWA_AKTIF, [siswaId, userId, mapelId, semesterId, indukId]);
        if (rows.length === 0) {
            return { valid: false, kelas_id: null, status: null };
        }
        return { valid: rows[0].status === 'aktif', kelas_id: rows[0].kelas_id, status: rows[0].status };
    } catch (err) {
        throw new Error('Gagal memvalidasi siswa aktif');
    }
};

/**
 * Ambil nama kelas berdasarkan ID.
 */
const getNamaKelas = async (kelasId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NAMA_KELAS, [kelasId]);
        return rows[0]?.nama_kelas || 'Kelas Tidak Diketahui';
    } catch (err) {
        throw new Error('Gagal mengambil nama kelas');
    }
};

/**
 * Ambil daftar siswa aktif di kelas tertentu.
 */
const getSiswaByKelas = async (kelasId, indukId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_SISWA_BY_KELAS, [kelasId, indukId]);
        return rows;
    } catch (err) {
        throw new Error('Gagal mengambil daftar siswa');
    }
};

/**
 * Ambil daftar komponen penilaian.
 */
const getKomponenPenilaian = async () => {
    try {
        const [rows] = await db.execute(QUERY_GET_KOMPONEN_PENILAIAN);
        return rows;
    } catch (err) {
        throw new Error('Gagal mengambil komponen penilaian');
    }
};

/**
 * Ambil bobot per komponen untuk mata pelajaran tertentu.
 */
const getBobotByMapel = async (mapelId, semesterId, kelasId = null) => {
    try {
        let query = QUERY_GET_BOBOT_BY_MAPEL;
        const params = [mapelId, semesterId];

        if (kelasId) {
            query += ' AND (kelas_id = ? OR kelas_id IS NULL)';
            params.push(kelasId);
        } else {
            query += ' AND kelas_id IS NULL';
        }

        const [rows] = await db.execute(query, params);

        const bobotMap = new Map();
        rows.forEach(row => {
            const existing = bobotMap.get(row.komponen_id);
            if (!existing || row.kelas_id !== null) {
                bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0);
            }
        });

        return bobotMap;
    } catch (err) {
        throw new Error('Gagal mengambil bobot per komponen');
    }
};

/**
 * Ambil konfigurasi nilai rapor untuk mata pelajaran tertentu.
 */
const getKonfigurasiNilaiRapor = async (mapelId, semesterId, kelasId = null, jenisPenilaian = null) => {
    try {
        let query = QUERY_GET_KONFIGURASI_NILAI_RAPOR;
        const params = [mapelId, semesterId];

        if (jenisPenilaian && ['PTS', 'PAS'].includes(jenisPenilaian)) {
            query += ' AND jenis_penilaian = ?';
            params.push(jenisPenilaian);
        }

        if (kelasId) {
            query += ' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC';
            params.push(kelasId, kelasId);
        } else {
            query += ' AND kelas_id IS NULL ORDER BY min_nilai DESC';
        }

        const [rows] = await db.execute(query, params);
        return rows;
    } catch (err) {
        throw new Error('Gagal mengambil konfigurasi nilai rapor');
    }
};

/**
 * Ambil nilai detail untuk siswa tertentu.
 */
const getNilaiDetail = async (siswaId, mapelId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NILAI_DETAIL, [siswaId, mapelId, semesterId]);
        return rows;
    } catch (err) {
        throw new Error('Gagal mengambil nilai detail');
    }
};

/**
 * Ambil nilai detail untuk banyak siswa sekaligus.
 */
const getNilaiDetailBatch = async (siswaIds, mapelId, semesterId) => {
    try {
        if (siswaIds.length === 0) return [];

        const placeholders = siswaIds.map(() => '?').join(',');
        const query = `
        SELECT siswa_id, komponen_id, nilai 
        FROM nilai_detail 
        WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})
    `;

        const [rows] = await db.execute(query, [mapelId, semesterId, ...siswaIds]);
        return rows;
    } catch (err) {
        throw new Error('Gagal mengambil nilai detail batch');
    }
};

/**
 * Ambil nilai rapor untuk mata pelajaran tertentu.
 */
const getNilaiRapor = async (mapelId, semesterId, semester) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NILAI_RAPOR, [mapelId, semesterId, semester]);
        return rows;
    } catch (err) {
        throw new Error('Gagal mengambil nilai rapor');
    }
};

/**
 * Ambil nilai rapor PTS untuk siswa tertentu.
 */
const getNilaiRaporPTS = async (siswaId, mapelId, semesterId, semester) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NILAI_RAPOR_PTS, [siswaId, mapelId, semesterId, semester]);
        return rows.length > 0 ? rows[0].nilai_rapor : 0;
    } catch (err) {
        throw new Error('Gagal mengambil nilai rapor PTS');
    }
};

/**
 * Cek apakah nilai rapor sudah dikunci.
 */
const isNilaiRaporLocked = async (siswaId, mapelId, semesterId, semester, jenisPenilaian) => {
    try {
        const [rows] = await db.execute(QUERY_IS_NILAI_RAPOR_LOCKED, [siswaId, mapelId, semesterId, semester, jenisPenilaian]);
        return rows.length > 0 && rows[0].is_locked === 1;
    } catch (err) {
        throw new Error('Gagal mengecek status kunci nilai rapor');
    }
};

/**
 * Simpan nilai detail dengan clamping untuk mencegah human error.
 */
const simpanNilaiDetail = async (siswaId, mapelId, komponenId, nilai, semesterId, userId) => {
    try {
        const safeNilai = Math.max(0, Math.min(100, Math.round(parseFloat(nilai) || 0)));
        await db.execute(QUERY_SIMPAN_NILAI_DETAIL, [siswaId, mapelId, komponenId, safeNilai, semesterId, userId]);
    } catch (err) {
        throw new Error('Gagal menyimpan nilai detail');
    }
};

/**
 * Hapus nilai detail.
 */
const hapusNilaiDetail = async (siswaId, mapelId, komponenId, semesterId) => {
    try {
        await db.execute(QUERY_HAPUS_NILAI_DETAIL, [siswaId, mapelId, komponenId, semesterId]);
    } catch (err) {
        throw new Error('Gagal menghapus nilai detail');
    }
};

/**
 * Simpan nilai rapor dengan sanitasi nilai.
 */
const simpanNilaiRapor = async (data) => {
    try {
        const { siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId } = data;
        const safeNilaiRapor = nilaiRapor !== null && nilaiRapor !== undefined ? Math.round(parseFloat(nilaiRapor)) : null;

        await db.execute(QUERY_SIMPAN_NILAI_RAPOR, [
            siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, safeNilaiRapor, deskripsi, userId
        ]);
    } catch (err) {
        throw new Error('Gagal menyimpan nilai rapor');
    }
};

/**
 * Ambil kelas siswa berdasarkan mata pelajaran dan guru.
 */
const getKelasBySiswa = async (siswaId, mapelId, userId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_KELAS_BY_SISWA, [siswaId, mapelId, userId, semesterId]);
        return rows[0]?.kelas_id || null;
    } catch (err) {
        throw new Error('Gagal mengambil kelas siswa');
    }
};

/**
 * Dapatkan deskripsi nilai berdasarkan konfigurasi.
 */
const getDeskripsiNilai = (nilai, configRows) => {
    if (nilai === null || nilai === undefined || isNaN(nilai)) {
        return null;
    }

    const nilaiNum = parseFloat(nilai);
    for (const config of configRows) {
        if (nilaiNum >= parseFloat(config.min_nilai) && nilaiNum <= parseFloat(config.max_nilai)) {
            return config.deskripsi;
        }
    }
    return null;
};

module.exports = {
    getTahunAjaranAktif,
    validateAksesGuru,
    validateAksesGuruMapel,
    validateSiswaAktif,
    getNamaKelas,
    getSiswaByKelas,
    getKomponenPenilaian,
    getBobotByMapel,
    getKonfigurasiNilaiRapor,
    getNilaiDetail,
    getNilaiDetailBatch,
    getNilaiRapor,
    getNilaiRaporPTS,
    isNilaiRaporLocked,
    simpanNilaiDetail,
    hapusNilaiDetail,
    simpanNilaiRapor,
    getKelasBySiswa,
    getDeskripsiNilai
};