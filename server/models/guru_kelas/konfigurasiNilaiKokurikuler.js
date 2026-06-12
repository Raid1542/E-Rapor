/**
 * Nama File: konfigurasiNilaiKokurikuler.js
 * Fungsi: Model untuk mengelola konfigurasi grade dan deskripsi nilai kokurikuler,
 *         berdasarkan nilai numerik dan aspek yang dinilai.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

const konfigurasiNilaiKokurikuler = {
  // Mendapatkan grade dan deskripsi berdasarkan nilai dan aspek kokurikuler
  async getGradeDeskripsiByNilai(nilai, aspek) {
    const numNilai = Number(nilai);
    if (isNaN(numNilai) || numNilai < 0 || numNilai > 100 || !aspek) {
      return { grade: 'D', deskripsi: 'Nilai atau aspek tidak valid' };
    }

    const [rows] = await db.execute(
      `
        SELECT grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_aspek_kokurikuler = ?
          AND ? BETWEEN rentang_min AND rentang_max
        ORDER BY urutan ASC
        LIMIT 1
      `,
      [aspek, numNilai]
    );

    if (rows.length === 0) {
      return { grade: 'D', deskripsi: 'Tidak ada konfigurasi yang sesuai' };
    }

    return {
      grade: rows[0].grade,
      deskripsi: rows[0].deskripsi,
    };
  },

  // Mengambil semua kategori grade kokurikuler berdasarkan tahun ajaran
  async getAllKategori(tahunAjaranId) {
    const [rows] = await db.execute(
      `
        SELECT id_kategori_grade_kokurikuler AS id, id_aspek_kokurikuler, tahun_ajaran_id,
        rentang_min AS min_nilai, rentang_max AS max_nilai, grade, deskripsi, urutan
        FROM kategori_grade_kokurikuler
        WHERE tahun_ajaran_id = ?
        ORDER BY urutan ASC
      `,
      [tahunAjaranId]
    );
    return rows;
  },

  // Membuat kategori grade kokurikuler baru
  async createKategori({
    id_aspek_kokurikuler,
    tahun_ajaran_id,
    min_nilai,
    max_nilai,
    grade,
    deskripsi,
    urutan,
  }) {
    const [taRows] = await db.execute(
      `SELECT semester FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
      [tahun_ajaran_id]
    );

    if (taRows.length === 0) {
      throw new Error('Tahun ajaran tidak ditemukan');
    }
    const semester = taRows[0].semester;

    const [result] = await db.execute(
      `
        INSERT INTO kategori_grade_kokurikuler (
            id_aspek_kokurikuler,
            tahun_ajaran_id,
            semester,
            rentang_min,
            rentang_max,
            grade,
            deskripsi,
            urutan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id_aspek_kokurikuler,
        tahun_ajaran_id,
        semester,
        min_nilai,
        max_nilai,
        grade,
        deskripsi,
        urutan || 0,
      ]
    );

    return {
      id: result.insertId,
      id_aspek_kokurikuler,
      min_nilai,
      max_nilai,
      grade,
      deskripsi,
      urutan: urutan || 0,
      semester,
    };
  },

  // Memperbarui kategori grade kokurikuler
  async updateKategori(id, { id_aspek_kokurikuler, min_nilai, max_nilai, grade, deskripsi, urutan }) {
    const [result] = await db.execute(
      `
        UPDATE kategori_grade_kokurikuler
        SET 
            id_aspek_kokurikuler = ?,
            rentang_min = ?,
            rentang_max = ?,
            grade = ?,
            deskripsi = ?,
            urutan = ?
        WHERE id_kategori_grade_kokurikuler = ?
      `,
      [
        id_aspek_kokurikuler,
        min_nilai,
        max_nilai,
        grade,
        deskripsi,
        urutan || 0,
        id,
      ]
    );

    return result.affectedRows > 0;
  },

  // Menghapus kategori grade kokurikuler (hard delete)
  async deleteKategori(id) {
    const [result] = await db.execute(
      `
        DELETE FROM kategori_grade_kokurikuler
        WHERE id_kategori_grade_kokurikuler = ?
      `,
      [id]
    );

    return result.affectedRows > 0;
  },
};

module.exports = konfigurasiNilaiKokurikuler;