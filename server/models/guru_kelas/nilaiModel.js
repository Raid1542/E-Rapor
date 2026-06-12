/**
 * Nama File: nilaiModel.js
 * Fungsi: Model untuk mengelola operasi nilai akademik,
 *         mencakup validasi akses, penyimpanan nilai per komponen,
 *         dan pengambilan data nilai berdasarkan kelas dan mata pelajaran.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

const nilaiModel = {
  // Mengecek apakah user berhak menginput nilai untuk mapel di kelas tertentu
  async canUserInputNilai(userId, mapelId, kelasId, tahunAjaranId) {
    const query = `
      SELECT 1
      FROM pembelajaran p
      WHERE p.user_id = ?
        AND p.mata_pelajaran_id = ?
        AND p.kelas_id = ?
        AND p.tahun_ajaran_id = ?
    `;
    const [results] = await db.execute(query, [
      userId,
      mapelId,
      kelasId,
      tahunAjaranId,
    ]);
    return results.length > 0;
  },

  // Menyimpan atau memperbarui nilai per komponen penilaian
  async simpanNilaiDetail(data) {
    const {
      siswa_id,
      mapel_id,
      komponen_id,
      nilai,
      kelas_id,
      tahun_ajaran_id,
      user_id,
    } = data;

    const [siswaCheck] = await db.execute(
      `SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
      [siswa_id, kelas_id, tahun_ajaran_id]
    );
    if (siswaCheck.length === 0) {
      throw new Error('Siswa tidak terdaftar di kelas ini');
    }

    const hasAccess = await nilaiModel.canUserInputNilai(
      user_id,
      mapel_id,
      kelas_id,
      tahun_ajaran_id
    );
    if (!hasAccess) {
      throw new Error('Anda tidak memiliki akses untuk menginput nilai pada mapel ini');
    }

    const insertQuery = `
      INSERT INTO nilai_detail 
        (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        nilai = VALUES(nilai),
        updated_at = CURRENT_TIMESTAMP
    `;
    await db.execute(insertQuery, [
      siswa_id,
      mapel_id,
      komponen_id,
      nilai,
      tahun_ajaran_id,
    ]);

    return { siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id };
  },

  // Mengambil nilai siswa berdasarkan kelas dan mata pelajaran
  async getNilaiByKelasMapel(kelasId, mapelId, tahunAjaranId) {
    const query = `
      SELECT 
          s.id_siswa,
          s.nis,
          s.nama_lengkap,
          nd.komponen_id,
          kp.nama_komponen,
          nd.nilai,
          nd.created_at
      FROM siswa_kelas sk
      JOIN siswa s ON sk.siswa_id = s.id_siswa
      LEFT JOIN nilai_detail nd ON s.id_siswa = nd.siswa_id 
        AND nd.mapel_id = ? 
        AND nd.tahun_ajaran_id = ?
      LEFT JOIN komponen_penilaian kp ON nd.komponen_id = kp.id_komponen
      WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
      ORDER BY s.nama_lengkap, kp.urutan
    `;
    const [results] = await db.execute(query, [
      mapelId,
      tahunAjaranId,
      kelasId,
      tahunAjaranId,
    ]);
    return results;
  },

  // Mengambil daftar mata pelajaran yang diajarkan di kelas (dengan akses user)
  async getMapelByKelas(kelasId, tahunAjaranId, userId) {
    const query = `
      SELECT 
          mp.id_mata_pelajaran,
          mp.nama_mata_pelajaran,
          mp.jenis,
          p.user_id AS pengajar_id,
          CASE 
            WHEN p.user_id = ? THEN 1 
            ELSE 0 
          END AS bisa_input
      FROM pembelajaran p
      JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id_mata_pelajaran
      WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
      ORDER BY mp.jenis, mp.nama_mata_pelajaran
    `;
    const [results] = await db.execute(query, [userId, kelasId, tahunAjaranId]);
    return results.map(row => ({
      ...row,
      bisa_input: Boolean(row.bisa_input),
      mata_pelajaran_id: row.id_mata_pelajaran,
      nama_mapel: row.nama_mata_pelajaran,
      jenis: row.jenis,
    }));
  },
};

module.exports = nilaiModel;