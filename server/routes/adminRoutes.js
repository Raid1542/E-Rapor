/**
 * Nama File: adminRoutes.js
 * Fungsi: Route API untuk role admin (CRUD master data, rapor, backup)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekTahunAjaranAktif = require('../middleware/cekTahunAjaranAktif');
const admin = require('../controllers/admin');

const router = express.Router();

// Konstanta untuk direktori upload
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Konstanta untuk limit ukuran file
const LIMIT_LOGO = 5 * 1024 * 1024;
const LIMIT_FOTO = 5 * 1024 * 1024;
const LIMIT_EXCEL = 10 * 1024 * 1024;
const LIMIT_BACKUP = 500 * 1024 * 1024;

// Konstanta untuk ekstensi file yang diizinkan
const EXT_LOGO = ['.png', '.jpg', '.jpeg'];
const EXT_FOTO = ['.png', '.jpg', '.jpeg', '.webp'];
const EXT_EXCEL = ['.xlsx', '.xls'];
const EXT_BACKUP = ['.sql', '.zip'];

// Konstanta untuk semester
const SEMESTER_VALID = ['Ganjil', 'Genap'];

// Pastikan direktori upload tersedia
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage untuk logo sekolah
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_LOGO.includes(ext)) {
      return cb(new Error('Hanya file .png, .jpg, .jpeg yang diizinkan'));
    }
    cb(null, `logo_sekolah${ext}`);
  },
});

// Storage untuk import Excel
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `import_guru_${uniqueSuffix}${ext}`);
  },
});

// Storage untuk foto profil
const fotoProfilStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_FOTO.includes(ext)) {
      return cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'));
    }
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profil_${uniqueSuffix}${ext}`);
  },
});

// Storage untuk backup/restore database
const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    cb(null, BACKUP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `restore_${uniqueSuffix}${ext}`);
  },
});

// Konfigurasi multer untuk setiap tipe file
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: LIMIT_LOGO },
});

const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: LIMIT_EXCEL },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_EXCEL.includes(ext)) {
      return cb(new Error('Hanya file .xlsx atau .xls yang diizinkan'), false);
    }
    cb(null, true);
  },
});

const uploadFoto = multer({
  storage: fotoProfilStorage,
  limits: { fileSize: LIMIT_FOTO },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_FOTO.includes(ext)) {
      return cb(new Error('Format file tidak didukung'), false);
    }
    cb(null, true);
  },
});

const uploadBackup = multer({
  storage: backupStorage,
  limits: { fileSize: LIMIT_BACKUP },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_BACKUP.includes(ext)) {
      return cb(new Error('Hanya file .sql atau .zip yang diizinkan untuk restore'), false);
    }
    cb(null, true);
  },
});

// Middleware: hanya admin
const adminOnly = [authenticate, authorize('admin')];
const adminOnlyWithTahunAjaran = [...adminOnly, cekTahunAjaranAktif];

// Middleware validasi untuk arsip rapor
const validateArsipKelasParams = (req, res, next) => {
  const { tahun_ajaran_id, semester } = req.query;
  
  if (!tahun_ajaran_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'tahun_ajaran_id wajib diisi' 
    });
  }
  
  if (!semester || !SEMESTER_VALID.includes(semester)) {
    return res.status(400).json({ 
      success: false, 
      message: 'semester wajib diisi (Ganjil/Genap)' 
    });
  }
  
  next();
};

const validateDaftarSiswaParams = (req, res, next) => {
  const { tahunAjaranId, kelasId } = req.params;
  const { semester } = req.query;
  
  if (!tahunAjaranId || !kelasId) {
    return res.status(400).json({ 
      success: false, 
      message: 'tahun_ajaran_id dan kelas_id wajib diisi' 
    });
  }
  
  if (!semester || !SEMESTER_VALID.includes(semester)) {
    return res.status(400).json({ 
      success: false, 
      message: 'semester wajib diisi (Ganjil/Genap)' 
    });
  }
  
  req.tahunAjaranId = parseInt(tahunAjaranId, 10);
  req.kelasId = parseInt(kelasId, 10);
  
  if (isNaN(req.tahunAjaranId) || isNaN(req.kelasId)) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID tidak valid' 
    });
  }
  
  next();
};

// --- Data Guru (CRUD + Import Excel) ---
router.post('/guru/import', adminOnly, uploadExcel.single('file'), admin.importGuru);
router.get('/guru', adminOnly, admin.getGuru);
router.get('/guru/:id', adminOnly, admin.getGuruById);
router.post('/guru', adminOnly, admin.tambahGuru);
router.put('/guru/:id', adminOnly, admin.editGuru);

// --- Data Siswa Master (CRUD + Import Excel) ---
router.get('/siswa-master', adminOnly, admin.getSiswaMaster);
router.get('/siswa-master/:id', adminOnly, admin.getSiswaMasterById);
router.post('/siswa-master', adminOnly, admin.tambahSiswaMaster);
router.put('/siswa-master/:id', adminOnly, admin.editSiswaMaster);
router.delete('/siswa-master/:id', adminOnly, admin.hapusSiswaMaster);
router.post('/siswa-master/import', adminOnly, uploadExcel.single('file'), admin.importSiswaMaster);

// --- Data Siswa per Kelas (Assign/Keluarkan) ---
router.get('/kelas/:id/siswa', adminOnlyWithTahunAjaran, admin.getSiswaByKelas);
router.get('/siswa/available', adminOnly, admin.getSiswaAvailable);
router.post('/kelas/:id/assign-siswa', adminOnlyWithTahunAjaran, admin.assignSiswaKeKelas);
router.delete('/kelas/:id/siswa/:siswaId', adminOnlyWithTahunAjaran, admin.keluarkanSiswaDariKelas);

// --- Data Admin (CRUD + Ganti Password + Foto) ---
router.put('/admin/upload-foto', adminOnly, uploadFoto.single('foto'), admin.uploadFotoProfil);
router.put('/admin/ganti-password', adminOnly, admin.gantiPasswordAdmin);
router.get('/admin', adminOnly, admin.getAdmin);
router.get('/admin/:id', adminOnly, admin.getAdminById);
router.post('/admin', adminOnly, admin.tambahAdmin);
router.put('/admin/:id', adminOnly, admin.editAdmin);

// --- Data Pembina Ekstrakurikuler (CRUD + Import Excel) ---
router.post('/pembina-ekskul/import', adminOnly, uploadExcel.single('file'), admin.importPembinaEkskul);
router.get('/pembina-ekskul', adminOnly, admin.getPembinaEkskul);
router.get('/pembina-ekskul/:id', adminOnly, admin.getPembinaEkskulById);
router.post('/pembina-ekskul', adminOnly, admin.tambahPembinaEkskul);
router.put('/pembina-ekskul/:id', adminOnly, admin.editPembinaEkskul);

// --- Data Sekolah (Profil + Upload Logo) ---
router.get('/sekolah', adminOnly, admin.getSekolah);
router.put('/sekolah', adminOnly, admin.editSekolah);
router.post('/sekolah/logo', adminOnly, uploadLogo.single('logo'), admin.uploadLogo);

// --- Atur Kelas (CRUD + Dropdown) ---
router.get('/kelas', adminOnlyWithTahunAjaran, admin.getKelas);
router.get('/kelas/dropdown', adminOnlyWithTahunAjaran, admin.getKelasForDropdown);
router.get('/kelas/:id', adminOnlyWithTahunAjaran, admin.getKelasById);
router.post('/kelas', adminOnlyWithTahunAjaran, admin.tambahKelas);
router.put('/kelas/:id', adminOnlyWithTahunAjaran, admin.editKelas);
router.delete('/kelas/:id', adminOnlyWithTahunAjaran, admin.hapusKelas);

// --- Guru Kelas / Wali Kelas ---
router.get('/guru-kelas', adminOnlyWithTahunAjaran, admin.getGuruKelasList);
router.get('/kelas/:id/wali-kelas', adminOnlyWithTahunAjaran, admin.getWaliKelas);
router.post('/kelas/:id/guru', adminOnlyWithTahunAjaran, admin.setWaliKelas);

// --- Tahun Ajaran & Semester ---
router.get('/tahun-ajaran', adminOnly, admin.getTahunAjaran);
router.get('/semester-list', adminOnly, admin.getSemesterList);
router.post('/tahun-ajaran', adminOnly, admin.tambahTahunAjaran);
router.put('/tahun-ajaran/:id_induk', adminOnly, admin.updateTahunAjaran);
router.put('/tahun-ajaran/:id_induk/semester', adminOnly, admin.gantiSemester);

// --- Mata Pelajaran (CRUD) ---
router.get('/mata-pelajaran', adminOnlyWithTahunAjaran, admin.getMataPelajaran);
router.get('/mata-pelajaran/:id', adminOnlyWithTahunAjaran, admin.getMataPelajaranById);
router.post('/mata-pelajaran', adminOnlyWithTahunAjaran, admin.tambahMataPelajaran);
router.put('/mata-pelajaran/:id', adminOnlyWithTahunAjaran, admin.editMataPelajaran);
router.delete('/mata-pelajaran/:id', adminOnlyWithTahunAjaran, admin.hapusMataPelajaran);

// --- Pembelajaran (Penugasan Mapel ke Kelas) ---
router.get('/pembelajaran', adminOnlyWithTahunAjaran, admin.getPembelajaran);
router.get('/pembelajaran/dropdown', adminOnlyWithTahunAjaran, admin.getDropdownPembelajaran);
router.post('/pembelajaran/tambah-wajib', adminOnlyWithTahunAjaran, admin.tambahMapelWajib);
router.post('/pembelajaran/tambah-pilihan', adminOnlyWithTahunAjaran, admin.tambahMapelPilihan);
router.get('/pembelajaran/kelas/:kelasId', adminOnlyWithTahunAjaran, admin.getPembelajaranByKelas);
router.post('/pembelajaran', adminOnlyWithTahunAjaran, admin.tambahPembelajaran);
router.put('/pembelajaran/:id', adminOnlyWithTahunAjaran, admin.editPembelajaran);
router.delete('/pembelajaran/:id', adminOnlyWithTahunAjaran, admin.hapusPembelajaran);

// --- Ekstrakurikuler (CRUD + Peserta + Pembina Dropdown) ---
router.get('/ekstrakurikuler', adminOnlyWithTahunAjaran, admin.getEkskul);
router.get('/ekstrakurikuler/pembina-dropdown', adminOnlyWithTahunAjaran, admin.getPembinaDropdown);
router.post('/ekstrakurikuler', adminOnlyWithTahunAjaran, admin.tambahEkskul);
router.put('/ekstrakurikuler/:id', adminOnlyWithTahunAjaran, admin.editEkskul);
router.delete('/ekstrakurikuler/:id', adminOnlyWithTahunAjaran, admin.hapusEkskul);
router.get('/ekstrakurikuler/:id/anggota', adminOnlyWithTahunAjaran, admin.getPesertaByEkskul);
router.get('/siswa/:id/ekstrakurikuler', adminOnlyWithTahunAjaran, admin.getEkskulBySiswa);

// --- Dashboard Admin (Stats + Progress + Kelengkapan) ---
router.get('/dashboard/stats', adminOnlyWithTahunAjaran, admin.getDashboardStats);
router.get('/dashboard/progress-guru', adminOnlyWithTahunAjaran, admin.getProgressGuru);
router.get('/dashboard/kelengkapan-rapor', adminOnlyWithTahunAjaran, admin.getKelengkapanRapor);

// --- Arsip Rapor & Status Penilaian ---
router.get('/arsip-rapor/tahun-ajaran', adminOnly, admin.getTahunAjaranAll);
router.get('/arsip-rapor/kelas', adminOnly, validateArsipKelasParams, admin.getKelasByTahunAjaran);
router.get('/arsip-rapor/daftar-siswa/:tahunAjaranId/:kelasId', adminOnly, validateDaftarSiswaParams, admin.getDaftarSiswaUntukRapor);
router.post('/atur-status-penilaian', adminOnly, admin.aturStatusPenilaian);
router.post('/arsipkan-rapor', adminOnly, admin.arsipkanRapor);

// --- Backup & Restore Database ---
router.get('/backup', adminOnly, admin.downloadBackup);
router.post('/backup/restore', adminOnly, uploadBackup.single('file'), admin.uploadRestore);

module.exports = router;