/**
 * Nama File: cekGuruKelasDitugaskan.js
 * Fungsi: Middleware untuk memvalidasi apakah guru kelas sudah ditugaskan di tahun ajaran aktif.
 *         Menginject informasi kelas wali ke request object untuk digunakan di controller.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// CHECK GURU KELAS ASSIGNMENT MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware untuk validasi penugasan guru kelas.
 * Memastikan user memiliki penugasan sebagai wali kelas di tahun ajaran aktif.
 * 
 * Data yang di-inject ke req:
 *   - req.infoKelasWali: { id_guru_kelas, kelas_id, nama_kelas }
 *   - req.idTahunAjaranInduk: ID tahun ajaran induk (jika belum ada)
 *   - req.idSemesterAktif: ID semester aktif (jika belum ada)
 */
const cekGuruKelasDitugaskan = async (req, res, next) => {
    try {
        const userId = req.user.id;
        let idInduk = req.idTahunAjaranInduk;

        // Step 1: Ambil tahun ajaran aktif jika belum ada di request
        if (!idInduk) {
            const [taRows] = await db.execute(`
                SELECT id_tahun_ajaran_induk, id_tahun_ajaran, semester
                FROM tahun_ajaran 
                WHERE status = 'aktif'
                LIMIT 1
            `);

            if (taRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tahun ajaran aktif belum diatur oleh admin.'
                });
            }

            idInduk = taRows[0].id_tahun_ajaran_induk;
            req.idTahunAjaranInduk = idInduk;
            req.idSemesterAktif = taRows[0].id_tahun_ajaran;
        }

        // Step 2: Cek penugasan guru kelas dengan JOIN ke tahun_ajaran
        const [rows] = await db.execute(
            `SELECT gk.id_guru_kelas, gk.kelas_id, k.nama_kelas 
                FROM guru_kelas gk
                INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, idInduk]
        );

        // Step 3: Validasi penugasan
        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini. Silakan hubungi Admin.',
                code: 'NOT_ASSIGNED'
            });
        }

        // Step 4: Inject informasi kelas wali ke request
        req.infoKelasWali = {
            id_guru_kelas: rows[0].id_guru_kelas,
            kelas_id: rows[0].kelas_id,
            nama_kelas: rows[0].nama_kelas
        };

        next();

    } catch (error) {
        console.error('Error di middleware cekGuruKelasDitugaskan:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server.' 
        });
    }
};

module.exports = cekGuruKelasDitugaskan;