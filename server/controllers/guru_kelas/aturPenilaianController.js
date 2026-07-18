/**
 * Nama File: aturPenilaianController.js
 * Fungsi: Controller konfigurasi penilaian guru kelas (akademik, kokurikuler, bobot)
 *         Menangani CRUD kategori akademik, kokurikuler, deskripsi rata-rata, dan bobot
 *         Dengan auto-recompute nilai rapor/kokurikuler/deskripsi setelah perubahan
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 * Update: 14 Juli 2026 - Fix null safety pada perbandingan string, strict float comparison, & fleksibilitas hapus data
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');
const {
    updateAllNilaiRaporForMapel,
    validateGradeOrder,
    recomputeNilaiRaporForKelas,
    recomputeNilaiKokurikulerForKelas,
    recomputeDeskripsiRataRataForKelas
} = require('./helpers');

// ═════════════════════════════════════════════════════════════════════════════
// KONSTANTA
// ═════════════════════════════════════════════════════════════════════════════

// ID Aspek Mutaba'ah
const ASPEK_MUTABAAH_ID = 5;

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Ambil jenis penilaian aktif
const getJenisPenilaian = (req) => {
    return req.jenis_penilaian || req.query?.jenis || req.body?.jenis || 'PTS';
};

// Validasi akses aspek kokurikuler
const validateAspekKokurikulerAccess = (aspekId, status_pts, status_pas) => {
    const isPtsActive = status_pts === 'aktif';
    const isPasActive = status_pas === 'aktif';

    if (!isPtsActive && !isPasActive) {
        return { allowed: false, reason: 'not_open', message: 'Periode penilaian belum aktif. Silakan tunggu admin membuka periode penilaian.' };
    }
    if (isPtsActive && aspekId !== ASPEK_MUTABAAH_ID) {
        return { allowed: false, reason: 'locked_pts', message: `Saat periode PTS aktif, hanya aspek Mutaba'ah Yaumiyah yang dapat dikelola kategorinya. Aspek lain akan dibuka saat periode PAS.` };
    }
    if (isPasActive) return { allowed: true, reason: 'pas_active' };

    return { allowed: true, reason: 'default' };
};

// Validasi akses deskripsi rata-rata
const validateDeskripsiRataRataAccess = (status_pts, status_pas) => {
    if (status_pts === 'aktif') return { allowed: true };
    if (status_pas === 'aktif') {
        return { allowed: false, message: 'Deskripsi rata-rata hanya dapat diatur saat periode PTS aktif. Saat ini periode PAS sedang aktif.' };
    }
    return { allowed: false, message: 'Periode penilaian belum aktif. Deskripsi rata-rata hanya dapat diatur saat periode PTS aktif.' };
};

// Ambil kelas_id dari request
const getKelasId = (req) => req.infoKelasWali?.kelas_id;

// ═════════════════════════════════════════════════════════════════════════════
// 1. DATA PENDUKUNG
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
            return res.status(400).json({ success: false, message: 'Nama aspek minimal 3 karakter.' });
        }

        let kodeAspek = kode;
        if (!kodeAspek) {
            kodeAspek = nama.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);
            const [existing] = await db.execute('SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE kode = ?', [kodeAspek]);
            if (existing.length > 0) {
                kodeAspek = `${kodeAspek}_${Date.now().toString().slice(-4)}`;
            }
        }

        const [existingNama] = await db.execute('SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE nama = ?', [nama.trim()]);
        if (existingNama.length > 0) {
            return res.status(400).json({ success: false, message: 'Aspek dengan nama ini sudah ada.' });
        }

        const [existingKode] = await db.execute('SELECT id_aspek_kokurikuler FROM aspek_kokurikuler WHERE kode = ?', [kodeAspek]);
        if (existingKode.length > 0) {
            return res.status(400).json({ success: false, message: 'Kode aspek sudah digunakan. Silakan gunakan nama atau kode lain.' });
        }

        const [maxUrutan] = await db.execute('SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan FROM aspek_kokurikuler');
        const nextUrutan = maxUrutan[0].next_urutan;

        const [result] = await db.execute(
            'INSERT INTO aspek_kokurikuler (kode, nama, urutan, created_at) VALUES (?, ?, ?, NOW())',
            [kodeAspek, nama.trim(), nextUrutan]
        );

        res.status(201).json({
            success: true,
            message: 'Aspek kokurikuler berhasil dibuat.',
            data: { id_aspek_kokurikuler: result.insertId, kode: kodeAspek, nama: nama.trim(), urutan: nextUrutan },
        });
    } catch (err) {
        console.error('Error createAspekKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal membuat aspek kokurikuler: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. KATEGORI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiAkademik = async (req, res) => {
    try {
        const mapelId = req.query?.mapel_id || req.query?.mapelId || null;
        let kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);
        const taAktif = await model.getTahunAjaranAktif();

        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        if (!kelasId) {
            const [rows] = await db.execute(
                `SELECT gk.kelas_id, k.nama_kelas FROM guru_kelas gk JOIN kelas k ON gk.kelas_id = k.id_kelas JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ? LIMIT 1`,
                [req.user.id, taAktif.id_tahun_ajaran_induk]
            );
            if (rows.length > 0) {
                kelasId = rows[0].kelas_id;
                req.infoKelasWali = { kelas_id: kelasId, nama_kelas: rows[0].nama_kelas };
            } else {
                return res.status(403).json({ success: false, message: 'Anda belum ditugaskan sebagai guru kelas.' });
            }
        }

        let kategori, coverage;
        if (!mapelId) {
            const [allKategori] = await db.execute(
                `SELECT id_config AS id, mapel_id, min_nilai, max_nilai, deskripsi, urutan FROM konfigurasi_nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ? ORDER BY mapel_id, urutan ASC, min_nilai ASC`,
                [taAktif.id_tahun_ajaran, kelasId, jenis]
            );
            kategori = allKategori;
            coverage = { covered: false, gaps: ['Pilih mapel terlebih dahulu'] };
        } else {
            kategori = await model.getKategoriAkademik(mapelId, taAktif.id_tahun_ajaran, kelasId, jenis);
            coverage = await model.cekCoverage0to100(mapelId, taAktif.id_tahun_ajaran, kelasId, jenis);
        }

        const kategoriParsed = kategori.map((k) => ({
            ...k,
            min_nilai: Math.floor(parseFloat(k.min_nilai)),
            max_nilai: Math.floor(parseFloat(k.max_nilai)),
        }));

        res.json({ success: true, data: kategoriParsed, coverage, jenis_penilaian: jenis, mapel_id: mapelId });
    } catch (err) {
        console.error('Error getKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori akademik: ' + err.message });
    }
};

exports.createKategoriNilaiAkademik = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi, mapel_id } = req.body;
        const userId = req.user.id;
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);

        if (mapel_id === undefined || mapel_id === null) {
            return res.status(400).json({ success: false, message: 'mapel_id wajib diisi' });
        }

        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})` });
        if (maxNilai - minNilai < 3) return res.status(400).json({ success: false, message: `Range nilai minimal 3 poin. Saat ini: ${maxNilai - minNilai} poin` });
        if (!deskripsi || deskripsi.trim().length < 3) return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });

        const overlaps = await model.cekOverlapAkademik(mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai, jenis);
        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false, code: 'RANGE_OVERLAP',
                message: `Range ${minNilai}-${maxNilai} sudah digunakan oleh kategori "${overlaps[0].deskripsi}". Silakan gunakan range lain.`,
            });
        }

        const newId = await model.createKategoriAkademik(mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai, deskripsi.trim(), jenis);
        res.json({ success: true, message: `Kategori akademik untuk ${jenis} berhasil ditambahkan`, id: newId });
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
        const jenis = getJenisPenilaian(req);

        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));
        const newDeskripsi = (deskripsi || '').trim();

        if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})` });
        if (maxNilai - minNilai < 3) return res.status(400).json({ success: false, message: `Range nilai minimal 3 poin.` });
        if (!deskripsi || newDeskripsi.length < 3) return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const existing = await model.getKategoriByIdAndKelas(id, kelasId);
        if (!existing) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });

        if (existing.jenis_penilaian && existing.jenis_penilaian !== jenis) {
            return res.status(403).json({ success: false, message: `Kategori ini milik periode ${existing.jenis_penilaian}, bukan ${jenis}` });
        }

        // ✅ PERBAIKAN: Normalisasi aman untuk mencegah false positive "Tidak ada perubahan"
        const existingMin = Math.floor(parseFloat(existing.min_nilai));
        const existingMax = Math.floor(parseFloat(existing.max_nilai));
        const existingDeskripsi = (existing.deskripsi || '').trim();

        if (existingMin === minNilai && existingMax === maxNilai && existingDeskripsi === newDeskripsi) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, existing.mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });

        const overlaps = await model.cekOverlapAkademik(existing.mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai, jenis, parseInt(id, 10));
        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false, code: 'RANGE_OVERLAP',
                message: `Range ${minNilai}-${maxNilai} sudah digunakan oleh kategori "${overlaps[0].deskripsi}".`,
            });
        }

        await model.updateKategoriAkademik(id, minNilai, maxNilai, newDeskripsi);

        let warning = '';
        try {
            await recomputeNilaiRaporForKelas(existing.mapel_id, kelasId, userId, req);
            warning = ' Nilai rapor siswa telah dihitung ulang otomatis.';
        } catch (recalcErr) {
            console.warn('Warning: Gagal recompute setelah update kategori:', recalcErr.message);
        }

        res.json({ success: true, message: `Kategori akademik ${jenis} berhasil diperbarui.${warning}` });
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
        const jenis = getJenisPenilaian(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const existing = await model.getKategoriByIdAndKelas(id, kelasId);
        if (!existing) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });

        if (existing.jenis_penilaian && existing.jenis_penilaian !== jenis) {
            return res.status(403).json({ success: false, message: `Kategori ini milik periode ${existing.jenis_penilaian}, bukan ${jenis}` });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, existing.mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });

        // ✅ FLEKSIBEL: Hapus validasi cekKategoriDipakai. Guru boleh menghapus kapan saja.
        await model.deleteKategoriAkademik(id, kelasId);

        try {
            await recomputeNilaiRaporForKelas(existing.mapel_id, kelasId, userId, req);
        } catch (recalcErr) {
            console.warn('Warning: Gagal recompute setelah delete kategori:', recalcErr.message);
        }

        res.json({ success: true, message: `Kategori akademik ${jenis} berhasil dihapus` });
    } catch (err) {
        console.error('Error deleteKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. KATEGORI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const kategori = await model.getKategoriKokurikuler(taAktif.id_tahun_ajaran, taAktif.semester, kelasId, jenis);
        const kategoriParsed = kategori.map((k) => ({
            ...k,
            min_nilai: Math.floor(parseFloat(k.min_nilai)),
            max_nilai: Math.floor(parseFloat(k.max_nilai)),
        }));

        const [aspekRows] = await db.execute('SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler ORDER BY urutan ASC');
        const coverage = { covered: true, gaps: [] };
        const relevantAspek = jenis === 'PTS' ? aspekRows.filter((a) => a.id_aspek_kokurikuler === ASPEK_MUTABAAH_ID) : aspekRows;

        for (const aspek of relevantAspek) {
            const kategoriAspek = kategoriParsed.filter((k) => k.id_aspek_kokurikuler === aspek.id_aspek_kokurikuler).sort((a, b) => a.min_nilai - b.min_nilai);
            if (kategoriAspek.length === 0) {
                coverage.covered = false;
                coverage.gaps.push({ aspek: aspek.nama, gap: '0-100 (belum ada kategori)' });
                continue;
            }
            if (kategoriAspek[0].min_nilai > 0) coverage.gaps.push({ aspek: aspek.nama, gap: `0-${kategoriAspek[0].min_nilai - 1}` });
            for (let i = 0; i < kategoriAspek.length - 1; i++) {
                if (kategoriAspek[i + 1].min_nilai > kategoriAspek[i].max_nilai + 1) {
                    coverage.gaps.push({ aspek: aspek.nama, gap: `${kategoriAspek[i].max_nilai + 1}-${kategoriAspek[i + 1].min_nilai - 1}` });
                }
            }
            if (kategoriAspek[kategoriAspek.length - 1].max_nilai < 100) {
                coverage.gaps.push({ aspek: aspek.nama, gap: `${kategoriAspek[kategoriAspek.length - 1].max_nilai + 1}-100` });
            }
        }

        res.json({ success: true, data: kategoriParsed, coverage, jenis_penilaian: jenis, status_pts: taAktif.status_pts, status_pas: taAktif.status_pas });
    } catch (err) {
        console.error('Error getKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori kokurikuler' });
    }
};

exports.createKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { min_nilai, max_nilai, grade, deskripsi, id_aspek_kokurikuler } = req.body;
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);

        if (!id_aspek_kokurikuler) return res.status(400).json({ success: false, message: 'Aspek kokurikuler wajib dipilih' });

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const accessCheck = validateAspekKokurikulerAccess(id_aspek_kokurikuler, taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) {
            return res.status(403).json({ success: false, code: 'ASPEK_LOCKED', reason: accessCheck.reason, message: accessCheck.message });
        }

        const minNilai = parseFloat(min_nilai);
        const maxNilai = parseFloat(max_nilai);
        if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})` });
        if (maxNilai - minNilai < 3) return res.status(400).json({ success: false, message: `Range nilai minimal 3 poin.` });

        const gradeClean = (grade || '').trim().toUpperCase();
        if (gradeClean.length !== 1) return res.status(400).json({ success: false, message: 'Grade harus 1 karakter (A, B, C, dst)' });
        if (!deskripsi || deskripsi.trim().length < 3) return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });

        const duplikat = await model.cekDuplikasiGrade(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, gradeClean, jenis);
        if (duplikat.length > 0) return res.status(400).json({ success: false, code: 'DUPLICATE_GRADE', message: `Grade "${gradeClean}" sudah ada.` });

        const overlaps = await model.cekOverlapKokurikuler(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, jenis);
        if (overlaps.length > 0) {
            return res.status(400).json({ success: false, code: 'RANGE_OVERLAP', message: `Range sudah digunakan oleh grade "${overlaps[0].grade}".` });
        }

        const newId = await model.createKategoriKokurikuler(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, gradeClean, deskripsi.trim(), jenis);
        res.json({ success: true, message: `Kategori kokurikuler untuk ${jenis} berhasil ditambahkan`, id: newId });
    } catch (err) {
        console.error('Error createKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah kategori: ' + err.message });
    }
};

exports.updateKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, grade, deskripsi } = req.body;
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);
        const userId = req.user.id;

        const minNilai = parseFloat(min_nilai);
        const maxNilai = parseFloat(max_nilai);
        if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Nilai minimum harus lebih kecil dari nilai maksimum` });
        if (maxNilai - minNilai < 3) return res.status(400).json({ success: false, message: `Range nilai minimal 3 poin.` });

        const gradeClean = (grade || '').trim().toUpperCase();
        if (gradeClean.length !== 1) return res.status(400).json({ success: false, message: 'Grade harus 1 karakter' });
        if (!deskripsi || deskripsi.trim().length < 3) return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const existing = await model.getKategoriKokurikulerByIdAndKelas(id, kelasId);
        if (!existing) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });

        if (existing.jenis_penilaian && existing.jenis_penilaian !== jenis) {
            return res.status(403).json({ success: false, message: `Kategori ini milik periode ${existing.jenis_penilaian}, bukan ${jenis}` });
        }

        const accessCheck = validateAspekKokurikulerAccess(existing.id_aspek_kokurikuler, taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) {
            return res.status(403).json({ success: false, code: 'ASPEK_LOCKED', reason: accessCheck.reason, message: accessCheck.message });
        }

        // ✅ PERBAIKAN: Null safety pada perbandingan string dan strict float comparison
        if (
            parseFloat(existing.rentang_min) === minNilai &&
            parseFloat(existing.rentang_max) === maxNilai &&
            existing.grade === gradeClean &&
            (existing.deskripsi || '').trim() === (deskripsi || '').trim()
        ) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const gradeValidation = await validateGradeOrder(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, gradeClean, minNilai, maxNilai, parseInt(id, 10));
        if (!gradeValidation.valid) {
            return res.status(400).json({ success: false, code: 'INVALID_GRADE_ORDER', message: gradeValidation.message });
        }

        if (existing.grade !== gradeClean) {
            const duplikat = await model.cekDuplikasiGrade(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, gradeClean, jenis, parseInt(id, 10));
            if (duplikat.length > 0) return res.status(400).json({ success: false, code: 'DUPLICATE_GRADE', message: `Grade "${gradeClean}" sudah ada.` });
        }

        const overlaps = await model.cekOverlapKokurikuler(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, jenis, parseInt(id, 10));
        if (overlaps.length > 0) {
            return res.status(400).json({ success: false, code: 'RANGE_OVERLAP', message: `Range sudah digunakan oleh grade "${overlaps[0].grade}".` });
        }

        await model.updateKategoriKokurikuler(id, minNilai, maxNilai, gradeClean, (deskripsi || '').trim());

        let warning = '';
        try {
            await recomputeNilaiKokurikulerForKelas(existing.id_aspek_kokurikuler, kelasId, userId, req);
            warning = ' Grade & deskripsi nilai kokurikuler siswa telah diperbarui otomatis.';
        } catch (recalcErr) {
            console.warn('Warning: Gagal recompute setelah update kategori kokurikuler:', recalcErr.message);
        }

        res.json({ success: true, message: `Kategori kokurikuler ${jenis} berhasil diperbarui.${warning}` });
    } catch (err) {
        console.error('Error updateKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

exports.deleteKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const existing = await model.getKategoriKokurikulerByIdAndKelas(id, kelasId);
        if (!existing) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });

        if (existing.jenis_penilaian && existing.jenis_penilaian !== jenis) {
            return res.status(403).json({ success: false, message: `Kategori ini milik periode ${existing.jenis_penilaian}, bukan ${jenis}` });
        }

        const accessCheck = validateAspekKokurikulerAccess(existing.id_aspek_kokurikuler, taAktif.status_pts, taAktif.status_pas, jenis);
        if (!accessCheck.allowed) {
            return res.status(403).json({ success: false, code: 'ASPEK_LOCKED', reason: accessCheck.reason, message: accessCheck.message });
        }

        // ✅ FLEKSIBEL: Hapus validasi cekKategoriKokurikulerDipakai.
        await model.deleteKategoriKokurikuler(id, kelasId);

        try {
            await recomputeNilaiKokurikulerForKelas(existing.id_aspek_kokurikuler, kelasId, req.user.id, req);
        } catch (recalcErr) {
            console.warn('Warning: Gagal recompute setelah delete kategori kokurikuler:', recalcErr.message);
        }

        res.json({ success: true, message: `Kategori kokurikuler ${jenis} berhasil dihapus` });
    } catch (err) {
        console.error('Error deleteKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. BOBOT AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

exports.getBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user.id;
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(500).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapelId, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });

        const komponenList = await model.getKomponenPenilaianList();
        if (komponenList.length === 0) return res.status(404).json({ success: false, message: 'Komponen penilaian belum diatur' });

        const ptsKomponen = komponenList.find((k) => /^PTS$/i.test(k.nama_komponen));

        if (taAktif.status_pts === 'aktif') {
            const result = komponenList.map((k) => ({
                komponen_id: k.id_komponen,
                bobot: k.id_komponen === ptsKomponen?.id_komponen ? 100 : 0,
                locked: true,
            }));
            return res.json({ success: true, data: result, is_locked: true, jenis_penilaian: 'PTS' });
        }

        const bobot = await model.getBobotByMapel(mapelId, kelasId, jenis);
        const bobotMap = {};
        bobot.forEach((b) => { bobotMap[b.komponen_id] = parseFloat(b.bobot) || 0; });
        
        res.json({ success: true, data: komponenList.map((k) => ({ komponen_id: k.id_komponen, bobot: bobotMap[k.id_komponen] || 0 })), is_locked: false, jenis_penilaian: jenis });
    } catch (err) {
        console.error('Error getBobotAkademikByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil bobot: ' + err.message });
    }
};

exports.updateBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const bobotList = req.body.bobot || req.body;
        const userId = req.user.id;
        const kelasId = getKelasId(req);
        const jenis = getJenisPenilaian(req);

        if (!Array.isArray(bobotList) || bobotList.length === 0) return res.status(400).json({ success: false, message: 'Data bobot tidak valid' });

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(500).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        if (taAktif.status_pts === 'aktif') {
            return res.status(403).json({ success: false, code: 'PERIOD_LOCKED', message: 'Bobot tidak dapat diubah saat periode PTS aktif.' });
        }

        for (const b of bobotList) {
            if (!b.komponen_id || b.bobot === undefined) return res.status(400).json({ success: false, message: 'Data bobot tidak lengkap' });
            const numBobot = parseFloat(b.bobot);
            if (isNaN(numBobot)) return res.status(400).json({ success: false, message: `Bobot komponen ID ${b.komponen_id} harus berupa angka` });
            if (numBobot < 0) return res.status(400).json({ success: false, message: 'Bobot tidak boleh negatif' });
            if (numBobot > 100) return res.status(400).json({ success: false, message: 'Bobot tidak boleh lebih dari 100' });
        }

        const hasNonZeroBobot = bobotList.some(b => parseFloat(b.bobot) > 0);
        if (!hasNonZeroBobot) return res.status(400).json({ success: false, message: 'Minimal harus ada 1 komponen dengan bobot > 0%' });

        const total = bobotList.reduce((sum, b) => sum + (parseFloat(b.bobot) || 0), 0);
        if (Math.abs(total - 100) > 0.01) {
            return res.status(400).json({ success: false, code: 'BOBOT_NOT_100', message: `Total bobot harus tepat 100%. Saat ini: ${total.toFixed(2)}%` });
        }

        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapelId, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) return res.status(403).json({ success: false, message: 'Akses ditolak' });

        const komponenIds = bobotList.map((b) => b.komponen_id);
        if (!await model.cekKomponenValid(komponenIds)) return res.status(400).json({ success: false, message: 'Ada komponen yang tidak valid' });

        await model.saveBobot(mapelId, kelasId, taAktif.id_tahun_ajaran, bobotList, jenis);

        let warning = '';
        try {
            await updateAllNilaiRaporForMapel(mapelId, userId, req);
            warning = ' Nilai rapor siswa telah dihitung ulang otomatis.';
        } catch (recalcErr) {
            console.error('Error hitung ulang nilai rapor:', recalcErr);
            warning = ' Peringatan: Gagal menghitung ulang nilai rapor otomatis.';
        }

        res.json({ success: true, message: `Bobot penilaian ${jenis} berhasil disimpan.${warning}` });
    } catch (err) {
        console.error('Error updateBobotAkademikByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan bobot: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. KATEGORI DESKRIPSI RATA-RATA
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) return res.status(403).json({ success: false, code: 'DESKRIPSI_LOCKED', message: accessCheck.message });

        const kategori = await model.getKategoriDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId);
        const kategoriParsed = kategori.map((k) => ({
            ...k,
            min_nilai: parseFloat(parseFloat(k.min_nilai).toFixed(2)),
            max_nilai: parseFloat(parseFloat(k.max_nilai).toFixed(2)),
        }));

        const coverage = await model.cekCoverageDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId);
        res.json({ success: true, data: kategoriParsed, coverage, jenis_penilaian: 'PTS' });
    } catch (err) {
        console.error('Error getKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori deskripsi rata-rata' });
    }
};

exports.createKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi } = req.body;
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) return res.status(403).json({ success: false, code: 'DESKRIPSI_LOCKED', message: accessCheck.message });

        const minNilai = parseFloat(parseFloat(min_nilai).toFixed(2));
        const maxNilai = parseFloat(parseFloat(max_nilai).toFixed(2));

        if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Nilai minimum harus lebih kecil dari nilai maksimum` });
        if (maxNilai - minNilai < 0.01) return res.status(400).json({ success: false, message: `Range nilai minimal 0.01` });
        if (!deskripsi || deskripsi.trim().length < 3) return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });

        const overlaps = await model.cekOverlapDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai);
        if (overlaps.length > 0) {
            return res.status(400).json({ success: false, code: 'RANGE_OVERLAP', message: `Range sudah digunakan oleh kategori "${overlaps[0].deskripsi}".` });
        }

        const newId = await model.createKategoriDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, deskripsi.trim());
        res.json({ success: true, message: 'Kategori deskripsi rata-rata berhasil ditambahkan', id: newId });
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
        const userId = req.user.id;
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) return res.status(403).json({ success: false, code: 'DESKRIPSI_LOCKED', message: accessCheck.message });

        const minNilai = parseFloat(parseFloat(min_nilai).toFixed(2));
        const maxNilai = parseFloat(parseFloat(max_nilai).toFixed(2));

        if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: 'Nilai min dan max harus berupa angka' });
        if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Nilai minimum harus lebih kecil dari nilai maksimum` });
        if (maxNilai - minNilai < 0.01) return res.status(400).json({ success: false, message: `Range nilai minimal 0.01` });
        if (!deskripsi || deskripsi.trim().length < 3) return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });

        const existing = await model.getKategoriDeskripsiRataRataByIdAndKelas(id, kelasId);
        if (!existing) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });

        // ✅ PERBAIKAN: Null safety pada perbandingan string
        const existingMin = parseFloat(parseFloat(existing.rentang_min).toFixed(2));
        const existingMax = parseFloat(parseFloat(existing.rentang_max).toFixed(2));
        if (existingMin === minNilai && existingMax === maxNilai && (existing.deskripsi || '').trim() === (deskripsi || '').trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const overlaps = await model.cekOverlapDeskripsiRataRata(taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai, parseInt(id, 10));
        if (overlaps.length > 0) {
            return res.status(400).json({ success: false, code: 'RANGE_OVERLAP', message: `Range sudah digunakan oleh kategori "${overlaps[0].deskripsi}".` });
        }

        await model.updateKategoriDeskripsiRataRata(id, minNilai, maxNilai, (deskripsi || '').trim());

        let warning = '';
        try {
            await recomputeDeskripsiRataRataForKelas(kelasId, userId, req);
            warning = ' Deskripsi rata-rata siswa telah diperbarui otomatis.';
        } catch (recalcErr) {
            console.warn('Warning: Gagal recompute deskripsi rata-rata:', recalcErr.message);
        }

        res.json({ success: true, message: `Kategori deskripsi rata-rata berhasil diperbarui.${warning}` });
    } catch (err) {
        console.error('Error updateKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

exports.deleteKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const { id } = req.params;
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) return res.status(403).json({ success: false, code: 'DESKRIPSI_LOCKED', message: accessCheck.message });

        const existing = await model.getKategoriDeskripsiRataRataByIdAndKelas(id, kelasId);
        if (!existing) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });

        await model.deleteKategoriDeskripsiRataRata(id, kelasId);
        res.json({ success: true, message: 'Kategori deskripsi rata-rata berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

exports.saveBatchKategoriDeskripsiRataRata = async (req, res) => {
    try {
        const { categories } = req.body;
        const kelasId = getKelasId(req);
        const userId = req.user.id;

        if (!Array.isArray(categories) || categories.length === 0) return res.status(400).json({ success: false, message: 'Data kategori tidak valid' });

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });

        const accessCheck = validateDeskripsiRataRataAccess(taAktif.status_pts, taAktif.status_pas);
        if (!accessCheck.allowed) return res.status(403).json({ success: false, code: 'DESKRIPSI_LOCKED', message: accessCheck.message });

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const minNilai = parseFloat(parseFloat(cat.min_nilai).toFixed(2));
            const maxNilai = parseFloat(parseFloat(cat.max_nilai).toFixed(2));
            if (isNaN(minNilai) || isNaN(maxNilai)) return res.status(400).json({ success: false, message: `Kategori ${i + 1}: Nilai harus angka` });
            if (minNilai < 0 || maxNilai > 100) return res.status(400).json({ success: false, message: `Kategori ${i + 1}: Nilai harus 0-100` });
            if (minNilai >= maxNilai) return res.status(400).json({ success: false, message: `Kategori ${i + 1}: Min harus < Max` });
            if (!cat.deskripsi || cat.deskripsi.trim().length < 3) return res.status(400).json({ success: false, message: `Kategori ${i + 1}: Deskripsi minimal 3 karakter` });
        }

        for (let i = 0; i < categories.length; i++) {
            for (let j = i + 1; j < categories.length; j++) {
                if (parseFloat(categories[i].min_nilai) <= parseFloat(categories[j].max_nilai) && parseFloat(categories[i].max_nilai) >= parseFloat(categories[j].min_nilai)) {
                    return res.status(400).json({ success: false, code: 'RANGE_OVERLAP', message: `Overlap antar kategori dalam batch.` });
                }
            }
        }

        await model.saveBatchKategoriDeskripsiRataRata(
            taAktif.id_tahun_ajaran, taAktif.semester, kelasId,
            categories.map((cat) => ({
                min_nilai: parseFloat(parseFloat(cat.min_nilai).toFixed(2)),
                max_nilai: parseFloat(parseFloat(cat.max_nilai).toFixed(2)),
                deskripsi: cat.deskripsi.trim(),
            }))
        );

        let warning = '';
        try {
            await recomputeDeskripsiRataRataForKelas(kelasId, userId, req);
            warning = ' Deskripsi rata-rata siswa telah diperbarui otomatis.';
        } catch (recalcErr) {
            console.warn('Warning: Gagal recompute deskripsi rata-rata:', recalcErr.message);
        }

        res.json({ success: true, message: `${categories.length} kategori deskripsi rata-rata berhasil disimpan.${warning}` });
    } catch (err) {
        console.error('Error saveBatchKategoriDeskripsiRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan: ' + err.message });
    }
};

// Export untuk keperluan unit testing
exports._validateAspekKokurikulerAccess = validateAspekKokurikulerAccess;
exports._validateDeskripsiRataRataAccess = validateDeskripsiRataRataAccess;
exports._getJenisPenilaian = getJenisPenilaian;
exports._getKelasId = getKelasId;