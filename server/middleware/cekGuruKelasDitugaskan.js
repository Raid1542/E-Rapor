/**
 * Nama File: cekGuruKelasDitugaskan.js
 * Fungsi: Memastikan user yang login ditugaskan sebagai wali kelas 
 *         di semester yang sedang aktif.
 */

const db = require('../config/db');

const cekGuruKelasDitugaskan = async (req, res, next) => {
    try {
        // Gunakan req.idSemesterAktif
        const semesterAktifId = req.idSemesterAktif;
        const userId = req.user.id;

        if (!semesterAktifId) {
            return res.status(400).json({
                success: false,
                message: 'Semester aktif tidak ditemukan.'
            });
        }

        // Cek di tabel guru_kelas
        const [rows] = await db.execute(
            `SELECT gk.id_guru_kelas, gk.kelas_id, k.nama_kelas 
                FROM guru_kelas gk
                INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
                WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
                LIMIT 1`,
            [userId, semesterAktifId]
        );

        // Jika tidak ditemukan di tabel penugasan
        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai wali kelas di semester ini. Silakan hubungi Admin.',
                code: 'NOT_ASSIGNED'
            });
        }

        // Jika ditemukan, simpan info kelasnya ke request agar bisa dipakai controller
        req.infoKelasWali = {
            id_guru_kelas: rows[0].id_guru_kelas,
            kelas_id: rows[0].kelas_id,
            nama_kelas: rows[0].nama_kelas
        };

        next(); // Lanjut ke controller
    } catch (error) {
        console.error('Error di middleware cekGuruKelasDitugaskan:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
};

module.exports = cekGuruKelasDitugaskan;