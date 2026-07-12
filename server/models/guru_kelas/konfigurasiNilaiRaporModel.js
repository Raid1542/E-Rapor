/**
 * Nama File: konfigurasiNilaiRaporModel.js
 * Fungsi: Model konfigurasi nilai rapor akademik (deskripsi per rentang nilai)
 *         Menangani CRUD kategori nilai rapor dan deskripsi otomatis
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta untuk query SQL
const QUERY_GET_DESKRIPSI_BASE = `
  SELECT deskripsi FROM konfigurasi_nilai_rapor 
  WHERE mapel_id = ? AND ? BETWEEN min_nilai AND max_nilai AND is_active = 1
`;

const QUERY_GET_ALL_KATEGORI_BASE = `
  SELECT id_config AS id, mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan 
  FROM konfigurasi_nilai_rapor 
  WHERE is_active = 1 AND tahun_ajaran_id = ?
`;

const QUERY_CREATE_KATEGORI = `
  INSERT INTO konfigurasi_nilai_rapor 
  (mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan, is_active) 
  VALUES (?, ?, ?, ?, ?, ?, 1)
`;

const QUERY_GET_NEW_KATEGORI = `
  SELECT id_config AS id, mapel_id, min_nilai, max_nilai, deskripsi, urutan, is_active, created_at, updated_at 
  FROM konfigurasi_nilai_rapor 
  WHERE id_config = ?
`;

const QUERY_UPDATE_KATEGORI = `
  UPDATE konfigurasi_nilai_rapor 
  SET mapel_id = ?, min_nilai = ?, max_nilai = ?, deskripsi = ?, urutan = ?, updated_at = NOW() 
  WHERE id_config = ?
`;

const QUERY_DELETE_KATEGORI = `
  UPDATE konfigurasi_nilai_rapor 
  SET is_active = 0, updated_at = NOW() 
  WHERE id_config = ?
`;

const konfigurasiNilaiRaporModel = {
  // Dapatkan deskripsi berdasarkan nilai numerik dan mata pelajaran
  async getDeskripsiByNilai(nilai, mapelId, tahunAjaranId = null, jenisPenilaian = 'PAS') {
    if (nilai == null || mapelId == null) {
      return 'Belum ada deskripsi';
    }

    try {
      let query = QUERY_GET_DESKRIPSI_BASE;
      const params = [mapelId, nilai];

      // Tambah filter tahun ajaran jika ada
      if (tahunAjaranId) {
        query += ' AND tahun_ajaran_id = ?';
        params.push(tahunAjaranId);
      }

      query += ' AND jenis_penilaian = ?';
      params.push(jenisPenilaian);
      query += ' ORDER BY min_nilai DESC LIMIT 1';

      const [rows] = await db.execute(query, params);
      return rows.length > 0 ? rows[0].deskripsi : 'Belum ada deskripsi';
    } catch (err) {
      console.error('Error getDeskripsiByNilai:', err);
      throw new Error('Gagal mengambil deskripsi');
    }
  },

  // Ambil semua kategori/rentang nilai berdasarkan mata pelajaran (atau rata-rata)
  async getAllKategori(mapelId = null, isRataRata = false, tahunAjaranId) {
    if (!tahunAjaranId) {
      throw new Error('Tahun ajaran wajib diisi');
    }

    try {
      let query = QUERY_GET_ALL_KATEGORI_BASE;
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
    } catch (err) {
      console.error('Error getAllKategori:', err);
      throw new Error('Gagal mengambil kategori');
    }
  },

  // Buat kategori baru untuk konfigurasi nilai rapor akademik
  async createKategori({ mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan }) {
    if (!mapel_id || !tahun_ajaran_id || min_nilai == null || max_nilai == null || !deskripsi) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [result] = await db.execute(QUERY_CREATE_KATEGORI, [
        mapel_id,
        tahun_ajaran_id,
        min_nilai,
        max_nilai,
        deskripsi,
        urutan || 0,
      ]);

      const [newRow] = await db.execute(QUERY_GET_NEW_KATEGORI, [result.insertId]);
      return newRow[0];
    } catch (err) {
      console.error('Error createKategori:', err);
      throw new Error('Gagal membuat kategori');
    }
  },

  // Perbarui kategori konfigurasi nilai rapor akademik
  async updateKategori(id, { mapel_id, min_nilai, max_nilai, deskripsi, urutan }) {
    if (!id || mapel_id == null || min_nilai == null || max_nilai == null || !deskripsi) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [result] = await db.execute(QUERY_UPDATE_KATEGORI, [
        mapel_id,
        min_nilai,
        max_nilai,
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

  // Hapus kategori dengan soft-delete (nonaktifkan)
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

module.exports = konfigurasiNilaiRaporModel;