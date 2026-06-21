/**
 * Nama File: aturPenilaianController.js
 * Fungsi: Handle logic & response untuk fitur Atur Penilaian
 *         UPDATE: 
 *         - Semua konfigurasi PER KELAS (bukan global)
 *         - ✅ Validasi periode untuk Kategori Kokurikuler:
 *           - PTS aktif → hanya Mutaba'ah (id=5)
 *           - PAS aktif → semua aspek
 *         - Menggunakan req.infoKelasWali.kelas_id dari middleware
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');
const { updateAllNilaiRaporForMapel, validateGradeOrder } = require('./helpers');

// ═════════════════════════════════════════════════════════════════════════════
// ✅ KONSTANTA: ID Aspek Mutaba'ah (sesuai database)
// ═════════════════════════════════════════════════════════════════════════════
const ASPEK_MUTABAAH_ID = 5;

// ═════════════════════════════════════════════════════════════════════════════
// ✅ HELPER: Validasi Akses Aspek Kokurikuler Berdasarkan Periode
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Cek apakah aspek kokurikuler boleh dikelola berdasarkan periode aktif
 * 
 * @param {number} aspekId - ID aspek yang akan dikelola
 * @param {string} status_pts - Status PTS ('aktif' | 'nonaktif' | 'selesai')
 * @param {string} status_pas - Status PAS ('aktif' | 'nonaktif' | 'selesai')
 * @returns {Object} { allowed: boolean, reason: string }
 */
const validateAspekKokurikulerAccess = (aspekId, status_pts, status_pas) => {
    const isPtsActive = status_pts === 'aktif';
    const isPasActive = status_pas === 'aktif';

    // Belum ada periode aktif
    if (!isPtsActive && !isPasActive) {
        return {
            allowed: false,
            reason: 'not_open',
            message: 'Periode penilaian belum aktif. Silakan tunggu admin membuka periode penilaian.'
        };
    }

    // PTS aktif: hanya Mutaba'ah
    if (isPtsActive) {
        if (aspekId !== ASPEK_MUTABAAH_ID) {
            return {
                allowed: false,
                reason: 'locked_pts',
                message: `Saat periode PTS aktif, hanya aspek Mutaba'ah Yaumiyah yang dapat dikelola kategorinya. Aspek lain akan dibuka saat periode PAS.`
            };
        }
    }

    // PAS aktif: semua aspek boleh
    if (isPasActive) {
        return { allowed: true, reason: 'pas_active' };
    }

    return { allowed: true, reason: 'default' };
};

// ═════════════════════════════════════════════════════════════════════════════
//  HELPER: Validasi Akses Deskripsi Rata-rata (HANYA saat PTS aktif)
// ═════════════════════════════════════════════════════════════════════════════
const validateDeskripsiRataRataAccess = (status_pts, status_pas) => {
    // Rule: Hanya bisa diakses saat PTS aktif
    if (status_pts === 'aktif') {
        return { allowed: true };
    }

    if (status_pas === 'aktif') {
        return {
            allowed: false,
            message: 'Deskripsi rata-rata hanya dapat diatur saat periode PTS aktif. Saat ini periode PAS sedang aktif.'
        };
    }

    return {
        allowed: false,
        message: 'Periode penilaian belum aktif. Deskripsi rata-rata hanya dapat diatur saat periode PTS aktif.'
    };
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Ambil kelas_id dari request
// ═════════════════════════════════════════════════════════════════════════════
const getKelasId = (req) => req.infoKelasWali?.kelas_id;

// ═════════════════════════════════════════════════════════════════════════════
// DATA PENDUKUNG
// ═════════════════════════════════════════════════════════════════════════════

exports.getAspekKokurikuler = async (req, res) => {
    try {
        const aspek = await model.getAspekKokurikuler();
        res.json({ success: true, data: aspek });
    } catch (err) {
        console.error('Error getAspekKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil aspek kokurikuler' });
    }
};

exports.getKomponenPenilaian = async (req, res) => {
    try {
        const komponen = await model.getKomponenPenilaian();
        res.json({ success: true, data: komponen });
    } catch (err) {
        console.error('Error getKomponenPenilaian:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil komponen penilaian' });
    }
};

