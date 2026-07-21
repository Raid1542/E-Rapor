/**
 * Nama File: bobotPenilaianModel.js
 * Fungsi: Model konfigurasi bobot komponen penilaian per mata pelajaran.
 *         Menangani CRUD bobot untuk perhitungan nilai rapor otomatis.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta untuk nilai bobot total yang valid
const TOTAL_BOBOT_VALID = 100;

// Konstanta untuk query SQL
const QUERY_GET_BOBOT_BY_MAPEL = `
  SELECT komponen_id, bobot, is_active 
  FROM konfigurasi_mapel_komponen 
  WHERE mapel_id = ? 
  ORDER BY komponen_id
`;

const QUERY_DELETE_BOBOT = `
  DELETE FROM konfigurasi_mapel_komponen 
  WHERE mapel_id = ?
`;

const QUERY_INSERT_BOBOT = `
  INSERT INTO konfigurasi_mapel_komponen 
  (mapel_id, komponen_id, bobot, is_active) 
  VALUES (?, ?, ?, ?)
`;

const QUERY_GET_TOTAL_BOBOT = `
  SELECT SUM(bobot) AS total 
  FROM konfigurasi_mapel_komponen 
  WHERE mapel_id = ? AND is_active = 1
`;

const bobotPenilaianModel = {
  /**
   * Ambil semua bobot komponen untuk satu mata pelajaran.
   */
  async getBobotByMapel(mapelId) {
    if (!mapelId) {
      throw new Error('ID mata pelajaran wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_BOBOT_BY_MAPEL, [mapelId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data bobot');
    }
  },

  /**
   * Update semua bobot untuk satu mata pelajaran (hapus lama dan insert baru).
   */
  async updateBobotByMapel(mapelId, bobotList) {
    if (!mapelId) {
      throw new Error('ID mata pelajaran wajib diisi');
    }

    if (!Array.isArray(bobotList) || bobotList.length === 0) {
      throw new Error('Daftar bobot harus berupa array yang tidak kosong');
    }

    try {
      // Hapus bobot lama
      await db.execute(QUERY_DELETE_BOBOT, [mapelId]);

      // Insert bobot baru
      for (const item of bobotList) {
        if (!item.komponen_id || item.bobot === undefined) {
          throw new Error('Data bobot tidak lengkap');
        }

        await db.execute(QUERY_INSERT_BOBOT, [
          mapelId,
          item.komponen_id,
          item.bobot,
          item.is_active
        ]);
      }

      // Ambil kembali bobot yang baru disimpan
      const [rows] = await db.execute(QUERY_GET_BOBOT_BY_MAPEL, [mapelId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal memperbarui bobot');
    }
  },

  /**
   * Hitung total bobot aktif untuk validasi (harus sama dengan 100).
   */
  async getTotalBobot(mapelId) {
    if (!mapelId) {
      throw new Error('ID mata pelajaran wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_TOTAL_BOBOT, [mapelId]);
      return rows[0]?.total || 0;
    } catch (err) {
      throw new Error('Gagal menghitung total bobot');
    }
  }
};

module.exports = bobotPenilaianModel;