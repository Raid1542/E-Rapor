/**
 * Nama File: kelasController.js
 * Fungsi: Mengelola data kelas dan siswa untuk guru kelas
 * 
 * ✅ FIXED: Gunakan id_tahun_ajaran_induk untuk query guru_kelas
 *           Gunakan semester_id untuk query nilai_rapor & pembelajaran
 */

const db = require('../../config/db');

/**
 * GET /kelas
 * Mendapatkan informasi kelas yang diampu oleh guru kelas
 */
const getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        // ✅ PENTING: Gunakan id_tahun_ajaran_induk (bukan semester_id)
        const idInduk = req.idTahunAjaranInduk;

        console.log('📚 [getKelasSaya] userId:', userId, 'idInduk:', idInduk);

        const [rows] = await db.execute(
            `SELECT 
                k.id_kelas,
                k.nama_kelas,
                COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa,
                ta.tahun_ajaran,
                ta.semester
             FROM guru_kelas gk
             INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
             INNER JOIN tahun_ajaran_induk tai ON gk.tahun_ajaran_id = tai.id_tahun_ajaran_induk
             LEFT JOIN tahun_ajaran ta ON ta.id_tahun_ajaran_induk = tai.id_tahun_ajaran_induk AND ta.status = 'aktif'
             LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
                AND sk.id_tahun_ajaran_induk = tai.id_tahun_ajaran_induk
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             GROUP BY k.id_kelas, k.nama_kelas, ta.tahun_ajaran, ta.semester`,
            [userId, idInduk]  // ← Gunakan idInduk (bukan semesterId)
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
        // ✅ PENTING: Gunakan id_tahun_ajaran_induk (bukan semester_id)
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        console.log('🔍 [getSiswaByKelas] START');
        console.log('🔍 userId:', userId);
        console.log('🔍 idInduk:', idInduk);
        console.log('🔍 semesterId:', semesterId);

        if (!idInduk) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID Tahun Ajaran Induk tidak ditemukan' 
            });
        }

        // ✅ Query guru_kelas dengan id_induk
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`, 
            [userId, idInduk]  // ← Gunakan idInduk (bukan semesterId)
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran ini.',
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // ✅ Ambil siswa dengan id_induk
        const [siswaRows] = await db.execute(
            `SELECT
                s.id_siswa AS id,
                s.nis, s.nisn, s.nama_lengkap AS nama,
                s.tempat_lahir, s.tanggal_lahir, s.jenis_kelamin, s.alamat, s.status
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
            ORDER BY s.nama_lengkap`,
            [kelas_id, idInduk]  // ← idInduk sudah benar
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
        // ✅ PENTING: Pisahkan id_induk dan semester_id
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        console.log('═══════════════════════════════════════');
        console.log('📊 [getProgressPenilaian] START');
        console.log('📊 userId:', userId);
        console.log('📊 idInduk:', idInduk);
        console.log('📊 semesterId:', semesterId);

        // 1. ✅ Ambil kelas guru dengan id_induk
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id FROM guru_kelas gk 
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, idInduk]  // ← Gunakan idInduk (bukan semesterId)
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

        // 3. ✅ Query - Campuran id_induk dan semester_id
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
                 AND nr.tahun_ajaran_id = ?          -- ← semester_id (bukan id_induk!)
                 AND nr.semester = ?
                 AND nr.nilai_rapor IS NOT NULL
                 AND nr.siswa_id IN (
                     SELECT sk.siswa_id FROM siswa_kelas sk 
                     WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
                 )) AS sudah_dinilai
             FROM mata_pelajaran mp
             WHERE mp.id_mata_pelajaran IN (
                 SELECT p.mapel_id FROM pembelajaran p 
                 WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?  -- ← semester_id (bukan id_induk!)
             )
             ORDER BY mp.id_mata_pelajaran ASC`,
            [
                kelasId, idInduk,                    // total_siswa (id_induk)
                semesterId, semesterAktif,           // sudah_dinilai (semester_id)
                kelasId, idInduk,                    // sudah_dinilai filter (id_induk)
                kelasId, semesterId                  // WHERE IN (semester_id)
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