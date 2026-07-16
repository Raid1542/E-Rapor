/**
 * Nama File: nilaiModel.js
 * Fungsi: Model operasi nilai akademik (validasi akses, simpan, ambil)
 *         Menangani CRUD nilai detail per komponen penilaian dengan validasi ketat
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 * Update: 15 Juli 2026 - Penyesuaian dengan logika Guru Bidang Studi (izin null untuk reset nilai, validasi integer ketat)
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA QUERY SQL
// ═════════════════════════════════════════════════════════════════════════════

const QUERY_CHECK_AKSES = `
  SELECT 1 FROM pembelajaran p 
  WHERE p.user_id = ? AND p.mapel_id = ? AND p.kelas_id = ? AND p.tahun_ajaran_id = ?
`;

const QUERY_CHECK_SISWA_KELAS = `
  SELECT 1 FROM siswa_kelas 
  WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?
`;

const QUERY_CHECK_STATUS_SISWA = `
  SELECT status FROM siswa WHERE id_siswa = ?
`;

// ✅ PERBAIKAN: Mendukung nilai NULL untuk mereset/menghapus nilai yang salah input
const QUERY_SIMPAN_NILAI = `
  INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id) 
  VALUES (?, ?, ?, ?, ?) 
  ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = CURRENT_TIMESTAMP
`;

const QUERY_GET_NILAI_BY_KELAS_MAPEL = `
  SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, nd.komponen_id, kp.nama_komponen, nd.nilai, nd.created_at
  FROM siswa_kelas sk
  JOIN siswa s ON sk.siswa_id = s.id_siswa
  LEFT JOIN nilai_detail nd ON s.id_siswa = nd.siswa_id AND nd.mapel_id = ? AND nd.tahun_ajaran_id = ?
  LEFT JOIN komponen_penilaian kp ON nd.komponen_id = kp.id_komponen
  WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
  ORDER BY s.nama_lengkap ASC, kp.urutan ASC
`;

const QUERY_GET_MAPEL_BY_KELAS = `
  SELECT mp.id_mata_pelajaran AS mapel_id, mp.nama_mapel, mp.jenis, p.user_id AS pengajar_id,
    CASE WHEN p.user_id = ? THEN 1 ELSE 0 END AS bisa_input
  FROM pembelajaran p
  JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
  WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
  ORDER BY mp.jenis DESC, mp.nama_mapel ASC
`;

// ═════════════════════════════════════════════════════════════════════════════
// FUNGSI MODEL
// ═════════════════════════════════════════════════════════════════════════════

const nilaiModel = {
  /**
   * Cek apakah user berhak menginput nilai untuk mapel di kelas tertentu
   */
  async canUserInputNilai(userId, mapelId, kelasId, tahunAjaranId) {
    if (!userId || !mapelId || !kelasId || !tahunAjaranId) {
      throw new Error('Parameter wajib diisi untuk cek akses');
    }

    try {
      const [results] = await db.execute(QUERY_CHECK_AKSES, [userId, mapelId, kelasId, tahunAjaranId]);
      return results.length > 0;
    } catch (err) {
      console.error('Error canUserInputNilai:', err);
      throw new Error('Gagal mengecek akses user');
    }
  },

  /**
   * Simpan atau perbarui nilai per komponen penilaian
   * ✅ PERTAHANAN TERAKHIR TERHADAP HUMAN ERROR
   */
  async simpanNilaiDetail(data) {
    const { siswa_id, mapel_id, komponen_id, nilai, kelas_id, tahun_ajaran_id, user_id } = data;

    // 1. Validasi parameter wajib (izinkan nilai null/'' untuk reset/hapus nilai)
    if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined || !kelas_id || !tahun_ajaran_id || !user_id) {
      throw new Error('Data tidak lengkap. Semua parameter wajib diisi.');
    }

    try {
      let parsedNilai = null;

      // 2. ✅ PERBAIKAN: Validasi ketat BILANGAN BULAT (Integer) 0-100, tapi izinkan null untuk reset
      if (nilai !== null && nilai !== '') {
        const strNilai = String(nilai).trim();
        
        // Cek manual apakah ada tanda desimal (titik atau koma)
        if (strNilai.includes('.') || strNilai.includes(',')) {
          throw new Error(`Nilai harus berupa bilangan bulat. Diterima: "${nilai}" (desimal tidak diizinkan)`);
        }

        parsedNilai = parseInt(strNilai, 10);

        if (isNaN(parsedNilai)) {
          throw new Error(`Format nilai tidak valid: "${nilai}". Harus berupa angka.`);
        }

        if (parsedNilai < 0 || parsedNilai > 100) {
          throw new Error(`Nilai harus berada di antara 0 sampai 100. Diterima: ${parsedNilai}`);
        }
      }

      // 3. Cek siswa terdaftar di kelas
      const [siswaCheck] = await db.execute(QUERY_CHECK_SISWA_KELAS, [siswa_id, kelas_id, tahun_ajaran_id]);
      if (siswaCheck.length === 0) {
        throw new Error(`Siswa (ID: ${siswa_id}) tidak terdaftar di kelas ini.`);
      }

      // 4. Cek status siswa
      const [statusCheck] = await db.execute(QUERY_CHECK_STATUS_SISWA, [siswa_id]);
      if (statusCheck.length === 0) {
        throw new Error(`Data siswa (ID: ${siswa_id}) tidak ditemukan.`);
      }
      if (statusCheck[0].status !== 'aktif') {
        throw new Error(`Siswa tidak aktif (status: ${statusCheck[0].status}). Nilai tidak dapat disimpan.`);
      }

      // 5. Cek akses user (Mencegah guru menginput nilai mapel yang bukan ajarannya)
      const hasAccess = await nilaiModel.canUserInputNilai(user_id, mapel_id, kelas_id, tahun_ajaran_id);
      if (!hasAccess) {
        throw new Error('Akses ditolak: Anda tidak mengajar mata pelajaran ini di kelas tersebut.');
      }

      // 6. Simpan nilai (parsedNilai bisa berupa angka 0-100 atau null untuk reset)
      await db.execute(QUERY_SIMPAN_NILAI, [siswa_id, mapel_id, komponen_id, parsedNilai, tahun_ajaran_id]);
      
      return { siswa_id, mapel_id, komponen_id, nilai: parsedNilai, tahun_ajaran_id };
    } catch (err) {
      console.error('Error simpanNilaiDetail:', err);
      // Lempar error ke controller agar bisa ditangkap dan ditampilkan ke user dengan rapi
      throw err; 
    }
  },

  /**
   * Ambil nilai siswa berdasarkan kelas dan mata pelajaran
   */
  async getNilaiByKelasMapel(kelasId, mapelId, tahunAjaranId) {
    if (!kelasId || !mapelId || !tahunAjaranId) {
      throw new Error('Parameter wajib diisi untuk mengambil nilai');
    }

    try {
      const [results] = await db.execute(QUERY_GET_NILAI_BY_KELAS_MAPEL, [mapelId, tahunAjaranId, kelasId, tahunAjaranId]);
      
      // Transformasi data: Biarkan null tetap null agar UI bisa membedakan 'belum diinput' vs 'nilai 0'
      return results;
    } catch (err) {
      console.error('Error getNilaiByKelasMapel:', err);
      throw new Error('Gagal mengambil data nilai siswa');
    }
  },

  /**
   * Ambil daftar mata pelajaran yang diajarkan di kelas (dengan validasi akses user)
   */
  async getMapelByKelas(kelasId, tahunAjaranId, userId) {
    if (!kelasId || !tahunAjaranId || !userId) {
      throw new Error('Parameter wajib diisi untuk mengambil daftar mapel');
    }

    try {
      const [results] = await db.execute(QUERY_GET_MAPEL_BY_KELAS, [userId, kelasId, tahunAjaranId]);
      return results.map(row => ({
        mata_pelajaran_id: row.mapel_id,
        nama_mapel: row.nama_mapel,
        jenis: row.jenis,
        bisa_input: Boolean(row.bisa_input),
      }));
    } catch (err) {
      console.error('Error getMapelByKelas:', err);
      throw new Error('Gagal mengambil daftar mata pelajaran');
    }
  },
};

module.exports = nilaiModel;