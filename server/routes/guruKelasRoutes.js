/**
 * Nama File: guruKelasRoutes.js
 * Fungsi: Route API untuk role guru kelas (profil, absensi, catatan, ekskul, kokurikuler, akademik, rapor)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 * Update: 8 Juli 2026 - Tambah fitur import Excel (absensi, catatan, ekskul, kokurikuler, nilai) + download rapor bulk
 * Fix: 9 Juli 2026 - Ganti uploadExcel ke memoryStorage untuk import Excel (req.file.buffer tersedia)
 * Fix: 9 Juli 2026 - Tambah middleware setPenilaianContextAktif untuk semua route import template
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
// ✅ PERBAIKAN: Gunakan memoryStorage agar req.file.buffer tersedia
const excelMemoryStorage = multer.memoryStorage();

const uploadExcel = multer({
    storage: excelMemoryStorage,
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

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: MIDDLEWARE UNTUK SET PENILAIAN CONTEXT AKTIF
// Digunakan untuk route import template yang tidak punya parameter :jenis/:semester
// ═════════════════════════════════════════════════════════════════════════════
const setPenilaianContextAktif = async (req, res, next) => {
    try {
        const [taRows] = await db.execute(
            'SELECT status_pts, status_pas, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        
        if (taRows.length === 0) {
            return next(); // Lanjut meskipun tidak ada tahun ajaran aktif
        }
        
        const { status_pts, status_pas, semester } = taRows[0];
        let jenisAktif = null;
        
        // Prioritas: PTS aktif > PAS aktif > PTS selesai > PAS selesai
        if (status_pts === 'aktif') {
            jenisAktif = 'PTS';
        } else if (status_pas === 'aktif') {
            jenisAktif = 'PAS';
        } else if (status_pts === 'selesai') {
            jenisAktif = 'PTS';
        } else if (status_pas === 'selesai') {
            jenisAktif = 'PAS';
        }
        
        // Set req.penilaianContext agar bisa dibaca di controller
        req.penilaianContext = {
            jenis: jenisAktif,
            semester: semester,
            status_pts: status_pts,
            status_pas: status_pas
        };
        
        next();
    } catch (err) {
        console.error('Error setPenilaianContextAktif:', err);
        next(); // Tetap lanjut meskipun error
    }
};

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
// 🆕 BARU: MIDDLEWARE UNTUK RAPOR (Admin atau Guru Kelas yang ditugaskan)
// ═════════════════════════════════════════════════════════════════════════════

const validateRaporParams = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
    
    const jenis = req.params.jenis.toUpperCase();
    if (!['PTS', 'PAS'].includes(jenis)) return res.status(400).json({ success: false, message: 'Jenis rapor harus PTS atau PAS' });
    
    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';
    if (rawSemester === 'ganjil') normalizedSemester = 'Ganjil';
    else if (rawSemester === 'genap') normalizedSemester = 'Genap';
    else return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    
    req.raporParams = { siswaId, jenis, semester: normalizedSemester, tahunAjaranId: null };
    next();
};

const validateRaporParamsWithTA = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
    
    const jenis = req.params.jenis.toUpperCase();
    if (!['PTS', 'PAS'].includes(jenis)) return res.status(400).json({ success: false, message: 'Jenis rapor harus PTS atau PAS' });
    
    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';
    if (rawSemester === 'ganjil') normalizedSemester = 'Ganjil';
    else if (rawSemester === 'genap') normalizedSemester = 'Genap';
    else return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    
    const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);
    if (isNaN(tahunAjaranId) || tahunAjaranId <= 0) return res.status(400).json({ success: false, message: 'ID tahun ajaran tidak valid' });
    
    req.raporParams = { siswaId, jenis, semester: normalizedSemester, tahunAjaranId };
    next();
};

const adminOrGuruKelasDitugaskan = [
    authenticate,
    authorize(['admin', 'guru_kelas']),
    async (req, res, next) => {
        if (req.user.role === 'admin') {
            const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);
            if (tahunAjaranId) {
                try {
                    const [taRows] = await db.execute('SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?', [tahunAjaranId]);
                    req.idTahunAjaranInduk = taRows[0]?.id_tahun_ajaran_induk || null;
                } catch (err) { req.idTahunAjaranInduk = null; }
            } else req.idTahunAjaranInduk = null;
            req.idSemesterAktif = null;
            req.penilaianContext = {};
            return next();
        }
        cekPenilaianStatus(req, res, next);
    },
    (req, res, next) => { 
        if (req.user.role === 'admin') return next(); 
        cekGuruKelasDitugaskan(req, res, next); 
    }
];

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// 1. DATA KELAS & SISWA
// ═════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getDashboardData));
router.get('/kelas', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getKelasSaya));
router.get('/siswa', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getSiswaByKelas));
router.get('/progress-penilaian', authenticate, guruKelasOnly, cekTahunAjaranAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getProgressPenilaian));

// ═════════════════════════════════════════════════════════════════════════════
// 2. PROFIL (Edit, Ganti Password, Upload Foto)
// ═════════════════════════════════════════════════════════════════════════════
router.put('/profil', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.editProfil));
router.put('/ganti-password', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.gantiPassword));
router.put('/upload_foto', authenticate, guruKelasOnly, uploadFoto.single('foto'), safeHandler(guruKelasControllers.uploadFotoProfil));

// ═════════════════════════════════════════════════════════════════════════════
// 3. ABSENSI (GET per jenis/semester, POST upsert, IMPORT Excel)
// ═════════════════════════════════════════════════════════════════════════════

// 🆕 BARU: Import Absensi (HARUS SEBELUM route dengan parameter!)
// ✅ PERBAIKAN: Tambah setPenilaianContextAktif agar req.penilaianContext ter-set
router.get('/absensi/import-template', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    safeHandler(guruKelasControllers.downloadTemplateAbsensi)
);
router.post('/absensi/import', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    uploadExcel.single('file'), 
    safeHandler(guruKelasControllers.importAbsensiExcel)
);

// Route existing
router.get('/absensi/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getAbsensiSiswa));
router.post('/absensi', authenticate, guruKelasOnly, validateAbsensiJenis, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.upsertAbsensi));

// ═════════════════════════════════════════════════════════════════════════════
// 4. CATATAN WALI KELAS (GET per jenis/semester, PUT per siswa, IMPORT Excel)
// ═════════════════════════════════════════════════════════════════════════════

// 🆕 BARU: Import Catatan Wali Kelas (HARUS SEBELUM route dengan parameter!)
// ✅ PERBAIKAN: Tambah setPenilaianContextAktif agar req.penilaianContext ter-set
router.get('/catatan-wali-kelas/import-template', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    safeHandler(guruKelasControllers.downloadTemplateCatatanWali)
);
router.post('/catatan-wali-kelas/import', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    uploadExcel.single('file'), 
    safeHandler(guruKelasControllers.importCatatanWaliExcel)
);

// Route existing
router.get('/catatan-wali-kelas/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getCatatanWaliKelas));
router.put('/catatan-wali-kelas/:siswa_id/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateCatatanWaliKelas));

// ═════════════════════════════════════════════════════════════════════════════
// 5. EKSTRAKURIKULER (GET siswa, PUT update, IMPORT Excel)
// ═════════════════════════════════════════════════════════════════════════════

// 🆕 BARU: Import Ekstrakurikuler (HARUS SEBELUM /ekskul/:siswaId!)
// ✅ PERBAIKAN: Tambah setPenilaianContextAktif agar req.penilaianContext ter-set
router.get('/ekskul/import-template', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    safeHandler(guruKelasControllers.downloadTemplateEkskul)
);
router.post('/ekskul/import', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    uploadExcel.single('file'), 
    safeHandler(guruKelasControllers.importEkskulExcel)
);

// Route existing
router.get('/ekskul', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getEkskulSiswa));
router.put('/ekskul/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateEkskulSiswa));

// ═════════════════════════════════════════════════════════════════════════════
// 6. KOKURIKULER (Judul Proyek + Nilai per siswa + IMPORT Excel)
// ═════════════════════════════════════════════════════════════════════════════
router.get('/kokurikuler/judul-proyek', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getJudulProyek));
router.post('/kokurikuler/judul-proyek', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveJudulProyek));

// 🆕 BARU: Import Kokurikuler (HARUS SEBELUM /kokurikuler/:siswaId!)
// ✅ PERBAIKAN: Tambah setPenilaianContextAktif agar req.penilaianContext ter-set
router.get('/kokurikuler/import-template', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    safeHandler(guruKelasControllers.downloadTemplateKokurikuler)
);
router.post('/kokurikuler/import', 
    authenticate, 
    guruKelasOnly, 
    cekPenilaianStatus, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekGuruKelasDitugaskan, 
    uploadExcel.single('file'), 
    safeHandler(guruKelasControllers.importNilaiKokurikuler)
);

// Route existing
router.get('/kokurikuler', authenticate, guruKelasOnly, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikuler));
router.get('/kokurikuler/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikulerBySiswa));
router.put('/kokurikuler/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKokurikuler));

// ═════════════════════════════════════════════════════════════════════════════
// 7. NILAI AKADEMIK (Mapel, Nilai per mapel, Update komponen, Update rapor, Export/Import Excel)
// ═════════════════════════════════════════════════════════════════════════════
router.get('/mapel', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getMapelForGuruKelas));

// 🆕 BARU: Import Nilai Akademik (HARUS SEBELUM /nilai/:mapelId!)
// ✅ PERBAIKAN: Tambah setPenilaianContextAktif agar req.penilaianContext ter-set
router.get('/nilai/import-template', 
    authenticate, 
    guruKelasOnly, 
    cekTahunAjaranAktif,
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    safeHandler(guruKelasControllers.downloadTemplateNilai)
);
router.post('/nilai/import', 
    authenticate, 
    guruKelasOnly, 
    cekTahunAjaranAktif, 
    setPenilaianContextAktif,  // ← TAMBAHKAN INI
    cekPenilaianStatus, 
    cekGuruKelasDitugaskan, 
    uploadExcel.single('file'), 
    safeHandler(guruKelasControllers.importNilaiExcel)
);

// Route existing
router.get('/nilai/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiByMapel));
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, guruKelasOnly, validateIdParam('mapelId'), validateIdParam('siswaId'),
    (req, res, next) => { req.validatedMapelId = req.params.mapelId; req.validatedSiswaId = req.params.siswaId; next(); },
    cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKomponen));
router.put('/nilai-rapor/:mapelId/:siswaId', authenticate, guruKelasOnly, validateIdParam('mapelId'), validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiRapor));
router.get('/nilai-ekspor/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.eksporNilaiExcel));

// ═════════════════════════════════════════════════════════════════════════════
// 8. ATUR PENILAIAN: DATA PENDUKUNG (Aspek Kokurikuler, Komponen)
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/aspek-kokurikuler', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getAspekKokurikuler));
router.post('/atur-penilaian/aspek-kokurikuler', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.createAspekKokurikuler));
router.get('/atur-penilaian/komponen', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getKomponenPenilaian));

// ═════════════════════════════════════════════════════════════════════════════
// 9. ATUR PENILAIAN: KATEGORI NILAI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/kategori-akademik', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriNilaiAkademik));
router.post('/atur-penilaian/kategori-akademik', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriNilaiAkademik));
router.put('/atur-penilaian/kategori-akademik/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriNilaiAkademik));
router.delete('/atur-penilaian/kategori-akademik/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriNilaiAkademik));

// ═════════════════════════════════════════════════════════════════════════════
// 10. ATUR PENILAIAN: KATEGORI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/kategori-kokurikuler', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriNilaiKokurikuler));
router.post('/atur-penilaian/kategori-kokurikuler', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriNilaiKokurikuler));
router.put('/atur-penilaian/kategori-kokurikuler/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriNilaiKokurikuler));
router.delete('/atur-penilaian/kategori-kokurikuler/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriNilaiKokurikuler));
router.post('/atur-penilaian/kategori-kokurikuler-batch', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriKokurikuler));

// ═════════════════════════════════════════════════════════════════════════════
// 11. ATUR PENILAIAN: BOBOT & DESKRIPSI RATA-RATA
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/bobot-akademik/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getBobotAkademikByMapel));
router.put('/atur-penilaian/bobot-akademik/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateBobotAkademikByMapel));
router.get('/atur-penilaian/deskripsi-rata-rata', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriDeskripsiRataRata));
router.put('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriDeskripsiRataRata));
router.delete('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata-batch', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriDeskripsiRataRata));

// ═════════════════════════════════════════════════════════════════════════════
// 12. REKAPAN NILAI
// ═════════════════════════════════════════════════════════════════════════════
router.get('/rekapan-nilai', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getRekapanNilai));
router.get('/rekapan-nilai/export-excel', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.exportRekapanNilaiExcel));

// ═════════════════════════════════════════════════════════════════════════════
// 13. TAHUN AJARAN AKTIF
// ═════════════════════════════════════════════════════════════════════════════
router.get('/tahun-ajaran/aktif', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getTahunAjaranAktif));

// ═════════════════════════════════════════════════════════════════════════════
// 14. RAPOR - GENERATE PDF/DOCX (Admin atau Guru Kelas yang ditugaskan)
// ═════════════════════════════════════════════════════════════════════════════

// 🆕 BARU: Download semua rapor sekaligus (ZIP)
router.get('/generate-rapor-bulk/:jenis/:semester',
    ...adminOrGuruKelasDitugaskan,
    validateJenisSemester,
    safeHandler(guruKelasControllers.generateRaporBulk)
);

// Route existing (tetap sama)
router.get('/generate-rapor/:siswaId/:jenis/:semester', 
    ...adminOrGuruKelasDitugaskan, 
    validateRaporParams, 
    safeHandler(guruKelasControllers.generateRaporPDF)
);

router.get('/generate-rapor/:siswaId/:jenis/:semester/:tahunAjaranId', 
    ...adminOrGuruKelasDitugaskan, 
    validateRaporParamsWithTA, 
    safeHandler(guruKelasControllers.generateRaporPDF)
);

module.exports = router;