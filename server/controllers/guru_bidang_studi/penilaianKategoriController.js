/**
 * Nama File: penilaianKategoriController.js
 * UPDATE: Fix bug indukId → semesterId, urutan parameter, dan response
 */

const kategoriModel = require('../../models/guru_bidang_studi/penilaianKategoriModel');

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
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid'
            });
        }

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        const kategori = await kategoriModel.getKategoriByMapel(mapelIdNum, semesterId, kelasIdNum);
        const coverage = await kategoriModel.cekCoverage0to100(mapelIdNum, semesterId, kelasIdNum);

        res.json({
            success: true,
            data: kategori,
            coverage: coverage,
            mapel: req.penugasanMapel?.nama_mapel || 'Mata Pelajaran',
            kelas_id: kelasIdNum
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
        let { min_nilai, max_nilai, deskripsi, mapel_id, kelas_id } = req.body;

        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));

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

        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        const kelasIdNum = parseInt(kelas_id, 10);
        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid'
            });
        }

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        
        // ✅ FIX: Cek overlap dengan kelas_id spesifik
        const overlaps = await kategoriModel.cekRangeOverlap(
            mapelIdNum,
            semesterId,
            min_nilai,
            max_nilai,
            kelasIdNum,  // ✅ kelas_id spesifik
            null
        );

        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${kategoriModel.formatOverlapInfo(overlaps)}`
            });
        }

        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, mapelIdNum, semesterId);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // ✅ FIX: Simpan dengan kelas_id spesifik
        const result = await kategoriModel.createKategori({
            mapel_id: mapelIdNum,
            semester_id: semesterId,
            min_nilai,
            max_nilai,
            deskripsi,
            kelas_id: kelasIdNum  
        });

        res.json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            id: result.insertId,
            mapel: req.penugasanMapel?.nama_mapel
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

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        const existing = await kategoriModel.getKategoriById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        if (kategoriModel.isUnchanged(existing, { min_nilai, max_nilai, deskripsi })) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data.'
            });
        }

        const overlaps = await kategoriModel.cekRangeOverlap(
            existing.mapel_id,
            semesterId,
            min_nilai,
            max_nilai,
            existing.kelas_id,
            id
        );

        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${kategoriModel.formatOverlapInfo(overlaps)}`
            });
        }

        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, existing.mapel_id, semesterId);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

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

exports.deleteKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;

        const taAktif = await kategoriModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        const kategori = await kategoriModel.getKategoriById(id);
        if (!kategori) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        const userId = req.user.id;
        const isValid = await kategoriModel.validateGuruMapel(userId, kategori.mapel_id, semesterId);

        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

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