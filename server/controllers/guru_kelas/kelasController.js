/**
 * Nama File: kelasController.js
 * Fungsi: Controller untuk guru kelas - data kelas, siswa, dan progress penilaian
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET KELAS SAYA
// ═════════════════════════════════════════════════════════════════════════════

// Ambil data kelas yang diampu guru (1 kelas per guru)
const getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        const [rows] = await db.execute(
            `SELECT 
        k.id_kelas,
        k.nama_kelas,
        COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa
        FROM guru_kelas gk
        INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
        LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
        AND sk.id_tahun_ajaran_induk = ?
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
        GROUP BY k.id_kelas, k.nama_kelas`,
            [idInduk, userId, semesterId]
        );

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
                jumlah_siswa: rows[0].jumlah_siswa || 0,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data kelas: ' + err.message,
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET SISWA BY KELAS
// ═════════════════════════════════════════════════════════════════════════════

// Ambil daftar siswa di kelas yang diampu guru
const getSiswaByKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!idInduk || !semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran tidak lengkap',
            });
        }

        // Ambil kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas, k.fase
        FROM guru_kelas gk
        JOIN kelas k ON gk.kelas_id = k.id_kelas
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada semester ini.',
            });
        }

        const { kelas_id, nama_kelas, fase } = guruKelasRows[0];

        // Ambil siswa di kelas
        const [siswaRows] = await db.execute(
            `SELECT
        s.id_siswa AS id,
        s.nis, s.nisn, s.nama_lengkap AS nama,
        s.tempat_lahir, s.tanggal_lahir, s.jenis_kelamin, s.status,
        ? AS kelas,
        ? AS fase
        FROM siswa s
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
        ORDER BY s.nama_lengkap`,
            [nama_kelas, fase, kelas_id, idInduk]
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
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. GET PROGRESS PENILAIAN
// ═════════════════════════════════════════════════════════════════════════════

// Ambil progress penilaian per mata pelajaran (total vs sudah dinilai)
const getProgressPenilaian = async (req, res) => {
    try {
        const userId = req.user.id;
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        // Ambil kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id FROM guru_kelas gk 
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const kelasId = guruKelasRows[0].kelas_id;

        // Ambil info semester
        const [semesterInfo] = await db.execute(
            `SELECT semester, status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );

        const semesterAktif = semesterInfo[0]?.semester || 'Ganjil';
        const statusPts = semesterInfo[0]?.status_pts || 'nonaktif';
        const statusPas = semesterInfo[0]?.status_pas || 'nonaktif';

        // Tentukan jenis penilaian aktif
        let jenisPenilaianAktif = null;
        if (statusPts === 'aktif') {
            jenisPenilaianAktif = 'PTS';
        } else if (statusPas === 'aktif') {
            jenisPenilaianAktif = 'PAS';
        }

        if (!jenisPenilaianAktif) {
            return res.json({
                success: true,
                data: [],
                message: 'Belum ada periode penilaian yang aktif',
            });
        }

        // Hitung progress per mapel
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
            AND nr.jenis_penilaian = ?
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
                kelasId, idInduk,
                semesterId, semesterAktif, jenisPenilaianAktif,
                kelasId, idInduk,
                kelasId, semesterId,
            ]
        );

        const data = progressRows.map(row => ({
            mata_pelajaran: row.nama_mapel,
            kode_mapel: row.kode_mapel,
            total_siswa: parseInt(row.total_siswa) || 0,
            sudah_dinilai: parseInt(row.sudah_dinilai) || 0,
            belum_dinilai: (parseInt(row.total_siswa) || 0) - (parseInt(row.sudah_dinilai) || 0),
            jenis: row.jenis,
        }));

        res.json({
            success: true,
            data,
            jenis_penilaian: jenisPenilaianAktif,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    getKelasSaya,
    getSiswaByKelas,
    getProgressPenilaian,
};