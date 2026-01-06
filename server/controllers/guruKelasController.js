/**
 * Nama File: guruKelasController.js
 * Fungsi: Controller untuk mengelola operasi backend guru kelas dalam sistem E-Rapor,
 *         mencakup manajemen siswa, profil, absensi, catatan wali kelas,
 *         ekstrakurikuler, kokurikuler, dan penilaian akademik.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');
const bcrypt = require('bcrypt');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const puppeteer = require('puppeteer');
const JSZip = require('jszip');
const execAsync = promisify(exec);
const ExcelJS = require('exceljs');

// Models
const absensiModel = require('../models/absensiModel');
const catatanWaliKelasModel = require('../models/catatanWaliKelasModel');
const ekstrakurikulerModel = require('../models/ekstrakurikulerModel');
const kokurikulerModel = require('../models/kokurikulerModel');
const guruModel = require('../models/guruModel');
const nilaiModel = require('../models/nilaiModel');
const konfigurasiNilaiRaporModel = require('../models/konfigurasiNilaiRaporModel');
const konfigurasiNilaiKokurikulerModel = require('../models/konfigurasiNilaiKokurikuler');
const bobotPenilaianModel = require('../models/bobotPenilaianModel');
const komponenPenilaianModel = require('../models/komponenPenilaianModel');

// Helper: Validasi apakah mata pelajaran adalah mapel wajib yang diampu guru kelas
const isMapelWajibGuruKelas = async (userId, mapelId) => {
  const [rows] = await db.execute(
    `
      SELECT mp.id_mata_pelajaran
      FROM mata_pelajaran mp
      JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mata_pelajaran_id
      JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
      WHERE mp.id_mata_pelajaran = ?
        AND gk.user_id = ?
        AND mp.jenis = 'wajib'
        AND gk.tahun_ajaran_id = (
          SELECT id_tahun_ajaran
          FROM tahun_ajaran
          WHERE status = 'aktif'
          LIMIT 1
        )
    `,
    [mapelId, userId]
  );
  return rows.length > 0;
};

// Mendapatkan informasi kelas yang diampu oleh guru kelas pada tahun ajaran aktif
exports.getKelasSaya = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID tidak ditemukan' });
    }

    const query = `
      SELECT 
        k.nama_kelas,
        COUNT(sk.siswa_id) AS jumlah_siswa,
        ta.tahun_ajaran,
        ta.semester
      FROM user u
      INNER JOIN guru g ON u.id_user = g.user_id
      INNER JOIN guru_kelas gk ON g.user_id = gk.user_id  
      INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
      INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
      LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
        AND sk.tahun_ajaran_id = ta.id_tahun_ajaran
      WHERE u.id_user = ? AND ta.status = 'aktif'
      GROUP BY k.id_kelas, ta.id_tahun_ajaran, ta.semester
    `;
    const [rows] = await db.execute(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Anda belum ditugaskan sebagai guru kelas pada tahun ajaran ini.',
      });
    }

    res.json(
      rows.map(row => ({
        kelas: row.nama_kelas,
        jumlah_siswa: row.jumlah_siswa,
        tahun_ajaran: row.tahun_ajaran,
        semester: row.semester,
      }))
    );
  } catch (err) {
    console.error('Error di getKelasSaya:', err);
    res.status(500).json({ message: 'Gagal mengambil data kelas' });
  }
};

// Mendapatkan daftar siswa di kelas yang diampu oleh guru kelas
exports.getSiswaByKelas = async (req, res) => {
  try {
    const userId = req.user.id;
    const [guruKelasRows] = await db.execute(
      `
        SELECT gk.kelas_id, k.nama_kelas
        FROM guru_kelas gk
        JOIN kelas k ON gk.kelas_id = k.id_kelas
        WHERE gk.user_id = ?
          AND gk.tahun_ajaran_id = (
            SELECT id_tahun_ajaran
            FROM tahun_ajaran
            WHERE status = 'aktif'
            LIMIT 1
          )
      `,
      [userId]
    );

    if (guruKelasRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran aktif.',
      });
    }

    const { kelas_id } = guruKelasRows[0];
    const [siswaRows] = await db.execute(
      `
        SELECT 
          s.id_siswa AS id,
          s.nis, s.nisn, s.nama_lengkap AS nama,
          s.tempat_lahir, s.tanggal_lahir, s.jenis_kelamin, s.alamat, s.status,
          k.nama_kelas AS kelas, k.fase
        FROM siswa s
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        JOIN kelas k ON sk.kelas_id = k.id_kelas
        WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = (
          SELECT id_tahun_ajaran
          FROM tahun_ajaran
          WHERE status = 'aktif'
          LIMIT 1
        )
        ORDER BY s.nama_lengkap
      `,
      [kelas_id]
    );

    res.json({
      success: true,
      data: siswaRows.map(row => ({
        ...row,
        statusSiswa: row.status || 'aktif',
      })),
    });
  } catch (err) {
    console.error('Error di getSiswaByKelas:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
  }
};

// Memperbarui data profil guru (user + guru)
exports.editProfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nama_lengkap,
      email_sekolah,
      niy,
      nuptk,
      jenis_kelamin,
      no_telepon,
      alamat,
    } = req.body;

    if (!nama_lengkap || !email_sekolah) {
      return res.status(400).json({ message: 'Nama dan email wajib diisi' });
    }

    await db.execute(
      'UPDATE user SET nama_lengkap = ?, email_sekolah = ? WHERE id_user = ?',
      [nama_lengkap, email_sekolah, userId]
    );
    await db.execute(
      'UPDATE guru SET niy = ?, nuptk = ?, jenis_kelamin = ?, no_telepon = ?, alamat = ? WHERE user_id = ?',
      [niy, nuptk, jenis_kelamin, no_telepon, alamat, userId]
    );

    const [userRows] = await db.execute(
      'SELECT id_user, nama_lengkap, email_sekolah FROM user WHERE id_user = ?',
      [userId]
    );
    const [guruRows] = await db.execute(
      'SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, foto_path FROM guru WHERE user_id = ?',
      [userId]
    );

    if (userRows.length === 0 || guruRows.length === 0) {
      return res.status(404).json({ message: 'Profil tidak ditemukan' });
    }

    const user = {
      id: userRows[0].id_user,
      role: 'guru kelas',
      nama_lengkap: userRows[0].nama_lengkap,
      email_sekolah: userRows[0].email_sekolah,
      niy: guruRows[0].niy,
      nuptk: guruRows[0].nuptk,
      jenis_kelamin: guruRows[0].jenis_kelamin,
      no_telepon: guruRows[0].no_telepon,
      alamat: guruRows[0].alamat,
      profileImage: guruRows[0].foto_path || null,
    };

    res.json({ message: 'Profil berhasil diperbarui', user });
  } catch (err) {
    console.error('Error edit profil guru:', err);
    res.status(500).json({ message: 'Gagal memperbarui profil' });
  }
};

// Mengganti password akun setelah validasi password lama
exports.gantiPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password lama & baru wajib, minimal 8 karakter' });
    }

    const [rows] = await db.execute('SELECT password FROM user WHERE id_user = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Kata sandi lama salah' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE user SET password = ? WHERE id_user = ?', [
      newHashedPassword,
      userId,
    ]);

    res.json({ message: 'Kata sandi berhasil diubah' });
  } catch (err) {
    console.error('Error ganti password:', err);
    res.status(500).json({ message: 'Gagal mengubah kata sandi' });
  }
};

// Mendapatkan data absensi total seluruh siswa di kelas yang diampu
exports.getAbsensiTotal = async (req, res) => {
  try {
    const userId = req.user.id;
    const guruKelas = await absensiModel.getGuruKelasAktif(userId);
    if (!guruKelas) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }

    const { kelas_id, id_tahun_ajaran, nama_kelas } = guruKelas;

    // Ambil jenis & semester dari middleware
    const { jenis, semester } = req.penilaianContext;

    const data = await absensiModel.getAbsensiByKelas(kelas_id, id_tahun_ajaran, semester, jenis);
    res.json({ success: true, data, kelas: nama_kelas });
  } catch (err) {
    console.error('Error getAbsensiTotal:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
  }
};

// Memperbarui absensi siswa berdasarkan periode penilaian aktif (PTS/PAS)
exports.updateAbsensiTotal = async (req, res) => {
  try {
    const { siswa_id } = req.params;
    const { jumlah_sakit, jumlah_izin, jumlah_alpha } = req.body;
    const userId = req.user.id;

    if (!siswa_id) {
      return res.status(400).json({ message: 'ID siswa wajib diisi' });
    }

    // Ambil status periode aktif dari middleware
    const { status_pts, status_pas } = req.tahunAjaranAktif;
    let jenis_penilaian;
    if (status_pts === 'aktif') {
      jenis_penilaian = 'PTS';
    } else if (status_pas === 'aktif') {
      jenis_penilaian = 'PAS';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Periode penilaian tidak aktif. Data absensi tidak dapat diubah.',
      });
    }

    const guruKelas = await absensiModel.getGuruKelasAktif(userId);
    if (!guruKelas) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }

    const { kelas_id, id_tahun_ajaran } = guruKelas;
    const [taRow] = await db.execute(
      'SELECT semester FROM tahun_ajaran WHERE id_tahun_ajaran = ?',
      [id_tahun_ajaran]
    );
    if (taRow.length === 0) {
      return res.status(400).json({ success: false, message: 'Tahun ajaran tidak valid.' });
    }
    const semester = taRow[0].semester;

    await db.execute(
      `
        INSERT INTO absensi (
          siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian,
          sakit, izin, alpha, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          sakit = VALUES(sakit),
          izin = VALUES(izin),
          alpha = VALUES(alpha),
          updated_at = NOW()
      `,
      [
        siswa_id,
        kelas_id,
        id_tahun_ajaran,
        semester,
        jenis_penilaian,
        jumlah_sakit || 0,
        jumlah_izin || 0,
        jumlah_alpha || 0,
      ]
    );

    res.json({ success: true, message: 'Absensi berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateAbsensiTotal:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui absensi' });
  }
};

// Mendapatkan catatan wali kelas untuk seluruh siswa di kelas
exports.getCatatanWaliKelas = async (req, res) => {
  try {
    const userId = req.user.id;
    const guruKelas = await catatanWaliKelasModel.getGuruKelasAktif(userId);
    if (!guruKelas) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }
    const { kelas_id, id_tahun_ajaran, nama_kelas, semester } = guruKelas;
    const { jenis: jenis_penilaian } = req.penilaianContext;

    const data = await catatanWaliKelasModel.getCatatanByKelas(kelas_id, id_tahun_ajaran, semester, jenis_penilaian);
    res.json({ success: true, data, kelas: nama_kelas, semester });
  } catch (err) {
    console.error('Error getCatanWaliKelas:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data catatan' });
  }
};

// Memperbarui catatan wali kelas dan keputusan naik tingkat (hanya di PAS Genap)
exports.updateCatatanWaliKelas = async (req, res) => {
  try {
    console.log('🔍 [DEBUG] req.penilaianContext:', req.penilaianContext);
    console.log('🔍 [DEBUG] req.tahunAjaranAktif:', req.tahunAjaranAktif);
    console.log('🔍 [DEBUG] req.params:', req.params);
    console.log('🔍 [DEBUG] req.body:', req.body);
    const { siswa_id } = req.params;
    const { catatan_wali_kelas = '', naik_tingkat } = req.body;
    const userId = req.user.id;

    // Ambil jenis & semester dari rute (middleware sudah set req.penilaianContext)
    const { jenis: reqJenis, semester: reqSemester } = req.penilaianContext;
    const { status_pts, status_pas, id_tahun_ajaran } = req.tahunAjaranAktif;

    // Validasi: hanya PTS/PAS
    if (!['PTS', 'PAS'].includes(reqJenis)) {
      return res.status(400).json({ message: 'Jenis penilaian harus PTS atau PAS' });
    }

    // Cek apakah periode sudah dikunci
    let periode_dikunci = false;
    if (reqJenis === 'PTS' && status_pts !== 'aktif') {
      periode_dikunci = true;
    } else if (reqJenis === 'PAS' && status_pas !== 'aktif') {
      periode_dikunci = true;
    }

    if (periode_dikunci) {
      return res.status(403).json({
        success: false,
        message: `Rapor ${reqJenis} sudah dikunci. Catatan wali kelas tidak dapat diubah.`,
      });
    }

    // Ambil data guru kelas
    const guruKelas = await catatanWaliKelasModel.getGuruKelasAktif(userId);
    if (!guruKelas) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }
    const { kelas_id } = guruKelas;

    // Validasi: naik tingkat hanya untuk PAS Genap
    let naikTingkatValue = null;
    if (reqJenis === 'PAS' && reqSemester === 'Genap') {
      if (naik_tingkat !== 'ya' && naik_tingkat !== 'tidak') {
        return res.status(400).json({
          message: 'Di semester Genap PAS, keputusan naik tingkat wajib diisi (ya/tidak).',
        });
      }
      naikTingkatValue = naik_tingkat;
    }

    // Simpan ke database (gunakan reqJenis & reqSemester)
    await catatanWaliKelasModel.upsertCatatan(
      siswa_id,
      kelas_id,
      id_tahun_ajaran,
      reqSemester,
      reqJenis,
      catatan_wali_kelas,
      naikTingkatValue
    );

    res.json({
      success: true,
      message: `Catatan wali kelas (${reqJenis} ${reqSemester}) berhasil diperbarui`,
    });
  } catch (err) {
    console.error('Error updateCatatanWaliKelas:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui catatan wali kelas' });
  }
};

// Mendapatkan daftar ekstrakurikuler tiap siswa di kelas yang diampu
exports.getEkskulSiswa = async (req, res) => {
  try {
    const userId = req.user.id;
    const guruKelas = await ekstrakurikulerModel.getGuruKelasAktif(userId);
    if (!guruKelas) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }

    const { kelas_id, id_tahun_ajaran, nama_kelas, tahun_ajaran, semester } = guruKelas;
    const siswaList = await ekstrakurikulerModel.getSiswaInKelas(kelas_id, id_tahun_ajaran);

    const data = [];
    for (const siswa of siswaList) {
      const ekskul = await ekstrakurikulerModel.getEkskulSiswa(siswa.id_siswa, id_tahun_ajaran, semester);
      data.push({
        id: siswa.id_siswa,
        nama: siswa.nama,
        nis: siswa.nis,
        nisn: siswa.nisn,
        ekskul: ekskul.map(e => ({
          id: e.id_ekskul,
          nama: e.nama_ekskul,
          deskripsi: e.deskripsi,
        })),
        jumlah_ekskul: ekskul.length,
      });
    }

    const daftar_ekskul = await ekstrakurikulerModel.getDaftarEkskulAktif(id_tahun_ajaran);
    res.json({
      success: true,
      data,
      daftar_ekskul,
      kelas: nama_kelas,
      tahun_ajaran,
    });
  } catch (err) {
    console.error('Error getEkskulSiswa:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data ekstrakurikuler' });
  }
};

// Memperbarui daftar ekstrakurikuler siswa (maksimal 3 item)
exports.updateEkskulSiswa = async (req, res) => {
  try {
    const { siswaId } = req.params;
    const { ekskulList } = req.body;

    if (!Array.isArray(ekskulList) || ekskulList.length > 3) {
      return res.status(400).json({
        message: 'ekskulList harus berupa array, maksimal 3 item',
      });
    }

    const userId = req.user.id;
    const guruKelas = await ekstrakurikulerModel.getGuruKelasAktif(userId);
    if (!guruKelas) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }

    const valid = await ekstrakurikulerModel.isSiswaInKelas(siswaId, guruKelas.kelas_id, guruKelas.id_tahun_ajaran);
    if (!valid) {
      return res.status(403).json({ message: 'Siswa tidak terdaftar di kelas Anda' });
    }

    await ekstrakurikulerModel.savePesertaEkskul(siswaId, guruKelas.id_tahun_ajaran, ekskulList);
    res.json({ success: true, message: 'Ekstrakurikuler berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateEkskulSiswa:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui ekstrakurikuler' });
  }
};

// Helper: Hitung grade & deskripsi berdasarkan nilai dan ID aspek
const getGradeFromConfig = (configList, nilai, idAspek) => {
  if (nilai === null || nilai === undefined) {
    return { grade: null, deskripsi: null };
  }
  const configForAspek = configList.filter(c => c.id_aspek_kokurikuler === idAspek);
  for (const conf of configForAspek) {
    if (nilai >= conf.rentang_min && nilai <= conf.rentang_max) {
      return {
        grade: conf.grade,
        deskripsi: conf.deskripsi,
      };
    }
  }
  return { grade: null, deskripsi: null };
};

// Mendapatkan data nilai kokurikuler seluruh siswa di kelas (untuk tampilan tabel)
exports.getNilaiKokurikuler = async (req, res) => {
  try {
    const userId = req.user.id;
    // Langkah 1: Ambil data kelas dan tahun ajaran aktif
    const [guruKelasRows] = await db.execute(
      `
        SELECT
          gk.kelas_id,
          gk.tahun_ajaran_id,
          k.nama_kelas,
          ta.semester,
          ta.status_pts,
          ta.status_pas
        FROM guru_kelas gk
        JOIN kelas k ON gk.kelas_id = k.id_kelas
        JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE gk.user_id = ? AND ta.status = 'aktif'
      `,
      [userId]
    );

    if (guruKelasRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Anda belum ditetapkan sebagai wali kelas pada tahun ajaran aktif.',
      });
    }

    const { kelas_id, tahun_ajaran_id, nama_kelas, semester, status_pts, status_pas } = guruKelasRows[0];

    // Langkah 2: Tentukan jenis_penilaian berdasarkan status
    let jenis_penilaian = null;
    if (status_pts === 'aktif') {
      jenis_penilaian = 'PTS';
    } else if (status_pas === 'aktif') {
      jenis_penilaian = 'PAS';
    }

    if (!jenis_penilaian) {
      return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif' });
    }

    // Sisanya tetap sama...
    const [rawRows] = await db.execute(
      `
        SELECT
          nk.id_siswa,
          nk.nilai_mutabaah,
          nk.nilai_bpi,
          nk.nilai_literasi,
          nk.nilai_proyek,
          jpt.judul AS nama_judul_proyek
        FROM nilai_kokurikuler nk
        LEFT JOIN judul_proyek_per_tahun_ajaran jpt ON nk.id_judul_proyek = jpt.id_judul_proyek
        WHERE nk.id_kelas = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
      `,
      [kelas_id, tahun_ajaran_id, semester, jenis_penilaian]
    );

    const [gradeConfig] = await db.execute(
      `
        SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
        FROM kategori_grade_kokurikuler
        WHERE tahun_ajaran_id = ? AND semester = ?
        ORDER BY rentang_min DESC
      `,
      [tahun_ajaran_id, semester]
    );

    const result = rawRows.map(row => {
      const mutabaah = getGradeFromConfig(gradeConfig, row.nilai_mutabaah, 1);
      const bpi = getGradeFromConfig(gradeConfig, row.nilai_bpi, 3);
      const literasi = getGradeFromConfig(gradeConfig, row.nilai_literasi, 2);
      const proyek = getGradeFromConfig(gradeConfig, row.nilai_proyek, 4);
      return {
        siswa_id: row.id_siswa,
        mutabaah_nilai: row.nilai_mutabaah,
        bpi_nilai: row.nilai_bpi,
        literasi_nilai: row.nilai_literasi,
        judul_proyek_nilai: row.nilai_proyek,
        nama_judul_proyek: row.nama_judul_proyek || '',
        mutabaah_grade: mutabaah.grade,
        bpi_grade: bpi.grade,
        literasi_grade: literasi.grade,
        judul_proyek_grade: proyek.grade,
        mutabaah_deskripsi: mutabaah.deskripsi,
        bpi_deskripsi: bpi.deskripsi,
        literasi_deskripsi: literasi.deskripsi,
        judul_proyek_deskripsi: proyek.deskripsi,
      };
    });

    // ... (bagian siswaMap tetap sama)

    const [siswaRows] = await db.execute(
      `
        SELECT id_siswa, nama_lengkap, nis, nisn
        FROM siswa s
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
        ORDER BY s.nama_lengkap
      `,
      [kelas_id, tahun_ajaran_id]
    );

    const siswaMap = new Map();
    siswaRows.forEach(s => {
      siswaMap.set(s.id_siswa, {
        id: s.id_siswa,
        nama: s.nama_lengkap,
        nis: s.nis,
        nisn: s.nisn,
        kokurikuler: {
          mutabaah_nilai: null,
          mutabaah_grade: null,
          mutabaah_deskripsi: null,
          bpi_nilai: null,
          bpi_grade: null,
          bpi_deskripsi: null,
          literasi_nilai: null,
          literasi_grade: null,
          literasi_deskripsi: null,
          judul_proyek_nilai: null,
          judul_proyek_grade: null,
          judul_proyek_deskripsi: null,
          nama_judul_proyek: null,
        },
      });
    });

    result.forEach(item => {
      if (siswaMap.has(item.siswa_id)) {
        siswaMap.get(item.siswa_id).kokurikuler = item;
      }
    });

    const finalData = Array.from(siswaMap.values());
    res.json({
      success: true,
      data: finalData,
      kelas: nama_kelas,
      kelasId: kelas_id,
      tahunAjaranId: tahun_ajaran_id,
      semester: semester,
    });
  } catch (error) {
    console.error('Error getNilaiKokurikuler:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data nilai kokurikuler',
    });
  }
};

// Memperbarui nilai kokurikuler siswa, termasuk judul proyek
exports.updateNilaiKokurikuler = async (req, res) => {
  const { siswaId } = req.params;
  const {
    mutabaah_nilai,
    bpi_nilai,
    literasi_nilai,
    judul_proyek_nilai,
    nama_judul_proyek,
  } = req.body;

  try {
    const userId = req.user.id;

    // Tentukan jenis penilaian berdasarkan status periode aktif
    const { status_pts, status_pas } = req.tahunAjaranAktif;
    let jenis_penilaian;
    if (status_pts === 'aktif') {
      jenis_penilaian = 'PTS';
    } else if (status_pas === 'aktif') {
      jenis_penilaian = 'PAS';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Periode penilaian tidak aktif. Data kokurikuler tidak dapat diubah.',
      });
    }

    // Ambil data kelas dan tahun ajaran aktif
    const [gkRows] = await db.execute(
      `
        SELECT gk.kelas_id, gk.tahun_ajaran_id, ta.semester
        FROM guru_kelas gk
        JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE gk.user_id = ? AND ta.status = 'aktif'
        LIMIT 1
      `,
      [userId]
    );

    if (gkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kelas aktif tidak ditemukan.',
      });
    }
    const { kelas_id, tahun_ajaran_id, semester } = gkRows[0];

    // Cari atau buat judul proyek jika diberikan
    let id_judul_proyek = null;
    if (nama_judul_proyek && nama_judul_proyek.trim() !== '') {
      const judulBersih = nama_judul_proyek.trim();
      const [existing] = await db.query(
        `SELECT id_judul_proyek FROM judul_proyek_per_tahun_ajaran 
         WHERE id_tahun_ajaran = ? AND judul = ?`,
        [tahun_ajaran_id, judulBersih]
      );

      if (existing.length > 0) {
        id_judul_proyek = existing[0].id_judul_proyek;
      } else {
        const [newRow] = await db.query(
          `INSERT INTO judul_proyek_per_tahun_ajaran 
           (id_tahun_ajaran, judul, deskripsi, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [tahun_ajaran_id, judulBersih, 'Deskripsi proyek otomatis']
        );
        id_judul_proyek = newRow.insertId;
      }
    }

    // Ambil konfigurasi kategori grade untuk semester ini
    const [gradeConfig] = await db.query(
      `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi
      FROM kategori_grade_kokurikuler
      WHERE tahun_ajaran_id = ? AND semester = ?
      ORDER BY rentang_min DESC`,
      [tahun_ajaran_id, semester]
    );

    // Hitung grade dan deskripsi untuk SEMUA aspek kokurikuler
    const mutabaah = getGradeFromConfig(gradeConfig, mutabaah_nilai || 0, 1);  // aspek_id = 1
    const bpiGrade = getGradeFromConfig(gradeConfig, bpi_nilai || 0, 3);       // aspek_id = 3
    const literasiGrade = getGradeFromConfig(gradeConfig, literasi_nilai || 0, 2);  // aspek_id = 2
    const proyekGrade = getGradeFromConfig(gradeConfig, judul_proyek_nilai || 0, 4); // aspek_id = 4

    console.log('🔍 DEBUG Simpan Kokurikuler:', {
      mutabaah: { nilai: mutabaah_nilai, grade: mutabaah.grade, deskripsi: mutabaah.deskripsi },
      bpi: { nilai: bpi_nilai, grade: bpiGrade.grade, deskripsi: bpiGrade.deskripsi },
      literasi: { nilai: literasi_nilai, grade: literasiGrade.grade, deskripsi: literasiGrade.deskripsi },
      proyek: { nilai: judul_proyek_nilai, grade: proyekGrade.grade, deskripsi: proyekGrade.deskripsi }
    });

    // Simpan SEMUA grade dan deskripsi ke database
    await db.query(
          `INSERT INTO nilai_kokurikuler (
        id_siswa, id_kelas, id_tahun_ajaran, semester, jenis_penilaian,
        nilai_mutabaah, grade_mutabaah, deskripsi_mutabaah,
        nilai_bpi, grade_bpi, deskripsi_bpi,
        nilai_literasi, grade_literasi, deskripsi_literasi,
        nilai_proyek, grade_proyek, deskripsi_proyek,
        id_judul_proyek, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        nilai_mutabaah = VALUES(nilai_mutabaah),
        grade_mutabaah = VALUES(grade_mutabaah),
        deskripsi_mutabaah = VALUES(deskripsi_mutabaah),
        nilai_bpi = VALUES(nilai_bpi),
        grade_bpi = VALUES(grade_bpi),
        deskripsi_bpi = VALUES(deskripsi_bpi),
        nilai_literasi = VALUES(nilai_literasi),
        grade_literasi = VALUES(grade_literasi),
        deskripsi_literasi = VALUES(deskripsi_literasi),
        nilai_proyek = VALUES(nilai_proyek),
        grade_proyek = VALUES(grade_proyek),
        deskripsi_proyek = VALUES(deskripsi_proyek),
        id_judul_proyek = VALUES(id_judul_proyek),
        updated_at = NOW()
      `,
      [
        siswaId, kelas_id, tahun_ajaran_id, semester, jenis_penilaian,
        mutabaah_nilai || 0, mutabaah.grade, mutabaah.deskripsi,
        bpi_nilai || 0, bpiGrade.grade, bpiGrade.deskripsi,
        literasi_nilai || 0, literasiGrade.grade, literasiGrade.deskripsi,
        judul_proyek_nilai || 0, proyekGrade.grade, proyekGrade.deskripsi,
        id_judul_proyek
      ]
    );

    // Kirim respons dengan SEMUA data
    res.json({
      success: true,
      message: `Nilai kokurikuler (${jenis_penilaian}) berhasil disimpan`,
      data: {
        mutabaah: { nilai: mutabaah_nilai || 0, grade: mutabaah.grade, deskripsi: mutabaah.deskripsi },
        bpi: { nilai: bpi_nilai || 0, grade: bpiGrade.grade, deskripsi: bpiGrade.deskripsi },
        literasi: { nilai: literasi_nilai || 0, grade: literasiGrade.grade, deskripsi: literasiGrade.deskripsi },
        proyek: { nilai: judul_proyek_nilai || 0, grade: proyekGrade.grade, deskripsi: proyekGrade.deskripsi }
      },
    });
  } catch (err) {
    console.error('Error updateNilaiKokurikuler:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan nilai kokurikuler',
    });
  }
};

// Mendapatkan daftar mata pelajaran yang tersedia untuk guru kelas
exports.getMapelForGuruKelas = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute(
      `
        SELECT 
          mp.id_mata_pelajaran,
          mp.nama_mapel,
          mp.jenis,
          p.user_id AS pengajar_id,
          CASE WHEN p.user_id = ? THEN TRUE ELSE FALSE END AS bisa_input
        FROM pembelajaran p
        JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id_mata_pelajaran
        JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
        WHERE gk.user_id = ?
          AND p.tahun_ajaran_id = (
            SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
          )
        ORDER BY mp.jenis, mp.nama_mapel
      `,
      [userId, userId]
    );

    res.json({
      success: true,
      wajib: rows
        .filter(r => r.jenis === 'wajib')
        .map(r => ({
          mata_pelajaran_id: r.id_mata_pelajaran,
          nama_mapel: r.nama_mata_pelajaran || r.nama_mapel,
          jenis: r.jenis,
          bisa_input: Boolean(r.bisa_input),
        })),
      pilihan: rows
        .filter(r => r.jenis === 'pilihan')
        .map(r => ({
          mata_pelajaran_id: r.id_mata_pelajaran,
          nama_mapel: r.nama_mata_pelajaran || r.nama_mapel,
          jenis: r.jenis,
          bisa_input: Boolean(r.bisa_input),
        })),
    });
  } catch (err) {
    console.error('Error getMapelForGuruKelas:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar mata pelajaran' });
  }
};

// Ambil nilai kokurikuler untuk satu siswa
exports.getNilaiKokurikulerBySiswa = async (req, res) => {
  const { siswaId } = req.params;
  const userId = req.user.id;

  try {
    // Ambil data kelas & tahun ajaran aktif
    const [gkRows] = await db.execute(
      `SELECT gk.kelas_id, gk.tahun_ajaran_id, ta.semester
       FROM guru_kelas gk
       JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
       WHERE gk.user_id = ? AND ta.status = 'aktif'
       LIMIT 1`,
      [userId]
    );

    if (gkRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
    }
    const { kelas_id, tahun_ajaran_id, semester } = gkRows[0];

    // Ambil jenis penilaian dari middleware (pastikan middleware cekPenilaianStatus sudah jalan)
    const jenis_penilaian = req.jenis_penilaian;
    if (!jenis_penilaian) {
      return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif.' });
    }

    // Ambil data kokurikuler siswa
    const [rows] = await db.execute(
      `SELECT nilai_mutabaah, nilai_bpi, nilai_literasi, nilai_proyek, id_judul_proyek
       FROM nilai_kokurikuler
       WHERE id_siswa = ? AND id_kelas = ? AND id_tahun_ajaran = ? 
         AND semester = ? AND jenis_penilaian = ?`,
      [siswaId, kelas_id, tahun_ajaran_id, semester, jenis_penilaian]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data kokurikuler tidak ditemukan.' });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error('Error getNilaiKokurikulerBySiswa:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data kokurikuler.' });
  }
};

// Helper: Ambil ID tahun ajaran aktif
const getTahunAjaranAktif = async () => {
  const [rows] = await db.execute(
    'SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = "aktif" LIMIT 1'
  );
  if (rows.length === 0) {
    throw new Error('Tahun ajaran aktif tidak ditemukan');
  }
  return rows[0].id_tahun_ajaran;
};

// Mendapatkan konfigurasi kategori nilai akademik
exports.getKategoriNilaiAkademik = async (req, res) => {
  try {
    const { mapel_id } = req.query;
    const mapelId = mapel_id ? Number(mapel_id) : null;
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const data = await konfigurasiNilaiRaporModel.getAllKategori(mapelId, false, tahun_ajaran_id);
    const formattedData = data.map(item => ({
      ...item,
      min_nilai: Math.floor(item.min_nilai),
      max_nilai: Math.floor(item.max_nilai),
    }));
    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error('Error getKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil konfigurasi nilai akademik' });
  }
};

// Menambahkan konfigurasi kategori nilai akademik baru
exports.createKategoriNilaiAkademik = async (req, res) => {
  try {
    const { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;
    if (min_nilai == null || max_nilai == null || deskripsi == null) {
      return res.status(400).json({
        success: false,
        message: 'Field min_nilai, max_nilai, dan deskripsi wajib diisi',
      });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }

    const mapelIdNum = parseInt(mapel_id, 10);
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const newKategori = await konfigurasiNilaiRaporModel.createKategori({
      mapel_id: mapelIdNum || null,
      tahun_ajaran_id,
      min_nilai: parseFloat(min_nilai),
      max_nilai: parseFloat(max_nilai),
      deskripsi,
      urutan: urutan != null ? parseInt(urutan) : 0,
    });

    res.status(201).json({
      success: true,
      message: 'Konfigurasi nilai akademik berhasil ditambahkan',
      data: newKategori,
    });
  } catch (err) {
    console.error('Error createKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah konfigurasi nilai akademik' });
  }
};

// Memperbarui konfigurasi kategori nilai akademik
exports.updateKategoriNilaiAkademik = async (req, res) => {
  try {
    const { id } = req.params;
    const { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;
    if (min_nilai == null || max_nilai == null || deskripsi == null) {
      return res.status(400).json({
        success: false,
        message: 'Field min_nilai, max_nilai, dan deskripsi wajib diisi',
      });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }

    const mapelIdNum = mapel_id ? parseInt(mapel_id, 10) : null;
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const updated = await konfigurasiNilaiRaporModel.updateKategori(id, {
      mapel_id: mapelIdNum,
      tahun_ajaran_id,
      min_nilai: parseFloat(min_nilai),
      max_nilai: parseFloat(max_nilai),
      deskripsi,
      urutan: urutan != null ? parseInt(urutan) : 0,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Konfigurasi akademik tidak ditemukan',
      });
    }

    res.json({ success: true, message: 'Konfigurasi nilai akademik berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui konfigurasi nilai akademik' });
  }
};

// Menghapus konfigurasi kategori nilai akademik
exports.deleteKategoriNilaiAkademik = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await konfigurasiNilaiRaporModel.deleteKategori(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Konfigurasi nilai akademik berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus konfigurasi nilai akademik' });
  }
};
// Kokurikuler: Kategori (dengan grade)
exports.getKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const data =
      await konfigurasiNilaiKokurikulerModel.getAllKategori(tahun_ajaran_id);
    const formattedData = data.map(item => ({
      ...item,
      min_nilai: Math.floor(item.min_nilai),
      max_nilai: Math.floor(item.max_nilai),
    }));
    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error('Error getKategoriNilaiKokurikuler:', err);
    res
      .status(500)
      .json({
        success: false,
        message: 'Gagal mengambil konfigurasi nilai kokurikuler',
      });
  }
};

exports.createKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const {
      min_nilai,
      max_nilai,
      grade,
      deskripsi,
      urutan,
      id_aspek_kokurikuler,
    } = req.body;
    if (
      min_nilai == null ||
      max_nilai == null ||
      grade == null ||
      deskripsi == null ||
      id_aspek_kokurikuler == null
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Semua field wajib diisi, termasuk aspek kokurikuler',
        });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res
        .status(400)
        .json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const newKategori = await konfigurasiNilaiKokurikulerModel.createKategori({
      id_aspek_kokurikuler: parseInt(id_aspek_kokurikuler),
      tahun_ajaran_id,
      min_nilai: Math.floor(min_nilai),
      max_nilai: Math.floor(max_nilai),
      grade,
      deskripsi,
      urutan: urutan != null ? parseInt(urutan) : 0,
    });
    res
      .status(201)
      .json({
        success: true,
        message: 'Konfigurasi nilai kokurikuler berhasil ditambahkan',
        data: newKategori,
      });
  } catch (err) {
    console.error('Error createKategoriNilaiKokurikuler:', err);
    res
      .status(500)
      .json({
        success: false,
        message: 'Gagal menambah konfigurasi nilai kokurikuler',
      });
  }
};

exports.updateKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      min_nilai,
      max_nilai,
      grade,
      deskripsi,
      urutan,
      id_aspek_kokurikuler,
    } = req.body;
    if (
      min_nilai == null ||
      max_nilai == null ||
      grade == null ||
      deskripsi == null ||
      id_aspek_kokurikuler == null
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Semua field wajib diisi, termasuk aspek kokurikuler',
        });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res
        .status(400)
        .json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const updated = await konfigurasiNilaiKokurikulerModel.updateKategori(id, {
      id_aspek_kokurikuler: parseInt(id_aspek_kokurikuler),
      tahun_ajaran_id,
      min_nilai: parseFloat(min_nilai),
      max_nilai: parseFloat(max_nilai),
      grade,
      deskripsi,
      urutan: urutan != null ? parseInt(urutan) : 0,
    });
    if (!updated) {
      return res
        .status(404)
        .json({
          success: false,
          message: 'Konfigurasi kokurikuler tidak ditemukan',
        });
    }
    res.json({
      success: true,
      message: 'Konfigurasi nilai kokurikuler berhasil diperbarui',
    });
  } catch (err) {
    console.error('Error updateKategoriNilaiKokurikuler:', err);
    res
      .status(500)
      .json({
        success: false,
        message: 'Gagal memperbarui konfigurasi nilai kokurikuler',
      });
  }
};

exports.deleteKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await konfigurasiNilaiKokurikulerModel.deleteKategori(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({
      success: true,
      message: 'Konfigurasi nilai kokurikuler berhasil dihapus',
    });
  } catch (err) {
    console.error('Error deleteKategoriNilaiKokurikuler:', err);
    res
      .status(500)
      .json({
        success: false,
        message: 'Gagal menghapus konfigurasi nilai kokurikuler',
      });
  }
};

// Mengambil bobot penilaian akademik untuk suatu mata pelajaran (hanya untuk mapel wajib guru kelas)
exports.getBobotAkademikByMapel = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user.id;
    const isValid = await isMapelWajibGuruKelas(userId, mapelId);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
      });
    }

    // Ambil status periode aktif
    const [taRows] = await db.execute(`
      SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
    }
    const { status_pts, status_pas } = taRows[0];
    const isPeriodePTS = status_pts === 'aktif';

    // Ambil daftar komponen
    const komponenList = await komponenPenilaianModel.getAllKomponen();
    const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));

    if (isPeriodePTS && ptsKomponen) {
      // Jika periode PTS aktif → kirim bobot PTS = 100%, lainnya 0
      const result = komponenList.map(k => ({
        komponen_id: k.id_komponen,
        bobot: k.id_komponen === ptsKomponen.id_komponen ? 100 : 0,
        is_active: true,
      }));
      return res.json({ success: true, data: result, is_locked: true });
    }

    // Jika bukan periode PTS, ambil bobot dari database
    const bobot = await bobotPenilaianModel.getBobotByMapel(mapelId);
    if (bobot.length === 0) {
      const defaultBobot = komponenList.map(k => ({
        komponen_id: k.id_komponen,
        bobot: 0,
        is_active: true,
      }));
      await bobotPenilaianModel.updateBobotByMapel(mapelId, defaultBobot);
      const newBobot = await bobotPenilaianModel.getBobotByMapel(mapelId);
      res.json({ success: true, data: newBobot, is_locked: false });
    } else {
      res.json({ success: true, data: bobot, is_locked: false });
    }
  } catch (err) {
    console.error('Error getBobotAkademikByMapel:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil bobot penilaian' });
  }
};

// Memperbarui bobot penilaian akademik untuk suatu mata pelajaran
exports.updateBobotAkademikByMapel = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user.id;
    const isValid = await isMapelWajibGuruKelas(userId, mapelId);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: hanya untuk mapel wajib Anda',
      });
    }

    // Cek periode aktif
    const [taRows] = await db.execute(`
      SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
    }
    const { status_pts, status_pas } = taRows[0];
    const isPeriodePTS = status_pts === 'aktif';

    if (isPeriodePTS) {
      return res.status(403).json({
        success: false,
        message: 'Bobot penilaian tidak dapat diubah saat periode PTS aktif. Nilai rapor otomatis = nilai PTS.',
      });
    }

    const bobotList = req.body;
    if (!Array.isArray(bobotList)) {
      return res.status(400).json({ success: false, message: 'Data bobot harus berupa array' });
    }

    const total = bobotList.reduce((sum, b) => sum + (parseFloat(b.bobot) || 0), 0);
    if (Math.abs(total - 100) > 0.1) {
      return res.status(400).json({ success: false, message: 'Total bobot harus 100%' });
    }

    // Simpan bobot baru
    await bobotPenilaianModel.updateBobotByMapel(mapelId, bobotList);

    // Hitung ulang semua nilai rapor PAS untuk mapel ini
    await updateAllNilaiRaporForMapel(mapelId, userId);

    res.json({
      success: true,
      message: 'Bobot penilaian akademik berhasil diperbarui. Nilai rapor telah disesuaikan.',
    });
  } catch (err) {
    console.error('Error updateBobotAkademikByMapel:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui bobot penilaian' });
  }
};

// Mendapatkan daftar komponen penilaian (UH, PTS, PAS, dll)
exports.getKomponenPenilaian = async (req, res) => {
  try {
    const komponen = await komponenPenilaianModel.getAllKomponen();
    res.json({ success: true, data: komponen });
  } catch (err) {
    console.error('Error getKomponenPenilaian:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar komponen' });
  }
};

// Helper: mendapatkan deskripsi berdasarkan nilai dan daftar kategori
const getDeskripsiFromKategori = (nilai, kategoriList) => {
  if (nilai == null || nilai < 0) return 'Belum ada deskripsi';
  for (const k of kategoriList) {
    if (nilai >= k.min_nilai && nilai <= k.max_nilai) {
      return k.deskripsi;
    }
  }
  return 'Belum ada deskripsi';
};

// Mendapatkan nilai akademik per mata pelajaran untuk seluruh siswa di kelas
exports.getNilaiByMapel = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
    }
    const jenis_penilaian = req.jenis_penilaian;
    if (!jenis_penilaian) {
      return res.status(400).json({
        success: false,
        message: 'Periode penilaian tidak aktif',
      });
    }
    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran, semester, status_pts, status_pas
      FROM tahun_ajaran
      WHERE status = 'aktif'
      LIMIT 1
    `);
    if (taRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
    }
    const {
      id_tahun_ajaran: tahun_ajaran_id,
      semester,
      status_pts,
      status_pas,
    } = taRows[0];

    let periodeAktif = 'PAS';
    if (status_pts === 'aktif') {
      periodeAktif = 'PTS';
    } else if (status_pas === 'aktif') {
      periodeAktif = 'PAS';
    }

    const [kelasRow] = await db.execute(
      `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
      [userId, tahun_ajaran_id]
    );
    if (kelasRow.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Anda tidak memiliki kelas aktif',
      });
    }
    const kelas_id = kelasRow[0].kelas_id;

    const [mapelDiKelas] = await db.execute(
      `SELECT id FROM pembelajaran WHERE kelas_id = ? AND mata_pelajaran_id = ? AND tahun_ajaran_id = ?`,
      [kelas_id, mapelId, tahun_ajaran_id]
    );
    if (mapelDiKelas.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Mata pelajaran ini tidak diajarkan di kelas Anda',
      });
    }

    const [mapelDetail] = await db.execute(
      `SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
      [mapelId]
    );
    const jenisMapel = mapelDetail[0]?.jenis || 'wajib';
    const bisa_input = jenisMapel === 'wajib';

    const [namaKelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelas_id]);
    const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

    const [siswaRows] = await db.execute(
      `SELECT id_siswa, nis, nisn, nama_lengkap
       FROM siswa
       WHERE id_siswa IN (
         SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?
       )
       ORDER BY nama_lengkap`,
      [kelas_id, tahun_ajaran_id]
    );

    if (siswaRows.length === 0) {
      return res.json({
        success: true,
        siswaList: [],
        komponen: [],
        kelas: kelasNama,
        bisa_input,
      });
    }

    // Ambil semua data yang diperlukan
    const [nilaiRows] = await db.execute(
      `SELECT siswa_id, komponen_id, nilai
       FROM nilai_detail
       WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
      [mapelId, tahun_ajaran_id]
    );

    const [komponenRows] = await db.execute(`
      SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
    `);

    const [bobotRows] = await db.execute(
      `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ?`,
      [mapelId]
    );

    const [kategoriRows] = await db.execute(
      `SELECT min_nilai, max_nilai, deskripsi
       FROM konfigurasi_nilai_rapor
       WHERE (mapel_id = ? OR mapel_id IS NULL)
       ORDER BY min_nilai DESC`,
      [mapelId]
    );

    // Siapkan struktur data
    const nilaiMap = {};
    nilaiRows.forEach(n => {
      if (!nilaiMap[n.siswa_id]) nilaiMap[n.siswa_id] = {};
      nilaiMap[n.siswa_id][n.komponen_id] = n.nilai;
    });

    const bobotMap = new Map();
    bobotRows.forEach(b => {
      bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
    });

    const uhKomponenIds = komponenRows
      .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
      .map(k => k.id_komponen);
    const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));
    const ptsKomponenId = ptsKomponen?.id_komponen;
    const pasKomponenId = pasKomponen?.id_komponen;

    // Helper: ambil deskripsi berdasarkan nilai
    const getDeskripsiFromKategori = (nilai, kategoriList) => {
      if (nilai == null || nilai < 0) return 'Belum ada deskripsi';
      for (const k of kategoriList) {
        if (nilai >= k.min_nilai && nilai <= k.max_nilai) {
          return k.deskripsi;
        }
      }
      return 'Belum ada deskripsi';
    };

    // Bangun daftar siswa dengan perhitungan dinamis
    const siswaList = await Promise.all(siswaRows.map(async (s) => {
      const nilai = nilaiMap[s.id_siswa] || {};
      let nilaiRaporFinal = 0;
      let deskripsiFinal = '';

      if (periodeAktif === 'PTS') {
        // PTS: nilai rapor = nilai PTS
        const nilaiPTS = ptsKomponenId ? (nilai[ptsKomponenId] || 0) : 0;
        nilaiRaporFinal = nilaiPTS;
        deskripsiFinal = getDeskripsiFromKategori(nilaiRaporFinal, kategoriRows);
      } else {
        // PAS: hitung ulang berdasarkan bobot terbaru
        // Ambil nilai UH
        const nilaiUH = uhKomponenIds
          .map(id => nilai[id])
          .filter(v => v != null && !isNaN(v));
        const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

        // Ambil nilai PAS
        const nilaiPAS = pasKomponenId ? (nilai[pasKomponenId] || 0) : 0;

        // Ambil nilai PTS FINAL dari nilai_rapor (PTS sudah final)
        let nilaiPTSFinal = 0;
        if (ptsKomponenId) {
          const [ptsRow] = await db.execute(
            `SELECT nilai_rapor FROM nilai_rapor
             WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
               AND semester = ? AND jenis_penilaian = 'PTS'`,
            [s.id_siswa, mapelId, tahun_ajaran_id, semester]
          );
          nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
        }

        // Ambil bobot
        const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
        const bobotPTS = ptsKomponenId ? bobotMap.get(ptsKomponenId) || 0 : 0;
        const bobotPAS = pasKomponenId ? bobotMap.get(pasKomponenId) || 0 : 0;
        const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

        // Hitung nilai akhir
        if (totalBobot > 0) {
          nilaiRaporFinal = (
            rataUH * totalBobotUH +
            nilaiPTSFinal * bobotPTS +
            nilaiPAS * bobotPAS
          ) / totalBobot;
        } else {
          // Fallback jika total bobot 0
          nilaiRaporFinal = (rataUH + nilaiPTSFinal + nilaiPAS) / 3;
        }

        nilaiRaporFinal = Math.floor(nilaiRaporFinal);
        deskripsiFinal = getDeskripsiFromKategori(nilaiRaporFinal, kategoriRows);
      }

      return {
        id: s.id_siswa,
        nama: s.nama_lengkap,
        nis: s.nis,
        nisn: s.nisn,
        nilai_rapor: nilaiRaporFinal,
        deskripsi: deskripsiFinal,
        nilai: { ...nilai },
      };
    }));

    res.json({
      success: true,
      siswaList,
      komponen: komponenRows,
      kelas: kelasNama,
      bisa_input,
    });
  } catch (err) {
    console.error('Error getNilaiByMapel:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data nilai' });
  }
};

// Menyimpan nilai detail (UH, PTS, PAS) untuk suatu komponen
exports.simpanNilai = async (req, res) => {
  const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
  const user_id = req.user.id;
  try {
    if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }
    if (nilai < 0 || nilai > 100) {
      return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
    }
    const isValid = await isMapelWajibGuruKelas(user_id, mapel_id);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
      });
    }
    let kelas_id = req.user.kelas_id;
    let tahun_ajaran_id = req.user.tahun_ajaran_id;
    if (!kelas_id || !tahun_ajaran_id) {
      const [pembelajaran] = await db.execute(
        'SELECT kelas_id, tahun_ajaran_id FROM pembelajaran WHERE user_id = ? AND mata_pelajaran_id = ?',
        [user_id, mapel_id]
      );
      if (!pembelajaran[0]) {
        return res.status(403).json({ success: false, message: 'Anda tidak mengajar mapel ini' });
      }
      kelas_id = pembelajaran[0].kelas_id;
      tahun_ajaran_id = pembelajaran[0].tahun_ajaran_id;
    }
    const saved = await nilaiModel.simpanNilaiDetail({
      siswa_id,
      mapel_id,
      komponen_id,
      nilai,
      kelas_id,
      tahun_ajaran_id,
      user_id,
    });
    return res.status(200).json({
      success: true,
      message: 'Nilai berhasil disimpan',
      data: saved,
    });
  } catch (controllerError) {
    console.error('[simpanNilai] Error di controller:', controllerError.message || controllerError);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan nilai: ' + (controllerError.message || controllerError),
    });
  }
};

// Mengekspor data nilai ke format Excel (XLSX)
exports.eksporNilaiExcel = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }
    const isValid = await isMapelWajibGuruKelas(userId, mapelId);
    if (!isValid) {
      return res.status(403).json({
        message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
      });
    }
    const [kelasRow] = await db.execute(
      `SELECT kelas_id, tahun_ajaran_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = (SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1)`,
      [userId]
    );
    if (kelasRow.length === 0) {
      return res.status(403).json({ message: 'Anda tidak memiliki kelas aktif' });
    }
    const { kelas_id, tahun_ajaran_id } = kelasRow[0];
    const [mapelRows] = await db.execute(
      `SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
      [mapelId]
    );
    if (mapelRows.length === 0) {
      return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });
    }
    const namaMapel = mapelRows[0].nama_mapel;
    const nilaiData = await nilaiModel.getNilaiByKelasMapel(kelas_id, mapelId, tahun_ajaran_id);
    const [komponenRows] = await db.execute(`
      SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
    `);
    const siswaMap = {};
    nilaiData.forEach(item => {
      if (!siswaMap[item.id_siswa]) {
        siswaMap[item.id_siswa] = {
          id_siswa: item.id_siswa,
          nama: item.nama_lengkap,
          nis: item.nis,
          nisn: item.nisn,
          nilai_rapor: item.nilai_rapor || 0,
        };
      }
      if (item.komponen_id) {
        siswaMap[item.id_siswa][`nilai_${item.komponen_id}`] = item.nilai;
      }
    });
    const siswaList = Object.values(siswaMap).sort((a, b) => b.nilai_rapor - a.nilai_rapor);
    siswaList.forEach((siswa, index) => {
      siswa.ranking = index + 1;
    });
    const headers = ['No', 'Nama Siswa', 'NIS', 'NISN'];
    const komponenHeaders = komponenRows.map(k => k.nama_komponen);
    const finalHeaders = [...headers, ...komponenHeaders, 'Nilai Rapor', 'Ranking'];
    const rows = siswaList.map((siswa, index) => {
      const rowData = [index + 1, siswa.nama, siswa.nis, siswa.nisn || ''];
      komponenRows.forEach(komp => {
        const nilai = siswa[`nilai_${komp.id_komponen}`];
        rowData.push(nilai !== undefined && nilai !== null ? nilai : '-');
      });
      rowData.push(siswa.nilai_rapor.toFixed(2));
      rowData.push(siswa.ranking);
      return rowData;
    });
    const worksheet = XLSX.utils.aoa_to_sheet([finalHeaders, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `Rekap_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error ekspor nilai ke Excel:', err);
    res.status(500).json({ message: 'Gagal mengekspor data ke Excel' });
  }
};

// Mendapatkan daftar aspek kokurikuler
exports.getAspekKokurikuler = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler ORDER BY urutan ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getAspekKokurikuler:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar aspek' });
  }
};

// Mengupload foto profil guru
exports.uploadFotoProfil = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File foto diperlukan' });
    }
    const userId = req.user.id;
    const fotoPath = `/uploads/${req.file.filename}`;
    const success = await guruModel.updateFoto(userId, fotoPath);
    if (!success) {
      return res.status(404).json({ message: 'Guru tidak ditemukan di database' });
    }
    res.json({
      success: true,
      message: 'Foto profil berhasil diupload',
      fotoPath,
    });
  } catch (err) {
    console.error('Error upload foto profil guru kelas:', err);
    res.status(500).json({ message: 'Gagal mengupload foto profil' });
  }
};

// Memperbarui nilai komponen penilaian dan menghitung nilai rapor otomatis
exports.updateNilaiKomponen = async (req, res) => {
  try {
    const { mapelId, siswaId } = req.params;
    const { nilai } = req.body;
    const userId = req.user.id;
    const jenis = req.jenis_penilaian;

    console.log('🔍 [DEBUG] updateNilaiKomponen dipanggil');
    console.log('mapelId:', mapelId);
    console.log('siswaId:', siswaId);
    console.log('userId:', userId);
    console.log('jenis:', jenis);
    console.log('nilai dari frontend:', JSON.stringify(nilai, null, 2));

    // Validasi akses guru kelas untuk mapel wajib
    const isValid = await isMapelWajibGuruKelas(userId, mapelId);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
      });
    }

    // Ambil data kelas dan tahun ajaran aktif
    const [gkRows] = await db.execute(
      `SELECT gk.kelas_id, gk.tahun_ajaran_id, ta.semester
       FROM guru_kelas gk
       JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
       WHERE gk.user_id = ? AND ta.status = 'aktif' LIMIT 1`,
      [userId]
    );

    if (gkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kelas aktif tidak ditemukan',
      });
    }

    const { kelas_id, tahun_ajaran_id, semester } = gkRows[0];

    // Ambil daftar komponen penilaian
    const komponenList = await komponenPenilaianModel.getAllKomponen();

    // Lihat semua komponen yang ada
    console.log('📋 Semua komponen penilaian:', komponenList.map(k => ({
      id: k.id_komponen,
      nama: k.nama_komponen
    })));

    // Regex yang cocok dengan format "UH1", "UH2", dll (tanpa spasi)
    // Cocok dengan: UH1, UH2, UH 1, UH-1, UH_1, dll
    const uhKomponenIds = komponenList
      .filter(k => {
        const isUH = /^UH[\s\-_]*\d+$/i.test(k.nama_komponen);
        console.log(`Testing "${k.nama_komponen}":`, isUH);
        return isUH;
      })
      .map(k => k.id_komponen);

    const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

    console.log('✅ uhKomponenIds:', uhKomponenIds);
    console.log('✅ ptsKomponen:', ptsKomponen);
    console.log('✅ pasKomponen:', pasKomponen);

    // ===== VALIDASI INPUT SAAT PTS AKTIF =====
    if (jenis === 'PTS') {
      for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
        const komponenId = parseInt(komponenIdStr, 10);
        if (komponenId !== ptsKomponen?.id_komponen && nilaiSiswa != null) {
          const namaKomponen = komponenList.find(k => k.id_komponen === komponenId)?.nama_komponen || komponenIdStr;
          return res.status(400).json({
            success: false,
            message: `Periode PTS aktif. Hanya nilai ${ptsKomponen?.nama_komponen || 'PTS'} yang boleh diisi. Nilai ${namaKomponen} tidak boleh diisi.`,
          });
        }
      }

      if (ptsKomponen && (nilai[ptsKomponen.id_komponen] == null || nilai[ptsKomponen.id_komponen] === '')) {
        return res.status(400).json({
          success: false,
          message: `Nilai ${ptsKomponen.nama_komponen} wajib diisi di periode PTS.`,
        });
      }
    }

    // ===== SIMPAN NILAI DETAIL KE DATABASE =====
    for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
      const komponenId = parseInt(komponenIdStr, 10);
      let nilaiBulat = null;

      if (nilaiSiswa != null && nilaiSiswa !== '' && !isNaN(nilaiSiswa)) {
        nilaiBulat = Math.floor(parseFloat(nilaiSiswa));
        if (nilaiBulat < 0) nilaiBulat = 0;
        if (nilaiBulat > 100) nilaiBulat = 100;
      }

      console.log(`💾 Menyimpan nilai_detail: siswaId=${siswaId}, mapelId=${mapelId}, komponenId=${komponenId}, nilai=${nilaiBulat}`);

      await db.execute(
        `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
        [siswaId, mapelId, komponenId, nilaiBulat, tahun_ajaran_id, userId]
      );
    }

    console.log('✅ Nilai detail berhasil disimpan ke database');

    // ===== AMBIL SEMUA NILAI DARI DATABASE (BUKAN DARI INPUT) =====
    const [nilaiDetailRows] = await db.execute(
      `SELECT komponen_id, nilai 
       FROM nilai_detail 
       WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
      [siswaId, mapelId, tahun_ajaran_id]
    );

    console.log('📊 Nilai dari database:', nilaiDetailRows);

    // Buat map nilai dari database
    const nilaiFromDB = {};
    nilaiDetailRows.forEach(row => {
      if (row.nilai != null) {
        nilaiFromDB[row.komponen_id] = Math.floor(parseFloat(row.nilai));
      }
    });

    console.log('nilaiFromDB (map):', nilaiFromDB);

    // ===== AMBIL BOBOT PENILAIAN =====
    const bobotList = await bobotPenilaianModel.getBobotByMapel(mapelId);
    const bobotMap = new Map();
    bobotList.forEach(b => {
      bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
    });

    console.log('bobotMap:', Array.from(bobotMap.entries()));

    // ===== VARIABEL UNTUK HASIL PERHITUNGAN =====
    let nilaiRapor = 0;
    let deskripsi = '';

    // ===== PERHITUNGAN UNTUK PERIODE PTS =====
    if (jenis === 'PTS') {
      console.log('📊 Menghitung nilai rapor untuk periode PTS');

      // Saat PTS: nilai rapor = nilai PTS
      const nilaiPTS = ptsKomponen ? nilaiFromDB[ptsKomponen.id_komponen] || 0 : 0;
      nilaiRapor = nilaiPTS;

      console.log('Nilai PTS:', nilaiPTS);
      console.log('Nilai Rapor PTS:', nilaiRapor);

      deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId);
    }
    // ===== PERHITUNGAN UNTUK PERIODE PAS =====
    else if (jenis === 'PAS') {
      console.log('📊 Menghitung nilai rapor untuk periode PAS');

      // 1. Ambil nilai PTS final dari nilai_rapor
      let nilaiPTSFinal = 0;
      if (ptsKomponen) {
        const [ptsRow] = await db.execute(
          `SELECT nilai_rapor FROM nilai_rapor 
           WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? 
             AND semester = ? AND jenis_penilaian = 'PTS'`,
          [siswaId, mapelId, tahun_ajaran_id, semester]
        );
        nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
      }

      // 2. Ambil nilai UH dari DATABASE
      const nilaiUH = uhKomponenIds
        .map(id => nilaiFromDB[id])
        .filter(v => v != null && !isNaN(v));

      console.log('🔍 UH Komponen IDs:', uhKomponenIds);
      console.log('🔍 Nilai UH dari setiap komponen:', uhKomponenIds.map(id => ({
        komponenId: id,
        nilai: nilaiFromDB[id]
      })));

      const rataUH = nilaiUH.length > 0
        ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length
        : 0;

      // 3. Ambil nilai PAS dari database
      const nilaiPAS = pasKomponen ? nilaiFromDB[pasKomponen.id_komponen] || 0 : 0;

      // 4. Ambil bobot untuk setiap komponen
      const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
      const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
      const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
      const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

      console.log('===== DATA PERHITUNGAN PAS =====');
      console.log('Nilai UH (array):', nilaiUH);
      console.log('Rata-rata UH:', rataUH);
      console.log('Bobot UH Total:', totalBobotUH, '%');
      console.log('Nilai PTS Final:', nilaiPTSFinal);
      console.log('Bobot PTS:', bobotPTS, '%');
      console.log('Nilai PAS:', nilaiPAS);
      console.log('Bobot PAS:', bobotPAS, '%');
      console.log('Total Bobot:', totalBobot, '%');

      // 5. Hitung nilai akhir
      if (totalBobot > 0) {
        nilaiRapor = (
          (rataUH * totalBobotUH) +
          (nilaiPTSFinal * bobotPTS) +
          (nilaiPAS * bobotPAS)
        ) / totalBobot;
      }

      console.log('===== HASIL PERHITUNGAN =====');
      console.log('Formula: (rataUH * bobotUH + nilaiPTS * bobotPTS + nilaiPAS * bobotPAS) / totalBobot');
      console.log(`= (${rataUH} × ${totalBobotUH} + ${nilaiPTSFinal} × ${bobotPTS} + ${nilaiPAS} × ${bobotPAS}) / ${totalBobot}`);
      console.log(`= (${rataUH * totalBobotUH} + ${nilaiPTSFinal * bobotPTS} + ${nilaiPAS * bobotPAS}) / ${totalBobot}`);
      console.log(`= ${(rataUH * totalBobotUH) + (nilaiPTSFinal * bobotPTS) + (nilaiPAS * bobotPAS)} / ${totalBobot}`);
      console.log(`= ${nilaiRapor} (sebelum dibulatkan)`);

      nilaiRapor = Math.floor(nilaiRapor) || 0;
      console.log(`= ${nilaiRapor} (setelah dibulatkan ke bawah)`);

      deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId);
    }

    // Bulatkan nilai rapor ke bawah
    const nilaiRaporBulat = Math.floor(nilaiRapor);

    console.log('✅ Nilai Rapor Final:', nilaiRaporBulat);
    console.log('✅ Deskripsi:', deskripsi);

    // ===== SIMPAN KE TABEL nilai_rapor =====
    await db.execute(
      `INSERT INTO nilai_rapor (
        siswa_id,
        mapel_id,
        kelas_id,
        tahun_ajaran_id,
        semester,
        jenis_penilaian,
        nilai_rapor,
        deskripsi,
        created_by_user_id,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nilai_rapor = VALUES(nilai_rapor),
        deskripsi = VALUES(deskripsi),
        updated_at = NOW()`,
      [siswaId, mapelId, kelas_id, tahun_ajaran_id, semester, jenis, nilaiRaporBulat, deskripsi, userId]
    );

    console.log('✅ Nilai rapor berhasil disimpan ke database');

    // ===== KIRIM RESPONSE =====
    res.json({
      success: true,
      message: `Nilai komponen (${jenis}) berhasil disimpan`,
      nilai_rapor: nilaiRaporBulat,
      deskripsi: deskripsi,
      jenis_penilaian: jenis,
    });

  } catch (err) {
    console.error('❌ Error updateNilaiKomponen:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan nilai komponen',
      error: err.message,
    });
  }
};

// Memperbarui nilai rapor akhir secara manual oleh guru kelas
exports.updateNilaiRapor = async (req, res) => {
  const { mapelId, siswaId } = req.params;
  const { nilai_rapor, deskripsi } = req.body;
  const userId = req.user.id;

  try {
    const nilaiRaporInt = parseInt(nilai_rapor);
    if (isNaN(nilaiRaporInt) || nilaiRaporInt < 0 || nilaiRaporInt > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nilai rapor harus berupa angka bulat antara 0–100',
      });
    }

    const isValid = await isMapelWajibGuruKelas(userId, mapelId);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
      });
    }

    const [gkRows] = await db.execute(
      `SELECT kelas_id, tahun_ajaran_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = (SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1)`,
      [userId]
    );
    if (gkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kelas aktif tidak ditemukan',
      });
    }

    const { kelas_id, tahun_ajaran_id } = gkRows[0];
    const semester = 'Genap';

    await db.execute(
      `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, nilai_rapor, deskripsi, created_by_user_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         nilai_rapor = VALUES(nilai_rapor),
         deskripsi = VALUES(deskripsi),
         updated_at = NOW()`,
      [siswaId, mapelId, kelas_id, tahun_ajaran_id, semester, nilaiRaporInt, deskripsi || '', userId]
    );

    res.json({
      success: true,
      message: 'Nilai rapor berhasil diperbarui',
      data: {
        siswa_id: siswaId,
        mapel_id: mapelId,
        nilai_rapor: nilaiRaporInt,
        deskripsi: deskripsi || '',
      },
    });
  } catch (err) {
    console.error('Error updateNilaiRapor:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui nilai rapor',
    });
  }
};

// Mendapatkan rekapan nilai seluruh siswa di kelas
exports.getRekapanNilai = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil tahun ajaran aktif
    const [tahunAjaranRows] = await db.execute(
      `SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
    );
    if (tahunAjaranRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tahun ajaran aktif belum diatur',
      });
    }
    const { id_tahun_ajaran: tahunAjaranId, semester } = tahunAjaranRows[0];

    // Ambil status periode aktif
    const [taRows] = await db.execute(`
      SELECT status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran = ?
    `, [tahunAjaranId]);
    if (taRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Tahun ajaran tidak valid' });
    }
    const { status_pts, status_pas } = taRows[0];
    const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : 'PAS';

    // Ambil kelas yang diampu guru
    const [kelasRows] = await db.execute(
      `SELECT k.id_kelas FROM kelas k 
       INNER JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
       WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
      [userId, tahunAjaranId]
    );
    if (kelasRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anda belum mengampu kelas di tahun ajaran ini',
      });
    }
    const kelasId = kelasRows[0].id_kelas;

    // Ambil SEMUA mata pelajaran yang diajarkan di kelas ini (dari tabel pembelajaran)
    const [mapelRows] = await db.execute(
      `SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel 
       FROM mata_pelajaran mp
       INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mata_pelajaran_id
       WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
       ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.id_mata_pelajaran ASC`,
      [kelasId, tahunAjaranId]
    );
    const mapelList = mapelRows.map(row => row.kode_mapel);
    const mapelIdToKode = new Map(mapelRows.map(row => [row.id_mata_pelajaran, row.kode_mapel]));

    // Ambil daftar siswa di kelas
    const [siswaRows] = await db.execute(
      `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
       FROM siswa s 
       INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
       WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ? 
       ORDER BY s.nama_lengkap`,
      [kelasId, tahunAjaranId]
    );
    if (siswaRows.length === 0) {
      return res.json({
        success: true,
        siswa: [],
        mapel_list: mapelList,
      });
    }

    // Ambil SEMUA nilai_rapor untuk periode aktif
    const [nilaiRows] = await db.execute(
      `SELECT nr.siswa_id, nr.mapel_id, nr.nilai_rapor AS nilai
       FROM nilai_rapor nr
       WHERE nr.kelas_id = ?
         AND nr.tahun_ajaran_id = ?
         AND nr.semester = ?
         AND nr.jenis_penilaian = ?`,
      [kelasId, tahunAjaranId, semester, jenisAktif]
    );

    // Buat map nilai: { siswa_id: { kode_mapel: nilai } }
    const nilaiMap = {};
    siswaRows.forEach(s => {
      nilaiMap[s.id_siswa] = {};
      mapelList.forEach(kode => {
        nilaiMap[s.id_siswa][kode] = null; // default null
      });
    });
    nilaiRows.forEach(row => {
      const kode = mapelIdToKode.get(row.mapel_id);
      if (kode && nilaiMap[row.siswa_id]) {
        nilaiMap[row.siswa_id][kode] = row.nilai;
      }
    });

    // Ambil konfigurasi deskripsi rata-rata (untuk semua mapel)
    const [configRataRata] = await db.execute(
      `SELECT min_nilai, max_nilai, deskripsi 
       FROM konfigurasi_nilai_rapor 
       WHERE mapel_id IS NULL AND is_active = 1 AND tahun_ajaran_id = ? 
       ORDER BY min_nilai DESC`,
      [tahunAjaranId]
    );

    const getDeskripsiRataRata = (nilai, configList) => {
      if (nilai == null || nilai < 0) return 'Belum ada deskripsi';
      for (const c of configList) {
        if (nilai >= c.min_nilai && nilai <= c.max_nilai) {
          return c.deskripsi;
        }
      }
      return 'Belum ada deskripsi';
    };

    // Bangun data siswa
    const siswa = siswaRows.map(s => {
      const nilaiMapel = nilaiMap[s.id_siswa] || {};
      const nilaiValid = Object.values(nilaiMapel).filter(v => v !== null);
      const rataRata = nilaiValid.length > 0
        ? Math.floor((nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length) * 100) / 100
        : null;
      const rataRataBulat = rataRata !== null ? Math.floor(rataRata) : null;
      const deskripsiRataRata = rataRataBulat !== null
        ? getDeskripsiRataRata(rataRataBulat, configRataRata)
        : 'Belum ada deskripsi';

      return {
        id_siswa: s.id_siswa,
        nama: s.nama,
        nis: s.nis,
        nilai_mapel: nilaiMapel,
        rata_rata: rataRata,
        deskripsi_rata_rata: deskripsiRataRata,
        ranking: null,
      };
    });

    // Hitung ranking
    siswa
      .filter(s => s.rata_rata !== null)
      .sort((a, b) => b.rata_rata - a.rata_rata)
      .forEach((s, idx) => {
        s.ranking = idx + 1;
      });
    siswa.forEach(s => {
      if (s.rata_rata === null) s.ranking = null;
    });

    res.json({
      success: true,
      siswa,
      mapel_list: mapelList,
    });
  } catch (error) {
    console.error('Error di getRekapanNilai:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat rekapan nilai',
    });
  }
};

// Helper internal: mengambil data rekap nilai untuk ekspor
async function _getRekapanData(userId) {
  const [tahunAjaranRows] = await db.query(
    `SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
  );
  if (tahunAjaranRows.length === 0) {
    throw new Error('Tahun ajaran aktif tidak ditemukan');
  }
  const tahunAjaranId = tahunAjaranRows[0].id_tahun_ajaran;
  const semester = tahunAjaranRows[0].semester;

  const [kelasRows] = await db.query(
    `SELECT k.id_kelas FROM kelas k JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
    [userId, tahunAjaranId]
  );
  if (kelasRows.length === 0) {
    throw new Error('Kelas tidak ditemukan');
  }
  const kelasId = kelasRows[0].id_kelas;

  const [siswaRows] = await db.query(
    `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ? ORDER BY s.nama_lengkap`,
    [kelasId, tahunAjaranId]
  );

  const [nilaiRows] = await db.query(
    `SELECT nr.siswa_id, mp.kode_mapel, nr.nilai_rapor AS nilai FROM nilai_rapor nr JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?`,
    [kelasId, tahunAjaranId, semester]
  );

  const kodeMapelSet = new Set();
  nilaiRows.forEach(row => kodeMapelSet.add(row.kode_mapel));
  const mapelList = Array.from(kodeMapelSet);

  const nilaiMap = {};
  nilaiRows.forEach(row => {
    if (!nilaiMap[row.siswa_id]) nilaiMap[row.siswa_id] = {};
    nilaiMap[row.siswa_id][row.kode_mapel] = row.nilai;
  });

  const siswa = siswaRows.map(s => {
    const nilaiMapel = {};
    mapelList.forEach(kode => {
      nilaiMapel[kode] = nilaiMap[s.id_siswa]?.[kode] || null;
    });
    const nilaiArray = Object.values(nilaiMapel).filter(v => v !== null);
    const rataRata = nilaiArray.length > 0
      ? parseFloat((nilaiArray.reduce((a, b) => a + b, 0) / nilaiArray.length).toFixed(2))
      : null;
    return {
      id_siswa: s.id_siswa,
      nama: s.nama,
      nis: s.nis,
      nilai_mapel: nilaiMapel,
      rata_rata: rataRata,
    };
  });

  // Hitung ranking berdasarkan rata-rata (tertinggi ke terendah)
  siswa
    .filter(s => s.rata_rata !== null)
    .sort((a, b) => b.rata_rata - a.rata_rata)
    .forEach((s, i) => {
      s.ranking = i + 1;
    });
  siswa.forEach(s => {
    if (s.rata_rata === null) s.ranking = null;
  });

  return { siswa, mapel_list: mapelList };
}

// Mengekspor rekapan nilai seluruh siswa ke format Excel (XLSX)
exports.exportRekapanNilaiExcel = async (req, res) => {
  try {
    const userId = req.user.id;
    const { siswa, mapel_list } = await _getRekapanData(userId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekapan Nilai');

    const headerRow = ['No', 'Nama', 'NIS', ...mapel_list, 'Rata-rata', 'Ranking'];
    worksheet.addRow(headerRow);

    // Gaya header
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Urutkan siswa berdasarkan ranking
    const siswaSortedByRanking = [...siswa].sort((a, b) => {
      if (a.ranking === null && b.ranking === null) return 0;
      if (a.ranking === null) return 1;
      if (b.ranking === null) return -1;
      return a.ranking - b.ranking;
    });

    siswaSortedByRanking.forEach((s, idx) => {
      const nilaiCols = mapel_list.map(kode => {
        const val = s.nilai_mapel[kode];
        return val !== null ? Math.floor(val) : '-';
      });
      worksheet.addRow([
        idx + 1,
        s.nama,
        s.nis,
        ...nilaiCols,
        s.rata_rata !== null ? Math.floor(s.rata_rata) : '-',
        s.ranking ? `${s.ranking}` : '-',
      ]);
    });

    worksheet.columns.forEach(col => (col.width = 12));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rekapan_nilai_kelas.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exportRekapanNilaiExcel:', err);
    res.status(500).json({ message: 'Gagal mengekspor file Excel' });
  }
};

// Helper: Memperbarui semua nilai rapor untuk suatu mata pelajaran berdasarkan bobot terbaru
const updateAllNilaiRaporForMapel = async (mapelId, userId) => {
  try {
    // Ambil data kelas dan tahun ajaran aktif
    const [gkRows] = await db.execute(
      `SELECT kelas_id, tahun_ajaran_id, ta.semester
       FROM guru_kelas gk
       JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
       WHERE gk.user_id = ? AND ta.status = 'aktif'`,
      [userId]
    );
    if (gkRows.length === 0) {
      throw new Error('Kelas aktif tidak ditemukan');
    }
    const { kelas_id, tahun_ajaran_id, semester } = gkRows[0];

    // Ambil semua siswa di kelas
    const [siswaRows] = await db.execute(
      `SELECT id_siswa FROM siswa_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?`,
      [kelas_id, tahun_ajaran_id]
    );

    // Ambil komponen dan bobot
    const [komponenRows] = await db.execute(`
      SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
    `);
    const [bobotRows] = await db.execute(
      `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ?`,
      [mapelId]
    );
    const bobotMap = new Map(bobotRows.map(b => [b.komponen_id, parseFloat(b.bobot) || 0]));

    const uhKomponenIds = komponenRows
      .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
      .map(k => k.id_komponen);
    const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

    // Ambil nilai detail semua siswa untuk mapel ini
    const [nilaiDetailRows] = await db.execute(
      `SELECT siswa_id, komponen_id, nilai
       FROM nilai_detail
       WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
      [mapelId, tahun_ajaran_id]
    );
    const nilaiDetailMap = new Map();
    nilaiDetailRows.forEach(row => {
      if (!nilaiDetailMap.has(row.siswa_id)) nilaiDetailMap.set(row.siswa_id, {});
      nilaiDetailMap.get(row.siswa_id)[row.komponen_id] = row.nilai;
    });

    // Proses setiap siswa
    for (const siswa of siswaRows) {
      const siswaId = siswa.id_siswa;
      const nilai = nilaiDetailMap.get(siswaId) || {};

      // Ambil nilai PTS final (dari nilai_rapor PTS)
      let nilaiPTSFinal = 0;
      if (ptsKomponen) {
        const [ptsRow] = await db.execute(
          `SELECT nilai_rapor FROM nilai_rapor
           WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
             AND semester = ? AND jenis_penilaian = 'PTS'`,
          [siswaId, mapelId, tahun_ajaran_id, semester]
        );
        nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
      }

      // Hitung nilai UH rata-rata
      const nilaiUH = uhKomponenIds
        .map(id => nilai[id])
        .filter(v => v != null && !isNaN(v));
      const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

      // Ambil nilai PAS
      const nilaiPAS = pasKomponen ? (nilai[pasKomponen.id_komponen] || 0) : 0;

      // Ambil bobot
      const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
      const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
      const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
      const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

      // Hitung nilai akhir
      let nilaiRapor = 0;
      if (totalBobot > 0) {
        nilaiRapor = (
          rataUH * totalBobotUH +
          nilaiPTSFinal * bobotPTS +
          nilaiPAS * bobotPAS
        ) / totalBobot;
      }
      nilaiRapor = Math.floor(nilaiRapor);

      // Ambil deskripsi
      const [kategoriRows] = await db.execute(
        `SELECT min_nilai, max_nilai, deskripsi
         FROM konfigurasi_nilai_rapor
         WHERE (mapel_id = ? OR mapel_id IS NULL)
         ORDER BY min_nilai DESC`,
        [mapelId]
      );
      let deskripsi = 'Belum ada deskripsi';
      for (const k of kategoriRows) {
        if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
          deskripsi = k.deskripsi;
          break;
        }
      }

      // Simpan ke nilai_rapor (jenis_penilaian = 'PAS')
      await db.execute(
        `INSERT INTO nilai_rapor (
          siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian,
          nilai_rapor, deskripsi, created_by_user_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          nilai_rapor = VALUES(nilai_rapor),
          deskripsi = VALUES(deskripsi),
          updated_at = NOW()`,
        [siswaId, mapelId, kelas_id, tahun_ajaran_id, semester, nilaiRapor, deskripsi, userId]
      );
    }
  } catch (err) {
    console.error('Error di updateAllNilaiRaporForMapel:', err);
    throw err;
  }
};

// Menghasilkan laporan rapor dalam format DOCX
exports.generateRaporPDF = async (req, res) => {
  try {
    const { siswaId, jenis, semester, tahunAjaranId } = req.raporParams;
    const userId = req.user.id;

    if (!siswaId || !jenis || !semester) {
      return res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });
    }

    // Normalisasi jenis laporan
    const jenisNorm = jenis.trim().toUpperCase();
    if (!['PTS', 'PAS'].includes(jenisNorm)) {
      return res.status(400).json({ success: false, message: 'Jenis laporan harus PTS atau PAS' });
    }

    // Normalisasi semester
    const rawSemester = semester.trim();
    let semesterNorm = '';
    if (rawSemester.toLowerCase() === 'ganjil') {
      semesterNorm = 'Ganjil';
    } else if (rawSemester.toLowerCase() === 'genap') {
      semesterNorm = 'Genap';
    } else {
      return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    }

    // Ambil data tahun ajaran
    let id_tahun_ajaran, tahun_ajaran, semester_db, tanggal_pembagian_pts, tanggal_pembagian_pas;
    if (tahunAjaranId) {
      const [taRows] = await db.execute(
        `SELECT id_tahun_ajaran, tahun_ajaran, semester AS semester_db, tanggal_pembagian_pts, tanggal_pembagian_pas
         FROM tahun_ajaran
         WHERE id_tahun_ajaran = ?`,
        [tahunAjaranId]
      );
      if (taRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Tahun ajaran tidak ditemukan' });
      }
      const ta = taRows[0];
      id_tahun_ajaran = ta.id_tahun_ajaran ?? null;
      tahun_ajaran = ta.tahun_ajaran ?? 'Tahun Ajaran Tidak Diketahui';
      semester_db = ta.semester_db ?? '';
      tanggal_pembagian_pts = ta.tanggal_pembagian_pts;
      tanggal_pembagian_pas = ta.tanggal_pembagian_pas;
    } else {
      const [taRows] = await db.execute(`
        SELECT id_tahun_ajaran, tahun_ajaran, semester AS semester_db, tanggal_pembagian_pts, tanggal_pembagian_pas, status_pts, status_pas
        FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
      `);
      if (taRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
      }
      const ta = taRows[0];
      id_tahun_ajaran = ta.id_tahun_ajaran ?? null;
      tahun_ajaran = ta.tahun_ajaran ?? 'Tahun Ajaran Tidak Diketahui';
      semester_db = ta.semester_db ?? '';
      tanggal_pembagian_pts = ta.tanggal_pembagian_pts;
      tanggal_pembagian_pas = ta.tanggal_pembagian_pas;

      if (req.user.role !== 'admin') {
        const { status_pts, status_pas } = ta;
        if (jenisNorm === 'PTS' && status_pts !== 'aktif') {
          return res.status(403).json({
            success: false,
            message: status_pts === 'nonaktif'
              ? 'Rapor PTS belum dibuka oleh admin'
              : 'Rapor PTS sudah dikunci',
          });
        }
        if (jenisNorm === 'PAS' && status_pas !== 'aktif') {
          return res.status(403).json({
            success: false,
            message: status_pas === 'nonaktif'
              ? 'Rapor PAS belum dibuka oleh admin'
              : 'Rapor PAS sudah dikunci',
          });
        }
      }
    }

    if (id_tahun_ajaran === null) {
      return res.status(500).json({ success: false, message: 'ID tahun ajaran tidak valid' });
    }

    // Validasi kesesuaian semester
    const rawDbSem = (semester_db || '').trim();
    let normalizedDbSem =
      rawDbSem.toLowerCase() === 'ganjil'
        ? 'Ganjil'
        : rawDbSem.toLowerCase() === 'genap'
          ? 'Genap'
          : rawDbSem;
    if (semesterNorm !== normalizedDbSem) {
      return res.status(400).json({
        success: false,
        message: `Semester tidak sesuai. Data tahun ajaran: ${normalizedDbSem}, request: ${semesterNorm}`,
      });
    }

    // Ambil data kelas siswa
    let kelasRows = [];
    if (req.user.role === 'admin') {
      [kelasRows] = await db.execute(
        `SELECT k.id_kelas, k.nama_kelas
         FROM kelas k
         JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id
         WHERE sk.siswa_id = ? AND sk.tahun_ajaran_id = ?`,
        [siswaId, id_tahun_ajaran]
      );
    } else {
      [kelasRows] = await db.execute(
        `SELECT k.id_kelas, k.nama_kelas
         FROM guru_kelas gk
         JOIN kelas k ON gk.kelas_id = k.id_kelas
         JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id
         WHERE gk.user_id = ?
           AND gk.tahun_ajaran_id = ?
           AND sk.siswa_id = ?
           AND sk.tahun_ajaran_id = ?`,
        [userId, id_tahun_ajaran, siswaId, id_tahun_ajaran]
      );
    }

    if (kelasRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: req.user.role === 'admin'
          ? 'Siswa tidak ditemukan di tahun ajaran tersebut'
          : 'Siswa tidak di kelas Anda',
      });
    }

    const kelasRow = kelasRows[0];
    const kelas_id = kelasRow.id_kelas ?? null;
    const nama_kelas = kelasRow.nama_kelas ?? 'Kelas Tidak Diketahui';

    if (kelas_id === null) {
      return res.status(500).json({ success: false, message: 'ID kelas tidak valid' });
    }

    // Ambil data siswa
    const [siswaRows] = await db.execute(
      `SELECT s.nama_lengkap, s.nis, s.nisn
       FROM siswa s
       JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
       WHERE s.id_siswa = ? AND sk.tahun_ajaran_id = ?`,
      [siswaId, id_tahun_ajaran]
    );
    if (siswaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan atau tidak terdaftar di tahun ajaran ini',
      });
    }
    const siswa = siswaRows[0];
    const nama_lengkap = siswa.nama_lengkap ?? 'Nama Siswa';
    const nis = siswa.nis ?? 'NIS';
    const nisn = siswa.nisn ?? '–';

    // Ambil fase kelas
    const [faseRows] = await db.execute(`SELECT fase FROM kelas WHERE nama_kelas = ?`, [nama_kelas]);
    const fase = faseRows[0]?.fase || '–';

    // Ambil nama guru kelas
    let namagurukelas = 'Nama Guru Kelas';
    if (req.user.role === 'admin') {
      const [guruRows] = await db.execute(
        `SELECT u.nama_lengkap
         FROM user u
         JOIN guru_kelas gk ON u.id_user = gk.user_id
         WHERE gk.kelas_id = ? AND gk.tahun_ajaran_id = ? LIMIT 1`,
        [kelas_id, id_tahun_ajaran]
      );
      namagurukelas = guruRows[0]?.nama_lengkap || 'Nama Guru Kelas';
    } else {
      const [guruRows] = await db.execute(`SELECT u.nama_lengkap FROM user u WHERE u.id_user = ?`, [userId]);
      namagurukelas = guruRows[0]?.nama_lengkap || 'Nama Guru Kelas';
    }

    // Ambil semua mata pelajaran
    const [mapelRows] = await db.execute(`
      SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.urutan_rapor, mp.jenis
      FROM mata_pelajaran mp
      WHERE mp.id_mata_pelajaran IN (
        SELECT DISTINCT mapel_id FROM nilai_rapor
        WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?
      ) OR mp.id_mata_pelajaran IN (
        SELECT DISTINCT mapel_id FROM nilai_detail
        WHERE siswa_id = ? AND tahun_ajaran_id = ?
      )
      ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.id_mata_pelajaran ASC
    `, [siswaId, id_tahun_ajaran, semesterNorm, jenisNorm, siswaId, id_tahun_ajaran]);

    // Ambil nilai rapor
    const [nilaiRaporRows] = await db.execute(`
      SELECT nr.mapel_id, nr.nilai_rapor, nr.deskripsi
      FROM nilai_rapor nr
      WHERE nr.siswa_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?
    `, [siswaId, id_tahun_ajaran, semesterNorm, jenisNorm]);

    const nilaiRaporMap = new Map();
    nilaiRaporRows.forEach(row => {
      nilaiRaporMap.set(row.mapel_id, { nilai_rapor: row.nilai_rapor, deskripsi: row.deskripsi });
    });

    // Jika tidak ada nilai_rapor, hitung dari nilai_detail
    for (const mp of mapelRows) {
      const mapelId = mp.id_mata_pelajaran;
      if (!nilaiRaporMap.has(mapelId)) {
        const [detailRows] = await db.execute(
          `SELECT nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
          [siswaId, mapelId, id_tahun_ajaran]
        );
        const nilaiValid = detailRows
          .map(r => r.nilai)
          .filter(n => n != null && !isNaN(n) && n >= 0);
        if (nilaiValid.length > 0) {
          const rataRata = Math.floor(nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length);
          nilaiRaporMap.set(mapelId, { nilai_rapor: rataRata, deskripsi: '–' });
        } else {
          nilaiRaporMap.set(mapelId, { nilai_rapor: '-', deskripsi: '-' });
        }
      }
    }

    // Format data mata pelajaran untuk template
    const semuaMapel = mapelRows.map((mp, index) => {
      const nilai = nilaiRaporMap.get(mp.id_mata_pelajaran) || { nilai_rapor: '-', deskripsi: '-' };
      const nilaiAkhir = typeof nilai.nilai_rapor === 'number' ? Math.floor(nilai.nilai_rapor) : nilai.nilai_rapor;
      return {
        no: index + 1,
        nama_mapel: mp.nama_mapel || '–',
        nilai_mapel: nilaiAkhir,
        deskripsi_mapel: nilai.deskripsi || '–',
      };
    });

    const daftarMapel1 = semuaMapel.slice(0, 7);
    const daftarMapel2 = semuaMapel.slice(7);

    // Hitung rata-rata akademik
    const nilaiList = semuaMapel
      .map(m => m.nilai_mapel)
      .filter(v => typeof v === 'number' && v >= 0);
    const rataRata = nilaiList.length > 0
      ? parseFloat((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length).toFixed(2))
      : 0;

    const [deskRata] = await db.execute(
      `SELECT deskripsi FROM konfigurasi_nilai_rapor
       WHERE mapel_id IS NULL AND ? BETWEEN min_nilai AND max_nilai`,
      [rataRata]
    );
    const ckratarata = deskRata[0]?.deskripsi || '–';

    // === Kokurikuler ===
    //  BACA grade & deskripsi langsung dari kolom yang disimpan
    const [kokur] = await db.execute(`
      SELECT 
        nk.nilai_mutabaah, 
        nk.grade_mutabaah, 
        nk.deskripsi_mutabaah,
        nk.nilai_bpi,
        nk.grade_bpi,
        nk.deskripsi_bpi,
        nk.nilai_literasi,
        nk.grade_literasi,
        nk.deskripsi_literasi,
        nk.nilai_proyek,
        nk.grade_proyek,
        nk.deskripsi_proyek,
        jpt.judul AS nama_judul_proyek
      FROM nilai_kokurikuler nk
      LEFT JOIN judul_proyek_per_tahun_ajaran jpt ON nk.id_judul_proyek = jpt.id_judul_proyek
      WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
    `, [siswaId, id_tahun_ajaran, semesterNorm, jenisNorm]);

    const getKokurValue = (arr, key, fallback = '–') => arr[0]?.[key] ?? fallback;

    // Ambil SEMUA data kokurikuler
    const my = getKokurValue(kokur, 'nilai_mutabaah', 0);
    const gmy = getKokurValue(kokur, 'grade_mutabaah', '–');
    const dmy = getKokurValue(kokur, 'deskripsi_mutabaah', '–');

    const bpi = getKokurValue(kokur, 'nilai_bpi', 0);
    const gbpi = getKokurValue(kokur, 'grade_bpi', '–');
    const dbpi = getKokurValue(kokur, 'deskripsi_bpi', '–');

    const li = getKokurValue(kokur, 'nilai_literasi', 0);
    const gli = getKokurValue(kokur, 'grade_literasi', '–');
    const dli = getKokurValue(kokur, 'deskripsi_literasi', '–');

    const proyek = getKokurValue(kokur, 'nilai_proyek', 0);
    const gproyek = getKokurValue(kokur, 'grade_proyek', '–');
    const dproyek = getKokurValue(kokur, 'deskripsi_proyek', '–');

    const namaproyek = getKokurValue(kokur, 'nama_judul_proyek', '–');

    console.log('🔍 DEBUG Kokurikuler:', {
      jenisNorm,
      my, gmy, dmy,
      bpi, gbpi, dbpi,
      li, gli, dli,
      proyek, gproyek, dproyek,
      namaproyek
    });

    // === Absensi ===
    const [abs] = await db.execute(
      `SELECT sakit, izin, alpha FROM absensi
       WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
      [siswaId, id_tahun_ajaran, semesterNorm, jenisNorm]
    );
    const s = abs[0]?.sakit || 0;
    const i = abs[0]?.izin || 0;
    const a = abs[0]?.alpha || 0;

    // === Ekstrakurikuler ===
    const [ekskulRows] = await db.execute(`
      SELECT e.nama_ekskul, pe.deskripsi
      FROM peserta_ekstrakurikuler pe
      JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul
      WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ? LIMIT 4`,
      [siswaId, id_tahun_ajaran]
    );
    const ekskul1 = ekskulRows[0]?.nama_ekskul || '–';
    const dekskul1 = ekskulRows[0]?.deskripsi || '–';
    const ekskul2 = ekskulRows[1]?.nama_ekskul || '–';
    const dekskul2 = ekskulRows[1]?.deskripsi || '–';
    const ekskul3 = ekskulRows[2]?.nama_ekskul || '–';
    const dekskul3 = ekskulRows[2]?.deskripsi || '–';
    const ekskul4 = ekskulRows[3]?.nama_ekskul || '–';
    const dekskul4 = ekskulRows[3]?.deskripsi || '–';

    // === Catatan wali kelas ===
    const [catatan] = await db.execute(`
      SELECT catatan_wali_kelas
      FROM catatan_wali_kelas
      WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
      [siswaId, id_tahun_ajaran, semesterNorm, jenisNorm]
    );
    const cttwalikelas = catatan[0]?.catatan_wali_kelas || '–';

    // === Format tanggal ===
    const formatTanggalIndonesia = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    };
    const tanggalSah = jenisNorm === 'PTS'
      ? tanggal_pembagian_pts ? formatTanggalIndonesia(tanggal_pembagian_pts) : formatTanggalIndonesia(new Date())
      : tanggal_pembagian_pas ? formatTanggalIndonesia(tanggal_pembagian_pas) : formatTanggalIndonesia(new Date());

    // === Keputusan kenaikan kelas (PAS Genap) ===
    let tingkat = '–';
    let naikKelas = '–';

    if (jenisNorm === 'PAS' && semesterNorm === 'Genap') {
      console.log('🔍 DEBUG Naik Tingkat - Query untuk siswaId:', siswaId, 'tahun_ajaran:', id_tahun_ajaran);

      const [naikRows] = await db.execute(
        `SELECT naik_tingkat FROM catatan_wali_kelas
     WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = 'Genap' AND jenis_penilaian = 'PAS'`,
        [siswaId, id_tahun_ajaran]
      );

      console.log('🔍 DEBUG Naik Tingkat - Result:', naikRows);

      const statusNaik = naikRows[0]?.naik_tingkat;

      if (statusNaik === 'ya') {
        // Extract angka kelas dari nama_kelas (contoh: "1 A" -> 1, "II B" -> 2)
        const kelasAngka = parseInt(nama_kelas.match(/\d+/)?.[0] || '1');
        const tingkatBerikutnya = kelasAngka + 1;

        // Array dimulai dari index 0, tapi kelas dari 1
        const romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
        const terbilang = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam'];

        tingkat = 'Naik';
        // Format: II (Dua)
        naikKelas = `${romawi[tingkatBerikutnya] || tingkatBerikutnya} (${terbilang[tingkatBerikutnya] || tingkatBerikutnya})`;

        console.log('✅ Naik Tingkat:', { kelasAngka, tingkatBerikutnya, tingkat, naikKelas });
      } else if (statusNaik === 'tidak') {
        tingkat = 'Tidak Naik';
        naikKelas = '–';
        console.log('❌ Tidak Naik Tingkat');
      } else {
        tingkat = 'Belum ditentukan';
        naikKelas = '–';
        console.log('⚠️ Status Naik Tingkat Belum Ditentukan');
      }
    } else {
      console.log('⚠️ Bukan PAS Genap, skip naik tingkat');
    }

    // === Siapkan data untuk template ===
    const data = {
      nama: nama_lengkap,
      kelas: nama_kelas,
      nis: nis,
      nisn: nisn,
      fase: fase,
      semester: semesterNorm === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)',
      ta: tahun_ajaran,
      namagurukelas: namagurukelas,
      tanggalraporpts: tanggalSah,
      tanggalraporpas: tanggalSah,
      semuaMapel,
      daftarMapel1,
      daftarMapel2,
      ratarata: rataRata,
      ckratarata,
      my,
      gmy,
      dmy,
      bpi,
      gbpi,
      dbpi,
      li,
      gli,
      dli,
      proyek,
      gproyek,
      dproyek,
      namaproyek,
      s, i, a,
      ekskul1, dekskul1,
      ekskul2, dekskul2,
      ekskul3, dekskul3,
      ekskul4, dekskul4,
      cttwalikelas,
      tingkat,
      naikkelas: naikKelas,
    };

    // === Pilih template ===
    const templateFile = jenisNorm === 'PTS'
      ? semesterNorm === 'Ganjil' ? 'template_pts_ganjil.docx' : 'template_pts_genap.docx'
      : semesterNorm === 'Ganjil' ? 'template_pas_ganjil.docx' : 'template_pas_genap.docx';

    const templatePath = path.join(__dirname, '..', 'templates', 'rapor', templateFile);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ success: false, message: `Template ${templateFile} tidak ditemukan` });
    }

    // === Generate DOCX ===
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '<<', end: '>>' },
      nullGetter: () => '–',
    });
    doc.render(data);
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    // === NAMA FILE ===
    const fileName = `rapor_${jenisNorm.toLowerCase()}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buf);
  } catch (error) {
    console.error('❌ Error generate rapor:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat rapor' });
  }
};

// Mendapatkan data tahun ajaran aktif
exports.getTahunAjaranAktif = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id_tahun_ajaran, tahun_ajaran, semester, status, status_pts, status_pas
      FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tahun ajaran aktif belum diatur oleh admin.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error getTahunAjaranAktif:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil tahun ajaran aktif', error: err.message });
  }
};

// === KATEGORI RATA-RATA NILAI AKADEMIK ===

// Mendapatkan konfigurasi kategori nilai rata-rata (untuk semua mata pelajaran)
exports.getKategoriRataRata = async (req, res) => {
  try {
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const data = await konfigurasiNilaiRaporModel.getAllKategori(null, true, tahun_ajaran_id);
    const formatted = data.map(item => ({
      ...item,
      min_nilai: Math.floor(item.min_nilai),
      max_nilai: Math.floor(item.max_nilai),
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error getKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil kategori rata-rata' });
  }
};

// Menambahkan konfigurasi kategori rata-rata baru
exports.createKategoriRataRata = async (req, res) => {
  try {
    const { min_nilai, max_nilai, deskripsi, urutan } = req.body;
    if (min_nilai == null || max_nilai == null || deskripsi == null) {
      return res.status(400).json({ success: false, message: 'Field wajib diisi' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const newKategori = await konfigurasiNilaiRaporModel.createKategori({
      mapel_id: null,
      tahun_ajaran_id,
      min_nilai: parseFloat(min_nilai),
      max_nilai: parseFloat(max_nilai),
      deskripsi,
      urutan: urutan != null ? parseInt(urutan) : 0,
    });
    res.status(201).json({
      success: true,
      message: 'Kategori rata-rata berhasil ditambahkan',
      data: newKategori,
    });
  } catch (err) {
    console.error('Error createKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah kategori rata-rata' });
  }
};

// Memperbarui konfigurasi kategori rata-rata
exports.updateKategoriRataRata = async (req, res) => {
  try {
    const { id } = req.params;
    const { min_nilai, max_nilai, deskripsi, urutan } = req.body;
    if (min_nilai == null || max_nilai == null || deskripsi == null) {
      return res.status(400).json({ success: false, message: 'Field wajib diisi' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const tahun_ajaran_id = await getTahunAjaranAktif();
    const updated = await konfigurasiNilaiRaporModel.updateKategori(id, {
      mapel_id: null,
      tahun_ajaran_id,
      min_nilai: parseFloat(min_nilai),
      max_nilai: parseFloat(max_nilai),
      deskripsi,
      urutan: urutan != null ? parseInt(urutan) : 0,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Konfigurasi rata-rata berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui konfigurasi rata-rata' });
  }
};

// Menghapus konfigurasi kategori rata-rata
exports.deleteKategoriRataRata = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await konfigurasiNilaiRaporModel.deleteKategori(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Konfigurasi rata-rata berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus konfigurasi rata-rata' });
  }
};