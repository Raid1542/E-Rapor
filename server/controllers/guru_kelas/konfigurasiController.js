/**
 * Nama File: konfigurasiController.js
 * Fungsi: Controller untuk konfigurasi penilaian (kategori, bobot, komponen)
 */

const db = require('../../config/db');
const konfigurasiNilaiRaporModel = require('../../models/konfigurasiNilaiRaporModel');
const konfigurasiNilaiKokurikulerModel = require('../../models/konfigurasiNilaiKokurikuler');
const bobotPenilaianModel = require('../../models/bobotPenilaianModel');
const komponenPenilaianModel = require('../../models/komponenPenilaianModel');

/**
 * GET /atur-penilaian/komponen
 * Ambil daftar komponen penilaian (UH, PTS, PAS, dll)
 */
exports.getKomponenPenilaian = async (req, res) => {
    try {
        const komponen = await komponenPenilaianModel.getAllKomponen();
        res.json({ success: true, data: komponen });
    } catch (err) {
        console.error('Error getKomponenPenilaian:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar komponen'
        });
    }
};

/**
 * GET /atur-penilaian/kategori-akademik
 * Ambil konfigurasi kategori nilai akademik
 */
exports.getKategoriNilaiAkademik = async (req, res) => {
    try {
        const { mapel_id } = req.query;
        const mapelId = mapel_id ? Number(mapel_id) : null;
        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const data = await konfigurasiNilaiRaporModel.getAllKategori(mapelId, false, semesterId);
        const formattedData = data.map(item => ({
            ...item,
            min_nilai: Math.floor(item.min_nilai),
            max_nilai: Math.floor(item.max_nilai),
        }));

        res.json({ success: true, data: formattedData });
    } catch (err) {
        console.error('Error getKategoriNilaiAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil konfigurasi nilai akademik'
        });
    }
};

/**
 * POST /atur-penilaian/kategori-akademik
 * Tambah konfigurasi kategori nilai akademik
 */
exports.createKategoriNilaiAkademik = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;

        if (min_nilai == null || max_nilai == null || deskripsi == null) {
            return res.status(400).json({
                success: false,
                message: 'Field min_nilai, max_nilai, dan deskripsi wajib diisi',
            });
        }

        if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: 'Rentang nilai tidak valid'
            });
        }

        const mapelIdNum = parseInt(mapel_id, 10);
        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const newKategori = await konfigurasiNilaiRaporModel.createKategori({
            mapel_id: mapelIdNum || null,
            id_tahun_ajaran_induk: semesterId,
            min_nilai: parseFloat(min_nilai),
            max_nilai: parseFloat(max_nilai),
            deskripsi,
            urutan: urutan != null ? parseInt(urutan) : 0,
        });

        res.status(201).json({
            success: true,
            message: 'Konfigurasi nilai akademik berhasil ditambahkan',
            data: newKategori,
        });
    } catch (err) {
        console.error('Error createKategoriNilaiAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah konfigurasi nilai akademik'
        });
    }
};

/**
 * PUT /atur-penilaian/kategori-akademik/:id
 * Update konfigurasi kategori nilai akademik
 */
exports.updateKategoriNilaiAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;

        if (min_nilai == null || max_nilai == null || deskripsi == null) {
            return res.status(400).json({
                success: false,
                message: 'Field min_nilai, max_nilai, dan deskripsi wajib diisi',
            });
        }

        if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: 'Rentang nilai tidak valid'
            });
        }

        const mapelIdNum = mapel_id ? parseInt(mapel_id, 10) : null;
        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const updated = await konfigurasiNilaiRaporModel.updateKategori(id, {
            mapel_id: mapelIdNum,
            id_tahun_ajaran_induk: semesterId,
            min_nilai: parseFloat(min_nilai),
            max_nilai: parseFloat(max_nilai),
            deskripsi,
            urutan: urutan != null ? parseInt(urutan) : 0,
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi akademik tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: 'Konfigurasi nilai akademik berhasil diperbarui'
        });
    } catch (err) {
        console.error('Error updateKategoriNilaiAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui konfigurasi nilai akademik'
        });
    }
};

/**
 * DELETE /atur-penilaian/kategori-akademik/:id
 * Hapus konfigurasi kategori nilai akademik
 */
exports.deleteKategoriNilaiAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await konfigurasiNilaiRaporModel.deleteKategori(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Konfigurasi nilai akademik berhasil dihapus'
        });
    } catch (err) {
        console.error('Error deleteKategoriNilaiAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus konfigurasi nilai akademik'
        });
    }
};

