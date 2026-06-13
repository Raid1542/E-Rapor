/**
 * Nama File: kelasController.js
 * Fungsi: Mengelola data kelas dan siswa untuk guru kelas
 */

const db = require('../../config/db');

/**
 * GET /kelas
 * Mendapatkan informasi kelas yang diampu oleh guru kelas
 */
exports.getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ message: 'User ID tidak ditemukan' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        const [taSemesterRows] = await db.execute(
            `SELECT tahun_ajaran, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        const { tahun_ajaran, semester } = taSemesterRows[0] || {};

        const query = `
            SELECT
                k.nama_kelas,
                COUNT(sk.siswa_id) AS jumlah_siswa,
                ? AS tahun_ajaran_display,
                ? AS semester_display
            FROM guru_kelas gk
            INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
            LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.id_tahun_ajaran_induk = ?
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
            GROUP BY k.id_kelas
        `;

        const [rows] = await db.execute(query, [
            tahun_ajaran, semester, tahunAjaranIndukId, userId, tahunAjaranIndukId
        ]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Anda belum ditugaskan sebagai guru kelas pada tahun ajaran ini.',
            });
        }

        res.json(
            rows.map(row => ({
                kelas: row.nama_kelas,
                jumlah_siswa: row.jumlah_siswa,
                tahun_ajaran: row.tahun_ajaran_display,
                semester: row.semester_display,
            }))
        );
    } catch (err) {
        console.error('Error di getKelasSaya:', err);
        res.status(500).json({ message: 'Gagal mengambil data kelas' });
    }
};

/**
 * GET /siswa
 * Mendapatkan daftar siswa di kelas yang diampu
 */
exports.getSiswaByKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // ✅ PERBAIKAN: Gunakan idSemesterAktif, bukan idTahunAjaranInduk
        const semesterId = req.idSemesterAktif; 

        if (!semesterId) {
            return res.status(400).json({ success: false, message: 'ID Semester aktif tidak ditemukan' });
        }

        // Cari kelas guru berdasarkan SEMESTER AKTIF (ID 7)
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`, 
            [userId, semesterId] // Kirim semesterId (7)
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran ini.',
            });
        }

        const { kelas_id } = guruKelasRows[0];

        // Ambil siswa berdasarkan SEMESTER AKTIF juga
        const [siswaRows] = await db.execute(
            `SELECT
                s.id_siswa AS id,
                s.nis, s.nisn, s.nama_lengkap AS nama,
                s.tempat_lahir, s.tanggal_lahir, s.jenis_kelamin, s.alamat, s.status,
                k.nama_kelas AS kelas, k.fase
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            JOIN kelas k ON sk.kelas_id = k.id_kelas
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
            ORDER BY s.nama_lengkap`,
            [kelas_id, req.idTahunAjaranInduk] // Untuk siswa_kelas tetap pakai ID Induk (4)
        );

        res.json({
            success: true,
            data: siswaRows.map(row => ({
                ...row,
                statusSiswa: row.status || 'aktif',
            })),
        });
    } catch (err) {
        console.error('Error di getSiswaByKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};