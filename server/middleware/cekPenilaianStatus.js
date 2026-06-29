/**
 * Nama File: cekPenilaianStatus.js
 * Fungsi: Middleware validasi status PTS/PAS (aktif/selesai/nonaktif) + deteksi jenis penilaian
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// Middleware: validasi status PTS/PAS, inject req.penilaianContext, blokir write saat selesai/nonaktif
const cekPenilaianStatus = async (req, res, next) => {
    try {
        // Step 1: Ambil Tahun Ajaran Aktif
        const [taRows] = await db.execute(`
            SELECT ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk, ta.semester, ta.status_pts, ta.status_pas
            FROM tahun_ajaran ta WHERE ta.status = 'aktif' LIMIT 1
        `);

        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur oleh admin', code: 'NO_ACTIVE_YEAR' });
        }

        const { id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas } = taRows[0];

        // Step 2: Inject Data ke Request
        req.idTahunAjaranInduk = id_tahun_ajaran_induk;
        req.idSemesterAktif = id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];

        if (!req.penilaianContext) req.penilaianContext = {};
        req.penilaianContext.semester = semester;
        req.penilaianContext.status_pts = status_pts;
        req.penilaianContext.status_pas = status_pas;

        // Step 3: Cek Method Request
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

        // Step 4: Deteksi Jenis Penilaian dari Berbagai Sumber
        const reqJenis = req.query?.jenis || req.body?.jenis || req.body?.jenis_penilaian || req.params?.jenis || req.penilaianContext?.jenis;

        if (reqJenis && ['PTS', 'PAS'].includes(reqJenis.toUpperCase())) {
            const jenis = reqJenis.toUpperCase();
            const status = jenis === 'PTS' ? status_pts : status_pas;

            // Status aktif: izinkan semua operasi
            if (status === 'aktif') {
                req.jenis_penilaian = jenis;
                req.penilaianContext.jenis = jenis;
                return next();
            }
            // Status selesai: hanya izinkan GET (download rapor)
            else if (status === 'selesai') {
                if (isWriteOperation) {
                    return res.status(403).json({ success: false, message: `Periode ${jenis} sudah selesai. Data tidak dapat diubah.`, code: 'PERIOD_LOCKED' });
                }
                req.jenis_penilaian = jenis;
                req.penilaianContext.jenis = jenis;
                return next();
            }
            // Status nonaktif: hanya izinkan GET
            else {
                if (isWriteOperation) {
                    return res.status(403).json({ success: false, message: `Periode ${jenis} belum dibuka oleh admin.`, code: 'PERIOD_NOT_OPEN' });
                }
                req.jenis_penilaian = jenis;
                req.penilaianContext.jenis = jenis;
                req.penilaianContext.periodNotOpen = true;
                return next();
            }
        }

        // Step 5: Fallback - Tentukan Jenis Penilaian Aktif
        if (status_pts === 'aktif' && status_pas === 'aktif') {
            return res.status(400).json({ success: false, message: 'Kesalahan sistem: PTS dan PAS tidak boleh aktif bersamaan.', code: 'SYSTEM_ERROR' });
        }

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

        // Step 6: Kedua Periode Nonaktif
        req.jenis_penilaian = 'PTS';
        req.penilaianContext.jenis = 'PTS';
        req.penilaianContext.info = 'Belum ada periode penilaian yang dibuka oleh admin';
        req.penilaianContext.periodNotOpen = true;

        if (isWriteOperation) {
            return res.status(403).json({ success: false, message: 'Belum ada periode penilaian yang dibuka oleh admin.', code: 'PERIOD_NOT_OPEN' });
        }

        next();
    } catch (err) {
        console.error('Error di middleware cekPenilaianStatus:', err);
        res.status(500).json({ success: false, message: 'Gagal memeriksa status penilaian', code: 'SYSTEM_ERROR' });
    }
};

module.exports = cekPenilaianStatus;