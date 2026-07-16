/**
 * Nama File: kokurikulerController.js
 * Fungsi: Controller untuk manajemen nilai kokurikuler siswa (BPI, Proyek, Literasi, Mutaba'ah)
 *         Menangani input nilai, perhitungan grade otomatis, dan manajemen judul proyek
 *         + Import nilai kokurikuler dari Excel
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 * Update: 15 Juli 2026 - Fix: Menghapus panggilan ke model yang tidak ada, menggunakan query langsung
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const kokurikulerModel = require('../../models/guru_kelas/kokurikulerModel');
const proyekModel = require('../../models/guru_kelas/proyekKokurikulerModel');

// Konstanta untuk ID aspek kokurikuler
const ASPEK_ID = {
    BPI: 2,
    PROYEK: 3,
    LITERASI: 4,
    MUTABAAH: 5,
};

// Daftar aspek dengan urutan kolom di Excel
const DAFTAR_ASPEK = [
    { id: ASPEK_ID.MUTABAAH, nama: "Mutaba'ah", kolom: 'nilai_mutabaah', grade: 'grade_mutabaah', deskripsi: 'deskripsi_mutabaah' },
    { id: ASPEK_ID.BPI, nama: 'BPI', kolom: 'nilai_bpi', grade: 'grade_bpi', deskripsi: 'deskripsi_bpi' },
    { id: ASPEK_ID.LITERASI, nama: 'Literasi', kolom: 'nilai_literasi', grade: 'grade_literasi', deskripsi: 'deskripsi_literasi' },
    { id: ASPEK_ID.PROYEK, nama: 'Proyek', kolom: 'nilai_proyek', grade: 'grade_proyek', deskripsi: 'deskripsi_proyek' },
];

// Konstanta untuk pesan error
const ERROR_MESSAGES = {
    KATEGORI_BELUM_DIATUR: 'KATEGORI_BELUM_DIATUR',
    GRADE_TIDAK_DITEMUKAN: 'GRADE_TIDAK_DITEMUKAN',
};

// ✅ FIX: Helper function untuk mengambil tahun ajaran aktif langsung dari DB
const getTahunAjaranAktif = async () => {
    const [rows] = await db.execute(
        `SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas 
         FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
    );
    return rows.length > 0 ? rows[0] : null;
};

// Tentukan jenis penilaian aktif berdasarkan status PTS/PAS
const getJenisPenilaian = (status_pts, status_pas) => {
    if (status_pts === 'aktif') return 'PTS';
    if (status_pas === 'aktif') return 'PAS';
    return null;
};

// Ambil kelas_id dari guru yang sedang login
const getKelasIdByGuru = async (userId, semesterId) => {
    const [rows] = await db.execute(
        'SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ? LIMIT 1',
        [userId, semesterId]
    );
    return rows[0]?.kelas_id || null;
};

// Hitung kesamaan string (Levenshtein Distance)
const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - (matrix[len1][len2] / maxLen);
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPER - Cek apakah kategori grade sudah diatur untuk aspek tertentu
// ═════════════════════════════════════════════════════════════════════════════

const cekKategoriGradeKokurikuler = async (kelasId, semesterId, semester, jenisPenilaian) => {
    try {
        const [aspekRows] = await db.execute(
            'SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler ORDER BY urutan ASC'
        );

        const [kategoriRows] = await db.execute(
            `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
            FROM kategori_grade_kokurikuler 
            WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?
            ORDER BY rentang_min ASC`,
            [kelasId, semesterId, semester, jenisPenilaian]
        );

        const aspekDenganKategori = new Set(
            kategoriRows.map(r => r.id_aspek_kokurikuler)
        );

        const aspekYangDicek = jenisPenilaian === 'PTS'
            ? aspekRows.filter(a => a.id_aspek_kokurikuler === ASPEK_ID.MUTABAAH)
            : aspekRows;

        const aspekTanpaKategori = [];
        const aspekDenganCelah = [];

        aspekYangDicek.forEach(aspek => {
            if (!aspekDenganKategori.has(aspek.id_aspek_kokurikuler)) {
                aspekTanpaKategori.push({
                    id: aspek.id_aspek_kokurikuler,
                    nama: aspek.nama,
                });
            } else {
                const kategoriAspek = kategoriRows.filter(
                    k => k.id_aspek_kokurikuler === aspek.id_aspek_kokurikuler
                );

                const celah = cekCelahRentang(kategoriAspek);
                if (celah.length > 0) {
                    aspekDenganCelah.push({
                        id: aspek.id_aspek_kokurikuler,
                        nama: aspek.nama,
                        celah: celah,
                    });
                }
            }
        });

        return {
            exists: aspekTanpaKategori.length === 0 && aspekDenganCelah.length === 0,
            aspekTanpaKategori: aspekTanpaKategori,
            aspekDenganCelah: aspekDenganCelah,
        };
    } catch (err) {
        console.error('Error cekKategoriGradeKokurikuler:', err);
        return {
            exists: false,
            aspekTanpaKategori: [{ id: 0, nama: 'Error checking' }],
            aspekDenganCelah: []
        };
    }
};

const cekCelahRentang = (kategoriArray) => {
    const celah = [];
    if (kategoriArray.length === 0) {
        return ['0-100'];
    }

    const sorted = [...kategoriArray].sort((a, b) =>
        parseFloat(a.rentang_min) - parseFloat(b.rentang_min)
    );

    const firstMin = parseFloat(sorted[0].rentang_min);
    if (firstMin > 0) {
        celah.push(`0-${Math.floor(firstMin - 1)}`);
    }

    for (let i = 0; i < sorted.length - 1; i++) {
        const currentMax = parseFloat(sorted[i].rentang_max);
        const nextMin = parseFloat(sorted[i + 1].rentang_min);

        if (currentMax + 1 < nextMin) {
            celah.push(`${Math.floor(currentMax + 1)}-${Math.floor(nextMin - 1)}`);
        }
    }

    const lastMax = parseFloat(sorted[sorted.length - 1].rentang_max);
    if (lastMax < 100) {
        celah.push(`${Math.floor(lastMax + 1)}-100`);
    }

    return celah;
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET NILAI KOKURIKULER (SEMUA SISWA)
// ═════════════════════════════════════════════════════════════════════════════

exports.getNilaiKokurikuler = async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const idInduk = taAktif.id_tahun_ajaran_induk;
        const semester = taAktif.semester;
        const jenis_penilaian = getJenisPenilaian(taAktif.status_pts, taAktif.status_pas);

        const kelas_id = await getKelasIdByGuru(userId, semesterId);
        if (!kelas_id) {
            return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        const [kelasInfo] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelas_id]);
        const kelasNama = kelasInfo[0]?.nama_kelas || 'Kelas Anda';

        const siswaRows = await kokurikulerModel.getSiswaByKelas(kelas_id, idInduk);
        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                data: [],
                kelas: kelasNama,
                semester,
                tahunAjaranId: semesterId,
                message: 'Tidak ada siswa di kelas ini',
            });
        }

        const nilaiRows = await kokurikulerModel.getNilaiByKelas(kelas_id, semesterId, semester, jenis_penilaian);

        const [gradeConfigRows] = await db.execute(
            `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
            FROM kategori_grade_kokurikuler
            WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [kelas_id, semesterId, semester, jenis_penilaian]
        );

        const findGradeByNilai = (aspekId, nilai) => {
            if (nilai === null || nilai === undefined) return { grade: null, deskripsi: null };
            const config = gradeConfigRows.find(c =>
                c.id_aspek_kokurikuler === aspekId &&
                nilai >= parseFloat(c.rentang_min) &&
                nilai <= parseFloat(c.rentang_max)
            );
            return config ? { grade: config.grade, deskripsi: config.deskripsi } : { grade: null, deskripsi: null };
        };

        const nilaiBySiswa = {};
        nilaiRows.forEach(row => {
            if (!nilaiBySiswa[row.id_siswa]) nilaiBySiswa[row.id_siswa] = {};

            let grade = row.grade;
            let deskripsi = row.deskripsi;

            if ((!grade || !deskripsi) && row.nilai !== null) {
                const calculated = findGradeByNilai(row.id_aspek_kokurikuler, row.nilai);
                grade = calculated.grade;
                deskripsi = calculated.deskripsi;
            }

            nilaiBySiswa[row.id_siswa][row.id_aspek_kokurikuler] = {
                nilai: row.nilai,
                grade,
                deskripsi,
                id_judul_proyek: row.id_judul_proyek,
            };
        });

        const result = siswaRows.map(siswa => ({
            id: siswa.id_siswa,
            nama: siswa.nama_lengkap,
            nis: siswa.nis,
            nisn: siswa.nisn,
            nilai: nilaiBySiswa[siswa.id_siswa] || {},
        }));

        res.json({
            success: true,
            data: result,
            kelas: kelasNama,
            semester,
            jenis_penilaian,
            tahunAjaranId: semesterId,
        });
    } catch (error) {
        console.error('Error getNilaiKokurikuler:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET NILAI KOKURIKULER BY SISWA
// ═════════════════════════════════════════════════════════════════════════════

exports.getNilaiKokurikulerBySiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const semester = taAktif.semester;
        const jenis_penilaian = getJenisPenilaian(taAktif.status_pts, taAktif.status_pas);

        const kelas_id = await getKelasIdByGuru(userId, semesterId);
        if (!kelas_id) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }

        const rows = await kokurikulerModel.getNilaiBySiswa(
            siswaId,
            kelas_id,
            semesterId,
            semester,
            jenis_penilaian
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error getNilaiKokurikulerBySiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data kokurikuler.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPDATE NILAI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

exports.updateNilaiKokurikuler = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { aspek_id, nilai, grade, deskripsi, id_judul_proyek } = req.body;

        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const idInduk = taAktif.id_tahun_ajaran_induk;
        const semester = taAktif.semester;
        const status_pts = taAktif.status_pts;
        const status_pas = taAktif.status_pas;

        if (!aspek_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'aspek_id dan nilai wajib diisi' });
        }
        if (typeof nilai !== 'number' || isNaN(nilai) || !Number.isInteger(nilai)) {
            return res.status(400).json({ success: false, message: 'Nilai harus berupa bilangan bulat' });
        }
        if (nilai < 0 || nilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }

        const [aspekCheck] = await db.execute(
            `SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE id_aspek_kokurikuler = ?`,
            [aspek_id]
        );
        if (aspekCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Aspek kokurikuler tidak valid' });
        }

        const jenis_penilaian = getJenisPenilaian(status_pts, status_pas);
        if (!jenis_penilaian) {
            return res.status(403).json({ success: false, message: 'Periode penilaian belum aktif.' });
        }

        if (jenis_penilaian === 'PTS' && aspek_id !== ASPEK_ID.MUTABAAH) {
            return res.status(403).json({
                success: false,
                message: 'Saat PTS aktif, hanya aspek Mutaba\'ah yang dapat diisi.',
            });
        }

        const kelas_id = await getKelasIdByGuru(userId, semesterId);
        if (!kelas_id) {
            return res.status(403).json({ success: false, message: 'Anda belum ditugaskan sebagai wali kelas' });
        }

        const [siswaCheck] = await db.execute(
            `SELECT s.id_siswa FROM siswa s 
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
            WHERE s.id_siswa = ? AND sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?`,
            [siswaId, kelas_id, idInduk]
        );
        if (siswaCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Siswa tidak ditemukan di kelas Anda' });
        }

        const kategoriCheck = await cekKategoriGradeKokurikuler(
            kelas_id,
            semesterId,
            semester,
            jenis_penilaian
        );

        if (!kategoriCheck.exists) {
            return res.status(400).json({
                success: false,
                message:
                    `Kategori Penilaian Belum Diatur\n\n` +
                    `Aspek berikut belum memiliki konfigurasi grade untuk periode ${jenis_penilaian}:\n` +
                    `${kategoriCheck.aspekTanpaKategori.map(n => `- ${n.nama}`).join('\n')}\n\n` +
                    `Solusi:\n` +
                    `1. Buka menu "Atur Penilaian" > "Kategori Kokurikuler"\n` +
                    `2. Pilih aspek yang belum diatur\n` +
                    `3. Atur rentang nilai dan grade (minimal 1 kategori)\n` +
                    `4. Setelah selesai, Anda dapat menginput nilai siswa`,
                code: ERROR_MESSAGES.KATEGORI_BELUM_DIATUR,
                data: {
                    aspek_tanpa_kategori: kategoriCheck.aspekTanpaKategori,
                    jenis_penilaian,
                },
            });
        }

        let finalGrade = grade;
        let finalDeskripsi = deskripsi;

        if ((!finalGrade || !finalDeskripsi) && nilai !== null) {
            const [gradeConfig] = await db.execute(
                `SELECT grade, deskripsi FROM kategori_grade_kokurikuler
                WHERE id_aspek_kokurikuler = ? AND kelas_id = ? AND tahun_ajaran_id = ? 
                AND semester = ? AND jenis_penilaian = ? AND ? >= rentang_min AND ? <= rentang_max 
                LIMIT 1`,
                [aspek_id, kelas_id, semesterId, semester, jenis_penilaian, nilai, nilai]
            );

            if (gradeConfig.length > 0) {
                finalGrade = gradeConfig[0].grade;
                finalDeskripsi = gradeConfig[0].deskripsi;
            } else {
                return res.status(400).json({
                    success: false,
                    message:
                        `Konfigurasi Grade Tidak Lengkap\n\n` +
                        `Nilai ${nilai} tidak masuk dalam rentang kategori grade yang telah diatur.\n\n` +
                        `Solusi:\n` +
                        `1. Periksa kembali rentang nilai di "Kategori Kokurikuler"\n` +
                        `2. Pastikan rentang mencakup semua kemungkinan nilai (0-100)\n` +
                        `3. Tambahkan kategori grade jika diperlukan`,
                    code: ERROR_MESSAGES.GRADE_TIDAK_DITEMUKAN,
                });
            }
        }

        const existing = await kokurikulerModel.checkExistingNilai(
            siswaId,
            aspek_id,
            kelas_id,
            semesterId,
            semester,
            jenis_penilaian
        );

        if (existing) {
            await kokurikulerModel.updateNilai(
                existing.id_nilai_kokurikuler,
                nilai,
                finalGrade,
                finalDeskripsi,
                id_judul_proyek || null
            );
        } else {
            await kokurikulerModel.insertNilai(
                siswaId,
                aspek_id,
                kelas_id,
                semesterId,
                semester,
                jenis_penilaian,
                nilai,
                finalGrade,
                finalDeskripsi,
                id_judul_proyek || null
            );
        }

        res.json({
            success: true,
            message: 'Nilai berhasil disimpan',
            data: {
                id_siswa: parseInt(siswaId),
                aspek_id,
                nilai,
                grade: finalGrade,
                deskripsi: finalDeskripsi,
                jenis_penilaian,
            },
        });
    } catch (err) {
        console.error('Error updateNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. GET JUDUL PROYEK (P5)
// ═════════════════════════════════════════════════════════════════════════════

exports.getJudulProyek = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const kelasId = await getKelasIdByGuru(userId, taAktif.id_tahun_ajaran);
        if (!kelasId) return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });

        const proyek = await proyekModel.getJudulProyekByKelas(kelasId, taAktif.id_tahun_ajaran);
        res.json({ success: true, data: proyek || { id_judul_proyek: null, judul: '' } });
    } catch (err) {
        console.error('Error getJudulProyek:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil judul proyek: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. SAVE JUDUL PROYEK (P5)
// ═════════════════════════════════════════════════════════════════════════════

exports.saveJudulProyek = async (req, res) => {
    try {
        const { judul } = req.body;
        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const status_pas = taAktif.status_pas;

        if (status_pas !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Judul proyek hanya dapat diatur saat periode PAS aktif.',
            });
        }

        const kelasId = await getKelasIdByGuru(userId, taAktif.id_tahun_ajaran);
        if (!kelasId) return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });

        if (!judul || typeof judul !== 'string' || judul.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Judul proyek tidak boleh kosong' });
        }
        if (judul.trim().length > 255) {
            return res.status(400).json({ success: false, message: 'Judul proyek maksimal 255 karakter' });
        }

        const result = await proyekModel.saveJudulProyek(kelasId, taAktif.id_tahun_ajaran, judul.trim());

        res.json({
            success: true,
            message: result.action === 'created' ? 'Judul proyek berhasil disimpan' : 'Judul proyek berhasil diperbarui',
            data: result,
        });
    } catch (err) {
        console.error('Error saveJudulProyek:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Judul proyek sudah ada untuk kelas ini' });
        }
        res.status(500).json({ success: false, message: 'Gagal menyimpan judul proyek: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. DOWNLOAD TEMPLATE IMPORT NILAI KOKURIKULER (DINAMIS + PRE-FILL)
// ═════════════════════════════════════════════════════════════════════════════

exports.downloadTemplateKokurikuler = async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const indukId = taAktif.id_tahun_ajaran_induk;
        const semester = taAktif.semester;
        const status_pts = taAktif.status_pts;
        const status_pas = taAktif.status_pas;

        const jenis_penilaian = getJenisPenilaian(status_pts, status_pas);
        if (!jenis_penilaian) {
            return res.status(403).json({ success: false, message: 'Periode penilaian belum aktif' });
        }

        const kelasId = await getKelasIdByGuru(userId, semesterId);
        if (!kelasId) {
            return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        const [kelasInfo] = await db.execute('SELECT nama_kelas FROM kelas WHERE id_kelas = ?', [kelasId]);
        const kelasNama = kelasInfo[0]?.nama_kelas || 'Kelas';

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
            ORDER BY s.nama_lengkap ASC`,
            [kelasId, indukId]
        );

        // ✅ PERBAIKAN 1: Ambil data nilai yang sudah ada untuk di-pre-fill ke template
        const [nilaiRows] = await db.execute(
            `SELECT id_siswa, id_aspek_kokurikuler, nilai 
            FROM nilai_kokurikuler 
            WHERE id_kelas = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?`,
            [kelasId, semesterId, semester, jenis_penilaian]
        );

        const nilaiMap = {};
        nilaiRows.forEach(row => {
            if (!nilaiMap[row.id_siswa]) nilaiMap[row.id_siswa] = {};
            nilaiMap[row.id_siswa][row.id_aspek_kokurikuler] = row.nilai;
        });

        // ✅ PERBAIKAN 2: Filter aspek berdasarkan periode (PTS = hanya Mutaba'ah, PAS = semua)
        const aspekUntukTemplate = DAFTAR_ASPEK.filter(asp => {
            if (jenis_penilaian === 'PTS') {
                return asp.id === ASPEK_ID.MUTABAAH;
            }
            return true; // PAS menampilkan semua aspek
        });

        const kolomAspek = aspekUntukTemplate.map(asp => ({
            nama: asp.nama,
            id: asp.id,
            color: asp.id === ASPEK_ID.MUTABAAH ? 'FFE8690A' :
                   asp.id === ASPEK_ID.BPI ? 'FF4A90E2' :
                   asp.id === ASPEK_ID.LITERASI ? 'FF50C878' : 'FF9B59B6',
        }));

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Template Kokurikuler');

        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;

        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa'];
        kolomAspek.forEach(asp => headers.push(asp.nama));

        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            };

            if (colIdx < 4) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
            } else {
                const aspekIdx = colIdx - 4;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kolomAspek[aspekIdx].color } };
            }
        });

        siswaRows.forEach((siswa, index) => {
            const rowNum = 2 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 22;

            const isEvenRow = index % 2 === 0;

            const identitasData = [index + 1, siswa.nis || '', siswa.nisn || '', siswa.nama_lengkap || ''];
            identitasData.forEach((val, colIdx) => {
                const cell = dataRow.getCell(colIdx + 1);
                cell.value = val;
                cell.font = { name: 'Calibri', size: 11, bold: colIdx === 3 };
                cell.alignment = { vertical: 'middle', horizontal: colIdx === 3 ? 'left' : 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' },
                };
            });

            // ✅ PERBAIKAN 3: Pre-fill nilai yang sudah ada dari database
            kolomAspek.forEach((aspek, aspekIdx) => {
                const colIdx = 5 + aspekIdx;
                const cell = dataRow.getCell(colIdx);
                
                // Isi dengan nilai existing jika ada, jika tidak biarkan kosong
                const existingNilai = nilaiMap[siswa.id_siswa]?.[aspek.id];
                cell.value = existingNilai !== undefined ? existingNilai : '';
                
                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' },
                };

                cell.dataValidation = {
                    type: 'whole',
                    operator: 'between',
                    formulae: [0, 100],
                    showErrorMessage: true,
                    errorTitle: 'Nilai Tidak Valid',
                    error: 'Nilai harus berupa angka bulat antara 0 sampai 100',
                    showInputMessage: true,
                    promptTitle: 'Input Nilai',
                    prompt: 'Masukkan nilai 0-100. Biarkan kosong jika tidak ada perubahan.',
                };
            });
        });

        if (siswaRows.length === 0) {
            // ✅ PERBAIKAN 4: Dynamic merge cell berdasarkan jumlah kolom aspek
            const lastCol = String.fromCharCode(65 + 3 + kolomAspek.length);
            worksheet.mergeCells(`A2:${lastCol}2`);
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        }

        // ✅ PERBAIKAN 5: Dynamic column widths
        worksheet.columns = [
            { width: 6 },
            { width: 15 },
            { width: 15 },
            { width: 30 },
            ...kolomAspek.map(() => ({ width: 14 }))
        ];

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Kokurikuler_${kelasNama.replace(/[^a-z0-9]/gi, '_')}_${jenis_penilaian}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        console.error('Error downloadTemplateKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message,
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. IMPORT NILAI KOKURIKULER DARI EXCEL
// ═════════════════════════════════════════════════════════════════════════════

exports.importNilaiKokurikuler = async (req, res) => {
    const connection = await db.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diupload' });
        }

        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const indukId = taAktif.id_tahun_ajaran_induk;
        const semester = taAktif.semester;
        const status_pts = taAktif.status_pts;
        const status_pas = taAktif.status_pas;

        const jenis_penilaian = getJenisPenilaian(status_pts, status_pas);
        if (!jenis_penilaian) {
            return res.status(403).json({ success: false, message: 'Periode penilaian belum aktif' });
        }

        const kelasId = await getKelasIdByGuru(userId, semesterId);
        if (!kelasId) {
            return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        const kategoriCheck = await cekKategoriGradeKokurikuler(
            kelasId,
            semesterId,
            semester,
            jenis_penilaian
        );

        if (!kategoriCheck.exists) {
            return res.status(400).json({
                success: false,
                message:
                    `Kategori Penilaian Belum Diatur\n\n` +
                    `Aspek berikut belum memiliki konfigurasi grade untuk periode ${jenis_penilaian}:\n` +
                    `${kategoriCheck.aspekTanpaKategori.map(n => `- ${n.nama}`).join('\n')}\n\n` +
                    `Solusi:\n` +
                    `1. Buka menu "Atur Penilaian" > "Kategori Kokurikuler"\n` +
                    `2. Pilih aspek yang belum diatur\n` +
                    `3. Atur rentang nilai dan grade (minimal 1 kategori)\n` +
                    `4. Setelah selesai, Anda dapat import nilai dari Excel`,
                code: ERROR_MESSAGES.KATEGORI_BELUM_DIATUR,
                data: {
                    aspek_tanpa_kategori: kategoriCheck.aspekTanpaKategori,
                    jenis_penilaian,
                },
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'File Excel tidak valid. Minimal harus ada header dan 1 baris data.',
            });
        }

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i].map(c => String(c).trim().toLowerCase());
            if (row.includes('nis') && row.some(c => c.includes('nama'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".',
            });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;

        const requiredColumns = ['NIS', 'Nama Siswa'];
        const missingColumns = requiredColumns.filter(col =>
            !headers.some(h => h.toLowerCase() === col.toLowerCase())
        );

        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`,
            });
        }

        const findColIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');

        const aspekKolomMap = DAFTAR_ASPEK.map(asp => ({
            ...asp,
            idx: findColIndex(asp.nama),
        }));

        // Filter Aspek yang Boleh Diimport (PTS = hanya Mutaba'ah, PAS = semua)
        const aspekBolehImport = aspekKolomMap.filter(asp => {
            if (asp.idx < 0) return false;
            if (jenis_penilaian === 'PTS') {
                return asp.id === ASPEK_ID.MUTABAAH;
            }
            return true;
        });

        const aspekDilarangImport = aspekKolomMap.filter(asp => {
            if (asp.idx < 0) return false;
            return !aspekBolehImport.find(allowed => allowed.id === asp.id);
        });

        if (aspekBolehImport.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak ada kolom aspek yang valid untuk periode ${jenis_penilaian}.`,
            });
        }

        let adaBarisDataValid = false;
        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (row && row.length > 0 && row.some(cell => String(cell).trim() !== '')) {
                adaBarisDataValid = true;
                break;
            }
        }

        if (!adaBarisDataValid) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel kosong - tidak ada data sama sekali.\n\n` +
                    `File hanya berisi header tanpa baris data siswa.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Pastikan ada baris data siswa\n` +
                    `3. Isi nilai pada kolom aspek kokurikuler\n` +
                    `4. Upload kembali file yang sudah diisi`,
                data: {
                    total_baris: 0,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: 0,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel kosong. Tidak ada baris data siswa.' }],
                    periode_aktif: jenis_penilaian,
                },
            });
        }

        let adaDataSiswa = false;
        let barisDenganDataSiswa = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const nama = String(row[idxNama] || '').trim();

            if (nis || nama) {
                adaDataSiswa = true;
                barisDenganDataSiswa++;
            }
        }

        if (!adaDataSiswa) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel tidak valid - tidak ada data siswa.\n\n` +
                    `File berisi baris kosong tanpa data NIS atau Nama Siswa.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Pastikan kolom NIS dan Nama Siswa terisi\n` +
                    `3. Isi nilai pada kolom aspek kokurikuler\n` +
                    `4. Upload kembali file yang sudah diisi`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.' }],
                    periode_aktif: jenis_penilaian,
                },
            });
        }

        let adaNilaiDiFile = false;
        let barisDenganNilai = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            let barisIniPunyaNilai = false;

            for (const asp of aspekKolomMap) {
                if (asp.idx < 0) continue;

                const nilaiStr = String(row[asp.idx] || '').trim();

                if (nilaiStr && nilaiStr !== '-' && nilaiStr !== '' && nilaiStr !== 'Terkunci') {
                    adaNilaiDiFile = true;
                    barisIniPunyaNilai = true;
                }
            }

            if (barisIniPunyaNilai) barisDenganNilai++;
        }

        if (!adaNilaiDiFile) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel tidak valid - tidak ada nilai yang diisi.\n\n` +
                    `File hanya berisi data identitas siswa (Nama, NIS, NISN) tanpa nilai aspek kokurikuler.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Isi kolom aspek kokurikuler (${aspekBolehImport.map(a => a.nama).join(', ')}) dengan angka 0-100\n` +
                    `3. Upload kembali file yang sudah diisi\n\n` +
                    `Periode aktif: ${jenis_penilaian}`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel tidak berisi nilai. Hanya data identitas siswa yang terdeteksi.' }],
                    periode_aktif: jenis_penilaian,
                },
            });
        }

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`,
            [kelasId, indukId]
        );

        const siswaMapByNIS = {};
        siswaRows.forEach(s => {
            if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s;
        });

        const [gradeConfigRows] = await db.execute(
            `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
            FROM kategori_grade_kokurikuler
            WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [kelasId, semesterId, semester, jenis_penilaian]
        );

        const findGradeByNilai = (aspekId, nilai) => {
            if (nilai === null || nilai === undefined) return { grade: null, deskripsi: null };
            const config = gradeConfigRows.find(c =>
                c.id_aspek_kokurikuler === aspekId &&
                nilai >= parseFloat(c.rentang_min) &&
                nilai <= parseFloat(c.rentang_max)
            );
            return config ? { grade: config.grade, deskripsi: config.deskripsi } : { grade: null, deskripsi: null };
        };

        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;

        const nisDiproses = new Set();
        const nisDuplikat = [];
        const nisnDiproses = new Set();
        const nisnDuplikat = [];

        let kolomDiabaikanCount = 0;
        const kolomDiabaikanSet = new Set();

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const namaSiswa = String(row[idxNama] || '').trim();

            if (!nis) {
                if (namaSiswa) {
                    warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS kosong untuk "${namaSiswa}"` });
                }
                skippedCount++;
                continue;
            }

            if (nisDiproses.has(nis)) {
                nisDuplikat.push({ row: i + 1, nis, nama: namaSiswa });
                warnings.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: NIS "${nis}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.`,
                });
                skippedCount++;
                continue;
            }
            nisDiproses.add(nis);

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                if (nisnExcel) {
                    if (nisnDiproses.has(nisnExcel)) {
                        nisnDuplikat.push({ row: i + 1, nisn: nisnExcel, nama: namaSiswa });
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: NISN "${nisnExcel}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.`,
                        });
                        skippedCount++;
                        continue;
                    }
                    nisnDiproses.add(nisnExcel);
                }
            }

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini`,
                });
                skippedCount++;
                continue;
            }

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"`,
                    });
                    skippedCount++;
                    continue;
                }
            }

            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < 0.7) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"`,
                        });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.`,
                        });
                    }
                }
            }

            if (jenis_penilaian === 'PTS' && aspekDilarangImport.length > 0) {
                for (const aspek of aspekDilarangImport) {
                    const nilaiStr = String(row[aspek.idx] || '').trim();
                    if (nilaiStr && nilaiStr !== 'Terkunci' && nilaiStr !== '-' && nilaiStr !== '') {
                        kolomDiabaikanCount++;
                        kolomDiabaikanSet.add(aspek.nama);
                    }
                }
            }

            const nilaiAspek = {};
            let rowSavedCount = 0;

            for (const aspek of aspekBolehImport) {
                const nilaiStr = String(row[aspek.idx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-' || nilaiStr === 'Terkunci') continue;

                const nilai = parseFloat(nilaiStr);
                if (isNaN(nilai)) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${aspek.nama}": "${nilaiStr}" bukan angka`,
                    });
                    continue;
                }

                if (!Number.isInteger(nilai)) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${aspek.nama}": Nilai harus bilangan bulat`,
                    });
                    continue;
                }

                if (nilai < 0 || nilai > 100) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${aspek.nama}": Nilai ${nilai} di luar rentang 0-100`,
                    });
                    continue;
                }

                const { grade, deskripsi } = findGradeByNilai(aspek.id, nilai);

                nilaiAspek[aspek.id] = { nilai, grade, deskripsi };
                rowSavedCount++;
                totalNilaiDisimpan++;
            }

            if (rowSavedCount > 0) {
                for (const [aspekId, dataAspek] of Object.entries(nilaiAspek)) {
                    const aspekIdNum = parseInt(aspekId);

                    const existing = await kokurikulerModel.checkExistingNilai(
                        siswa.id_siswa,
                        aspekIdNum,
                        kelasId,
                        semesterId,
                        semester,
                        jenis_penilaian
                    );

                    if (existing) {
                        await kokurikulerModel.updateNilai(
                            existing.id_nilai_kokurikuler,
                            dataAspek.nilai,
                            dataAspek.grade,
                            dataAspek.deskripsi,
                            null
                        );
                    } else {
                        await kokurikulerModel.insertNilai(
                            siswa.id_siswa,
                            aspekIdNum,
                            kelasId,
                            semesterId,
                            semester,
                            jenis_penilaian,
                            dataAspek.nilai,
                            dataAspek.grade,
                            dataAspek.deskripsi,
                            null
                        );
                    }
                }

                successCount++;
            } else {
                skippedCount++;
            }
        }

        await connection.commit();

        let message = '';
        let success = true;

        if (successCount > 0) {
            message = `Import berhasil! ${successCount} siswa berhasil diimport dengan ${totalNilaiDisimpan} nilai disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport.';
        }

        if (jenis_penilaian === 'PTS' && kolomDiabaikanCount > 0) {
            const namaKolom = Array.from(kolomDiabaikanSet).join(', ');
            warnings.unshift({
                row: 0,
                message:
                    `PERHATIAN: Kolom [${namaKolom}] DIABAIKAN karena periode PTS sedang aktif. ` +
                    `Hanya kolom Mutaba'ah yang diimport. Silakan input kolom lain saat periode PAS aktif.`,
            });
        }

        if (errors.length > 0) {
            message += `\n\nAda ${errors.length} error yang perlu diperbaiki.`;
        }

        if (nisDuplikat.length > 0) {
            const duplikatInfo = nisDuplikat.map(d => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`).join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisDuplikat.length} NIS DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });
            message += `\n\nPERHATIAN: ${nisDuplikat.length} NIS duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        if (nisnDuplikat.length > 0) {
            const duplikatInfo = nisnDuplikat.map(d => `Baris ${d.row} (NISN: ${d.nisn}, ${d.nama})`).join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisnDuplikat.length} NISN DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });
            message += `\n\nPERHATIAN: ${nisnDuplikat.length} NISN duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        message += `\nINFO: Pastikan setiap siswa memiliki NIS dan NISN yang unik di file Excel.`;

        if (jenis_penilaian === 'PTS' && kolomDiabaikanCount > 0) {
            message += `\n\nINFO: Kolom [${Array.from(kolomDiabaikanSet).join(', ')}] tidak diimport karena hanya Mutaba'ah yang aktif saat PTS.`;
        }

        res.json({
            success: success,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_nilai_disimpan: totalNilaiDisimpan,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings.slice(0, 10) : null,
                periode_aktif: jenis_penilaian,
                aspek_diimport: aspekBolehImport.map(a => a.nama),
                aspek_diabaikan: jenis_penilaian === 'PTS' ? aspekDilarangImport.map(a => a.nama) : [],
                kolom_diabaikan_count: kolomDiabaikanCount,
                baris_dengan_nilai: barisDenganNilai,
                baris_dengan_data_siswa: barisDenganDataSiswa,
                nis_duplikat_count: nisDuplikat.length,
                nis_duplikat_detail: nisDuplikat,
                nisn_duplikat_count: nisnDuplikat.length,
                nisn_duplikat_detail: nisnDuplikat,
                pesan_penting: (nisDuplikat.length > 0 || nisnDuplikat.length > 0)
                    ? `${nisDuplikat.length + nisnDuplikat.length} duplikasi ditemukan. Hanya data pertama yang diproses.`
                    : jenis_penilaian === 'PTS' && kolomDiabaikanCount > 0
                        ? `Hanya Mutaba'ah yang diimport. Kolom lain diabaikan.`
                        : null,
            },
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error importNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport nilai: ' + err.message,
        });
    } finally {
        connection.release();
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 8. CEK STATUS KATEGORI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

exports.cekStatusKategoriKokurikuler = async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ FIX: Gunakan helper function
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const semester = taAktif.semester;
        const jenis_penilaian = getJenisPenilaian(taAktif.status_pts, taAktif.status_pas);

        if (!jenis_penilaian) {
            return res.json({
                success: true,
                data: {
                    configured: false,
                    aspek_tanpa_kategori: [],
                    aspek_dengan_celah: [],
                    jenis_penilaian: null,
                    message: 'Periode penilaian belum aktif',
                },
            });
        }

        const kelas_id = await getKelasIdByGuru(userId, semesterId);
        if (!kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Kelas tidak ditemukan',
            });
        }

        const kategoriCheck = await cekKategoriGradeKokurikuler(
            kelas_id,
            semesterId,
            semester,
            jenis_penilaian
        );

        let message = '';
        if (kategoriCheck.exists) {
            message = 'Semua kategori sudah diatur dengan lengkap';
        } else {
            const totalMasalah = kategoriCheck.aspekTanpaKategori.length + (kategoriCheck.aspekDenganCelah ? kategoriCheck.aspekDenganCelah.length : 0);
            message = `Ditemukan ${totalMasalah} masalah pada kategori grade`;
        }

        res.json({
            success: true,
            data: {
                configured: kategoriCheck.exists,
                aspek_tanpa_kategori: kategoriCheck.aspekTanpaKategori,
                aspek_dengan_celah: kategoriCheck.aspekDenganCelah || [],
                jenis_penilaian,
                semester,
                message: message,
            },
        });
    } catch (err) {
        console.error('Error cekStatusKategoriKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengecek status kategori: ' + err.message,
        });
    }
};