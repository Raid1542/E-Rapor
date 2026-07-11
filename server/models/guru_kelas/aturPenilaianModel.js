/**
 * Nama File: aturPenilaianModel.js
 * Fungsi: Model konfigurasi penilaian (kategori akademik/kokurikuler, bobot, deskripsi rata-rata)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// TAHUN AJARAN AKTIF
// ═════════════════════════════════════════════════════════════════════════════

// Ambil tahun ajaran yang sedang aktif
exports.getTahunAjaranAktif = async () => {
    const [rows] = await db.execute(`
    SELECT ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk, ta.semester, ta.status_pts, ta.status_pas
    FROM tahun_ajaran ta WHERE ta.status = 'aktif' LIMIT 1
    `);
    return rows.length > 0 ? rows[0] : null;
};

// ═════════════════════════════════════════════════════════════════════════════
// DATA PENDUKUNG
// ═════════════════════════════════════════════════════════════════════════════

// Ambil semua aspek kokurikuler
exports.getAspekKokurikuler = async () => {
    const [aspek] = await db.execute(
        'SELECT id_aspek_kokurikuler, kode, nama FROM aspek_kokurikuler ORDER BY urutan ASC'
    );
    return aspek;
};

// Ambil semua komponen penilaian
exports.getKomponenPenilaian = async () => {
    const [komponen] = await db.execute(
        'SELECT id_komponen, nama_komponen, urutan FROM komponen_penilaian ORDER BY urutan ASC'
    );
    return komponen;
};

// Alias untuk getKomponenPenilaian
exports.getKomponenPenilaianList = exports.getKomponenPenilaian;

// ═════════════════════════════════════════════════════════════════════════════
// VALIDASI AKSES DAN OVERLAP
// ═════════════════════════════════════════════════════════════════════════════

// Cek apakah guru mengajar mapel di kelas tertentu
exports.cekGuruMengajarMapelDiKelas = async (userId, mapelId, kelasId, tahunAjaranId) => {
    const [valid] = await db.execute(
        'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
        [userId, mapelId, kelasId, tahunAjaranId]
    );
    return valid.length > 0;
};

// Cek overlap range di konfigurasi nilai rapor
exports.cekOverlapAkademik = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, jenis = 'PTS', excludeId = null) => {
    let query = 'SELECT id_config, min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ? AND (? <= max_nilai AND ? >= min_nilai)';
    const params = [tahunAjaranId, kelasId, jenis, minNilai, maxNilai];

    if (mapelId === null) {
        query += ' AND mapel_id IS NULL';
    } else {
        query += ' AND mapel_id = ?';
        params.push(mapelId);
    }

    if (excludeId) {
        query += ' AND id_config != ?';
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

// Cek overlap range di kategori grade kokurikuler
exports.cekOverlapKokurikuler = async (idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, jenis = 'PTS', excludeId = null) => {
    let query = 'SELECT id_kategori_grade_kokurikuler, rentang_min, rentang_max, grade, deskripsi FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? AND (? <= rentang_max AND ? >= rentang_min)';
    const params = [idAspek, tahunAjaranId, semester, kelasId, jenis, minNilai, maxNilai];

    if (excludeId) {
        query += ' AND id_kategori_grade_kokurikuler != ?';
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

// Cek duplikasi grade kokurikuler
exports.cekDuplikasiGrade = async (idAspek, tahunAjaranId, semester, kelasId, grade, jenis = 'PTS', excludeId = null) => {
    let query = 'SELECT id_kategori_grade_kokurikuler, grade, rentang_min, rentang_max FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? AND grade = ?';
    const params = [idAspek, tahunAjaranId, semester, kelasId, jenis, grade];

    if (excludeId) {
        query += ' AND id_kategori_grade_kokurikuler != ?';
        params.push(excludeId);
    }

    const [duplikat] = await db.execute(query, params);
    return duplikat;
};

// ═════════════════════════════════════════════════════════════════════════════
// COVERAGE VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

// Cek coverage 0-100 di konfigurasi nilai rapor
exports.cekCoverage0to100 = async (mapelId, tahunAjaranId, kelasId, jenis = 'PTS') => {
    let query = 'SELECT min_nilai, max_nilai FROM konfigurasi_nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ?';
    const params = [tahunAjaranId, kelasId, jenis];

    if (mapelId === null) {
        query += ' AND mapel_id IS NULL';
    } else {
        query += ' AND mapel_id = ?';
        params.push(mapelId);
    }

    query += ' ORDER BY min_nilai ASC';
    const [kategoriRows] = await db.execute(query, params);

    // Cek apakah ada data
    if (kategoriRows.length === 0) {
        return { covered: false, gap: '0-100' };
    }

    // Cek celah di awal
    if (kategoriRows[0].min_nilai > 0) {
        return { covered: false, gap: `0-${kategoriRows[0].min_nilai - 1}` };
    }

    // Cek celah antar kategori
    for (let i = 0; i < kategoriRows.length - 1; i++) {
        const currentMax = kategoriRows[i].max_nilai;
        const nextMin = kategoriRows[i + 1].min_nilai;
        if (nextMin > currentMax + 1) {
            return { covered: false, gap: `${currentMax + 1}-${nextMin - 1}` };
        }
    }

    // Cek celah di akhir
    const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
    if (lastMax < 100) {
        return { covered: false, gap: `${lastMax + 1}-100` };
    }

    return { covered: true };
};

// Cek apakah kategori sedang dipakai di nilai rapor
exports.cekKategoriDipakai = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, jenis = 'PTS') => {
    if (mapelId === null) {
        return { total: 0 };
    }

    const [rows] = await db.execute(
        'SELECT COUNT(*) as total FROM nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND nilai_rapor BETWEEN ? AND ? AND mapel_id = ? AND jenis_penilaian = ?',
        [tahunAjaranId, kelasId, minNilai, maxNilai, mapelId, jenis]
    );
    return rows[0];
};

// Cek apakah semua komponen ID valid
exports.cekKomponenValid = async (komponenIds) => {
    if (!Array.isArray(komponenIds) || komponenIds.length === 0) {
        return false;
    }

    const placeholders = komponenIds.map(() => '?').join(',');
    const [rows] = await db.execute(
        `SELECT id_komponen FROM komponen_penilaian WHERE id_komponen IN (${placeholders})`,
        komponenIds
    );
    return rows.length === komponenIds.length;
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI AKADEMIK (CRUD)
// ═════════════════════════════════════════════════════════════════════════════

// Ambil kategori akademik per mapel + kelas + jenis
exports.getKategoriAkademik = async (mapelId, tahunAjaranId, kelasId, jenis = 'PTS') => {
    const [kategori] = await db.execute(
        'SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ? ORDER BY urutan ASC, min_nilai ASC',
        [mapelId, tahunAjaranId, kelasId, jenis]
    );
    return kategori;
};

// Buat kategori akademik baru
exports.createKategoriAkademik = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, deskripsi, jenis = 'PTS') => {
    const [result] = await db.execute(`
    INSERT INTO konfigurasi_nilai_rapor (mapel_id, kelas_id, tahun_ajaran_id, jenis_penilaian, min_nilai, max_nilai, deskripsi, urutan)
    VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(urutan), 0) + 1 FROM (SELECT urutan FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ?) AS tmp))
    `, [mapelId, kelasId, tahunAjaranId, jenis, minNilai, maxNilai, deskripsi, mapelId, kelasId, tahunAjaranId, jenis]);
    return result.insertId;
};

// Update kategori akademik
exports.updateKategoriAkademik = async (id, minNilai, maxNilai, deskripsi) => {
    await db.execute(
        'UPDATE konfigurasi_nilai_rapor SET min_nilai = ?, max_nilai = ?, deskripsi = ?, updated_at = NOW() WHERE id_config = ?',
        [minNilai, maxNilai, deskripsi, id]
    );
};

// Ambil kategori by ID + kelas (untuk keamanan)
exports.getKategoriByIdAndKelas = async (id, kelasId) => {
    const [existing] = await db.execute(
        'SELECT id_config, mapel_id, kelas_id, min_nilai, max_nilai, deskripsi, jenis_penilaian FROM konfigurasi_nilai_rapor WHERE id_config = ? AND kelas_id = ?',
        [id, kelasId]
    );
    return existing.length > 0 ? existing[0] : null;
};

// Hapus kategori akademik
exports.deleteKategoriAkademik = async (id, kelasId) => {
    await db.execute(
        'DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ? AND kelas_id = ?',
        [id, kelasId]
    );
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI KOKURIKULER (CRUD)
// ═════════════════════════════════════════════════════════════════════════════

// Ambil kategori kokurikuler per kelas + jenis
exports.getKategoriKokurikuler = async (tahunAjaranId, semester, kelasId, jenis = 'PTS') => {
    const [kategori] = await db.execute(`
    SELECT id_kategori_grade_kokurikuler AS id, id_aspek_kokurikuler, rentang_min AS min_nilai, rentang_max AS max_nilai, grade, deskripsi, urutan
    FROM kategori_grade_kokurikuler
    WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ?
    ORDER BY id_aspek_kokurikuler, urutan ASC, rentang_min ASC
    `, [tahunAjaranId, semester, kelasId, jenis]);
    return kategori;
};

// Buat kategori kokurikuler baru
exports.createKategoriKokurikuler = async (idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, grade, deskripsi, jenis = 'PTS') => {
    const [result] = await db.execute(`
    INSERT INTO kategori_grade_kokurikuler (id_aspek_kokurikuler, tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, grade, deskripsi, urutan, jenis_penilaian)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(urutan), 0) + 1 FROM (SELECT urutan FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?) AS tmp), ?)
    `, [idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, grade, deskripsi, idAspek, kelasId, tahunAjaranId, semester, jenis, jenis]);
    return result.insertId;
};

// Update kategori kokurikuler
exports.updateKategoriKokurikuler = async (id, minNilai, maxNilai, grade, deskripsi) => {
    await db.execute(
        'UPDATE kategori_grade_kokurikuler SET rentang_min = ?, rentang_max = ?, grade = ?, deskripsi = ?, updated_at = NOW() WHERE id_kategori_grade_kokurikuler = ?',
        [minNilai, maxNilai, grade, deskripsi, id]
    );
};

// Ambil kategori kokurikuler by ID + kelas
exports.getKategoriKokurikulerByIdAndKelas = async (id, kelasId) => {
    const [existing] = await db.execute(
        'SELECT id_kategori_grade_kokurikuler, id_aspek_kokurikuler, kelas_id, rentang_min, rentang_max, grade, deskripsi, jenis_penilaian FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?',
        [id, kelasId]
    );
    return existing.length > 0 ? existing[0] : null;
};

// Hapus kategori kokurikuler
exports.deleteKategoriKokurikuler = async (id, kelasId) => {
    await db.execute(
        'DELETE FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?',
        [id, kelasId]
    );
};

// ═════════════════════════════════════════════════════════════════════════════
// BOBOT AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

// Ambil bobot per mapel + kelas + jenis
exports.getBobotByMapel = async (mapelId, kelasId, jenis = 'PTS') => {
    const [bobot] = await db.execute(
        'SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND kelas_id = ? AND jenis_penilaian = ? AND is_active = 1',
        [mapelId, kelasId, jenis]
    );
    return bobot;
};

// Simpan bobot dengan transaction
exports.saveBobot = async (mapelId, kelasId, tahunAjaranId, bobotList, jenis = 'PTS') => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Hapus bobot lama
        await connection.execute(
            'DELETE FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND kelas_id = ? AND jenis_penilaian = ?',
            [mapelId, kelasId, jenis]
        );

        // Insert bobot baru
        for (const b of bobotList) {
            await connection.execute(
                'INSERT INTO konfigurasi_mapel_komponen (mapel_id, kelas_id, tahun_ajaran_id, komponen_id, bobot, is_active, jenis_penilaian, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())',
                [mapelId, kelasId, tahunAjaranId, b.komponen_id, parseFloat(b.bobot), jenis]
            );
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// VALIDASI TAMBAHAN KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

// Cek coverage 0-100 untuk setiap aspek kokurikuler
exports.cekCoverageKokurikuler = async (tahunAjaranId, semester, kelasId, jenis = 'PTS') => {
    const [aspekRows] = await db.execute(
        'SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler ORDER BY urutan ASC'
    );

    const result = { covered: true, gaps: [] };

    for (const aspek of aspekRows) {
        const [kategoriRows] = await db.execute(
            'SELECT rentang_min, rentang_max FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? ORDER BY rentang_min ASC',
            [aspek.id_aspek_kokurikuler, tahunAjaranId, semester, kelasId, jenis]
        );

        // Cek apakah ada kategori
        if (kategoriRows.length === 0) {
            result.covered = false;
            result.gaps.push({ aspek: aspek.nama, gap: '0-100 (belum ada kategori)' });
            continue;
        }

        // Cek celah di awal
        if (kategoriRows[0].rentang_min > 0) {
            result.covered = false;
            result.gaps.push({ aspek: aspek.nama, gap: `0-${kategoriRows[0].rentang_min - 1}` });
        }

        // Cek celah antar kategori
        for (let i = 0; i < kategoriRows.length - 1; i++) {
            const currentMax = kategoriRows[i].rentang_max;
            const nextMin = kategoriRows[i + 1].rentang_min;
            if (nextMin > currentMax + 1) {
                result.covered = false;
                result.gaps.push({ aspek: aspek.nama, gap: `${currentMax + 1}-${nextMin - 1}` });
            }
        }

        // Cek celah di akhir
        const lastMax = kategoriRows[kategoriRows.length - 1].rentang_max;
        if (lastMax < 100) {
            result.covered = false;
            result.gaps.push({ aspek: aspek.nama, gap: `${lastMax + 1}-100` });
        }
    }

    return result;
};

// Cek kategori kokurikuler dipakai
exports.cekKategoriKokurikulerDipakai = async (idKategori, kelasId) => {
    const [kategoriRows] = await db.execute(
        'SELECT id_aspek_kokurikuler, rentang_min, rentang_max FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?',
        [idKategori, kelasId]
    );

    if (kategoriRows.length === 0) {
        return { total: 0, exists: false };
    }

    const { id_aspek_kokurikuler, rentang_min, rentang_max } = kategoriRows[0];

    // Mapping ID aspek ke kolom tabel
    const aspekKolomMap = { 1: 'nilai_mutabaah', 2: 'nilai_literasi', 3: 'nilai_bpi', 4: 'nilai_proyek' };
    const kolom = aspekKolomMap[id_aspek_kokurikuler];

    if (!kolom) {
        return { total: 0, exists: true, error: `Aspek ID ${id_aspek_kokurikuler} tidak valid` };
    }

    const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM nilai_kokurikuler WHERE kelas_id = ? AND ${kolom} BETWEEN ? AND ?`,
        [kelasId, rentang_min, rentang_max]
    );

    return { total: rows[0].total, exists: true };
};

// ═════════════════════════════════════════════════════════════════════════════
// JUDUL PROYEK KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

// Ambil judul proyek berdasarkan kelas dan tahun ajaran
exports.getJudulProyekByKelas = async (kelasId, tahunAjaranId) => {
    const [rows] = await db.execute(
        'SELECT id_judul_proyek, id_tahun_ajaran, kelas_id, judul, deskripsi FROM judul_proyek_per_tahun_ajaran WHERE kelas_id = ? AND id_tahun_ajaran = ? LIMIT 1',
        [kelasId, tahunAjaranId]
    );
    return rows.length > 0 ? rows[0] : null;
};

// Simpan atau update judul proyek (UPSERT)
exports.saveJudulProyek = async (kelasId, tahunAjaranId, judul, deskripsi = null) => {
    const [existing] = await db.execute(
        'SELECT id_judul_proyek FROM judul_proyek_per_tahun_ajaran WHERE kelas_id = ? AND id_tahun_ajaran = ?',
        [kelasId, tahunAjaranId]
    );

    if (existing.length > 0) {
        // Update judul yang sudah ada
        await db.execute(
            'UPDATE judul_proyek_per_tahun_ajaran SET judul = ?, deskripsi = ?, updated_at = NOW() WHERE kelas_id = ? AND id_tahun_ajaran = ?',
            [judul, deskripsi, kelasId, tahunAjaranId]
        );
        return { id: existing[0].id_judul_proyek, action: 'updated' };
    } else {
        // Insert judul baru
        const [result] = await db.execute(
            'INSERT INTO judul_proyek_per_tahun_ajaran (id_tahun_ajaran, kelas_id, judul, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [tahunAjaranId, kelasId, judul, deskripsi]
        );
        return { id: result.insertId, action: 'created' };
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI DESKRIPSI RATA-RATA (CRUD)
// ═════════════════════════════════════════════════════════════════════════════

// Ambil kategori deskripsi rata-rata
exports.getKategoriDeskripsiRataRata = async (tahunAjaranId, semester, kelasId) => {
    const [kategori] = await db.execute(
        'SELECT id_kategori AS id, rentang_min AS min_nilai, rentang_max AS max_nilai, deskripsi, urutan FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? ORDER BY urutan ASC, rentang_min DESC',
        [tahunAjaranId, semester, kelasId]
    );
    return kategori;
};

// Buat kategori deskripsi rata-rata baru
exports.createKategoriDeskripsiRataRata = async (tahunAjaranId, semester, kelasId, minNilai, maxNilai, deskripsi) => {
    const [result] = await db.execute(`
    INSERT INTO kategori_deskripsi_rata_rata (tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, deskripsi, urutan)
    VALUES (?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(urutan), 0) + 1 FROM (SELECT urutan FROM kategori_deskripsi_rata_rata WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?) AS tmp))
    `, [tahunAjaranId, semester, kelasId, minNilai, maxNilai, deskripsi, kelasId, tahunAjaranId, semester]);
    return result.insertId;
};

// Update kategori deskripsi rata-rata
exports.updateKategoriDeskripsiRataRata = async (id, minNilai, maxNilai, deskripsi) => {
    await db.execute(
        'UPDATE kategori_deskripsi_rata_rata SET rentang_min = ?, rentang_max = ?, deskripsi = ?, updated_at = NOW() WHERE id_kategori = ?',
        [minNilai, maxNilai, deskripsi, id]
    );
};

// Ambil kategori deskripsi rata-rata by ID + kelas
exports.getKategoriDeskripsiRataRataByIdAndKelas = async (id, kelasId) => {
    const [existing] = await db.execute(
        'SELECT id_kategori, kelas_id, rentang_min, rentang_max, deskripsi FROM kategori_deskripsi_rata_rata WHERE id_kategori = ? AND kelas_id = ?',
        [id, kelasId]
    );
    return existing.length > 0 ? existing[0] : null;
};

// Hapus kategori deskripsi rata-rata
exports.deleteKategoriDeskripsiRataRata = async (id, kelasId) => {
    await db.execute(
        'DELETE FROM kategori_deskripsi_rata_rata WHERE id_kategori = ? AND kelas_id = ?',
        [id, kelasId]
    );
};

// Cek overlap deskripsi rata-rata
exports.cekOverlapDeskripsiRataRata = async (tahunAjaranId, semester, kelasId, minNilai, maxNilai, excludeId = null) => {
    let query = 'SELECT id_kategori, rentang_min, rentang_max, deskripsi FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND (? <= rentang_max AND ? >= rentang_min)';
    const params = [tahunAjaranId, semester, kelasId, minNilai, maxNilai];

    if (excludeId) {
        query += ' AND id_kategori != ?';
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

// Cek coverage deskripsi rata-rata (support desimal)
exports.cekCoverageDeskripsiRataRata = async (tahunAjaranId, semester, kelasId) => {
    const [kategoriRows] = await db.execute(
        'SELECT rentang_min, rentang_max FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? ORDER BY rentang_min ASC',
        [tahunAjaranId, semester, kelasId]
    );

    // Cek apakah ada data
    if (kategoriRows.length === 0) {
        return { covered: false, gap: '0.00-100.00' };
    }

    // Cek celah di awal (support desimal)
    const firstMin = parseFloat(kategoriRows[0].rentang_min);
    if (firstMin > 0.01) {
        return { covered: false, gap: `0.00-${(firstMin - 0.01).toFixed(2)}` };
    }

    // Cek celah antar kategori (support desimal)
    for (let i = 0; i < kategoriRows.length - 1; i++) {
        const currentMax = parseFloat(kategoriRows[i].rentang_max);
        const nextMin = parseFloat(kategoriRows[i + 1].rentang_min);

        const gapStart = (currentMax + 0.01).toFixed(2);
        const gapEnd = (nextMin - 0.01).toFixed(2);

        if (nextMin > currentMax + 0.01) {
            return { covered: false, gap: `${gapStart}-${gapEnd}` };
        }
    }

    // Cek celah di akhir (support desimal)
    const lastMax = parseFloat(kategoriRows[kategoriRows.length - 1].rentang_max);
    if (lastMax < 99.99) {
        return { covered: false, gap: `${(lastMax + 0.01).toFixed(2)}-100.00` };
    }

    return { covered: true };
};

// ═════════════════════════════════════════════════════════════════════════════
// BATCH SAVE DESKRIPSI RATA-RATA
// ═════════════════════════════════════════════════════════════════════════════

// Batch save dengan transaction (anti-deadlock)
exports.saveBatchKategoriDeskripsiRataRata = async (tahunAjaranId, semester, kelasId, categories) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Hapus data lama
        await connection.execute(
            'DELETE FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ?',
            [tahunAjaranId, semester, kelasId]
        );

        // Ambil urutan awal
        const [maxUrutan] = await connection.execute(
            'SELECT COALESCE(MAX(urutan), 0) as max_urutan FROM kategori_deskripsi_rata_rata WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?',
            [kelasId, tahunAjaranId, semester]
        );

        let urutan = maxUrutan[0].max_urutan + 1;

        // Insert semua kategori dengan urutan manual
        for (const cat of categories) {
            await connection.execute(
                `INSERT INTO kategori_deskripsi_rata_rata 
            (tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, deskripsi, urutan)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    tahunAjaranId,
                    semester,
                    kelasId,
                    cat.min_nilai,
                    cat.max_nilai,
                    cat.deskripsi,
                    urutan++
                ]
            );
        }

        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};