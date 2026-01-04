/**
 * Nama File: cekPenilaianStatus.js
 * Fungsi: Middleware untuk memeriksa status periode penilaian aktif (PTS/PAS) pada tahun ajaran berjalan.
 *         Menentukan jenis penilaian yang sedang berlangsung dan memvalidasi akses berdasarkan status tersebut.
 *         Hasil pemeriksaan disimpan ke objek `req` untuk digunakan oleh handler berikutnya.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

// Middleware untuk memeriksa status periode penilaian (PTS/PAS) pada tahun ajaran aktif
const cekPenilaianStatus = async (req, res, next) => {
  try {
    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran, semester, status_pts, status_pas 
      FROM tahun_ajaran 
      WHERE status = 'aktif' 
      LIMIT 1
    `);

    if (taRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tahun ajaran aktif belum diatur oleh admin',
      });
    }

    const { status_pts, status_pas } = taRows[0];

    // Ambil konteks dari request (jika ada)
    const reqJenis = req.params?.jenis || req.body?.jenis_penilaian || req.penilaianContext?.jenis;
    const reqSemester = req.params?.semester || req.penilaianContext?.semester;

    // Jika permintaan menyebutkan jenis penilaian
    if (reqJenis && ['PTS', 'PAS'].includes(reqJenis.toUpperCase())) {
      const jenis = reqJenis.toUpperCase();
      const status = jenis === 'PTS' ? status_pts : status_pas;

      if (status === 'aktif') {
        // Periode ini aktif → boleh akses
        req.jenis_penilaian = jenis;
        req.tahunAjaranAktif = taRows[0];
        return next();
      } else if (status === 'nonaktif' || status === 'selesai') {
        // Periode ini sudah dikunci → BLOKIR
        return res.status(403).json({
          success: false,
          message: `🔒 Rapor ${jenis} sudah dikunci. Data tidak dapat diubah.`,
        });
      } else {
        return res.status(403).json({
          success: false,
          message: `Rapor ${jenis} belum dibuka oleh admin.`,
        });
      }
    }

    // Jika tidak ada konteks jenis → pakai logika lama (fallback)
    let jenis_penilaian = null;
    if (status_pts === 'aktif' && status_pas === 'aktif') {
      return res.status(400).json({
        success: false,
        message: 'Kesalahan sistem: PTS dan PAS tidak boleh aktif bersamaan.',
      });
    } else if (status_pts === 'aktif') {
      jenis_penilaian = 'PTS';
    } else if (status_pas === 'aktif') {
      jenis_penilaian = 'PAS';
    } else {
      const isAnyLocked = status_pts === 'selesai' || status_pas === 'selesai';
      if (isAnyLocked) {
        return res.status(403).json({
          success: false,
          message: '🔒 Semua periode penilaian telah ditutup.',
        });
      } else {
        return res.status(403).json({
          success: false,
          message: '⏳ Belum ada periode penilaian yang dibuka oleh admin.',
        });
      }
    }

    req.jenis_penilaian = jenis_penilaian;
    req.tahunAjaranAktif = taRows[0];
    next();
  } catch (err) {
    console.error('Error di cekPenilaianStatus:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memeriksa status penilaian',
    });
  }
};

module.exports = cekPenilaianStatus;