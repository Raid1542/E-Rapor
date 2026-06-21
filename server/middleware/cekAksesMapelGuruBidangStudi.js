/**
 * Middleware: Cek apakah guru bidang studi punya akses ke mata pelajaran
 * Support 3 kasus:
 * 1. GET/POST/PUT dengan mapelId di params atau mapel_id di body/query
 * 2. DELETE dengan id kategori di params → fetch data kategori dulu
 */

const db = require('../config/db');

const cekAksesMapelGuruBidangStudi = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        let mapelId = null;

        // CASE 1: mapelId ada di params (untuk route /bobot/:mapelId, /nilai-komponen/:mapelId)
        if (req.params && req.params.mapelId) {
            mapelId = req.params.mapelId;
        }
        // CASE 2: mapel_id ada di query (untuk GET /kategori?mapel_id=X)
        else if (req.query && req.query.mapel_id) {
            mapelId = req.query.mapel_id;
        }
        // CASE 3: mapel_id ada di body (untuk POST /kategori)
        else if (req.body && req.body.mapel_id) {
            mapelId = req.body.mapel_id;
        }
        // CASE 4: DELETE /kategori/:id - perlu fetch data kategori dulu
        else if (req.params && req.params.id && req.method === 'DELETE') {
            const [kategoriRows] = await db.execute(`
                SELECT mapel_id 
                FROM konfigurasi_nilai_rapor 
                WHERE id_config = ?
            `, [req.params.id]);

            if (!kategoriRows || kategoriRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori tidak ditemukan'
                });
            }

            mapelId = kategoriRows[0].mapel_id;
        }

        // Jika tidak ada mapelId yang bisa diambil
        if (!mapelId) {
            return res.status(400).json({
                success: false,
                message: 'ID mata pelajaran tidak ditemukan dalam request'
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

        if (!rows || rows.length === 0) {
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
            message: 'Terjadi kesalahan server: ' + error.message 
        });
    }
};

module.exports = cekAksesMapelGuruBidangStudi;