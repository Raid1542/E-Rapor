/**
 * Nama File: guruKelasRoutes.js
 * Fungsi: Mendefinisikan rute API yang hanya dapat diakses oleh pengguna dengan role 'guru kelas',
 *         mencakup manajemen profil, absensi, catatan wali kelas, ekstrakurikuler,
 *         penilaian akademik & kokurikuler, konfigurasi bobot/kategori,
 *         dan pembuatan rapor (PTS/PAS).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const authorize = require('../middleware/authorize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup direktori upload
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi storage untuk foto profil
const fotoProfilStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return cb(new Error('Format file tidak didukung'));
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
      return cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'), false);
    }
    cb(null, true);
  },
});

const guruKelasController    = require('../controllers/guruKelasController');
const absensiController       = require('../controllers/guru_kelas/absensiController');
const aturPenilaianController = require('../controllers/guru_kelas/aturPenilaianController');

// Middleware: hanya untuk role 'guru kelas'
const guruKelasOnly = authorize(['guru kelas']);

// --- Rute Umum ---
router.get('/kelas', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getKelasSaya);
router.get('/siswa', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getSiswaByKelas);

// --- Profil ---
router.put('/profil', authenticate, guruKelasOnly, guruKelasController.editProfil);
router.put('/ganti-password', authenticate, guruKelasOnly, guruKelasController.gantiPassword);
router.put('/upload_foto', authenticate, uploadFoto.single('foto'), guruKelasController.uploadFotoProfil);

// --- Absensi ---
router.get(
  '/absensi/:jenis/:semester',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const { jenis, semester } = req.params;
    if (!['PTS', 'PAS'].includes(jenis.toUpperCase())) {
      return res.status(400).json({ message: 'Jenis harus PTS atau PAS' });
    }
    if (!['Ganjil', 'Genap'].includes(semester)) {
      return res.status(400).json({ message: 'Semester harus Ganjil atau Genap' });
    }
    req.penilaianContext = { jenis: jenis.toUpperCase(), semester };
    next();
  },
  cekPenilaianStatus,
  absensiController.getAbsensiSiswa
);

router.post(
  '/absensi',
  authenticate,
  guruKelasOnly,
  cekPenilaianStatus,
  absensiController.upsertAbsensi
);

// --- Catatan Wali Kelas ---
router.get('/catatan-wali-kelas/:jenis/:semester',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const { jenis, semester } = req.params;
    if (!['PTS', 'PAS'].includes(jenis.toUpperCase())) {
      return res.status(400).json({ message: 'Jenis harus PTS atau PAS' });
    }
    if (!['Ganjil', 'Genap'].includes(semester)) {
      return res.status(400).json({ message: 'Semester harus Ganjil atau Genap' });
    }
    req.penilaianContext = { jenis, semester };
    next();
  },
  cekPenilaianStatus,
  guruKelasController.getCatatanWaliKelas
);

router.put('/catatan-wali-kelas/:siswa_id/:jenis/:semester',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const { jenis, semester } = req.params;
    if (!['PTS', 'PAS'].includes(jenis.toUpperCase())) {
      return res.status(400).json({ message: 'Jenis harus PTS atau PAS' });
    }
    if (!['Ganjil', 'Genap'].includes(semester)) {
      return res.status(400).json({ message: 'Semester harus Ganjil atau Genap' });
    }
    req.penilaianContext = { jenis, semester };
    next();
  },
  cekPenilaianStatus,
  guruKelasController.updateCatatanWaliKelas
);

// --- Ekstrakurikuler & Kokurikuler ---
router.get('/ekskul', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getEkskulSiswa);
router.put('/ekskul/:siswaId', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.updateEkskulSiswa);

router.get('/kokurikuler', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getNilaiKokurikuler);
router.get('/kokurikuler/:siswaId', authenticate, guruKelasOnly, (req, res, next) => {
  const siswaId = parseInt(req.params.siswaId);
  if (isNaN(siswaId) || siswaId <= 0) {
    return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
  }
  next();
}, cekPenilaianStatus, guruKelasController.getNilaiKokurikulerBySiswa);

router.put('/kokurikuler/:siswaId', authenticate, guruKelasOnly, (req, res, next) => {
  const siswaId = parseInt(req.params.siswaId);
  if (isNaN(siswaId) || siswaId <= 0) {
    return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
  }
  next();
}, cekPenilaianStatus, guruKelasController.updateNilaiKokurikuler);

// --- Nilai Akademik ---
router.get('/mapel', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getMapelForGuruKelas);
router.get('/nilai/:mapelId', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getNilaiByMapel);

// --- Atur Penilaian: Aspek Kokurikuler ---
router.get('/atur-penilaian/aspek-kokurikuler',
  authenticate,
  guruKelasOnly,
  aturPenilaianController.getAspekKokurikuler
);

// --- Atur Penilaian: Komponen ---
router.get('/atur-penilaian/komponen',
  authenticate,
  guruKelasOnly,
  aturPenilaianController.getKomponenPenilaian
);

// --- Atur Penilaian: Kategori Akademik ---
router.get('/atur-penilaian/kategori-akademik',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const { mapel_id } = req.query;
    if (!mapel_id || isNaN(Number(mapel_id))) {
      return res.status(400).json({ success: false, message: 'mapel_id wajib diisi' });
    }
    req.validatedMapelId = Number(mapel_id);
    next();
  },
  cekPenilaianStatus,
  aturPenilaianController.getKategoriNilaiAkademik
);

router.post('/atur-penilaian/kategori-akademik',
  authenticate,
  guruKelasOnly,
  cekPenilaianStatus,
  aturPenilaianController.createKategoriNilaiAkademik
);

router.put('/atur-penilaian/kategori-akademik/:id',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kategori tidak valid' });
    }
    next();
  },
  cekPenilaianStatus,
  aturPenilaianController.updateKategoriNilaiAkademik
);

router.delete('/atur-penilaian/kategori-akademik/:id',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kategori tidak valid' });
    }
    next();
  },
  aturPenilaianController.deleteKategoriNilaiAkademik
);

// --- Atur Penilaian: Kategori Rata-Rata ---
router.get('/atur-penilaian/kategori-rata-rata',
  authenticate,
  guruKelasOnly,
  cekPenilaianStatus,
  aturPenilaianController.getKategoriRataRata
);

router.post('/atur-penilaian/kategori-rata-rata',
  authenticate,
  guruKelasOnly,
  cekPenilaianStatus,
  aturPenilaianController.createKategoriRataRata
);

router.put('/atur-penilaian/kategori-rata-rata/:id',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kategori tidak valid' });
    }
    next();
  },
  cekPenilaianStatus,
  aturPenilaianController.updateKategoriRataRata
);

router.delete('/atur-penilaian/kategori-rata-rata/:id',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kategori tidak valid' });
    }
    next();
  },
  aturPenilaianController.deleteKategoriRataRata
);

// --- Atur Penilaian: Kategori Kokurikuler ---
router.get('/atur-penilaian/kategori-kokurikuler',
  authenticate,
  guruKelasOnly,
  cekPenilaianStatus,
  aturPenilaianController.getKategoriNilaiKokurikuler
);

router.post('/atur-penilaian/kategori-kokurikuler',
  authenticate,
  guruKelasOnly,
  cekPenilaianStatus,
  aturPenilaianController.createKategoriNilaiKokurikuler
);

router.put('/atur-penilaian/kategori-kokurikuler/:id',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kategori tidak valid' });
    }
    next();
  },
  cekPenilaianStatus,
  aturPenilaianController.updateKategoriNilaiKokurikuler
);

router.delete('/atur-penilaian/kategori-kokurikuler/:id',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID kategori tidak valid' });
    }
    next();
  },
  aturPenilaianController.deleteKategoriNilaiKokurikuler
);

// --- Atur Penilaian: Bobot Akademik ---
router.get('/atur-penilaian/bobot-akademik/:mapelId',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const mapelId = parseInt(req.params.mapelId);
    if (isNaN(mapelId) || mapelId <= 0) {
      return res.status(400).json({ success: false, message: 'ID mata pelajaran tidak valid' });
    }
    next();
  },
  cekPenilaianStatus,
  aturPenilaianController.getBobotAkademikByMapel
);

router.put('/atur-penilaian/bobot-akademik/:mapelId',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const mapelId = parseInt(req.params.mapelId);
    if (isNaN(mapelId) || mapelId <= 0) {
      return res.status(400).json({ success: false, message: 'ID mata pelajaran tidak valid' });
    }
    next();
  },
  cekPenilaianStatus,
  aturPenilaianController.updateBobotAkademikByMapel
);

// --- Rekapan Nilai ---
router.get('/rekapan-nilai', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.getRekapanNilai);
router.get('/rekapan-nilai/export-excel', authenticate, guruKelasOnly, cekPenilaianStatus, guruKelasController.exportRekapanNilaiExcel);

// --- Tahun Ajaran Aktif ---
router.get('/tahun-ajaran/aktif', authenticate, guruKelasOnly, guruKelasController.getTahunAjaranAktif);

// --- RAPOR (DUA VERSI: AKTIF & ARSIP) ---
router.get('/generate-rapor/:siswaId/:jenis/:semester',
  authenticate,
  authorize(['admin', 'guru kelas']),
  (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) {
      return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
    }
    const jenis = req.params.jenis.toUpperCase();
    if (!['PTS', 'PAS'].includes(jenis)) {
      return res.status(400).json({ success: false, message: 'Jenis rapor harus PTS atau PAS' });
    }
    const rawSemester = req.params.semester.trim();
    let normalizedSemester = '';
    if (rawSemester.toLowerCase() === 'ganjil') normalizedSemester = 'Ganjil';
    else if (rawSemester.toLowerCase() === 'genap') normalizedSemester = 'Genap';
    else return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    req.raporParams = { siswaId, jenis, semester: normalizedSemester, tahunAjaranId: null };
    next();
  },
  cekPenilaianStatus,
  guruKelasController.generateRaporPDF
);

router.get('/generate-rapor/:siswaId/:jenis/:semester/:tahunAjaranId',
  authenticate,
  authorize(['admin', 'guru kelas']),
  (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) {
      return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
    }
    const jenis = req.params.jenis.toUpperCase();
    if (!['PTS', 'PAS'].includes(jenis)) {
      return res.status(400).json({ success: false, message: 'Jenis rapor harus PTS atau PAS' });
    }
    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';
    if (rawSemester === 'ganjil') normalizedSemester = 'Ganjil';
    else if (rawSemester === 'genap') normalizedSemester = 'Genap';
    else return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);
    if (isNaN(tahunAjaranId) || tahunAjaranId <= 0) {
      return res.status(400).json({ success: false, message: 'ID tahun ajaran tidak valid' });
    }
    req.raporParams = { siswaId, jenis, semester: normalizedSemester, tahunAjaranId };
    next();
  },
  cekPenilaianStatus,
  guruKelasController.generateRaporPDF
);

// --- Input Nilai Komponen ---
router.put('/nilai-komponen/:mapelId/:siswaId',
  authenticate,
  guruKelasOnly,
  (req, res, next) => {
    const mapelId = parseInt(req.params.mapelId, 10);
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(mapelId) || mapelId <= 0 || isNaN(siswaId) || siswaId <= 0) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }
    req.validatedMapelId = mapelId;
    req.validatedSiswaId = siswaId;
    next();
  },
  cekPenilaianStatus,
  guruKelasController.updateNilaiKomponen
);

module.exports = router;