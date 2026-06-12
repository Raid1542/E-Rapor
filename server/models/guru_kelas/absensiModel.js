/**
 * Nama File: absensiModel.js
 * Fungsi: Model untuk mengelola operasi data absensi siswa, mencakup pengambilan data guru kelas aktif,
 *         pengambilan absensi seluruh siswa di kelas, dan penyimpanan/perbaruan data absensi.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

// Model absensi untuk operasi terkait data kehadiran siswa
const absensiModel = {
  // Mengambil data guru kelas aktif berdasarkan ID pengguna
  async getGuruKelasAktif(userId) {
    const [rows] = await db.execute(
      `
        SELECT 
          gk.kelas_id, 
          ta.id_tahun_ajaran, 
          ta.tahun_ajaran,
          ta.semester,
          k.nama_kelas
        FROM guru_kelas gk
        JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
        JOIN kelas k ON gk.kelas_id = k.id_kelas
        WHERE gk.user_id = ? AND ta.status = 'aktif'
      `,
      [userId]
    );
    return rows[0] || null;
  },

  // Mengambil data absensi semua siswa di kelas tertentu pada tahun ajaran aktif
  async getAbsensiByKelas(kelasId, tahunAjaranId, semester, jenis_penilaian) {
    const [rows] = await db.execute(
      `
    SELECT 
      s.id_siswa AS id,
      s.nama_lengkap AS nama,
      s.nis,
      s.nisn,
      COALESCE(a.sakit, 0) AS jumlah_sakit,
      COALESCE(a.izin, 0) AS jumlah_izin,
      COALESCE(a.alpha, 0) AS jumlah_alpha,
      CASE WHEN a.id_absensi IS NOT NULL THEN 1 ELSE 0 END AS sudah_diinput
    FROM siswa s
    JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
    LEFT JOIN absensi a ON s.id_siswa = a.siswa_id 
      AND sk.kelas_id = a.kelas_id 
      AND sk.tahun_ajaran_id = a.tahun_ajaran_id
      AND a.semester = ?
      AND a.jenis_penilaian = ?
    WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
    ORDER BY s.nama_lengkap
    `,
      [semester, jenis_penilaian, kelasId, tahunAjaranId]
    );
    return rows;
  },

  // Menyimpan atau memperbarui data absensi siswa (upsert)
  async upsertAbsensi(siswaId, kelasId, tahunAjaranId, sakit, izin, alpha) {
    const [existing] = await db.execute(
      `
        SELECT id_absensi FROM absensi
        WHERE siswa_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?
      `,
      [siswaId, kelasId, tahunAjaranId]
    );

    if (existing.length > 0) {
      // Jika data sudah ada, lakukan update
      await db.execute(
        `
          UPDATE absensi
          SET sakit = ?, izin = ?, alpha = ?, updated_at = NOW()
          WHERE id_absensi = ?
        `,
        [sakit, izin, alpha, existing[0].id_absensi]
      );
    } else {
      // Jika data belum ada, lakukan insert
      await db.execute(
        `
          INSERT INTO absensi (siswa_id, kelas_id, tahun_ajaran_id, sakit, izin, alpha)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [siswaId, kelasId, tahunAjaranId, sakit, izin, alpha]
      );
    }
  },
};

module.exports = absensiModel;