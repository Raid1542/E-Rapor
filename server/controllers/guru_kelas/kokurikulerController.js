/**
 * Nama File: kokurikulerController.js
 * Fungsi: Mengelola nilai kokurikuler siswa
 */

const db = require('../../config/db');
const { getGradeFromConfig } = require('./helpers');

/**
 * GET /kokurikuler
 * Mendapatkan data nilai kokurikuler seluruh siswa di kelas
 */
exports.getNilaiKokurikuler = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda belum ditetapkan sebagai wali kelas pada tahun ajaran ini.',
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        let jenis_penilaian = null;
        if (status_pts === 'aktif') jenis_penilaian = 'PTS';
        else if (status_pas === 'aktif') jenis_penilaian = 'PAS';

        if (!jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif' });
        }

        const [rawRows] = await db.execute(
            `SELECT
                nk.id_siswa, nk.nilai_mutabaah, nk.nilai_bpi, nk.nilai_literasi, nk.nilai_proyek,
                jpt.judul AS nama_judul_proyek
             FROM nilai_kokurikuler nk
             LEFT JOIN judul_proyek_per_tahun_ajaran jpt ON nk.id_judul_proyek = jpt.id_judul_proyek
             WHERE nk.id_kelas = ? AND nk.tahun_ajaran_id = ? AND nk.semester = ? AND nk.jenis_penilaian = ?`,
            [kelas_id, semesterId, semester, jenis_penilaian]
        );

        const [gradeConfig] = await db.execute(
            `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
             FROM kategori_grade_kokurikuler
             WHERE tahun_ajaran_id = ? AND semester = ?
             ORDER BY rentang_min DESC`,
            [semesterId, semester]
        );

        const result = rawRows.map(row => {
            const mutabaah = getGradeFromConfig(gradeConfig, row.nilai_mutabaah, 1);
            const bpi = getGradeFromConfig(gradeConfig, row.nilai_bpi, 3);
            const literasi = getGradeFromConfig(gradeConfig, row.nilai_literasi, 2);
            const proyek = getGradeFromConfig(gradeConfig, row.nilai_proyek, 4);
            return {
                siswa_id: row.id_siswa,
                mutabaah_nilai: row.nilai_mutabaah, bpi_nilai: row.nilai_bpi,
                literasi_nilai: row.nilai_literasi, judul_proyek_nilai: row.nilai_proyek,
                nama_judul_proyek: row.nama_judul_proyek || '',
                mutabaah_grade: mutabaah.grade, bpi_grade: bpi.grade,
                literasi_grade: literasi.grade, judul_proyek_grade: proyek.grade,
                mutabaah_deskripsi: mutabaah.deskripsi, bpi_deskripsi: bpi.deskripsi,
                literasi_deskripsi: literasi.deskripsi, judul_proyek_deskripsi: proyek.deskripsi,
            };
        });

        const [siswaRows] = await db.execute(
            `SELECT id_siswa, nama_lengkap, nis, nisn
             FROM siswa s
             JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
             ORDER BY s.nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        const siswaMap = new Map();
        siswaRows.forEach(s => {
            siswaMap.set(s.id_siswa, {
                id: s.id_siswa, nama: s.nama_lengkap, nis: s.nis, nisn: s.nisn,
                kokurikuler: {
                    mutabaah_nilai: null, mutabaah_grade: null, mutabaah_deskripsi: null,
                    bpi_nilai: null, bpi_grade: null, bpi_deskripsi: null,
                    literasi_nilai: null, literasi_grade: null, literasi_deskripsi: null,
                    judul_proyek_nilai: null, judul_proyek_grade: null, judul_proyek_deskripsi: null,
                    nama_judul_proyek: null,
                },
            });
        });

        result.forEach(item => {
            if (siswaMap.has(item.siswa_id)) {
                siswaMap.get(item.siswa_id).kokurikuler = item;
            }
        });

        const finalData = Array.from(siswaMap.values());

        res.json({
            success: true,
            data: finalData,
            kelas: nama_kelas,
            kelasId: kelas_id,
            tahunAjaranId: semesterId,
            semester: semester,
        });
    } catch (error) {
        console.error('Error getNilaiKokurikuler:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data nilai kokurikuler',
        });
    }
};

/**
 * GET /kokurikuler/:siswaId
 * Ambil nilai kokurikuler untuk satu siswa
 */
exports.getNilaiKokurikulerBySiswa = async (req, res) => {
    const { siswaId } = req.params;
    const userId = req.user.id;
    try {
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};
        const jenis_penilaian = req.jenis_penilaian;

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        const [gkRows] = await db.execute(
            `SELECT gk.kelas_id
             FROM guru_kelas gk
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             LIMIT 1`,
            [userId, tahunAjaranIndukId]
        );

        if (gkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.'
            });
        }

        const { kelas_id } = gkRows[0];

        const [rows] = await db.execute(
            `SELECT nilai_mutabaah, nilai_bpi, nilai_literasi, nilai_proyek, id_judul_proyek
             FROM nilai_kokurikuler
             WHERE id_siswa = ? AND id_kelas = ? AND tahun_ajaran_id = ?
             AND semester = ? AND jenis_penilaian = ?`,
            [siswaId, kelas_id, semesterId, semester, jenis_penilaian]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data kokurikuler tidak ditemukan.'
            });
        }

        res.json({
            success: true,
            data: rows[0],
        });
    } catch (err) {
        console.error('Error getNilaiKokurikulerBySiswa:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data kokurikuler.'
        });
    }
};

/**
 * PUT /kokurikuler/:siswaId
 * Memperbarui nilai kokurikuler siswa, termasuk judul proyek
 */
exports.updateNilaiKokurikuler = async (req, res) => {
    const { siswaId } = req.params;
    const { mutabaah_nilai, bpi_nilai, literasi_nilai, judul_proyek_nilai, nama_judul_proyek } = req.body;
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        let jenis_penilaian;
        if (status_pts === 'aktif') {
            jenis_penilaian = 'PTS';
        } else if (status_pas === 'aktif') {
            jenis_penilaian = 'PAS';
        } else {
            return res.status(403).json({
                success: false,
                message: 'Periode penilaian tidak aktif. Data kokurikuler tidak dapat diubah.'
            });
        }

        const [gkRows] = await db.execute(
            `SELECT gk.kelas_id
             FROM guru_kelas gk
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             LIMIT 1`,
            [userId, tahunAjaranIndukId]
        );

        if (gkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.',
            });
        }

        const { kelas_id } = gkRows[0];

        let id_judul_proyek = null;
        if (nama_judul_proyek && nama_judul_proyek.trim() !== '') {
            const judulBersih = nama_judul_proyek.trim();
            const [existing] = await db.execute(
                `SELECT id_judul_proyek FROM judul_proyek_per_tahun_ajaran
                 WHERE tahun_ajaran_id = ? AND judul = ?`,
                [semesterId, judulBersih]
            );
            if (existing.length > 0) {
                id_judul_proyek = existing[0].id_judul_proyek;
            } else {
                const [newRow] = await db.execute(
                    `INSERT INTO judul_proyek_per_tahun_ajaran
                     (tahun_ajaran_id, judul, deskripsi, created_at, updated_at)
                     VALUES (?, ?, ?, NOW(), NOW())`,
                    [semesterId, judulBersih, 'Deskripsi proyek otomatis']
                );
                id_judul_proyek = newRow.insertId;
            }
        }

        const [gradeConfig] = await db.execute(
            `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
             FROM kategori_grade_kokurikuler
             WHERE tahun_ajaran_id = ? AND semester = ?
             ORDER BY rentang_min DESC`,
            [semesterId, semester]
        );

        const mutabaah = getGradeFromConfig(gradeConfig, mutabaah_nilai || 0, 1);
        const bpiGrade = getGradeFromConfig(gradeConfig, bpi_nilai || 0, 3);
        const literasiGrade = getGradeFromConfig(gradeConfig, literasi_nilai || 0, 2);
        const proyekGrade = getGradeFromConfig(gradeConfig, judul_proyek_nilai || 0, 4);

        await db.execute(
            `INSERT INTO nilai_kokurikuler (
                id_siswa, id_kelas, tahun_ajaran_id, semester, jenis_penilaian,
                nilai_mutabaah, grade_mutabaah, deskripsi_mutabaah,
                nilai_bpi, grade_bpi, deskripsi_bpi,
                nilai_literasi, grade_literasi, deskripsi_literasi,
                nilai_proyek, grade_proyek, deskripsi_proyek,
                id_judul_proyek, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                nilai_mutabaah = VALUES(nilai_mutabaah), grade_mutabaah = VALUES(grade_mutabaah), deskripsi_mutabaah = VALUES(deskripsi_mutabaah),
                nilai_bpi = VALUES(nilai_bpi), grade_bpi = VALUES(grade_bpi), deskripsi_bpi = VALUES(deskripsi_bpi),
                nilai_literasi = VALUES(nilai_literasi), grade_literasi = VALUES(grade_literasi), deskripsi_literasi = VALUES(deskripsi_literasi),
                nilai_proyek = VALUES(nilai_proyek), grade_proyek = VALUES(grade_proyek), deskripsi_proyek = VALUES(deskripsi_proyek),
                id_judul_proyek = VALUES(id_judul_proyek), updated_at = NOW()`,
            [
                siswaId, kelas_id, semesterId, semester, jenis_penilaian,
                mutabaah_nilai || 0, mutabaah.grade, mutabaah.deskripsi,
                bpi_nilai || 0, bpiGrade.grade, bpiGrade.deskripsi,
                literasi_nilai || 0, literasiGrade.grade, literasiGrade.deskripsi,
                judul_proyek_nilai || 0, proyekGrade.grade, proyekGrade.deskripsi,
                id_judul_proyek
            ]
        );

        res.json({
            success: true,
            message: `Nilai kokurikuler (${jenis_penilaian}) berhasil disimpan`,
            data: {
                mutabaah: { nilai: mutabaah_nilai || 0, grade: mutabaah.grade, deskripsi: mutabaah.deskripsi },
                bpi: { nilai: bpi_nilai || 0, grade: bpiGrade.grade, deskripsi: bpiGrade.deskripsi },
                literasi: { nilai: literasi_nilai || 0, grade: literasiGrade.grade, deskripsi: literasiGrade.deskripsi },
                proyek: { nilai: judul_proyek_nilai || 0, grade: proyekGrade.grade, deskripsi: proyekGrade.deskripsi }
            },
        });
    } catch (err) {
        console.error('Error updateNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai kokurikuler',
        });
    }
};