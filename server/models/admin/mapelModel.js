/**
 * Nama File: mapelModel.js
 * Fungsi: Model untuk mengelola data mata pelajaran, termasuk validasi,
 *         pengurutan di rapor, dan integrasi dengan tahun ajaran.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 * Update: Perbaikan ORDER BY, hapus tahun_ajaran_id dari UPDATE,
 *         tambah method validasi duplikasi nama & urutan rapor.
 */

const db = require('../../config/db');

const mapelModel = {
  async getAllByTahunAjaran(tahun_ajaran_id) {
    const sql = `
      SELECT 
          mp.id_mata_pelajaran,
          mp.kode_mapel,
          mp.nama_mapel,
          mp.jenis,
          mp.kurikulum,
          mp.tahun_ajaran_id,
          mp.urutan_rapor,
          ta.tahun_ajaran,
          ta.semester
      FROM mata_pelajaran mp
      JOIN tahun_ajaran ta ON mp.tahun_ajaran_id = ta.id_tahun_ajaran
      WHERE mp.tahun_ajaran_id = ?
      ORDER BY 
          mp.urutan_rapor IS NULL,     
          mp.urutan_rapor ASC,         
          mp.nama_mapel ASC            
    `;
    const [rows] = await db.execute(sql, [tahun_ajaran_id]);
    return rows;
  },

  async getById(id) {
    const sql = `
      SELECT 
          mp.id_mata_pelajaran,
          mp.kode_mapel,
          mp.nama_mapel,
          mp.jenis,
          mp.kurikulum,
          mp.tahun_ajaran_id,
          mp.urutan_rapor,
          ta.tahun_ajaran,
          ta.semester
      FROM mata_pelajaran mp
      JOIN tahun_ajaran ta ON mp.tahun_ajaran_id = ta.id_tahun_ajaran
      WHERE mp.id_mata_pelajaran = ?
    `;
    const [rows] = await db.execute(sql, [id]);
    return rows;
  },

  async create(data) {
    const {
      kode_mapel,
      nama_mapel,
      jenis,
      kurikulum,
      tahun_ajaran_id,
      urutan_rapor = null,
    } = data;

    const sql = `
      INSERT INTO mata_pelajaran 
        (kode_mapel, nama_mapel, jenis, kurikulum, tahun_ajaran_id, urutan_rapor)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      kode_mapel,
      nama_mapel,
      jenis,
      kurikulum,
      tahun_ajaran_id,
      urutan_rapor,
    ]);
    return result;
  },

  async update(id, data) {
    const {
      kode_mapel,
      nama_mapel,
      jenis,
      kurikulum,
      urutan_rapor,
    } = data;

    const sql = `
      UPDATE mata_pelajaran 
      SET 
        kode_mapel = ?,
        nama_mapel = ?,
        jenis = ?,
        kurikulum = ?,
        urutan_rapor = ?,
        updated_at = NOW()
      WHERE id_mata_pelajaran = ?
    `;
    const [result] = await db.execute(sql, [
      kode_mapel,
      nama_mapel,
      jenis,
      kurikulum,
      urutan_rapor,
      id,
    ]);
    return result;
  },

  async delete(id) {
    const sql = `DELETE FROM mata_pelajaran WHERE id_mata_pelajaran = ?`;
    const [result] = await db.execute(sql, [id]);
    return result;
  },

  async isKodeMapelExist(kode_mapel, tahun_ajaran_id, excludeId = null) {
    let sql = `
      SELECT 1
      FROM mata_pelajaran 
      WHERE UPPER(kode_mapel) = ? AND tahun_ajaran_id = ?
    `;
    const params = [kode_mapel.toUpperCase(), tahun_ajaran_id];

    if (excludeId !== null && excludeId !== undefined) {
      sql += ` AND id_mata_pelajaran != ?`;
      params.push(excludeId);
    }

    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  },

  async isNamaMapelExist(nama_mapel, tahun_ajaran_id, excludeId = null) {
    let sql = `
      SELECT id_mata_pelajaran, kode_mapel
      FROM mata_pelajaran 
      WHERE LOWER(nama_mapel) = ? AND tahun_ajaran_id = ?
    `;
    const params = [nama_mapel.toLowerCase(), tahun_ajaran_id];

    if (excludeId !== null && excludeId !== undefined) {
      sql += ` AND id_mata_pelajaran != ?`;
      params.push(excludeId);
    }

    const [rows] = await db.execute(sql, params);
    return rows.length > 0 ? rows[0] : null; // Return data mapel yang sudah ada
  },

  async isUrutanRaporExist(urutan_rapor, tahun_ajaran_id, excludeId = null) {
    let sql = `
      SELECT id_mata_pelajaran, nama_mapel
      FROM mata_pelajaran 
      WHERE urutan_rapor = ? AND tahun_ajaran_id = ?
    `;
    const params = [urutan_rapor, tahun_ajaran_id];

    if (excludeId !== null && excludeId !== undefined) {
      sql += ` AND id_mata_pelajaran != ?`;
      params.push(excludeId);
    }

    const [rows] = await db.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  },

  async isTahunAjaranValid(tahun_ajaran_id) {
    const sql = `SELECT 1 FROM tahun_ajaran WHERE id_tahun_ajaran = ?`;
    const [rows] = await db.execute(sql, [tahun_ajaran_id]);
    return rows.length > 0;
  },

  async isUsedInPembelajaran(id) {
    const sql = `SELECT COUNT(*) as jumlah FROM pembelajaran WHERE mapel_id = ?`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0].jumlah;
  },

  async hasNilaiRapor(id) {
    const sql = `SELECT COUNT(*) as jumlah FROM nilai_rapor WHERE mapel_id = ?`;
    const [rows] = await db.execute(sql, [id]);
    return rows[0].jumlah;
  }
};

module.exports = mapelModel;