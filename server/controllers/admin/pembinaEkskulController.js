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
 * HELPER: Ekstrak nilai teks dari sel Excel (handle semua jenis sel)
 */
const getCellTextValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    
    const val = cell.value;
    
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    
    if (val instanceof Date) {
        return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
    }
    
    if (typeof val === 'object' && val.text !== undefined && val.text !== null) {
        return String(val.text).trim();
    }
    
    if (typeof val === 'object' && val.result !== undefined && val.result !== null) {
        return String(val.result).trim();
    }
    
    if (typeof val === 'object' && Array.isArray(val.richText)) {
        return val.richText.map(part => part.text || '').join('').trim();
    }
    
    return String(val).trim();
};

/**
 * HELPER: Normalisasi jenis kelamin ke format baku
 */
const normalizeJenisKelamin = (input) => {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();
    if (!s) return null;
    if (s.includes('laki')) return 'Laki-laki';
    if (s.includes('peremp') || s === 'p') return 'Perempuan';
    return null;
};

/**
 * Ambil daftar semua pembina ekstrakurikuler.
 */
exports.getPembinaEkskul = async (req, res) => {
    try {
        const pembinaList = await pembinaEkskulModel.getAll();
        res.json({ success: true, data: pembinaList });
    } catch (err) {
        console.error('Error getPembinaEkskul:', err);
        res.status(500).json({ message: 'Gagal mengambil data pembina' });
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
        console.error('Error getPembinaEkskulById:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail pembina' });
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
        console.error('Error tambahPembinaEkskul:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah pembina' });
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
        console.error('Error editPembinaEkskul:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data pembina' });
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

        const headers = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = (getCellTextValue(cell) || '').toLowerCase();
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
            
            const getCellVal = (colName) => {
                if (!(colName in colMap)) return null;
                const cell = row.getCell(colMap[colName] + 1);
                return getCellTextValue(cell);
            };

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
                if (!rowData.nama_lengkap && !rowData.tempat_lahir) continue;

                if (!rowData.nama_lengkap || !rowData.tempat_lahir || !rowData.tanggal_lahir || !rowData.jenis_kelamin) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap || '-', reason: 'Data tidak lengkap (nama, tempat lahir, tanggal lahir, jenis kelamin wajib diisi)' });
                    continue;
                }

                const jenisKelaminFinal = normalizeJenisKelamin(rowData.jenis_kelamin);
                if (!jenisKelaminFinal) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: `Jenis kelamin harus "Laki-laki" atau "Perempuan", ditemukan: "${rowData.jenis_kelamin}"` });
                    continue;
                }

                let tanggal_lahir = rowData.tanggal_lahir;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: `Format tanggal lahir tidak valid (ditemukan: "${tanggal_lahir}"), harus YYYY-MM-DD` });
                    continue;
                }

                const [existingNiy] = rowData.niy ? await connection.execute('SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE niy = ?', [rowData.niy]) : [[]];
                const [existingNuptk] = rowData.nuptk ? await connection.execute('SELECT id_pembina_ekstrakurikuler FROM pembina_ekstrakurikuler WHERE nuptk = ?', [rowData.nuptk]) : [[]];

                if (existingNiy.length > 0 || existingNuptk.length > 0) {
                    let reason = 'Data duplikat';
                    if (existingNiy.length > 0) reason = 'NIY sudah terdaftar';
                    else if (existingNuptk.length > 0) reason = 'NUPTK sudah terdaftar';
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason });
                    continue;
                }

                await pembinaEkskulModel.create(
                    {
                        nama_lengkap: rowData.nama_lengkap,
                        niy: rowData.niy || null,
                        nuptk: rowData.nuptk || null,
                        tempat_lahir: rowData.tempat_lahir,
                        tanggal_lahir,
                        jenis_kelamin: jenisKelaminFinal,
                        alamat: rowData.alamat || null,
                        no_telepon: rowData.no_telepon || null,
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
        console.error('Error importPembinaEkskul:', err);
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: 'Gagal mengimport data pembina' });
    } finally {
        connection.release();
    }
};