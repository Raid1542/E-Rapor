/**
 * Nama File: penilaianKategoriController.js
 * Fungsi: Controller untuk manajemen kategori nilai akademik (range nilai).
 *         Menangani CRUD kategori dengan validasi overlap range per jenis penilaian (PTS/PAS),
 *         validasi akses guru, dan pengecekan dependensi nilai siswa.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const kategoriModel = require('../../models/guru_bidang_studi/penilaianKategoriModel');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET KATEGORI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-bidang-studi/atur-penilaian/kategori
 * Ambil daftar kategori nilai akademik untuk mapel dan kelas tertentu.
 * 
 * Fitur:
 *   - Filter kategori berdasarkan jenis penilaian aktif (PTS/PAS)
 *   - Hitung coverage range (0-100) untuk validasi kelengkapan
 *   - Return info mapel dan kelas
 * 
 * @param {string} req.query.mapel_id - ID mata pelajaran
 * @param {string} req.query.kelas_id - ID kelas
 */
exports.getKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id, kelas_id } = req.query;

        // Validasi parameter
        if (!mapel_id || !kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter mapel_id dan kelas_id wajib diisi'
            });
        }

        const mapelIdNum = parseInt(mapel_id, 10);
        const kelasIdNum = parseInt(kelas_id, 10);

        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({ success: false, message: 'mapel_id tidak valid' });
        }

        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({ success: false, message: 'kelas_id tidak valid' });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tidak ada semester aktif' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        
        // Tentukan jenis penilaian aktif
        const jenisPenilaianAktif = taAktif.status_pts === 'aktif' ? 'PTS' 
            : taAktif.status_pas === 'aktif' ? 'PAS' : null;
        
        console.log(`[GET Kategori] Jenis aktif: ${jenisPenilaianAktif}`);

        // Ambil kategori dengan filter jenis penilaian
        const kategori = await kategoriModel.getKategoriByMapel(
            mapelIdNum, 
            semesterId, 
            kelasIdNum,
            jenisPenilaianAktif
        );
        
        // Hitung coverage range
        const coverage = await kategoriModel.cekCoverage0to100(
            mapelIdNum, 
            semesterId, 
            kelasIdNum,
            jenisPenilaianAktif
        );

        console.log(`[Coverage Result]:`, JSON.stringify(coverage));

        res.json({
            success: true,
            data: kategori,
            coverage: coverage,
            mapel: req.penugasanMapel?.nama_mapel || 'Mata Pelajaran',
            kelas_id: kelasIdNum,
            jenis_penilaian: jenisPenilaianAktif
        });

    } catch (err) {
        console.error('Error getKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kategori akademik'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. CREATE KATEGORI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/guru-bidang-studi/atur-penilaian/kategori
 * Tambah kategori nilai akademik baru dengan validasi overlap.
 * 
 * Validasi:
 *   - Range nilai 0-100
 *   - min_nilai <= max_nilai
 *   - Deskripsi minimal 3 karakter
 *   - Tidak boleh overlap dengan kategori lain (per jenis penilaian)
 *   - Validasi akses guru ke mapel
 * 
 * Business Rules:
 *   - Simpan dengan jenis_penilaian aktif (PTS/PAS)
 *   - Cek overlap hanya untuk jenis penilaian yang sama
 * 
 * @param {number} req.body.min_nilai - Nilai minimum (0-100)
 * @param {number} req.body.max_nilai - Nilai maksimum (0-100)
 * @param {string} req.body.deskripsi - Deskripsi kategori
 * @param {number} req.body.mapel_id - ID mata pelajaran
 * @param {number} req.body.kelas_id - ID kelas
 */
exports.createKategoriAkademik = async (req, res) => {
    try {
        let { min_nilai, max_nilai, deskripsi, mapel_id, kelas_id } = req.body;

        // Sanitasi input
        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));

        // Validasi range nilai
        if (isNaN(min_nilai) || isNaN(max_nilai)) {
            return res.status(400).json({
                success: false,
                message: 'Nilai min dan max harus berupa angka.'
            });
        }

        if (min_nilai < 0 || max_nilai > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 0 dan 100.'
            });
        }

        if (min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${min_nilai}) tidak boleh lebih besar dari nilai maksimum (${max_nilai}).`
            });
        }

        // Validasi deskripsi
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Deskripsi minimal 3 karakter.'
            });
        }
        deskripsi = deskripsi.trim();

        // Validasi mapel_id
        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        // Validasi kelas_id
        const kelasIdNum = parseInt(kelas_id, 10);
        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid'
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        
        // Tentukan jenis penilaian aktif
        const jenisPenilaianAktif = taAktif.status_pts === 'aktif' ? 'PTS' : taAktif.status_pas === 'aktif' ? 'PAS' : null;
        
        console.log(`[Create Kategori] Jenis aktif: ${jenisPenilaianAktif}`);
        
        // Cek overlap hanya untuk jenis penilaian yang sama
        const overlaps = await kategoriModel.cekRangeOverlap(
            mapelIdNum,
            semesterId,
            min_nilai,
            max_nilai,
            kelasIdNum,
            null,
            jenisPenilaianAktif
        );

        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${kategoriModel.formatOverlapInfo(overlaps)}`
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, mapelIdNum, semesterId);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Create kategori dengan jenis_penilaian
        const result = await kategoriModel.createKategori({
            mapel_id: mapelIdNum,
            semester_id: semesterId,
            min_nilai,
            max_nilai,
            deskripsi,
            kelas_id: kelasIdNum,
            jenis_penilaian: jenisPenilaianAktif
        });

        res.json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            id: result.insertId,
            mapel: req.penugasanMapel?.nama_mapel,
            jenis_penilaian: jenisPenilaianAktif
        });

    } catch (err) {
        console.error('Error createKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah kategori: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPDATE KATEGORI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-bidang-studi/atur-penilaian/kategori/:id
 * Update kategori nilai akademik dengan validasi overlap.
 * 
 * Validasi:
 *   - Range nilai 0-100
 *   - min_nilai <= max_nilai
 *   - Deskripsi minimal 3 karakter
 *   - Tidak boleh overlap dengan kategori lain (exclude diri sendiri)
 *   - Validasi akses guru ke mapel
 *   - Cek apakah ada perubahan data
 * 
 * @param {string} req.params.id - ID kategori
 * @param {number} req.body.min_nilai - Nilai minimum (0-100)
 * @param {number} req.body.max_nilai - Nilai maksimum (0-100)
 * @param {string} req.body.deskripsi - Deskripsi kategori
 * @param {number} req.body.urutan - Urutan kategori
 */
exports.updateKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        let { min_nilai, max_nilai, deskripsi, urutan } = req.body;

        // Sanitasi input
        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));
        urutan = parseInt(urutan) || 0;

        // Validasi range nilai
        if (isNaN(min_nilai) || isNaN(max_nilai)) {
            return res.status(400).json({
                success: false,
                message: 'Nilai min dan max harus berupa angka.'
            });
        }

        if (min_nilai < 0 || max_nilai > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 0 dan 100.'
            });
        }

        if (min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${min_nilai}) tidak boleh lebih besar dari nilai maksimum (${max_nilai}).`
            });
        }

        // Validasi deskripsi
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Deskripsi minimal 3 karakter.'
            });
        }
        deskripsi = deskripsi.trim();

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        
        // Tentukan jenis penilaian aktif
        const jenisPenilaianAktif = taAktif.status_pts === 'aktif' ? 'PTS' : taAktif.status_pas === 'aktif' ? 'PAS' : null;

        // Cek keberadaan kategori
        const existing = await kategoriModel.getKategoriById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        // Cek apakah ada perubahan
        if (kategoriModel.isUnchanged(existing, { min_nilai, max_nilai, deskripsi })) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data.'
            });
        }

        // Cek overlap dengan filter jenis_penilaian (exclude diri sendiri)
        const overlaps = await kategoriModel.cekRangeOverlap(
            existing.mapel_id,
            semesterId,
            min_nilai,
            max_nilai,
            existing.kelas_id,
            id,
            jenisPenilaianAktif
        );

        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${kategoriModel.formatOverlapInfo(overlaps)}`
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, existing.mapel_id, semesterId);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Update kategori
        const affectedRows = await kategoriModel.updateKategori(id, {
            min_nilai,
            max_nilai,
            deskripsi,
            urutan
        });

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Kategori akademik berhasil diperbarui',
            mapel: req.penugasanMapel?.nama_mapel
        });

    } catch (err) {
        console.error('Error updateKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui kategori: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. DELETE KATEGORI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/guru-bidang-studi/atur-penilaian/kategori/:id
 * Hapus kategori nilai akademik dengan validasi dependensi.
 * 
 * Validasi:
 *   - Kategori harus ada
 *   - Validasi akses guru ke mapel
 *   - Tidak boleh ada nilai siswa yang menggunakan range ini
 * 
 * @param {string} req.params.id - ID kategori
 */
exports.deleteKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Cek keberadaan kategori
        const kategori = await kategoriModel.getKategoriById(id);
        if (!kategori) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, kategori.mapel_id, semesterId);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Cek dependensi nilai siswa
        const affectedCount = await kategoriModel.cekNilaiSiswaInRange(
            kategori.mapel_id,
            semesterId,
            kategori.min_nilai,
            kategori.max_nilai,
            kategori.kelas_id
        );

        if (affectedCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak dapat menghapus kategori. Ada ${affectedCount} nilai siswa yang menggunakan range ${kategori.min_nilai}-${kategori.max_nilai}.`
            });
        }

        // Delete kategori
        const affectedRows = await kategoriModel.deleteKategori(id);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus',
            mapel: req.penugasanMapel?.nama_mapel
        });

    } catch (err) {
        console.error('Error deleteKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kategori: ' + err.message
        });
    }
};