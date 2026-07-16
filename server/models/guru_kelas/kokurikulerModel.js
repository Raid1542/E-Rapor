/**
 * Nama File: kokurikulerModel.js
 * Fungsi: Model untuk manajemen nilai kokurikuler siswa
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 * Update: 15 Juli 2026 - Memperbaiki dan melengkapi semua fungsi agar sesuai dengan panggilan di controller
 */

const db = require('../../config/db');

const kokurikulerModel = {
    /**
     * Mengambil daftar siswa di kelas tertentu
     */
    async getSiswaByKelas(kelasId, idInduk) {
        const [rows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap, s.nis, s.nisn 
             FROM siswa s 
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
             ORDER BY s.nama_lengkap ASC`,
            [kelasId, idInduk]
        );
        return rows;
    },

    /**
     * Mengambil data nilai kokurikuler untuk semua siswa di kelas tertentu
     */
    async getNilaiByKelas(kelasId, semesterId, semester, jenisPenilaian) {
        const [rows] = await db.execute(
            `SELECT nk.id_siswa, nk.id_aspek_kokurikuler, nk.nilai, nk.grade, nk.deskripsi, nk.id_judul_proyek
             FROM nilai_kokurikuler nk
             INNER JOIN siswa_kelas sk ON nk.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?`,
            [kelasId, semesterId, semester, jenisPenilaian]
        );
        return rows;
    },

    /**
     * Mengambil data nilai kokurikuler untuk satu siswa tertentu
     */
    async getNilaiBySiswa(siswaId, kelasId, semesterId, semester, jenisPenilaian) {
        const [rows] = await db.execute(
            `SELECT nk.id_aspek_kokurikuler, nk.nilai, nk.grade, nk.deskripsi, nk.id_judul_proyek
             FROM nilai_kokurikuler nk
             WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?`,
            [siswaId, semesterId, semester, jenisPenilaian]
        );
        return rows;
    },

    /**
     * Mengecek apakah data nilai kokurikuler sudah ada untuk siswa & aspek tertentu
     */
    async checkExistingNilai(siswaId, aspekId, kelasId, semesterId, semester, jenisPenilaian) {
        const [rows] = await db.execute(
            `SELECT id_nilai_kokurikuler FROM nilai_kokurikuler 
             WHERE id_siswa = ? AND id_aspek_kokurikuler = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?`,
            [siswaId, aspekId, semesterId, semester, jenisPenilaian]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Mengupdate data nilai kokurikuler yang sudah ada
     */
    async updateNilai(idNilaiKokurikuler, nilai, grade, deskripsi, idJudulProyek) {
        await db.execute(
            `UPDATE nilai_kokurikuler 
             SET nilai = ?, grade = ?, deskripsi = ?, id_judul_proyek = ?, updated_at = NOW() 
             WHERE id_nilai_kokurikuler = ?`,
            [nilai, grade, deskripsi, idJudulProyek, idNilaiKokurikuler]
        );
    },

    /**
     * Menyisipkan data nilai kokurikuler baru
     */
    async insertNilai(siswaId, aspekId, kelasId, semesterId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek) {
        await db.execute(
            `INSERT INTO nilai_kokurikuler 
             (id_siswa, id_aspek_kokurikuler, id_kelas, id_tahun_ajaran, semester, jenis_penilaian, nilai, grade, deskripsi, id_judul_proyek, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [siswaId, aspekId, kelasId, semesterId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek]
        );
    }
};

module.exports = kokurikulerModel;