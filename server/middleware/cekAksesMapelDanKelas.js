/**
 * Nama File: cekAksesMapelDanKelas.js
 * Fungsi: Middleware validasi akses guru ke mapel di kelas tertentu (params: mapelId, kelasId)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// Middleware: cek penugasan guru ke mapel di kelas tertentu (inject req.penugasanGuru)
const cekAksesMapelDanKelas = async (req, res, next) => {
    try {
        const { mapelId, kelasId } = req.params;
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        // Step 1: Validasi parameter
        if (!mapelId || !kelasId) return res.status(400).json({ success: false, message: 'ID mata pelajaran dan kelas wajib diisi.' });
        if (!semesterId) return res.status(400).json({ success: false, message: 'Konteks tahun ajaran tidak ditemukan.' });

        // Step 2: Cek penugasan guru ke mapel di kelas tertentu
        const [rows] = await db.execute(
            `SELECT p.id, mp.nama_mapel, mp.jenis, k.nama_kelas
                FROM pembelajaran p
                INNER JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
                INNER JOIN kelas k ON p.kelas_id = k.id_kelas
                WHERE p.user_id = ? AND p.mapel_id = ? AND p.kelas_id = ? AND p.tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );

        // Step 3: Validasi akses
        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mapel ini di kelas tersebut semester ini.', code: 'NO_ACCESS_TO_MAPEL_KELAS' });
        }

        // Step 4: Inject informasi penugasan ke request
        req.penugasanGuru = {
            mapel_id: parseInt(mapelId), kelas_id: parseInt(kelasId),
            nama_mapel: rows[0].nama_mapel, nama_kelas: rows[0].nama_kelas, jenis_mapel: rows[0].jenis
        };

        next();
    } catch (error) {
        console.error('Error di middleware cekAksesMapelDanKelas:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
};

module.exports = cekAksesMapelDanKelas;