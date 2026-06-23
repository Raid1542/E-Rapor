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
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

        // ── 4. ✅ CEK JENIS PENILAIAN DARI SEMUA SUMBER ────────────────────
        // ✅ UPDATED: Cek dari query, body, params, dan context
        const reqJenis = req.query?.jenis
            || req.body?.jenis
            || req.body?.jenis_penilaian
            || req.params?.jenis
            || req.penilaianContext?.jenis;

        console.log(`🔍 [Middleware] req.query.jenis: ${req.query?.jenis}`);
        console.log(`🔍 [Middleware] req.body.jenis: ${req.body?.jenis}`);
        console.log(`🔍 [Middleware] reqJenis yang digunakan: ${reqJenis}`);
        console.log(`🔍 [Middleware] status_pts: ${status_pts}, status_pas: ${status_pas}`);

        if (reqJenis && ['PTS', 'PAS'].includes(reqJenis.toUpperCase())) {
            const jenis = reqJenis.toUpperCase();
            const status = jenis === 'PTS' ? status_pts : status_pas;

            console.log(`✅ [Middleware] Memproses jenis: ${jenis}, status: ${status}`);

            // 4a. Periode AKTIF
            if (status === 'aktif') {
                req.jenis_penilaian = jenis;
                req.penilaianContext.jenis = jenis;
                console.log(`✅ [Middleware] Periode ${jenis} aktif, lanjutkan`);
                return next();
            }
            // 4b. Periode SELESAI (dikunci)
            else if (status === 'selesai') {
                // ✅ HANYA block write operation, izinkan GET (download/read)
                if (isWriteOperation) {
                    console.log(`❌ [Middleware] Periode ${jenis} sudah selesai, block write`);
                    return res.status(403).json({
                        success: false,
                        message: `Periode ${jenis} sudah selesai. Data tidak dapat diubah.`,
                        code: 'PERIOD_LOCKED'
                    });
                } else {
                    // ✅ GET request (download rapor) → izinkan
                    req.jenis_penilaian = jenis;
                    req.penilaianContext.jenis = jenis;
                    console.log(`✅ [Middleware] Periode ${jenis} selesai, GET request diizinkan (download)`);
                    return next();
                }
            }
            // 4c. Periode BELUM AKTIF
            else {
                if (isWriteOperation) {
                    console.log(`❌ [Middleware] Periode ${jenis} belum dibuka, block write`);
                    return res.status(403).json({
                        success: false,
                        message: `Periode ${jenis} belum dibuka oleh admin.`,
                        code: 'PERIOD_NOT_OPEN'
                    });
                } else {
                    req.jenis_penilaian = jenis;
                    req.penilaianContext.jenis = jenis;
                    req.penilaianContext.periodNotOpen = true;
                    console.log(`⚠️ [Middleware] GET request: periode ${jenis} belum dibuka, lanjutkan`);
                    return next();
                }
            }
        }

        // ── 5. FALLBACK: TENTUKAN JENIS PENILAIAN AKTIF ─────────────────────
        console.log(`⚠️ [Middleware] Tidak ada parameter jenis, gunakan fallback`);

        if (status_pts === 'aktif' && status_pas === 'aktif') {
            return res.status(400).json({
                success: false,
                message: 'Kesalahan sistem: PTS dan PAS tidak boleh aktif bersamaan.',
                code: 'SYSTEM_ERROR'
            });
        }

        if (status_pts === 'aktif') {
            req.jenis_penilaian = 'PTS';
            req.penilaianContext.jenis = 'PTS';
            console.log(`✅ [Middleware] Fallback ke PTS (aktif)`);
            return next();
        }

        if (status_pas === 'aktif') {
            req.jenis_penilaian = 'PAS';
            req.penilaianContext.jenis = 'PAS';
            console.log(`✅ [Middleware] Fallback ke PAS (aktif)`);
            return next();
        }

        // ── 8. KEDUA PERIODE NONAKTIF ───────────────────────────────────────
        req.jenis_penilaian = 'PTS';
        req.penilaianContext.jenis = 'PTS';
        req.penilaianContext.info = 'Belum ada periode penilaian yang dibuka oleh admin';
        req.penilaianContext.periodNotOpen = true;

        if (isWriteOperation) {
            console.log(`❌ [Middleware] Tidak ada periode aktif, block write`);
            return res.status(403).json({
                success: false,
                message: 'Belum ada periode penilaian yang dibuka oleh admin.',
                code: 'PERIOD_NOT_OPEN'
            });
        }

        console.log(`⚠️ [Middleware] GET request: periode belum dibuka, default ke PTS`);
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