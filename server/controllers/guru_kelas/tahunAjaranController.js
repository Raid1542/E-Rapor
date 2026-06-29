/**
 * Nama File: tahunAjaranController.js
 * Fungsi: Data tahun ajaran untuk guru kelas
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

/** GET /tahun-ajaran/aktif - Ambil tahun ajaran aktif */
exports.getTahunAjaranAktif = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id_tahun_ajaran, tahun_ajaran, semester, status, status_pts, status_pas
            FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
        `);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error getTahunAjaranAktif:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil tahun ajaran aktif', error: err.message });
    }
};