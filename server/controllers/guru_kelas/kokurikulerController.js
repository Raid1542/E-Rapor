/**
 * Nama File: kokurikulerController.js
 * Fungsi: Controller untuk nilai kokurikuler
 */

const db = require('../../config/db');
const konfigurasiNilaiKokurikulerModel = require('../../models/konfigurasiNilaiKokurikuler');

// Helper: Hitung grade & deskripsi berdasarkan nilai dan ID aspek
const getGradeFromConfig = (configList, nilai, idAspek) => {
    if (nilai === null || nilai === undefined) {
        return { grade: null, deskripsi: null };
    }
    const configForAspek = configList.filter(c => c.id_aspek_kokurikuler === idAspek);
    for (const conf of configForAspek) {
        if (nilai >= conf.rentang_min && nilai <= conf.rentang_max) {
            return {
                grade: conf.grade,
                deskripsi: conf.deskripsi,
            };
        }
    }
    return { grade: null, deskripsi: null };
};

/**
 * GET /kokurikuler
 * Ambil data nilai kokurikuler seluruh siswa di kelas
 */
exports.getNilaiKokurikuler = async (req, res) => {
    try {
        const userId = req.user.id;

        // Ambil ID dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;  // Untuk jadwal: guru_kelas, siswa_kelas
        const semesterId = req.idSemesterAktif;              // Untuk nilai: nilai_kokurikuler, konfigurasi
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        // Validasi middleware variables
        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Query guru_kelas pakai ID INDUK (jadwal tetap sepanjang tahun)
        const [guruKelasRows] = await db.execute(
            `
        SELECT gk.kelas_id, k.nama_kelas
        FROM guru_kelas gk
        JOIN kelas k ON gk.kelas_id = k.id_kelas
        WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?
      `,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda belum ditetapkan sebagai wali kelas pada tahun ajaran ini.',
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Tentukan jenis_penilaian berdasarkan status
        let jenis_penilaian = null;
        if (status_pts === 'aktif') {
            jenis_penilaian = 'PTS';
        } else if (status_pas === 'aktif') {
            jenis_penilaian = 'PAS';
        }

        if (!jenis_penilaian) {
            return res.status(400).json({
                success: false,
                message: 'Periode penilaian tidak aktif'
            });
        }

        // Query nilai_kokurikuler pakai ID SEMESTER (nilai berbeda tiap semester)
        const [rawRows] = await db.execute(
            `
        SELECT
          nk.id_siswa,
          nk.nilai_mutabaah,
          nk.nilai_bpi,
          nk.nilai_literasi,
          nk.nilai_proyek,
          jpt.judul AS nama_judul_proyek
        FROM nilai_kokurikuler nk
        LEFT JOIN judul_proyek_per_tahun_ajaran jpt ON nk.id_judul_proyek = jpt.id_judul_proyek
        WHERE nk.kelas_id = ? AND nk.id_tahun_ajaran_induk = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
      `,
            [kelas_id, semesterId, semester, jenis_penilaian]
        );

        // Query grade config pakai ID SEMESTER (config per semester)
        const [gradeConfig] = await db.execute(
            `
        SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_tahun_ajaran_induk = ? AND semester = ?
        ORDER BY rentang_min DESC
      `,
            [semesterId, semester]
        );

        // Proses mapping grade
        const result = rawRows.map(row => {
            const mutabaah = getGradeFromConfig(gradeConfig, row.nilai_mutabaah, 1);
            const bpi = getGradeFromConfig(gradeConfig, row.nilai_bpi, 3);
            const literasi = getGradeFromConfig(gradeConfig, row.nilai_literasi, 2);
            const proyek = getGradeFromConfig(gradeConfig, row.nilai_proyek, 4);
            return {
                siswa_id: row.id_siswa,
                mutabaah_nilai: row.nilai_mutabaah,
                bpi_nilai: row.nilai_bpi,
                literasi_nilai: row.nilai_literasi,
                judul_proyek_nilai: row.nilai_proyek,
                nama_judul_proyek: row.nama_judul_proyek || '',
                mutabaah_grade: mutabaah.grade,
                bpi_grade: bpi.grade,
                literasi_grade: literasi.grade,
                judul_proyek_grade: proyek.grade,
                mutabaah_deskripsi: mutabaah.deskripsi,
                bpi_deskripsi: bpi.deskripsi,
                literasi_deskripsi: literasi.deskripsi,
                judul_proyek_deskripsi: proyek.deskripsi,
            };
        });

        // Query siswa_kelas pakai ID INDUK (siswa tetap di kelas sepanjang tahun)
        const [siswaRows] = await db.execute(
            `
        SELECT id_siswa, nama_lengkap, nis, nisn
        FROM siswa s
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
        ORDER BY s.nama_lengkap
      `,
            [kelas_id, tahunAjaranIndukId]
        );

        // Bangun siswaMap
        const siswaMap = new Map();
        siswaRows.forEach(s => {
            siswaMap.set(s.id_siswa, {
                id: s.id_siswa,
                nama: s.nama_lengkap,
                nis: s.nis,
                nisn: s.nisn,
                kokurikuler: {
                    mutabaah_nilai: null,
                    mutabaah_grade: null,
                    mutabaah_deskripsi: null,
                    bpi_nilai: null,
                    bpi_grade: null,
                    bpi_deskripsi: null,
                    literasi_nilai: null,
                    literasi_grade: null,
                    literasi_deskripsi: null,
                    judul_proyek_nilai: null,
                    judul_proyek_grade: null,
                    judul_proyek_deskripsi: null,
                    nama_judul_proyek: null,
                },
            });
        });

        // Merge data nilai ke siswaMap
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
        // Ambil ID dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};
        const jenis_penilaian = req.jenis_penilaian;

        // Validasi middleware variables
        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Query guru_kelas pakai ID INDUK
        const [gkRows] = await db.execute(
            `SELECT gk.kelas_id 
       FROM guru_kelas gk
       WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?
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

        // Query nilai_kokurikuler pakai ID SEMESTER
        const [rows] = await db.execute(
            `SELECT nilai_mutabaah, nilai_bpi, nilai_literasi, nilai_proyek, id_judul_proyek
       FROM nilai_kokurikuler
       WHERE id_siswa = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ? 
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
 * Update nilai kokurikuler siswa
 */
exports.updateNilaiKokurikuler = async (req, res) => {
    const { siswaId } = req.params;
    const { mutabaah_nilai, bpi_nilai, literasi_nilai, judul_proyek_nilai, nama_judul_proyek } = req.body;

    try {
        const userId = req.user.id;

        // Ambil ID dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        // Validasi middleware variables
        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Tentukan jenis penilaian berdasarkan status
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

        // Query guru_kelas pakai ID INDUK
        const [gkRows] = await db.execute(
            `
        SELECT gk.kelas_id
        FROM guru_kelas gk
        WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?
        LIMIT 1
      `,
            [userId, tahunAjaranIndukId]
        );

        if (gkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.',
            });
        }
        const { kelas_id } = gkRows[0];

        // Cari atau buat judul proyek pakai ID SEMESTER
        let id_judul_proyek = null;
        if (nama_judul_proyek && nama_judul_proyek.trim() !== '') {
            const judulBersih = nama_judul_proyek.trim();

            // Cek apakah judul sudah ada di semester ini
            const [existing] = await db.execute(
                `SELECT id_judul_proyek FROM judul_proyek_per_tahun_ajaran 
        WHERE id_tahun_ajaran_induk = ? AND judul = ?`,
                [semesterId, judulBersih]
            );

            if (existing.length > 0) {
                id_judul_proyek = existing[0].id_judul_proyek;
            } else {
                // Insert baru jika belum ada
                const [newRow] = await db.execute(
                    `INSERT INTO judul_proyek_per_tahun_ajaran 
          (id_tahun_ajaran_induk, judul, deskripsi, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())`,
                    [semesterId, judulBersih, 'Deskripsi proyek otomatis']
                );
                id_judul_proyek = newRow.insertId;
            }
        }

        // Ambil konfigurasi kategori grade pakai ID SEMESTER
        const [gradeConfig] = await db.execute(
            `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
      FROM kategori_grade_kokurikuler
      WHERE id_tahun_ajaran_induk = ? AND semester = ?
      ORDER BY rentang_min DESC`,
            [semesterId, semester]
        );

        // Hitung grade dan deskripsi untuk SEMUA aspek kokurikuler
        const mutabaah = getGradeFromConfig(gradeConfig, mutabaah_nilai || 0, 1);
        const bpiGrade = getGradeFromConfig(gradeConfig, bpi_nilai || 0, 3);
        const literasiGrade = getGradeFromConfig(gradeConfig, literasi_nilai || 0, 2);
        const proyekGrade = getGradeFromConfig(gradeConfig, judul_proyek_nilai || 0, 4);

        console.log('🔍 DEBUG Simpan Kokurikuler:', {
            mutabaah: { nilai: mutabaah_nilai, grade: mutabaah.grade, deskripsi: mutabaah.deskripsi },
            bpi: { nilai: bpi_nilai, grade: bpiGrade.grade, deskripsi: bpiGrade.deskripsi },
            literasi: { nilai: literasi_nilai, grade: literasiGrade.grade, deskripsi: literasiGrade.deskripsi },
            proyek: { nilai: judul_proyek_nilai, grade: proyekGrade.grade, deskripsi: proyekGrade.deskripsi }
        });

        // Simpan/update nilai_kokurikuler pakai ID SEMESTER
        await db.execute(
            `INSERT INTO nilai_kokurikuler (
        id_siswa, kelas_id, id_tahun_ajaran_induk, semester, jenis_penilaian,
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
                siswaId,
                kelas_id,
                semesterId,
                semester,
                jenis_penilaian,
                mutabaah_nilai || 0, mutabaah.grade, mutabaah.deskripsi,
                bpi_nilai || 0, bpiGrade.grade, bpiGrade.deskripsi,
                literasi_nilai || 0, literasiGrade.grade, literasiGrade.deskripsi,
                judul_proyek_nilai || 0, proyekGrade.grade, proyekGrade.deskripsi,
                id_judul_proyek
            ]
        );

        // Kirim respons dengan SEMUA data
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

module.exports = exports;