/**
 * Nama File: penilaianKategoriController.js
 * Fungsi: Controller untuk mengelola kategori nilai akademik (tipis, logic di model)
 */

const kategoriModel = require('../../models/guru_bidang_studi/penilaianKategoriModel');

exports.getKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id } = req.query;

        // Validasi parameter
        if (!mapel_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter mapel_id wajib diisi'
            });
        }

        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Ambil kategori
        const kategori = await kategoriModel.getKategoriByMapel(mapelIdNum, semesterId);

        // Cek coverage 0-100
        const coverage = await kategoriModel.cekCoverage0to100(mapelIdNum, semesterId);

        res.json({
            success: true,
            data: kategori,
            coverage: coverage
        });

    } catch (err) {
        console.error('Error getKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kategori akademik'
        });
    }
};

exports.createKategoriAkademik = async (req, res) => {
    try {
        let { min_nilai, max_nilai, deskripsi, mapel_id } = req.body;

        // Parse dan validasi tipe data
        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));
        
        if (isNaN(min_nilai) || isNaN(max_nilai)) {
            return res.status(400).json({
                success: false,
                message: 'Nilai min dan max harus berupa angka.'
            });
        }

        // Validasi range
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

        // Ambil tahun ajaran aktif
        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const indukId = taAktif.id_tahun_ajaran_induk;

        // Cek overlap
        const overlaps = await kategoriModel.cekRangeOverlap(
            mapelIdNum, 
            semesterId, 
            min_nilai, 
            max_nilai
        );
        
        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${kategoriModel.formatOverlapInfo(overlaps)}`
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, mapelIdNum, indukId);
        
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Insert kategori
        const result = await kategoriModel.createKategori({
            mapel_id: mapelIdNum,
            semester_id: semesterId,
            min_nilai,
            max_nilai,
            deskripsi
        });

        res.json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            id: result.insertId,
        });

    } catch (err) {
        console.error('Error createKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah kategori: ' + err.message
        });
    }
};

exports.updateKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        let { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;

        // Parse dan validasi
        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));
        urutan = parseInt(urutan) || 0;

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
        const indukId = taAktif.id_tahun_ajaran_induk;

        // Cek kategori ada
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

        // Cek overlap (exclude diri sendiri)
        const overlaps = await kategoriModel.cekRangeOverlap(
            existing.mapel_id,
            semesterId,
            min_nilai,
            max_nilai,
            id
        );
        
        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${kategoriModel.formatOverlapInfo(overlaps)}`
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, existing.mapel_id, indukId);
        
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
        });

    } catch (err) {
        console.error('Error updateKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui kategori: ' + err.message
        });
    }
};

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
        const indukId = taAktif.id_tahun_ajaran_induk;

        // Cek kategori ada
        const kategori = await kategoriModel.getKategoriById(id);
        if (!kategori) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        // Validasi akses guru
        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, kategori.mapel_id, indukId);
        
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Cek dampak ke nilai siswa
        const affectedCount = await kategoriModel.cekNilaiSiswaInRange(
            kategori.mapel_id,
            semesterId,
            kategori.min_nilai,
            kategori.max_nilai
        );

        if (affectedCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak dapat menghapus kategori. Ada ${affectedCount} nilai siswa yang menggunakan range ${kategori.min_nilai}-${kategori.max_nilai}.`
            });
        }

        // Hapus kategori
        const affectedRows = await kategoriModel.deleteKategori(id);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus'
        });

    } catch (err) {
        console.error('Error deleteKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kategori: ' + err.message
        });
    }
};