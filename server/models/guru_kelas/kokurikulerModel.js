/**
 * Nama File: kokurikulerModel.js
 * Fungsi: Model untuk mengelola nilai kokurikuler siswa,
 *         mencakup operasi pengambilan, penyimpanan, dan konfigurasi grade.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

const kokurikulerModel = {
  // Mengambil data nilai kokurikuler berdasarkan siswa, kelas, tahun ajaran, dan semester
  async getBySiswaAndKelas(siswaId, kelasId, tahunAjaranId, semester) {
    const sql = `
      SELECT 
          mutabaah_nilai, mutabaah_grade, mutabaah_deskripsi,
          bpi_nilai, bpi_grade, bpi_deskripsi,
          literasi_nilai, literasi_grade, literasi_deskripsi,
          judul_proyek_nilai, judul_proyek_grade, judul_proyek_deskripsi
      FROM nilai_kokurikuler
      WHERE siswa_id = ? 
        AND kelas_id = ? 
        AND tahun_ajaran_id = ? 
        AND semester = ?
    `;
    const [rows] = await db.execute(sql, [siswaId, kelasId, tahunAjaranId, semester]);
    return rows[0] || null;
  },

  // Menyimpan atau memperbarui data nilai kokurikuler (upsert)
  async save(siswaId, kelasId, tahunAjaranId, semester, data) {
    const {
      mutabaah_nilai,
      mutabaah_grade,
      mutabaah_deskripsi,
      bpi_nilai,
      bpi_grade,
      bpi_deskripsi,
      literasi_nilai,
      literasi_grade,
      literasi_deskripsi,
      judul_proyek_nilai,
      judul_proyek_grade,
      judul_proyek_deskripsi,
    } = data;

    const sql = `
      INSERT INTO nilai_kokurikuler 
        (siswa_id, kelas_id, tahun_ajaran_id, semester,
         mutabaah_nilai, mutabaah_grade, mutabaah_deskripsi,
         bpi_nilai, bpi_grade, bpi_deskripsi,
         literasi_nilai, literasi_grade, literasi_deskripsi,
         judul_proyek_nilai, judul_proyek_grade, judul_proyek_deskripsi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        mutabaah_nilai = VALUES(mutabaah_nilai),
        mutabaah_grade = VALUES(mutabaah_grade),
        mutabaah_deskripsi = VALUES(mutabaah_deskripsi),
        bpi_nilai = VALUES(bpi_nilai),
        bpi_grade = VALUES(bpi_grade),
        bpi_deskripsi = VALUES(bpi_deskripsi),
        literasi_nilai = VALUES(literasi_nilai),
        literasi_grade = VALUES(literasi_grade),
        literasi_deskripsi = VALUES(literasi_deskripsi),
        judul_proyek_nilai = VALUES(judul_proyek_nilai),
        judul_proyek_grade = VALUES(judul_proyek_grade),
        judul_proyek_deskripsi = VALUES(judul_proyek_deskripsi),
        updated_at = CURRENT_TIMESTAMP
    `;
    const [result] = await db.execute(sql, [
      siswaId,
      kelasId,
      tahunAjaranId,
      semester,
      mutabaah_nilai,
      mutabaah_grade,
      mutabaah_deskripsi,
      bpi_nilai,
      bpi_grade,
      bpi_deskripsi,
      literasi_nilai,
      literasi_grade,
      literasi_deskripsi,
      judul_proyek_nilai,
      judul_proyek_grade,
      judul_proyek_deskripsi,
    ]);
    return result;
  },

  // Mengambil konfigurasi nilai kokurikuler (grade dan deskripsi)
  async getKonfigurasi() {
    const sql = `
      SELECT kategori, min_nilai, max_nilai, grade, deskripsi, urutan
      FROM konfigurasi_nilai_kokurikuler
      ORDER BY kategori, urutan
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },
};

module.exports = kokurikulerModel;