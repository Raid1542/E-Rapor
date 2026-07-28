/**
 * Nama File: mapelModel.js
 * Fungsi: Model CRUD mata pelajaran (validasi duplikasi dan urutan rapor).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

const mapelModel = {
  /**
   * Ambil semua mata pelajaran per tahun ajaran.
   */
  async getAllByTahunAjaran(tahunAjaranId) {
    try {
      const [rows] = await db.execute(`
        SELECT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.jenis, mp.kurikulum,
               mp.tahun_ajaran_id, mp.urutan_rapor, ta.tahun_ajaran, ta.semester
        FROM mata_pelajaran mp
        JOIN tahun_ajaran ta ON mp.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE mp.tahun_ajaran_id = ?
        ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.nama_mapel ASC
      `, [tahunAjaranId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data mata pelajaran per tahun ajaran');
    }
  },

  /**
   * Ambil detail mata pelajaran berdasarkan ID.
   */
  async getById(id) {
    try {
      const [rows] = await db.execute(`
        SELECT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.jenis, mp.kurikulum,
               mp.tahun_ajaran_id, mp.urutan_rapor, ta.tahun_ajaran, ta.semester
        FROM mata_pelajaran mp
        JOIN tahun_ajaran ta ON mp.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE mp.id_mata_pelajaran = ?
      `, [id]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil detail mata pelajaran');
    }
  },

  /**
   * Tambah data mata pelajaran baru.
   */
  async create(data) {
    try {
      const { kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor = null } = data;
      const [result] = await db.execute(
        `INSERT INTO mata_pelajaran (kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor]
      );
      return result.insertId;
    } catch (err) {
      throw new Error('Gagal membuat data mata pelajaran');
    }
  },

  /**
   * Update data mata pelajaran.
   */
  async update(id, data) {
    try {
      const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = data;
      const [result] = await db.execute(
        `UPDATE mata_pelajaran SET kode_mapel = ?, nama_mapel = ?, jenis = ?, kurikulum = ?,
         urutan_rapor = ?, updated_at = NOW() WHERE id_mata_pelajaran = ?`,
        [kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor, id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Gagal mengupdate data mata pelajaran');
    }
  },

  /**
   * Hapus data mata pelajaran.
   */
  async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM mata_pelajaran WHERE id_mata_pelajaran = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Gagal menghapus data mata pelajaran');
    }
  },

  /**
   * Cek apakah kode mata pelajaran sudah ada.
   */
  async isKodeMapelExist(kodeMapel, tahunAjaranId, excludeId = null) {
    try {
      let sql = 'SELECT 1 FROM mata_pelajaran WHERE UPPER(kode_mapel) = ? AND tahun_ajaran_id = ?';
      const params = [kodeMapel.toUpperCase(), tahunAjaranId];
      
      if (excludeId != null) {
        sql += ' AND id_mata_pelajaran != ?';
        params.push(excludeId);
      }
      
      const [rows] = await db.execute(sql, params);
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal mengecek keberadaan kode mata pelajaran');
    }
  },

  /**
   * Cek apakah nama mata pelajaran sudah ada.
   */
  async isNamaMapelExist(namaMapel, tahunAjaranId, excludeId = null) {
    try {
      let sql = 'SELECT id_mata_pelajaran, kode_mapel FROM mata_pelajaran WHERE LOWER(nama_mapel) = ? AND tahun_ajaran_id = ?';
      const params = [namaMapel.toLowerCase(), tahunAjaranId];
      
      if (excludeId != null) {
        sql += ' AND id_mata_pelajaran != ?';
        params.push(excludeId);
      }
      
      const [rows] = await db.execute(sql, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      throw new Error('Gagal mengecek keberadaan nama mata pelajaran');
    }
  },

  /**
   * Cek apakah urutan rapor sudah ada.
   */
  async isUrutanRaporExist(urutanRapor, tahunAjaranId, excludeId = null) {
    try {
      let sql = 'SELECT id_mata_pelajaran, nama_mapel FROM mata_pelajaran WHERE urutan_rapor = ? AND tahun_ajaran_id = ?';
      const params = [urutanRapor, tahunAjaranId];
      
      if (excludeId != null) {
        sql += ' AND id_mata_pelajaran != ?';
        params.push(excludeId);
      }
      
      const [rows] = await db.execute(sql, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      throw new Error('Gagal mengecek keberadaan urutan rapor');
    }
  },

  /**
   * Validasi apakah tahun ajaran valid.
   */
  async isTahunAjaranValid(tahunAjaranId) {
    try {
      const [rows] = await db.execute('SELECT 1 FROM tahun_ajaran WHERE id_tahun_ajaran = ?', [tahunAjaranId]);
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal memvalidasi tahun ajaran');
    }
  },

  /**
   * Cek apakah mata pelajaran sudah digunakan dalam pembelajaran.
   */
  async isUsedInPembelajaran(id) {
    try {
      const [rows] = await db.execute('SELECT COUNT(*) AS jumlah FROM pembelajaran WHERE mapel_id = ?', [id]);
      return rows[0].jumlah;
    } catch (err) {
      throw new Error('Gagal mengecek penggunaan mata pelajaran di pembelajaran');
    }
  },

  /**
   * Cek apakah mata pelajaran sudah memiliki nilai rapor.
   */
  async hasNilaiRapor(id) {
    try {
      const [rows] = await db.execute('SELECT COUNT(*) AS jumlah FROM nilai_rapor WHERE mapel_id = ?', [id]);
      return rows[0].jumlah;
    } catch (err) {
      throw new Error('Gagal mengecek keberadaan nilai rapor untuk mata pelajaran');
    }
  }
};

module.exports = mapelModel;