/**
 * GET /atur-penilaian/kategori-kokurikuler
 * Ambil konfigurasi kategori nilai kokurikuler
 */
exports.getKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const data = await konfigurasiNilaiKokurikulerModel.getAllKategori(semesterId);
        const formattedData = data.map(item => ({
            ...item,
            min_nilai: Math.floor(item.min_nilai),
            max_nilai: Math.floor(item.max_nilai),
        }));

        res.json({ success: true, data: formattedData });
    } catch (err) {
        console.error('Error getKategoriNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil konfigurasi nilai kokurikuler',
        });
    }
};

/**
 * POST /atur-penilaian/kategori-kokurikuler
 * Tambah konfigurasi kategori nilai kokurikuler
 */
exports.createKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const {
            min_nilai,
            max_nilai,
            grade,
            deskripsi,
            urutan,
            id_aspek_kokurikuler,
        } = req.body;

        if (
            min_nilai == null ||
            max_nilai == null ||
            grade == null ||
            deskripsi == null ||
            id_aspek_kokurikuler == null
        ) {
            return res.status(400).json({
                success: false,
                message: 'Semua field wajib diisi, termasuk aspek kokurikuler',
            });
        }

        if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: 'Rentang nilai tidak valid'
            });
        }

        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const newKategori = await konfigurasiNilaiKokurikulerModel.createKategori({
            id_aspek_kokurikuler: parseInt(id_aspek_kokurikuler),
            id_tahun_ajaran_induk: semesterId,
            min_nilai: Math.floor(min_nilai),
            max_nilai: Math.floor(max_nilai),
            grade,
            deskripsi,
            urutan: urutan != null ? parseInt(urutan) : 0,
        });

        res.status(201).json({
            success: true,
            message: 'Konfigurasi nilai kokurikuler berhasil ditambahkan',
            data: newKategori,
        });
    } catch (err) {
        console.error('Error createKategoriNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah konfigurasi nilai kokurikuler',
        });
    }
};

/**
 * PUT /atur-penilaian/kategori-kokurikuler/:id
 * Update konfigurasi kategori nilai kokurikuler
 */
exports.updateKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            min_nilai,
            max_nilai,
            grade,
            deskripsi,
            urutan,
            id_aspek_kokurikuler,
        } = req.body;

        if (
            min_nilai == null ||
            max_nilai == null ||
            grade == null ||
            deskripsi == null ||
            id_aspek_kokurikuler == null
        ) {
            return res.status(400).json({
                success: false,
                message: 'Semua field wajib diisi, termasuk aspek kokurikuler',
            });
        }

        if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: 'Rentang nilai tidak valid'
            });
        }

        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const updated = await konfigurasiNilaiKokurikulerModel.updateKategori(id, {
            id_aspek_kokurikuler: parseInt(id_aspek_kokurikuler),
            id_tahun_ajaran_induk: semesterId,
            min_nilai: parseFloat(min_nilai),
            max_nilai: parseFloat(max_nilai),
            grade,
            deskripsi,
            urutan: urutan != null ? parseInt(urutan) : 0,
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi kokurikuler tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: 'Konfigurasi nilai kokurikuler berhasil diperbarui',
        });
    } catch (err) {
        console.error('Error updateKategoriNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui konfigurasi nilai kokurikuler',
        });
    }
};

/**
 * DELETE /atur-penilaian/kategori-kokurikuler/:id
 * Hapus konfigurasi kategori nilai kokurikuler
 */
exports.deleteKategoriNilaiKokurikuler = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await konfigurasiNilaiKokurikulerModel.deleteKategori(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Konfigurasi nilai kokurikuler berhasil dihapus',
        });
    } catch (err) {
        console.error('Error deleteKategoriNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus konfigurasi nilai kokurikuler',
        });
    }
};

/**
 * GET /atur-penilaian/kategori-rata-rata
 * Ambil konfigurasi kategori nilai rata-rata
 */
exports.getKategoriRataRata = async (req, res) => {
    try {
        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const data = await konfigurasiNilaiRaporModel.getAllKategori(null, true, semesterId);
        const formatted = data.map(item => ({
            ...item,
            min_nilai: Math.floor(item.min_nilai),
            max_nilai: Math.floor(item.max_nilai),
        }));

        res.json({ success: true, data: formatted });
    } catch (err) {
        console.error('Error getKategoriRataRata:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kategori rata-rata'
        });
    }
};

/**
 * POST /atur-penilaian/kategori-rata-rata
 * Tambah konfigurasi kategori rata-rata
 */
