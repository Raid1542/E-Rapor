/**
 * Nama File: pembinaEkskulController.js
 * Fungsi: Controller CRUD pembina ekstrakurikuler + import Excel.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const pembinaEkskulModel = require('../../models/admin/pembinaEkskulModel');
const db = require('../../config/db');
const ExcelJS = require('exceljs');
const fs = require('fs');

/**
 * Ambil daftar semua pembina ekstrakurikuler.
 */
exports.getPembinaEkskul = async (req, res) => {
    try {
        const pembinaList = await pembinaEkskulModel.getAll();
        res.json({ success: true, data: pembinaList });
    } catch (err) {
        res.status(500).json({ message: 'Gagal mengambil data pembina: ' + err.message });
    }
};

/**
 * Ambil detail pembina berdasarkan ID.
 */
exports.getPembinaEkskulById = async (req, res) => {
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
        res.status(500).json({ success: false, message: 'Gagal mengambil detail pembina: ' + err.message });
    }
};

/**
 * Tambah pembina ekskul baru dengan validasi NIY/NUPTK duplikat.
 */
exports.tambahPembinaEkskul = async (req, res) => {
    const {
        nama_lengkap,
        niy,
        nuptk,
        tempat_lahir,
        tanggal_lahir,
        jenis_kelamin,
        alamat,
        no_telepon,
        status
    } = req.body;

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

    const dob = new Date(tanggal_lahir);
    if (isNaN(dob.getTime())) {
        return res.status(400).json({ success: false, message: 'Format tanggal lahir tidak valid' });
    }
    if (dob > new Date()) {
        return res.status(400).json({ success: false, message: 'Tanggal lahir tidak boleh di masa depan' });
    }

    const validStatus = ['aktif', 'nonaktif'];
    const finalStatus = validStatus.includes(status?.toLowerCase().trim())
        ? status.toLowerCase().trim()
        : 'aktif';

    try {
        if (niy && niy.trim()) {
            const [existingNiy] = await db.execute(
                'SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE niy = ?',
                [niy.trim()]
            );
            if (existingNiy.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'NIY sudah terdaftar. Silakan gunakan NIY yang berbeda.'
                });
            }
        }

        if (nuptk && nuptk.trim()) {
            const [existingNuptk] = await db.execute(
                'SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE nuptk = ?',
                [nuptk.trim()]
            );
            if (existingNuptk.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'NUPTK sudah terdaftar. Silakan gunakan NUPTK yang berbeda.'
                });
            }
        }

        const id = await pembinaEkskulModel.create({
            nama_lengkap: nama_lengkap.trim(),
            niy: niy?.trim() || null,
            nuptk: nuptk?.trim() || null,
            tempat_lahir: tempat_lahir.trim(),
            tanggal_lahir,
            jenis_kelamin,
            alamat: alamat || null,
            no_telepon: no_telepon || null,
            status: finalStatus
        });

        res.status(201).json({
            success: true,
            message: 'Pembina ekstrakurikuler berhasil ditambahkan',
            id
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let duplicateField = 'Data';
            if (err.sqlMessage) {
                if (err.sqlMessage.includes('niy')) duplicateField = 'NIY';
                else if (err.sqlMessage.includes('nuptk')) duplicateField = 'NUPTK';
            }
            return res.status(400).json({
                success: false,
                message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.`
            });
        }
        res.status(500).json({ success: false, message: 'Gagal menambah pembina: ' + err.message });
    }
};

/**
 * Update data pembina berdasarkan ID.
 */
exports.editPembinaEkskul = async (req, res) => {
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
        status
    } = req.body;

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

    const dob = new Date(tanggal_lahir);
    if (isNaN(dob.getTime())) {
        return res.status(400).json({ success: false, message: 'Format tanggal lahir tidak valid' });
    }
    if (dob > new Date()) {
        return res.status(400).json({ success: false, message: 'Tanggal lahir tidak boleh di masa depan' });
    }

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
            status: finalStatus
        });

        if (!success) {
            return res.status(404).json({ success: false, message: 'Pembina tidak ditemukan' });
        }

        res.json({ success: true, message: 'Data pembina berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui data pembina: ' + err.message });
    }
};

/**
 * Import data pembina dari file Excel (.xlsx) 
 */
exports.importPembinaEkskul = async (req, res) => {
    const connection = await db.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            throw new Error('File Excel kosong atau tidak ada data');
        }

        // Ambil header dinamis
        const headers = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = String(cell.value || '').toLowerCase().trim();
        });

        const colMap = {};
        headers.forEach((header, idx) => {
            if (header) colMap[header] = idx;
        });

        const requiredCols = ['nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin'];
        for (const col of requiredCols) {
            if (!(col in colMap)) {
                throw new Error(`Kolom wajib "${col}" tidak ditemukan di template`);
            }
        }

        await connection.beginTransaction();
        const skipped = [];
        let processedCount = 0;

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowNum = i;
            const getCellVal = (colName) => colName in colMap ? row.getCell(colMap[colName] + 1)?.value : null;

            const rowData = {
                nama_lengkap: getCellVal('nama_lengkap'),
                tempat_lahir: getCellVal('tempat_lahir'),
                tanggal_lahir: getCellVal('tanggal_lahir'),
                jenis_kelamin: getCellVal('jenis_kelamin'),
                niy: getCellVal('niy'),
                nuptk: getCellVal('nuptk'),
                alamat: getCellVal('alamat'),
                no_telepon: getCellVal('no_telepon')
            };

            try {
                if (!rowData.nama_lengkap || !rowData.tempat_lahir || !rowData.tanggal_lahir || !rowData.jenis_kelamin) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap || '-', reason: 'Data tidak lengkap (nama, tempat lahir, tanggal lahir, jenis kelamin wajib diisi)' });
                    continue;
                }

                if (!['Laki-laki', 'Perempuan'].includes(rowData.jenis_kelamin)) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: `Jenis kelamin harus "Laki-laki" atau "Perempuan", ditemukan: "${rowData.jenis_kelamin}"` });
                    continue;
                }

                let tanggal_lahir = rowData.tanggal_lahir;
                if (tanggal_lahir instanceof Date) {
                    tanggal_lahir = `${tanggal_lahir.getFullYear()}-${String(tanggal_lahir.getMonth() + 1).padStart(2, '0')}-${String(tanggal_lahir.getDate()).padStart(2, '0')}`;
                } else if (typeof tanggal_lahir === 'number') {
                    const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
                    if (!isNaN(date.getTime())) {
                        tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    } else {
                        skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: 'Format tanggal lahir tidak valid' });
                        continue;
                    }
                } else if (typeof tanggal_lahir === 'string') {
                    tanggal_lahir = tanggal_lahir.trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                        skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: 'Format tanggal lahir harus YYYY-MM-DD' });
                        continue;
                    }
                } else {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: 'Tanggal lahir wajib diisi' });
                    continue;
                }

                const [existingNiy] = rowData.niy ? await connection.execute('SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE niy = ?', [String(rowData.niy).trim()]) : [[]];
                const [existingNuptk] = rowData.nuptk ? await connection.execute('SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE nuptk = ?', [String(rowData.nuptk).trim()]) : [[]];

                if (existingNiy.length > 0 || existingNuptk.length > 0) {
                    let reason = 'Data duplikat';
                    if (existingNiy.length > 0) reason = 'NIY sudah terdaftar';
                    else if (existingNuptk.length > 0) reason = 'NUPTK sudah terdaftar';
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason });
                    continue;
                }

                await pembinaEkskulModel.create(
                    {
                        nama_lengkap: String(rowData.nama_lengkap).trim(),
                        niy: rowData.niy ? String(rowData.niy).trim() : null,
                        nuptk: rowData.nuptk ? String(rowData.nuptk).trim() : null,
                        tempat_lahir: String(rowData.tempat_lahir).trim(),
                        tanggal_lahir,
                        jenis_kelamin: rowData.jenis_kelamin,
                        alamat: rowData.alamat ? String(rowData.alamat).trim() : null,
                        no_telepon: rowData.no_telepon ? String(rowData.no_telepon).trim() : null,
                        status: 'aktif'
                    },
                    connection
                );

                processedCount++;
            } catch (rowErr) {
                skipped.push({ row: rowNum, nama: rowData.nama_lengkap || '-', reason: rowErr.message || 'Gagal memproses data' });
            }
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: skipped.length > 0 ? `Import selesai: ${processedCount} berhasil, ${skipped.length} dilewati` : `Import berhasil: ${processedCount} data pembina ditambahkan`,
            total: processedCount,
            skipped
        });
    } catch (err) {
        await connection.rollback();
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: err.message || 'Gagal mengimport data' });
    } finally {
        connection.release();
    }
};