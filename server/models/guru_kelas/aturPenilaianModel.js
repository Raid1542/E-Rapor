/**
 * Nama File: aturPenilaianModel.js
 * Fungsi: Handle semua query database untuk fitur Atur Penilaian
 *         - Kategori akademik (per mapel)
 *         - Kategori rata-rata
 *         - Kategori kokurikuler (per aspek + semester)
 *         - Bobot akademik
 *         - Data pendukung (komponen, aspek)
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: TAHUN AJARAN AKTIF
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil data tahun ajaran aktif
 */
exports.getTahunAjaranAktif = async () => {
    const [rows] = await db.execute(`
        SELECT 
            ta.id_tahun_ajaran,
            ta.id_tahun_ajaran_induk,
            ta.semester,
            ta.status_pts,
            ta.status_pas
        FROM tahun_ajaran ta
        WHERE ta.status = 'aktif'
        LIMIT 1
    `);
    return rows.length > 0 ? rows[0] : null;
};

// ═════════════════════════════════════════════════════════════════════════════
// DATA PENDUKUNG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil daftar aspek kokurikuler
 */
exports.getAspekKokurikuler = async () => {
    const [aspek] = await db.execute(`
        SELECT id_aspek_kokurikuler, nama
        FROM aspek_kokurikuler
        ORDER BY urutan ASC
    `);
    return aspek;
};

/**
 * Ambil daftar komponen penilaian
 */
exports.getKomponenPenilaian = async () => {
    const [komponen] = await db.execute(`
        SELECT id_komponen, nama_komponen, urutan
        FROM komponen_penilaian
        ORDER BY urutan ASC
    `);
    return komponen;
};

/**
 * Ambil list komponen penilaian (alias untuk getKomponenPenilaian)
 */
exports.getKomponenPenilaianList = exports.getKomponenPenilaian;

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Cek apakah guru mengajar mata pelajaran tertentu
 */
exports.cekGuruMengajarMapel = async (userId, mapelId, tahunAjaranId) => {
    const [valid] = await db.execute(`
        SELECT 1 FROM pembelajaran 
        WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
    `, [userId, mapelId, tahunAjaranId]);
    return valid.length > 0;
};

/**
 * Cek Range Overlapping di konfigurasi_nilai_rapor (akademik & rata-rata)
 */
