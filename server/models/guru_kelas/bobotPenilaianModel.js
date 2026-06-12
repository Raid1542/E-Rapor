/**
 * Nama File: BobotPenilaianModel.js
 * Fungsi: Model untuk mengelola konfigurasi bobot komponen penilaian per mata pelajaran,
 *         mencakup pengambilan, pembaruan, dan validasi total bobot (harus 100%).
 * Pembuat: Raid Aqil Athallah - NIM: 33124010122
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

const BobotPenilaianModel = {
  // Mengambil semua bobot komponen untuk satu mata pelajaran
  async getBobotByMapel(mapelId) {
    const [rows] = await db.execute(
      `
        SELECT komponen_id, bobot, is_active
        FROM konfigurasi_mapel_komponen
        WHERE mapel_id = ?
        ORDER BY komponen_id
      `,
      [mapelId]
    );
    return rows;
  },

  // Memperbarui semua bobot untuk satu mata pelajaran (hapus lalu sisipkan ulang)
  async updateBobotByMapel(mapelId, bobotList) {
    await db.execute(
      'DELETE FROM konfigurasi_mapel_komponen WHERE mapel_id = ?',
      [mapelId]
    );

    for (const item of bobotList) {
      await db.execute(
        `
          INSERT INTO konfigurasi_mapel_komponen (mapel_id, komponen_id, bobot, is_active)
          VALUES (?, ?, ?, ?)
        `,
        [mapelId, item.komponen_id, item.bobot, item.is_active]
      );
    }

    const [rows] = await db.execute(
      `
        SELECT komponen_id, bobot, is_active
        FROM konfigurasi_mapel_komponen
        WHERE mapel_id = ?
      `,
      [mapelId]
    );
    return rows;
  },

  // Menghitung total bobot aktif untuk validasi (harus = 100)
  async getTotalBobot(mapelId) {
    const [rows] = await db.execute(
      `
        SELECT SUM(bobot) AS total
        FROM konfigurasi_mapel_komponen
        WHERE mapel_id = ? AND is_active = 1
      `,
      [mapelId]
    );
    return rows[0]?.total || 0;
  },
};

module.exports = BobotPenilaianModel;