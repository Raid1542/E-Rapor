/**
 * Nama File: cekPenilaianStatus.js
 * Fungsi: Middleware untuk memeriksa status periode penilaian aktif (PTS/PAS)
 */

const db = require('../config/db');

const cekPenilaianStatus = async (req, res, next) => {
  try {
    const [taRows] = await db.execute(`
      SELECT 
        ta.id_tahun_ajaran,
        ta.id_tahun_ajaran_induk,
        ta.semester,
        ta.status_pts,
        ta.status_pas
      FROM tahun_ajaran ta
      WHERE ta.status = 'aktif'
      LIMIT 1
    `);

    if (taRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tahun ajaran aktif belum diatur oleh admin',
      });
    }

    const { 
      id_tahun_ajaran, 
      id_tahun_ajaran_induk,
      semester,
      status_pts, 
      status_pas 
    } = taRows[0];

    req.idTahunAjaranInduk = id_tahun_ajaran_induk;
    req.idSemesterAktif    = id_tahun_ajaran;
    req.tahunAjaranAktif   = taRows[0];

    // Ambil konteks dari request jika ada
    const reqJenis = req.penilaianContext?.jenis 
      || req.params?.jenis 
      || req.body?.jenis_penilaian;

    const reqSemester = req.penilaianContext?.semester 
      || req.params?.semester 
      || semester;

    // Set penilaianContext jika belum ada
    if (!req.penilaianContext) {
      req.penilaianContext = {};
    }
    req.penilaianContext.semester   = reqSemester || semester;
    req.penilaianContext.status_pts = status_pts;
    req.penilaianContext.status_pas = status_pas;

    // Jika request menyebutkan jenis penilaian tertentu
    if (reqJenis && ['PTS', 'PAS'].includes(reqJenis.toUpperCase())) {
      const jenis  = reqJenis.toUpperCase();
      const status = jenis === 'PTS' ? status_pts : status_pas;

      if (status === 'aktif') {
        req.jenis_penilaian          = jenis;
        req.penilaianContext.jenis   = jenis;
        return next();
      } else if (status === 'selesai') {
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

    // Fallback: tidak ada konteks jenis → tentukan otomatis
    if (status_pts === 'aktif' && status_pas === 'aktif') {
      return res.status(400).json({
        success: false,
        message: 'Kesalahan sistem: PTS dan PAS tidak boleh aktif bersamaan.',
      });
    } else if (status_pts === 'aktif') {
      req.jenis_penilaian        = 'PTS';
      req.penilaianContext.jenis = 'PTS';
    } else if (status_pas === 'aktif') {
      req.jenis_penilaian        = 'PAS';
      req.penilaianContext.jenis = 'PAS';
    } else {
      const isAnyLocked = status_pts === 'selesai' || status_pas === 'selesai';
      return res.status(403).json({
        success: false,
        message: isAnyLocked
          ? '🔒 Semua periode penilaian telah ditutup.'
          : '⏳ Belum ada periode penilaian yang dibuka oleh admin.',
      });
    }

    next();
  } catch (err) {
    console.error('❌ Error di cekPenilaianStatus:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memeriksa status penilaian',
    });
  }
};

module.exports = cekPenilaianStatus;