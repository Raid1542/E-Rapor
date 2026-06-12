/**
 * Nama File: absensiController.js
 * Fungsi: Mengelola absensi siswa untuk guru kelas
 */

const db = require('../../config/db');

/**
 * GET /absensi/:jenis/:semester
 * Mendapatkan data absensi total seluruh siswa di kelas
 */
exports.getAbsensiSiswa = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
                FROM guru_kelas gk
                JOIN kelas k ON gk.kelas_id = k.id_kelas
                WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        const [data] = await db.execute(
            `SELECT a.siswa_id, s.nama_lengkap AS nama, a.sakit, a.izin, a.alpha
                FROM absensi a
                JOIN siswa s ON a.siswa_id = s.id_siswa
                WHERE a.kelas_id = ? AND a.tahun_ajaran_id = ? AND a.semester = ? AND a.jenis_penilaian = ?
                ORDER BY s.nama_lengkap`,
            [kelas_id, semesterId, semester, jenis_penilaian]
        );

        res.json({ success: true, data, kelas: nama_kelas });
    } catch (err) {
        console.error('Error getAbsensiTotal:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
    }
};

/**
 * POST /absensi
 * Memperbarui absensi siswa
 */
exports.upsertAbsensi = async (req, res) => {
    try {
        const { siswa_id } = req.params;
        const { jumlah_sakit, jumlah_izin, jumlah_alpha } = req.body;
        const userId = req.user.id;

        if (!siswa_id) {
            return res.status(400).json({ message: 'ID siswa wajib diisi' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }

        const { kelas_id } = guruKelasRows[0];

        await db.execute(
            `INSERT INTO absensi
                (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, sakit, izin, alpha, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                sakit = VALUES(sakit),
                izin = VALUES(izin),
                alpha = VALUES(alpha),
                updated_at = NOW()`,
            [
                siswa_id, kelas_id, semesterId, semester, jenis_penilaian,
                jumlah_sakit || 0, jumlah_izin || 0, jumlah_alpha || 0,
            ]
        );

        res.json({ success: true, message: 'Absensi berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateAbsensiTotal:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui absensi' });
    }
};