/**
 * Nama File: kelasController.js
 * Fungsi: Mengelola data kelas dan siswa untuk guru kelas
 */

const db = require('../../config/db');

/**
 * GET /kelas
 * Mendapatkan informasi kelas yang diampu oleh guru kelas
 */
const getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ message: 'User ID tidak ditemukan' });
        }

        // ✅ Gunakan infoKelasWali dari middleware
        const infoKelas = req.infoKelasWali;
        if (!infoKelas) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data kelas tidak ditemukan' 
            });
        }

        const semesterId = req.idSemesterAktif;

        const [taSemesterRows] = await db.execute(
            `SELECT tahun_ajaran, semester FROM tahun_ajaran WHERE id_tahun_ajaran = ? LIMIT 1`,
            [semesterId]
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
            LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.id_tahun_ajaran_induk = (
                SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?
            )
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
            GROUP BY k.id_kelas
        `;

        const [rows] = await db.execute(query, [
            tahun_ajaran, semester, semesterId, userId, semesterId
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
        console.error('❌ Error di getKelasSaya:', err);
        res.status(500).json({ message: 'Gagal mengambil data kelas' });
    }
};

/**
 * GET /siswa
 * Mendapatkan daftar siswa di kelas yang diampu
 */
const getSiswaByKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        console.log('🔍 [getSiswaByKelas] START');
        console.log('🔍 [getSiswaByKelas] userId:', userId);
        console.log('🔍 [getSiswaByKelas] semesterId:', semesterId);

        if (!semesterId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID Semester aktif tidak ditemukan' 
            });
        }

        // ✅ Cari kelas guru berdasarkan SEMESTER AKTIF
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`, 
            [userId, semesterId]
        );

        console.log('🔍 [getSiswaByKelas] guruKelasRows:', guruKelasRows);

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran ini.',
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // ✅ FIX: Fetch id_tahun_ajaran_induk dari semesterId
        const [taInfo] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );

        if (taInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran tidak ditemukan'
            });
        }

        const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

        console.log('🔍 [getSiswaByKelas] kelas_id:', kelas_id);
        console.log('🔍 [getSiswaByKelas] idTahunAjaranInduk:', idTahunAjaranInduk);

        // ✅ Ambil siswa menggunakan idTahunAjaranInduk yang sudah di-fetch
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
            [kelas_id, idTahunAjaranInduk]
        );

        console.log('🔍 [getSiswaByKelas] siswaRows:', siswaRows.length, 'siswa ditemukan');

        res.json({
            success: true,
            kelas_nama: nama_kelas,
            data: siswaRows.map(row => ({
                ...row,
                statusSiswa: row.status || 'aktif',
            })),
        });
    } catch (err) {
        console.error('❌ Error di getSiswaByKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};

module.exports = {
    getKelasSaya,
    getSiswaByKelas,
};