exports.createAspekKokurikuler = async (req, res) => {
    try {
        const { nama, kode } = req.body;

        if (!nama || nama.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Nama aspek minimal 3 karakter.'
            });
        }

        let kodeAspek = kode;
        if (!kodeAspek) {
            kodeAspek = nama.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);

            const [existing] = await db.execute(
                `SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE kode = ?`,
                [kodeAspek]
            );

            if (existing.length > 0) {
                kodeAspek = `${kodeAspek}_${Date.now().toString().slice(-4)}`;
            }
        }

        const [existingNama] = await db.execute(
            `SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE nama = ?`,
            [nama.trim()]
        );

        if (existingNama.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Aspek dengan nama ini sudah ada.'
            });
        }

        const [existingKode] = await db.execute(
            `SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE kode = ?`,
            [kodeAspek]
        );

        if (existingKode.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Kode aspek sudah digunakan. Silakan gunakan nama atau kode lain.'
            });
        }

        const [maxUrutan] = await db.execute(
            `SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan FROM aspek_kokurikuler`
        );
        const nextUrutan = maxUrutan[0].next_urutan;

        const [result] = await db.execute(
            `INSERT INTO aspek_kokurikuler (kode, nama, urutan, created_at) VALUES (?, ?, ?, NOW())`,
            [kodeAspek, nama.trim(), nextUrutan]
        );

        res.status(201).json({
            success: true,
            message: 'Aspek kokurikuler berhasil dibuat.',
            data: {
                id_aspek_kokurikuler: result.insertId,
                kode: kodeAspek,
                nama: nama.trim(),
                urutan: nextUrutan
            }
        });
    } catch (err) {
        console.error('Error createAspekKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat aspek kokurikuler: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI AKADEMIK (PER MAPEL + PER KELAS)
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiAkademik = async (req, res) => {
    try {
        const mapelId = req.validatedMapelId;
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();

        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const kategori = await model.getKategoriAkademik(mapelId, taAktif.id_tahun_ajaran, kelasId);

        const kategoriParsed = kategori.map(k => ({
            ...k,
            min_nilai: Math.floor(parseFloat(k.min_nilai)),
            max_nilai: Math.floor(parseFloat(k.max_nilai))
        }));

        const coverage = await model.cekCoverage0to100(mapelId, taAktif.id_tahun_ajaran, kelasId);

        res.json({
            success: true,
            data: kategoriParsed,
            coverage: coverage
        });
    } catch (err) {
        console.error('Error getKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori akademik' });
    }
};

exports.createKategoriNilaiAkademik = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi, mapel_id } = req.body;
        const userId = req.user.id;
        const kelasId = getKelasId(req);

        if (mapel_id === undefined || mapel_id === null) {
            return res.status(400).json({ success: false, message: 'mapel_id wajib diisi' });
        }

        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})`
            });
        }

        const range = maxNilai - minNilai;
        if (range < 3) {
            return res.status(400).json({
                success: false,
                message: `Range nilai minimal 3 poin. Saat ini: ${range} poin (${minNilai}-${maxNilai})`
            });
        }

        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });
        }

        const overlaps = await model.cekOverlapAkademik(mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        const newId = await model.createKategoriAkademik(mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai, deskripsi.trim());

        res.json({
            success: true,
            message: 'Kategori akademik berhasil ditambahkan',
            id: newId
        });
    } catch (err) {
        console.error('Error createKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah kategori: ' + err.message });
    }
};

exports.updateKategoriNilaiAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, deskripsi } = req.body;
        const userId = req.user.id;
        const kelasId = getKelasId(req);

        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})`
            });
        }

        const range = maxNilai - minNilai;
        if (range < 3) {
            return res.status(400).json({
                success: false,
                message: `Range nilai minimal 3 poin. Saat ini: ${range} poin (${minNilai}-${maxNilai})`
            });
        }

        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
        }

        if (existing.min_nilai === minNilai && existing.max_nilai === maxNilai && existing.deskripsi.trim() === deskripsi.trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, existing.mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });
        }

        const overlaps = await model.cekOverlapAkademik(existing.mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai, id);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        await model.updateKategoriAkademik(id, minNilai, maxNilai, deskripsi.trim());

        res.json({ success: true, message: 'Kategori akademik berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

exports.deleteKategoriNilaiAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const kelasId = getKelasId(req);

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, existing.mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });
        }

        const dipakai = await model.cekKategoriDipakai(existing.mapel_id, taAktif.id_tahun_ajaran, kelasId, existing.min_nilai, existing.max_nilai);
        if (dipakai.total > 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak dapat menghapus. Ada ${dipakai.total} nilai siswa yang menggunakan range ${existing.min_nilai}-${existing.max_nilai}.`
            });
        }

        await model.deleteKategoriAkademik(id, kelasId);

        res.json({ success: true, message: 'Kategori akademik berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI KOKURIKULER (PER KELAS)
// ✅ DENGAN VALIDASI PERIODE: PTS → hanya Mutaba'ah, PAS → semua
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const kategori = await model.getKategoriKokurikuler(taAktif.id_tahun_ajaran, taAktif.semester, kelasId);

        const kategoriParsed = kategori.map(k => ({
            ...k,
            min_nilai: Math.floor(parseFloat(k.min_nilai)),
            max_nilai: Math.floor(parseFloat(k.max_nilai))
        }));

        const [aspekRows] = await db.execute(`
            SELECT id_aspek_kokurikuler, nama 
            FROM aspek_kokurikuler 
            ORDER BY urutan ASC
        `);

        const coverage = { covered: true, gaps: [] };

        for (const aspek of aspekRows) {
            const kategoriAspek = kategoriParsed
                .filter(k => k.id_aspek_kokurikuler === aspek.id_aspek_kokurikuler)
                .sort((a, b) => a.min_nilai - b.min_nilai);

            if (kategoriAspek.length === 0) {
                coverage.covered = false;
                coverage.gaps.push({
                    aspek: aspek.nama,
                    gap: '0-100 (belum ada kategori)'
                });
                continue;
            }

            if (kategoriAspek[0].min_nilai > 0) {
                coverage.covered = false;
                coverage.gaps.push({
                    aspek: aspek.nama,
                    gap: `0-${kategoriAspek[0].min_nilai - 1}`
                });
            }

            for (let i = 0; i < kategoriAspek.length - 1; i++) {
                const currentMax = kategoriAspek[i].max_nilai;
                const nextMin = kategoriAspek[i + 1].min_nilai;

                if (nextMin > currentMax + 1) {
                    coverage.covered = false;
                    coverage.gaps.push({
                        aspek: aspek.nama,
                        gap: `${currentMax + 1}-${nextMin - 1}`
                    });
                }
            }

            const lastMax = kategoriAspek[kategoriAspek.length - 1].max_nilai;
            if (lastMax < 100) {
                coverage.covered = false;
                coverage.gaps.push({
                    aspek: aspek.nama,
                    gap: `${lastMax + 1}-100`
                });
            }
        }

        res.json({
            success: true,
            data: kategoriParsed,
            coverage: coverage
        });
    } catch (err) {
        console.error('Error getKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori kokurikuler' });
    }
};

/**
 * ✅ CREATE Kategori Kokurikuler - DENGAN VALIDASI PERIODE
 */
exports.createKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { min_nilai, max_nilai, grade, deskripsi, id_aspek_kokurikuler } = req.body;
        const kelasId = getKelasId(req);

        if (!id_aspek_kokurikuler) {
            return res.status(400).json({ success: false, message: 'Aspek kokurikuler wajib dipilih' });
        }

        // ✅ VALIDASI PERIODE: Cek apakah aspek ini boleh dikelola
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const accessCheck = validateAspekKokurikulerAccess(
            id_aspek_kokurikuler,
            taAktif.status_pts,
            taAktif.status_pas
        );

        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'ASPEK_LOCKED',
                reason: accessCheck.reason,
                message: accessCheck.message
            });
        }

        // Validasi nilai
        const minNilai = parseFloat(min_nilai);
        const maxNilai = parseFloat(max_nilai);

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})`
            });
        }

        const range = maxNilai - minNilai;
        if (range < 3) {
            return res.status(400).json({
                success: false,
                message: `Range nilai minimal 3 poin. Saat ini: ${range} poin (${minNilai}-${maxNilai})`
            });
        }

        if (!grade || !grade.trim()) {
            return res.status(400).json({ success: false, message: 'Grade wajib diisi' });
        }

        const gradeClean = grade.trim().toUpperCase();
        if (gradeClean.length !== 1) {
            return res.status(400).json({ success: false, message: 'Grade harus 1 karakter (A, B, C, dst)' });
        }
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        // CEK DUPLIKAT
        const duplikat = await model.cekDuplikasiGrade(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, gradeClean);
        if (duplikat.length > 0) {
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_GRADE',
                message: `Grade "${gradeClean}" sudah ada untuk aspek ini di kelas Anda`
            });
        }

        // CEK OVERLAP
        const overlaps = await model.cekOverlapKokurikuler(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.grade} (${o.rentang_min}-${o.rentang_max})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan grade: ${overlapInfo}`
            });
        }

        // SIMPAN
        const newId = await model.createKategoriKokurikuler(
            id_aspek_kokurikuler,
            taAktif.id_tahun_ajaran,
            taAktif.semester,
            kelasId,
            minNilai,
            maxNilai,
            gradeClean,
            deskripsi.trim()
        );

        res.json({
            success: true,
            message: 'Kategori kokurikuler berhasil ditambahkan',
            id: newId
        });
    } catch (err) {
        console.error('Error createKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah kategori: ' + err.message });
    }
};

/**
 * ✅ UPDATE Kategori Kokurikuler - DENGAN VALIDASI PERIODE
 */
exports.updateKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, grade, deskripsi } = req.body;
        const kelasId = getKelasId(req);

        const minNilai = parseFloat(min_nilai);
        const maxNilai = parseFloat(max_nilai);

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})`
            });
        }

        const range = maxNilai - minNilai;
        if (range < 3) {
            return res.status(400).json({
                success: false,
                message: `Range nilai minimal 3 poin. Saat ini: ${range} poin (${minNilai}-${maxNilai})`
            });
        }

        if (!grade || !grade.trim()) {
            return res.status(400).json({ success: false, message: 'Grade wajib diisi' });
        }

        const gradeClean = grade.trim().toUpperCase();
        if (gradeClean.length !== 1) {
            return res.status(400).json({ success: false, message: 'Grade harus 1 karakter (A, B, C, dst)' });
        }
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // AMBIL existing
        const existing = await model.getKategoriKokurikulerByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
        }

        // ✅ VALIDASI PERIODE: Cek apakah aspek ini boleh dikelola
        const accessCheck = validateAspekKokurikulerAccess(
            existing.id_aspek_kokurikuler,
            taAktif.status_pts,
            taAktif.status_pas
        );

        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'ASPEK_LOCKED',
                reason: accessCheck.reason,
                message: accessCheck.message
            });
        }

        if (existing.rentang_min == minNilai && existing.rentang_max == maxNilai &&
            existing.grade === gradeClean && existing.deskripsi.trim() === deskripsi.trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const gradeValidation = await validateGradeOrder(
            existing.id_aspek_kokurikuler,
            taAktif.id_tahun_ajaran,
            taAktif.semester,
            kelasId,
            gradeClean,
            minNilai,
            maxNilai,
            id
        );

        if (!gradeValidation.valid) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_GRADE_ORDER',
                message: gradeValidation.message
            });
        }

        if (existing.grade !== gradeClean) {
            const duplikat = await model.cekDuplikasiGrade(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, gradeClean, id);
            if (duplikat.length > 0) {
                return res.status(400).json({
                    success: false,
                    code: 'DUPLICATE_GRADE',
                    message: `Grade "${gradeClean}" sudah ada untuk aspek ini di kelas Anda`
                });
            }
        }

        const overlaps = await model.cekOverlapKokurikuler(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, id);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.grade} (${o.rentang_min}-${o.rentang_max})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan grade: ${overlapInfo}`
            });
        }

        await model.updateKategoriKokurikuler(id, minNilai, maxNilai, gradeClean, deskripsi.trim());

        res.json({ success: true, message: 'Kategori kokurikuler berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

/**
 * ✅ DELETE Kategori Kokurikuler - DENGAN VALIDASI PERIODE
 */
exports.deleteKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const kelasId = getKelasId(req);

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriKokurikulerByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
        }

        // ✅ VALIDASI PERIODE: Cek apakah aspek ini boleh dikelola
        const accessCheck = validateAspekKokurikulerAccess(
            existing.id_aspek_kokurikuler,
            taAktif.status_pts,
            taAktif.status_pas
        );

        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'ASPEK_LOCKED',
                reason: accessCheck.reason,
                message: accessCheck.message
            });
        }

        const dipakai = await model.cekKategoriKokurikulerDipakai(id, kelasId);

        if (!dipakai.exists) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        if (dipakai.total > 0) {
            return res.status(400).json({
                success: false,
                code: 'CATEGORY_IN_USE',
                message: `Tidak dapat menghapus. Ada ${dipakai.total} nilai siswa yang menggunakan range ${existing.rentang_min}-${existing.rentang_max}.`,
                detail: 'Ubah nilai siswa terlebih dahulu, atau ubah range kategori lain.'
            });
        }

        await model.deleteKategoriKokurikuler(id, kelasId);

        res.json({ success: true, message: 'Kategori kokurikuler berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// BOBOT AKADEMIK (PER MAPEL + PER KELAS)
// ═════════════════════════════════════════════════════════════════════════════

exports.getBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user.id;
        const kelasId = getKelasId(req);

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapelId, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });
        }

        const komponenList = await model.getKomponenPenilaianList();
        if (komponenList.length === 0) {
            return res.status(404).json({ success: false, message: 'Komponen penilaian belum diatur' });
        }

        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));

        if (taAktif.status_pts === 'aktif') {
            const result = komponenList.map(k => ({
                komponen_id: k.id_komponen,
                bobot: k.id_komponen === ptsKomponen?.id_komponen ? 100 : 0,
                locked: true
            }));
            return res.json({ success: true, data: result, is_locked: true });
        }

        const bobot = await model.getBobotByMapel(mapelId, kelasId);

        const bobotMap = {};
        bobot.forEach(b => {
            bobotMap[b.komponen_id] = parseFloat(b.bobot) || 0;
        });

        const result = komponenList.map(k => ({
            komponen_id: k.id_komponen,
            bobot: bobotMap[k.id_komponen] || 0
        }));

        res.json({ success: true, data: result, is_locked: false });
    } catch (err) {
        console.error('Error getBobotAkademikByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil bobot: ' + err.message });
    }
};

exports.updateBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const bobotList = req.body;
        const userId = req.user.id;
        const kelasId = getKelasId(req);

        if (!Array.isArray(bobotList) || bobotList.length === 0) {
            return res.status(400).json({ success: false, message: 'Data bobot tidak valid' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        if (taAktif.status_pts === 'aktif') {
            return res.status(403).json({
                success: false,
                code: 'PERIOD_LOCKED',
                message: 'Bobot tidak dapat diubah saat periode PTS aktif. Nilai rapor otomatis = nilai PTS.'
            });
        }

        for (const b of bobotList) {
            if (!b.komponen_id || b.bobot === undefined) {
                return res.status(400).json({ success: false, message: 'Data bobot tidak lengkap' });
            }
            const numBobot = parseFloat(b.bobot);
            if (isNaN(numBobot)) {
                return res.status(400).json({ success: false, message: `Bobot komponen ID ${b.komponen_id} harus berupa angka` });
            }
            if (numBobot <= 0) {
                return res.status(400).json({ success: false, message: 'Bobot tidak boleh 0% atau negatif' });
            }
            if (numBobot > 100) {
                return res.status(400).json({ success: false, message: 'Bobot tidak boleh lebih dari 100' });
            }
        }

        const total = bobotList.reduce((sum, b) => sum + (parseFloat(b.bobot) || 0), 0);
        if (Math.abs(total - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                code: 'BOBOT_NOT_100',
                message: `Total bobot harus tepat 100%. Saat ini: ${total.toFixed(2)}%`
            });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapelId, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const komponenIds = bobotList.map(b => b.komponen_id);
        const komponenValid = await model.cekKomponenValid(komponenIds);
        if (!komponenValid) {
            return res.status(400).json({ success: false, message: 'Ada komponen yang tidak valid' });
        }

        await model.saveBobot(mapelId, kelasId, bobotList);

        let warning = '';
        try {
            await updateAllNilaiRaporForMapel(mapelId, userId, req);
        } catch (recalcErr) {
            console.error('⚠️ Error hitung ulang nilai rapor:', recalcErr);
            warning = ' Peringatan: Gagal menghitung ulang nilai rapor otomatis. Silakan input ulang nilai untuk memperbarui.';
        }

        res.json({ success: true, message: 'Bobot penilaian berhasil disimpan' + warning });
    } catch (err) {
        console.error('Error updateBobotAkademikByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan bobot: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI DESKRIPSI RATA-RATA (PER KELAS)
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'DESKRIPSI_LOCKED',
                message: accessCheck.message
            });
        }

        const kategori = await model.getKategoriDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId);

        const kategoriParsed = kategori.map(k => ({
            ...k,
            min_nilai: Math.floor(parseFloat(k.min_nilai)),
            max_nilai: Math.floor(parseFloat(k.max_nilai))
        }));

        const coverage = await model.cekCoverageDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId);

        res.json({
            success: true,
            data: kategoriParsed,
            coverage: coverage
        });
    } catch (err) {
        console.error('Error getKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori deskripsi rata-rata' });
    }
};

exports.createKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi } = req.body;
        const kelasId = getKelasId(req);

        // ✅ Ambil taAktif HANYA SEKALI di awal
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // ✅ Validasi akses (pakai taAktif yang sudah ada)
        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'DESKRIPSI_LOCKED',
                message: accessCheck.message
            });
        }

        // Validasi nilai
        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})`
            });
        }

        const range = maxNilai - minNilai;
        if (range < 3) {
            return res.status(400).json({
                success: false,
                message: `Range nilai minimal 3 poin. Saat ini: ${range} poin (${minNilai}-${maxNilai})`
            });
        }

        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        // ✅ CEK OVERLAP (pakai taAktif yang sudah ada)
        const overlaps = await model.cekOverlapDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.rentang_min}-${o.rentang_max})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        // ✅ SIMPAN (pakai taAktif yang sudah ada)
        const newId = await model.createKategoriDeskripsiRataRata(
            taAktif.id_tahun_ajaran,
            taAktif.semester,
            kelasId,
            minNilai,
            maxNilai,
            deskripsi.trim()
        );

        res.json({
            success: true,
            message: 'Kategori deskripsi rata-rata berhasil ditambahkan',
            id: newId
        });
    } catch (err) {
        console.error('Error createKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah kategori: ' + err.message });
    }
};

