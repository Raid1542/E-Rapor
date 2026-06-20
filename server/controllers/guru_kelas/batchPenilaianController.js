/**
 * Nama File: batchPenilaianController.js
 * Fungsi: Handle batch operations untuk kategori penilaian
 * UPDATE: ✅ Validasi periode PTS/PAS untuk Kategori Kokurikuler
 *   - PTS aktif → hanya Mutaba'ah (id=5) yang boleh
 *   - PAS aktif → semua aspek boleh
 *   - Belum aktif → semua terkunci
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');

// ═════════════════════════════════════════════════════════════════════════════
// ✅ KONSTANTA: ID Aspek Mutaba'ah (sesuai database)
// ═════════════════════════════════════════════════════════════════════════════
const ASPEK_MUTABAAH_ID = 5;

// ═════════════════════════════════════════════════════════════════════════════
// ✅ HELPER: Validasi Akses Aspek Kokurikuler Berdasarkan Periode
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Cek apakah aspek kokurikuler boleh dikelola berdasarkan periode aktif
 * 
 * @param {number} aspekId - ID aspek yang akan dikelola
 * @param {string} status_pts - Status PTS ('aktif' | 'nonaktif' | 'selesai')
 * @param {string} status_pas - Status PAS ('aktif' | 'nonaktif' | 'selesai')
 * @returns {Object} { allowed: boolean, reason: string, message: string }
 */
const validateAspekKokurikulerAccess = (aspekId, status_pts, status_pas) => {
    const isPtsActive = status_pts === 'aktif';
    const isPasActive = status_pas === 'aktif';
    const isLocked = status_pts === 'selesai' || status_pas === 'selesai';
    
    // Periode selesai → semua terkunci
    if (isLocked) {
        return {
            allowed: false,
            reason: 'period_locked',
            message: 'Periode penilaian telah selesai. Data tidak dapat diubah.'
        };
    }
    
    // Belum ada periode aktif
    if (!isPtsActive && !isPasActive) {
        return {
            allowed: false,
            reason: 'not_open',
            message: 'Periode penilaian belum aktif. Silakan tunggu admin membuka periode penilaian.'
        };
    }
    
    // PTS aktif: hanya Mutaba'ah
    if (isPtsActive && aspekId !== ASPEK_MUTABAAH_ID) {
        return {
            allowed: false,
            reason: 'locked_pts',
            message: `Saat periode PTS aktif, hanya aspek Mutaba'ah Yaumiyah yang dapat dikelola kategorinya. Aspek lain (BPI, Literasi, Proyek) akan dibuka saat periode PAS.`
        };
    }
    
    // PAS aktif: semua aspek boleh
    if (isPasActive) {
        return { allowed: true, reason: 'pas_active' };
    }
    
    return { allowed: true, reason: 'default' };
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Ambil kelas_id dari request
// ═════════════════════════════════════════════════════════════════════════════
const getKelasId = (req) => req.infoKelasWali?.kelas_id;

// ═════════════════════════════════════════════════════════════════════════════
// 1. BATCH SAVE KATEGORI KOKURIKULER
// POST /atur-penilaian/kategori-kokurikuler-batch
// ✅ DENGAN VALIDASI PERIODE PTS/PAS
// ═════════════════════════════════════════════════════════════════════════════
exports.saveBatchKategoriKokurikuler = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.query('START TRANSACTION');

        const { id_aspek_kokurikuler, grades } = req.body;
        const kelasId = getKelasId(req);

        if (!kelasId) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas'
            });
        }

        // ✅ VALIDASI INPUT DASAR
        if (!id_aspek_kokurikuler) {
            return res.status(400).json({
                success: false,
                message: 'Aspek kokurikuler harus dipilih',
                code: 'MISSING_ASPEK'
            });
        }

        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Minimal harus ada 1 grade',
                code: 'EMPTY_GRADES'
            });
        }

        // ✅ VALIDASI PERIODE: Cek apakah aspek ini boleh dikelola
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            throw new Error('Tahun ajaran aktif belum diatur');
        }

        const accessCheck = validateAspekKokurikulerAccess(
            id_aspek_kokurikuler,
            taAktif.status_pts,
            taAktif.status_pas
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

        console.log(`✅ [BATCH] Aspek ${id_aspek_kokurikuler} boleh dikelola (reason: ${accessCheck.reason})`);

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

        // Check duplicate grade dalam batch
        const gradeValues = grades.map(g => g.grade.toUpperCase().trim());
        const duplicates = gradeValues.filter((g, i) => gradeValues.indexOf(g) !== i);
        if (duplicates.length > 0) {
            throw new Error(`Grade duplikat dalam batch: ${[...new Set(duplicates)].join(', ')}`);
        }

        // ✅ Cek "Tidak Ada Perubahan"
        const [existingGrades] = await connection.query(
            `SELECT rentang_min, rentang_max, grade, deskripsi
             FROM kategori_grade_kokurikuler
             WHERE id_aspek_kokurikuler = ?
             AND tahun_ajaran_id = ?
             AND semester = ?
             AND kelas_id = ?
             ORDER BY rentang_min DESC`,
            [id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId]
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

        // Hapus semua grade lama untuk aspek ini
        await connection.query(
            `DELETE FROM kategori_grade_kokurikuler 
             WHERE id_aspek_kokurikuler = ? 
               AND tahun_ajaran_id = ? 
               AND semester = ? 
               AND kelas_id = ?`,
            [id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId]
        );

        // Insert semua grade baru
        const nilaiInsert = grades.map(g => [
            taAktif.id_tahun_ajaran,
            taAktif.semester,
            kelasId,
            id_aspek_kokurikuler,
            Math.floor(parseFloat(g.min_nilai)),
            Math.floor(parseFloat(g.max_nilai)),
            g.grade.toUpperCase().trim(),
            g.deskripsi.trim(),
            0
        ]);

        await connection.query(
            `INSERT INTO kategori_grade_kokurikuler 
             (tahun_ajaran_id, semester, kelas_id, id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi, urutan)
             VALUES ?`,
            [nilaiInsert]
        );

        await connection.query('COMMIT');

        console.log(`✅ [BATCH] ${grades.length} grade berhasil disimpan untuk aspek ${id_aspek_kokurikuler}`);

        res.json({
            success: true,
            message: `${grades.length} grade berhasil disimpan untuk aspek ini`,
            data: {
                jumlah_grade: grades.length,
                id_aspek_kokurikuler
            }
        });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('❌ Error saveBatchKategoriKokurikuler:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Gagal menyimpan batch grade',
            code: error.code || 'BATCH_SAVE_ERROR'
        });
    } finally {
        connection.release();
    }
};