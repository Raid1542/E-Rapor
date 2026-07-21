/**
 * Nama File: penilaianKategoriController.js
 * Fungsi: Controller kategori nilai akademik (CRUD + validasi overlap per jenis).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const kategoriModel = require('../../models/guru_bidang_studi/penilaianKategoriModel');

/**
 * GET /kategori-akademik - Ambil daftar kategori nilai akademik untuk mapel dan kelas tertentu.
 */
exports.getKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id, kelas_id } = req.query;

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

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tidak ada semester aktif' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const jenisPenilaianAktif = taAktif.status_pts === 'aktif'
            ? 'PTS'
            : taAktif.status_pas === 'aktif'
                ? 'PAS'
                : null;

        const kategori = await kategoriModel.getKategoriByMapel(
            mapelIdNum,
            semesterId,
            kelasIdNum,
            jenisPenilaianAktif
        );

        const coverage = await kategoriModel.cekCoverage0to100(
            mapelIdNum,
            semesterId,
            kelasIdNum,
            jenisPenilaianAktif
        );

        res.json({
            success: true,
            data: kategori,
            coverage,
            mapel: req.penugasanMapel?.nama_mapel || 'Mata Pelajaran',
            kelas_id: kelasIdNum,
            jenis_penilaian: jenisPenilaianAktif
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kategori akademik: ' + err.message
        });
    }
};

/**
 * POST /kategori-akademik - Tambah kategori nilai akademik baru dengan validasi overlap.
 */
exports.createKategoriAkademik = async (req, res) => {
    try {
        const { min_nilai, max_nilai, deskripsi, mapel_id, kelas_id } = req.body;

        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai minimum dan maksimum harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 sampai 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({ success: false, message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})` });
        }
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const cleanDeskripsi = deskripsi.trim();
        const mapelIdNum = parseInt(mapel_id, 10);

        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({ success: false, message: 'mapel_id tidak valid' });
        }

        const kelasIdNum = parseInt(kelas_id, 10);
        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({ success: false, message: 'kelas_id tidak valid' });
        }

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const jenisPenilaianAktif = taAktif.status_pts === 'aktif' ? 'PTS' : (taAktif.status_pas === 'aktif' ? 'PAS' : null);

        const overlaps = await kategoriModel.cekRangeOverlap(
            mapelIdNum,
            semesterId,
            minNilai,
            maxNilai,
            kelasIdNum,
            null,
            jenisPenilaianAktif
        );

        if (overlaps.length > 0) {
            const overlapList = overlaps.map(o => `"${o.deskripsi}" (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                message: `Range nilai ${minNilai}-${maxNilai} tidak bisa digunakan karena sudah ada kategori lain: ${overlapList}.`
            });
        }

        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, mapelIdNum, semesterId);
        if (!isValid) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
        }

        const result = await kategoriModel.createKategori({
            mapel_id: mapelIdNum,
            semester_id: semesterId,
            min_nilai: minNilai,
            max_nilai: maxNilai,
            deskripsi: cleanDeskripsi,
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
        res.status(500).json({ success: false, message: 'Gagal menambah kategori: ' + err.message });
    }
};

/**
 * PUT /kategori-akademik/:id - Update kategori nilai akademik dengan validasi overlap.
 */
exports.updateKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        const { min_nilai, max_nilai, deskripsi } = req.body;

        const minNilai = Math.floor(parseFloat(min_nilai));
        const maxNilai = Math.floor(parseFloat(max_nilai));

        if (isNaN(minNilai) || isNaN(maxNilai)) {
            return res.status(400).json({ success: false, message: 'Nilai minimum dan maksimum harus berupa angka' });
        }
        if (minNilai < 0 || maxNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 sampai 100' });
        }
        if (minNilai >= maxNilai) {
            return res.status(400).json({ success: false, message: `Nilai minimum (${minNilai}) harus lebih kecil dari nilai maksimum (${maxNilai})` });
        }
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Deskripsi minimal 3 karakter' });
        }

        const cleanDeskripsi = deskripsi.trim();
        const taAktif = await kategoriModel.getTahunAjaranAktif();

        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const jenisPenilaianAktif = taAktif.status_pts === 'aktif' ? 'PTS' : (taAktif.status_pas === 'aktif' ? 'PAS' : null);

        const existing = await kategoriModel.getKategoriById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        const existingMin = Math.floor(parseFloat(existing.min_nilai));
        const existingMax = Math.floor(parseFloat(existing.max_nilai));
        const existingDeskripsi = (existing.deskripsi || '').trim();

        if (existingMin === minNilai && existingMax === maxNilai && existingDeskripsi === cleanDeskripsi) {
            return res.status(200).json({
                success: true,
                message: 'Data sudah sesuai, tidak ada perubahan yang diperlukan'
            });
        }

        const overlaps = await kategoriModel.cekRangeOverlap(
            existing.mapel_id,
            semesterId,
            minNilai,
            maxNilai,
            existing.kelas_id,
            id,
            jenisPenilaianAktif
        );

        if (overlaps.length > 0) {
            const overlapList = overlaps.map(o => `"${o.deskripsi}" (${o.min_nilai}-${o.max_nilai})`).join(', ');
            return res.status(400).json({
                success: false,
                message: `Range nilai ${minNilai}-${maxNilai} tidak bisa digunakan karena sudah ada kategori lain: ${overlapList}.`
            });
        }

        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, existing.mapel_id, semesterId);
        if (!isValid) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
        }

        const affectedRows = await kategoriModel.updateKategori(id, {
            min_nilai: minNilai,
            max_nilai: maxNilai,
            deskripsi: cleanDeskripsi
        });

        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        res.json({
            success: true,
            message: 'Kategori akademik berhasil diperbarui',
            mapel: req.penugasanMapel?.nama_mapel
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui kategori: ' + err.message });
    }
};

/**
 * DELETE /kategori-akademik/:id - Hapus kategori nilai akademik.
 */
exports.deleteKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const kategori = await kategoriModel.getKategoriById(id);

        if (!kategori) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, kategori.mapel_id, semesterId);
        if (!isValid) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini' });
        }

        const affectedRows = await kategoriModel.deleteKategori(id);

        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
        }

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus',
            mapel: req.penugasanMapel?.nama_mapel
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal menghapus kategori: ' + err.message });
    }
};