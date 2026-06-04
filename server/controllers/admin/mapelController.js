/**
 * Nama File: mataPelajaranController.js
 * Fungsi: Controller untuk CRUD mata pelajaran dengan validasi lengkap
 *         untuk mencegah human error.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Update: Tambah validasi format kode, duplikasi nama, range urutan rapor,
 *         gunakan req.idTahunAjaranInduk dari middleware, handle error DB.
 */

const mapelModel = require('../../models/mapelModel');
const db = require('../../config/db');

const getMataPelajaran = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id || isNaN(Number(tahun_ajaran_id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'tahun_ajaran_id wajib diisi dan harus angka' 
            });
        }
        const rows = await mapelModel.getAllByTahunAjaran(Number(tahun_ajaran_id));
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get mata pelajaran:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data mata pelajaran' 
        });
    }
};

const getMataPelajaranById = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID tidak valid' 
            });
        }
        const rows = await mapelModel.getById(idNum);
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mata pelajaran tidak ditemukan' 
            });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error get mata pelajaran by ID:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil detail mata pelajaran' 
        });
    }
};

const tambahMataPelajaran = async (req, res) => {
    try {
        const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = req.body;
        
        const tahun_ajaran_id = req.idTahunAjaranInduk;

        if (!kode_mapel || !nama_mapel || !jenis || !kurikulum) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kode mapel, nama mapel, jenis, dan kurikulum wajib diisi.' 
            });
        }

        if (!tahun_ajaran_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tidak ada tahun ajaran aktif.' 
            });
        }

        const kodeMapelNormalized = kode_mapel.trim().toUpperCase();
        const namaMapelNormalized = nama_mapel.trim();
        const kurikulumNormalized = kurikulum.trim();
        const jenisNormalized = jenis.trim().toLowerCase();

        if (!/^[A-Z0-9-]{2,20}$/.test(kodeMapelNormalized)) {
            return res.status(400).json({
                success: false,
                message: 'Kode mapel harus 2-20 karakter, hanya boleh huruf kapital, angka, dan strip (-). Contoh: MAT, BINDO, MTK-WAJIB'
            });
        }

        if (namaMapelNormalized.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Nama mata pelajaran minimal 3 karakter.'
            });
        }

        if (!['wajib', 'pilihan'].includes(jenisNormalized)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis mapel harus "wajib" atau "pilihan".'
            });
        }

        const kodeSudahAda = await mapelModel.isKodeMapelExist(kodeMapelNormalized, tahun_ajaran_id);
        if (kodeSudahAda) {
            return res.status(400).json({
                success: false,
                message: `Kode mapel "${kodeMapelNormalized}" sudah digunakan pada tahun ajaran ini. Gunakan kode yang berbeda.`
            });
        }

        const namaSudahAda = await mapelModel.isNamaMapelExist(namaMapelNormalized, tahun_ajaran_id);
        if (namaSudahAda) {
            return res.status(400).json({
                success: false,
                message: `Nama mapel "${namaMapelNormalized}" sudah ada (kode: ${namaSudahAda.kode_mapel}). Gunakan nama yang berbeda.`
            });
        }

        let urutanRaporFinal = null;
        if (urutan_rapor !== null && urutan_rapor !== undefined && urutan_rapor !== '') {
            const urutanRaporNum = Number(urutan_rapor);
            
            if (isNaN(urutanRaporNum) || !Number.isInteger(urutanRaporNum)) {
                return res.status(400).json({
                    success: false,
                    message: 'Urutan rapor harus berupa bilangan bulat.'
                });
            }

            if (urutanRaporNum < 1 || urutanRaporNum > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Urutan rapor harus antara 1 sampai 100.'
                });
            }

            const urutanSudahAda = await mapelModel.isUrutanRaporExist(urutanRaporNum, tahun_ajaran_id);
            if (urutanSudahAda) {
                return res.status(400).json({
                    success: false,
                    message: `Urutan rapor "${urutanRaporNum}" sudah digunakan oleh "${urutanSudahAda.nama_mapel}". Gunakan urutan lain.`
                });
            }

            urutanRaporFinal = urutanRaporNum;
        }

        const result = await mapelModel.create({
            kode_mapel: kodeMapelNormalized,
            nama_mapel: namaMapelNormalized,
            jenis: jenisNormalized,
            kurikulum: kurikulumNormalized,
            tahun_ajaran_id,
            urutan_rapor: urutanRaporFinal
        });

        res.status(201).json({
            success: true,
            message: `Mata pelajaran "${namaMapelNormalized}" berhasil ditambahkan.`,
            id: result.insertId
        });

    } catch (err) {
        console.error('Error tambah mata pelajaran:', err);

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'Kode, nama, atau urutan rapor sudah terdaftar di tahun ajaran ini.'
            });
        }

        if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819) {
            return res.status(400).json({
                success: false,
                message: 'Urutan rapor harus bernilai positif (lebih dari 0) atau kosong.'
            });
        }

        if (err.code === 'ER_NO_REFERENCED_ROW' || err.errno === 1452) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran tidak valid.'
            });
        }

        res.status(500).json({
            success: false,
            message: err.message || 'Gagal menambah mata pelajaran'
        });
    }
};

const editMataPelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        
        if (isNaN(idNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID tidak valid' 
            });
        }

        const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = req.body;
        
        const tahunAjaranAktif = req.idTahunAjaranInduk;

        const existingRows = await mapelModel.getById(idNum);
        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mata pelajaran tidak ditemukan.'
            });
        }

        const oldData = existingRows[0];
        const tahunAjaranId = oldData.tahun_ajaran_id;

        if (!tahunAjaranAktif || tahunAjaranId !== tahunAjaranAktif) {
            return res.status(403).json({
                success: false,
                message: 'Tidak dapat mengedit mata pelajaran dari tahun ajaran yang tidak aktif.'
            });
        }

        const trimmedKodeMapel = (kode_mapel || '').toString().trim();
        const trimmedNamaMapel = (nama_mapel || '').toString().trim();
        const trimmedJenis = (jenis || '').toString().trim();
        const trimmedKurikulum = (kurikulum || '').toString().trim();

        if (!trimmedKodeMapel || !trimmedNamaMapel || !trimmedJenis || !trimmedKurikulum) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kode mapel, nama mapel, jenis, dan kurikulum wajib diisi.' 
            });
        }

        const kodeMapelNormalized = trimmedKodeMapel.toUpperCase();
        const namaMapelNormalized = trimmedNamaMapel;
        const kurikulumNormalized = trimmedKurikulum;
        const jenisNormalized = trimmedJenis.toLowerCase();

        if (!/^[A-Z0-9-]{2,20}$/.test(kodeMapelNormalized)) {
            return res.status(400).json({
                success: false,
                message: 'Kode mapel harus 2-20 karakter, hanya huruf kapital, angka, dan strip (-).'
            });
        }

        if (namaMapelNormalized.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Nama mata pelajaran minimal 3 karakter.'
            });
        }

        if (!['wajib', 'pilihan'].includes(jenisNormalized)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis mapel harus "wajib" atau "pilihan".'
            });
        }

        const kodeSudahAda = await mapelModel.isKodeMapelExist(kodeMapelNormalized, tahunAjaranId, idNum);
        if (kodeSudahAda) {
            return res.status(400).json({
                success: false,
                message: `Kode mapel "${kodeMapelNormalized}" sudah digunakan oleh mata pelajaran lain.`
            });
        }

        const namaSudahAda = await mapelModel.isNamaMapelExist(namaMapelNormalized, tahunAjaranId, idNum);
        if (namaSudahAda) {
            return res.status(400).json({
                success: false,
                message: `Nama mapel "${namaMapelNormalized}" sudah ada (kode: ${namaSudahAda.kode_mapel}).`
            });
        }

        let urutanRaporFinal = null;
        if (urutan_rapor !== null && urutan_rapor !== undefined && urutan_rapor !== '') {
            const urutanRaporNum = Number(urutan_rapor);
            
            if (isNaN(urutanRaporNum) || !Number.isInteger(urutanRaporNum)) {
                return res.status(400).json({
                    success: false,
                    message: 'Urutan rapor harus berupa bilangan bulat.'
                });
            }

            if (urutanRaporNum < 1 || urutanRaporNum > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Urutan rapor harus antara 1 sampai 100.'
                });
            }

            const urutanSudahAda = await mapelModel.isUrutanRaporExist(urutanRaporNum, tahunAjaranId, idNum);
            if (urutanSudahAda) {
                return res.status(400).json({
                    success: false,
                    message: `Urutan rapor "${urutanRaporNum}" sudah digunakan oleh "${urutanSudahAda.nama_mapel}". Gunakan urutan lain.`
                });
            }

            urutanRaporFinal = urutanRaporNum;
        }

        const result = await mapelModel.update(idNum, {
            kode_mapel: kodeMapelNormalized,
            nama_mapel: namaMapelNormalized,
            jenis: jenisNormalized,
            kurikulum: kurikulumNormalized,
            urutan_rapor: urutanRaporFinal
        });

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mata pelajaran tidak ditemukan' 
            });
        }

        res.json({ 
            success: true, 
            message: `Mata pelajaran "${namaMapelNormalized}" berhasil diperbarui.` 
        });

    } catch (err) {
        console.error('Error edit mata pelajaran:', err);

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'Kode, nama, atau urutan rapor sudah terdaftar.'
            });
        }

        if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819) {
            return res.status(400).json({
                success: false,
                message: 'Urutan rapor harus bernilai positif (lebih dari 0) atau kosong.'
            });
        }

        res.status(500).json({
            success: false,
            message: err.message || 'Gagal memperbarui mata pelajaran'
        });
    }
};

const hapusMataPelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        
        if (isNaN(idNum)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID tidak valid' 
            });
        }

        const tahunAjaranAktif = req.idTahunAjaranInduk;

        if (!tahunAjaranAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif.'
            });
        }

        const existingRows = await mapelModel.getById(idNum);
        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mata pelajaran tidak ditemukan.'
            });
        }

        const mapelData = existingRows[0];

        if (mapelData.tahun_ajaran_id !== tahunAjaranAktif) {
            return res.status(403).json({
                success: false,
                message: 'Tidak dapat menghapus mata pelajaran dari tahun ajaran yang tidak aktif.'
            });
        }

        const jumlahPembelajaran = await mapelModel.isUsedInPembelajaran(idNum);
        if (jumlahPembelajaran > 0) {
            return res.status(400).json({
                success: false,
                message: `Mata pelajaran ini tidak bisa dihapus karena sudah digunakan di ${jumlahPembelajaran} jadwal pembelajaran. Hapus atau pindahkan jadwal pembelajaran terlebih dahulu.`
            });
        }

        const jumlahNilai = await mapelModel.hasNilaiRapor(idNum);
        if (jumlahNilai > 0) {
            return res.status(400).json({
                success: false,
                message: `Mata pelajaran ini tidak bisa dihapus karena sudah memiliki ${jumlahNilai} data nilai rapor.`
            });
        }

        const result = await mapelModel.delete(idNum);
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mata pelajaran tidak ditemukan' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Mata pelajaran berhasil dihapus' 
        });

    } catch (err) {
        console.error('Error hapus mata pelajaran:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus mata pelajaran' 
        });
    }
};

module.exports = {
    getMataPelajaran,
    getMataPelajaranById,
    tambahMataPelajaran,
    editMataPelajaran,
    hapusMataPelajaran
};