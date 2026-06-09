/**
 * Nama File: guruBidangStudiRoutes.js
 * Fungsi: Mendefinisikan rute API yang hanya dapat diakses oleh pengguna dengan role 'guru bidang studi',
 *         mencakup manajemen profil, dashboard, pengaturan penilaian (bobot, kategori),
 *         dan input nilai siswa dengan proteksi status penilaian aktif.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const controller = require('../controllers/guru_bidang_studi');

// Setup direktori upload
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Konfigurasi storage untuk foto profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return cb(new Error('Format file tidak didukung'));
    }
    cb(null, `profil_${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'), false);
    }
  },
});

// Middleware: hanya untuk guru bidang studi
const guruBidangStudiOnly = authorize(['guru bidang studi']);

// --- Profil Guru ---
router.get('/profil', authenticate, guruBidangStudiOnly, controller.getProfil);
router.put('/profil', authenticate, guruBidangStudiOnly, controller.editProfil);
router.put('/ganti-password', authenticate, guruBidangStudiOnly, controller.gantiPassword);
router.put('/upload_foto', authenticate, guruBidangStudiOnly, upload.single('foto'), controller.uploadFotoProfil);

// --- Dashboard ---
router.get('/dashboard', authenticate, guruBidangStudiOnly, controller.getDashboardData);

// --- Atur Penilaian ---
router.get('/atur-penilaian/mapel', authenticate, guruBidangStudiOnly, controller.getDaftarMapel);
router.get('/atur-penilaian/kelas', authenticate, guruBidangStudiOnly, controller.getDaftarKelas);
router.get('/atur-penilaian/komponen', authenticate, guruBidangStudiOnly, controller.getKomponenPenilaian);
router.get('/atur-penilaian/bobot/:mapelId', authenticate, guruBidangStudiOnly, controller.getBobotPenilaian);

// Update bobot penilaian hanya jika status penilaian aktif
router.put(
  '/atur-penilaian/bobot/:mapelId',
  authenticate,
  guruBidangStudiOnly,
  cekPenilaianStatus,
  controller.updateBobotPenilaian
);

router.get('/atur-penilaian/kategori', authenticate, guruBidangStudiOnly, controller.getKategoriAkademik);
router.post('/atur-penilaian/kategori', authenticate, guruBidangStudiOnly, controller.createKategoriAkademik);
router.put('/atur-penilaian/kategori/:id', authenticate, guruBidangStudiOnly, controller.updateKategoriAkademik);
router.delete('/atur-penilaian/kategori/:id', authenticate, guruBidangStudiOnly, controller.deleteKategoriAkademik);

// --- Input Nilai ---
router.get(
  '/nilai/:mapelId/:kelasId',
  authenticate,
  guruBidangStudiOnly,
  controller.getNilaiByMapelAndKelas
);

// Simpan nilai hanya jika status penilaian aktif
router.post('/nilai', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.simpanNilai);
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.simpanNilaiKomponenBanyak);

// --- Informasi Tahun Ajaran ---
router.get('/tahun-ajaran/aktif', authenticate, guruBidangStudiOnly, controller.getTahunAjaranAktif);

module.exports = router;