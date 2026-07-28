/**
 * Nama File: tahunAjaranController.js
 * Fungsi: Controller data tahun ajaran untuk guru kelas.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

/**
 * GET /tahun-ajaran/aktif - Ambil data tahun ajaran yang sedang aktif.
 * Return data tahun ajaran lengkap dengan status PTS dan PAS.
 */
exports.getTahunAjaranAktif = async (req, res) => {
    try {
        // Query tahun ajaran dengan status aktif
        const [rows] = await db.execute(`
        SELECT id_tahun_ajaran, tahun_ajaran, semester, status, status_pts, status_pas
        FROM tahun_ajaran 
        WHERE status = 'aktif' 
        LIMIT 1
    `);

        // Validasi tahun ajaran tidak ditemukan
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        // Return data tahun ajaran aktif
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil tahun ajaran aktif',
            error: err.message
        });
    }
};