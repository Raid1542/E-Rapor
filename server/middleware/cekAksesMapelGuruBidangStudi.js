/**
 * Nama File: cekAksesMapelGuruBidangStudi.js
 * Fungsi: Validasi apakah guru bidang studi mengajar mapel tertentu
 *         Support: URL param, query param, atau body
 */

const db = require('../config/db');

const cekAksesMapelGuruBidangStudi = async (req, res, next) => {
    try {
        const mapelId = req.params.mapelId || req.query.mapel_id || req.body.mapel_id;
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        if (!mapelId) {
            return res.status(400).json({
                success: false,
                message: 'ID mata pelajaran tidak ditemukan. Kirim via URL param, query (?mapel_id=), atau body.'
            });
        }

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Konteks tahun ajaran tidak ditemukan.'
            });
        }

        // Cek apakah guru mengajar mapel ini di semester aktif
        const [rows] = await db.execute(
            `SELECT p.id, p.kelas_id, k.nama_kelas, mp.nama_mapel, mp.jenis
                FROM pembelajaran p
                INNER JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
                INNER JOIN kelas k ON p.kelas_id = k.id_kelas
                WHERE p.user_id = ? 
                AND p.mapel_id = ? 
                AND p.tahun_ajaran_id = ?`,
            [userId, mapelId, semesterId]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini di semester aktif.',
                code: 'NO_ACCESS_TO_MAPEL'
            });
        }

        // Simpan info penugasan
        req.penugasanMapel = {
            mapel_id: parseInt(mapelId),
            nama_mapel: rows[0].nama_mapel,
            jenis: rows[0].jenis,
            kelas_list: rows.map(r => ({
                kelas_id: r.kelas_id,
                nama_kelas: r.nama_kelas
            }))
        };

        next();

    } catch (error) {
        console.error('Error di middleware cekAksesMapelGuruBidangStudi:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server.' 
        });
    }
};

module.exports = cekAksesMapelGuruBidangStudi;