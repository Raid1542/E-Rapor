/**
 * Nama File: kokurikulerModel.js
 * Fungsi: Model untuk mengelola nilai kokurikuler siswa
 * ✅ FIXED: Semua query filter by jenis_penilaian (PTS/PAS)
 */

const db = require('../../config/db');

const kokurikulerModel = {
  /**
   * Ambil semua siswa di kelas tertentu
   */
  async getSiswaByKelas(kelasId, tahunAjaranId) {
    const [rows] = await db.execute(
      `SELECT s.id_siswa, s.nama_lengkap, s.nis, s.nisn
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
        ORDER BY s.nama_lengkap`,
      [kelasId, tahunAjaranId]
    );
    return rows;
  },

  /**
   * ✅ FIXED: Ambil semua nilai kokurikuler untuk kelas tertentu + filter jenis
   */
  async getNilaiByKelas(kelasId, tahunAjaranId, semester, jenisPenilaian) {
    const [rows] = await db.execute(
      `SELECT id_nilai_kokurikuler, id_siswa, id_aspek_kokurikuler, 
              nilai, grade, deskripsi, id_judul_proyek, jenis_penilaian
        FROM nilai_kokurikuler
        WHERE id_kelas = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?`,
      [kelasId, tahunAjaranId, semester, jenisPenilaian]
    );
    return rows;
  },

  /**
   * ✅ FIXED: Ambil nilai kokurikuler untuk satu siswa + filter jenis
   */
  async getNilaiBySiswa(siswaId, kelasId, tahunAjaranId, semester, jenisPenilaian) {
    const [rows] = await db.execute(
      `SELECT 
          id_nilai_kokurikuler,
          id_aspek_kokurikuler,
          nilai,
          grade,
          deskripsi,
          id_judul_proyek,
          jenis_penilaian
        FROM nilai_kokurikuler
        WHERE id_siswa = ? AND id_kelas = ? AND id_tahun_ajaran = ?
          AND semester = ? AND jenis_penilaian = ?`,
      [siswaId, kelasId, tahunAjaranId, semester, jenisPenilaian]
    );
    return rows;
  },

  /**
   * ✅ BENAR: Cek apakah nilai sudah ada (sudah filter jenis_penilaian)
   */
  async checkExistingNilai(siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian) {
    const [rows] = await db.execute(
      `SELECT id_nilai_kokurikuler FROM nilai_kokurikuler 
        WHERE id_siswa = ? AND id_aspek_kokurikuler = ? AND id_kelas = ? 
          AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?`,
      [siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * ✅ BENAR: Update nilai kokurikuler yang sudah ada
   */
  async updateNilai(idNilaiKokurikuler, nilai, grade, deskripsi, idJudulProyek = null) {
    await db.execute(
      `UPDATE nilai_kokurikuler 
        SET nilai = ?, grade = ?, deskripsi = ?, id_judul_proyek = ?, updated_at = NOW()
        WHERE id_nilai_kokurikuler = ?`,
      [nilai, grade, deskripsi, idJudulProyek, idNilaiKokurikuler]
    );
  },

  /**
   * ✅ BENAR: Insert nilai kokurikuler baru dengan jenis_penilaian
   */
  async insertNilai(siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek = null) {
    const [result] = await db.execute(
      `INSERT INTO nilai_kokurikuler 
        (id_siswa, id_aspek_kokurikuler, id_kelas, id_tahun_ajaran, semester, jenis_penilaian, nilai, grade, deskripsi, id_judul_proyek)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek]
    );
    return result.insertId;
  },

  /**
   * Ambil kelas ID berdasarkan user guru
   */
  async getKelasByGuru(userId, tahunAjaranId) {
    const [rows] = await db.execute(
      `SELECT kelas_id FROM guru_kelas 
        WHERE user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
      [userId, tahunAjaranId]
    );
    return rows.length > 0 ? rows[0].kelas_id : null;
  },

  /**
   * Ambil tahun ajaran aktif
   */
  async getTahunAjaranAktif() {
    const [rows] = await db.execute(`
      SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas
      FROM tahun_ajaran
      WHERE status = 'aktif'
      LIMIT 1
    `);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * ✅ FIXED: Ambil konfigurasi grade untuk aspek tertentu + filter jenis
   */
  async getKonfigurasiGradeByAspek(aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian) {
    const [rows] = await db.execute(
      `SELECT 
          id_kategori_grade_kokurikuler,
          id_aspek_kokurikuler,
          rentang_min,
          rentang_max,
          grade,
          deskripsi
        FROM kategori_grade_kokurikuler
        WHERE id_aspek_kokurikuler = ? 
          AND kelas_id = ? 
          AND tahun_ajaran_id = ? 
          AND semester = ?
          AND jenis_penilaian = ?
        ORDER BY rentang_min DESC`,
      [aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian]
    );
    return rows;
  },

  /**
   * Hitung grade berdasarkan nilai
   */
  hitungGrade(nilai, konfigurasiGrade) {
    if (nilai === null || nilai === undefined) return null;
    
    const gradeConfig = konfigurasiGrade.find(g => 
      nilai >= parseFloat(g.rentang_min) && nilai <= parseFloat(g.rentang_max)
    );
    
    return gradeConfig ? {
      grade: gradeConfig.grade,
      deskripsi: gradeConfig.deskripsi
    } : null;
  }
};

module.exports = kokurikulerModel;