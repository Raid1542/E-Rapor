/**
 * Nama File: siswaController.js
 * Fungsi: Controller master data siswa (CRUD + import Excel, soft delete).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const SiswaModel = require('../../models/admin/siswaModel');
const ExcelJS = require('exceljs');
const fs = require('fs');
const db = require('../../config/db');

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
 * Ambil daftar semua siswa dengan pagination dan filter status.
 */
exports.getSiswaMaster = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status = 'aktif' } = req.query;
        const result = await SiswaModel.getAllSiswa(
            search,
            status,
            parseInt(page, 10),
            parseInt(limit, 10)
        );
        res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
        console.error('Error getSiswaMaster:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};

/**
 * Ambil detail siswa berdasarkan ID.
 */
exports.getSiswaMasterById = async (req, res) => {
    try {
        const { id } = req.params;
        const siswa = await SiswaModel.getSiswaById(id);
        if (!siswa) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }
        res.json({ success: true, data: siswa });
    } catch (err) {
        console.error('Error getSiswaMasterById:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail siswa' });
    }
};

/**
 * Tambah siswa baru dengan validasi duplikasi NIS/NISN.
 */
exports.tambahSiswaMaster = async (req, res) => {
    try {
        const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat } = req.body;

        if (!nis || !nisn || !nama_lengkap || !jenis_kelamin) {
            return res.status(400).json({
                success: false,
                message: 'NIS, NISN, nama lengkap, dan jenis kelamin wajib diisi'
            });
        }

        const trimmedNis = nis.trim();
        const trimmedNisn = nisn.trim();
        const trimmedNama = nama_lengkap.trim();

        const nisExists = await SiswaModel.checkNisExists(trimmedNis);
        if (nisExists) {
            return res.status(400).json({
                success: false,
                message: `NIS "${trimmedNis}" sudah digunakan`,
                code: 'DUPLICATE_NIS'
            });
        }

        const nisnExists = await SiswaModel.checkNisnExists(trimmedNisn);
        if (nisnExists) {
            return res.status(400).json({
                success: false,
                message: `NISN "${trimmedNisn}" sudah digunakan`,
                code: 'DUPLICATE_NISN'
            });
        }

        const namaExists = await SiswaModel.checkNamaExists(trimmedNama);
        let warningMessage = null;
        if (namaExists) {
            warningMessage = `Perhatian: Sudah ada siswa dengan nama "${trimmedNama}" di sistem.`;
        }

        const id = await SiswaModel.createSiswa({
            nis: trimmedNis,
            nisn: trimmedNisn,
            nama_lengkap: trimmedNama,
            tempat_lahir: tempat_lahir ? tempat_lahir.trim() : null,
            tanggal_lahir: tanggal_lahir || null,
            jenis_kelamin: jenis_kelamin,
            alamat: alamat ? alamat.trim() : null
        });

        res.status(201).json({
            success: true,
            message: 'Siswa berhasil ditambahkan',
            id,
            warning: warningMessage
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'NIS atau NISN sudah terdaftar di sistem!',
                code: 'DUPLICATE_ENTRY'
            });
        }
        console.error('Error tambahSiswaMaster:', err);
        res.status(500).json({ success: false, message: 'Gagal menambah siswa' });
    }
};

/**
 * Update data siswa dengan validasi duplikasi (exclude diri sendiri).
 */
exports.editSiswaMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, status } = req.body;

        if (!nis || !nisn || !nama_lengkap || !jenis_kelamin) {
            return res.status(400).json({
                success: false,
                message: 'NIS, NISN, nama lengkap, dan jenis kelamin wajib diisi'
            });
        }

        const existingSiswa = await SiswaModel.getSiswaById(id);
        if (!existingSiswa) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }

        const trimmedNis = nis.trim();
        const trimmedNisn = nisn.trim();
        const trimmedNama = nama_lengkap.trim();

        if (trimmedNis !== existingSiswa.nis) {
            const nisExists = await SiswaModel.checkNisExists(trimmedNis, id);
            if (nisExists) {
                return res.status(400).json({
                    success: false,
                    message: `NIS "${trimmedNis}" sudah digunakan`,
                    code: 'DUPLICATE_NIS'
                });
            }
        }

        if (trimmedNisn !== existingSiswa.nisn) {
            const nisnExists = await SiswaModel.checkNisnExists(trimmedNisn, id);
            if (nisnExists) {
                return res.status(400).json({
                    success: false,
                    message: `NISN "${trimmedNisn}" sudah digunakan`,
                    code: 'DUPLICATE_NISN'
                });
            }
        }

        const hasChanges =
            existingSiswa.nis !== trimmedNis ||
            existingSiswa.nisn !== trimmedNisn ||
            existingSiswa.nama_lengkap !== trimmedNama ||
            (existingSiswa.tempat_lahir || '') !== (tempat_lahir ? tempat_lahir.trim() : '') ||
            String(existingSiswa.tanggal_lahir || '') !== String(tanggal_lahir || '') ||
            existingSiswa.jenis_kelamin !== jenis_kelamin ||
            (existingSiswa.alamat || '') !== (alamat ? alamat.trim() : '') ||
            (existingSiswa.status || 'aktif') !== (status || 'aktif');

        if (!hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data. Tidak perlu menyimpan.'
            });
        }

        const updated = await SiswaModel.updateSiswa(id, {
            nis: trimmedNis,
            nisn: trimmedNisn,
            nama_lengkap: trimmedNama,
            tempat_lahir: tempat_lahir ? tempat_lahir.trim() : null,
            tanggal_lahir: tanggal_lahir || null,
            jenis_kelamin: jenis_kelamin,
            alamat: alamat ? alamat.trim() : null,
            status: status || 'aktif'
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Gagal memperbarui data siswa' });
        }

        res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'NIS atau NISN sudah terdaftar di sistem!',
                code: 'DUPLICATE_ENTRY'
            });
        }
        console.error('Error editSiswaMaster:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data siswa' });
    }
};

