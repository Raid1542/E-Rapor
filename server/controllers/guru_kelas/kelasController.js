/**
 * Nama File: kelasController.js
 * Fungsi: Controller untuk kelas dan siswa
 * Logika:
 *   - guru_kelas.tahun_ajaran_id = ID SEMESTER (penugasan per semester)
 *   - siswa_kelas.id_tahun_ajaran_induk = ID INDUK (siswa tetap di kelas sepanjang tahun)
 */

const db = require('../../config/db');

/**
 * GET /kelas
 * Ambil informasi kelas yang diampu guru kelas di semester aktif
 */
exports.getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;  
        const semesterId = req.idSemesterAktif;             
        if (!userId || !tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({
                message: 'Data tidak lengkap'
            });
        }

        const [rows] = await db.execute(
            `SELECT 
                k.id_kelas,
                k.nama_kelas, 
                COUNT(sk.siswa_id) as jumlah_siswa
            FROM guru_kelas gk
            JOIN kelas k ON gk.kelas_id = k.id_kelas
            LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
                AND sk.id_tahun_ajaran_induk = ?
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
            GROUP BY k.id_kelas, k.nama_kelas`,
            [tahunAjaranIndukId, userId, semesterId] 
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Anda belum ditugaskan sebagai guru kelas di semester ini'
            });
        }

        res.json(rows.map(row => ({
            id_kelas: row.id_kelas,
            kelas: row.nama_kelas,
            jumlah_siswa: row.jumlah_siswa,
        })));
    } catch (err) {
        console.error('Error getKelasSaya:', err);
        res.status(500).json({
            message: 'Gagal mengambil data kelas: ' + err.message
        });
    }
};

/**
 * GET /siswa
 * Ambil daftar siswa di kelas yang diampu guru kelas
 */
exports.getSiswaByKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;  
        const semesterId = req.idSemesterAktif;      
        if (!userId || !tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap'
            });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
            FROM guru_kelas gk
            JOIN kelas k ON gk.kelas_id = k.id_kelas
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu di semester ini.',
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        const [siswaRows] = await db.execute(
            `SELECT 
                s.id_siswa AS id,
                s.nis, 
                s.nisn, 
                s.nama_lengkap AS nama,
                s.tempat_lahir, 
                s.tanggal_lahir, 
                s.jenis_kelamin, 
                s.alamat, 
                s.status,
                k.nama_kelas AS kelas, 
                k.fase
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
            ORDER BY s.nama_lengkap ASC`,
            [kelas_id, tahunAjaranIndukId]  
        );

        res.json({
            success: true,
            data: siswaRows.map(row => ({
                ...row,
                statusSiswa: row.status || 'aktif',
            })),
        });
    } catch (err) {
        console.error('Error getSiswaByKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data siswa: ' + err.message
        });
    }
};

module.exports = exports;