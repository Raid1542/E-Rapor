/**
 * Nama File: batchPenilaianController.js
 * Fungsi: Controller untuk batch save kategori kokurikuler (multiple grades sekaligus).
 *         Menangani validasi akses berdasarkan jenis penilaian (PTS/PAS),
 *         validasi overlap, dan penyimpanan batch dalam transaction.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ID Aspek Mutaba'ah (sesuai database)
 */
const ASPEK_MUTABAAH_ID = 5;

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil jenis penilaian dari request (middleware, query, atau body)
 * @param {Object} req - Express request object
 * @returns {string} Jenis penilaian ('PTS' atau 'PAS')
 */
const getJenisPenilaian = (req) => {
    return req.jenis_penilaian       // dari middleware (underscore)
        || req.query?.jenis 
        || req.body?.jenis 
        || 'PTS';
};

/**
 * Validasi akses aspek kokurikuler berdasarkan jenis penilaian aktif
 * 
 * Business Rules:
 *   - Cek apakah periode yang diminta sudah selesai → locked
 *   - Cek apakah periode yang diminta belum dibuka → not_open
 *   - PTS aktif: hanya Mutaba'ah yang boleh
 *   - PAS aktif: semua aspek boleh
 * 
 * @param {number} aspekId - ID aspek kokurikuler
 * @param {string} status_pts - Status PTS (aktif/nonaktif/selesai)
 * @param {string} status_pas - Status PAS (aktif/nonaktif/selesai)
 * @param {string} jenis_penilaian - Jenis penilaian yang diminta (PTS/PAS)
 * @returns {Object} { allowed, reason?, message? }
 */
const validateAspekKokurikulerAccess = (aspekId, status_pts, status_pas, jenis_penilaian) => {
    console.log(`[validateAspek] aspekId: ${aspekId}, jenis: ${jenis_penilaian}, status_pts: ${status_pts}, status_pas: ${status_pas}`);
    
    // Cek apakah periode yang diminta sudah selesai
    if (jenis_penilaian === 'PTS' && status_pts === 'selesai') {
        return {
            allowed: false,
            reason: 'period_locked',
            message: 'Rapor PTS sudah dikunci. Data tidak dapat diubah.'
        };
    }
    if (jenis_penilaian === 'PAS' && status_pas === 'selesai') {
        return {
            allowed: false,
            reason: 'period_locked',
            message: 'Rapor PAS sudah dikunci. Data tidak dapat diubah.'
        };
    }
    
    // Cek apakah periode yang diminta belum dibuka
    if (jenis_penilaian === 'PTS' && status_pts !== 'aktif') {
        return {
            allowed: false,
            reason: 'not_open',
            message: 'Periode PTS belum dibuka oleh admin.'
        };
    }
    if (jenis_penilaian === 'PAS' && status_pas !== 'aktif') {
        return {
            allowed: false,
            reason: 'not_open',
            message: 'Periode PAS belum dibuka oleh admin.'
        };
    }
    
    // RULE: PTS aktif → hanya Mutaba'ah
    if (jenis_penilaian === 'PTS' && aspekId !== ASPEK_MUTABAAH_ID) {
        return {
            allowed: false,
            reason: 'locked_pts',
            message: `Saat periode PTS aktif, hanya aspek Mutaba'ah Yaumiyah yang dapat dikelola. Aspek lain akan dibuka saat periode PAS.`
        };
    }
    
    // PAS aktif → semua aspek boleh
    if (jenis_penilaian === 'PAS') {
        return { allowed: true, reason: 'pas_active' };
    }
    
    return { allowed: true, reason: 'default' };
};

/**
 * Ambil kelas_id dari request (dari middleware)
 * @param {Object} req - Express request object
 * @returns {number|undefined} ID kelas
 */
const getKelasId = (req) => req.infoKelasWali?.kelas_id;

