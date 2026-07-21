/**
 * Nama File: kokurikulerModel.js
 * Fungsi: Model untuk manajemen nilai kokurikuler siswa.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

const kokurikulerModel = {
    /**
     * Mengambil daftar siswa di kelas tertentu.
     */
    async getSiswaByKelas(kelasId, idInduk) {
        try {
            const query = `
        SELECT s.id_siswa, s.nama_lengkap, s.nis, s.nisn 
        FROM siswa s 
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
        ORDER BY s.nama_lengkap ASC
        `;
            const [rows] = await db.execute(query, [kelasId, idInduk]);
            return rows;
        } catch (err) {
            throw new Error('Gagal mengambil daftar siswa');
        }
    },

    /**
     * Mengambil data nilai kokurikuler untuk semua siswa di kelas tertentu.
     */
    async getNilaiByKelas(kelasId, semesterId, semester, jenisPenilaian) {
        try {
            const query = `
        SELECT nk.id_siswa, nk.id_aspek_kokurikuler, nk.nilai, nk.grade, nk.deskripsi, nk.id_judul_proyek
        FROM nilai_kokurikuler nk
        INNER JOIN siswa_kelas sk ON nk.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
        `;
            const [rows] = await db.execute(query, [kelasId, semesterId, semester, jenisPenilaian]);
            return rows;
        } catch (err) {
            throw new Error('Gagal mengambil data nilai kokurikuler kelas');
        }
    },

    /**
     * Mengambil data nilai kokurikuler untuk satu siswa tertentu.
     */
    async getNilaiBySiswa(siswaId, kelasId, semesterId, semester, jenisPenilaian) {
        try {
            const query = `
        SELECT nk.id_aspek_kokurikuler, nk.nilai, nk.grade, nk.deskripsi, nk.id_judul_proyek
        FROM nilai_kokurikuler nk
        WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
        `;
            const [rows] = await db.execute(query, [siswaId, semesterId, semester, jenisPenilaian]);
            return rows;
        } catch (err) {
            throw new Error('Gagal mengambil data nilai kokurikuler siswa');
        }
    },

    /**
     * Mengecek apakah data nilai kokurikuler sudah ada untuk siswa dan aspek tertentu.
     */
    async checkExistingNilai(siswaId, aspekId, kelasId, semesterId, semester, jenisPenilaian) {
        try {
            const query = `
        SELECT id_nilai_kokurikuler FROM nilai_kokurikuler 
        WHERE id_siswa = ? AND id_aspek_kokurikuler = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?
        `;
            const [rows] = await db.execute(query, [siswaId, aspekId, semesterId, semester, jenisPenilaian]);
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            throw new Error('Gagal mengecek data nilai yang sudah ada');
        }
    },

    /**
     * Mengupdate data nilai kokurikuler yang sudah ada.
     */
    async updateNilai(idNilaiKokurikuler, nilai, grade, deskripsi, idJudulProyek) {
        try {
            const query = `
        UPDATE nilai_kokurikuler 
        SET nilai = ?, grade = ?, deskripsi = ?, id_judul_proyek = ?, updated_at = NOW() 
        WHERE id_nilai_kokurikuler = ?
        `;
            await db.execute(query, [nilai, grade, deskripsi, idJudulProyek, idNilaiKokurikuler]);
        } catch (err) {
            throw new Error('Gagal mengupdate data nilai kokurikuler');
        }
    },

    /**
     * Menyisipkan data nilai kokurikuler baru.
     */
    async insertNilai(siswaId, aspekId, kelasId, semesterId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek) {
        try {
            const query = `
        INSERT INTO nilai_kokurikuler 
        (id_siswa, id_aspek_kokurikuler, id_kelas, id_tahun_ajaran, semester, jenis_penilaian, nilai, grade, deskripsi, id_judul_proyek, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
            await db.execute(query, [siswaId, aspekId, kelasId, semesterId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek]);
        } catch (err) {
            throw new Error('Gagal menyisipkan data nilai kokurikuler baru');
        }
    }
};

module.exports = kokurikulerModel;