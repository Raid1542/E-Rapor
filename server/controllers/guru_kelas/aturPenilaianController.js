/**
 * Nama File: aturPenilaianController.js
 * Fungsi: Handle logic & response untuk fitur Atur Penilaian
 *         Menggunakan model untuk query database
 */

const db = require('../../config/db');
const model = require('../../models/guru_kelas/aturPenilaianModel');

// ═════════════════════════════════════════════════════════════════════════════
// DATA PENDUKUNG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /mapel
 * Ambil daftar mata pelajaran untuk guru kelas
 */
exports.getMapelForGuruKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterAktifId = req.idSemesterAktif;

        if (!semesterAktifId) {
            return res.status(400).json({
                success: false,
                message: 'Semester aktif tidak ditemukan'
            });
        }

        const [rows] = await db.execute(`
            SELECT 
                mp.id_mata_pelajaran,
                mp.nama_mapel,
                mp.jenis
            FROM pembelajaran p
            INNER JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
            WHERE p.user_id = ?
              AND p.tahun_ajaran_id = ?
            ORDER BY mp.jenis, mp.nama_mapel
        `, [userId, semesterAktifId]);

        const wajib = rows.filter(r => r.jenis === 'wajib');
        const pilihan = rows.filter(r => r.jenis === 'pilihan');

        res.json({
            success: true,
            data: {
                wajib,
                pilihan
            }
        });
    } catch (err) {
        console.error('Error getMapelForGuruKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar mata pelajaran: ' + err.message
        });
    }
};

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
// KATEGORI AKADEMIK (PER MAPEL)
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiAkademik = async (req, res) => {
    try {
        const mapelId = req.validatedMapelId;
        const taAktif = await model.getTahunAjaranAktif();

        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const kategori = await model.getKategoriAkademik(mapelId, taAktif.id_tahun_ajaran);
        const coverage = await model.cekCoverage0to100(mapelId, taAktif.id_tahun_ajaran);

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
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapel(userId, mapel_id, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
        }

        const overlaps = await model.cekOverlapAkademik(mapel_id, taAktif.id_tahun_ajaran, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        const newId = await model.createKategoriAkademik(mapel_id, taAktif.id_tahun_ajaran, minNilai, maxNilai, deskripsi.trim());

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
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        if (existing.min_nilai === minNilai && existing.max_nilai === maxNilai && existing.deskripsi.trim() === deskripsi.trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapel(userId, existing.mapel_id, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
        }

        const overlaps = await model.cekOverlapAkademik(existing.mapel_id, taAktif.id_tahun_ajaran, minNilai, maxNilai, id);
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

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapel(userId, existing.mapel_id, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
        }

        const dipakai = await model.cekKategoriDipakai(existing.mapel_id, taAktif.id_tahun_ajaran, existing.min_nilai, existing.max_nilai);
        if (dipakai.total > 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak dapat menghapus. Ada ${dipakai.total} nilai siswa yang menggunakan range ${existing.min_nilai}-${existing.max_nilai}.`
            });
        }

        await model.deleteKategoriAkademik(id);

        res.json({ success: true, message: 'Kategori akademik berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriNilaiAkademik:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI RATA-RATA
// ═════════════════════════════════════════════════════════════════════════════

exports.getKategoriRataRata = async (req, res) => {
    try {
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const kategori = await model.getKategoriRataRata(taAktif.id_tahun_ajaran);
        const coverage = await model.cekCoverage0to100(null, taAktif.id_tahun_ajaran);

        res.json({
            success: true,
            data: kategori,
            coverage: coverage
        });
    } catch (err) {
        console.error('Error getKategoriRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori rata-rata' });
    }
};

exports.createKategoriRataRata = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi } = req.body;

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
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const overlaps = await model.cekOverlapAkademik(null, taAktif.id_tahun_ajaran, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        const newId = await model.createKategoriRataRata(taAktif.id_tahun_ajaran, minNilai, maxNilai, deskripsi.trim());

        res.json({
            success: true,
            message: 'Kategori rata-rata berhasil ditambahkan',
            id: newId
        });
    } catch (err) {
        console.error('Error createKategoriRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah kategori: ' + err.message });
    }
};

exports.updateKategoriRataRata = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, deskripsi } = req.body;

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
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriRataRataById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori rata-rata tidak ditemukan' });
        }

        if (existing.min_nilai === minNilai && existing.max_nilai === maxNilai && existing.deskripsi.trim() === deskripsi.trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        const overlaps = await model.cekOverlapAkademik(null, taAktif.id_tahun_ajaran, minNilai, maxNilai, id);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan: ${overlapInfo}`
            });
        }

        await model.updateKategoriRataRata(id, minNilai, maxNilai, deskripsi.trim());

        res.json({ success: true, message: 'Kategori rata-rata berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateKategoriRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

exports.deleteKategoriRataRata = async (req, res) => {
    try {
        const { id } = req.params;

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriRataRataById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori rata-rata tidak ditemukan' });
        }

        await model.deleteKategoriRataRata(id);

        res.json({ success: true, message: 'Kategori rata-rata berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriRataRata:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI KOKURIKULER
// ════════════════════════════════════════════════════════════════════════════

exports.getKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const kategori = await model.getKategoriKokurikuler(taAktif.id_tahun_ajaran, taAktif.semester);

        res.json({ success: true, data: kategori });
    } catch (err) {
        console.error('Error getKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil kategori kokurikuler' });
    }
};

exports.createKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { min_nilai, max_nilai, grade, deskripsi, id_aspek_kokurikuler } = req.body;

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

        const duplikat = await model.cekDuplikasiGrade(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, gradeClean);
        if (duplikat.length > 0) {
            return res.status(400).json({
                success: false,
                code: 'DUPLICATE_GRADE',
                message: `Grade "${gradeClean}" sudah ada untuk aspek ini di semester ${taAktif.semester}`
            });
        }

        const overlaps = await model.cekOverlapKokurikuler(id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, minNilai, maxNilai);
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => `${o.grade} (${o.rentang_min}-${o.rentang_max})`).join(', ');
            return res.status(400).json({
                success: false,
                code: 'RANGE_OVERLAP',
                message: `Range nilai ${minNilai}-${maxNilai} tumpang tindih dengan grade: ${overlapInfo}`
            });
        }

        const newId = await model.createKategoriKokurikuler(
            id_aspek_kokurikuler,
            taAktif.id_tahun_ajaran,
            taAktif.semester,
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

        const existing = await model.getKategoriKokurikulerById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        if (existing.rentang_min == minNilai && existing.rentang_max == maxNilai &&
            existing.grade === gradeClean && existing.deskripsi.trim() === deskripsi.trim()) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data' });
        }

        if (existing.grade !== gradeClean) {
            const duplikat = await model.cekDuplikasiGrade(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, gradeClean, id);
            if (duplikat.length > 0) {
                return res.status(400).json({
                    success: false,
                    code: 'DUPLICATE_GRADE',
                    message: `Grade "${gradeClean}" sudah ada untuk aspek ini`
                });
            }
        }

        const overlaps = await model.cekOverlapKokurikuler(existing.id_aspek_kokurikuler, taAktif.id_tahun_ajaran, taAktif.semester, minNilai, maxNilai, id);
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

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const existing = await model.getKategoriKokurikulerById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        await model.deleteKategoriKokurikuler(id);

        res.json({ success: true, message: 'Kategori kokurikuler berhasil dihapus' });
    } catch (err) {
        console.error('Error deleteKategoriNilaiKokurikuler:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// BOBOT AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

exports.getBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user.id;

        const taAktif = await model.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const mengajarMapel = await model.cekGuruMengajarMapel(userId, mapelId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
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

        const bobot = await model.getBobotByMapel(mapelId);

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
            if (numBobot < 0) {
                return res.status(400).json({ success: false, message: 'Bobot tidak boleh negatif' });
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

        const mengajarMapel = await model.cekGuruMengajarMapel(userId, mapelId, taAktif.id_tahun_ajaran);
        if (!mengajarMapel) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const komponenIds = bobotList.map(b => b.komponen_id);
        const komponenValid = await model.cekKomponenValid(komponenIds);
        if (!komponenValid) {
            return res.status(400).json({ success: false, message: 'Ada komponen yang tidak valid' });
        }

        await model.saveBobot(mapelId, bobotList);

        res.json({ success: true, message: 'Bobot penilaian berhasil disimpan' });
    } catch (err) {
        console.error('Error updateBobotAkademikByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan bobot: ' + err.message });
    }
};