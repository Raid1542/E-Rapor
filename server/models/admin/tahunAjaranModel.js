/**
 * Nama File: tahunAjaranModel.js
 * Fungsi: Model CRUD tahun ajaran (induk + semester Ganjil/Genap)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA QUERY SQL
// ═════════════════════════════════════════════════════════════════════════════

// Query untuk mengambil semua tahun ajaran dengan join Ganjil & Genap
const QUERY_GET_ALL_TAHUN_AJARAN = `
  SELECT 
    i.id_tahun_ajaran_induk, i.tahun_ajaran, i.created_at,
    g.id_tahun_ajaran AS id_ganjil, g.semester AS semester_ganjil, g.status AS status_ganjil,
    g.tanggal_pembagian_pts AS pts_ganjil, g.tanggal_pembagian_pas AS pas_ganjil,
    g.status_pts AS status_pts_ganjil, g.status_pas AS status_pas_ganjil,
    ge.id_tahun_ajaran AS id_genap, ge.semester AS semester_genap, ge.status AS status_genap,
    ge.tanggal_pembagian_pts AS pts_genap, ge.tanggal_pembagian_pas AS pas_genap,
    ge.status_pts AS status_pts_genap, ge.status_pas AS status_pas_genap,
    CASE WHEN g.status = 'aktif' THEN 'Ganjil' WHEN ge.status = 'aktif' THEN 'Genap' ELSE NULL END AS semester_aktif
  FROM tahun_ajaran_induk i
  LEFT JOIN tahun_ajaran g ON i.id_tahun_ajaran_induk = g.id_tahun_ajaran_induk AND g.semester = 'Ganjil'
  LEFT JOIN tahun_ajaran ge ON i.id_tahun_ajaran_induk = ge.id_tahun_ajaran_induk AND ge.semester = 'Genap'
  ORDER BY i.tahun_ajaran DESC
`;

// Query untuk mengambil tahun ajaran by ID
const QUERY_GET_TAHUN_AJARAN_BY_ID = `
  SELECT ti.id_tahun_ajaran_induk, ti.tahun_ajaran,
    ta_ganjil.tanggal_pembagian_pts as pts_ganjil, ta_ganjil.tanggal_pembagian_pas as pas_ganjil,
    ta_genap.tanggal_pembagian_pts as pts_genap, ta_genap.tanggal_pembagian_pas as pas_genap
  FROM tahun_ajaran_induk ti
  LEFT JOIN tahun_ajaran ta_ganjil ON ti.id_tahun_ajaran_induk = ta_ganjil.id_tahun_ajaran_induk AND ta_ganjil.semester = 'Ganjil'
  LEFT JOIN tahun_ajaran ta_genap ON ti.id_tahun_ajaran_induk = ta_genap.id_tahun_ajaran_induk AND ta_genap.semester = 'Genap'
  WHERE ti.id_tahun_ajaran_induk = ?
`;

// Query untuk insert tahun ajaran induk
const QUERY_INSERT_INDUK = `
  INSERT INTO tahun_ajaran_induk (tahun_ajaran) VALUES (?)
`;

// Query untuk insert semester Ganjil
const QUERY_INSERT_GANJIL = `
  INSERT INTO tahun_ajaran (id_tahun_ajaran_induk, tahun_ajaran, semester, tanggal_pembagian_pts, tanggal_pembagian_pas, status, status_pts, status_pas)
  VALUES (?, ?, 'Ganjil', ?, ?, 'aktif', 'nonaktif', 'nonaktif')
`;

// Query untuk insert semester Genap
const QUERY_INSERT_GENAP = `
  INSERT INTO tahun_ajaran (id_tahun_ajaran_induk, tahun_ajaran, semester, tanggal_pembagian_pts, tanggal_pembagian_pas, status, status_pts, status_pas)
  VALUES (?, ?, 'Genap', ?, ?, 'nonaktif', 'nonaktif', 'nonaktif')
`;

// Query untuk update tanggal pembagian Ganjil
const QUERY_UPDATE_GANJIL = `
  UPDATE tahun_ajaran 
  SET tanggal_pembagian_pts = IF(? IS NULL, tanggal_pembagian_pts, ?),
      tanggal_pembagian_pas = IF(? IS NULL, tanggal_pembagian_pas, ?)
  WHERE id_tahun_ajaran_induk = ? AND semester = 'Ganjil'
`;

// Query untuk update tanggal pembagian Genap
const QUERY_UPDATE_GENAP = `
  UPDATE tahun_ajaran 
  SET tanggal_pembagian_pts = IF(? IS NULL, tanggal_pembagian_pts, ?),
      tanggal_pembagian_pas = IF(? IS NULL, tanggal_pembagian_pas, ?)
  WHERE id_tahun_ajaran_induk = ? AND semester = 'Genap'
`;

// Query untuk ganti semester aktif
const QUERY_DEACTIVATE_ALL = `
  UPDATE tahun_ajaran SET status = 'nonaktif' WHERE id_tahun_ajaran_induk = ?
`;

const QUERY_ACTIVATE_SEMESTER = `
  UPDATE tahun_ajaran SET status = 'aktif' WHERE id_tahun_ajaran_induk = ? AND semester = ?
`;

// Query untuk mengambil tahun ajaran aktif
const QUERY_GET_TAHUN_AJARAN_AKTIF = `
  SELECT ti.id_tahun_ajaran_induk, ti.tahun_ajaran, ta.semester as semester_aktif,
          ta.tanggal_pembagian_pts, ta.tanggal_pembagian_pas, ta.id_tahun_ajaran as id_tahun_ajaran_detail
  FROM tahun_ajaran_induk ti
  INNER JOIN tahun_ajaran ta ON ti.id_tahun_ajaran_induk = ta.id_tahun_ajaran_induk
  WHERE ta.status = 'aktif' 
  LIMIT 1
`;

// ═════════════════════════════════════════════════════════════════════════════
// MODEL FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

const tahunAjaranModel = {
  // Ambil semua tahun ajaran (Gabung Ganjil & Genap)
  async getAllTahunAjaran() {
    try {
      const [rows] = await db.execute(QUERY_GET_ALL_TAHUN_AJARAN);
      return rows;
    } catch (err) {
      console.error('Error getAllTahunAjaran:', err);
      throw new Error('Gagal mengambil data tahun ajaran');
    }
  },

  // Ambil tahun ajaran by ID (untuk cek hasChanges)
  async getTahunAjaranById(id_induk) {
    try {
      const [rows] = await db.execute(QUERY_GET_TAHUN_AJARAN_BY_ID, [id_induk]);
      return rows[0] || null;
    } catch (err) {
      console.error('Error getTahunAjaranById:', err);
      throw new Error('Gagal mengambil data tahun ajaran');
    }
  },

  // Tambah tahun ajaran baru (induk + auto-generate Ganjil & Genap)
  async createTahunAjaran(data, connection = db) {
    const { tahun_ajaran, pts_ganjil, pas_ganjil, pts_genap, pas_genap } = data;
    const conn = await connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();

      // Insert induk
      const [indukResult] = await conn.execute(QUERY_INSERT_INDUK, [tahun_ajaran]);
      const id_induk = indukResult.insertId;

      // Insert semester Ganjil
      await conn.execute(QUERY_INSERT_GANJIL, [
        id_induk, tahun_ajaran, pts_ganjil || null, pas_ganjil || null
      ]);

      // Insert semester Genap
      await conn.execute(QUERY_INSERT_GENAP, [
        id_induk, tahun_ajaran, pts_genap || null, pas_genap || null
      ]);

      await conn.commit();
      return id_induk;
    } catch (err) {
      await conn.rollback();
      console.error('Error createTahunAjaran:', err);
      throw new Error('Gagal membuat tahun ajaran');
    }
  },

  // Update tahun ajaran (handle string kosong dengan IF)
  async updateTahunAjaran(id_induk, data, connection = db) {
    const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = data;
    const conn = await connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();

      // Update semester Ganjil
      if (pts_ganjil !== undefined || pas_ganjil !== undefined) {
        await conn.execute(QUERY_UPDATE_GANJIL, [
          pts_ganjil, pts_ganjil, pas_ganjil, pas_ganjil, id_induk
        ]);
      }

      // Update semester Genap
      if (pts_genap !== undefined || pas_genap !== undefined) {
        await conn.execute(QUERY_UPDATE_GENAP, [
          pts_genap, pts_genap, pas_genap, pas_genap, id_induk
        ]);
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      console.error('Error updateTahunAjaran:', err);
      throw new Error('Gagal mengupdate tahun ajaran');
    }
  },

  // Ganti semester aktif (Ganjil ↔ Genap)
  async gantiSemesterAktif(id_induk, semester_baru, connection = db) {
    const conn = await connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();
      
      // Nonaktifkan semua semester
      await conn.execute(QUERY_DEACTIVATE_ALL, [id_induk]);
      
      // Aktifkan semester baru
      await conn.execute(QUERY_ACTIVATE_SEMESTER, [id_induk, semester_baru]);
      
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      console.error('Error gantiSemesterAktif:', err);
      throw new Error('Gagal mengganti semester aktif');
    }
  },

  // Ambil tahun ajaran aktif (untuk middleware)
  async getTahunAjaranAktif() {
    try {
      const [rows] = await db.execute(QUERY_GET_TAHUN_AJARAN_AKTIF);
      return rows[0] || null;
    } catch (err) {
      console.error('Error getTahunAjaranAktif:', err);
      throw new Error('Gagal mengambil tahun ajaran aktif');
    }
  }
};

module.exports = tahunAjaranModel;