exports.updateKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, deskripsi } = req.body;
        const kelasId = getKelasId(req);

        // ✅ Ambil taAktif HANYA SEKALI di awal
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // ✅ Validasi akses (pakai taAktif yang sudah ada)
        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'DESKRIPSI_LOCKED',
                message: accessCheck.message
            });
        }

        // Validasi nilai
        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})`
            });
        }

        const range = maxNilai - minNilai;
        if (range < 3) {
            return res.status(400).json({
                success: false,
                message: `Range nilai minimal 3 poin. Saat ini: ${range} poin (${minNilai}-${maxNilai})`
            });
        }

        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        // ✅ Ambil existing (pakai taAktif yang sudah ada)
        const existing = await model.getKategoriDeskripsiRataRataByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
        }

        if (existing.rentang_min == minNilai && existing.rentang_max == maxNilai && existing.deskripsi.trim() === deskripsi.trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        // ✅ CEK OVERLAP (pakai taAktif yang sudah ada)
        const overlaps = await model.cekOverlapDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, id);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.rentang_min}-${o.rentang_max})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        // ✅ UPDATE (pakai taAktif yang sudah ada)
        await model.updateKategoriDeskripsiRataRata(id, minNilai, maxNilai, deskripsi.trim());

        res.json({ success: true, message: 'Kategori deskripsi rata-rata berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

exports.deleteKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const { id } = req.params;
        const kelasId = getKelasId(req);

        // ✅ Ambil taAktif HANYA SEKALI di awal
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // ✅ Validasi akses (pakai taAktif yang sudah ada)
        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) {
            return res.status(403).json({
                success: false,
                code: 'DESKRIPSI_LOCKED',
                message: accessCheck.message
            });
        }

        // ✅ Ambil existing (pakai taAktif yang sudah ada)
        const existing = await model.getKategoriDeskripsiRataRataByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
        }

        // ✅ DELETE
        await model.deleteKategoriDeskripsiRataRata(id, kelasId);

        res.json({ success: true, message: 'Kategori deskripsi rata-rata berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};