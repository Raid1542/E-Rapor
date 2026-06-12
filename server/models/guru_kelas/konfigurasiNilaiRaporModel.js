/**
 * Nama File: konfigurasiNilaiRaporModel.js
 * Fungsi: Model untuk mengelola konfigurasi nilai rapor akademik,
 *         mencakup pencarian deskripsi berdasarkan nilai,
 *         serta operasi CRUD untuk rentang nilai per mata pelajaran atau rata-rata.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

const konfigurasiNilaiRaporModel = {
  // Mendapatkan deskripsi berdasarkan nilai numerik dan mata pelajaran
  async getDeskripsiByNilai(nilai, mapelId) {
    if (nilai == null || mapelId == null) {
      return 'Belum ada deskripsi';
    }

    const [rows] = await db.execute(
      `
        SELECT deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ?
          AND ? BETWEEN min_nilai AND max_nilai
          AND is_active = 1
        ORDER BY min_nilai DESC
        LIMIT 1
      `,
      [mapelId, nilai]
    );

    return rows.length > 0 ? rows[0].deskripsi : 'Belum ada deskripsi';
  },

  // Mengambil semua kategori/rentang nilai berdasarkan mata pelajaran (atau rata-rata)
  async getAllKategori(mapelId = null, isRataRata = false, tahunAjaranId) {
    let query = `
      SELECT id_config AS id, mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan
      FROM konfigurasi_nilai_rapor
      WHERE is_active = 1 AND tahun_ajaran_id = ?
    `;
    const params = [tahunAjaranId];

    if (isRataRata) {
      query += ' AND mapel_id IS NULL';
    } else if (mapelId !== null) {
      query += ' AND mapel_id = ?';
      params.push(mapelId);
    }

    query += ' ORDER BY urutan ASC';
    const [rows] = await db.execute(query, params);
    return rows;
  },

  // Membuat kategori baru untuk konfigurasi nilai rapor akademik
  async createKategori({ mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan }) {
    const [result] = await db.execute(
      `
        INSERT INTO konfigurasi_nilai_rapor (
          mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
      [mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan || 0]
    );

    const [newRow] = await db.execute(
      `
        SELECT 
            id_config AS id,
            mapel_id,
            min_nilai,
            max_nilai,
            deskripsi,
            urutan,
            is_active,
            created_at,
            updated_at
        FROM konfigurasi_nilai_rapor
        WHERE id_config = ?
      `,
      [result.insertId]
    );

    return newRow[0];
  },

  // Memperbarui kategori konfigurasi nilai rapor akademik
  async updateKategori(id, { mapel_id, min_nilai, max_nilai, deskripsi, urutan }) {
    const [result] = await db.execute(
      `
        UPDATE konfigurasi_nilai_rapor
        SET 
            mapel_id = ?,
            min_nilai = ?,
            max_nilai = ?,
            deskripsi = ?,
            urutan = ?,
            updated_at = NOW()
        WHERE id_config = ?
      `,
      [mapel_id, min_nilai, max_nilai, deskripsi, urutan || 0, id]
    );

    return result.affectedRows > 0;
  },

  // Menghapus kategori dengan soft-delete (nonaktifkan)
  async deleteKategori(id) {
    const [result] = await db.execute(
      `
        UPDATE konfigurasi_nilai_rapor
        SET is_active = 0, updated_at = NOW()
        WHERE id_config = ?
      `,
      [id]
    );

    return result.affectedRows > 0;
  },
};

module.exports = konfigurasiNilaiRaporModel;