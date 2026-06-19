/**
 * Nama File: cekPenilaianStatus.js
 * Fungsi: Middleware untuk memeriksa status periode penilaian (PTS/PAS)
 * UPDATE: 
 *   - GET request: Jangan block, cukup set data status
 *   - POST/PUT/DELETE: Block jika periode tidak aktif
 *   - ✅ PERBAIKAN: Set default jenis_penilaian = 'PTS' saat kedua periode nonaktif
 */

const db = require('../config/db');

const cekPenilaianStatus = async (req, res, next) => {
    try {
        // ── 1. FETCH TAHUN AJARAN AKTIF ─────────────────────────────────────
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

        // ── 2. SET DATA DASAR KE REQUEST ────────────────────────────────────
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

        // ── 3. CEK METHOD (GET vs WRITE) ────────────────────────────────────
        // ✅ CEK METHOD: GET request tidak perlu block
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

        // ── 4. CEK JENIS PENILAIAN DARI URL/BODY ────────────────────────────
        // ✅ Cek jika ada parameter jenis (PTS/PAS) dari URL
        const reqJenis = req.penilaianContext?.jenis 
            || req.params?.jenis 
            || req.body?.jenis_penilaian;

        if (reqJenis && ['PTS', 'PAS'].includes(reqJenis.toUpperCase())) {
            const jenis = reqJenis.toUpperCase();
            const status = jenis === 'PTS' ? status_pts : status_pas;

            // 4a. Periode AKTIF
            if (status === 'aktif') {
                req.jenis_penilaian = jenis;
                req.penilaianContext.jenis = jenis;
                return next();
            } 
            // 4b. Periode SELESAI (dikunci)
            else if (status === 'selesai') {
                // ✅ Block jika periode sudah selesai (data dikunci)
                return res.status(403).json({
                    success: false,
                    message: `Rapor ${jenis} sudah dikunci. Data tidak dapat diubah.`,
                    code: 'PERIOD_LOCKED'
                });
            } 
            // 4c. Periode BELUM AKTIF
            else {
                // ✅ PERIOD_NOT_OPEN
                if (isWriteOperation) {
                    // ✅ Block hanya untuk write operation
                    return res.status(403).json({
                        success: false,
                        message: `Periode ${jenis} belum dibuka oleh admin.`,
                        code: 'PERIOD_NOT_OPEN'
                    });
                } else {
                    // ✅ GET request: lanjutkan, biarkan frontend handle
                    req.jenis_penilaian = jenis;
                    req.penilaianContext.jenis = jenis;
                    req.penilaianContext.periodNotOpen = true;
                    console.log(`[cekPenilaianStatus] GET request: periode ${jenis} belum dibuka, lanjutkan`);
                    return next();
                }
            }
        }

        // ── 5. FALLBACK: TENTUKAN JENIS PENILAIAN AKTIF ─────────────────────
        // ✅ FALLBACK: Tentukan jenis penilaian aktif
        if (status_pts === 'aktif' && status_pas === 'aktif') {
            return res.status(400).json({
                success: false,
                message: 'Kesalahan sistem: PTS dan PAS tidak boleh aktif bersamaan.',
                code: 'SYSTEM_ERROR'
            });
        } 
        
        // ── 6. PTS AKTIF ────────────────────────────────────────────────────
        // ✅ PERIOD PTS AKTIF - lanjutkan normal
        if (status_pts === 'aktif') {
            req.jenis_penilaian = 'PTS';
            req.penilaianContext.jenis = 'PTS';
            return next();
        }
        
        // ── 7. PAS AKTIF ────────────────────────────────────────────────────
        if (status_pas === 'aktif') {
            req.jenis_penilaian = 'PAS';
            req.penilaianContext.jenis = 'PAS';
            return next();
        }

        // ── 8. KEDUA PERIODE NONAKTIF ───────────────────────────────────────
        // ✅ PERBAIKAN: Set default jenis penilaian untuk GET request
        // Sebelumnya: req.jenis_penilaian = null (menyebabkan error di controller)
        // Sekarang: req.jenis_penilaian = 'PTS' (default agar controller bisa jalan)
        req.jenis_penilaian = 'PTS';  // ✅ Default ke PTS
        req.penilaianContext.jenis = 'PTS';  // ✅ Default ke PTS
        req.penilaianContext.info = 'Belum ada periode penilaian yang dibuka oleh admin';
        req.penilaianContext.periodNotOpen = true;
        
        if (isWriteOperation) {
            // ✅ Block write operation
            return res.status(403).json({
                success: false,
                message: 'Belum ada periode penilaian yang dibuka oleh admin.',
                code: 'PERIOD_NOT_OPEN'
            });
        }
        
        console.log('[cekPenilaianStatus] GET request: periode belum dibuka, default ke PTS');
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