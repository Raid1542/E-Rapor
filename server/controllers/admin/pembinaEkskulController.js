/**
 * Nama File: pembinaEkskulController.js
 * Fungsi: Controller CRUD pembina ekstrakurikuler + import Excel
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const pembinaEkskulModel = require('../../models/admin/pembinaEkskulModel');
const db = require('../../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

// Ambil daftar semua pembina ekstrakurikuler
const getPembinaEkskul = async (req, res) => {
    try {
        const pembinaList = await pembinaEkskulModel.getAll();
        res.json({ success: true, data: pembinaList });
    } catch (err) {
        console.error('Error get pembina ekskul:', err);
        res.status(500).json({ message: 'Gagal mengambil data pembina' });
    }
};

// Ambil detail pembina berdasarkan ID
const getPembinaEkskulById = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id, 10);

        if (isNaN(parsedId)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }

        const pembina = await pembinaEkskulModel.getById(parsedId);
        if (!pembina) {
            return res.status(404).json({ success: false, message: 'Pembina tidak ditemukan' });
        }

        res.json({ success: true, data: pembina });
    } catch (err) {
        console.error('Error get pembina by ID:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail pembina' });
    }
};

// Tambah pembina ekskul baru dengan validasi NIY/NUPTK duplikat
const tambahPembinaEkskul = async (req, res) => {
    const {
        nama_lengkap,
        niy,
        nuptk,
        tempat_lahir,
        tanggal_lahir,
        jenis_kelamin,
        alamat,
        no_telepon,
        status,
    } = req.body;

    // Validasi field wajib
    if (!nama_lengkap?.trim()) {
        return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi' });
    }
    if (!tempat_lahir?.trim()) {
        return res.status(400).json({ success: false, message: 'Tempat lahir wajib diisi' });
    }
    if (!tanggal_lahir) {
        return res.status(400).json({ success: false, message: 'Tanggal lahir wajib diisi' });
    }
    if (!jenis_kelamin) {
        return res.status(400).json({ success: false, message: 'Jenis kelamin wajib dipilih' });
    }

    // Validasi tanggal lahir
    const dob = new Date(tanggal_lahir);
    if (isNaN(dob.getTime())) {
        return res.status(400).json({ success: false, message: 'Format tanggal lahir tidak valid' });
    }
    if (dob > new Date()) {
        return res.status(400).json({ success: false, message: 'Tanggal lahir tidak boleh di masa depan' });
    }

    // Normalisasi status
    const validStatus = ['aktif', 'nonaktif'];
    const finalStatus = validStatus.includes(status?.toLowerCase().trim())
        ? status.toLowerCase().trim()
        : 'aktif';

    try {
        // Cek duplikasi NIY
        if (niy && niy.trim()) {
            const [existingNiy] = await db.execute(
                'SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE niy = ?',
                [niy.trim()]
            );
            if (existingNiy.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'NIY sudah terdaftar. Silakan gunakan NIY yang berbeda.',
                });
            }
        }

        // Cek duplikasi NUPTK
        if (nuptk && nuptk.trim()) {
            const [existingNuptk] = await db.execute(
                'SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE nuptk = ?',
                [nuptk.trim()]
            );
            if (existingNuptk.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'NUPTK sudah terdaftar. Silakan gunakan NUPTK yang berbeda.',
                });
            }
        }

        // Create pembina
        const id = await pembinaEkskulModel.create({
            nama_lengkap: nama_lengkap.trim(),
            niy: niy?.trim() || null,
            nuptk: nuptk?.trim() || null,
            tempat_lahir: tempat_lahir.trim(),
            tanggal_lahir,
            jenis_kelamin,
            alamat: alamat || null,
            no_telepon: no_telepon || null,
            status: finalStatus,
        });

        res.status(201).json({
            success: true,
            message: 'Pembina ekstrakurikuler berhasil ditambahkan',
            id,
        });
    } catch (err) {
        console.error('Error tambah pembina:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let duplicateField = 'Data';
            if (err.sqlMessage) {
                if (err.sqlMessage.includes('niy')) duplicateField = 'NIY';
                else if (err.sqlMessage.includes('nuptk')) duplicateField = 'NUPTK';
            }
            return res.status(400).json({
                success: false,
                message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.`,
            });
        }
        res.status(500).json({ success: false, message: 'Gagal menambah pembina' });
    }
};

// Update data pembina berdasarkan ID
const editPembinaEkskul = async (req, res) => {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId)) {
        return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const {
        nama_lengkap,
        niy,
        nuptk,
        tempat_lahir,
        tanggal_lahir,
        jenis_kelamin,
        alamat,
        no_telepon,
        status,
    } = req.body;

    // Validasi field wajib
    if (!nama_lengkap?.trim()) {
        return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi' });
    }
    if (!tempat_lahir?.trim()) {
        return res.status(400).json({ success: false, message: 'Tempat lahir wajib diisi' });
    }
    if (!tanggal_lahir) {
        return res.status(400).json({ success: false, message: 'Tanggal lahir wajib diisi' });
    }
    if (!jenis_kelamin) {
        return res.status(400).json({ success: false, message: 'Jenis kelamin wajib dipilih' });
    }

    // Validasi tanggal lahir
    const dob = new Date(tanggal_lahir);
    if (isNaN(dob.getTime())) {
        return res.status(400).json({ success: false, message: 'Format tanggal lahir tidak valid' });
    }
    if (dob > new Date()) {
        return res.status(400).json({ success: false, message: 'Tanggal lahir tidak boleh di masa depan' });
    }

    // Normalisasi status
    const validStatus = ['aktif', 'nonaktif'];
    const finalStatus = validStatus.includes(status?.toLowerCase().trim())
        ? status.toLowerCase().trim()
        : 'aktif';

    try {
        const success = await pembinaEkskulModel.update(parsedId, {
            nama_lengkap: nama_lengkap.trim(),
            niy: niy || null,
            nuptk: nuptk || null,
            tempat_lahir: tempat_lahir.trim(),
            tanggal_lahir,
            jenis_kelamin,
            alamat: alamat || null,
            no_telepon: no_telepon || null,
            status: finalStatus,
        });

        if (!success) {
            return res.status(404).json({ success: false, message: 'Pembina tidak ditemukan' });
        }

        res.json({ success: true, message: 'Data pembina berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit pembina:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data pembina' });
    }
};

// Import data pembina dari file Excel (.xlsx) dengan skip error per baris
const importPembinaEkskul = async (req, res) => {
    const connection = await db.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
        }

        // Baca file Excel
        const workbook = XLSX.readFile(req.file.path);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (data.length === 0) {
            throw new Error('File Excel kosong');
        }

        // Validasi kolom wajib
        const requiredCols = ['nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin'];
        const firstRow = data[0];

        for (const col of requiredCols) {
            if (!(col in firstRow)) {
                throw new Error(`Kolom wajib "${col}" tidak ditemukan di template`);
            }
        }

        await connection.beginTransaction();
        const skipped = [];
        let processedCount = 0;

        // Proses setiap baris dengan skip jika ada error
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;

            try {
                // Validasi data per baris
                if (!row.nama_lengkap || !row.tempat_lahir || !row.tanggal_lahir || !row.jenis_kelamin) {
                    skipped.push({
                        row: rowNum,
                        nama: row.nama_lengkap || '-',
                        reason: 'Data tidak lengkap (nama, tempat lahir, tanggal lahir, jenis kelamin wajib diisi)',
                    });
                    continue;
                }

                // Validasi jenis kelamin
                if (!['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
                    skipped.push({
                        row: rowNum,
                        nama: row.nama_lengkap,
                        reason: `Jenis kelamin harus "Laki-laki" atau "Perempuan", ditemukan: "${row.jenis_kelamin}"`,
                    });
                    continue;
                }

                // Cek duplikasi NIY
                const [existingNiy] = row.niy
                    ? await connection.execute(
                        'SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE niy = ?',
                        [row.niy]
                    )
                    : [[]];

                // Cek duplikasi NUPTK
                const [existingNuptk] = row.nuptk
                    ? await connection.execute(
                        'SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE nuptk = ?',
                        [row.nuptk]
                    )
                    : [[]];

                if (existingNiy.length > 0 || existingNuptk.length > 0) {
                    let reason = 'Data duplikat';
                    if (existingNiy.length > 0) reason = 'NIY sudah terdaftar';
                    else if (existingNuptk.length > 0) reason = 'NUPTK sudah terdaftar';

                    skipped.push({
                        row: rowNum,
                        nama: row.nama_lengkap,
                        reason: reason,
                    });
                    continue;
                }

                // Insert data pembina
                await pembinaEkskulModel.create(
                    {
                        nama_lengkap: row.nama_lengkap,
                        niy: row.niy || null,
                        nuptk: row.nuptk || null,
                        tempat_lahir: row.tempat_lahir,
                        tanggal_lahir: row.tanggal_lahir,
                        jenis_kelamin: row.jenis_kelamin,
                        alamat: row.alamat || null,
                        no_telepon: row.no_telepon || null,
                        status: 'aktif',
                    },
                    connection
                );

                processedCount++;
            } catch (rowErr) {
                // Tangani error tak terduga per baris
                skipped.push({
                    row: rowNum,
                    nama: row.nama_lengkap || '-',
                    reason: rowErr.message || 'Gagal memproses data',
                });
            }
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        // Response dengan info skipped
        res.json({
            success: true,
            message:
                skipped.length > 0
                    ? `Import selesai: ${processedCount} berhasil, ${skipped.length} dilewati`
                    : `Import berhasil: ${processedCount} data pembina ditambahkan`,
            total: processedCount,
            skipped: skipped,
        });
    } catch (err) {
        await connection.rollback();
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Import pembina error:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Gagal mengimport data',
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    getPembinaEkskul,
    getPembinaEkskulById,
    tambahPembinaEkskul,
    editPembinaEkskul,
    importPembinaEkskul,
};