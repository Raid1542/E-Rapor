/**
 * Nama File: komponenPenilaianModel.js
 * Fungsi: Model untuk mengelola data komponen penilaian akademik (misal: UH1, PTS, PAS),
 *         mencakup pengambilan semua komponen dan pencarian berdasarkan ID.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

const komponenPenilaianModel = {
  // Mengambil semua komponen penilaian aktif, diurutkan berdasarkan urutan
  async getAllKomponen() {
    const [rows] = await db.execute(
      `
        SELECT id_komponen, nama_komponen, urutan
        FROM komponen_penilaian
        ORDER BY urutan ASC
      `
    );
    return rows;
  },

  // Mengambil komponen penilaian berdasarkan ID
  async getKomponenById(id) {
    const [rows] = await db.execute(
      `
        SELECT id_komponen, nama_komponen, urutan
        FROM komponen_penilaian
        WHERE id_komponen = ?
      `,
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = komponenPenilaianModel;