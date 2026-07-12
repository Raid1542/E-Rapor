/**
 * Nama File: penilaianNilaiModel.js
 * Fungsi: Model input nilai siswa (validasi akses, bobot per kelas, status aktif)
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

const QUERY_VALIDATE_AKSES_GURU = `
    SELECT 1 FROM pembelajaran 
    WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_VALIDATE_AKSES_GURU_MAPEL = `
    SELECT 1 FROM pembelajaran 
    WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
`;

const QUERY_VALIDATE_SISWA_AKTIF = `
    SELECT sk.kelas_id, sk.status 
    FROM siswa_kelas sk
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
    WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND sk.status = 'Aktif'
    ORDER BY s.nama_lengkap
`;

const QUERY_GET_KOMPONEN_PENILAIAN = `
    SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
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

// ═════════════════════════════════════════════════════════════════════════════
// FUNGSI MODEL
// ═════════════════════════════════════════════════════════════════════════════

// Ambil tahun ajaran yang sedang aktif
const getTahunAjaranAktif = async () => {
    try {
        const [rows] = await db.execute(QUERY_TAHUN_AJARAN_AKTIF);
        return rows[0] || null;
    } catch (err) {
        console.error('Error getTahunAjaranAktif:', err);
        throw new Error('Gagal mengambil tahun ajaran aktif');
    }
};

// Validasi akses guru ke mapel di kelas tertentu
const validateAksesGuru = async (userId, mapelId, kelasId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_AKSES_GURU, [userId, mapelId, kelasId, semesterId]);
        return rows.length > 0;
    } catch (err) {
        console.error('Error validateAksesGuru:', err);
        throw new Error('Gagal memvalidasi akses guru');
    }
};

// Validasi akses guru ke mapel (tanpa filter kelas)
const validateAksesGuruMapel = async (userId, mapelId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_AKSES_GURU_MAPEL, [userId, mapelId, semesterId]);
        return rows.length > 0;
    } catch (err) {
        console.error('Error validateAksesGuruMapel:', err);
        throw new Error('Gagal memvalidasi akses guru mapel');
    }
};

// Cek siswa aktif di kelas yang diajar guru + ambil kelas_id
const validateSiswaAktif = async (siswaId, userId, mapelId, semesterId, indukId) => {
    try {
        const [rows] = await db.execute(QUERY_VALIDATE_SISWA_AKTIF, [siswaId, userId, mapelId, semesterId, indukId]);
        if (rows.length === 0) {
            return { valid: false, kelas_id: null, status: null };
        }
        return { valid: rows[0].status === 'Aktif', kelas_id: rows[0].kelas_id, status: rows[0].status };
    } catch (err) {
        console.error('Error validateSiswaAktif:', err);
        throw new Error('Gagal memvalidasi siswa aktif');
    }
};

// Ambil nama kelas by ID
const getNamaKelas = async (kelasId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NAMA_KELAS, [kelasId]);
        return rows[0]?.nama_kelas || 'Kelas Tidak Diketahui';
    } catch (err) {
        console.error('Error getNamaKelas:', err);
        throw new Error('Gagal mengambil nama kelas');
    }
};

// Ambil daftar siswa aktif di kelas
const getSiswaByKelas = async (kelasId, indukId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_SISWA_BY_KELAS, [kelasId, indukId]);
        return rows;
    } catch (err) {
        console.error('Error getSiswaByKelas:', err);
        throw new Error('Gagal mengambil daftar siswa');
    }
};

// Ambil semua komponen penilaian
const getKomponenPenilaian = async () => {
    try {
        const [rows] = await db.execute(QUERY_GET_KOMPONEN_PENILAIAN);
        return rows;
    } catch (err) {
        console.error('Error getKomponenPenilaian:', err);
        throw new Error('Gagal mengambil komponen penilaian');
    }
};

// Ambil bobot per komponen (prioritas: spesifik kelas > global)
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
        
        // Prioritas: bobot spesifik kelas > bobot global
        const bobotMap = new Map();
        rows.forEach(row => {
            const existing = bobotMap.get(row.komponen_id);
            if (!existing || row.kelas_id !== null) {
                bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0);
            }
        });
        
        return bobotMap;
    } catch (err) {
        console.error('Error getBobotByMapel:', err);
        throw new Error('Gagal mengambil bobot per komponen');
    }
};

// Ambil konfigurasi kategori nilai rapor
const getKonfigurasiNilaiRapor = async (mapelId, semesterId, kelasId = null) => {
    try {
        let query = QUERY_GET_KONFIGURASI_NILAI_RAPOR;
        const params = [mapelId, semesterId];
        
        if (kelasId) {
            query += ' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC';
            params.push(kelasId, kelasId);
        } else {
            query += ' AND kelas_id IS NULL ORDER BY min_nilai DESC';
        }
        
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (err) {
        console.error('Error getKonfigurasiNilaiRapor:', err);
        throw new Error('Gagal mengambil konfigurasi nilai rapor');
    }
};

// Ambil nilai detail per komponen untuk 1 siswa
const getNilaiDetail = async (siswaId, mapelId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NILAI_DETAIL, [siswaId, mapelId, semesterId]);
        return rows;
    } catch (err) {
        console.error('Error getNilaiDetail:', err);
        throw new Error('Gagal mengambil nilai detail');
    }
};

// Ambil nilai detail untuk banyak siswa sekaligus (batch)
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
        console.error('Error getNilaiDetailBatch:', err);
        throw new Error('Gagal mengambil nilai detail batch');
    }
};

// Ambil nilai rapor PTS & PAS
const getNilaiRapor = async (mapelId, semesterId, semester) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NILAI_RAPOR, [mapelId, semesterId, semester]);
        return rows;
    } catch (err) {
        console.error('Error getNilaiRapor:', err);
        throw new Error('Gagal mengambil nilai rapor');
    }
};

// Ambil nilai rapor PTS saja
const getNilaiRaporPTS = async (siswaId, mapelId, semesterId, semester) => {
    try {
        const [rows] = await db.execute(QUERY_GET_NILAI_RAPOR_PTS, [siswaId, mapelId, semesterId, semester]);
        return rows.length > 0 ? rows[0].nilai_rapor : 0;
    } catch (err) {
        console.error('Error getNilaiRaporPTS:', err);
        throw new Error('Gagal mengambil nilai rapor PTS');
    }
};

// Cek apakah nilai rapor sudah dikunci
const isNilaiRaporLocked = async (siswaId, mapelId, semesterId, semester, jenisPenilaian) => {
    try {
        const [rows] = await db.execute(QUERY_IS_NILAI_RAPOR_LOCKED, [siswaId, mapelId, semesterId, semester, jenisPenilaian]);
        return rows.length > 0 && rows[0].is_locked === 1;
    } catch (err) {
        console.error('Error isNilaiRaporLocked:', err);
        throw new Error('Gagal mengecek status kunci nilai rapor');
    }
};

// Simpan/update nilai detail komponen
const simpanNilaiDetail = async (siswaId, mapelId, komponenId, nilai, semesterId, userId) => {
    try {
        await db.execute(QUERY_SIMPAN_NILAI_DETAIL, [siswaId, mapelId, komponenId, nilai, semesterId, userId]);
    } catch (err) {
        console.error('Error simpanNilaiDetail:', err);
        throw new Error('Gagal menyimpan nilai detail');
    }
};

// Hapus nilai detail komponen
const hapusNilaiDetail = async (siswaId, mapelId, komponenId, semesterId) => {
    try {
        await db.execute(QUERY_HAPUS_NILAI_DETAIL, [siswaId, mapelId, komponenId, semesterId]);
    } catch (err) {
        console.error('Error hapusNilaiDetail:', err);
        throw new Error('Gagal menghapus nilai detail');
    }
};

// Simpan/update nilai rapor
const simpanNilaiRapor = async (data) => {
    try {
        const { siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId } = data;
        await db.execute(QUERY_SIMPAN_NILAI_RAPOR, [
            siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId
        ]);
    } catch (err) {
        console.error('Error simpanNilaiRapor:', err);
        throw new Error('Gagal menyimpan nilai rapor');
    }
};

// Ambil kelas tempat siswa belajar mapel tertentu
const getKelasBySiswa = async (siswaId, mapelId, userId, semesterId) => {
    try {
        const [rows] = await db.execute(QUERY_GET_KELAS_BY_SISWA, [siswaId, mapelId, userId, semesterId]);
        return rows[0]?.kelas_id || null;
    } catch (err) {
        console.error('Error getKelasBySiswa:', err);
        throw new Error('Gagal mengambil kelas siswa');
    }
};

// Cari deskripsi berdasarkan nilai rapor
const getDeskripsiNilai = (nilai, configRows) => {
    for (const config of configRows) {
        if (nilai >= config.min_nilai && nilai <= config.max_nilai) {
            return config.deskripsi;
        }
    }
    return null;
};

module.exports = {
    getTahunAjaranAktif, validateAksesGuru, validateAksesGuruMapel, validateSiswaAktif, getNamaKelas,
    getSiswaByKelas, getKomponenPenilaian, getBobotByMapel, getKonfigurasiNilaiRapor, getNilaiDetail,
    getNilaiDetailBatch, getNilaiRapor, getNilaiRaporPTS, isNilaiRaporLocked, simpanNilaiDetail,
    hapusNilaiDetail, simpanNilaiRapor, getKelasBySiswa, getDeskripsiNilai,
};