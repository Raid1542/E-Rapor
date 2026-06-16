/**
 * Nama File: cekPenilaianStatus.js
 * UPDATE: Jangan block akses jika periode belum dibuka, cukup kirim data status
 */

const db = require('../config/db');

const cekPenilaianStatus = async (req, res, next) => {
    try {
        const [taRows] = await db.execute(`
            SELECT 
                ta.id_tahun_ajaran,
                ta.id_tahun_ajaran_induk,
                ta.semester,
                ta.status_pts,
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
            status_pts, 
            status_pas 
        } = taRows[0];

        // ✅ Set data ke request (selalu, apapun statusnya)
        req.idTahunAjaranInduk = id_tahun_ajaran_induk;
        req.idSemesterAktif = id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];

        if (!req.penilaianContext) {
            req.penilaianContext = {};
        }
        req.penilaianContext.semester = semester;
        req.penilaianContext.status_pts = status_pts;
        req.penilaianContext.status_pas = status_pas;

        // ✅ Cek jika ada parameter jenis (PTS/PAS) dari URL
        const reqJenis = req.penilaianContext?.jenis 
            || req.params?.jenis 
            || req.body?.jenis_penilaian;

        if (reqJenis && ['PTS', 'PAS'].includes(reqJenis.toUpperCase())) {
            const jenis = reqJenis.toUpperCase();
            const status = jenis === 'PTS' ? status_pts : status_pas;

            if (status === 'aktif') {
                req.jenis_penilaian = jenis;
                req.penilaianContext.jenis = jenis;
                return next();
            } else if (status === 'selesai') {
                // ✅ Block jika periode sudah selesai (data dikunci)
                return res.status(403).json({
                    success: false,
                    message: `Rapor ${jenis} sudah dikunci. Data tidak dapat diubah.`,
                    code: 'PERIOD_LOCKED'
                });
            } else {
                // ✅ Block jika periode belum dibuka (untuk input data spesifik)
                return res.status(403).json({
                    success: false,
                    message: `Periode ${jenis} belum dibuka oleh admin.`,
                    code: 'PERIOD_NOT_OPEN'
                });
            }
        }

        // ✅ FALLBACK: Tentukan jenis penilaian aktif
        if (status_pts === 'aktif' && status_pas === 'aktif') {
            return res.status(400).json({
                success: false,
                message: 'Kesalahan sistem: PTS dan PAS tidak boleh aktif bersamaan.',
                code: 'SYSTEM_ERROR'
            });
        } 
        
        // ✅ PERIOD AKTIF - lanjutkan normal
        if (status_pts === 'aktif') {
            req.jenis_penilaian = 'PTS';
            req.penilaianContext.jenis = 'PTS';
            return next();
        }
        
        if (status_pas === 'aktif') {
            req.jenis_penilaian = 'PAS';
            req.penilaianContext.jenis = 'PAS';
            return next();
        }

        req.jenis_penilaian = null;
        req.penilaianContext.jenis = null;
        req.penilaianContext.info = 'Belum ada periode penilaian yang dibuka oleh admin';
        
        console.log('[cekPenilaianStatus] Periode belum dibuka, lanjutkan dengan jenis_penilaian = null');
        next();

    } catch (err) {
        console.error('Error di middleware cekPenilaianStatus:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memeriksa status penilaian',
            code: 'SYSTEM_ERROR'
        });
    }
};

module.exports = cekPenilaianStatus;