/**
 * Nama File: absensiModel.js
 * Fungsi: Model absensi siswa (PTS/PAS, upsert, validasi).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

const absensiModel = {
  /**
   * Ambil data absensi semua siswa di kelas tertentu.
   */
  async getAbsensiByKelas(kelasId, tahunAjaranId, indukId) {
    try {
      // Menggunakan parameter indukId langsung untuk optimasi query
      const query = `
        SELECT 
          s.id_siswa, s.nama_lengkap, s.nis, s.nisn,
          COALESCE(a.sakit_pts, 0) AS sakit_pts, 
          COALESCE(a.izin_pts, 0) AS izin_pts, 
          COALESCE(a.alpha_pts, 0) AS alpha_pts,
          COALESCE(a.sakit_total, 0) AS sakit_total, 
          COALESCE(a.izin_total, 0) AS izin_total, 
          COALESCE(a.alpha_total, 0) AS alpha_total,
          CASE WHEN a.id_absensi IS NOT NULL THEN 1 ELSE 0 END AS sudah_diinput
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        LEFT JOIN absensi a ON s.id_siswa = a.siswa_id AND a.id_tahun_ajaran = ?
        WHERE sk.kelas_id = ? 
          AND sk.id_tahun_ajaran_induk = ?
          AND s.status = 'aktif'
        ORDER BY s.nama_lengkap ASC
      `;
      const [rows] = await db.execute(query, [tahunAjaranId, kelasId, indukId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data absensi kelas');
    }
  },

  /**
   * Cek apakah data absensi PTS sudah ada untuk siswa tertentu.
   */
  async checkPTSExists(siswaId, tahunAjaranId) {
    try {
      const query = `
        SELECT sakit_pts, izin_pts, alpha_pts FROM absensi
        WHERE siswa_id = ? AND id_tahun_ajaran = ?
      `;
      const [rows] = await db.execute(query, [siswaId, tahunAjaranId]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengecek data absensi PTS');
    }
  },

  /**
   * Upsert absensi PTS (auto-update total menjadi minimal nilai PTS).
   */
  async upsertAbsensiPTS(siswaId, kelasId, tahunAjaranId, sakit, izin, alpha) {
    try {
      const query = `
        INSERT INTO absensi (siswa_id, kelas_id, id_tahun_ajaran, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total)
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
      return await db.execute(query, [siswaId, kelasId, tahunAjaranId, sakit, izin, alpha, sakit, izin, alpha]);
    } catch (err) {
      throw new Error('Gagal menyimpan data absensi PTS');
    }
  },

  /**
   * Upsert absensi PAS (total semester, preserve nilai PTS).
   * Query ini aman karena controller sudah memvalidasi bahwa Total >= PTS.
   */
  async upsertAbsensiPAS(siswaId, kelasId, tahunAjaranId, sakitTotal, izinTotal, alphaTotal) {
    try {
      const query = `
        INSERT INTO absensi (siswa_id, kelas_id, id_tahun_ajaran, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total)
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
      return await db.execute(query, [
        siswaId, kelasId, tahunAjaranId,
        siswaId, tahunAjaranId, 
        siswaId, tahunAjaranId, 
        siswaId, tahunAjaranId,
        sakitTotal, izinTotal, alphaTotal
      ]);
    } catch (err) {
      throw new Error('Gagal menyimpan data absensi PAS');
    }
  },

  /**
   * Ambil data absensi spesifik untuk pre-fill template Excel saat PAS.
   * Tujuan agar user tahu baseline nilai PTS mereka dan tidak salah input.
   */
  async getAbsensiForTemplate(kelasId, tahunAjaranId, indukId) {
    try {
      const query = `
        SELECT 
          s.id_siswa, s.nis, s.nisn, s.nama_lengkap,
          COALESCE(a.sakit_pts, 0) AS sakit_pts, 
          COALESCE(a.izin_pts, 0) AS izin_pts, 
          COALESCE(a.alpha_pts, 0) AS alpha_pts
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        LEFT JOIN absensi a ON s.id_siswa = a.siswa_id AND a.id_tahun_ajaran = ?
        WHERE sk.kelas_id = ? 
          AND sk.id_tahun_ajaran_induk = ?
          AND s.status = 'aktif'
        ORDER BY s.nama_lengkap ASC
      `;
      const [rows] = await db.execute(query, [tahunAjaranId, kelasId, indukId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data absensi untuk template');
    }
  }
};

module.exports = absensiModel;