// ═════════════════════════════════════════════════════════════════════════════
// 1. BATCH SAVE KATEGORI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/guru-kelas/atur-penilaian/batch-kategori-kokurikuler
 * Simpan multiple grades untuk satu aspek kokurikuler sekaligus.
 * 
 * Alur Kerja:
 *   1. Validasi input (aspek, grades array)
 *   2. Validasi akses berdasarkan jenis penilaian
 *   3. Validasi setiap grade (range, deskripsi, format)
 *   4. Cek duplikasi grade dalam batch
 *   5. Cek apakah ada perubahan data
 *   6. Cek overlap antar grade dalam batch
 *   7. Delete grade lama untuk aspek + jenis ini
 *   8. Insert semua grade baru dengan jenis_penilaian
 * 
 * Validasi:
 *   - Grade harus 1 karakter (A, B, C, dst)
 *   - Range minimal 3 poin
 *   - Nilai 0-100
 *   - Deskripsi minimal 3 karakter
 *   - Tidak ada overlap dalam batch
 *   - Tidak ada duplikasi grade
 * 
 * Business Rules:
 *   - Filter berdasarkan jenis_penilaian (PTS/PAS)
 *   - Transaction untuk atomic operation
 *   - Auto-detect no changes
 * 
 * @param {number} req.body.id_aspek_kokurikuler - ID aspek kokurikuler
 * @param {Array} req.body.grades - Array grade [{grade, min_nilai, max_nilai, deskripsi}]
 */
