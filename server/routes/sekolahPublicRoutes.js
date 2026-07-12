/**
 * Nama File: sekolahPublicRoutes.js
 * Fungsi: Route publik dan terproteksi untuk data sekolah (login page & dashboard)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../config/db');

const router = express.Router();

// Konstanta untuk ID sekolah default
const ID_SEKOLAH_DEFAULT = 1;

// Data default jika sekolah tidak ditemukan
const DEFAULT_SEKOLAH = {
  nama_sekolah: 'Sekolah',
  logo_path: null,
};

// Endpoint publik untuk halaman login (nama & logo sekolah)
router.get('/publik', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT nama_sekolah, logo_path FROM sekolah WHERE id = ?',
      [ID_SEKOLAH_DEFAULT]
    );

    if (rows.length > 0) {
      res.json({
        nama_sekolah: rows[0].nama_sekolah || DEFAULT_SEKOLAH.nama_sekolah,
        logo_path: rows[0].logo_path || DEFAULT_SEKOLAH.logo_path,
      });
    } else {
      res.json(DEFAULT_SEKOLAH);
    }
  } catch (err) {
    console.error('Error getSekolahPublik:', err);
    res.json(DEFAULT_SEKOLAH);
  }
});

// Endpoint terproteksi untuk user terautentikasi (data lengkap)
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT nama_sekolah, logo_path FROM sekolah WHERE id = ?',
      [ID_SEKOLAH_DEFAULT]
    );

    if (rows.length > 0) {
      res.json({ data: rows[0] });
    } else {
      res.status(404).json({ message: 'Data sekolah tidak ditemukan' });
    }
  } catch (err) {
    console.error('Error getSekolah:', err);
    res.status(500).json({ message: 'Gagal mengambil data sekolah' });
  }
});

module.exports = router;