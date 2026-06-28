/**
 * Nama File: cekStatusPAS.js
 * Fungsi: Middleware untuk validasi status Penilaian Akhir Semester (PAS).
 *         Mengatur akses berdasarkan status PAS (aktif/selesai/nonaktif) dan method request.
 *         Write operation (POST/PUT/DELETE) diblokir jika PAS tidak aktif.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// CHECK PAS STATUS MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware untuk validasi status PAS dan kontrol akses.
 * 
 * Status PAS:
 *   - aktif: Write & read operation diizinkan
 *   - selesai: Hanya read operation (mode read-only)
 *   - nonaktif: Hanya read operation (mode read-only)
 * 
 * Data yang di-inject ke req:
 *   - req.idTahunAjaranInduk: ID tahun ajaran induk
 *   - req.idSemesterAktif: ID semester aktif
 *   - req.pasStatus: Status PAS (aktif/selesai/nonaktif)
 *   - req.pasLocked: true jika PAS selesai
 *   - req.pasNotOpen: true jika PAS belum dibuka
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const cekStatusPAS = async (req, res, next) => {
    try {
        // Step 1: Ambil data tahun ajaran aktif
        const [taRows] = await db.execute(`
            SELECT 
                ta.id_tahun_ajaran,
                ta.id_tahun_ajaran_induk,
                ta.semester,
                ta.status_pas
            FROM tahun_ajaran ta
            WHERE ta.status = 'aktif'
            LIMIT 1
        `);

        if (taRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur oleh admin',
                code: 'NO_ACTIVE_YEAR'
            });
        }

        const { 
            id_tahun_ajaran, 
            id_tahun_ajaran_induk,
            semester,
            status_pas 
        } = taRows[0];

        // Step 2: Inject data ke request object
        req.idTahunAjaranInduk = id_tahun_ajaran_induk;
        req.idSemesterAktif = id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];
        req.pasStatus = status_pas;

        if (!req.penilaianContext) {
            req.penilaianContext = {};
        }
        req.penilaianContext.semester = semester;
        req.penilaianContext.status_pas = status_pas;

        // Step 3: Cek jenis operasi (write atau read)
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

        // Step 4: Validasi berdasarkan status PAS
        if (status_pas === 'aktif') {
            req.jenis_penilaian = 'PAS';
            return next();
        } 
        
        if (status_pas === 'selesai') {
            if (isWriteOperation) {
                return res.status(403).json({
                    success: false,
                    message: 'Input ekstrakurikuler sudah dikunci. PAS telah selesai.',
                    code: 'PERIOD_LOCKED'
                });
            }
            req.pasLocked = true;
            console.log('[cekStatusPAS] GET request: PAS selesai, mode read-only');
            return next();
        }

        // PAS belum dibuka (nonaktif)
        if (isWriteOperation) {
            return res.status(403).json({
                success: false,
                message: 'Input ekstrakurikuler hanya tersedia saat PAS aktif. Silakan hubungi admin untuk membuka periode PAS.',
                code: 'PERIOD_NOT_OPEN'
            });
        }

        req.pasNotOpen = true;
        console.log('[cekStatusPAS] GET request: PAS belum dibuka, mode read-only');
        return next();

    } catch (err) {
        console.error('Error di middleware cekStatusPAS:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memeriksa status PAS',
            code: 'SYSTEM_ERROR'
        });
    }
};

module.exports = cekStatusPAS;