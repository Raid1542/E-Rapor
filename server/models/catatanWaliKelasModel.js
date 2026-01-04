/**
 * Nama File: catatanWaliKelasModel.js
 * Fungsi: Model untuk mengelola catatan wali kelas dan keputusan kenaikan kelas,
 *         mencakup pengambilan data siswa per kelas, penyimpanan catatan,
 *         dan pencarian kelas yang diampu guru aktif.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

const catatanWaliKelasModel = {
  // Mengambil daftar siswa beserta catatan wali kelas berdasarkan kelas, tahun ajaran, dan semester
  async getCatatanByKelas(kelasId, tahunAjaranId, semester, jenis_penilaian) {
    const [rows] = await db.execute(
      `SELECT 
      s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn,
      c.catatan_wali_kelas, c.naik_tingkat
      FROM siswa s
      JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
      LEFT JOIN catatan_wali_kelas c 
        ON s.id_siswa = c.siswa_id 
        AND c.tahun_ajaran_id = ?
        AND c.semester = ?
        AND c.jenis_penilaian = ?
      WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
      ORDER BY s.nama_lengkap`,
      [tahunAjaranId, semester, jenis_penilaian, kelasId, tahunAjaranId]
    );
    return rows;
  },

  // Menyimpan atau memperbarui catatan wali kelas untuk satu siswa (upsert)
  async upsertCatatan(siswaId, kelasId, tahunAjaranId, semester, jenis_penilaian, catatanWaliKelas, naikTingkat) {
    await db.execute(
      `
      INSERT INTO catatan_wali_kelas 
      (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, catatan_wali_kelas, naik_tingkat)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        catatan_wali_kelas = VALUES(catatan_wali_kelas),
        naik_tingkat = VALUES(naik_tingkat),
        updated_at = NOW()
    `,
      [siswaId, kelasId, tahunAjaranId, semester, jenis_penilaian, catatanWaliKelas, naikTingkat]
    );
  },

  // Mendapatkan informasi kelas aktif yang diampu oleh guru berdasarkan user_id
  async getGuruKelasAktif(userId) {
    const [rows] = await db.execute(
      `
        SELECT 
          gk.kelas_id,
          k.nama_kelas,
          ta.id_tahun_ajaran,
          ta.tahun_ajaran,
          ta.semester
        FROM guru_kelas gk
        JOIN kelas k ON gk.kelas_id = k.id_kelas
        JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE gk.user_id = ? AND ta.status = 'aktif'
        LIMIT 1
      `,
      [userId]
    );
    return rows[0] || null;
  },
};

module.exports = catatanWaliKelasModel;