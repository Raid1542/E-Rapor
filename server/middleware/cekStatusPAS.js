/**
 * Nama File: cekStatusPAS.js
 * UPDATE: Tambah req.penilaianContext.semester agar controller bisa baca
 */

const db = require('../config/db');

const cekStatusPAS = async (req, res, next) => {
    try {
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

        req.idTahunAjaranInduk = id_tahun_ajaran_induk;
        req.idSemesterAktif = id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];
        req.pasStatus = status_pas;

        if (!req.penilaianContext) {
            req.penilaianContext = {};
        }
        req.penilaianContext.semester = semester;
        req.penilaianContext.status_pas = status_pas;

        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

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

        // PAS belum dibuka
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