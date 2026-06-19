const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');
const SalinDariTahunSebelumnyaService = require('../../services/salinDariTahunSebelumnyaService');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Ambil kelas_id dari request
// ═════════════════════════════════════════════════════════════════════════════
const getKelasId = (req) => req.infoKelasWali?.kelas_id;

// ═════════════════════════════════════════════════════════════════════════════
// 1. BATCH SAVE KATEGORI KOKURIKULER
// POST /atur-penilaian/kategori-kokurikuler-batch
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

        // Validasi input dasar
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

        // Ambil tahun ajaran aktif
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            throw new Error('Tahun ajaran aktif belum diatur');
        }

        // Cek overlap dengan data existing (selain yang akan dihapus)
        // Karena kita akan hapus semua grade untuk aspek ini dulu, overlap hanya terjadi dalam batch
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

        // Hapus semua grade lama untuk aspek ini di kelas + TA aktif
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
            0 // urutan (akan diupdate jika perlu)
        ]);

        await connection.query(
            `INSERT INTO kategori_grade_kokurikuler 
             (tahun_ajaran_id, semester, kelas_id, id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi, urutan)
             VALUES ?`,
            [nilaiInsert]
        );

        await connection.query('COMMIT');

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
        console.error('Error saveBatchKategoriKokurikuler:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Gagal menyimpan batch grade',
            code: 'BATCH_SAVE_ERROR'
        });
    } finally {
        connection.release();
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. COPY KATEGORI KOKURIKULER DARI TA SEBELUMNYA
// POST /atur-penilaian/copy-kokurikuler
// ═════════════════════════════════════════════════════════════════════════════
exports.copyKokurikulerDariTASebelumnya = async (req, res) => {
    try {
        const kelasId = getKelasId(req);

        if (!kelasId) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas'
            });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
                code: 'NO_ACTIVE_TA'
            });
        }

        const result = await SalinDariTahunSebelumnyaService.salinKokurikuler(
            taAktif.id_tahun_ajaran,
            taAktif.semester,
            kelasId
        );

        res.json(result);

    } catch (error) {
        console.error('Error copyKokurikuler:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Gagal copy data',
            code: 'COPY_ERROR'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. COPY KATEGORI AKADEMIK DARI TA SEBELUMNYA
// POST /atur-penilaian/copy-akademik?mapel_id=X
// ═════════════════════════════════════════════════════════════════════════════
exports.copyAkademikDariTASebelumnya = async (req, res) => {
    try {
        const idMapel = parseInt(req.query.mapel_id);
        const kelasId = getKelasId(req);
        const userId = req.user.id;

        if (!idMapel) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id harus disertakan',
                code: 'MISSING_MAPEL_ID'
            });
        }

        if (!kelasId) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas'
            });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
                code: 'NO_ACTIVE_TA'
            });
        }

        // Validasi: Guru mengajar mapel ini di kelasnya
        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(
            userId, idMapel, kelasId, taAktif.id_tahun_ajaran
        );
        if (!mengajarMapel) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda'
            });
        }

        const result = await SalinDariTahunSebelumnyaService.salinAkademik(
            taAktif.id_tahun_ajaran,
            idMapel,
            kelasId
        );

        res.json(result);

    } catch (error) {
        console.error('Error copyAkademik:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Gagal copy data',
            code: 'COPY_ERROR'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. COPY BOBOT AKADEMIK DARI TA SEBELUMNYA
// POST /atur-penilaian/copy-bobot?mapel_id=X
// ═════════════════════════════════════════════════════════════════════════════
exports.copyBobotDariTASebelumnya = async (req, res) => {
    try {
        const idMapel = parseInt(req.query.mapel_id);
        const kelasId = getKelasId(req);
        const userId = req.user.id;

        if (!idMapel) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id harus disertakan',
                code: 'MISSING_MAPEL_ID'
            });
        }

        if (!kelasId) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas'
            });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
                code: 'NO_ACTIVE_TA'
            });
        }

        // Validasi: Guru mengajar mapel ini di kelasnya
        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(
            userId, idMapel, kelasId, taAktif.id_tahun_ajaran
        );
        if (!mengajarMapel) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda'
            });
        }

        // Cek apakah periode PTS aktif (bobot tidak bisa di-copy saat PTS aktif)
        if (taAktif.status_pts === 'aktif') {
            return res.status(403).json({
                success: false,
                code: 'PERIOD_LOCKED',
                message: 'Tidak dapat copy bobot saat periode PTS aktif'
            });
        }

        const result = await SalinDariTahunSebelumnyaService.salinBobot(
            taAktif.id_tahun_ajaran,
            idMapel,
            kelasId
        );

        res.json(result);

    } catch (error) {
        console.error('Error copyBobot:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Gagal copy data',
            code: 'COPY_ERROR'
        });
    }
};