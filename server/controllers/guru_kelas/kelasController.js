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
        const semesterId = req.idSemesterAktif;

        console.log('📚 [getKelasSaya] userId:', userId, 'semesterId:', semesterId);

        const [rows] = await db.execute(
            `SELECT 
                k.id_kelas,
                k.nama_kelas,
                COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa,
                ta.tahun_ajaran,
                ta.semester
             FROM guru_kelas gk
             INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
             INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
             LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
                AND sk.id_tahun_ajaran_induk = ta.id_tahun_ajaran_induk
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             GROUP BY k.id_kelas, k.nama_kelas, ta.tahun_ajaran, ta.semester`,
            [userId, semesterId]
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
                jumlah_siswa: rows[0].jumlah_siswa,
                tahun_ajaran: rows[0].tahun_ajaran,
                semester: rows[0].semester
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

        const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

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
 * ✅ UPDATED: Mendapatkan progress penilaian per mata pelajaran
 */
const getProgressPenilaian = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;

        console.log('═══════════════════════════════════════');
        console.log('📊 [getProgressPenilaian] START');
        console.log('📊 userId:', userId);
        console.log('📊 semesterId:', semesterId);
        console.log('📊 tahunAjaranIndukId:', tahunAjaranIndukId);

        // 1. Ambil kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id FROM guru_kelas gk 
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        console.log('📊 guruKelasRows:', guruKelasRows);

        if (guruKelasRows.length === 0) {
            console.log('⚠️ Guru belum punya kelas');
            return res.json({ success: true, data: [] });
        }

        const kelasId = guruKelasRows[0].kelas_id;
        console.log('📊 kelasId:', kelasId);

        // 2. Ambil semester aktif
        const [semesterInfo] = await db.execute(
            `SELECT semester FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );
        const semesterAktif = semesterInfo[0]?.semester || 'Ganjil';
        console.log('📊 semesterAktif:', semesterAktif);

        // 3. ✅ Query SIMPLE - Ambil semua mapel di kelas ini
        const [progressRows] = await db.execute(
            `SELECT 
                mp.id_mata_pelajaran,
                mp.nama_mapel,
                mp.kode_mapel,
                COALESCE(mp.jenis, 'wajib') AS jenis,
                (SELECT COUNT(*) FROM siswa_kelas sk 
                 WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?) AS total_siswa,
                (SELECT COUNT(*) FROM nilai_rapor nr 
                 WHERE nr.mapel_id = mp.id_mata_pelajaran 
                 AND nr.tahun_ajaran_id = ? 
                 AND nr.semester = ?
                 AND nr.nilai_rapor IS NOT NULL
                 AND nr.siswa_id IN (
                     SELECT sk.siswa_id FROM siswa_kelas sk 
                     WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
                 )) AS sudah_dinilai
             FROM mata_pelajaran mp
             WHERE mp.id_mata_pelajaran IN (
                 SELECT p.mapel_id FROM pembelajaran p 
                 WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
             )
             ORDER BY mp.id_mata_pelajaran ASC`,
            [
                kelasId, tahunAjaranIndukId,           // total_siswa
                semesterId, semesterAktif,             // sudah_dinilai (semester)
                kelasId, tahunAjaranIndukId,           // sudah_dinilai (siswa filter)
                kelasId, semesterId                    // WHERE IN
            ]
        );

        console.log('📊 Found', progressRows.length, 'mapel');
        console.log('📊 Data:', JSON.stringify(progressRows, null, 2));

        const data = progressRows.map(row => ({
            mata_pelajaran: row.nama_mapel,
            kode_mapel: row.kode_mapel,
            total_siswa: parseInt(row.total_siswa) || 0,
            sudah_dinilai: parseInt(row.sudah_dinilai) || 0,
            belum_dinilai: (parseInt(row.total_siswa) || 0) - (parseInt(row.sudah_dinilai) || 0),
            jenis: row.jenis
        }));

        console.log('📊 Final data:', JSON.stringify(data, null, 2));
        console.log('═══════════════════════════════════════');

        res.json({ success: true, data });
    } catch (err) {
        console.error('❌ Error getProgressPenilaian:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getKelasSaya,
    getSiswaByKelas,
    getProgressPenilaian
};