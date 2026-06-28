/**
 * Nama File: catatanWaliController.js
 * Fungsi: Controller untuk manajemen catatan wali kelas per siswa.
 *         Menangani pengambilan dan penyimpanan catatan wali kelas dengan
 *         validasi periode penilaian, sanitasi input, dan keputusan naik tingkat.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Sanitasi input untuk mencegah XSS (Cross-Site Scripting).
 * Mengkonversi karakter HTML berbahaya menjadi entity.
 * 
 * @param {string} text - Input text yang akan disanitasi
 * @returns {string} Text yang sudah disanitasi
 */
const sanitizeInput = (text) => {
    if (!text) return '';
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET CATATAN WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/catatan-wali-kelas/:jenis/:semester
 * Ambil catatan wali kelas untuk semua siswa di kelas guru.
 * 
 * Response includes:
 *   - Data siswa (id, nama, nis, nisn, jenis_kelamin)
 *   - Catatan wali kelas (kosong jika belum diisi)
 *   - Status naik tingkat (untuk PAS Genap)
 * 
 * @param {string} req.penilaianContext.semester - Nama semester
 * @param {string} req.penilaianContext.jenis - Jenis penilaian (PTS/PAS)
 * @param {number} req.idSemesterAktif - ID semester aktif (dari middleware)
 * @param {number} req.idTahunAjaranInduk - ID tahun ajaran induk (dari middleware)
 */
exports.getCatatanWaliKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        // Validasi data dari middleware
        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data tahun ajaran atau semester tidak ditemukan' 
            });
        }

        // Step 1: Ambil kelas guru (pakai semesterId)
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
                FROM guru_kelas gk
                JOIN kelas k ON gk.kelas_id = k.id_kelas
                WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kelas aktif tidak ditemukan.' 
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Step 2: Ambil semua siswa di kelas + LEFT JOIN catatan
        const [data] = await db.execute(
            `SELECT 
                s.id_siswa, 
                s.nama_lengkap AS nama, 
                s.nis,
                s.nisn,
                s.jenis_kelamin,
                COALESCE(c.catatan_wali_kelas, '') AS catatan_wali_kelas,
                c.naik_tingkat
                FROM siswa s
                JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
                LEFT JOIN catatan_wali_kelas c 
                    ON s.id_siswa = c.siswa_id 
                    AND c.tahun_ajaran_id = ? 
                    AND c.semester = ? 
                    AND c.jenis_penilaian = ?
                WHERE sk.kelas_id = ? 
                    AND sk.id_tahun_ajaran_induk = ?
                ORDER BY s.nama_lengkap`,
            [semesterId, semester, jenis_penilaian, kelas_id, tahunAjaranIndukId]
        );

        res.json({ 
            success: true, 
            data, 
            kelas: nama_kelas, 
            semester,
            jenis_penilaian
        });
    } catch (err) {
        console.error('Error getCatatanWaliKelas:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data catatan' 
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPDATE CATATAN WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-kelas/catatan-wali-kelas/:siswa_id/:jenis/:semester
 * Simpan atau update catatan wali kelas untuk siswa tertentu.
 * 
 * Validasi:
 *   - ID siswa harus valid
 *   - Catatan wajib diisi (minimal 20 karakter)
 *   - Siswa harus terdaftar di kelas guru
 *   - Periode penilaian harus aktif (tidak dikunci)
 *   - Untuk PAS Genap: keputusan naik tingkat wajib diisi
 * 
 * Business Rules:
 *   - Sanitasi input untuk mencegah XSS
 *   - Gunakan semesterId (bukan tahunAjaranIndukId) untuk query guru_kelas
 *   - UPSERT pattern (INSERT ... ON DUPLICATE KEY UPDATE)
 *   - Naik tingkat hanya untuk PAS Genap
 * 
 * @param {string} req.params.siswa_id - ID siswa
 * @param {string} req.body.catatan_wali_kelas - Catatan wali kelas (min 20 karakter)
 * @param {string} req.body.naik_tingkat - Keputusan naik tingkat ('ya'/'tidak', hanya PAS Genap)
 */
exports.updateCatatanWaliKelas = async (req, res) => {
    try {
        const siswa_id = parseInt(req.params.siswa_id);
        const { catatan_wali_kelas, naik_tingkat } = req.body;
        const userId = req.user.id;

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: reqJenis } = req.penilaianContext || {};
        const { status_pts, status_pas } = req.tahunAjaranAktif || {};

        // Validasi ID siswa
        if (isNaN(siswa_id) || siswa_id <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID siswa tidak valid' 
            });
        }

        // Validasi data dari middleware
        if (!tahunAjaranIndukId || !semesterId || !semester || !reqJenis) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data tahun ajaran atau semester tidak ditemukan' 
            });
        }

        // Validasi jenis penilaian
        if (!['PTS', 'PAS'].includes(reqJenis)) {
            return res.status(400).json({ 
                success: false,
                message: 'Jenis penilaian harus PTS atau PAS' 
            });
        }

        // Validasi catatan wajib diisi
        const trimmedCatatan = catatan_wali_kelas?.trim() || '';
        if (!trimmedCatatan) {
            return res.status(400).json({ 
                success: false, 
                message: 'Catatan wali kelas wajib diisi' 
            });
        }

        // Validasi minimal 20 karakter
        if (trimmedCatatan.length < 20) {
            return res.status(400).json({ 
                success: false, 
                message: `Catatan wali kelas minimal 20 karakter (saat ini ${trimmedCatatan.length} karakter)` 
            });
        }

        // Sanitasi input untuk mencegah XSS
        const sanitizedCatatan = sanitizeInput(trimmedCatatan);

        // Cek apakah periode dikunci
        let periode_dikunci = false;
        if (reqJenis === 'PTS' && status_pts !== 'aktif') periode_dikunci = true;
        else if (reqJenis === 'PAS' && status_pas !== 'aktif') periode_dikunci = true;

        if (periode_dikunci) {
            return res.status(403).json({
                success: false,
                message: `Rapor ${reqJenis} sudah dikunci. Catatan wali kelas tidak dapat diubah.`,
            });
        }

        // Ambil kelas guru (pakai semesterId)
        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kelas aktif tidak ditemukan.' 
            });
        }

        const { kelas_id } = guruKelasRows[0];

        // Validasi siswa terdaftar di kelas guru
        const [validSiswa] = await db.execute(
            `SELECT 1 FROM siswa_kelas 
             WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [siswa_id, kelas_id, tahunAjaranIndukId]
        );

        if (validSiswa.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Siswa tidak terdaftar di kelas Anda' 
            });
        }

        // Validasi naik_tingkat untuk PAS Genap
        let naikTingkatValue = null;
        if (reqJenis === 'PAS' && semester === 'Genap') {
            if (naik_tingkat !== 'ya' && naik_tingkat !== 'tidak') {
                return res.status(400).json({
                    success: false,
                    message: 'Di semester Genap PAS, keputusan naik tingkat wajib diisi (ya/tidak).',
                });
            }
            naikTingkatValue = naik_tingkat;
        }

        // Insert atau Update (UPSERT)
        await db.execute(
            `INSERT INTO catatan_wali_kelas
                (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, catatan_wali_kelas, naik_tingkat)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                catatan_wali_kelas = VALUES(catatan_wali_kelas),
                naik_tingkat = VALUES(naik_tingkat),
                updated_at = NOW()`,
            [siswa_id, kelas_id, semesterId, semester, reqJenis, sanitizedCatatan, naikTingkatValue]
        );

        res.json({
            success: true,
            message: `Catatan wali kelas (${reqJenis} ${semester}) berhasil diperbarui`,
        });
    } catch (err) {
        console.error('Error updateCatatanWaliKelas:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memperbarui catatan wali kelas' 
        });
    }
};