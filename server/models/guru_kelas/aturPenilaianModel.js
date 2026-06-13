/**
 * Nama File: aturPenilaianModel.js
 * Fungsi: Handle semua query database untuk fitur Atur Penilaian
 *         UPDATE: Semua query difilter by KELAS_ID (per guru kelas)
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: TAHUN AJARAN AKTIF
// ═════════════════════════════════════════════════════════════════════════════

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

exports.getAspekKokurikuler = async () => {
    const [aspek] = await db.execute(`
        SELECT id_aspek_kokurikuler, nama
        FROM aspek_kokurikuler
        ORDER BY urutan ASC
    `);
    return aspek;
};

exports.getKomponenPenilaian = async () => {
    const [komponen] = await db.execute(`
        SELECT id_komponen, nama_komponen, urutan
        FROM komponen_penilaian
        ORDER BY urutan ASC
    `);
    return komponen;
};

exports.getKomponenPenilaianList = exports.getKomponenPenilaian;

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ✅ UPDATED: Cek apakah guru mengajar mapel tertentu DI KELAS TERTENTU
 */
exports.cekGuruMengajarMapelDiKelas = async (userId, mapelId, kelasId, tahunAjaranId) => {
    const [valid] = await db.execute(`
        SELECT 1 FROM pembelajaran 
        WHERE user_id = ? 
        AND mapel_id = ? 
        AND kelas_id = ?
        AND tahun_ajaran_id = ?
    `, [userId, mapelId, kelasId, tahunAjaranId]);
    return valid.length > 0;
};

/**
 * ✅ UPDATED: Cek Range Overlapping di konfigurasi_nilai_rapor PER KELAS
 */
