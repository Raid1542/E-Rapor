/**
 * Nama File: guruKelasRoutes.js
 * Fungsi: Mendefinisikan rute API untuk role 'guru kelas'
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db'); // ← TAMBAHAN BARU

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cekPenilaianStatus = require('../middleware/cekPenilaianStatus');
const cekGuruKelasDitugaskan = require('../middleware/cekGuruKelasDitugaskan');
const cekStatusPAS = require ('../middleware/cekStatusPAS');

// ─── CONTROLLERS ──────────────────────────────────────
const guruKelasControllers = require('../controllers/guru_kelas');

// ─── SETUP UPLOAD FOTO ───────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const fotoProfilStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            return cb(new Error('Format file tidak didukung'));
        }
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
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

// ─── HELPER MIDDLEWARE ───────────────────────────────────────────────────────
const guruKelasOnly = authorize(['guru kelas']);

const validateJenisSemester = (req, res, next) => {
    const { jenis, semester } = req.params;

    if (!['PTS', 'PAS'].includes(jenis.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: 'Jenis harus PTS atau PAS'
        });
    }

    const normalizedSemester = semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();
    if (!['Ganjil', 'Genap'].includes(normalizedSemester)) {
        return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap'
        });
    }

    req.penilaianContext = { 
        jenis: jenis.toUpperCase(), 
        semester: normalizedSemester 
    };
    next();
};

const validateIdParam = (paramName) => (req, res, next) => {
    const id = parseInt(req.params[paramName], 10);
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: `ID ${paramName} tidak valid`
        });
    }
    req.params[paramName] = id;
    next();
};

// ← TAMBAHAN BARU: middleware ringan khusus route /kelas dan /progress-penilaian
// Tugasnya sama seperti cekPenilaianStatus tapi TANPA cek status PTS/PAS
// karena dashboard hanya butuh info tahun ajaran, tidak butuh tahu periode aktif
const cekTahunAjaranAktif = async (req, res, next) => {
    try {
        const [taRows] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, tahun_ajaran
            FROM tahun_ajaran
            WHERE status = 'aktif'
            LIMIT 1
        `);
        if (taRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur oleh admin'
            });
        }
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
// 1. DATA KELAS & SISWA
// ═════════════════════════════════════════════════════════════════════════════
router.get('/kelas',
    authenticate,
    guruKelasOnly,
    cekTahunAjaranAktif,        // ← DIUBAH: dari cekPenilaianStatus ke cekTahunAjaranAktif
    guruKelasControllers.getKelasSaya
);

router.get('/siswa',
    authenticate,
    guruKelasOnly,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getSiswaByKelas
);

router.get('/progress-penilaian',
    authenticate,
    guruKelasOnly,
    cekTahunAjaranAktif,        // ← DIUBAH: dari cekPenilaianStatus ke cekTahunAjaranAktif
    cekGuruKelasDitugaskan,
    guruKelasControllers.getProgressPenilaian
);

// ═════════════════════════════════════════════════════════════════════════════
// 2. PROFIL
// ═════════════════════════════════════════════════════════════════════════════
router.put('/profil',
    authenticate,
    guruKelasOnly,
    guruKelasControllers.editProfil
);

router.put('/ganti-password',
    authenticate,
    guruKelasOnly,
    guruKelasControllers.gantiPassword
);

router.put('/upload_foto',
    authenticate,
    guruKelasOnly,
    uploadFoto.single('foto'),
    guruKelasControllers.uploadFotoProfil
);

// ═════════════════════════════════════════════════════════════════════════════
// 3. ABSENSI
// ═════════════════════════════════════════════════════════════════════════════
router.get('/absensi/:jenis/:semester',
    authenticate,
    guruKelasOnly,
    validateJenisSemester,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getAbsensiSiswa
);

router.post('/absensi/:jenis/:semester',
    authenticate,
    guruKelasOnly,
    validateJenisSemester,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.upsertAbsensi
);

// ═════════════════════════════════════════════════════════════════════════════
// 4. CATATAN WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════
router.get('/catatan-wali-kelas/:jenis/:semester',
    authenticate,
    guruKelasOnly,
    validateJenisSemester,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getCatatanWaliKelas
);

router.put('/catatan-wali-kelas/:siswa_id/:jenis/:semester',
    authenticate,
    guruKelasOnly,
    validateJenisSemester,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateCatatanWaliKelas
);

// ═════════════════════════════════════════════════════════════════════════════
// 5. EKSTRAKURIKULER
// ═════════════════════════════════════════════════════════════════════════════
router.get('/ekskul',
    authenticate,
    guruKelasOnly,
    cekStatusPAS,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getEkskulSiswa
);

router.put('/ekskul/:siswaId',
    authenticate,
    guruKelasOnly,
    validateIdParam('siswaId'),
    cekStatusPAS,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateEkskulSiswa
);

// ═════════════════════════════════════════════════════════════════════════════
// 6. KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════
router.get('/kokurikuler',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getNilaiKokurikuler
);

router.get('/kokurikuler/:siswaId',
    authenticate,
    guruKelasOnly,
    validateIdParam('siswaId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getNilaiKokurikulerBySiswa
);

router.put('/kokurikuler/:siswaId',
    authenticate,
    guruKelasOnly,
    validateIdParam('siswaId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateNilaiKokurikuler
);

// ═════════════════════════════════════════════════════════════════════════════
// 7. NILAI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════
router.get('/mapel',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    guruKelasControllers.getMapelForGuruKelas
);

router.get('/nilai/:mapelId',
    authenticate,
    guruKelasOnly,
    validateIdParam('mapelId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getNilaiByMapel
);

router.put('/nilai-komponen/:mapelId/:siswaId',
    authenticate,
    guruKelasOnly,
    validateIdParam('mapelId'),
    validateIdParam('siswaId'),
    (req, res, next) => {
        req.validatedMapelId = req.params.mapelId;
        req.validatedSiswaId = req.params.siswaId;
        next();
    },
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateNilaiKomponen
);

router.put('/nilai-rapor/:mapelId/:siswaId',
    authenticate,
    guruKelasOnly,
    validateIdParam('mapelId'),
    validateIdParam('siswaId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateNilaiRapor
);

router.get('/nilai-ekspor/:mapelId',
    authenticate,
    guruKelasOnly,
    validateIdParam('mapelId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.eksporNilaiExcel
);

// ═════════════════════════════════════════════════════════════════════════════
// 8. ATUR PENILAIAN: DATA PENDUKUNG
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/aspek-kokurikuler',
    authenticate,
    guruKelasOnly,
    guruKelasControllers.getAspekKokurikuler
);

router.post('/atur-penilaian/aspek-kokurikuler',
    authenticate,
    guruKelasOnly,
    guruKelasControllers.createAspekKokurikuler
);

router.get('/atur-penilaian/komponen',
    authenticate,
    guruKelasOnly,
    guruKelasControllers.getKomponenPenilaian
);

// ═════════════════════════════════════════════════════════════════════════════
// 9. ATUR PENILAIAN: KATEGORI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/kategori-akademik',
    authenticate,
    guruKelasOnly,
    (req, res, next) => {
        const { mapel_id } = req.query;
        if (!mapel_id || isNaN(Number(mapel_id))) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id wajib diisi'
            });
        }
        req.validatedMapelId = Number(mapel_id);
        next();
    },
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getKategoriNilaiAkademik
);

router.post('/atur-penilaian/kategori-akademik',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.createKategoriNilaiAkademik
);

router.put('/atur-penilaian/kategori-akademik/:id',
    authenticate,
    guruKelasOnly,
    validateIdParam('id'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateKategoriNilaiAkademik
);

router.delete('/atur-penilaian/kategori-akademik/:id',
    authenticate,
    guruKelasOnly,
    validateIdParam('id'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.deleteKategoriNilaiAkademik
);

// ═════════════════════════════════════════════════════════════════════════════
// 10. ATUR PENILAIAN: KATEGORI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/kategori-kokurikuler',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getKategoriNilaiKokurikuler
);

router.post('/atur-penilaian/kategori-kokurikuler',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.createKategoriNilaiKokurikuler
);

router.put('/atur-penilaian/kategori-kokurikuler/:id',
    authenticate,
    guruKelasOnly,
    validateIdParam('id'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateKategoriNilaiKokurikuler
);

router.delete('/atur-penilaian/kategori-kokurikuler/:id',
    authenticate,
    guruKelasOnly,
    validateIdParam('id'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.deleteKategoriNilaiKokurikuler
);

// ═════════════════════════════════════════════════════════════════════════════
// 11. ATUR PENILAIAN: BOBOT AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════
router.get('/atur-penilaian/bobot-akademik/:mapelId',
    authenticate,
    guruKelasOnly,
    validateIdParam('mapelId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getBobotAkademikByMapel
);

router.put('/atur-penilaian/bobot-akademik/:mapelId',
    authenticate,
    guruKelasOnly,
    validateIdParam('mapelId'),
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.updateBobotAkademikByMapel
);

// ═════════════════════════════════════════════════════════════════════════════
// 11.1 ATUR PENILAIAN: BATCH SAVE & COPY DARI TA SEBELUMNYA
// ═════════════════════════════════════════════════════════════════════════════

// 1. Batch save kategori kokurikuler (simpan multiple grade sekaligus)
router.post('/atur-penilaian/kategori-kokurikuler-batch',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    batchPenilaianController.saveBatchKategoriKokurikuler
);

// 2. Copy kategori kokurikuler dari TA sebelumnya
router.post('/atur-penilaian/copy-kokurikuler',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    batchPenilaianController.copyKokurikulerDariTASebelumnya
);

// 3. Copy kategori akademik dari TA sebelumnya
router.post('/atur-penilaian/copy-akademik',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    batchPenilaianController.copyAkademikDariTASebelumnya
);

// 4. Copy bobot akademik dari TA sebelumnya
router.post('/atur-penilaian/copy-bobot',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    batchPenilaianController.copyBobotDariTASebelumnya
);


// ═════════════════════════════════════════════════════════════════════════════
// 12. REKAPAN NILAI
// ═════════════════════════════════════════════════════════════════════════════
router.get('/rekapan-nilai',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getRekapanNilai
);

router.get('/rekapan-nilai/export-excel',
    authenticate,
    guruKelasOnly,
    cekPenilaianStatus,
    cekGuruKelasDitugaskan,
    guruKelasControllers.exportRekapanNilaiExcel
);

// ═════════════════════════════════════════════════════════════════════════════
// 13. TAHUN AJARAN AKTIF
// ═════════════════════════════════════════════════════════════════════════════
router.get('/tahun-ajaran/aktif',
    authenticate,
    guruKelasOnly,
    cekGuruKelasDitugaskan,
    guruKelasControllers.getTahunAjaranAktif
);

// ═════════════════════════════════════════════════════════════════════════════
// 14. RAPOR - GENERATE PDF
// ═════════════════════════════════════════════════════════════════════════════
const validateRaporParams = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID siswa tidak valid'
        });
    }

    const jenis = req.params.jenis.toUpperCase();
    if (!['PTS', 'PAS'].includes(jenis)) {
        return res.status(400).json({
            success: false,
            message: 'Jenis rapor harus PTS atau PAS'
        });
    }

    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';
    if (rawSemester === 'ganjil') normalizedSemester = 'Ganjil';
    else if (rawSemester === 'genap') normalizedSemester = 'Genap';
    else {
        return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap'
        });
    }

    req.raporParams = {
        siswaId,
        jenis,
        semester: normalizedSemester,
        tahunAjaranId: null
    };
    next();
};

const validateRaporParamsWithTA = (req, res, next) => {
    const siswaId = parseInt(req.params.siswaId, 10);
    if (isNaN(siswaId) || siswaId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID siswa tidak valid'
        });
    }

    const jenis = req.params.jenis.toUpperCase();
    if (!['PTS', 'PAS'].includes(jenis)) {
        return res.status(400).json({
            success: false,
            message: 'Jenis rapor harus PTS atau PAS'
        });
    }

    const rawSemester = req.params.semester.trim().toLowerCase();
    let normalizedSemester = '';
    if (rawSemester === 'ganjil') normalizedSemester = 'Ganjil';
    else if (rawSemester === 'genap') normalizedSemester = 'Genap';
    else {
        return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap'
        });
    }

    const tahunAjaranId = parseInt(req.params.tahunAjaranId, 10);
    if (isNaN(tahunAjaranId) || tahunAjaranId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID tahun ajaran tidak valid'
        });
    }

    req.raporParams = {
        siswaId,
        jenis,
        semester: normalizedSemester,
        tahunAjaranId
    };
    next();
};

const adminOrGuruKelasDitugaskan = [
    authenticate,
    authorize(['admin', 'guru kelas']),
    (req, res, next) => {
        // Skip cekPenilaianStatus untuk admin
        if (req.user.role === 'admin') {
            return next();
        }
        // Untuk guru kelas, langsung panggil middleware
        cekPenilaianStatus(req, res, next);
    },
    (req, res, next) => {
        if (req.user.role === 'admin') return next();
        cekGuruKelasDitugaskan(req, res, next);
    }
];

router.get('/generate-rapor/:siswaId/:jenis/:semester',
    ...adminOrGuruKelasDitugaskan,
    validateRaporParams,
    guruKelasControllers.generateRaporPDF
);

router.get('/generate-rapor/:siswaId/:jenis/:semester/:tahunAjaranId',
    ...adminOrGuruKelasDitugaskan,
    validateRaporParamsWithTA,
    guruKelasControllers.generateRaporPDF
);

module.exports = router;