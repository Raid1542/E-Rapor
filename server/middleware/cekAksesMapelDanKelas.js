/**
 * Nama File: cekAksesMapelDanKelas.js
 * Fungsi: Validasi guru mengajar mapel tertentu di kelas tertentu
 *         Dipakai untuk route input nilai yang butuh :mapelId dan :kelasId
 */

const db = require('../config/db');

const cekAksesMapelDanKelas = async (req, res, next) => {
    try {
        const { mapelId, kelasId } = req.params;
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        // Validasi parameter
        if (!mapelId || !kelasId) {
            return res.status(400).json({
                success: false,
                message: 'ID mata pelajaran dan kelas wajib diisi.'
            });
        }

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Konteks tahun ajaran tidak ditemukan.'
            });
        }

        // Cek apakah guru mengajar mapel ini di kelas ini
        const [rows] = await db.execute(
            `SELECT p.id, mp.nama_mapel, mp.jenis, k.nama_kelas
                FROM pembelajaran p
                INNER JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
                INNER JOIN kelas k ON p.kelas_id = k.id_kelas
                WHERE p.user_id = ? 
                AND p.mapel_id = ? 
                AND p.kelas_id = ?
                AND p.tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: `Anda tidak mengajar mata pelajaran ini di kelas tersebut semester ini.`,
                code: 'NO_ACCESS_TO_MAPEL_KELAS'
            });
        }

        // Simpan info penugasan
        req.penugasanGuru = {
            mapel_id: parseInt(mapelId),
            kelas_id: parseInt(kelasId),
            nama_mapel: rows[0].nama_mapel,
            nama_kelas: rows[0].nama_kelas,
            jenis_mapel: rows[0].jenis
        };

        next();

    } catch (error) {
        console.error('Error di middleware cekAksesMapelDanKelas:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server.'
        });
    }
};

module.exports = cekAksesMapelDanKelas;