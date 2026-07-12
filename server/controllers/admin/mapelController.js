/**
 * Nama File: mataPelajaranController.js
 * Fungsi: Controller CRUD mata pelajaran per semester (validasi kode/nama/urutan)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const mapelModel = require('../../models/admin/mapelModel');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Ambil status semester berdasarkan ID
const getSemesterStatus = async (semesterId) => {
    const [rows] = await db.execute(
        'SELECT status, semester, tahun_ajaran, id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?',
        [semesterId]
    );
    return rows.length > 0 ? rows[0] : null;
};

// Cek apakah semester aktif
const isSemesterActive = async (semesterId) => {
    const semester = await getSemesterStatus(semesterId);
    return semester && semester.status === 'aktif';
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET ALL MATA PELAJARAN
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil daftar mata pelajaran berdasarkan semester
const getMataPelajaran = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id || isNaN(Number(tahun_ajaran_id))) {
            return res.status(400).json({ success: false, message: 'tahun_ajaran_id wajib diisi dan harus angka' });
        }
        const semesterId = Number(tahun_ajaran_id);

        const semesterInfo = await getSemesterStatus(semesterId);
        if (!semesterInfo) return res.status(404).json({ success: false, message: 'Semester tidak ditemukan' });

        const rows = await mapelModel.getAllByTahunAjaran(semesterId);
        res.json({ 
            success: true, data: rows,
            semester_info: { id: semesterId, semester: semesterInfo.semester, tahun_ajaran: semesterInfo.tahun_ajaran, is_active: semesterInfo.status === 'aktif' }
        });
    } catch (err) {
        console.error('Error get mata pelajaran:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data mata pelajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET MATA PELAJARAN BY ID
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil detail mata pelajaran berdasarkan ID
const getMataPelajaranById = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) return res.status(400).json({ success: false, message: 'ID tidak valid' });
        const rows = await mapelModel.getById(idNum);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error get mata pelajaran by ID:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail mata pelajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. CREATE MATA PELAJARAN
// ═════════════════════════════════════════════════════════════════════════════

// POST: Tambah mata pelajaran baru (validasi kode, nama, urutan rapor, duplikasi)
const tambahMataPelajaran = async (req, res) => {
    try {
        const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor, semester_id } = req.body;

        // Ambil semester_id
        let semesterId = semester_id ? Number(semester_id) : null;
        if (!semesterId && req.idTahunAjaranInduk) {
            const [rows] = await db.execute(
                'SELECT id_tahun_ajaran FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND status = \'aktif\' LIMIT 1',
                [req.idTahunAjaranInduk]
            );
            semesterId = rows.length > 0 ? rows[0].id_tahun_ajaran : null;
        }
        if (!semesterId) return res.status(400).json({ success: false, message: 'Semester ID tidak ditemukan. Pastikan ada semester aktif.' });

        // Cek semester aktif
        const isActive = await isSemesterActive(semesterId);
        if (!isActive) return res.status(403).json({ success: false, message: 'Tidak dapat menambah mata pelajaran di semester yang tidak aktif.' });

        // Validasi input wajib
        if (!kode_mapel || !nama_mapel || !jenis || !kurikulum) {
            return res.status(400).json({ success: false, message: 'Kode mapel, nama mapel, jenis, dan kurikulum wajib diisi.' });
        }

        // Normalisasi input
        const kodeMapelNormalized = kode_mapel.trim().toUpperCase();
        const namaMapelNormalized = nama_mapel.trim();
        const kurikulumNormalized = kurikulum.trim();
        const jenisNormalized = jenis.trim().toLowerCase();

        // Validasi format kode mapel
        if (!/^[A-Z0-9-]{2,20}$/.test(kodeMapelNormalized)) {
            return res.status(400).json({ success: false, message: 'Kode mapel harus 2-20 karakter, hanya huruf kapital, angka, dan strip (-).' });
        }
        if (namaMapelNormalized.length < 3) {
            return res.status(400).json({ success: false, message: 'Nama mata pelajaran minimal 3 karakter.' });
        }
        if (!['wajib', 'pilihan'].includes(jenisNormalized)) {
            return res.status(400).json({ success: false, message: 'Jenis mapel harus "wajib" atau "pilihan".' });
        }

        // Cek duplikasi kode & nama
        const kodeSudahAda = await mapelModel.isKodeMapelExist(kodeMapelNormalized, semesterId);
        if (kodeSudahAda) return res.status(400).json({ success: false, message: `Kode mapel "${kodeMapelNormalized}" sudah digunakan pada semester ini.` });
        const namaSudahAda = await mapelModel.isNamaMapelExist(namaMapelNormalized, semesterId);
        if (namaSudahAda) return res.status(400).json({ success: false, message: `Nama mapel "${namaMapelNormalized}" sudah ada (kode: ${namaSudahAda.kode_mapel}).` });

        // Validasi urutan rapor
        let urutanRaporFinal = null;
        if (urutan_rapor !== null && urutan_rapor !== undefined && urutan_rapor !== '') {
            const urutanRaporNum = Number(urutan_rapor);
            if (isNaN(urutanRaporNum) || !Number.isInteger(urutanRaporNum)) {
                return res.status(400).json({ success: false, message: 'Urutan rapor harus berupa bilangan bulat.' });
            }
            if (urutanRaporNum < 1 || urutanRaporNum > 100) {
                return res.status(400).json({ success: false, message: 'Urutan rapor harus antara 1 sampai 100.' });
            }
            const urutanSudahAda = await mapelModel.isUrutanRaporExist(urutanRaporNum, semesterId);
            if (urutanSudahAda) {
                return res.status(400).json({ success: false, message: `Urutan rapor "${urutanRaporNum}" sudah digunakan oleh "${urutanSudahAda.nama_mapel}".` });
            }
            urutanRaporFinal = urutanRaporNum;
        }

        // Create mapel
        const result = await mapelModel.create({
            kode_mapel: kodeMapelNormalized, nama_mapel: namaMapelNormalized, jenis: jenisNormalized,
            kurikulum: kurikulumNormalized, tahun_ajaran_id: semesterId, urutan_rapor: urutanRaporFinal
        });

        res.status(201).json({ success: true, message: `Mata pelajaran "${namaMapelNormalized}" berhasil ditambahkan.`, id: result.insertId });
    } catch (err) {
        console.error('Error tambah mata pelajaran:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ success: false, message: 'Kode, nama, atau urutan rapor sudah terdaftar di semester ini.' });
        }
        res.status(500).json({ success: false, message: err.message || 'Gagal menambah mata pelajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. UPDATE MATA PELAJARAN
// ═════════════════════════════════════════════════════════════════════════════

// PUT: Update data mata pelajaran dengan validasi lengkap
const editMataPelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) return res.status(400).json({ success: false, message: 'ID tidak valid' });

        const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = req.body;

        // Ambil data mapel existing
        const existingRows = await mapelModel.getById(idNum);
        if (existingRows.length === 0) return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan.' });

        const oldData = existingRows[0];
        const semesterId = oldData.tahun_ajaran_id;

        // Cek semester aktif
        const isActive = await isSemesterActive(semesterId);
        if (!isActive) return res.status(403).json({ success: false, message: 'Tidak dapat mengedit mata pelajaran di semester yang tidak aktif.' });

        // Validasi input
        const trimmedKodeMapel = (kode_mapel || '').toString().trim();
        const trimmedNamaMapel = (nama_mapel || '').toString().trim();
        const trimmedJenis = (jenis || '').toString().trim();
        const trimmedKurikulum = (kurikulum || '').toString().trim();

        if (!trimmedKodeMapel || !trimmedNamaMapel || !trimmedJenis || !trimmedKurikulum) {
            return res.status(400).json({ success: false, message: 'Kode mapel, nama mapel, jenis, dan kurikulum wajib diisi.' });
        }

        // Normalisasi input
        const kodeMapelNormalized = trimmedKodeMapel.toUpperCase();
        const namaMapelNormalized = trimmedNamaMapel;
        const jenisNormalized = trimmedJenis.toLowerCase();

        // Validasi format
        if (!/^[A-Z0-9-]{2,20}$/.test(kodeMapelNormalized)) {
            return res.status(400).json({ success: false, message: 'Kode mapel harus 2-20 karakter, hanya huruf kapital, angka, dan strip (-).' });
        }
        if (namaMapelNormalized.length < 3) {
            return res.status(400).json({ success: false, message: 'Nama mata pelajaran minimal 3 karakter.' });
        }
        if (!['wajib', 'pilihan'].includes(jenisNormalized)) {
            return res.status(400).json({ success: false, message: 'Jenis mapel harus "wajib" atau "pilihan".' });
        }

        // Cek duplikasi (exclude current mapel)
        const kodeSudahAda = await mapelModel.isKodeMapelExist(kodeMapelNormalized, semesterId, idNum);
        if (kodeSudahAda) return res.status(400).json({ success: false, message: `Kode mapel "${kodeMapelNormalized}" sudah digunakan oleh mata pelajaran lain.` });
        const namaSudahAda = await mapelModel.isNamaMapelExist(namaMapelNormalized, semesterId, idNum);
        if (namaSudahAda) return res.status(400).json({ success: false, message: `Nama mapel "${namaMapelNormalized}" sudah ada.` });

        // Validasi urutan rapor
        let urutanRaporFinal = null;
        if (urutan_rapor !== null && urutan_rapor !== undefined && urutan_rapor !== '') {
            const urutanRaporNum = Number(urutan_rapor);
            if (isNaN(urutanRaporNum) || !Number.isInteger(urutanRaporNum)) {
                return res.status(400).json({ success: false, message: 'Urutan rapor harus berupa bilangan bulat.' });
            }
            if (urutanRaporNum < 1 || urutanRaporNum > 100) {
                return res.status(400).json({ success: false, message: 'Urutan rapor harus antara 1 sampai 100.' });
            }
            const urutanSudahAda = await mapelModel.isUrutanRaporExist(urutanRaporNum, semesterId, idNum);
            if (urutanSudahAda) {
                return res.status(400).json({ success: false, message: `Urutan rapor "${urutanRaporNum}" sudah digunakan oleh "${urutanSudahAda.nama_mapel}".` });
            }
            urutanRaporFinal = urutanRaporNum;
        }

        // Update mapel
        const result = await mapelModel.update(idNum, {
            kode_mapel: kodeMapelNormalized, nama_mapel: namaMapelNormalized, jenis: jenisNormalized,
            kurikulum: trimmedKurikulum, urutan_rapor: urutanRaporFinal
        });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan' });

        res.json({ success: true, message: `Mata pelajaran "${namaMapelNormalized}" berhasil diperbarui.` });
    } catch (err) {
        console.error('Error edit mata pelajaran:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ success: false, message: 'Kode, nama, atau urutan rapor sudah terdaftar.' });
        }
        res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui mata pelajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. DELETE MATA PELAJARAN
// ═════════════════════════════════════════════════════════════════════════════

// DELETE: Hapus mata pelajaran dengan validasi dependensi (pembelajaran & nilai rapor)
const hapusMataPelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) return res.status(400).json({ success: false, message: 'ID tidak valid' });

        const existingRows = await mapelModel.getById(idNum);
        if (existingRows.length === 0) return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan.' });

        const mapelData = existingRows[0];
        const semesterId = mapelData.tahun_ajaran_id;

        // Cek semester aktif
        const isActive = await isSemesterActive(semesterId);
        if (!isActive) return res.status(403).json({ success: false, message: 'Tidak dapat menghapus mata pelajaran di semester yang tidak aktif.' });

        // Cek dependensi: pembelajaran
        const jumlahPembelajaran = await mapelModel.isUsedInPembelajaran(idNum);
        if (jumlahPembelajaran > 0) {
            return res.status(400).json({ success: false, message: `Mata pelajaran ini tidak bisa dihapus karena sudah digunakan di ${jumlahPembelajaran} jadwal pembelajaran.` });
        }

        // Cek dependensi: nilai rapor
        const jumlahNilai = await mapelModel.hasNilaiRapor(idNum);
        if (jumlahNilai > 0) {
            return res.status(400).json({ success: false, message: `Mata pelajaran ini tidak bisa dihapus karena sudah memiliki ${jumlahNilai} data nilai rapor.` });
        }

        // Delete mapel
        const result = await mapelModel.delete(idNum);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan' });

        res.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
    } catch (err) {
        console.error('Error hapus mata pelajaran:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus mata pelajaran' });
    }
};

module.exports = { getMataPelajaran, getMataPelajaranById, tambahMataPelajaran, editMataPelajaran, hapusMataPelajaran };