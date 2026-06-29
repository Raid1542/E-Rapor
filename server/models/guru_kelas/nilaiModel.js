/**
 * Nama File: nilaiModel.js
 * Fungsi: Model operasi nilai akademik (validasi akses, simpan, ambil)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

const nilaiModel = {
  // Mengecek apakah user berhak menginput nilai untuk mapel di kelas tertentu
  async canUserInputNilai(userId, mapelId, kelasId, tahunAjaranId) {
    const [results] = await db.execute(
      'SELECT 1 FROM pembelajaran p WHERE p.user_id = ? AND p.mata_pelajaran_id = ? AND p.kelas_id = ? AND p.tahun_ajaran_id = ?',
      [userId, mapelId, kelasId, tahunAjaranId]
    );
    return results.length > 0;
  },

  // Menyimpan atau memperbarui nilai per komponen penilaian
  async simpanNilaiDetail(data) {
    const { siswa_id, mapel_id, komponen_id, nilai, kelas_id, tahun_ajaran_id, user_id } = data;
    const [siswaCheck] = await db.execute(
      'SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?',
      [siswa_id, kelas_id, tahun_ajaran_id]
    );
    if (siswaCheck.length === 0) throw new Error('Siswa tidak terdaftar di kelas ini');
    const [statusCheck] = await db.execute('SELECT status FROM siswa WHERE id_siswa = ?', [siswa_id]);
    if (statusCheck.length === 0) throw new Error('Siswa tidak ditemukan');
    if (statusCheck[0].status !== 'aktif') throw new Error(`Siswa tidak aktif (status: ${statusCheck[0].status}). Nilai tidak dapat disimpan.`);
    const hasAccess = await nilaiModel.canUserInputNilai(user_id, mapel_id, kelas_id, tahun_ajaran_id);
    if (!hasAccess) throw new Error('Anda tidak memiliki akses untuk menginput nilai pada mapel ini');
    await db.execute(
      'INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = CURRENT_TIMESTAMP',
      [siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id]
    );
    return { siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id };
  },

  // Mengambil nilai siswa berdasarkan kelas dan mata pelajaran
  async getNilaiByKelasMapel(kelasId, mapelId, tahunAjaranId) {
    const [results] = await db.execute(`
      SELECT s.id_siswa, s.nis, s.nama_lengkap, nd.komponen_id, kp.nama_komponen, nd.nilai, nd.created_at
      FROM siswa_kelas sk
      JOIN siswa s ON sk.siswa_id = s.id_siswa
      LEFT JOIN nilai_detail nd ON s.id_siswa = nd.siswa_id AND nd.mapel_id = ? AND nd.tahun_ajaran_id = ?
      LEFT JOIN komponen_penilaian kp ON nd.komponen_id = kp.id_komponen
      WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
      ORDER BY s.nama_lengkap, kp.urutan
    `, [mapelId, tahunAjaranId, kelasId, tahunAjaranId]);
    return results;
  },

  // Mengambil daftar mata pelajaran yang diajarkan di kelas (dengan akses user)
  async getMapelByKelas(kelasId, tahunAjaranId, userId) {
    const [results] = await db.execute(`
      SELECT mp.id_mata_pelajaran, mp.nama_mata_pelajaran, mp.jenis, p.user_id AS pengajar_id,
        CASE WHEN p.user_id = ? THEN 1 ELSE 0 END AS bisa_input
      FROM pembelajaran p
      JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id_mata_pelajaran
      WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
      ORDER BY mp.jenis, mp.nama_mata_pelajaran
    `, [userId, kelasId, tahunAjaranId]);
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