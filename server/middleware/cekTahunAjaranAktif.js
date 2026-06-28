/**
 * Nama File: cekTahunAjaranAktif.js
 * Fungsi: Middleware untuk memastikan terdapat tahun ajaran aktif di sistem.
 *         Menyimpan ID Induk, ID Semester, dan tanggal PTS/PAS ke objek req.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// CHECK ACTIVE ACADEMIC YEAR MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware untuk validasi tahun ajaran aktif.
 * Inject data tahun ajaran aktif ke request object untuk digunakan di controller.
 * 
 * Data yang di-inject:
 *   - req.idSemesterAktif: ID semester aktif (untuk nilai, absensi, rapor)
 *   - req.semesterAktif: Nama semester (Ganjil/Genap)
 *   - req.idTahunAjaranInduk: ID tahun ajaran induk (untuk data master)
 *   - req.tanggalPembagianPTS: Tanggal pembagian rapor PTS
 *   - req.tanggalPembagianPAS: Tanggal pembagian rapor PAS
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void} Lanjut ke middleware berikutnya atau return error 400
 */
module.exports = async (req, res, next) => {
    try {
        // Ambil tahun ajaran aktif
        const [rows] = await db.execute(`
            SELECT 
                id_tahun_ajaran,              
                id_tahun_ajaran_induk,        
                tahun_ajaran,
                semester,
                status,
                tanggal_pembagian_pts,  
                tanggal_pembagian_pas   
            FROM tahun_ajaran 
            WHERE status = 'aktif' 
            LIMIT 1
        `);

        // Validasi keberadaan tahun ajaran aktif
        if (rows.length === 0) {
            return res.status(400).json({
                message: 'Tidak ada tahun ajaran aktif. Silakan hubungi administrator.'
            });
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
        res.status(500).json({
            message: 'Terjadi kesalahan pada server',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};