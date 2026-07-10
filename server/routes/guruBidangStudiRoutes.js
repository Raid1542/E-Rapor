/**
 * Nama File: guruBidangStudiRoutes.js
 * Fungsi: Route API guru bidang studi (profil, dashboard, atur penilaian, input nilai, import nilai)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const cekAksesMapelDanKelas = require('../middleware/cekAksesMapelDanKelas');
const cekAksesMapelGuruBidangStudi = require('../middleware/cekAksesMapelGuruBidangStudi');

const controller = require('../controllers/guru_bidang_studi');

const router = express.Router();

// Konstanta untuk direktori upload
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

// Konstanta untuk limit ukuran file
const LIMIT_FOTO = 5 * 1024 * 1024;
const LIMIT_EXCEL = 10 * 1024 * 1024;

// Konstanta untuk ekstensi file yang diizinkan
const EXT_FOTO = ['.png', '.jpg', '.jpeg', '.webp'];
const EXT_EXCEL = ['.xlsx', '.xls'];

// Pastikan direktori upload tersedia
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage untuk foto profil
const fotoProfilStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_FOTO.includes(ext)) {
      return cb(new Error('Format file tidak didukung'));
    }
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profil_${uniqueSuffix}${ext}`);
  },
});

// Konfigurasi multer untuk foto profil
const UPLOAD_FOTO = multer({
  storage: fotoProfilStorage,
  limits: { fileSize: LIMIT_FOTO },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_FOTO.includes(ext)) {
      return cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'), false);
    }
    cb(null, true);
  },
});

// Konfigurasi multer untuk Excel (memoryStorage agar buffer tersedia)
const EXCEL_MEMORY_STORAGE = multer.memoryStorage();

const UPLOAD_EXCEL_NILAI = multer({
  storage: EXCEL_MEMORY_STORAGE,
  limits: { fileSize: LIMIT_EXCEL },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_EXCEL.includes(ext)) {
      return cb(new Error('Hanya file .xlsx atau .xls yang diizinkan'), false);
    }
    cb(null, true);
  },
});

// Middleware: hanya guru bidang studi
const GURU_BIDANG_STUDI_ONLY = authorize(['guru_bidang_studi']);

// --- Profil Guru (GET/PUT profil, password, foto) ---
router.get('/profil', authenticate, GURU_BIDANG_STUDI_ONLY, controller.getProfil);
router.put('/profil', authenticate, GURU_BIDANG_STUDI_ONLY, controller.editProfil);
router.put('/ganti-password', authenticate, GURU_BIDANG_STUDI_ONLY, controller.gantiPassword);
router.put('/upload_foto', authenticate, GURU_BIDANG_STUDI_ONLY, UPLOAD_FOTO.single('foto'), controller.uploadFotoProfil);

// --- Dashboard ---
router.get('/dashboard', authenticate, GURU_BIDANG_STUDI_ONLY, controller.getDashboardData);

// --- Data Pendukung Atur Penilaian (mapel, kelas, komponen) ---
router.get('/atur-penilaian/mapel', authenticate, GURU_BIDANG_STUDI_ONLY, controller.getDaftarMapel);
router.get('/atur-penilaian/kelas', authenticate, GURU_BIDANG_STUDI_ONLY, controller.getDaftarKelas);
router.get('/atur-penilaian/komponen', authenticate, GURU_BIDANG_STUDI_ONLY, controller.getKomponenPenilaian);
router.get('/atur-penilaian/kelas-by-mapel', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, controller.getKelasByMapel);

// --- Bobot Penilaian (GET/PUT per mapel) ---
router.get('/atur-penilaian/bobot/:mapelId', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.getBobotPenilaian);
router.put('/atur-penilaian/bobot/:mapelId', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.updateBobotPenilaian);

// --- Kategori Akademik (CRUD per mapel) ---
router.get('/atur-penilaian/kategori', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.getKategoriAkademik);
router.post('/atur-penilaian/kategori', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.createKategoriAkademik);
router.put('/atur-penilaian/kategori/:id', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.updateKategoriAkademik);
router.delete('/atur-penilaian/kategori/:id', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.deleteKategoriAkademik);

// --- Import Nilai dari Excel (HARUS SEBELUM /nilai/:mapelId/:kelasId) ---
router.get('/nilai/import-template', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, controller.downloadTemplateNilaiGBS);
router.post('/nilai/import', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, UPLOAD_EXCEL_NILAI.single('file'), controller.importNilaiExcelGBS);

// --- Input Nilai (GET per kelas, POST single, PUT batch) ---
router.get('/nilai/:mapelId/:kelasId', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelDanKelas, controller.getNilaiByMapelAndKelas);
router.post('/nilai', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, controller.simpanNilai);
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, GURU_BIDANG_STUDI_ONLY, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.simpanNilaiKomponenBanyak);

// --- Informasi Tahun Ajaran Aktif ---
router.get('/tahun-ajaran/aktif', authenticate, GURU_BIDANG_STUDI_ONLY, controller.getTahunAjaranAktif);

module.exports = router;