exports.saveBatchKategoriKokurikuler = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.query('START TRANSACTION');

        const { id_aspek_kokurikuler, grades } = req.body;
        const kelasId = getKelasId(req);
        
        // Ambil jenis_penilaian dari middleware
        const jenis_penilaian = getJenisPenilaian(req);
        
        console.log(`[BATCH] jenis_penilaian: ${jenis_penilaian}`);
        console.log(`[BATCH] kelasId: ${kelasId}`);
        console.log(`[BATCH] id_aspek: ${id_aspek_kokurikuler}`);

        // Validasi kelas
        if (!kelasId) {
            await connection.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas'
            });
        }

        // Validasi aspek
        if (!id_aspek_kokurikuler) {
            await connection.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Aspek kokurikuler harus dipilih',
                code: 'MISSING_ASPEK'
            });
        }

        // Validasi grades array
        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Minimal harus ada 1 grade',
                code: 'EMPTY_GRADES'
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            throw new Error('Tahun ajaran aktif belum diatur');
        }

        // Validasi periode dengan jenis_penilaian
        const accessCheck = validateAspekKokurikulerAccess(
            id_aspek_kokurikuler,
            taAktif.status_pts,
            taAktif.status_pas,
            jenis_penilaian
        );

        if (!accessCheck.allowed) {
            await connection.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                code: 'ASPEK_LOCKED',
                reason: accessCheck.reason,
                message: accessCheck.message
            });
        }

        console.log(`[BATCH] Aspek ${id_aspek_kokurikuler} boleh dikelola (reason: ${accessCheck.reason})`);

        // Validasi setiap grade
        for (const g of grades) {
            if (!g.grade || g.grade.trim().length === 0) {
                throw new Error('Ada grade yang kosong');
            }
            if (g.grade.length !== 1) {
                throw new Error(`Grade "${g.grade}" harus tepat 1 karakter`);
            }
            const min = parseFloat(g.min_nilai);
            const max = parseFloat(g.max_nilai);
            if (isNaN(min) || isNaN(max)) {
                throw new Error(`Grade ${g.grade}: Nilai min/max harus angka`);
            }
            if (min >= max) {
                throw new Error(`Grade ${g.grade}: Min (${min}) harus lebih kecil dari Max (${max})`);
            }
            if (min < 0 || max > 100) {
                throw new Error(`Grade ${g.grade}: Nilai harus antara 0-100`);
            }
            const range = max - min;
            if (range < 3) {
                throw new Error(`Grade ${g.grade}: Range minimal 3 poin (saat ini: ${range})`);
            }
            if (!g.deskripsi || g.deskripsi.trim().length < 3) {
                throw new Error(`Grade ${g.grade}: Deskripsi minimal 3 karakter`);
            }
        }

        // Cek duplikasi grade dalam batch
        const gradeValues = grades.map(g => g.grade.toUpperCase().trim());
        const duplicates = gradeValues.filter((g, i) => gradeValues.indexOf(g) !== i);
        if (duplicates.length > 0) {
            throw new Error(`Grade duplikat dalam batch: ${[...new Set(duplicates)].join(', ')}`);
        }

        // Cek "Tidak Ada Perubahan" - dengan filter jenis
        const [existingGrades] = await connection.query(
            `SELECT rentang_min, rentang_max, grade, deskripsi
                FROM kategori_grade_kokurikuler
                WHERE id_aspek_kokurikuler = ?
                AND tahun_ajaran_id = ?
                AND semester = ?
                AND kelas_id = ?
                AND jenis_penilaian = ?
                ORDER BY rentang_min DESC`,
            [id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, jenis_penilaian]
        );

        if (existingGrades.length === grades.length) {
            const normalizeGrade = (g) => ({
                min: Math.floor(parseFloat(g.min_nilai || g.rentang_min)),
                max: Math.floor(parseFloat(g.max_nilai || g.rentang_max)),
                grade: (g.grade || '').toUpperCase().trim(),
                deskripsi: (g.deskripsi || '').trim()
            });

            const newGradesNormalized = grades.map(normalizeGrade).sort((a, b) => b.min - a.min);
            const existingGradesNormalized = existingGrades.map(normalizeGrade).sort((a, b) => b.min - a.min);

            let isSame = true;
            for (let i = 0; i < newGradesNormalized.length; i++) {
                const newG = newGradesNormalized[i];
                const existingG = existingGradesNormalized[i];
                
                if (newG.min !== existingG.min ||
                    newG.max !== existingG.max ||
                    newG.grade !== existingG.grade ||
                    newG.deskripsi !== existingG.deskripsi) {
                    isSame = false;
                    break;
                }
            }

            if (isSame) {
                await connection.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    code: 'NO_CHANGES',
                    message: 'Tidak ada perubahan data. Data yang disimpan sama dengan data yang sudah ada.'
                });
            }
        }

        // Cek overlap dalam batch
        for (let i = 0; i < grades.length; i++) {
            for (let j = i + 1; j < grades.length; j++) {
                const a = grades[i];
                const b = grades[j];
                const aMin = parseFloat(a.min_nilai);
                const aMax = parseFloat(a.max_nilai);
                const bMin = parseFloat(b.min_nilai);
                const bMax = parseFloat(b.max_nilai);

                if (aMin <= bMax && aMax >= bMin) {
                    throw new Error(
                        `Range nilai tumpang tindih antara grade ${a.grade} (${aMin}-${aMax}) dan grade ${b.grade} (${bMin}-${bMax})`
                    );
                }
            }
        }

        // Hapus semua grade lama untuk aspek ini + jenis ini
        await connection.query(
            `DELETE FROM kategori_grade_kokurikuler 
                WHERE id_aspek_kokurikuler = ? 
                AND tahun_ajaran_id = ? 
                AND semester = ? 
                AND kelas_id = ?
                AND jenis_penilaian = ?`,
            [id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, jenis_penilaian]
        );

        // Insert semua grade baru dengan jenis_penilaian
        const nilaiInsert = grades.map(g => [
            taAktif.id_tahun_ajaran,
            taAktif.semester,
            kelasId,
            id_aspek_kokurikuler,
            Math.floor(parseFloat(g.min_nilai)),
            Math.floor(parseFloat(g.max_nilai)),
            g.grade.toUpperCase().trim(),
            g.deskripsi.trim(),
            0,
            jenis_penilaian
        ]);

        await connection.query(
            `INSERT INTO kategori_grade_kokurikuler 
                (tahun_ajaran_id, semester, kelas_id, id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi, urutan, jenis_penilaian)
                VALUES ?`,
            [nilaiInsert]
        );

        await connection.query('COMMIT');

        console.log(`[BATCH] ${grades.length} grade berhasil disimpan untuk aspek ${id_aspek_kokurikuler} (jenis: ${jenis_penilaian})`);

        res.json({
            success: true,
            message: `${grades.length} grade berhasil disimpan untuk aspek ini (${jenis_penilaian})`,
            data: {
                jumlah_grade: grades.length,
                id_aspek_kokurikuler,
                jenis_penilaian
            }
        });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('Error saveBatchKategoriKokurikuler:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Gagal menyimpan batch grade',
            code: error.code || 'BATCH_SAVE_ERROR'
        });
    } finally {
        connection.release();
    }
};