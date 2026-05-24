/**
 * Nama File: tahunAjaranModel.js
 * Fungsi: Model untuk mengelola data tahun ajaran (2 tabel: induk + semester)
 *         Mendukung tampilan 1 baris UI (Ganjil & Genap digabung)
 */

const db = require('../config/db');

const tahunAjaranModel = {

  // Gabungkan Ganjil & Genap jadi 1 baris via LEFT JOIN
  async getAllTahunAjaran() {
    const [rows] = await db.execute(`
      SELECT 
        -- Data dari Tabel INDUK
        ti.id_tahun_ajaran_induk,
        ti.tahun_ajaran,
        
        -- Data Semester GANJIL 
        ta_ganjil.id_tahun_ajaran as id_ganjil,
        ta_ganjil.tanggal_pembagian_pts as pts_ganjil,
        ta_ganjil.tanggal_pembagian_pas as pas_ganjil,
        ta_ganjil.status as status_ganjil,
        ta_ganjil.status_pts as status_pts_ganjil,
        ta_ganjil.status_pas as status_pas_ganjil,
        
        -- Data Semester GENAP 
        ta_genap.id_tahun_ajaran as id_genap,
        ta_genap.tanggal_pembagian_pts as pts_genap,
        ta_genap.tanggal_pembagian_pas as pas_genap,
        ta_genap.status as status_genap,
        ta_genap.status_pts as status_pts_genap,
        ta_genap.status_pas as status_pas_genap,
        
        -- Logika: Tentukan semester mana yang sedang AKTIF
        CASE 
          WHEN ta_ganjil.status = 'aktif' THEN 'Ganjil'
          WHEN ta_genap.status = 'aktif' THEN 'Genap'
          ELSE NULL
        END as semester_aktif
        
      FROM tahun_ajaran_induk ti
      
      -- Join ke tabel detail untuk ambil data Ganjil
      LEFT JOIN tahun_ajaran ta_ganjil 
        ON ti.id_tahun_ajaran_induk = ta_ganjil.id_tahun_ajaran_induk 
        AND ta_ganjil.semester = 'Ganjil'
      
      -- Join ke tabel detail untuk ambil data Genap
      LEFT JOIN tahun_ajaran ta_genap 
        ON ti.id_tahun_ajaran_induk = ta_genap.id_tahun_ajaran_induk 
        AND ta_genap.semester = 'Genap'
        
      ORDER BY ti.tahun_ajaran DESC
    `);
    return rows;
  },

  // Insert ke Induk dulu, lalu auto-generate Ganjil & Genap
  async createTahunAjaran(data, connection = db) {
    const { tahun_ajaran, pts_ganjil, pas_ganjil, pts_genap, pas_genap } = data;
    
    // Siapkan koneksi (dukung transaction dari controller)
    const conn = await connection.getConnection ? await connection.getConnection() : connection;
    
    try {
      await conn.beginTransaction();
      
      // Insert ke Tabel INDUK
      const [indukResult] = await conn.execute(
        `INSERT INTO tahun_ajaran_induk (tahun_ajaran) VALUES (?)`,
        [tahun_ajaran]
      );
      const id_induk = indukResult.insertId;
      
      // Insert ke Tabel DETAIL: Semester Ganjil (Default: Aktif)
      await conn.execute(
        `INSERT INTO tahun_ajaran (
            id_tahun_ajaran_induk, tahun_ajaran, semester, 
            tanggal_pembagian_pts, tanggal_pembagian_pas, 
            status, status_pts, status_pas
          ) VALUES (?, ?, 'Ganjil', ?, ?, 'aktif', 'nonaktif', 'nonaktif')`,
        [id_induk, tahun_ajaran, pts_ganjil, pas_ganjil]
      );
      
      // Insert ke Tabel DETAIL: Semester Genap (Default: Nonaktif)
      await conn.execute(
        `INSERT INTO tahun_ajaran (
            id_tahun_ajaran_induk, tahun_ajaran, semester, 
            tanggal_pembagian_pts, tanggal_pembagian_pas, 
            status, status_pts, status_pas
          ) VALUES (?, ?, 'Genap', ?, ?, 'nonaktif', 'nonaktif', 'nonaktif')`,
        [id_induk, tahun_ajaran, pts_genap, pas_genap]
      );
      
      await conn.commit();
      return id_induk; // Return ID Induk untuk referensi
      
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  },

  // Update tanggal PTS/PAS berdasarkan ID_INDUK & Semester
  async updateTahunAjaran(id_induk, data, connection = db) {
    const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = data;
    
    const conn = await connection.getConnection ? await connection.getConnection() : connection;
    
    try {
      await conn.beginTransaction();
      
      // Update data Ganjil (jika ada yang dikirim)
      if (pts_ganjil !== undefined || pas_ganjil !== undefined) {
        await conn.execute(
          `UPDATE tahun_ajaran 
            SET tanggal_pembagian_pts = COALESCE(?, tanggal_pembagian_pts),
                tanggal_pembagian_pas = COALESCE(?, tanggal_pembagian_pas)
            WHERE id_tahun_ajaran_induk = ? AND semester = 'Ganjil'`,
          [pts_ganjil, pas_ganjil, id_induk]
        );
      }
      
      // Update data Genap (jika ada yang dikirim)
      if (pts_genap !== undefined || pas_genap !== undefined) {
        await conn.execute(
          `UPDATE tahun_ajaran 
            SET tanggal_pembagian_pts = COALESCE(?, tanggal_pembagian_pts),
                tanggal_pembagian_pas = COALESCE(?, tanggal_pembagian_pas)
            WHERE id_tahun_ajaran_induk = ? AND semester = 'Genap'`,
          [pts_genap, pas_genap, id_induk]
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
      
      // Nonaktifkan SEMUA semester di tahun ajaran ini
      await conn.execute(
        `UPDATE tahun_ajaran SET status = 'nonaktif' WHERE id_tahun_ajaran_induk = ?`,
        [id_induk]
      );
      
      // Aktifkan semester yang dipilih user
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