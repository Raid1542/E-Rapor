/**
 * Nama File: BobotPenilaianModel.js
 * Fungsi: Model konfigurasi bobot komponen penilaian per mapel
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

const BobotPenilaianModel = {
  // Ambil semua bobot komponen untuk satu mata pelajaran
  async getBobotByMapel(mapelId) {
    const [rows] = await db.execute(
      'SELECT komponen_id, bobot, is_active FROM konfigurasi_mapel_komponen WHERE mapel_id = ? ORDER BY komponen_id',
      [mapelId]
    );
    return rows;
  },

  // Update semua bobot untuk satu mapel (hapus lama + insert baru)
  async updateBobotByMapel(mapelId, bobotList) {
    await db.execute('DELETE FROM konfigurasi_mapel_komponen WHERE mapel_id = ?', [mapelId]);
    for (const item of bobotList) {
      await db.execute(
        'INSERT INTO konfigurasi_mapel_komponen (mapel_id, komponen_id, bobot, is_active) VALUES (?, ?, ?, ?)',
        [mapelId, item.komponen_id, item.bobot, item.is_active]
      );
    }
    const [rows] = await db.execute(
      'SELECT komponen_id, bobot, is_active FROM konfigurasi_mapel_komponen WHERE mapel_id = ?',
      [mapelId]
    );
    return rows;
  },

  // Hitung total bobot aktif untuk validasi (harus = 100)
  async getTotalBobot(mapelId) {
    const [rows] = await db.execute(
      'SELECT SUM(bobot) AS total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND is_active = 1',
      [mapelId]
    );
    return rows[0]?.total || 0;
  },
};

module.exports = BobotPenilaianModel;