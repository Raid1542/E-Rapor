/**
 * Nama File: tahunAjaranModel.js
 * Fungsi: Model untuk mengelola data tahun ajaran (2 tabel: induk + semester)
 * Update: 
 *   - Fix query update untuk handle string kosong
 *   - Tambah method getTahunAjaranById untuk cek hasChanges
 */

const db = require('../../config/db');

const tahunAjaranModel = {

  // Gabungkan Ganjil & Genap jadi 1 baris via LEFT JOIN
  async getAllTahunAjaran() {
    const [rows] = await db.execute(`
        SELECT 
            i.id_tahun_ajaran_induk,
            i.tahun_ajaran,
            i.created_at,
            g.id_tahun_ajaran AS id_ganjil,
            g.semester AS semester_ganjil,
            g.status AS status_ganjil,
            g.tanggal_pembagian_pts AS pts_ganjil,
            g.tanggal_pembagian_pas AS pas_ganjil,
            g.status_pts AS status_pts_ganjil,
            g.status_pas AS status_pas_ganjil,
            ge.id_tahun_ajaran AS id_genap,
            ge.semester AS semester_genap,
            ge.status AS status_genap,
            ge.tanggal_pembagian_pts AS pts_genap,
            ge.tanggal_pembagian_pas AS pas_genap,
            ge.status_pts AS status_pts_genap,
            ge.status_pas AS status_pas_genap,
            CASE 
                WHEN g.status = 'aktif' THEN 'Ganjil'
                WHEN ge.status = 'aktif' THEN 'Genap'
                ELSE NULL
            END AS semester_aktif
        FROM tahun_ajaran_induk i
        LEFT JOIN tahun_ajaran g ON i.id_tahun_ajaran_induk = g.id_tahun_ajaran_induk AND g.semester = 'Ganjil'
        LEFT JOIN tahun_ajaran ge ON i.id_tahun_ajaran_induk = ge.id_tahun_ajaran_induk AND ge.semester = 'Genap'
        ORDER BY i.tahun_ajaran DESC
    `);
    return rows;
  },

  // Ambil data tahun ajaran by ID (untuk cek hasChanges)
  async getTahunAjaranById(id_induk) {
    const [rows] = await db.execute(`
      SELECT 
        ti.id_tahun_ajaran_induk,
        ti.tahun_ajaran,
        
        ta_ganjil.tanggal_pembagian_pts as pts_ganjil,
        ta_ganjil.tanggal_pembagian_pas as pas_ganjil,
        
        ta_genap.tanggal_pembagian_pts as pts_genap,
        ta_genap.tanggal_pembagian_pas as pas_genap
        
      FROM tahun_ajaran_induk ti
      
      LEFT JOIN tahun_ajaran ta_ganjil 
        ON ti.id_tahun_ajaran_induk = ta_ganjil.id_tahun_ajaran_induk 
        AND ta_ganjil.semester = 'Ganjil'
      
      LEFT JOIN tahun_ajaran ta_genap 
        ON ti.id_tahun_ajaran_induk = ta_genap.id_tahun_ajaran_induk 
        AND ta_genap.semester = 'Genap'
        
      WHERE ti.id_tahun_ajaran_induk = ?
    `, [id_induk]);

    return rows[0] || null;
  },

  // Insert ke Induk dulu, lalu auto-generate Ganjil & Genap
  async createTahunAjaran(data, connection = db) {
    const { tahun_ajaran, pts_ganjil, pas_ganjil, pts_genap, pas_genap } = data;

    const conn = await connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();

      const [indukResult] = await conn.execute(
        `INSERT INTO tahun_ajaran_induk (tahun_ajaran) VALUES (?)`,
        [tahun_ajaran]
      );
      const id_induk = indukResult.insertId;

      // ✅ Gunakan NULL untuk tanggal kosong
      await conn.execute(
        `INSERT INTO tahun_ajaran (
            id_tahun_ajaran_induk, tahun_ajaran, semester, 
            tanggal_pembagian_pts, tanggal_pembagian_pas, 
            status, status_pts, status_pas
          ) VALUES (?, ?, 'Ganjil', ?, ?, 'aktif', 'nonaktif', 'nonaktif')`,
        [id_induk, tahun_ajaran, pts_ganjil || null, pas_ganjil || null]
      );

      await conn.execute(
        `INSERT INTO tahun_ajaran (
            id_tahun_ajaran_induk, tahun_ajaran, semester, 
            tanggal_pembagian_pts, tanggal_pembagian_pas, 
            status, status_pts, status_pas
          ) VALUES (?, ?, 'Genap', ?, ?, 'nonaktif', 'nonaktif', 'nonaktif')`,
        [id_induk, tahun_ajaran, pts_genap || null, pas_genap || null]
      );

      await conn.commit();
      return id_induk;

    } catch (err) {
      await conn.rollback();
      throw err;
    }
  },

  // ✅ DIPERBAIKI: Update dengan IF untuk handle string kosong
  async updateTahunAjaran(id_induk, data, connection = db) {
    const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = data;

    const conn = await connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();

      // Update data Ganjil - gunakan IF untuk handle string kosong
      if (pts_ganjil !== undefined || pas_ganjil !== undefined) {
        await conn.execute(
          `UPDATE tahun_ajaran 
            SET tanggal_pembagian_pts = IF(? IS NULL, tanggal_pembagian_pts, ?),
                tanggal_pembagian_pas = IF(? IS NULL, tanggal_pembagian_pas, ?)
            WHERE id_tahun_ajaran_induk = ? AND semester = 'Ganjil'`,
          [pts_ganjil, pts_ganjil, pas_ganjil, pas_ganjil, id_induk]
        );
      }

      // Update data Genap
      if (pts_genap !== undefined || pas_genap !== undefined) {
        await conn.execute(
          `UPDATE tahun_ajaran 
            SET tanggal_pembagian_pts = IF(? IS NULL, tanggal_pembagian_pts, ?),
                tanggal_pembagian_pas = IF(? IS NULL, tanggal_pembagian_pas, ?)
            WHERE id_tahun_ajaran_induk = ? AND semester = 'Genap'`,
          [pts_genap, pts_genap, pas_genap, pas_genap, id_induk]
        );
      }

      await conn.commit();
      return true;

    } catch (err) {
      await conn.rollback();
      throw err;
    }
  },

  // Ganti Semester Aktif (Ganjil ↔ Genap)
  async gantiSemesterAktif(id_induk, semester_baru, connection = db) {
    const conn = await connection.getConnection ? await connection.getConnection() : connection;

    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE tahun_ajaran SET status = 'nonaktif' WHERE id_tahun_ajaran_induk = ?`,
        [id_induk]
      );

      await conn.execute(
        `UPDATE tahun_ajaran SET status = 'aktif' 
          WHERE id_tahun_ajaran_induk = ? AND semester = ?`,
        [id_induk, semester_baru]
      );

      await conn.commit();
      return true;

    } catch (err) {
      await conn.rollback();
      throw err;
    }
  },

  // Get Tahun Ajaran Aktif (Untuk Middleware)
  async getTahunAjaranAktif() {
    const [rows] = await db.execute(`
      SELECT 
        ti.id_tahun_ajaran_induk,
        ti.tahun_ajaran,
        ta.semester as semester_aktif,
        ta.tanggal_pembagian_pts,
        ta.tanggal_pembagian_pas,
        ta.id_tahun_ajaran as id_tahun_ajaran_detail
      FROM tahun_ajaran_induk ti
      INNER JOIN tahun_ajaran ta ON ti.id_tahun_ajaran_induk = ta.id_tahun_ajaran_induk
      WHERE ta.status = 'aktif' 
      LIMIT 1
    `);
    return rows[0] || null;
  }
};

module.exports = tahunAjaranModel;