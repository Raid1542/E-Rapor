/**
 * Nama File: absensiModel.js
 * Fungsi: Model untuk mengelola data absensi siswa
 */

const db = require('../../config/db');

const absensiModel = {
  /**
   * Ambil data absensi semua siswa di kelas tertentu
   */
  async getAbsensiByKelas(kelasId, tahunAjaranId) {
    const query = `
      SELECT 
        s.id_siswa,
        s.nama_lengkap,
        s.nis,
        s.nisn,
        COALESCE(a.sakit_pts, 0) AS sakit_pts,
        COALESCE(a.izin_pts, 0) AS izin_pts,
        COALESCE(a.alpha_pts, 0) AS alpha_pts,
        COALESCE(a.sakit_total, 0) AS sakit_total,
        COALESCE(a.izin_total, 0) AS izin_total,
        COALESCE(a.alpha_total, 0) AS alpha_total,
        CASE WHEN a.id_absensi IS NOT NULL THEN 1 ELSE 0 END AS sudah_diinput
      FROM siswa s
      INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
      LEFT JOIN absensi a ON s.id_siswa = a.siswa_id 
        AND a.id_tahun_ajaran = ?
      WHERE sk.kelas_id = ? 
        AND sk.id_tahun_ajaran_induk = (
          SELECT id_tahun_ajaran_induk 
          FROM tahun_ajaran 
          WHERE id_tahun_ajaran = ?
        )
        AND s.status = 'aktif'
      ORDER BY s.nama_lengkap ASC
    `;

    console.log(' Query absensi:', { kelasId, tahunAjaranId });
    const [rows] = await db.execute(query, [tahunAjaranId, kelasId, tahunAjaranId]);
    console.log('📦 Hasil query:', rows.length, 'siswa');
    return rows;
  },

  /**
   * Cek apakah data PTS sudah ada
   */
  async checkPTSExists(siswaId, tahunAjaranId) {
    const [rows] = await db.execute(
      `SELECT sakit_pts, izin_pts, alpha_pts 
       FROM absensi
       WHERE siswa_id = ? AND id_tahun_ajaran = ?
       AND (sakit_pts > 0 OR izin_pts > 0 OR alpha_pts > 0)`,
      [siswaId, tahunAjaranId]
    );
    return rows[0] || null;
  },

  /**
   * Upsert absensi PTS
   */
  async upsertAbsensiPTS(siswaId, kelasId, tahunAjaranId, sakit, izin, alpha) {
    const query = `
      INSERT INTO absensi 
        (siswa_id, kelas_id, id_tahun_ajaran, 
         sakit_pts, izin_pts, alpha_pts, 
         sakit_total, izin_total, alpha_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        kelas_id = VALUES(kelas_id),
        sakit_pts = VALUES(sakit_pts),
        izin_pts = VALUES(izin_pts),
        alpha_pts = VALUES(alpha_pts),
        sakit_total = GREATEST(COALESCE(sakit_total, 0), VALUES(sakit_pts)),
        izin_total = GREATEST(COALESCE(izin_total, 0), VALUES(izin_pts)),
        alpha_total = GREATEST(COALESCE(alpha_total, 0), VALUES(alpha_pts)),
        updated_at = CURRENT_TIMESTAMP
    `;
    return db.execute(query, [
      siswaId, kelasId, tahunAjaranId,
      sakit, izin, alpha,
      sakit, izin, alpha
    ]);
  },

  /**
   * Upsert absensi PAS (total semester)
   */
  async upsertAbsensiPAS(siswaId, kelasId, tahunAjaranId, sakitTotal, izinTotal, alphaTotal) {
    const query = `
      INSERT INTO absensi 
        (siswa_id, kelas_id, id_tahun_ajaran, 
         sakit_pts, izin_pts, alpha_pts, 
         sakit_total, izin_total, alpha_total)
      VALUES (?, ?, ?, 
              COALESCE((SELECT sakit_pts FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?), 0),
              COALESCE((SELECT izin_pts FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?), 0),
              COALESCE((SELECT alpha_pts FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?), 0),
              ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        kelas_id = VALUES(kelas_id),
        sakit_total = VALUES(sakit_total),
        izin_total = VALUES(izin_total),
        alpha_total = VALUES(alpha_total),
        updated_at = CURRENT_TIMESTAMP
    `;
    return db.execute(query, [
      siswaId, kelasId, tahunAjaranId,
      siswaId, tahunAjaranId,
      siswaId, tahunAjaranId,
      siswaId, tahunAjaranId,
      sakitTotal, izinTotal, alphaTotal
    ]);
  },
};

module.exports = absensiModel;