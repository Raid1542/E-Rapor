/**
 * Nama File: cekTahunAjaranAktif.js
 * Fungsi: Middleware untuk memastikan terdapat tahun ajaran aktif di sistem.
 *         Menyimpan ID Induk, ID Semester, & Tanggal PTS/PAS ke objek `req`.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    // Ambil tahun ajaran yang sedang aktif + Tanggal PTS/PAS
    const [rows] = await db.execute(`
      SELECT 
        id_tahun_ajaran,              
        id_tahun_ajaran_induk,        
        tahun_ajaran,
        semester,
        status,
        tanggal_pembagian_pts,  
        tanggal_pembagian_pas   
      FROM tahun_ajaran 
      WHERE status = 'aktif' 
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(400).json({ 
        message: 'Tidak ada tahun ajaran aktif. Silakan hubungi administrator.' 
      });
    }

    const activeTA = rows[0];

    // INJECT DATA KE REQUEST OBJECT (req)

    // ID Semester Aktif → untuk nilai, absensi, rapor (reset per semester)
    req.idSemesterAktif = activeTA.id_tahun_ajaran;
    
    // Nama Semester → untuk filter UI / logika conditional
    req.semesterAktif = activeTA.semester;
    
    // ID Tahun Ajaran Induk → untuk data master (guru kelas, ekskul, pembelajaran)
    req.idTahunAjaranInduk = activeTA.id_tahun_ajaran_induk;

    //  Tanggal Pembagian Rapor → untuk validasi jadwal cetak
    req.tanggalPembagianPTS = activeTA.tanggal_pembagian_pts;
    req.tanggalPembagianPAS = activeTA.tanggal_pembagian_pas;

    // Lanjutkan ke controller
    next();
    
  } catch (err) {
    console.error('Error di middleware cekTahunAjaranAktif:', err);
    res.status(500).json({ 
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};