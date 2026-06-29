/**
 * Nama File: cekAksesMapelGuruBidangStudi.js
 * Fungsi: Middleware validasi akses guru bidang studi ke mapel (ambil mapelId dinamis dari params/query/body)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// Middleware: cek penugasan guru bidang studi ke mapel (inject req.penugasanMapel)
const cekAksesMapelGuruBidangStudi = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        let mapelId = null;

        // Step 1: Ambil mapelId dari berbagai sumber (params/query/body/DELETE)
        if (req.params && req.params.mapelId) {
            mapelId = req.params.mapelId;
        } else if (req.query && req.query.mapel_id) {
            mapelId = req.query.mapel_id;
        } else if (req.body && req.body.mapel_id) {
            mapelId = req.body.mapel_id;
        } else if (req.params && req.params.id && req.method === 'DELETE') {
            // DELETE /kategori/:id - fetch mapel_id dari kategori
            const [kategoriRows] = await db.execute('SELECT mapel_id FROM konfigurasi_nilai_rapor WHERE id_config = ?', [req.params.id]);
            if (!kategoriRows || kategoriRows.length === 0) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
            mapelId = kategoriRows[0].mapel_id;
        }

        // Step 2: Validasi keberadaan mapelId
        if (!mapelId) return res.status(400).json({ success: false, message: 'ID mata pelajaran tidak ditemukan dalam request' });
        if (!semesterId) return res.status(400).json({ success: false, message: 'Konteks tahun ajaran tidak ditemukan.' });

        // Step 3: Cek penugasan guru ke mapel di semester aktif
        const [rows] = await db.execute(
            `SELECT p.id, p.kelas_id, k.nama_kelas, mp.nama_mapel, mp.jenis
                FROM pembelajaran p
                INNER JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
                INNER JOIN kelas k ON p.kelas_id = k.id_kelas
                WHERE p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ?`,
            [userId, mapelId, semesterId]
        );

        // Step 4: Validasi akses
        if (!rows || rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mapel ini di semester aktif.', code: 'NO_ACCESS_TO_MAPEL' });
        }

        // Step 5: Inject informasi penugasan ke request
        req.penugasanMapel = {
            mapel_id: parseInt(mapelId), nama_mapel: rows[0].nama_mapel, jenis: rows[0].jenis,
            kelas_list: rows.map(r => ({ kelas_id: r.kelas_id, nama_kelas: r.nama_kelas }))
        };

        next();
    } catch (error) {
        console.error('Error di middleware cekAksesMapelGuruBidangStudi:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server: ' + error.message });
    }
};

module.exports = cekAksesMapelGuruBidangStudi;