/**
 * Nama File: komponenPenilaianModel.js
 * Fungsi: Model komponen penilaian akademik (UH, PTS, PAS, dll).
 *         Menangani pengambilan data komponen penilaian untuk perhitungan nilai.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta untuk query SQL
const QUERY_GET_ALL_KOMPONEN = `
  SELECT id_komponen, nama_komponen, urutan 
  FROM komponen_penilaian 
  ORDER BY urutan ASC
`;

const QUERY_GET_KOMPONEN_BY_ID = `
  SELECT id_komponen, nama_komponen, urutan 
  FROM komponen_penilaian 
  WHERE id_komponen = ?
`;

const komponenPenilaianModel = {
  /**
   * Ambil semua komponen penilaian aktif (urut berdasarkan urutan).
   */
  async getAllKomponen() {
    try {
      const [rows] = await db.execute(QUERY_GET_ALL_KOMPONEN);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil komponen penilaian');
    }
  },

  /**
   * Ambil komponen penilaian berdasarkan ID.
   */
  async getKomponenById(id) {
    if (!id) {
      throw new Error('ID komponen wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_KOMPONEN_BY_ID, [id]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil komponen penilaian');
    }
  }
};

module.exports = komponenPenilaianModel;