/**
 * Nama File: dashboardController.js
 * Fungsi: Controller untuk dashboard guru kelas
 */

const db = require('../../config/db');

/**
 * GET /dashboard
 * Ambil data dashboard untuk guru kelas
 */
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        if (!userId || !tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Ambil info kelas yang diampu
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas, k.nama_kelas 
       FROM guru_kelas gk
       JOIN kelas k ON gk.kelas_id = k.id_kelas
       WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (kelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas',
            });
        }

        const kelasId = kelasRows[0].id_kelas;
        const namaKelas = kelasRows[0].nama_kelas;

        // Hitung jumlah siswa
        const [siswaRows] = await db.execute(
            `SELECT COUNT(*) as jumlah 
       FROM siswa_kelas 
       WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );
        const jumlahSiswa = siswaRows[0].jumlah || 0;

        // Hitung jumlah mata pelajaran
        const [mapelRows] = await db.execute(
            `SELECT COUNT(DISTINCT mp.id_mata_pelajaran) as jumlah
       FROM pembelajaran p
       JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
       WHERE p.kelas_id = ? AND p.id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );
        const jumlahMapel = mapelRows[0].jumlah || 0;

        // Ambil status penilaian dari semester aktif
        const [taRows] = await db.execute(
            `SELECT status_pts, status_pas 
       FROM tahun_ajaran 
       WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );
        const statusPenilaian = taRows[0] || { status_pts: 'nonaktif', status_pas: 'nonaktif' };

        // Ambil tahun ajaran display
        const [taDisplay] = await db.execute(
            `SELECT tahun_ajaran, semester FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );
        const taInfo = taDisplay[0] || { tahun_ajaran: 'Tahun Ajaran Aktif', semester: 'Ganjil' };

        res.json({
            success: true,
            data: {
                kelas: namaKelas,
                jumlah_siswa: jumlahSiswa,
                jumlah_mapel: jumlahMapel,
                status_penilaian: statusPenilaian,
                tahun_ajaran: taInfo.tahun_ajaran,
                semester: semester || taInfo.semester || 'Ganjil',
            },
        });
    } catch (err) {
        console.error('Error getDashboardData:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data dashboard',
        });
    }
};

module.exports = exports;