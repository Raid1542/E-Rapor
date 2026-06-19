/**
 * Nama File: catatanWaliController.js
 * Fungsi: Mengelola catatan wali kelas
 * UPDATE: Fix query GET, tambah validasi lengkap
 */

const db = require('../../config/db');

/**
 * Helper: Sanitasi input untuk mencegah XSS
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

/**
 * GET /catatan-wali-kelas/:jenis/:semester
 */
exports.getCatatanWaliKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data tahun ajaran atau semester tidak ditemukan' 
            });
        }

        // 1. Ambil kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kelas aktif tidak ditemukan.' 
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // 2. ✅ PERBAIKAN: Ambil SEMUA siswa di kelas, lalu LEFT JOIN catatan
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

/**
 * PUT /catatan-wali-kelas/:siswa_id/:jenis/:semester
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

        // ✅ VALIDASI BARU: siswa_id harus valid
        if (isNaN(siswa_id) || siswa_id <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID siswa tidak valid' 
            });
        }

        if (!tahunAjaranIndukId || !semesterId || !semester || !reqJenis) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data tahun ajaran atau semester tidak ditemukan' 
            });
        }

        if (!['PTS', 'PAS'].includes(reqJenis)) {
            return res.status(400).json({ 
                success: false,
                message: 'Jenis penilaian harus PTS atau PAS' 
            });
        }

        // ✅ VALIDASI BARU: Catatan wajib diisi
        const trimmedCatatan = catatan_wali_kelas?.trim() || '';
        if (!trimmedCatatan) {
            return res.status(400).json({ 
                success: false, 
                message: 'Catatan wali kelas wajib diisi' 
            });
        }

        // ✅ VALIDASI BARU: Minimal 20 karakter
        if (trimmedCatatan.length < 20) {
            return res.status(400).json({ 
                success: false, 
                message: `Catatan wali kelas minimal 20 karakter (saat ini ${trimmedCatatan.length} karakter)` 
            });
        }

        // ✅ VALIDASI BARU: Sanitasi input
        const sanitizedCatatan = sanitizeInput(trimmedCatatan);

        // Cek periode dikunci
        let periode_dikunci = false;
        if (reqJenis === 'PTS' && status_pts !== 'aktif') periode_dikunci = true;
        else if (reqJenis === 'PAS' && status_pas !== 'aktif') periode_dikunci = true;

        if (periode_dikunci) {
            return res.status(403).json({
                success: false,
                message: `Rapor ${reqJenis} sudah dikunci. Catatan wali kelas tidak dapat diubah.`,
            });
        }

        // Ambil kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kelas aktif tidak ditemukan.' 
            });
        }

        const { kelas_id } = guruKelasRows[0];

        // ✅ VALIDASI BARU: Cek siswa ada di kelas guru
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

        // Insert atau Update
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