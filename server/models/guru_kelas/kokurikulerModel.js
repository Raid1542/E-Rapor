/**
 * Nama File: kokurikulerModel.js
 * Fungsi: Model nilai kokurikuler siswa (filter jenis_penilaian PTS/PAS)
 *         Menangani CRUD nilai kokurikuler per aspek (BPI, Proyek, Literasi, Mutaba'ah)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta untuk query SQL
const QUERY_GET_SISWA_BY_KELAS = `
  SELECT s.id_siswa, s.nama_lengkap, s.nis, s.nisn 
  FROM siswa s 
  INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
  WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
  ORDER BY s.nama_lengkap
`;

const QUERY_GET_NILAI_BY_KELAS = `
  SELECT id_nilai_kokurikuler, id_siswa, id_aspek_kokurikuler, nilai, grade, deskripsi, id_judul_proyek, jenis_penilaian 
  FROM nilai_kokurikuler 
  WHERE id_kelas = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?
`;

const QUERY_GET_NILAI_BY_SISWA = `
  SELECT id_nilai_kokurikuler, id_aspek_kokurikuler, nilai, grade, deskripsi, id_judul_proyek, jenis_penilaian 
  FROM nilai_kokurikuler 
  WHERE id_siswa = ? AND id_kelas = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?
`;

const QUERY_CHECK_EXISTING_NILAI = `
  SELECT id_nilai_kokurikuler 
  FROM nilai_kokurikuler 
  WHERE id_siswa = ? AND id_aspek_kokurikuler = ? AND id_kelas = ? AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?
`;

const QUERY_UPDATE_NILAI = `
  UPDATE nilai_kokurikuler 
  SET nilai = ?, grade = ?, deskripsi = ?, id_judul_proyek = ?, updated_at = NOW() 
  WHERE id_nilai_kokurikuler = ?
`;

const QUERY_INSERT_NILAI = `
  INSERT INTO nilai_kokurikuler 
  (id_siswa, id_aspek_kokurikuler, id_kelas, id_tahun_ajaran, semester, jenis_penilaian, nilai, grade, deskripsi, id_judul_proyek) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const QUERY_GET_KELAS_BY_GURU = `
  SELECT kelas_id 
  FROM guru_kelas 
  WHERE user_id = ? AND tahun_ajaran_id = ? 
  LIMIT 1
`;

const QUERY_GET_TAHUN_AJARAN_AKTIF = `
  SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas 
  FROM tahun_ajaran 
  WHERE status = 'aktif' 
  LIMIT 1
`;

const QUERY_GET_KONFIGURASI_GRADE = `
  SELECT id_kategori_grade_kokurikuler, id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi 
  FROM kategori_grade_kokurikuler 
  WHERE id_aspek_kokurikuler = ? AND kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ? 
  ORDER BY rentang_min DESC
`;

const kokurikulerModel = {
  // Ambil semua siswa di kelas tertentu
  async getSiswaByKelas(kelasId, tahunAjaranId) {
    if (!kelasId || !tahunAjaranId) {
      throw new Error('ID kelas dan tahun ajaran wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_SISWA_BY_KELAS, [kelasId, tahunAjaranId]);
      return rows;
    } catch (err) {
      console.error('Error getSiswaByKelas:', err);
      throw new Error('Gagal mengambil data siswa');
    }
  },

  // Ambil semua nilai kokurikuler untuk kelas tertentu (filter jenis)
  async getNilaiByKelas(kelasId, tahunAjaranId, semester, jenisPenilaian) {
    if (!kelasId || !tahunAjaranId || !semester || !jenisPenilaian) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_NILAI_BY_KELAS, [kelasId, tahunAjaranId, semester, jenisPenilaian]);
      return rows;
    } catch (err) {
      console.error('Error getNilaiByKelas:', err);
      throw new Error('Gagal mengambil nilai kokurikuler');
    }
  },

  // Ambil nilai kokurikuler untuk satu siswa (filter jenis)
  async getNilaiBySiswa(siswaId, kelasId, tahunAjaranId, semester, jenisPenilaian) {
    if (!siswaId || !kelasId || !tahunAjaranId || !semester || !jenisPenilaian) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_NILAI_BY_SISWA, [siswaId, kelasId, tahunAjaranId, semester, jenisPenilaian]);
      return rows;
    } catch (err) {
      console.error('Error getNilaiBySiswa:', err);
      throw new Error('Gagal mengambil nilai siswa');
    }
  },

  // Cek apakah nilai kokurikuler sudah ada (filter jenis)
  async checkExistingNilai(siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian) {
    if (!siswaId || !aspekId || !kelasId || !tahunAjaranId || !semester || !jenisPenilaian) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_CHECK_EXISTING_NILAI, [siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian]);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Error checkExistingNilai:', err);
      throw new Error('Gagal mengecek nilai yang ada');
    }
  },

  // Update nilai kokurikuler yang sudah ada
  async updateNilai(idNilaiKokurikuler, nilai, grade, deskripsi, idJudulProyek = null) {
    if (!idNilaiKokurikuler || nilai === undefined || !grade || !deskripsi) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      await db.execute(QUERY_UPDATE_NILAI, [nilai, grade, deskripsi, idJudulProyek, idNilaiKokurikuler]);
    } catch (err) {
      console.error('Error updateNilai:', err);
      throw new Error('Gagal memperbarui nilai');
    }
  },

  // Insert nilai kokurikuler baru dengan jenis_penilaian
  async insertNilai(siswaId, aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian, nilai, grade, deskripsi, idJudulProyek = null) {
    if (!siswaId || !aspekId || !kelasId || !tahunAjaranId || !semester || !jenisPenilaian || nilai === undefined || !grade || !deskripsi) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [result] = await db.execute(QUERY_INSERT_NILAI, [
        siswaId,
        aspekId,
        kelasId,
        tahunAjaranId,
        semester,
        jenisPenilaian,
        nilai,
        grade,
        deskripsi,
        idJudulProyek,
      ]);
      return result.insertId;
    } catch (err) {
      console.error('Error insertNilai:', err);
      throw new Error('Gagal menyimpan nilai baru');
    }
  },

  // Ambil kelas ID berdasarkan user guru
  async getKelasByGuru(userId, tahunAjaranId) {
    if (!userId || !tahunAjaranId) {
      throw new Error('ID user dan tahun ajaran wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_KELAS_BY_GURU, [userId, tahunAjaranId]);
      return rows.length > 0 ? rows[0].kelas_id : null;
    } catch (err) {
      console.error('Error getKelasByGuru:', err);
      throw new Error('Gagal mengambil data kelas guru');
    }
  },

  // Ambil tahun ajaran aktif
  async getTahunAjaranAktif() {
    try {
      const [rows] = await db.execute(QUERY_GET_TAHUN_AJARAN_AKTIF);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Error getTahunAjaranAktif:', err);
      throw new Error('Gagal mengambil tahun ajaran aktif');
    }
  },

  // Ambil konfigurasi grade untuk aspek tertentu (filter jenis)
  async getKonfigurasiGradeByAspek(aspekId, kelasId, tahunAjaranId, semester, jenisPenilaian) {
    if (!aspekId || !kelasId || !tahunAjaranId || !semester || !jenisPenilaian) {
      throw new Error('Parameter wajib diisi');
    }

    try {
      const [rows] = await db.execute(QUERY_GET_KONFIGURASI_GRADE, [
        aspekId,
        kelasId,
        tahunAjaranId,
        semester,
        jenisPenilaian,
      ]);
      return rows;
    } catch (err) {
      console.error('Error getKonfigurasiGradeByAspek:', err);
      throw new Error('Gagal mengambil konfigurasi grade');
    }
  },

  // Hitung grade berdasarkan nilai dan konfigurasi
  hitungGrade(nilai, konfigurasiGrade) {
    if (nilai === null || nilai === undefined) {
      return null;
    }

    if (!Array.isArray(konfigurasiGrade)) {
      throw new Error('Konfigurasi grade harus berupa array');
    }

    const gradeConfig = konfigurasiGrade.find(g =>
      nilai >= parseFloat(g.rentang_min) && nilai <= parseFloat(g.rentang_max)
    );

    return gradeConfig ? { grade: gradeConfig.grade, deskripsi: gradeConfig.deskripsi } : null;
  },
};

module.exports = kokurikulerModel;