exports.createKategoriRataRata = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi, urutan } = req.body;

        if (min_nilai == null || max_nilai == null || deskripsi == null) {
            return res.status(400).json({
                success: false,
                message: 'Field wajib diisi'
            });
        }

        if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: 'Rentang nilai tidak valid'
            });
        }

        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const newKategori = await konfigurasiNilaiRaporModel.createKategori({
            mapel_id: null,
            id_tahun_ajaran_induk: semesterId,
            min_nilai: parseFloat(min_nilai),
            max_nilai: parseFloat(max_nilai),
            deskripsi,
            urutan: urutan != null ? parseInt(urutan) : 0,
        });

        res.status(201).json({
            success: true,
            message: 'Kategori rata-rata berhasil ditambahkan',
            data: newKategori,
        });
    } catch (err) {
        console.error('Error createKategoriRataRata:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah kategori rata-rata'
        });
    }
};

/**
 * PUT /atur-penilaian/kategori-rata-rata/:id
 * Update konfigurasi kategori rata-rata
 */
exports.updateKategoriRataRata = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, deskripsi, urutan } = req.body;

        if (min_nilai == null || max_nilai == null || deskripsi == null) {
            return res.status(400).json({
                success: false,
                message: 'Field wajib diisi'
            });
        }

        if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: 'Rentang nilai tidak valid'
            });
        }

        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const updated = await konfigurasiNilaiRaporModel.updateKategori(id, {
            mapel_id: null,
            id_tahun_ajaran_induk: semesterId,
            min_nilai: parseFloat(min_nilai),
            max_nilai: parseFloat(max_nilai),
            deskripsi,
            urutan: urutan != null ? parseInt(urutan) : 0,
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Konfigurasi rata-rata berhasil diperbarui'
        });
    } catch (err) {
        console.error('Error updateKategoriRataRata:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui konfigurasi rata-rata'
        });
    }
};

/**
 * DELETE /atur-penilaian/kategori-rata-rata/:id
 * Hapus konfigurasi kategori rata-rata
 */
exports.deleteKategoriRataRata = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await konfigurasiNilaiRaporModel.deleteKategori(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Konfigurasi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Konfigurasi rata-rata berhasil dihapus'
        });
    } catch (err) {
        console.error('Error deleteKategoriRataRata:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus konfigurasi rata-rata'
        });
    }
};

/**
 * GET /atur-penilaian/bobot-akademik/:mapelId
 * Ambil bobot penilaian akademik untuk suatu mata pelajaran
 */
exports.getBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        const bobot = await bobotPenilaianModel.getBobotByMapel(mapelId, semesterId);

        if (bobot.length === 0) {
            // Jika belum ada, set default
            const komponenList = await komponenPenilaianModel.getAllKomponen();
            const defaultBobot = komponenList.map(k => ({
                komponen_id: k.id_komponen,
                bobot: 0,
                is_active: true
            }));

            await bobotPenilaianModel.updateBobotByMapel(mapelId, defaultBobot, semesterId);
            const newBobot = await bobotPenilaianModel.getBobotByMapel(mapelId, semesterId);

            res.json({
                success: true,
                data: newBobot,
                is_locked: false
            });
        } else {
            res.json({
                success: true,
                data: bobot,
                is_locked: false
            });
        }
    } catch (err) {
        console.error('Error getBobotAkademikByMapel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil bobot penilaian'
        });
    }
};

/**
 * PUT /atur-penilaian/bobot-akademik/:mapelId
 * Update bobot penilaian akademik
 */
exports.updateBobotAkademikByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const bobotList = req.body;

        if (!Array.isArray(bobotList)) {
            return res.status(400).json({
                success: false,
                message: 'Data bobot harus berupa array'
            });
        }

        const total = bobotList.reduce((sum, b) => sum + (parseFloat(b.bobot) || 0), 0);

        if (Math.abs(total - 100) > 0.1) {
            return res.status(400).json({
                success: false,
                message: 'Total bobot harus 100%'
            });
        }

        const semesterId = req.idSemesterAktif;

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester tidak ditemukan'
            });
        }

        // Simpan bobot baru
        await bobotPenilaianModel.updateBobotByMapel(mapelId, bobotList, semesterId);

        res.json({
            success: true,
            message: 'Bobot penilaian akademik berhasil diperbarui',
        });
    } catch (err) {
        console.error('Error updateBobotAkademikByMapel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui bobot penilaian'
        });
    }
};

module.exports = exports;