exports.cekOverlapAkademik = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, excludeId = null) => {
    let query = `
        SELECT id_config, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE tahun_ajaran_id = ?
        AND kelas_id = ?
        AND (? <= max_nilai AND ? >= min_nilai)
    `;
    const params = [tahunAjaranId, kelasId, minNilai, maxNilai];

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
 * ✅ UPDATED: Cek Range Overlapping di kategori_grade_kokurikuler PER KELAS
 */
exports.cekOverlapKokurikuler = async (idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, excludeId = null) => {
    let query = `
        SELECT id_kategori_grade_kokurikuler, rentang_min, rentang_max, grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_aspek_kokurikuler = ?
        AND tahun_ajaran_id = ?
        AND semester = ?
        AND kelas_id = ?
        AND (? <= rentang_max AND ? >= rentang_min)
    `;
    const params = [idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai];

    if (excludeId) {
        query += ` AND id_kategori_grade_kokurikuler != ?`;
        params.push(excludeId);
    }

    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

/**
 * ✅ UPDATED: Cek Duplikasi Grade Kokurikuler PER KELAS
 */
exports.cekDuplikasiGrade = async (idAspek, tahunAjaranId, semester, kelasId, grade, excludeId = null) => {
    let query = `
        SELECT id_kategori_grade_kokurikuler, grade, rentang_min, rentang_max
        FROM kategori_grade_kokurikuler
        WHERE id_aspek_kokurikuler = ?
        AND tahun_ajaran_id = ?
        AND semester = ?
        AND kelas_id = ?
        AND grade = ?
    `;
    const params = [idAspek, tahunAjaranId, semester, kelasId, grade];

    if (excludeId) {
        query += ` AND id_kategori_grade_kokurikuler != ?`;
        params.push(excludeId);
    }

    const [duplikat] = await db.execute(query, params);
    return duplikat;
};

/**
 * ✅ UPDATED: Cek Coverage 0-100 di konfigurasi_nilai_rapor PER KELAS
 */
exports.cekCoverage0to100 = async (mapelId, tahunAjaranId, kelasId) => {
    let query = `
        SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor 
        WHERE tahun_ajaran_id = ?
        AND kelas_id = ?
    `;
    const params = [tahunAjaranId, kelasId];

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
 * ✅ UPDATED: Cek Apakah Kategori Sedang Dipakai di nilai_rapor PER KELAS
 */
exports.cekKategoriDipakai = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai) => {
    if (mapelId === null) {
        return { total: 0 };
    }

    const [rows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM nilai_rapor 
        WHERE tahun_ajaran_id = ?
        AND kelas_id = ?
        AND nilai_rapor BETWEEN ? AND ?
        AND mapel_id = ?
    `, [tahunAjaranId, kelasId, minNilai, maxNilai, mapelId]);

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
// KATEGORI AKADEMIK (PER MAPEL + PER KELAS)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ✅ UPDATED: Ambil kategori akademik per mapel + per kelas
 */
exports.getKategoriAkademik = async (mapelId, tahunAjaranId, kelasId) => {
    const [kategori] = await db.execute(`
        SELECT 
            id_config AS id, 
            min_nilai, 
            max_nilai, 
            deskripsi, 
            urutan
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? 
        AND tahun_ajaran_id = ? 
        AND kelas_id = ?
        ORDER BY urutan ASC, min_nilai ASC
    `, [mapelId, tahunAjaranId, kelasId]);
    return kategori;
};

/**
 * ✅ UPDATED: Buat kategori akademik baru dengan kelas_id
 */
exports.createKategoriAkademik = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, deskripsi) => {
    const [result] = await db.execute(`
        INSERT INTO konfigurasi_nilai_rapor 
        (mapel_id, kelas_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan)
        VALUES (?, ?, ?, ?, ?, ?, 
            (SELECT IFNULL(MAX(urutan), 0) + 1 
            FROM (SELECT urutan FROM konfigurasi_nilai_rapor 
                WHERE mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?) AS tmp)
        )
    `, [mapelId, kelasId, tahunAjaranId, minNilai, maxNilai, deskripsi, mapelId, kelasId, tahunAjaranId]);
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
 * ✅ UPDATED: Ambil kategori by ID + KELAS (untuk keamanan)
 */
exports.getKategoriByIdAndKelas = async (id, kelasId) => {
    const [existing] = await db.execute(`
        SELECT id_config, mapel_id, kelas_id, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE id_config = ? AND kelas_id = ?
    `, [id, kelasId]);
    return existing.length > 0 ? existing[0] : null;
};

/**
 * ✅ UPDATED: Hapus kategori akademik dengan filter kelas_id
 */
exports.deleteKategoriAkademik = async (id, kelasId) => {
    await db.execute(`DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ? AND kelas_id = ?`, [id, kelasId]);
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI KOKURIKULER (PER KELAS)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ✅ UPDATED: Ambil kategori kokurikuler per kelas
 */
exports.getKategoriKokurikuler = async (tahunAjaranId, semester, kelasId) => {
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
        WHERE tahun_ajaran_id = ? 
        AND semester = ? 
        AND kelas_id = ?
        ORDER BY id_aspek_kokurikuler, urutan ASC, rentang_min ASC
    `, [tahunAjaranId, semester, kelasId]);
    return kategori;
};

/**
 * ✅ UPDATED: Buat kategori kokurikuler baru dengan kelas_id
 */
exports.createKategoriKokurikuler = async (idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, grade, deskripsi) => {
    const [result] = await db.execute(`
        INSERT INTO kategori_grade_kokurikuler 
        (id_aspek_kokurikuler, tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, grade, deskripsi, urutan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 
            (SELECT IFNULL(MAX(urutan), 0) + 1 
            FROM (SELECT urutan FROM kategori_grade_kokurikuler 
                WHERE id_aspek_kokurikuler = ? AND kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?) AS tmp)
        )
    `, [idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, grade, deskripsi, idAspek, kelasId, tahunAjaranId, semester]);
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
 * ✅ UPDATED: Ambil kategori kokurikuler by ID + KELAS (untuk keamanan)
 */
exports.getKategoriKokurikulerByIdAndKelas = async (id, kelasId) => {
    const [existing] = await db.execute(`
        SELECT 
            id_kategori_grade_kokurikuler,
            id_aspek_kokurikuler,
            kelas_id,
            rentang_min, rentang_max, grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?
    `, [id, kelasId]);
    return existing.length > 0 ? existing[0] : null;
};

/**
 * ✅ UPDATED: Hapus kategori kokurikuler dengan filter kelas_id
 */
exports.deleteKategoriKokurikuler = async (id, kelasId) => {
    await db.execute(`DELETE FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?`, [id, kelasId]);
};

// ═════════════════════════════════════════════════════════════════════════════
// BOBOT AKADEMIK (PER MAPEL + PER KELAS)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ✅ UPDATED: Ambil bobot per mapel + per kelas
 */
exports.getBobotByMapel = async (mapelId, kelasId) => {
    const [bobot] = await db.execute(`
        SELECT komponen_id, bobot
        FROM konfigurasi_mapel_komponen
        WHERE mapel_id = ? AND kelas_id = ? AND is_active = 1
    `, [mapelId, kelasId]);
    return bobot;
};

/**
 * ✅ UPDATED: Simpan bobot dengan kelas_id (transaction)
 */
exports.saveBobot = async (mapelId, kelasId, bobotList) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Delete bobot lama untuk mapel + kelas ini
        await connection.execute(`
            DELETE FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND kelas_id = ?
        `, [mapelId, kelasId]);

        // Insert bobot baru dengan kelas_id
        for (const b of bobotList) {
            await connection.execute(`
                INSERT INTO konfigurasi_mapel_komponen 
                (mapel_id, kelas_id, komponen_id, bobot, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            `, [mapelId, kelasId, b.komponen_id, parseFloat(b.bobot)]);
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
// VALIDASI TAMBAHAN: KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ✅ UPDATED: Cek Coverage 0-100 untuk SETIAP aspek kokurikuler PER KELAS
 */
exports.cekCoverageKokurikuler = async (tahunAjaranId, semester, kelasId) => {
    const [aspekRows] = await db.execute(`
        SELECT id_aspek_kokurikuler, nama 
        FROM aspek_kokurikuler 
        ORDER BY urutan ASC
    `);

    const result = { covered: true, gaps: [] };

    for (const aspek of aspekRows) {
        const [kategoriRows] = await db.execute(`
            SELECT rentang_min, rentang_max 
            FROM kategori_grade_kokurikuler 
            WHERE id_aspek_kokurikuler = ? 
            AND tahun_ajaran_id = ? 
            AND semester = ?
            AND kelas_id = ?
            ORDER BY rentang_min ASC
        `, [aspek.id_aspek_kokurikuler, tahunAjaranId, semester, kelasId]);

        if (kategoriRows.length === 0) {
            result.covered = false;
            result.gaps.push({
                aspek: aspek.nama,
                gap: '0-100 (belum ada kategori)'
            });
            continue;
        }

        if (kategoriRows[0].rentang_min > 0) {
            result.covered = false;
            result.gaps.push({
                aspek: aspek.nama,
                gap: `0-${kategoriRows[0].rentang_min - 1}`
            });
        }

        for (let i = 0; i < kategoriRows.length - 1; i++) {
            const currentMax = kategoriRows[i].rentang_max;
            const nextMin = kategoriRows[i + 1].rentang_min;
            
            if (nextMin > currentMax + 1) {
                result.covered = false;
                result.gaps.push({
                    aspek: aspek.nama,
                    gap: `${currentMax + 1}-${nextMin - 1}`
                });
            }
        }

        const lastMax = kategoriRows[kategoriRows.length - 1].rentang_max;
        if (lastMax < 100) {
            result.covered = false;
            result.gaps.push({
                aspek: aspek.nama,
                gap: `${lastMax + 1}-100`
            });
        }
    }

    return result;
};

/**
 * ✅ UPDATED: Cek kategori kokurikuler dipakai PER KELAS
 */
exports.cekKategoriKokurikulerDipakai = async (idKategori, kelasId) => {
    const [kategoriRows] = await db.execute(`
        SELECT id_aspek_kokurikuler, rentang_min, rentang_max 
        FROM kategori_grade_kokurikuler 
        WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?
    `, [idKategori, kelasId]);

    if (kategoriRows.length === 0) {
        return { total: 0, exists: false };
    }

    const { id_aspek_kokurikuler, rentang_min, rentang_max } = kategoriRows[0];

    const aspekKolomMap = {
        1: 'nilai_mutabaah',
        2: 'nilai_literasi',
        3: 'nilai_bpi',
        4: 'nilai_proyek'
    };

    const kolom = aspekKolomMap[id_aspek_kokurikuler];
    
    if (!kolom) {
        return { total: 0, exists: true, error: `Aspek ID ${id_aspek_kokurikuler} tidak valid` };
    }

    const [rows] = await db.execute(`
        SELECT COUNT(*) as total 
        FROM nilai_kokurikuler 
        WHERE kelas_id = ? AND ${kolom} BETWEEN ? AND ?
    `, [kelasId, rentang_min, rentang_max]);

    return {
        total: rows[0].total,
        exists: true
    };
};