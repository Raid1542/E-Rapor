/**
 * Nama File: batchPenilaianController.js
 * Fungsi: Controller batch save kategori kokurikuler (multiple grades).
 *         Dengan auto-recompute nilai kokurikuler (fleksibel edit meski ada nilai siswa).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');
const { recomputeNilaiKokurikulerForKelas } = require('./helpers');

// Konstanta ID Aspek Mutaba'ah
const ASPEK_MUTABAAH_ID = 5;

/**
 * Ambil jenis penilaian dari request.
 */
const getJenisPenilaian = (req) => req.jenis_penilaian || req.query?.jenis || req.body?.jenis || 'PTS';

/**
 * Validasi akses aspek kokurikuler berdasarkan periode penilaian.
 */
const validateAspekKokurikulerAccess = (aspekId, statusPts, statusPas, jenisPenilaian) => {
    if (jenisPenilaian === 'PTS' && statusPts === 'selesai') {
        return { allowed: false, reason: 'period_locked', message: 'Rapor PTS sudah dikunci. Data tidak dapat diubah.' };
    }
    if (jenisPenilaian === 'PAS' && statusPas === 'selesai') {
        return { allowed: false, reason: 'period_locked', message: 'Rapor PAS sudah dikunci. Data tidak dapat diubah.' };
    }
    if (jenisPenilaian === 'PTS' && statusPts !== 'aktif') {
        return { allowed: false, reason: 'not_open', message: 'Periode PTS belum dibuka oleh admin.' };
    }
    if (jenisPenilaian === 'PAS' && statusPas !== 'aktif') {
        return { allowed: false, reason: 'not_open', message: 'Periode PAS belum dibuka oleh admin.' };
    }
    if (jenisPenilaian === 'PTS' && aspekId !== ASPEK_MUTABAAH_ID) {
        return { allowed: false, reason: 'locked_pts', message: "Saat periode PTS aktif, hanya aspek Mutaba'ah Yaumiyah yang dapat dikelola." };
    }
    if (jenisPenilaian === 'PAS') {
        return { allowed: true, reason: 'pas_active' };
    }
    return { allowed: true, reason: 'default' };
};

/**
 * Ambil kelas_id dari request.
 */
const getKelasId = (req) => req.infoKelasWali?.kelas_id || null;

/**
 * POST /batch-kategori-kokurikuler - Simpan multiple grades untuk satu aspek kokurikuler sekaligus.
 */
exports.saveBatchKategoriKokurikuler = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id_aspek_kokurikuler, grades } = req.body;
        const kelasId = getKelasId(req);
        const jenisPenilaian = getJenisPenilaian(req);
        const userId = req.user.id;

        // Validasi input dasar
        if (!kelasId) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Anda belum ditugaskan sebagai guru kelas' });
        }
        if (!id_aspek_kokurikuler) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Aspek kokurikuler harus dipilih', code: 'MISSING_ASPEK' });
        }
        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Minimal harus ada 1 grade', code: 'EMPTY_GRADES' });
        }

        // Ambil tahun ajaran dan validasi periode
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            throw new Error('Tahun ajaran aktif belum diatur');
        }

        const accessCheck = validateAspekKokurikulerAccess(
            id_aspek_kokurikuler,
            taAktif.status_pts,
            taAktif.status_pas,
            jenisPenilaian
        );

        if (!accessCheck.allowed) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                code: 'ASPEK_LOCKED',
                reason: accessCheck.reason,
                message: accessCheck.message
            });
        }

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
            if (max - min < 3) {
                throw new Error(`Grade ${g.grade}: Range minimal 3 poin`);
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

        // Cek tidak ada perubahan data
        const [existingGrades] = await connection.execute(
            `SELECT rentang_min, rentang_max, grade, deskripsi 
        FROM kategori_grade_kokurikuler 
        WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? 
        ORDER BY rentang_min DESC`,
            [id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, jenisPenilaian]
        );

        if (existingGrades.length === grades.length) {
            const normalize = (g) => ({
                min: Math.floor(parseFloat(g.min_nilai || g.rentang_min)),
                max: Math.floor(parseFloat(g.max_nilai || g.rentang_max)),
                grade: (g.grade || '').toUpperCase().trim(),
                deskripsi: (g.deskripsi || '').trim()
            });

            const newNorm = grades.map(normalize).sort((a, b) => b.min - a.min);
            const existNorm = existingGrades.map(normalize).sort((a, b) => b.min - a.min);

            const isSame = newNorm.every(
                (g, i) =>
                    g.min === existNorm[i].min &&
                    g.max === existNorm[i].max &&
                    g.grade === existNorm[i].grade &&
                    g.deskripsi === existNorm[i].deskripsi
            );

            if (isSame) {
                await connection.rollback();
                return res.status(400).json({ success: false, code: 'NO_CHANGES', message: 'Tidak ada perubahan data.' });
            }
        }

        // Cek overlap antar grade dalam batch
        for (let i = 0; i < grades.length; i++) {
            for (let j = i + 1; j < grades.length; j++) {
                const aMin = parseFloat(grades[i].min_nilai);
                const aMax = parseFloat(grades[i].max_nilai);
                const bMin = parseFloat(grades[j].min_nilai);
                const bMax = parseFloat(grades[j].max_nilai);

                if (aMin <= bMax && aMax >= bMin) {
                    throw new Error(`Range tumpang tindih antara grade ${grades[i].grade} dan ${grades[j].grade}`);
                }
            }
        }

        // Hapus grade lama untuk di-replace dengan data baru
        await connection.execute(
            `DELETE FROM kategori_grade_kokurikuler 
        WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ?`,
            [id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, jenisPenilaian]
        );

        // Gunakan loop execute untuk menghindari error syntax bulk insert di mysql2
        let urutan = 1;
        for (const g of grades) {
            await connection.execute(
                `INSERT INTO kategori_grade_kokurikuler 
            (tahun_ajaran_id, semester, kelas_id, id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi, urutan, jenis_penilaian) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    taAktif.id_tahun_ajaran,
                    taAktif.semester,
                    kelasId,
                    id_aspek_kokurikuler,
                    Math.floor(parseFloat(g.min_nilai)),
                    Math.floor(parseFloat(g.max_nilai)),
                    g.grade.toUpperCase().trim(),
                    g.deskripsi.trim(),
                    urutan++,
                    jenisPenilaian
                ]
            );
        }

        await connection.commit();

        // Auto-recompute nilai kokurikuler setelah batch save
        let warning = '';
        try {
            await recomputeNilaiKokurikulerForKelas(
                id_aspek_kokurikuler,
                kelasId,
                userId,
                req
            );
            warning = ' Nilai kokurikuler siswa telah diperbarui otomatis sesuai range baru.';
        } catch (recalcErr) {
            warning = ' Peringatan: Gagal memperbarui nilai kokurikuler otomatis. Silakan cek kembali.';
        }

        res.json({
            success: true,
            message: `${grades.length} grade berhasil disimpan (${jenisPenilaian}).${warning}`,
            data: {
                jumlah_grade: grades.length,
                id_aspek_kokurikuler,
                jenis_penilaian: jenisPenilaian, 
                auto_recomputed: true
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error saveBatchKategoriKokurikuler:', error);
        res.status(400).json({
            success: false,
            message: 'Gagal menyimpan batch grade kokurikuler',
            code: 'BATCH_SAVE_ERROR'
        });
    } finally {
        connection.release();
    }
};