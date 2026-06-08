/**
 * Nama File: absensiController.js
 * Fungsi: Controller untuk mengelola absensi siswa oleh guru kelas.
 * Lokasi: controllers/guru_kelas/absensiController.js
 */

const db = require('../../config/db');

// Mendapatkan daftar siswa beserta data absensinya
exports.getAbsensiSiswa = async (req, res) => {
  try {
    const userId = req.user.id;
    const tahunAjaranIndukId = req.idTahunAjaranInduk;
    const semesterId = req.idSemesterAktif;
    const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
      return res.status(400).json({
        success: false,
        message: 'Data tahun ajaran atau semester tidak ditemukan',
      });
    }

    // Validasi guru kelas pakai ID INDUK
    const [guruKelasRows] = await db.execute(
      `SELECT gk.kelas_id, k.nama_kelas
       FROM guru_kelas gk
       JOIN kelas k ON gk.kelas_id = k.id_kelas
       WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
      [userId, tahunAjaranIndukId]
    );

    if (guruKelasRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kelas aktif tidak ditemukan.',
      });
    }

    const { kelas_id, nama_kelas } = guruKelasRows[0];

    // Ambil semua siswa di kelas pakai ID INDUK
    const [siswaRows] = await db.execute(
      `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn
       FROM siswa s
       JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
       WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
       ORDER BY s.nama_lengkap`,
      [kelas_id, tahunAjaranIndukId]
    );

    // Ambil data absensi yang sudah ada pakai ID SEMESTER
    const [absensiRows] = await db.execute(
      `SELECT id_absensi, siswa_id, sakit, izin, alpha
       FROM absensi
       WHERE kelas_id = ? AND tahun_ajaran_id = ?
         AND semester = ? AND jenis_penilaian = ?`,
      [kelas_id, semesterId, semester, jenis_penilaian]
    );

    // Buat map absensi berdasarkan siswa_id
    const absensiMap = new Map();
    absensiRows.forEach(a => absensiMap.set(a.siswa_id, a));

    // Gabungkan data siswa dengan absensi
    const data = siswaRows.map(siswa => {
      const absensi = absensiMap.get(siswa.id_siswa);
      return {
        id: siswa.id_siswa,
        nama: siswa.nama,
        nis: siswa.nis,
        nisn: siswa.nisn,
        id_absensi: absensi?.id_absensi || null,
        jumlah_sakit: absensi?.sakit ?? 0,
        jumlah_izin: absensi?.izin ?? 0,
        jumlah_alpha: absensi?.alpha ?? 0,
        sudah_diinput: !!absensi,
      };
    });

    res.json({ success: true, data, kelas: nama_kelas });
  } catch (err) {
    console.error('Error getAbsensiSiswa:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data absensi',
    });
  }
};

// Menyimpan atau memperbarui absensi siswa (UPSERT)
exports.upsertAbsensi = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id_siswa, sakit, izin, alpha } = req.body;

    if (!id_siswa) {
      return res.status(400).json({
        success: false,
        message: 'id_siswa wajib diisi',
      });
    }

    // Validasi nilai tidak boleh negatif atau lebih dari 180
    const nilaiFields = { sakit, izin, alpha };
    for (const [key, val] of Object.entries(nilaiFields)) {
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 180) {
        return res.status(400).json({
          success: false,
          message: `Nilai ${key} tidak valid. Harus antara 0 dan 180.`,
        });
      }
    }

    const tahunAjaranIndukId = req.idTahunAjaranInduk;
    const semesterId = req.idSemesterAktif;
    const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
      return res.status(400).json({
        success: false,
        message: 'Data tahun ajaran atau semester tidak ditemukan',
      });
    }

    // Validasi guru kelas pakai ID INDUK
    const [guruKelasRows] = await db.execute(
      `SELECT kelas_id FROM guru_kelas
       WHERE user_id = ? AND tahun_ajaran_id = ?`,
      [userId, tahunAjaranIndukId]
    );

    if (guruKelasRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kelas aktif tidak ditemukan.',
      });
    }

    const { kelas_id } = guruKelasRows[0];

    // Validasi siswa memang ada di kelas ini
    const [siswaValid] = await db.execute(
      `SELECT 1 FROM siswa_kelas
       WHERE siswa_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
      [id_siswa, kelas_id, tahunAjaranIndukId]
    );

    if (siswaValid.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Siswa tidak terdaftar di kelas Anda.',
      });
    }

    // UPSERT — insert jika belum ada, update jika sudah ada
    await db.execute(
      `INSERT INTO absensi
         (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian,
          sakit, izin, alpha, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         sakit      = VALUES(sakit),
         izin       = VALUES(izin),
         alpha      = VALUES(alpha),
         updated_at = NOW()`,
      [
        id_siswa,
        kelas_id,
        semesterId,
        semester,
        jenis_penilaian,
        Number(sakit) || 0,
        Number(izin) || 0,
        Number(alpha) || 0,
      ]
    );

    res.json({
      success: true,
      message: 'Absensi berhasil disimpan',
    });
  } catch (err) {
    console.error('Error upsertAbsensi:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan absensi',
    });
  }
};