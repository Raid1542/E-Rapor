/**
 * Nama File: konfigurasiNilaiKokurikuler.js
 * Fungsi: Model konfigurasi grade & deskripsi nilai kokurikuler
 *         Menangani CRUD kategori grade kokurikuler (BPI, Proyek, Literasi, Mutaba'ah)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta untuk nilai default
const DEFAULT_GRADE = 'D';
const DEFAULT_DESKRIPSI = 'Tidak ada konfigurasi yang sesuai';

// Konstanta untuk query SQL
const QUERY_GET_GRADE_DESKRIPSI = `
  SELECT grade, deskripsi FROM kategori_grade_kokurikuler 
  WHERE id_aspek_kokurikuler = ? AND ? BETWEEN rentang_min AND rentang_max 
  ORDER BY urutan ASC LIMIT 1
`;

const QUERY_GET_ALL_KATEGORI = `
  SELECT id_kategori_grade_kokurikuler AS id, id_aspek_kokurikuler, tahun_ajaran_id, 
          rentang_min AS min_nilai, rentang_max AS max_nilai, grade, deskripsi, urutan 
  FROM kategori_grade_kokurikuler 
  WHERE tahun_ajaran_id = ? 
  ORDER BY urutan ASC
`;

const QUERY_CHECK_TAHUN_AJARAN = `
  SELECT semester FROM tahun_ajaran WHERE id_tahun_ajaran = ?
`;

const QUERY_CREATE_KATEGORI = `
  INSERT INTO kategori_grade_kokurikuler 
  (id_aspek_kokurikuler, tahun_ajaran_id, semester, rentang_min, rentang_max, grade, deskripsi, urutan) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const QUERY_UPDATE_KATEGORI = `
  UPDATE kategori_grade_kokurikuler 
  SET id_aspek_kokurikuler = ?, rentang_min = ?, rentang_max = ?, grade = ?, deskripsi = ?, urutan = ? 
  WHERE id_kategori_grade_kokurikuler = ?
`;

const QUERY_DELETE_KATEGORI = `
  DELETE FROM kategori_grade_kokurikuler 
  WHERE id_kategori_grade_kokurikuler = ?
`;

const konfigurasiNilaiKokurikuler = {
  // Dapatkan grade dan deskripsi berdasarkan nilai dan aspek kokurikuler
  async getGradeDeskripsiByNilai(nilai, aspek) {
    const numNilai = Number(nilai);

    if (isNaN(numNilai) || numNilai < 0 || numNilai > 100 || !aspek) {
      return { grade: DEFAULT_GRADE, deskripsi: 'Nilai atau aspek tidak valid' };
    }

    try {
      const [rows] = await db.execute(QUERY_GET_GRADE_DESKRIPSI, [aspek, numNilai]);
      if (rows.length === 0) {
        return { grade: DEFAULT_GRADE, deskripsi: DEFAULT_DESKRIPSI };
      }
      return { grade: rows[0].grade, deskripsi: rows[0].deskripsi };
    } catch (err) {
      console.error('Error getGradeDeskripsiByNilai:', err);
      throw new Error('Gagal mengambil grade dan deskripsi');
    }
  },

  // Ambil semua kategori grade kokurikuler berdasarkan tahun ajaran
  async getAllKategori(tahunAjaranId) {
    if (!tahunAjaranId) {
      throw new Error('Tahun ajaran wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_ALL_KATEGORI, [tahunAjaranId]);
      return rows;
    } catch (err) {
      console.error('Error getAllKategori:', err);
      throw new Error('Gagal mengambil kategori');
    }
  },

  // Buat kategori grade kokurikuler baru
  async createKategori({ id_aspek_kokurikuler, tahun_ajaran_id, min_nilai, max_nilai, grade, deskripsi, urutan }) {
    if (!id_aspek_kokurikuler || !tahun_ajaran_id || !grade || !deskripsi) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      // Cek tahun ajaran ada
      const [taRows] = await db.execute(QUERY_CHECK_TAHUN_AJARAN, [tahun_ajaran_id]);
      if (taRows.length === 0) {
        throw new Error('Tahun ajaran tidak ditemukan');
      }

      const semester = taRows[0].semester;

      const [result] = await db.execute(QUERY_CREATE_KATEGORI, [
        id_aspek_kokurikuler,
        tahun_ajaran_id,
        semester,
        min_nilai,
        max_nilai,
        grade,
        deskripsi,
        urutan || 0,
      ]);

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
    } catch (err) {
      console.error('Error createKategori:', err);
      throw err;
    }
  },

  // Perbarui kategori grade kokurikuler
  async updateKategori(id, { id_aspek_kokurikuler, min_nilai, max_nilai, grade, deskripsi, urutan }) {
    if (!id || !id_aspek_kokurikuler || !grade || !deskripsi) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [result] = await db.execute(QUERY_UPDATE_KATEGORI, [
        id_aspek_kokurikuler,
        min_nilai,
        max_nilai,
        grade,
        deskripsi,
        urutan || 0,
        id,
      ]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Error updateKategori:', err);
      throw new Error('Gagal memperbarui kategori');
    }
  },

  // Hapus kategori grade kokurikuler (hard delete)
  async deleteKategori(id) {
    if (!id) {
      throw new Error('ID kategori wajib diisi');
    }

    try {
      const [result] = await db.execute(QUERY_DELETE_KATEGORI, [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Error deleteKategori:', err);
      throw new Error('Gagal menghapus kategori');
    }
  },
};

module.exports = konfigurasiNilaiKokurikuler;