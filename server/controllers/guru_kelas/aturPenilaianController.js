/**
 * Nama File: aturPenilaianController.js
 * Fungsi: Handle logic & response untuk fitur Atur Penilaian
 *         UPDATE: Semua konfigurasi PER KELAS (bukan global)
 *         Menggunakan req.infoKelasWali.kelas_id dari middleware
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');
const { updateAllNilaiRaporForMapel, validateGradeOrder } = require('./helpers');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Ambil kelas_id dari request
// ═════════════════════════════════════════════════════════════════════════════
const getKelasId = (req) => req.infoKelasWali?.kelas_id;

// ═════════════════════════════════════════════════════════════════════════════
// DATA PENDUKUNG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /atur-penilaian/aspek-kokurikuler
 */
exports.getAspekKokurikuler = async (req, res) => {
    try {
        const aspek = await model.getAspekKokurikuler();
        res.json({ success: true, data: aspek });
    } catch (err) {
        console.error('Error getAspekKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil aspek kokurikuler' });
    }
};

/**
 * GET /atur-penilaian/komponen
 */
exports.getKomponenPenilaian = async (req, res) => {
    try {
        const komponen = await model.getKomponenPenilaian();
        res.json({ success: true, data: komponen });
    } catch (err) {
        console.error('Error getKomponenPenilaian:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil komponen penilaian' });
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
        const coverage = await model.cekCoverage0to100(mapelId, taAktif.id_tahun_ajaran, kelasId);

        res.json({
            success: true,
            data: kategori,
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

        // ✅ VALIDASI: Guru mengajar mapel ini DI KELASNYA
        const mengajarMapel = await model.cekGuruMengajarMapelDiKelas(userId, mapel_id, kelasId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas Anda' });
        }

        // ✅ CEK OVERLAP: Hanya di kelas ini
        const overlaps = await model.cekOverlapAkademik(mapel_id, taAktif.id_tahun_ajaran, kelasId, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        // ✅ SIMPAN dengan kelas_id
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

        // ✅ AMBIL data existing dengan filter kelas_id
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

        // ✅ AMBIL data existing dengan filter kelas_id
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
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const kelasId = getKelasId(req);
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // ✅ FILTER by kelas_id
        const kategori = await model.getKategoriKokurikuler(taAktif.id_tahun_ajaran, taAktif.semester, kelasId);

        // HITUNG COVERAGE PER ASPEK (untuk kelas ini)
        const [aspekRows] = await db.execute(`
            SELECT id_aspek_kokurikuler, nama 
            FROM aspek_kokurikuler 
            ORDER BY urutan ASC
        `);

        const coverage = { covered: true, gaps: [] };

        for (const aspek of aspekRows) {
            const kategoriAspek = kategori
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
            data: kategori,
            coverage: coverage
        });
    } catch (err) {
        console.error('Error getKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori kokurikuler' });
    }
};

exports.createKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { min_nilai, max_nilai, grade, deskripsi, id_aspek_kokurikuler } = req.body;
        const kelasId = getKelasId(req);

        if (!id_aspek_kokurikuler) {
            return res.status(400).json({ success: false, message: 'Aspek kokurikuler wajib dipilih' });
        }

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

        // ✅ CEK DUPLIKAT: Hanya di kelas ini
        const duplikat = await model.cekDuplikasiGrade(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, gradeClean);
        if (duplikat.length > 0) {
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_GRADE',
                message: `Grade "${gradeClean}" sudah ada untuk aspek ini di kelas Anda`
            });
        }

        // ✅ CEK OVERLAP: Hanya di kelas ini
        const overlaps = await model.cekOverlapKokurikuler(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, kelasId, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.grade} (${o.rentang_min}-${o.rentang_max})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan grade: ${overlapInfo}`
            });
        }

        // ✅ SIMPAN dengan kelas_id
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

        // ✅ AMBIL existing dengan filter kelas_id
        const existing = await model.getKategoriKokurikulerByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
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

exports.deleteKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const kelasId = getKelasId(req);

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // ✅ AMBIL existing dengan filter kelas_id
        const existing = await model.getKategoriKokurikulerByIdAndKelas(id, kelasId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan di kelas Anda' });
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

        // ✅ CEK: Guru mengajar mapel ini DI KELASNYA
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

        // ✅ FILTER by kelas_id
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