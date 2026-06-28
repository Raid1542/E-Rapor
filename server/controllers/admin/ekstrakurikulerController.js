/**
 * Nama File: ekstrakurikulerController.js
 * Fungsi: Controller untuk CRUD ekstrakurikuler per semester, manajemen peserta,
 *         dan dropdown pembina. Semua operasi divalidasi berdasarkan semester_id.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const ekstrakurikulerModel = require('../../models/admin/ekstrakurikulerModel');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: VALIDATE SEMESTER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validasi semester_id dari request.
 * @param {number|string} semesterId - ID semester yang akan divalidasi
 * @returns {Object} { valid, message?, data? }
 */
const validateSemesterId = async (semesterId) => {
    if (!semesterId || isNaN(Number(semesterId))) {
        return { valid: false, message: 'Semester wajib dipilih' };
    }

    const [rows] = await db.execute(`
        SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status
        FROM tahun_ajaran 
        WHERE id_tahun_ajaran = ?
    `, [Number(semesterId)]);

    if (rows.length === 0) {
        return { valid: false, message: 'Semester tidak valid' };
    }

    return {
        valid: true,
        data: {
            semester_id: rows[0].id_tahun_ajaran,
            semester: rows[0].semester,
            is_aktif: rows[0].status === 'aktif'
        }
    };
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET ALL EKSTRAKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/ekstrakurikuler
 * Ambil daftar ekstrakurikuler berdasarkan semester.
 */
const getEkskul = async (req, res) => {
    try {
        const { semester_id } = req.query;
        
        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const ekskulList = await ekstrakurikulerModel.getAllByTahunAjaran(validation.data.semester_id);
        
        res.json({ 
            success: true, 
            data: ekskulList,
            semester_info: validation.data
        });
    } catch (err) {
        console.error('Error get ekstrakurikuler:', err);
        res.status(500).json({ message: 'Gagal mengambil data ekstrakurikuler' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. CREATE EKSTRAKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/ekstrakurikuler
 * Tambah ekstrakurikuler baru dengan validasi pembina dan duplikasi nama.
 * 
 * Validasi:
 *   - Semester harus aktif
 *   - Nama ekskul tidak boleh duplikat di semester yang sama
 *   - 1 pembina hanya boleh mengampu 1 ekskul per semester
 */
const tambahEkskul = async (req, res) => {
    try {
        const { nama_ekskul, pembina_id, keterangan, semester_id } = req.body;

        // Validasi semester
        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        if (!validation.data.is_aktif) {
            return res.status(403).json({ 
                message: `Tidak dapat menambah ekskul di semester ${validation.data.semester} yang tidak aktif` 
            });
        }

        // Validasi nama ekskul
        if (!nama_ekskul || !nama_ekskul.trim()) {
            return res.status(400).json({ message: 'Nama ekstrakurikuler wajib diisi' });
        }

        // Validasi pembina
        if (pembina_id) {
            const pembinaList = await ekstrakurikulerModel.getAllPembinaAktif();
            const pembinaValid = pembinaList.find(p => p.id === Number(pembina_id));
            if (!pembinaValid) {
                return res.status(400).json({ message: 'Pembina tidak valid atau tidak aktif' });
            }

            // Cek apakah pembina sudah mengampu ekskul lain
            const existingEkskul = await ekstrakurikulerModel.isPembinaAlreadyAssigned(
                Number(pembina_id),
                validation.data.semester_id
            );

            if (existingEkskul) {
                return res.status(400).json({ 
                    message: `Pembina "${pembinaValid.nama}" sudah mengampu ekstrakurikuler "${existingEkskul.nama_ekskul}" di semester ini. 1 pembina hanya boleh mengampu 1 ekstrakurikuler.` 
                });
            }
        }

        // Cek duplikasi nama
        const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
            nama_ekskul,
            validation.data.semester_id
        );
        if (isDuplicate) {
            return res.status(400).json({ 
                message: `Ekstrakurikuler "${nama_ekskul}" sudah ada di semester ini` 
            });
        }

        // Create ekskul
        const ekskulId = await ekstrakurikulerModel.create({
            nama_ekskul: nama_ekskul.trim(),
            pembina_id: pembina_id || null,
            keterangan: keterangan || null,
            tahun_ajaran_id: validation.data.semester_id,
        });

        res.status(201).json({
            success: true,
            message: 'Ekstrakurikuler berhasil ditambahkan',
            id: ekskulId
        });
    } catch (err) {
        console.error('Error tambah ekstrakurikuler:', err);
        res.status(500).json({ message: err.message || 'Gagal menambah ekstrakurikuler' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPDATE EKSTRAKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/admin/ekstrakurikuler/:id
 * Update data ekstrakurikuler dengan validasi pembina dan duplikasi nama.
 */
const editEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_ekskul, pembina_id, keterangan, semester_id } = req.body;

        // Validasi semester
        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        if (!validation.data.is_aktif) {
            return res.status(403).json({ 
                message: `Tidak dapat mengedit ekskul di semester ${validation.data.semester} yang tidak aktif` 
            });
        }

        // Validasi nama ekskul
        if (!nama_ekskul || !nama_ekskul.trim()) {
            return res.status(400).json({ message: 'Nama ekstrakurikuler wajib diisi' });
        }

        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }

        // Validasi pembina
        if (pembina_id) {
            const pembinaList = await ekstrakurikulerModel.getAllPembinaAktif();
            const pembinaValid = pembinaList.find(p => p.id === Number(pembina_id));
            if (!pembinaValid) {
                return res.status(400).json({ message: 'Pembina tidak valid atau tidak aktif' });
            }

            // Cek apakah pembina sudah mengampu ekskul lain (exclude current ekskul)
            const existingEkskul = await ekstrakurikulerModel.isPembinaAlreadyAssigned(
                Number(pembina_id),
                validation.data.semester_id,
                idNum
            );

            if (existingEkskul) {
                return res.status(400).json({ 
                    message: `Pembina "${pembinaValid.nama}" sudah mengampu ekstrakurikuler "${existingEkskul.nama_ekskul}" di semester ini. 1 pembina hanya boleh mengampu 1 ekstrakurikuler.` 
                });
            }
        }

        // Cek keberadaan ekskul
        const ekskulLama = await ekstrakurikulerModel.getById(idNum);
        if (!ekskulLama || ekskulLama.tahun_ajaran_id !== validation.data.semester_id) {
            return res.status(404).json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }

        // Cek duplikasi nama (exclude current ekskul)
        const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
            nama_ekskul,
            validation.data.semester_id,
            idNum
        );
        if (isDuplicate) {
            return res.status(400).json({ message: `Nama "${nama_ekskul}" sudah digunakan` });
        }

        // Update ekskul
        const success = await ekstrakurikulerModel.update(idNum, {
            nama_ekskul: nama_ekskul.trim(),
            pembina_id: pembina_id || null,
            keterangan: keterangan || null,
            tahun_ajaran_id: validation.data.semester_id,
        });

        if (!success) {
            return res.status(400).json({ message: 'Gagal memperbarui data ekstrakurikuler' });
        }

        res.json({
            success: true,
            message: 'Data ekstrakurikuler berhasil diperbarui'
        });
    } catch (err) {
        console.error('Error edit ekstrakurikuler:', err);
        res.status(500).json({ message: err.message || 'Gagal memperbarui ekstrakurikuler' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. DELETE EKSTRAKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/admin/ekstrakurikuler/:id
 * Hapus ekstrakurikuler berdasarkan ID.
 */
const hapusEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const { semester_id } = req.query;

        // Validasi semester
        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }

        // Cek keberadaan ekskul
        const ekskul = await ekstrakurikulerModel.getById(idNum);
        if (!ekskul || ekskul.tahun_ajaran_id !== validation.data.semester_id) {
            return res.status(404).json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }

        // Delete ekskul
        const success = await ekstrakurikulerModel.deleteById(idNum);
        if (!success) {
            return res.status(400).json({ message: 'Gagal menghapus ekstrakurikuler' });
        }

        res.json({
            success: true,
            message: 'Ekstrakurikuler berhasil dihapus'
        });
    } catch (err) {
        console.error('Error hapus ekstrakurikuler:', err);
        res.status(500).json({ message: err.message || 'Gagal menghapus ekstrakurikuler' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. GET PESERTA BY EKSTRAKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/ekstrakurikuler/:id/anggota
 * Ambil daftar peserta ekstrakurikuler tertentu.
 */
const getPesertaByEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const { semester_id } = req.query;

        // Validasi semester
        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID ekskul tidak valid' });
        }

        // Cek keberadaan ekskul
        const ekskul = await ekstrakurikulerModel.getById(idNum);
        if (!ekskul) {
            return res.status(404).json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }

        // Ambil peserta
        const peserta = await ekstrakurikulerModel.getPesertaByEkskul(idNum, validation.data.semester_id);

        res.json({
            success: true,
            data: {
                ekskul: {
                    id: ekskul.id_ekskul,
                    nama_ekskul: ekskul.nama_ekskul,
                    pembina_id: ekskul.pembina_id,
                    nama_pembina: ekskul.nama_pembina,
                    tahun_ajaran_id: ekskul.tahun_ajaran_id
                },
                peserta: peserta,
                semester_info: validation.data
            }
        });
    } catch (err) {
        console.error('Error get peserta by ekskul:', err);
        res.status(500).json({ message: 'Gagal mengambil daftar peserta ekstrakurikuler' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. GET EKSTRAKURIKULER BY SISWA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/siswa/:siswaId/ekstrakurikuler
 * Ambil daftar ekstrakurikuler yang diikuti siswa tertentu.
 */
const getEkskulBySiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { semester_id } = req.query;

        // Validasi semester
        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const siswaIdNum = Number(siswaId);
        if (isNaN(siswaIdNum)) {
            return res.status(400).json({ message: 'ID siswa tidak valid' });
        }

        // Ambil ekskul siswa
        const ekskulList = await ekstrakurikulerModel.getEkskulSiswa(siswaIdNum, validation.data.semester_id);
        
        res.json({ 
            success: true, 
            data: ekskulList,
            semester_info: validation.data
        });
    } catch (err) {
        console.error('Error get ekskul by siswa:', err);
        res.status(500).json({ message: 'Gagal mengambil data ekstrakurikuler siswa' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. GET PEMBIN DROPDOWN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/ekstrakurikuler/pembina-dropdown
 * Ambil daftar pembina aktif untuk dropdown form ekskul.
 */
const getPembinaDropdown = async (req, res) => {
    try {
        const pembinaList = await ekstrakurikulerModel.getAllPembinaAktif();
        res.json({ success: true, data: pembinaList });
    } catch (err) {
        console.error('Error get pembina dropdown:', err);
        res.status(500).json({ message: 'Gagal mengambil data pembina' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    getEkskul,
    tambahEkskul,
    editEkskul,
    hapusEkskul,
    getPesertaByEkskul,
    getEkskulBySiswa,
    getPembinaDropdown
};