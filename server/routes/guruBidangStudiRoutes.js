/**
 * Nama File: guruBidangStudiRoutes.js
 * Fungsi: Route API guru bidang studi (profil, dashboard, atur penilaian, input nilai, import nilai).
 *         Menangani semua endpoint untuk role guru bidang studi dengan validasi akses.
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

// ==========================================================================
// KONSTANTA
// ==========================================================================

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const LIMIT_FOTO = 5 * 1024 * 1024;
const LIMIT_EXCEL = 10 * 1024 * 1024;
const EXT_FOTO = ['.png', '.jpg', '.jpeg', '.webp'];
const EXT_EXCEL = ['.xlsx', '.xls'];

// ==========================================================================
// KONFIGURASI MULTER
// ==========================================================================

// Membuat direktori upload jika belum tersedia
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Konfigurasi penyimpanan untuk foto profil
const fotoProfilStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!EXT_FOTO.includes(ext)) {
            return cb(new Error('Format file tidak didukung'));
        }
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `profil_${uniqueSuffix}${ext}`);
    }
});

// Middleware multer untuk upload foto profil
const uploadFoto = multer({
    storage: fotoProfilStorage,
    limits: { fileSize: LIMIT_FOTO },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!EXT_FOTO.includes(ext)) {
            return cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'), false);
        }
        cb(null, true);
    }
});

// Middleware multer untuk upload Excel (menggunakan memoryStorage)
const uploadExcelNilai = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMIT_EXCEL },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!EXT_EXCEL.includes(ext)) {
            return cb(new Error('Hanya file .xlsx atau .xls yang diizinkan'), false);
        }
        cb(null, true);
    }
});

// ==========================================================================
// MIDDLEWARE
// ==========================================================================

// Middleware untuk membatasi akses hanya untuk role guru bidang studi
const guruBidangStudiOnly = authorize(['guru_bidang_studi']);

// ==========================================================================
// ROUTE: PROFIL GURU
// ==========================================================================

router.get('/profil', authenticate, guruBidangStudiOnly, controller.getProfil);
router.put('/profil', authenticate, guruBidangStudiOnly, controller.editProfil);
router.put('/ganti-password', authenticate, guruBidangStudiOnly, controller.gantiPassword);
router.put('/upload_foto', authenticate, guruBidangStudiOnly, uploadFoto.single('foto'), controller.uploadFotoProfil);

// ==========================================================================
// ROUTE: DASHBOARD
// ==========================================================================

router.get('/dashboard', authenticate, guruBidangStudiOnly, controller.getDashboardData);

// ==========================================================================
// ROUTE: DATA PENDUKUNG ATUR PENILAIAN
// ==========================================================================

router.get('/atur-penilaian/mapel', authenticate, guruBidangStudiOnly, controller.getDaftarMapel);
router.get('/atur-penilaian/kelas', authenticate, guruBidangStudiOnly, controller.getDaftarKelas);
router.get('/atur-penilaian/komponen', authenticate, guruBidangStudiOnly, controller.getKomponenPenilaian);
router.get('/atur-penilaian/kelas-by-mapel', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.getKelasByMapel);

// ==========================================================================
// ROUTE: BOBOT PENILAIAN (GET/PUT PER MAPEL)
// ==========================================================================

router.get('/atur-penilaian/bobot/:mapelId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.getBobotPenilaian);
router.put('/atur-penilaian/bobot/:mapelId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.updateBobotPenilaian);

// ==========================================================================
// ROUTE: KATEGORI AKADEMIK (CRUD PER MAPEL)
// ==========================================================================

router.get('/atur-penilaian/kategori', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.getKategoriAkademik);
router.post('/atur-penilaian/kategori', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.createKategoriAkademik);
router.put('/atur-penilaian/kategori/:id', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.updateKategoriAkademik);
router.delete('/atur-penilaian/kategori/:id', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.deleteKategoriAkademik);

// ==========================================================================
// ROUTE: INPUT NILAI & IMPORT EXCEL
// ==========================================================================

router.get('/nilai/import-template', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.downloadTemplateNilaiGBS);
router.post('/nilai/import', authenticate, guruBidangStudiOnly, cekPenilaianStatus, uploadExcelNilai.single('file'), controller.importNilaiExcelGBS);
router.get('/nilai/cek-status-kategori', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.cekStatusKategoriAkademikGBS);

router.get('/nilai/:mapelId/:kelasId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelDanKelas, controller.getNilaiByMapelAndKelas);
router.post('/nilai', authenticate, guruBidangStudiOnly, cekPenilaianStatus, controller.simpanNilai);
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, guruBidangStudiOnly, cekPenilaianStatus, cekAksesMapelGuruBidangStudi, controller.simpanNilaiKomponenBanyak);

// ==========================================================================
// ROUTE: INFORMASI TAHUN AJARAN AKTIF
// ==========================================================================

router.get('/tahun-ajaran/aktif', authenticate, guruBidangStudiOnly, controller.getTahunAjaranAktif);

module.exports = router;