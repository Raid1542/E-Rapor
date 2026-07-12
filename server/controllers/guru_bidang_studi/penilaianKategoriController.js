/**
 * Nama File: penilaianKategoriController.js
 * Fungsi: Controller kategori nilai akademik (CRUD + validasi overlap per jenis)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const kategoriModel = require('../../models/guru_bidang_studi/penilaianKategoriModel');

// Ambil daftar kategori nilai akademik untuk mapel dan kelas tertentu
exports.getKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id, kelas_id } = req.query;

        // Validasi parameter
        if (!mapel_id || !kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter mapel_id dan kelas_id wajib diisi',
            });
        }

        const mapelIdNum = parseInt(mapel_id, 10);
        const kelasIdNum = parseInt(kelas_id, 10);

        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid',
            });
        }

        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid',
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif',
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Tentukan jenis penilaian aktif
        const jenisPenilaianAktif =
            taAktif.status_pts === 'aktif'
                ? 'PTS'
                : taAktif.status_pas === 'aktif'
                    ? 'PAS'
                    : null;

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

        res.json({
            success: true,
            data: kategori,
            coverage,
            mapel: req.penugasanMapel?.nama_mapel || 'Mata Pelajaran',
            kelas_id: kelasIdNum,
            jenis_penilaian: jenisPenilaianAktif,
        });
    } catch (err) {
        console.error('Error getKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kategori akademik',
        });
    }
};

// Tambah kategori nilai akademik baru dengan validasi overlap
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
                message: 'Nilai minimum dan maksimum harus berupa angka',
            });
        }

        if (min_nilai < 0 || max_nilai > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 0 sampai 100',
            });
        }

        if (min_nilai >= max_nilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${min_nilai}) harus lebih kecil dari nilai maksimum (${max_nilai})`,
            });
        }

        // Validasi deskripsi
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Deskripsi minimal 3 karakter',
            });
        }

        deskripsi = deskripsi.trim();

        // Validasi mapel_id & kelas_id
        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid',
            });
        }

        const kelasIdNum = parseInt(kelas_id, 10);
        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid',
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Tentukan jenis penilaian aktif
        const jenisPenilaianAktif =
            taAktif.status_pts === 'aktif'
                ? 'PTS'
                : taAktif.status_pas === 'aktif'
                    ? 'PAS'
                    : null;

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
            const overlapList = overlaps
                .map(o => `"${o.deskripsi}" (${o.min_nilai}-${o.max_nilai})`)
                .join(', ');
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tidak bisa digunakan karena sudah ada kategori lain yang menggunakan range tersebut: ${overlapList}. Silakan gunakan range nilai yang berbeda`,
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(
            userId,
            mapelIdNum,
            semesterId
        );

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini',
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
            jenis_penilaian: jenisPenilaianAktif,
        });

        res.json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            id: result.insertId,
            mapel: req.penugasanMapel?.nama_mapel,
            jenis_penilaian: jenisPenilaianAktif,
        });
    } catch (err) {
        console.error('Error createKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah kategori: ' + err.message,
        });
    }
};

// Update kategori nilai akademik dengan validasi overlap
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
                message: 'Nilai minimum dan maksimum harus berupa angka',
            });
        }

        if (min_nilai < 0 || max_nilai > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 0 sampai 100',
            });
        }

        if (min_nilai >= max_nilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${min_nilai}) harus lebih kecil dari nilai maksimum (${max_nilai})`,
            });
        }

        // Validasi deskripsi
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Deskripsi minimal 3 karakter',
            });
        }

        deskripsi = deskripsi.trim();

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Tentukan jenis penilaian aktif
        const jenisPenilaianAktif =
            taAktif.status_pts === 'aktif'
                ? 'PTS'
                : taAktif.status_pas === 'aktif'
                    ? 'PAS'
                    : null;

        // Cek keberadaan kategori
        const existing = await kategoriModel.getKategoriById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan',
            });
        }

        // Cek apakah ada perubahan
        if (kategoriModel.isUnchanged(existing, { min_nilai, max_nilai, deskripsi })) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data yang disimpan',
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
            const overlapList = overlaps
                .map(o => `"${o.deskripsi}" (${o.min_nilai}-${o.max_nilai})`)
                .join(', ');
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tidak bisa digunakan karena sudah ada kategori lain yang menggunakan range tersebut: ${overlapList}. Silakan gunakan range nilai yang berbeda`,
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(
            userId,
            existing.mapel_id,
            semesterId
        );

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini',
            });
        }

        // Update kategori
        const affectedRows = await kategoriModel.updateKategori(id, {
            min_nilai,
            max_nilai,
            deskripsi,
            urutan,
        });

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: 'Kategori akademik berhasil diperbarui',
            mapel: req.penugasanMapel?.nama_mapel,
        });
    } catch (err) {
        console.error('Error updateKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui kategori: ' + err.message,
        });
    }
};

// Hapus kategori nilai akademik dengan validasi dependensi
exports.deleteKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Cek keberadaan kategori
        const kategori = await kategoriModel.getKategoriById(id);
        if (!kategori) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan',
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(
            userId,
            kategori.mapel_id,
            semesterId
        );

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini',
            });
        }

        // Delete kategori
        const affectedRows = await kategoriModel.deleteKategori(id);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan',
            });
        }

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus',
            mapel: req.penugasanMapel?.nama_mapel,
        });
    } catch (err) {
        console.error('Error deleteKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kategori: ' + err.message,
        });
    }
};