/**
 * Nama File: adminRoutes.js
 * Fungsi: Mendefinisikan rute API yang hanya dapat diakses oleh pengguna dengan role 'admin',
 *         mencakup manajemen data guru, siswa, admin, sekolah, kelas, ekstrakurikuler,
 *         mata pelajaran, pembelajaran, tahun ajaran, dan arsip rapor.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const fs = require('fs');
const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const multer = require('multer');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage untuk logo sekolah
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      return cb(new Error('Hanya file .png, .jpg, .jpeg yang diizinkan'));
    }
    cb(null, `logo_sekolah${ext}`);
  },
});

// Storage untuk import Excel
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `import_guru_${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Hanya file .xlsx atau .xls yang diizinkan'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Storage untuk foto profil
const fotoProfilStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'));
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `profil_${uniqueSuffix}${ext}`);
  },
});

const uploadFoto = multer({
  storage: fotoProfilStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return cb(new Error('Format file tidak didukung'), false);
    }
    cb(null, true);
  },
});

// Multer khusus untuk BACKUP/RESTORE
const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    cb(null, backupDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `restore_${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadBackup = multer({
  storage: backupStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Terima file .sql DAN .zip untuk restore
    if (ext !== '.sql' && ext !== '.zip') {
      return cb(new Error('Hanya file .sql atau .zip yang diizinkan untuk restore'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB (cukup untuk database besar + uploads)
});

const admin = require('../controllers/admin');
const router = express.Router();

// Middleware: hanya admin
const adminOnly = [authenticate, authorize('admin')];
const adminOnlyWithTahunAjaran = [
  ...adminOnly,
  require('../middleware/cekTahunAjaranAktif'),
];

// --- Data Guru ---
router.post('/guru/import', adminOnly, uploadExcel.single('file'), admin.importGuru);
router.get('/guru', adminOnly, admin.getGuru);
router.get('/guru/:id', adminOnly, admin.getGuruById);
router.post('/guru', adminOnly, admin.tambahGuru);
router.put('/guru/:id', adminOnly, admin.editGuru);

// --- Data Siswa ---
router.post('/siswa/import', adminOnlyWithTahunAjaran, uploadExcel.single('file'), admin.importSiswa);
router.get('/siswa', adminOnly, admin.getSiswa);
router.get('/siswa/:id', adminOnly, admin.getSiswaById);
router.post('/siswa', adminOnlyWithTahunAjaran, admin.tambahSiswa);
router.put('/siswa/:id', adminOnlyWithTahunAjaran, admin.editSiswa);
router.get('/kelas/:id/siswa', adminOnly, admin.getSiswaByKelas);

// --- Data Admin ---
router.get('/admin', adminOnly, admin.getAdmin);
router.get('/admin/:id', adminOnly, admin.getAdminById);
router.post('/admin', adminOnly, admin.tambahAdmin);
router.put('/admin/upload-foto', adminOnly, uploadFoto.single('foto'), admin.uploadFotoProfil);
router.put('/admin/ganti-password', adminOnly, admin.gantiPasswordAdmin);
router.put('/admin/:id', adminOnly, admin.editAdmin);

// --- Data Pembina Ekstrakurikuler ---
router.post('/pembina-ekskul/import', adminOnly, uploadExcel.single('file'), admin.importPembinaEkskul);
router.get('/pembina-ekskul', adminOnly, admin.getPembinaEkskul);
router.get('/pembina-ekskul/:id', adminOnly, admin.getPembinaEkskulById);
router.post('/pembina-ekskul', adminOnly, admin.tambahPembinaEkskul);
router.put('/pembina-ekskul/:id', adminOnly, admin.editPembinaEkskul);

// --- Data Sekolah ---
router.get('/sekolah', adminOnly, admin.getSekolah);
router.put('/sekolah', adminOnly, admin.editSekolah);
router.post('/sekolah/logo', adminOnly, uploadLogo.single('logo'), admin.uploadLogo);

// --- Atur Kelas & Guru Kelas ---
router.get('/kelas', adminOnly, admin.getKelas);
router.get('/kelas/dropdown', adminOnlyWithTahunAjaran, admin.getKelasForDropdown);
router.get('/kelas/:id', adminOnly, admin.getKelasById);
router.post('/kelas', adminOnlyWithTahunAjaran, admin.tambahKelas);
router.put('/kelas/:id', adminOnlyWithTahunAjaran, admin.editKelas);
router.delete('/kelas/:id', adminOnlyWithTahunAjaran, admin.hapusKelas);

// -- Guru Kelas --
router.get('/guru-kelas', adminOnly, admin.getGuruKelasList);
router.get('/kelas/:id/wali-kelas', adminOnly, admin.getWaliKelas);
router.post('/kelas/:id/guru', adminOnlyWithTahunAjaran, admin.setWaliKelas);

// --- Tahun Ajaran & Semester ---
router.get('/tahun-ajaran', adminOnly, admin.getTahunAjaran);
router.post('/tahun-ajaran', adminOnly, admin.tambahTahunAjaran);
router.put('/tahun-ajaran/:id_induk', adminOnly, admin.updateTahunAjaran);
router.put('/tahun-ajaran/:id_induk/semester', adminOnly, admin.gantiSemester);

// --- Mata Pelajaran ---
router.get('/mata-pelajaran', adminOnly, admin.getMataPelajaran);
router.get('/mata-pelajaran/:id', adminOnly, admin.getMataPelajaranById);
router.post('/mata-pelajaran', adminOnlyWithTahunAjaran, admin.tambahMataPelajaran);
router.put('/mata-pelajaran/:id', adminOnlyWithTahunAjaran, admin.editMataPelajaran);
router.delete('/mata-pelajaran/:id', adminOnlyWithTahunAjaran, admin.hapusMataPelajaran);

// --- PEMBELAJARAN ---
router.get('/pembelajaran', adminOnly, admin.getPembelajaran);
router.get('/pembelajaran/dropdown', adminOnlyWithTahunAjaran, admin.getDropdownPembelajaran);
router.get('/pembelajaran/kelas/:kelasId', adminOnly, admin.getPembelajaranByKelas);
router.post('/pembelajaran', adminOnlyWithTahunAjaran, admin.tambahPembelajaran);
router.put('/pembelajaran/:id', adminOnlyWithTahunAjaran, admin.editPembelajaran);
router.delete('/pembelajaran/:id', adminOnlyWithTahunAjaran, admin.hapusPembelajaran);

// --- EKSTRAKURIKULER ---
router.get('/ekstrakurikuler', adminOnly, admin.getEkskul);
router.get('/ekstrakurikuler/pembina-dropdown', adminOnly, admin.getPembinaDropdown); 
router.post('/ekstrakurikuler', adminOnlyWithTahunAjaran, admin.tambahEkskul);
router.put('/ekstrakurikuler/:id', adminOnlyWithTahunAjaran, admin.editEkskul);
router.delete('/ekstrakurikuler/:id', adminOnlyWithTahunAjaran, admin.hapusEkskul);

// Ambil data tambahan (ekskul)
router.get('/ekstrakurikuler/:id/anggota', adminOnly, admin.getPesertaByEkskul);
router.get('/siswa/:id/ekstrakurikuler', adminOnly, admin.getEkskulBySiswa);

// Dashboard
router.get('/dashboard/stats', adminOnlyWithTahunAjaran, admin.getDashboardStats);

// Rapor
router.get('/arsip-rapor/tahun-ajaran', adminOnly, admin.getTahunAjaranAll);
router.get('/arsip-rapor/kelas', adminOnly, (req, res, next) => {
  const { tahun_ajaran_id } = req.query;
  if (!tahun_ajaran_id) {
    return res.status(400).json({ success: false, message: 'tahun_ajaran_id wajib diisi' });
  }
  next();
}, admin.getKelasByTahunAjaran);
router.get('/arsip-rapor/daftar-siswa/:tahunAjaranId/:kelasId', adminOnly, (req, res, next) => {
  const { tahunAjaranId, kelasId } = req.params;
  if (!tahunAjaranId || !kelasId) {
    return res.status(400).json({ success: false, message: 'tahun_ajaran_id dan kelas_id wajib diisi' });
  }
  req.tahunAjaranId = parseInt(tahunAjaranId, 10);
  req.kelasId = parseInt(kelasId, 10);
  if (isNaN(req.tahunAjaranId) || isNaN(req.kelasId)) {
    return res.status(400).json({ success: false, message: 'ID tidak valid' });
  }
  next();
}, admin.getDaftarSiswaUntukRapor);
router.post('/atur-status-penilaian', adminOnly, admin.aturStatusPenilaian);
router.post('/arsipkan-rapor', adminOnly, admin.arsipkanRapor);

// Backup & Restore Database
router.get('/backup', adminOnly, admin.downloadBackup);
router.post('/backup/restore', adminOnly, uploadBackup.single('file'), admin.uploadRestore);

module.exports = router;