exports.cekOverlapAkademik = async (mapelId, tahunAjaranId, minNilai, maxNilai, excludeId = null) => {
    let query = `
        SELECT id_config, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE tahun_ajaran_id = ?
        AND (? <= max_nilai AND ? >= min_nilai)
    `;
    const params = [tahunAjaranId, minNilai, maxNilai];

    if (mapelId === null) {
        query += ` AND mapel_id IS NULL`;
    } else {
        query += ` AND mapel_id = ?`;
        params.push(mapelId);
    }

    if (excludeId) {
        query += ` AND id_config != ?`;
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

/**
 * Cek Range Overlapping di kategori_grade_kokurikuler
 */
exports.cekOverlapKokurikuler = async (idAspek, tahunAjaranId, semester, minNilai, maxNilai, excludeId = null) => {
    let query = `
        SELECT id_kategori_grade_kokurikuler, rentang_min, rentang_max, grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_aspek_kokurikuler = ?
        AND tahun_ajaran_id = ?
        AND semester = ?
        AND (? <= rentang_max AND ? >= rentang_min)
    `;
    const params = [idAspek, tahunAjaranId, semester, minNilai, maxNilai];

    if (excludeId) {
        query += ` AND id_kategori_grade_kokurikuler != ?`;
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

/**
 * Cek Duplikasi Grade Kokurikuler
 */
exports.cekDuplikasiGrade = async (idAspek, tahunAjaranId, semester, grade, excludeId = null) => {
    let query = `
        SELECT id_kategori_grade_kokurikuler, grade, rentang_min, rentang_max
        FROM kategori_grade_kokurikuler
        WHERE id_aspek_kokurikuler = ?
        AND tahun_ajaran_id = ?
        AND semester = ?
        AND grade = ?
    `;
    const params = [idAspek, tahunAjaranId, semester, grade];

    if (excludeId) {
        query += ` AND id_kategori_grade_kokurikuler != ?`;
        params.push(excludeId);
    }

    const [duplikat] = await db.execute(query, params);
    return duplikat;
};

/**
 * Cek Coverage 0-100 di konfigurasi_nilai_rapor
 */
exports.cekCoverage0to100 = async (mapelId, tahunAjaranId) => {
    let query = `
        SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor 
        WHERE tahun_ajaran_id = ?
    `;
    const params = [tahunAjaranId];

    if (mapelId === null) {
        query += ` AND mapel_id IS NULL`;
    } else {
        query += ` AND mapel_id = ?`;
        params.push(mapelId);
    }

    query += ` ORDER BY min_nilai ASC`;

    const [kategoriRows] = await db.execute(query, params);

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

/**
 * Cek Apakah Kategori Sedang Dipakai di nilai_rapor
 */
exports.cekKategoriDipakai = async (mapelId, tahunAjaranId, minNilai, maxNilai) => {
    if (mapelId === null) {
        return { total: 0 };
    }

    const [rows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM nilai_rapor 
        WHERE tahun_ajaran_id = ?
        AND nilai_rapor BETWEEN ? AND ?
        AND mapel_id = ?
    `, [tahunAjaranId, minNilai, maxNilai, mapelId]);

    return rows[0];
};

/**
 * Cek apakah semua komponen ID valid
 */
exports.cekKomponenValid = async (komponenIds) => {
    if (!Array.isArray(komponenIds) || komponenIds.length === 0) {
        return false;
    }
    
    const placeholders = komponenIds.map(() => '?').join(',');
    const [rows] = await db.execute(`
        SELECT id_komponen FROM komponen_penilaian 
        WHERE id_komponen IN (${placeholders})
    `, komponenIds);
    
    return rows.length === komponenIds.length;
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI AKADEMIK (PER MAPEL)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil kategori akademik per mapel
 */
exports.getKategoriAkademik = async (mapelId, tahunAjaranId) => {
    const [kategori] = await db.execute(`
        SELECT 
            id_config AS id, 
            min_nilai, 
            max_nilai, 
            deskripsi, 
            urutan
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        ORDER BY urutan ASC, min_nilai ASC
    `, [mapelId, tahunAjaranId]);
    return kategori;
};

/**
 * Buat kategori akademik baru
 */
exports.createKategoriAkademik = async (mapelId, tahunAjaranId, minNilai, maxNilai, deskripsi) => {
    const [result] = await db.execute(`
        INSERT INTO konfigurasi_nilai_rapor 
        (mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan)
        VALUES (?, ?, ?, ?, ?, 
            (SELECT IFNULL(MAX(urutan), 0) + 1 
            FROM (SELECT urutan FROM konfigurasi_nilai_rapor 
                WHERE mapel_id = ? AND tahun_ajaran_id = ?) AS tmp)
        )
    `, [mapelId, tahunAjaranId, minNilai, maxNilai, deskripsi, mapelId, tahunAjaranId]);
    return result.insertId;
};

/**
 * Update kategori akademik
 */
exports.updateKategoriAkademik = async (id, minNilai, maxNilai, deskripsi) => {
    await db.execute(`
        UPDATE konfigurasi_nilai_rapor 
        SET min_nilai = ?, max_nilai = ?, deskripsi = ?, updated_at = NOW()
        WHERE id_config = ?
    `, [minNilai, maxNilai, deskripsi, id]);
};

/**
 * Ambil kategori by ID (akademik atau rata-rata)
 */
exports.getKategoriById = async (id) => {
    const [existing] = await db.execute(`
        SELECT id_config, mapel_id, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE id_config = ?
    `, [id]);
    return existing.length > 0 ? existing[0] : null;
};

/**
 * Hapus kategori akademik
 */
exports.deleteKategoriAkademik = async (id) => {
    await db.execute(`DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ?`, [id]);
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI RATA-RATA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil kategori rata-rata (mapel_id IS NULL)
 */
exports.getKategoriRataRata = async (tahunAjaranId) => {
    const [kategori] = await db.execute(`
        SELECT 
            id_config AS id, 
            min_nilai, 
            max_nilai, 
            deskripsi, 
            urutan
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id IS NULL AND tahun_ajaran_id = ?
        ORDER BY urutan ASC, min_nilai ASC
    `, [tahunAjaranId]);
    return kategori;
};

/**
 * Buat kategori rata-rata baru
 */
exports.createKategoriRataRata = async (tahunAjaranId, minNilai, maxNilai, deskripsi) => {
    const [result] = await db.execute(`
        INSERT INTO konfigurasi_nilai_rapor 
        (mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan)
        VALUES (NULL, ?, ?, ?, ?, 
            (SELECT IFNULL(MAX(urutan), 0) + 1 
            FROM (SELECT urutan FROM konfigurasi_nilai_rapor 
                WHERE mapel_id IS NULL AND tahun_ajaran_id = ?) AS tmp)
        )
    `, [tahunAjaranId, minNilai, maxNilai, deskripsi, tahunAjaranId]);
    return result.insertId;
};

/**
 * Update kategori rata-rata
 */
exports.updateKategoriRataRata = async (id, minNilai, maxNilai, deskripsi) => {
    await db.execute(`
        UPDATE konfigurasi_nilai_rapor 
        SET min_nilai = ?, max_nilai = ?, deskripsi = ?, updated_at = NOW()
        WHERE id_config = ? AND mapel_id IS NULL
    `, [minNilai, maxNilai, deskripsi, id]);
};

/**
 * Ambil kategori rata-rata by ID
 */
exports.getKategoriRataRataById = async (id) => {
    const [existing] = await db.execute(`
        SELECT id_config, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE id_config = ? AND mapel_id IS NULL
    `, [id]);
    return existing.length > 0 ? existing[0] : null;
};

/**
 * Hapus kategori rata-rata
 */
exports.deleteKategoriRataRata = async (id) => {
    await db.execute(`DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ? AND mapel_id IS NULL`, [id]);
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil kategori kokurikuler
 */
exports.getKategoriKokurikuler = async (tahunAjaranId, semester) => {
    const [kategori] = await db.execute(`
        SELECT 
            id_kategori_grade_kokurikuler AS id,
            id_aspek_kokurikuler,
            rentang_min AS min_nilai,
            rentang_max AS max_nilai,
            grade,
            deskripsi,
            urutan
        FROM kategori_grade_kokurikuler
        WHERE tahun_ajaran_id = ? AND semester = ?
        ORDER BY id_aspek_kokurikuler, urutan ASC, rentang_min ASC
    `, [tahunAjaranId, semester]);
    return kategori;
};

/**
 * Buat kategori kokurikuler baru
 */
exports.createKategoriKokurikuler = async (idAspek, tahunAjaranId, semester, minNilai, maxNilai, grade, deskripsi) => {
    const [result] = await db.execute(`
        INSERT INTO kategori_grade_kokurikuler 
        (id_aspek_kokurikuler, tahun_ajaran_id, semester, rentang_min, rentang_max, grade, deskripsi, urutan)
        VALUES (?, ?, ?, ?, ?, ?, ?, 
            (SELECT IFNULL(MAX(urutan), 0) + 1 
            FROM (SELECT urutan FROM kategori_grade_kokurikuler 
                WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ?) AS tmp)
        )
    `, [idAspek, tahunAjaranId, semester, minNilai, maxNilai, grade, deskripsi, idAspek, tahunAjaranId, semester]);
    return result.insertId;
};

/**
 * Update kategori kokurikuler
 */
exports.updateKategoriKokurikuler = async (id, minNilai, maxNilai, grade, deskripsi) => {
    await db.execute(`
        UPDATE kategori_grade_kokurikuler 
        SET rentang_min = ?, rentang_max = ?, grade = ?, deskripsi = ?, updated_at = NOW()
        WHERE id_kategori_grade_kokurikuler = ?
    `, [minNilai, maxNilai, grade, deskripsi, id]);
};

/**
 * Ambil kategori kokurikuler by ID
 */
exports.getKategoriKokurikulerById = async (id) => {
    const [existing] = await db.execute(`
        SELECT 
            id_kategori_grade_kokurikuler,
            id_aspek_kokurikuler,
            rentang_min, rentang_max, grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_kategori_grade_kokurikuler = ?
    `, [id]);
    return existing.length > 0 ? existing[0] : null;
};

/**
 * Hapus kategori kokurikuler
 */
exports.deleteKategoriKokurikuler = async (id) => {
    await db.execute(`DELETE FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ?`, [id]);
};

// ═════════════════════════════════════════════════════════════════════════════
// BOBOT AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil bobot per mapel
 */
exports.getBobotByMapel = async (mapelId) => {
    const [bobot] = await db.execute(`
        SELECT komponen_id, bobot
        FROM konfigurasi_mapel_komponen
        WHERE mapel_id = ? AND is_active = 1
    `, [mapelId]);
    return bobot;
};

/**
 * Simpan bobot (transaction: delete lama + insert baru)
 */
exports.saveBobot = async (mapelId, bobotList) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Delete bobot lama
        await connection.execute(`
            DELETE FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ?
        `, [mapelId]);

        // Insert bobot baru
        for (const b of bobotList) {
            await connection.execute(`
                INSERT INTO konfigurasi_mapel_komponen 
                (mapel_id, komponen_id, bobot, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 1, NOW(), NOW())
            `, [mapelId, b.komponen_id, parseFloat(b.bobot)]);
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};