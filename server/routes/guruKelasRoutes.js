/**
 * Nama File: guruKelasRoutes.js
 * Fungsi: Route API untuk role guru kelas
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const cekGuruKelasDitugaskan = require('../middleware/cekGuruKelasDitugaskan');

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────
const guruKelasControllers = require('../controllers/guru_kelas');

// ─── SETUP UPLOAD FOTO ───────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const fotoProfilStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return cb(new Error('Format file tidak didukung'));
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `profil_${uniqueSuffix}${ext}`);
    },
});

const uploadFoto = multer({
    storage: fotoProfilStorage, limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return cb(new Error('Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'), false);
        cb(null, true);
    },
});

// ─── SETUP UPLOAD EXCEL ──────────────────────────────────────────────────────
const excelStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `import_${uniqueSuffix}${ext}`);
    },
});

const uploadExcel = multer({
    storage: excelStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.xlsx', '.xls'].includes(ext)) {
            return cb(new Error('Hanya file .xlsx atau .xls yang diizinkan'), false);
        }
        cb(null, true);
    },
});

// ─── HELPER MIDDLEWARE ───────────────────────────────────────────────────────
const guruKelasOnly = authorize(['guru_kelas']);

const validateJenisSemester = (req, res, next) => {
    const { jenis, semester } = req.params;
    if (!['PTS', 'PAS'].includes(jenis.toUpperCase())) return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
    const normalizedSemester = semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();
    if (!['Ganjil', 'Genap'].includes(normalizedSemester)) return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    req.penilaianContext = { jenis: jenis.toUpperCase(), semester: normalizedSemester };
    next();
};

const validateIdParam = (paramName) => (req, res, next) => {
    const id = parseInt(req.params[paramName], 10);
    if (isNaN(id) || id <= 0) return res.status(400).json({ success: false, message: `ID ${paramName} tidak valid` });
    req.params[paramName] = id;
    next();
};

const cekTahunAjaranAktif = async (req, res, next) => {
    try {
        const [taRows] = await db.execute('SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, tahun_ajaran FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1');
        if (taRows.length === 0) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur oleh admin' });
        req.idTahunAjaranInduk = taRows[0].id_tahun_ajaran_induk;
        req.idSemesterAktif = taRows[0].id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];
        next();
    } catch (err) {
        console.error('Error cekTahunAjaranAktif:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil tahun ajaran' });
    }
};

// ✅ PERBAIKAN: Definisi middleware SEBELUM digunakan
const validateAbsensiJenis = (req, res, next) => {
    if (req.method === 'POST') {
        const { jenis } = req.body;
        if (!jenis || !['PTS', 'PAS'].includes(jenis.toUpperCase())) return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
        req.penilaianContext = { ...req.penilaianContext, jenis: jenis.toUpperCase() };
    }
    next();
};

const cekStatusAbsensi = async (req, res, next) => {
    try {
        const { jenis } = req.penilaianContext || {};
        const [taRows] = await db.execute('SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1');
        if (taRows.length === 0) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        const { status_pts, status_pas } = taRows[0];
        const status = jenis === 'PTS' ? status_pts : status_pas;
        if (req.method === 'POST' && status === 'selesai') return res.status(403).json({ success: false, message: `Periode ${jenis} sudah selesai. Data tidak dapat diubah.`, code: 'PERIOD_LOCKED' });
        if (req.method === 'POST' && status === 'nonaktif') return res.status(403).json({ success: false, message: `Periode ${jenis} belum dibuka.`, code: 'PERIOD_NOT_OPEN' });
        req.absensiStatus = status;
        next();
    } catch (err) {
        console.error('Error cekStatusAbsensi:', err);
        res.status(500).json({ success: false, message: 'Gagal mengecek status absensi' });
    }
};

const safeHandler = (fn) => {
    if (typeof fn !== 'function') return (req, res) => res.status(501).json({ success: false, message: 'Endpoint belum tersedia (handler tidak ditemukan)' });
    return fn;
};

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// 1. DATA KELAS & SISWA
router.get('/dashboard', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getDashboardData));
router.get('/kelas', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getKelasSaya));
router.get('/siswa', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getSiswaByKelas));
router.get('/progress-penilaian', authenticate, guruKelasOnly, cekTahunAjaranAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getProgressPenilaian));

// 2. PROFIL
router.put('/profil', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.editProfil));
router.put('/ganti-password', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.gantiPassword));
router.put('/upload_foto', authenticate, guruKelasOnly, uploadFoto.single('foto'), safeHandler(guruKelasControllers.uploadFotoProfil));

// 3. ABSENSI
// ✅ PERBAIKAN: Route import SEBELUM route dengan parameter
router.get('/absensi/import-template', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateAbsensi));
router.post('/absensi/import', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importAbsensiExcel));

router.get('/absensi/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getAbsensiSiswa));
router.post('/absensi', authenticate, guruKelasOnly, validateAbsensiJenis, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.upsertAbsensi));

// 4. CATATAN WALI KELAS
router.get('/catatan-wali-kelas/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getCatatanWaliKelas));
router.put('/catatan-wali-kelas/:siswa_id/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateCatatanWaliKelas));

// 5. EKSTRAKURIKULER
router.get('/ekskul', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getEkskulSiswa));
router.put('/ekskul/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateEkskulSiswa));

// 6. KOKURIKULER
router.get('/kokurikuler/judul-proyek', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getJudulProyek));
router.post('/kokurikuler/judul-proyek', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveJudulProyek));
router.get('/kokurikuler/import-template', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateKokurikuler));
router.post('/kokurikuler/import', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importNilaiKokurikuler));
router.get('/kokurikuler', authenticate, guruKelasOnly, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikuler));
router.get('/kokurikuler/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikulerBySiswa));
router.put('/kokurikuler/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKokurikuler));

// 7. NILAI AKADEMIK
router.get('/mapel', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getMapelForGuruKelas));
router.get('/nilai/import-template', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.downloadTemplateNilai));
router.post('/nilai/import', authenticate, guruKelasOnly, cekTahunAjaranAktif, cekPenilaianStatus, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importNilaiExcel));
router.get('/nilai/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiByMapel));
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, guruKelasOnly, validateIdParam('mapelId'), validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKomponen));
router.put('/nilai-rapor/:mapelId/:siswaId', authenticate, guruKelasOnly, validateIdParam('mapelId'), validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiRapor));
router.get('/nilai-ekspor/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.eksporNilaiExcel));

// 8-13. ATUR PENILAIAN & LAINNYA
router.get('/atur-penilaian/aspek-kokurikuler', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getAspekKokurikuler));
router.post('/atur-penilaian/aspek-kokurikuler', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.createAspekKokurikuler));
router.get('/atur-penilaian/komponen', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getKomponenPenilaian));
router.get('/atur-penilaian/kategori-akademik', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriNilaiAkademik));
router.post('/atur-penilaian/kategori-akademik', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriNilaiAkademik));
router.put('/atur-penilaian/kategori-akademik/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriNilaiAkademik));
router.delete('/atur-penilaian/kategori-akademik/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriNilaiAkademik));
router.get('/atur-penilaian/kategori-kokurikuler', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriNilaiKokurikuler));
router.post('/atur-penilaian/kategori-kokurikuler', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriNilaiKokurikuler));
router.put('/atur-penilaian/kategori-kokurikuler/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriNilaiKokurikuler));
router.delete('/atur-penilaian/kategori-kokurikuler/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriNilaiKokurikuler));
router.get('/atur-penilaian/bobot-akademik/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getBobotAkademikByMapel));
router.put('/atur-penilaian/bobot-akademik/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateBobotAkademikByMapel));
router.post('/atur-penilaian/kategori-kokurikuler-batch', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriKokurikuler));
router.get('/atur-penilaian/deskripsi-rata-rata', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriDeskripsiRataRata));
router.put('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriDeskripsiRataRata));
router.delete('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata-batch', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriDeskripsiRataRata));

// 12. REKAPAN NILAI
router.get('/rekapan-nilai', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getRekapanNilai));
router.get('/rekapan-nilai/export-excel', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.exportRekapanNilaiExcel));

// 13. TAHUN AJARAN AKTIF
router.get('/tahun-ajaran/aktif', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getTahunAjaranAktif));

// 14. RAPOR
router.get('/generate-rapor/:siswaId/:jenis/:semester', authenticate, guruKelasOnly, validateIdParam('siswaId'), safeHandler(guruKelasControllers.generateRaporPDF));
router.get('/generate-rapor/:siswaId/:jenis/:semester/:tahunAjaranId', authenticate, guruKelasOnly, validateIdParam('siswaId'), validateIdParam('tahunAjaranId'), safeHandler(guruKelasControllers.generateRaporPDF));

module.exports = router;