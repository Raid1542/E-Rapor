/**
 * Nama File: kelasController.js
 * Fungsi: Mengelola data kelas dan siswa untuk guru kelas
 */

const db = require('../../config/db');

/**
 * GET /kelas
 * Mendapatkan informasi kelas yang diampu oleh guru kelas
 */
const getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID tidak ditemukan' });
        }

        const semesterId = req.idSemesterAktif;
        if (!semesterId) {
            return res.status(400).json({ success: false, message: 'ID Semester aktif tidak ditemukan' });
        }

        console.log('📚 [getKelasSaya] userId:', userId, 'semesterId:', semesterId);

        // ✅ Query TANPA kolom 'tingkat'
        const [rows] = await db.execute(
            `SELECT 
                k.id_kelas,
                k.nama_kelas,
                COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa
             FROM guru_kelas gk
             INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
             LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
                AND sk.id_tahun_ajaran_induk = (
                    SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?
                )
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             GROUP BY k.id_kelas`,
            [semesterId, userId, semesterId]
        );

        console.log('📚 [getKelasSaya] Result:', rows);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas pada tahun ajaran ini.',
            });
        }

        res.json({
            success: true,
            data: {
                id_kelas: rows[0].id_kelas,
                nama_kelas: rows[0].nama_kelas,
                jumlah_siswa: rows[0].jumlah_siswa
            }
        });
    } catch (err) {
        console.error('❌ Error di getKelasSaya:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data kelas: ' + err.message 
        });
    }
};

/**
 * GET /siswa
 * Mendapatkan daftar siswa di kelas yang diampu
 */
const getSiswaByKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        console.log('🔍 [getSiswaByKelas] START');
        console.log('🔍 [getSiswaByKelas] userId:', userId);
        console.log('🔍 [getSiswaByKelas] semesterId:', semesterId);

        if (!semesterId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID Semester aktif tidak ditemukan' 
            });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`, 
            [userId, semesterId]
        );

        console.log('🔍 [getSiswaByKelas] guruKelasRows:', guruKelasRows);

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran ini.',
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        const [taInfo] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );

        if (taInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran tidak ditemukan'
            });
        }

        const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

        console.log('🔍 [getSiswaByKelas] kelas_id:', kelas_id);
        console.log('🔍 [getSiswaByKelas] idTahunAjaranInduk:', idTahunAjaranInduk);

        const [siswaRows] = await db.execute(
            `SELECT
                s.id_siswa AS id,
                s.nis, s.nisn, s.nama_lengkap AS nama,
                s.tempat_lahir, s.tanggal_lahir, s.jenis_kelamin, s.alamat, s.status
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
            ORDER BY s.nama_lengkap`,
            [kelas_id, idTahunAjaranInduk]
        );

        console.log('🔍 [getSiswaByKelas] siswaRows:', siswaRows.length, 'siswa ditemukan');

        res.json({
            success: true,
            kelas_nama: nama_kelas,
            data: siswaRows.map(row => ({
                ...row,
                statusSiswa: row.status || 'aktif',
            })),
        });
    } catch (err) {
        console.error('❌ Error di getSiswaByKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};

/**
 * GET /progress-penilaian
 * Mendapatkan progress penilaian guru kelas
 */
const getProgressPenilaian = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id FROM guru_kelas gk 
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_mapel: 0,
                    total_siswa: 0,
                    progress: 0
                }
            });
        }

        res.json({
            success: true,
            data: {
                total_mapel: 0,
                total_siswa: 0,
                progress: 0
            }
        });
    } catch (err) {
        console.error('Error getProgressPenilaian:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS - WAJIB ADA!
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
    getKelasSaya,
    getSiswaByKelas,
    getProgressPenilaian
};