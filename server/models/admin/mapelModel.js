/**
 * Nama File: mapelModel.js
 * Fungsi: Model CRUD mata pelajaran (validasi duplikasi, urutan rapor)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

const mapelModel = {
  /** Ambil semua mapel per tahun ajaran */
  async getAllByTahunAjaran(tahun_ajaran_id) {
    const [rows] = await db.execute(`
      SELECT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.jenis, mp.kurikulum,
             mp.tahun_ajaran_id, mp.urutan_rapor, ta.tahun_ajaran, ta.semester
      FROM mata_pelajaran mp
      JOIN tahun_ajaran ta ON mp.tahun_ajaran_id = ta.id_tahun_ajaran
      WHERE mp.tahun_ajaran_id = ?
      ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.nama_mapel ASC
    `, [tahun_ajaran_id]);
    return rows;
  },

  /** Ambil mapel by ID */
  async getById(id) {
    const [rows] = await db.execute(`
      SELECT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.jenis, mp.kurikulum,
             mp.tahun_ajaran_id, mp.urutan_rapor, ta.tahun_ajaran, ta.semester
      FROM mata_pelajaran mp
      JOIN tahun_ajaran ta ON mp.tahun_ajaran_id = ta.id_tahun_ajaran
      WHERE mp.id_mata_pelajaran = ?
    `, [id]);
    return rows;
  },

  /** Tambah mapel baru */
  async create(data) {
    const { kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor = null } = data;
    const [result] = await db.execute(
      `INSERT INTO mata_pelajaran (kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor]
    );
    return result;
  },

  /** Update mapel */
  async update(id, data) {
    const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = data;
    const [result] = await db.execute(
      `UPDATE mata_pelajaran SET kode_mapel = ?, nama_mapel = ?, jenis = ?, kurikulum = ?,
       urutan_rapor = ?, updated_at = NOW() WHERE id_mata_pelajaran = ?`,
      [kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor, id]
    );
    return result;
  },

  /** Hapus mapel */
  async delete(id) {
    const [result] = await db.execute('DELETE FROM mata_pelajaran WHERE id_mata_pelajaran = ?', [id]);
    return result;
  },

  /** Cek duplikasi kode mapel */
  async isKodeMapelExist(kode_mapel, tahun_ajaran_id, excludeId = null) {
    let sql = 'SELECT 1 FROM mata_pelajaran WHERE UPPER(kode_mapel) = ? AND tahun_ajaran_id = ?';
    const params = [kode_mapel.toUpperCase(), tahun_ajaran_id];
    if (excludeId != null) { sql += ' AND id_mata_pelajaran != ?'; params.push(excludeId); }
    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  },

  /** Cek duplikasi nama mapel */
  async isNamaMapelExist(nama_mapel, tahun_ajaran_id, excludeId = null) {
    let sql = 'SELECT id_mata_pelajaran, kode_mapel FROM mata_pelajaran WHERE LOWER(nama_mapel) = ? AND tahun_ajaran_id = ?';
    const params = [nama_mapel.toLowerCase(), tahun_ajaran_id];
    if (excludeId != null) { sql += ' AND id_mata_pelajaran != ?'; params.push(excludeId); }
    const [rows] = await db.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  },

  /** Cek duplikasi urutan rapor */
  async isUrutanRaporExist(urutan_rapor, tahun_ajaran_id, excludeId = null) {
    let sql = 'SELECT id_mata_pelajaran, nama_mapel FROM mata_pelajaran WHERE urutan_rapor = ? AND tahun_ajaran_id = ?';
    const params = [urutan_rapor, tahun_ajaran_id];
    if (excludeId != null) { sql += ' AND id_mata_pelajaran != ?'; params.push(excludeId); }
    const [rows] = await db.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  },

  /** Validasi tahun ajaran */
  async isTahunAjaranValid(tahun_ajaran_id) {
    const [rows] = await db.execute('SELECT 1 FROM tahun_ajaran WHERE id_tahun_ajaran = ?', [tahun_ajaran_id]);
    return rows.length > 0;
  },

  /** Cek mapel digunakan di pembelajaran */
  async isUsedInPembelajaran(id) {
    const [rows] = await db.execute('SELECT COUNT(*) as jumlah FROM pembelajaran WHERE mapel_id = ?', [id]);
    return rows[0].jumlah;
  },

  /** Cek mapel punya nilai rapor */
  async hasNilaiRapor(id) {
    const [rows] = await db.execute('SELECT COUNT(*) as jumlah FROM nilai_rapor WHERE mapel_id = ?', [id]);
    return rows[0].jumlah;
  }
};

module.exports = mapelModel;