/**
 * Hapus siswa dengan soft delete (ubah status jadi nonaktif).
 */
exports.hapusSiswaMaster = async (req, res) => {
    try {
        const { id } = req.params;

        const existingSiswa = await SiswaModel.getSiswaById(id);
        if (!existingSiswa) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }

        const totalKelas = await SiswaModel.checkSiswaInKelas(id);
        if (totalKelas > 0) {
            return res.status(400).json({
                success: false,
                message: `Siswa "${existingSiswa.nama_lengkap}" tidak dapat dihapus karena masih terdaftar di ${totalKelas} kelas.`,
                code: 'STILL_ENROLLED'
            });
        }

        const deleted = await SiswaModel.deleteSiswa(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Gagal menghapus siswa' });
        }

        res.json({
            success: true,
            message: `Siswa "${existingSiswa.nama_lengkap}" berhasil dihapus (soft delete)`
        });
    } catch (err) {
        console.error('Error hapusSiswaMaster:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus siswa' });
    }
};

/**
 * Import data siswa dari file Excel
 */
exports.importSiswaMaster = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'File Excel kosong atau tidak ada data' });
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

        await connection.beginTransaction();
        let processedCount = 0;
        const skipped = [];

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowNumber = i;

            const getCellVal = (colName) => {
                if (!(colName in colMap)) return null;
                const cell = row.getCell(colMap[colName] + 1);
                return getCellTextValue(cell);
            };

            const rowData = {
                nis: getCellVal('nis'),
                nisn: getCellVal('nisn'),
                nama_lengkap: getCellVal('nama_lengkap'),
                tempat_lahir: getCellVal('tempat_lahir'),
                tanggal_lahir: getCellVal('tanggal_lahir'),
                jenis_kelamin: getCellVal('jenis_kelamin'),
                alamat: getCellVal('alamat')
            };

            try {
                if (!rowData.nis && !rowData.nama_lengkap) continue;

                if (!rowData.nis || !rowData.nisn || !rowData.nama_lengkap || !rowData.jenis_kelamin) {
                    skipped.push({
                        row: rowNumber,
                        nama: rowData.nama_lengkap || '-',
                        reason: 'Kolom wajib (NIS, NISN, nama lengkap, jenis kelamin) tidak lengkap'
                    });
                    continue;
                }

                const trimmedNis = rowData.nis;
                const trimmedNisn = rowData.nisn;
                const trimmedNama = rowData.nama_lengkap;

                const nisExists = await SiswaModel.checkNisExists(trimmedNis);
                if (nisExists) {
                    skipped.push({
                        row: rowNumber,
                        nama: trimmedNama,
                        reason: `NIS "${trimmedNis}" sudah terdaftar`
                    });
                    continue;
                }

                const nisnExists = await SiswaModel.checkNisnExists(trimmedNisn);
                if (nisnExists) {
                    skipped.push({
                        row: rowNumber,
                        nama: trimmedNama,
                        reason: `NISN "${trimmedNisn}" sudah terdaftar`
                    });
                    continue;
                }

                let tanggal_lahir = rowData.tanggal_lahir || null;
                if (tanggal_lahir && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                    tanggal_lahir = null;
                }

                const jenisKelaminFinal = normalizeJenisKelamin(rowData.jenis_kelamin);
                if (!jenisKelaminFinal) {
                    skipped.push({
                        row: rowNumber,
                        nama: trimmedNama,
                        reason: `Jenis kelamin harus "Laki-laki" atau "Perempuan", ditemukan: "${rowData.jenis_kelamin}"`
                    });
                    continue;
                }

                await SiswaModel.createSiswa({
                    nis: trimmedNis,
                    nisn: trimmedNisn,
                    nama_lengkap: trimmedNama,
                    tempat_lahir: rowData.tempat_lahir || null,
                    tanggal_lahir,
                    jenis_kelamin: jenisKelaminFinal,
                    alamat: rowData.alamat || null
                });
                processedCount++;
            } catch (insertErr) {
                if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
                    skipped.push({
                        row: rowNumber,
                        nama: rowData.nama_lengkap || '-',
                        reason: `NIS "${rowData.nis}" atau NISN "${rowData.nisn}" sudah terdaftar`
                    });
                } else {
                    console.error(`Error import row ${rowNumber}:`, insertErr);
                    skipped.push({ row: rowNumber, nama: rowData.nama_lengkap || '-', reason: 'Gagal menyimpan data' });
                }
            }
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: skipped.length > 0
                ? `Import selesai: ${processedCount} berhasil, ${skipped.length} dilewati`
                : `Import berhasil: ${processedCount} siswa ditambahkan`,
            total: processedCount,
            skipped
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error importSiswaMaster:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Gagal import siswa' });
    } finally {
        connection.release();
    }
};