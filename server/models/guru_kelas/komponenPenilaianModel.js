/**
 * Nama File: komponenPenilaianModel.js
 * Fungsi: Model komponen penilaian akademik (UH, PTS, PAS, dll)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

const komponenPenilaianModel = {
  // Ambil semua komponen penilaian aktif (urut berdasarkan urutan)
  async getAllKomponen() {
    const [rows] = await db.execute(
      'SELECT id_komponen, nama_komponen, urutan FROM komponen_penilaian ORDER BY urutan ASC'
    );
    return rows;
  },

  // Ambil komponen penilaian berdasarkan ID
  async getKomponenById(id) {
    const [rows] = await db.execute(
      'SELECT id_komponen, nama_komponen, urutan FROM komponen_penilaian WHERE id_komponen = ?',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = komponenPenilaianModel;