/**
 * Nama File: guruBidangStudiRoutes.js
 * Fungsi: Route API guru bidang studi (profil, dashboard, atur penilaian, input nilai)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const cekAksesMapelDanKelas = require('../middleware/cekAksesMapelDanKelas');
const cekAksesMapelGuruBidangStudi = require('../middleware/cekAksesMapelGuruBidangStudi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const controller = require('../controllers/guru_bidang_studi');

// Setup direktori upload + storage foto profil (.png/.jpg/.jpeg/.webp max 5MB)
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return cb(new Error('Format file tidak didukung'));
    cb(null, `profil_${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) cb(null, true);
    else cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'), false);
  },
});

const guruBidangStudiOnly = authorize(['guru_bidang_studi']);

// --- Profil Guru (GET/PUT profil, password, foto) ---
router.get('/profil', authenticate, guruBidangStudiOnly, controller.getProfil);
router.put('/profil', authenticate, guruBidangStudiOnly, controller.editProfil);
router.put('/ganti-password', authenticate, guruBidangStudiOnly, controller.gantiPassword);
router.put('/upload_foto', authenticate, guruBidangStudiOnly, upload.single('foto'), controller.uploadFotoProfil);

// --- Dashboard ---
router.get('/dashboard', authenticate, guruBidangStudiOnly, controller.getDashboardData);

// --- Data Pendukung Atur Penilaian (mapel, kelas, komponen) ---
router.get('/atur-penilaian/mapel', authenticate, guruBidangStudiOnly, controller.getDaftarMapel);
router.get('/atur-penilaian/kelas', authenticate, guruBidangStudiOnly, controller.getDaftarKelas);
router.get('/atur-penilaian/komponen', authenticate, guruBidangStudiOnly, controller.getKomponenPenilaian);
router.get('/atur-penilaian/kelas-by-mapel', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.getKelasByMapel);

// --- Bobot Penilaian (GET/PUT per mapel) ---
router.get('/atur-penilaian/bobot/:mapelId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.getBobotPenilaian);
router.put('/atur-penilaian/bobot/:mapelId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.updateBobotPenilaian);

// --- Kategori Akademik (CRUD per mapel) ---
router.get('/atur-penilaian/kategori', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.getKategoriAkademik);
router.post('/atur-penilaian/kategori', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.createKategoriAkademik);
router.put('/atur-penilaian/kategori/:id', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.updateKategoriAkademik);
router.delete('/atur-penilaian/kategori/:id', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.deleteKategoriAkademik);

// --- Input Nilai (GET per kelas, POST single, PUT batch) ---
router.get('/nilai/:mapelId/:kelasId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelDanKelas, controller.getNilaiByMapelAndKelas);
router.post('/nilai', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.simpanNilai);
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.simpanNilaiKomponenBanyak);

// --- Informasi Tahun Ajaran Aktif ---
router.get('/tahun-ajaran/aktif', authenticate, guruBidangStudiOnly, controller.getTahunAjaranAktif);

module.exports = router;