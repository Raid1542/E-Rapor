/**
 * Nama File: guruKelasRoutes.js
 * Fungsi: Route API untuk role guru kelas (profil, absensi, catatan, ekskul, kokurikuler, akademik, rapor)
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

// Konstanta untuk direktori upload
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

// Konstanta untuk limit ukuran file
const LIMIT_FOTO = 5 * 1024 * 1024;
const LIMIT_EXCEL = 10 * 1024 * 1024;

// Konstanta untuk ekstensi file yang diizinkan
const EXT_FOTO = ['.png', '.jpg', '.jpeg', '.webp'];
const EXT_EXCEL = ['.xlsx', '.xls'];

// Konstanta untuk semester valid
const SEMESTER_VALID = ['Ganjil', 'Genap'];
const JENIS_VALID = ['PTS', 'PAS'];

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

const UPLOAD_EXCEL = multer({
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

// Middleware: hanya guru kelas
const GURU_KELAS_ONLY = authorize(['guru_kelas']);

// Validasi parameter jenis dan semester
const validateJenisSemester = (req, res, next) => {
    const { jenis, semester } = req.params;

    if (!JENIS_VALID.includes(jenis.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: 'Jenis harus PTS atau PAS',
        });
    }

    const normalizedSemester = semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();

    if (!SEMESTER_VALID.includes(normalizedSemester)) {
        return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap',
        });
    }

    req.penilaianContext = {
        jenis: jenis.toUpperCase(),
        semester: normalizedSemester,
    };
    next();
};

// Validasi parameter ID
const validateIdParam = (paramName) => (req, res, next) => {
    const id = parseInt(req.params[paramName], 10);

    if (isNaN(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: `ID ${paramName} tidak valid`,
        });
    }

    req.params[paramName] = id;
    next();
};

// Cek tahun ajaran aktif
const cekTahunAjaranAktif = async (req, res, next) => {
    try {
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, tahun_ajaran FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );

        if (taRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur oleh admin',
            });
        }

        req.idTahunAjaranInduk = taRows[0].id_tahun_ajaran_induk;
        req.idSemesterAktif = taRows[0].id_tahun_ajaran;
        req.tahunAjaranAktif = taRows[0];
        next();
    } catch (err) {
        console.error('Error cekTahunAjaranAktif:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil tahun ajaran',
        });
    }
};

// Set penilaian context aktif (untuk route import template)
const setPenilaianContextAktif = async (req, res, next) => {
    try {
        const [taRows] = await db.execute(
            'SELECT status_pts, status_pas, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );

        if (taRows.length === 0) {
            return next();
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

        req.penilaianContext = {
            jenis: jenisAktif,
            semester: semester,
            status_pts: status_pts,
            status_pas: status_pas,
        };

        next();
    } catch (err) {
        console.error('Error setPenilaianContextAktif:', err);
        next();
    }
};

// Validasi jenis absensi untuk POST
const validateAbsensiJenis = (req, res, next) => {
    if (req.method === 'POST') {
        const { jenis } = req.body;

        if (!jenis || !JENIS_VALID.includes(jenis.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Jenis harus PTS atau PAS',
            });
        }

        req.penilaianContext = {
            ...req.penilaianContext,
            jenis: jenis.toUpperCase(),
        };
    }
    next();
};

// Cek status absensi
const cekStatusAbsensi = async (req, res, next) => {
    try {
        const { jenis } = req.penilaianContext || {};
        const [taRows] = await db.execute(
            'SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );

        if (taRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
            });
        }

        const { status_pts, status_pas } = taRows[0];
        const status = jenis === 'PTS' ? status_pts : status_pas;

        if (req.method === 'POST' && status === 'selesai') {
            return res.status(403).json({
                success: false,
                message: `Periode ${jenis} sudah selesai. Data tidak dapat diubah.`,
                code: 'PERIOD_LOCKED',
            });
        }

        if (req.method === 'POST' && status === 'nonaktif') {
            return res.status(403).json({
                success: false,
                message: `Periode ${jenis} belum dibuka.`,
                code: 'PERIOD_NOT_OPEN',
            });
        }

        req.absensiStatus = status;
        next();
    } catch (err) {
        console.error('Error cekStatusAbsensi:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengecek status absensi',
        });
    }
};

// Safe handler untuk endpoint yang belum tersedia
const safeHandler = (fn) => {
    if (typeof fn !== 'function') {
        return (req, res) => res.status(501).json({
            success: false,
            message: 'Endpoint belum tersedia (handler tidak ditemukan)',
        });
    }
    return fn;
};

// Validasi parameter rapor
const validateRaporParams = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);

    if (isNaN(siswaId) || siswaId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID siswa tidak valid',
        });
    }

    const jenis = req.params.jenis.toUpperCase();

    if (!JENIS_VALID.includes(jenis)) {
        return res.status(400).json({
            success: false,
            message: 'Jenis rapor harus PTS atau PAS',
        });
    }

    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';

    if (rawSemester === 'ganjil') {
        normalizedSemester = 'Ganjil';
    } else if (rawSemester === 'genap') {
        normalizedSemester = 'Genap';
    } else {
        return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap',
        });
    }

    req.raporParams = {
        siswaId,
        jenis,
        semester: normalizedSemester,
        tahunAjaranId: null,
    };
    next();
};

// Validasi parameter rapor dengan tahun ajaran
const validateRaporParamsWithTA = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);

    if (isNaN(siswaId) || siswaId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID siswa tidak valid',
        });
    }

    const jenis = req.params.jenis.toUpperCase();

    if (!JENIS_VALID.includes(jenis)) {
        return res.status(400).json({
            success: false,
            message: 'Jenis rapor harus PTS atau PAS',
        });
    }

    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';

    if (rawSemester === 'ganjil') {
        normalizedSemester = 'Ganjil';
    } else if (rawSemester === 'genap') {
        normalizedSemester = 'Genap';
    } else {
        return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap',
        });
    }

    const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);

    if (isNaN(tahunAjaranId) || tahunAjaranId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID tahun ajaran tidak valid',
        });
    }

    req.raporParams = {
        siswaId,
        jenis,
        semester: normalizedSemester,
        tahunAjaranId,
    };
    next();
};

// Middleware untuk admin atau guru kelas yang ditugaskan
const adminOrGuruKelasDitugaskan = [
    authenticate,
    authorize(['admin', 'guru_kelas']),
    async (req, res, next) => {
        if (req.user.role === 'admin') {
            const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);

            if (tahunAjaranId) {
                try {
                    const [taRows] = await db.execute(
                        'SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?',
                        [tahunAjaranId]
                    );
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
    },
];

// --- Data Kelas & Siswa ---
router.get('/dashboard', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getDashboardData));
router.get('/kelas', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getKelasSaya));
router.get('/siswa', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getSiswaByKelas));
router.get('/progress-penilaian', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getProgressPenilaian));

// --- Profil (Edit, Ganti Password, Upload Foto) ---
router.put('/profil', authenticate, GURU_KELAS_ONLY, safeHandler(guruKelasControllers.editProfil));
router.put('/ganti-password', authenticate, GURU_KELAS_ONLY, safeHandler(guruKelasControllers.gantiPassword));
router.put('/upload_foto', authenticate, GURU_KELAS_ONLY, UPLOAD_FOTO.single('foto'), safeHandler(guruKelasControllers.uploadFotoProfil));

// --- Absensi (GET per jenis/semester, POST upsert, IMPORT Excel) ---
router.get('/absensi/import-template', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateAbsensi));
router.post('/absensi/import', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, UPLOAD_EXCEL.single('file'), safeHandler(guruKelasControllers.importAbsensiExcel));
router.get('/absensi/:jenis/:semester', authenticate, GURU_KELAS_ONLY, validateJenisSemester, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getAbsensiSiswa));
router.post('/absensi', authenticate, GURU_KELAS_ONLY, validateAbsensiJenis, cekStatusAbsensi, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.upsertAbsensi));

// --- Catatan Wali Kelas (GET per jenis/semester, PUT per siswa, IMPORT Excel) ---
router.get('/catatan-wali-kelas/import-template', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateCatatanWali));
router.post('/catatan-wali-kelas/import', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, UPLOAD_EXCEL.single('file'), safeHandler(guruKelasControllers.importCatatanWaliExcel));
router.get('/catatan-wali-kelas/:jenis/:semester', authenticate, GURU_KELAS_ONLY, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getCatatanWaliKelas));
router.put('/catatan-wali-kelas/:siswa_id/:jenis/:semester', authenticate, GURU_KELAS_ONLY, validateJenisSemester, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateCatatanWaliKelas));

// --- Ekstrakurikuler (GET siswa, PUT update, IMPORT Excel) ---
router.get('/ekskul/import-template', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateEkskul));
router.post('/ekskul/import', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, UPLOAD_EXCEL.single('file'), safeHandler(guruKelasControllers.importEkskulExcel));
router.get('/ekskul', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getEkskulSiswa));
router.put('/ekskul/:siswaId', authenticate, GURU_KELAS_ONLY, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateEkskulSiswa));

// --- Kokurikuler (Judul Proyek + Nilai per siswa + IMPORT Excel) ---
router.get('/kokurikuler/judul-proyek', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getJudulProyek));
router.post('/kokurikuler/judul-proyek', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveJudulProyek));
router.get('/kokurikuler/import-template', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.downloadTemplateKokurikuler));
router.get('/kokurikuler/cek-status-kategori', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, safeHandler(guruKelasControllers.cekStatusKategoriKokurikuler));
router.post('/kokurikuler/import', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, setPenilaianContextAktif, cekGuruKelasDitugaskan, UPLOAD_EXCEL.single('file'), safeHandler(guruKelasControllers.importNilaiKokurikuler));
router.get('/kokurikuler', authenticate, GURU_KELAS_ONLY, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikuler));
router.get('/kokurikuler/:siswaId', authenticate, GURU_KELAS_ONLY, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiKokurikulerBySiswa));
router.put('/kokurikuler/:siswaId', authenticate, GURU_KELAS_ONLY, validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKokurikuler));

// --- Nilai Akademik (Mapel, Nilai per mapel, Update komponen, Update rapor, Export/Import Excel) ---
router.get('/mapel', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, safeHandler(guruKelasControllers.getMapelForGuruKelas));
router.get('/nilai/cek-status-kategori', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, cekPenilaianStatus, safeHandler(guruKelasControllers.cekStatusKategoriAkademik));
router.get('/nilai/import-template', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, setPenilaianContextAktif, safeHandler(guruKelasControllers.downloadTemplateNilai));
router.post('/nilai/import', authenticate, GURU_KELAS_ONLY, cekTahunAjaranAktif, setPenilaianContextAktif, cekPenilaianStatus, cekGuruKelasDitugaskan, UPLOAD_EXCEL.single('file'), safeHandler(guruKelasControllers.importNilaiExcel));
router.get('/nilai/:mapelId', authenticate, GURU_KELAS_ONLY, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getNilaiByMapel));
router.put('/nilai-komponen/:mapelId/:siswaId', authenticate, GURU_KELAS_ONLY, validateIdParam('mapelId'), validateIdParam('siswaId'), (req, res, next) => {
    req.validatedMapelId = req.params.mapelId;
    req.validatedSiswaId = req.params.siswaId;
    next();
}, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiKomponen));
router.put('/nilai-rapor/:mapelId/:siswaId', authenticate, GURU_KELAS_ONLY, validateIdParam('mapelId'), validateIdParam('siswaId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateNilaiRapor));
router.get('/nilai-ekspor/:mapelId', authenticate, GURU_KELAS_ONLY, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.eksporNilaiExcel));

// --- Atur Penilaian: Data Pendukung (Aspek Kokurikuler, Komponen) ---
router.get('/atur-penilaian/aspek-kokurikuler', authenticate, GURU_KELAS_ONLY, safeHandler(guruKelasControllers.getAspekKokurikuler));
router.post('/atur-penilaian/aspek-kokurikuler', authenticate, GURU_KELAS_ONLY, safeHandler(guruKelasControllers.createAspekKokurikuler));
router.get('/atur-penilaian/komponen', authenticate, GURU_KELAS_ONLY, safeHandler(guruKelasControllers.getKomponenPenilaian));

// --- Atur Penilaian: Kategori Nilai Akademik ---
router.get('/atur-penilaian/kategori-akademik', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriNilaiAkademik));
router.post('/atur-penilaian/kategori-akademik', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriNilaiAkademik));
router.put('/atur-penilaian/kategori-akademik/:id', authenticate, GURU_KELAS_ONLY, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriNilaiAkademik));
router.delete('/atur-penilaian/kategori-akademik/:id', authenticate, GURU_KELAS_ONLY, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriNilaiAkademik));

// --- Atur Penilaian: Kategori Kokurikuler ---
router.get('/atur-penilaian/kategori-kokurikuler', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriNilaiKokurikuler));
router.post('/atur-penilaian/kategori-kokurikuler', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriNilaiKokurikuler));
router.put('/atur-penilaian/kategori-kokurikuler/:id', authenticate, GURU_KELAS_ONLY, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriNilaiKokurikuler));
router.delete('/atur-penilaian/kategori-kokurikuler/:id', authenticate, GURU_KELAS_ONLY, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriNilaiKokurikuler));
router.post('/atur-penilaian/kategori-kokurikuler-batch', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriKokurikuler));

// --- Atur Penilaian: Bobot & Deskripsi Rata-Rata ---
router.get('/atur-penilaian/bobot-akademik/:mapelId', authenticate, GURU_KELAS_ONLY, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getBobotAkademikByMapel));
router.put('/atur-penilaian/bobot-akademik/:mapelId', authenticate, GURU_KELAS_ONLY, validateIdParam('mapelId'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateBobotAkademikByMapel));
router.get('/atur-penilaian/deskripsi-rata-rata', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.createKategoriDeskripsiRataRata));
router.put('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, GURU_KELAS_ONLY, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.updateKategoriDeskripsiRataRata));
router.delete('/atur-penilaian/deskripsi-rata-rata/:id', authenticate, GURU_KELAS_ONLY, validateIdParam('id'), cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.deleteKategoriDeskripsiRataRata));
router.post('/atur-penilaian/deskripsi-rata-rata-batch', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.saveBatchKategoriDeskripsiRataRata));

// --- Rekapan Nilai ---
router.get('/rekapan-nilai', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.getRekapanNilai));
router.get('/rekapan-nilai/export-excel', authenticate, GURU_KELAS_ONLY, cekPenilaianStatus, cekGuruKelasDitugaskan, safeHandler(guruKelasControllers.exportRekapanNilaiExcel));

// --- Tahun Ajaran Aktif ---
router.get('/tahun-ajaran/aktif', authenticate, GURU_KELAS_ONLY, safeHandler(guruKelasControllers.getTahunAjaranAktif));

// --- Rapor: Generate PDF/DOCX (Admin atau Guru Kelas yang ditugaskan) ---
router.get('/generate-rapor-bulk/:jenis/:semester', ...adminOrGuruKelasDitugaskan, validateJenisSemester, safeHandler(guruKelasControllers.generateRaporBulk));
router.get('/generate-rapor/:siswaId/:jenis/:semester', ...adminOrGuruKelasDitugaskan, validateRaporParams, safeHandler(guruKelasControllers.generateRaporPDF));
router.get('/generate-rapor/:siswaId/:jenis/:semester/:tahunAjaranId', ...adminOrGuruKelasDitugaskan, validateRaporParamsWithTA, safeHandler(guruKelasControllers.generateRaporPDF));

module.exports = router;