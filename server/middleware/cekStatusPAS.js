/**
 * Nama File: cekStatusPAS.js
 * Fungsi: Middleware validasi status PAS (aktif/selesai/nonaktif) + kontrol akses write/read
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../config/db');

// Konstanta query SQL
const QUERY_TAHUN_AJARAN_AKTIF = `
    SELECT ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk, ta.semester, ta.status_pas
    FROM tahun_ajaran ta WHERE ta.status = 'aktif' LIMIT 1
`;

// Konstanta method write operation
const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Middleware: validasi status PAS dan kontrol akses
const cekStatusPAS = async (req, res, next) => {
    try {
        // Ambil data tahun ajaran aktif
        const [taRows] = await db.execute(QUERY_TAHUN_AJARAN_AKTIF);

        if (taRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur oleh admin',
                code: 'NO_ACTIVE_YEAR'
            });
        }

        const { id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pas } = taRows[0];

        // Inject data ke request object
        req.idTahunAjaranInduk = id_tahun_ajaran_induk;
        req.idSemesterAktif = id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];
        req.pasStatus = status_pas;

        if (!req.penilaianContext) req.penilaianContext = {};
        req.penilaianContext.semester = semester;
        req.penilaianContext.status_pas = status_pas;

        // Cek jenis operasi (write atau read)
const isWriteOperation = WRITE_METHODS.includes(req.method.toUpperCase());

        // Validasi berdasarkan status PAS
        if (status_pas === 'aktif') {
            req.jenis_penilaian = 'PAS';
            return next();
        }

        // PAS selesai: read-only mode
        if (status_pas === 'selesai') {
            if (isWriteOperation) {
                return res.status(403).json({
                    success: false,
                    message: 'Input ekstrakurikuler sudah dikunci. PAS telah selesai.',
                    code: 'PERIOD_LOCKED'
                });
            }
            req.pasLocked = true;
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