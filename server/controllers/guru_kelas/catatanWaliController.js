/**
 * Nama File: catatanWaliController.js
 * Fungsi: Controller untuk catatan wali kelas
 */

const db = require('../../config/db');

/**
 * GET /catatan-wali-kelas/:jenis/:semester
 * Ambil catatan wali kelas untuk semua siswa di kelas guru
 */
exports.getCatatanWaliKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Validasi guru kelas pakai ID INDUK
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
       FROM guru_kelas gk
       JOIN kelas k ON gk.kelas_id = k.id_kelas
       WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.'
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Query catatan wali kelas pakai ID SEMESTER
        const [data] = await db.execute(
            `SELECT c.siswa_id, s.nama_lengkap AS nama, c.catatan_wali_kelas, c.naik_tingkat
       FROM catatan_wali_kelas c
       JOIN siswa s ON c.siswa_id = s.id_siswa
       WHERE c.kelas_id = ? AND c.id_tahun_ajaran_induk = ? AND c.semester = ? AND c.jenis_penilaian = ?
       ORDER BY s.nama_lengkap`,
            [kelas_id, semesterId, semester, jenis]
        );

        res.json({ success: true, data, kelas: nama_kelas, semester });
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
 * Update catatan wali kelas untuk satu siswa
 */
exports.updateCatatanWaliKelas = async (req, res) => {
    try {
        const { siswa_id } = req.params;
        const { catatan_wali_kelas = '', naik_tingkat } = req.body;
        const userId = req.user.id;

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: reqJenis } = req.penilaianContext || {};
        const { status_pts, status_pas } = req.tahunAjaranAktif || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !reqJenis) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Validasi jenis penilaian
        if (!['PTS', 'PAS'].includes(reqJenis)) {
            return res.status(400).json({
                message: 'Jenis penilaian harus PTS atau PAS'
            });
        }

        // Cek apakah periode sudah dikunci
        let periode_dikunci = false;
        if (reqJenis === 'PTS' && status_pts !== 'aktif') {
            periode_dikunci = true;
        } else if (reqJenis === 'PAS' && status_pas !== 'aktif') {
            periode_dikunci = true;
        }

        if (periode_dikunci) {
            return res.status(403).json({
                success: false,
                message: `Rapor ${reqJenis} sudah dikunci. Catatan wali kelas tidak dapat diubah.`,
            });
        }

        // Validasi guru kelas pakai ID INDUK
        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND id_tahun_ajaran_induk = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan.'
            });
        }

        const { kelas_id } = guruKelasRows[0];

        // Validasi: naik tingkat hanya untuk PAS Genap
        let naikTingkatValue = null;
        if (reqJenis === 'PAS' && semester === 'Genap') {
            if (naik_tingkat !== 'ya' && naik_tingkat !== 'tidak') {
                return res.status(400).json({
                    message: 'Di semester Genap PAS, keputusan naik tingkat wajib diisi (ya/tidak).',
                });
            }
            naikTingkatValue = naik_tingkat;
        }

        // Simpan catatan pakai ID SEMESTER
        await db.execute(
            `INSERT INTO catatan_wali_kelas 
       (siswa_id, kelas_id, id_tahun_ajaran_induk, semester, jenis_penilaian, catatan_wali_kelas, naik_tingkat, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         catatan_wali_kelas = VALUES(catatan_wali_kelas),
         naik_tingkat = VALUES(naik_tingkat),
         updated_at = NOW()`,
            [siswa_id, kelas_id, semesterId, semester, reqJenis, catatan_wali_kelas, naikTingkatValue]
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

module.exports = exports;