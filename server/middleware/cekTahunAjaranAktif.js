/**
 * Nama File: cekTahunAjaranAktif.js
 * Fungsi: Middleware validasi tahun ajaran aktif + inject ID semester/induk/tanggal PTS/PAS
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// Middleware: cek TA aktif, inject req.idSemesterAktif, req.idTahunAjaranInduk, req.tanggalPembagianPTS/PAS
module.exports = async (req, res, next) => {
    try {
        // Ambil tahun ajaran aktif
        const [rows] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, tahun_ajaran, semester, status,
                    tanggal_pembagian_pts, tanggal_pembagian_pas
            FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
        `);

        // Validasi keberadaan tahun ajaran aktif
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif. Silakan hubungi administrator.' });
        }

        const activeTA = rows[0];

        // Inject data ke request object
        req.idSemesterAktif = activeTA.id_tahun_ajaran;
        req.semesterAktif = activeTA.semester;
        req.idTahunAjaranInduk = activeTA.id_tahun_ajaran_induk;
        req.tanggalPembagianPTS = activeTA.tanggal_pembagian_pts;
        req.tanggalPembagianPAS = activeTA.tanggal_pembagian_pas;

        next();
    } catch (err) {
        console.error('Error di middleware cekTahunAjaranAktif:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
};