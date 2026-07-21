/**
 * Nama File: guruKelasRoutes.js
 * Fungsi: Route API untuk role guru kelas (profil, absensi, catatan, ekskul, kokurikuler, akademik, rapor).
 *         Menangani semua endpoint untuk role guru kelas dengan validasi akses dan penilaian status.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('../config/db');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const cekGuruKelasDitugaskan = require('../middleware/cekGuruKelasDitugaskan');
const guruKelasControllers = require('../controllers/guru_kelas');

// ==========================================================================
// KONSTANTA
// ==========================================================================

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const LIMIT_FOTO = 5 * 1024 * 1024;
const LIMIT_EXCEL = 10 * 1024 * 1024;
const EXT_FOTO = ['.png', '.jpg', '.jpeg', '.webp'];
const EXT_EXCEL = ['.xlsx', '.xls'];
const SEMESTER_VALID = ['Ganjil', 'Genap'];
const JENIS_VALID = ['PTS', 'PAS'];

// ==========================================================================
// KONFIGURASI MULTER
// ==========================================================================

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

const excelMemoryStorage = multer.memoryStorage();
const uploadExcel = multer({
    storage: excelMemoryStorage,
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

const guruKelasOnly = authorize(['guru_kelas']);

const validateJenisSemester = (req, res, next) => {
    const { jenis, semester } = req.params;
    if (!JENIS_VALID.includes(jenis.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
    }
    const normalizedSemester = semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();
    if (!SEMESTER_VALID.includes(normalizedSemester)) {
        return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    }
    req.penilaianContext = { jenis: jenis.toUpperCase(), semester: normalizedSemester };
    next();
};

const validateIdParam = (paramName) => (req, res, next) => {
    const id = parseInt(req.params[paramName], 10);
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, message: `ID ${paramName} tidak valid` });
    }
    req.params[paramName] = id;
    next();
};

const cekTahunAjaranAktif = async (req, res, next) => {
    try {
        const query = 'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, tahun_ajaran FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1';
        const [taRows] = await db.execute(query);
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur oleh admin' });
        }
        req.idTahunAjaranInduk = taRows[0].id_tahun_ajaran_induk;
        req.idSemesterAktif = taRows[0].id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil tahun ajaran' });
    }
};

const setPenilaianContextAktif = async (req, res, next) => {
    try {
        const query = 'SELECT status_pts, status_pas, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1';
        const [taRows] = await db.execute(query);
        if (taRows.length === 0) {
            return next();
        }
        const { status_pts, status_pas, semester } = taRows[0];
        let jenisAktif = null;
        
        if (status_pts === 'aktif') jenisAktif = 'PTS';
        else if (status_pas === 'aktif') jenisAktif = 'PAS';
        else if (status_pts === 'selesai') jenisAktif = 'PTS';
        else if (status_pas === 'selesai') jenisAktif = 'PAS';

        req.penilaianContext = { jenis: jenisAktif, semester: semester, status_pts: status_pts, status_pas: status_pas };
        next();
    } catch (err) {
        next();
    }
};

const validateAbsensiJenis = (req, res, next) => {
    if (req.method === 'POST') {
        const { jenis } = req.body;
        if (!jenis || !JENIS_VALID.includes(jenis.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
        }
        req.penilaianContext = { ...req.penilaianContext, jenis: jenis.toUpperCase() };
    }
    next();
};

const cekStatusAbsensi = async (req, res, next) => {
    try {
        const { jenis } = req.penilaianContext || {};
        const query = 'SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1';
        const [taRows] = await db.execute(query);
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        const { status_pts, status_pas } = taRows[0];
        const status = jenis === 'PTS' ? status_pts : status_pas;

        if (req.method === 'POST' && status === 'selesai') {
            return res.status(403).json({ success: false, message: `Periode ${jenis} sudah selesai. Data tidak dapat diubah.`, code: 'PERIOD_LOCKED' });
        }
        if (req.method === 'POST' && status === 'nonaktif') {
            return res.status(403).json({ success: false, message: `Periode ${jenis} belum dibuka.`, code: 'PERIOD_NOT_OPEN' });
        }
        req.absensiStatus = status;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengecek status absensi' });
    }
};

const safeHandler = (fn) => {
    if (typeof fn !== 'function') {
        return (req, res) => res.status(501).json({ success: false, message: 'Endpoint belum tersedia (handler tidak ditemukan)' });
    }
    return fn;
};

const validateRaporParams = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) {
        return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
    }
    const jenis = req.params.jenis.toUpperCase();
    if (!JENIS_VALID.includes(jenis)) {
        return res.status(400).json({ success: false, message: 'Jenis rapor harus PTS atau PAS' });
    }
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
    if (isNaN(siswaId) || siswaId <= 0) {
        return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
    }
    
    const jenis = req.params.jenis.toUpperCase();
    if (!JENIS_VALID.includes(jenis)) {
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
};

const adminOrGuruKelasDitugaskan = [
    authenticate,
    authorize(['admin', 'guru_kelas']),
    async (req, res, next) => {
        if (req.user.role === 'admin') {
            const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);
            if (tahunAjaranId) {
                try {
                    const query = 'SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?';
                    const [taRows] = await db.execute(query, [tahunAjaranId]);
                    req.idTahunAjaranInduk = taRows[0]?.id_tahun_ajaran_induk || null;
                } catch (err) {
                    req.idTahunAjaranInduk = null;
                }
            } else {
                req.idTahunAjaranInduk = null;
            }
            req.idSemesterAktif = null;
            req.penilaianContext = {};
            return next();
        }
        cekPenilaianStatus(req, res, next);
    },
    (req, res, next) => {
        if (req.user.role === 'admin') {
            return next();
        }
        cekGuruKelasDitugaskan(req, res, next);
    }
];

// ==========================================================================
// ROUTE: DATA KELAS & SISWA
// ==========================================================================

router.get('/dashboard', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getDashboardData));
router.get('/kelas', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getKelasSaya));
router.get('/siswa', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getSiswaByKelas));
router.get('/progress-penilaian', authenticate, guruKelasOnly, cekTahunAjaranAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getProgressPenilaian));

// ==========================================================================
// ROUTE: PROFIL GURU
// ==========================================================================

router.put('/profil', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.editProfil));
router.put('/ganti-password', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.gantiPassword));
router.put('/upload_foto', authenticate, guruKelasOnly, uploadFoto.single('foto'), safeHandler(guruKelasControllers.uploadFotoProfil));

// ==========================================================================
// ROUTE: ABSENSI
// ==========================================================================

router.get('/absensi/import-template', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateAbsensi));
router.post('/absensi/import', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importAbsensiExcel));
router.get('/absensi/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getAbsensiSiswa));
router.post('/absensi', authenticate, guruKelasOnly, validateAbsensiJenis, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.upsertAbsensi));

// ==========================================================================
// ROUTE: CATATAN WALI KELAS
// ==========================================================================

router.get('/catatan-wali-kelas/import-template', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateCatatanWali));
router.post('/catatan-wali-kelas/import', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importCatatanWaliExcel));
router.get('/catatan-wali-kelas/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getCatatanWaliKelas));
router.put('/catatan-wali-kelas/:siswa_id/:jenis/:semester', authenticate, guruKelasOnly, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateCatatanWaliKelas));

// ==========================================================================
// ROUTE: EKSTRAKURIKULER
// ==========================================================================

router.get('/ekskul/import-template', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateEkskul));
router.post('/ekskul/import', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importEkskulExcel));
router.get('/ekskul', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getEkskulSiswa));
router.put('/ekskul/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateEkskulSiswa));

// ==========================================================================
// ROUTE: KOKURIKULER
// ==========================================================================

router.get('/kokurikuler/judul-proyek', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getJudulProyek));
router.post('/kokurikuler/judul-proyek', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveJudulProyek));
router.get('/kokurikuler/import-template', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateKokurikuler));
router.get('/kokurikuler/cek-status-kategori', authenticate, guruKelasOnly, cekPenilaianStatus, safeHandler(guruKelasControllers.cekStatusKategoriKokurikuler));
router.post('/kokurikuler/import', authenticate, guruKelasOnly, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importNilaiKokurikuler));
router.get('/kokurikuler', authenticate, guruKelasOnly, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikuler));
router.get('/kokurikuler/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikulerBySiswa));
router.put('/kokurikuler/:siswaId', authenticate, guruKelasOnly, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKokurikuler));

// ==========================================================================
// ROUTE: NILAI AKADEMIK
// ==========================================================================

router.get('/mapel', authenticate, guruKelasOnly, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getMapelForGuruKelas));
router.get('/nilai/cek-status-kategori', authenticate, guruKelasOnly, cekTahunAjaranAktif, cekPenilaianStatus, safeHandler(guruKelasControllers.cekStatusKategoriAkademik));
router.get('/nilai/import-template', authenticate, guruKelasOnly, cekTahunAjaranAktif, setPenilaianContextAktif, safeHandler(guruKelasControllers.downloadTemplateNilai));
router.post('/nilai/import', authenticate, guruKelasOnly, cekTahunAjaranAktif, setPenilaianContextAktif, cekPenilaianStatus, cekGuruKelasDitugaskan, uploadExcel.single('file'), safeHandler(guruKelasControllers.importNilaiExcel));
router.get('/nilai/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiByMapel));
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, guruKelasOnly, validateIdParam('mapelId'), validateIdParam('siswaId'), (req, res, next) => {
    req.validatedMapelId = req.params.mapelId;
    req.validatedSiswaId = req.params.siswaId;
    next();
}, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKomponen));
router.put('/nilai-rapor/:mapelId/:siswaId', authenticate, guruKelasOnly, validateIdParam('mapelId'), validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiRapor));
router.get('/nilai-ekspor/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.eksporNilaiExcel));

// ==========================================================================
// ROUTE: ATUR PENILAIAN
// ==========================================================================

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
router.post('/atur-penilaian/kategori-kokurikuler-batch', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriKokurikuler));

router.get('/atur-penilaian/bobot-akademik/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getBobotAkademikByMapel));
router.put('/atur-penilaian/bobot-akademik/:mapelId', authenticate, guruKelasOnly, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateBobotAkademikByMapel));
router.get('/atur-penilaian/deskripsi-rata-rata', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriDeskripsiRataRata));
router.put('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriDeskripsiRataRata));
router.delete('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, guruKelasOnly, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata-batch', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriDeskripsiRataRata));

// ==========================================================================
// ROUTE: REKAPAN NILAI & TAHUN AJARAN
// ==========================================================================

router.get('/rekapan-nilai', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getRekapanNilai));
router.get('/rekapan-nilai/export-excel', authenticate, guruKelasOnly, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.exportRekapanNilaiExcel));
router.get('/tahun-ajaran/aktif', authenticate, guruKelasOnly, safeHandler(guruKelasControllers.getTahunAjaranAktif));

// ==========================================================================
// ROUTE: RAPOR (Generate PDF/DOCX)
// ==========================================================================

router.get('/generate-rapor-bulk/:jenis/:semester',
    ...adminOrGuruKelasDitugaskan,
    validateJenisSemester,
    safeHandler(guruKelasControllers.generateRaporBulk)
);

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