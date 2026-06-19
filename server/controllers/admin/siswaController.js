/**
 * Nama File: siswaMasterController.js
 * Fungsi: Master data siswa (TANPA tahun ajaran)
 *         Menggunakan Model untuk operasi database
 */

const SiswaModel = require('../../models/admin/siswaModel');
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// GET /siswa-master - Ambil SEMUA siswa (master data)
// ═════════════════════════════════════════════════════════════════════════════
const getSiswaMaster = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status = 'aktif' } = req.query;

        const result = await SiswaModel.getAllSiswa(search, status, parseInt(page), parseInt(limit));

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });

    } catch (err) {
        console.error('Error getSiswaMaster:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data siswa: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /siswa-master/:id - Ambil detail siswa
// ═════════════════════════════════════════════════════════════════════════════
const getSiswaMasterById = async (req, res) => {
    try {
        const { id } = req.params;

        const siswa = await SiswaModel.getSiswaById(id);

        if (!siswa) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: siswa
        });

    } catch (err) {
        console.error('Error getSiswaMasterById:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail siswa: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /siswa-master - Tambah siswa baru (MASTER DATA)
// ═════════════════════════════════════════════════════════════════════════════
const tambahSiswaMaster = async (req, res) => {
    try {
        const {
            nis,
            nisn,
            nama_lengkap,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            alamat
        } = req.body;

        // Validasi field wajib
        if (!nis || !nama_lengkap || !jenis_kelamin) {
            return res.status(400).json({
                success: false,
                message: 'NIS, nama lengkap, dan jenis kelamin wajib diisi'
            });
        }

        // Trim semua input
        const trimmedNis = nis.trim();
        const trimmedNisn = nisn ? nisn.trim() : null;
        const trimmedNama = nama_lengkap.trim();

        // ✅ CEK DUPLIKAT NIS
        const nisExists = await SiswaModel.checkNisExists(trimmedNis);
        if (nisExists) {
            return res.status(400).json({
                success: false,
                message: `NIS "${trimmedNis}" sudah digunakan`,
                code: 'DUPLICATE_NIS'
            });
        }

        // ✅ CEK DUPLIKAT NISN (jika ada)
        if (trimmedNisn) {
            const nisnExists = await SiswaModel.checkNisnExists(trimmedNisn);
            if (nisnExists) {
                return res.status(400).json({
                    success: false,
                    message: `NISN "${trimmedNisn}" sudah digunakan`,
                    code: 'DUPLICATE_NISN'
                });
            }
        }

        // ✅ CEK NAMA SAMA (Warning, bukan error)
        const namaExists = await SiswaModel.checkNamaExists(trimmedNama);
        let warningMessage = null;
        if (namaExists) {
            warningMessage = `Perhatian: Sudah ada siswa dengan nama "${trimmedNama}" di sistem.`;
        }

        // Insert data
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
            id: id,
            warning: warningMessage
        });

    } catch (err) {
        console.error('Error tambahSiswaMaster:', err);

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'NIS atau NISN sudah terdaftar di sistem!',
                code: 'DUPLICATE_ENTRY'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Gagal menambah siswa: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// PUT /siswa-master/:id - Edit data siswa
// ═════════════════════════════════════════════════════════════════════════════
const editSiswaMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nis,
            nisn,
            nama_lengkap,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            alamat,
            status
        } = req.body;

        // Cek apakah siswa ada
        const existingSiswa = await SiswaModel.getSiswaById(id);
        if (!existingSiswa) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }

        // Trim input
        const trimmedNis = nis ? nis.trim() : existingSiswa.nis;
        const trimmedNisn = nisn ? nisn.trim() : existingSiswa.nisn;
        const trimmedNama = nama_lengkap ? nama_lengkap.trim() : existingSiswa.nama_lengkap;

        // ✅ CEK DUPLIKAT NIS (kecuali diri sendiri)
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

        // ✅ CEK DUPLIKAT NISN (kecuali diri sendiri)
        if (trimmedNisn && trimmedNisn !== existingSiswa.nisn) {
            const nisnExists = await SiswaModel.checkNisnExists(trimmedNisn, id);
            if (nisnExists) {
                return res.status(400).json({
                    success: false,
                    message: `NISN "${trimmedNisn}" sudah digunakan`,
                    code: 'DUPLICATE_NISN'
                });
            }
        }

        // ✅ CEK PERUBAHAN
        const hasChanges =
            existingSiswa.nis !== trimmedNis ||
            (existingSiswa.nisn || '') !== (trimmedNisn || '') ||
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

        // Update data
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
            return res.status(404).json({
                success: false,
                message: 'Gagal memperbarui data siswa'
            });
        }

        res.json({
            success: true,
            message: 'Data siswa berhasil diperbarui'
        });

    } catch (err) {
        console.error('Error editSiswaMaster:', err);

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'NIS atau NISN sudah terdaftar di sistem!',
                code: 'DUPLICATE_ENTRY'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data siswa: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /siswa-master/:id - Hapus siswa (soft delete)
// ═════════════════════════════════════════════════════════════════════════════
const hapusSiswaMaster = async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah siswa ada
        const existingSiswa = await SiswaModel.getSiswaById(id);
        if (!existingSiswa) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }

        // Cek apakah siswa masih terdaftar di kelas manapun
        const totalKelas = await SiswaModel.checkSiswaInKelas(id);
        if (totalKelas > 0) {
            return res.status(400).json({
                success: false,
                message: `Siswa "${existingSiswa.nama_lengkap}" tidak dapat dihapus karena masih terdaftar di ${totalKelas} kelas.`,
                code: 'STILL_ENROLLED'
            });
        }

        // Soft delete
        const deleted = await SiswaModel.deleteSiswa(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Gagal menghapus siswa'
            });
        }

        res.json({
            success: true,
            message: `Siswa "${existingSiswa.nama_lengkap}" berhasil dihapus (soft delete)`
        });

    } catch (err) {
        console.error('Error hapusSiswaMaster:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus siswa: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /siswa-master/import - Import siswa dari Excel (MASTER DATA)
// ═════════════════════════════════════════════════════════════════════════════
const importSiswaMaster = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File Excel diperlukan'
            });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong'
            });
        }

        await connection.beginTransaction();

        let processedCount = 0;
        const skipped = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2;

            // Validasi kolom wajib
            if (!row.nis || !row.nama_lengkap || !row.jenis_kelamin) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: 'Kolom wajib (NIS, nama lengkap, jenis kelamin) tidak lengkap'
                });
                continue;
            }

            const trimmedNis = String(row.nis).trim();
            const trimmedNisn = row.nisn ? String(row.nisn).trim() : null;
            const trimmedNama = String(row.nama_lengkap).trim();

            // Cek duplikat NIS
            const nisExists = await SiswaModel.checkNisExists(trimmedNis);
            if (nisExists) {
                skipped.push({
                    row: rowNumber,
                    nama: trimmedNama,
                    reason: `NIS "${trimmedNis}" sudah terdaftar`
                });
                continue;
            }

            // Cek duplikat NISN
            if (trimmedNisn) {
                const nisnExists = await SiswaModel.checkNisnExists(trimmedNisn);
                if (nisnExists) {
                    skipped.push({
                        row: rowNumber,
                        nama: trimmedNama,
                        reason: `NISN "${trimmedNisn}" sudah terdaftar`
                    });
                    continue;
                }
            }

            // Parse tanggal lahir
            let tanggal_lahir = row.tanggal_lahir || null;
            if (typeof tanggal_lahir === 'number') {
                const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) {
                    tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                } else {
                    tanggal_lahir = null;
                }
            } else if (typeof tanggal_lahir === 'string') {
                tanggal_lahir = tanggal_lahir.trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                    tanggal_lahir = null;
                }
            }

            try {
                await SiswaModel.createSiswa({
                    nis: trimmedNis,
                    nisn: trimmedNisn,
                    nama_lengkap: trimmedNama,
                    tempat_lahir: row.tempat_lahir ? String(row.tempat_lahir).trim() : null,
                    tanggal_lahir: tanggal_lahir,
                    jenis_kelamin: row.jenis_kelamin || 'Laki-laki',
                    alamat: row.alamat ? String(row.alamat).trim() : null
                });
                processedCount++;
            } catch (insertErr) {
                if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
                    skipped.push({
                        row: rowNumber,
                        nama: trimmedNama,
                        reason: `NIS "${trimmedNis}" atau NISN "${trimmedNisn}" sudah terdaftar`
                    });
                } else {
                    skipped.push({
                        row: rowNumber,
                        nama: trimmedNama,
                        reason: 'Gagal menyimpan data'
                    });
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
            skipped: skipped
        });

    } catch (err) {
        await connection.rollback();
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Import siswa master error:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal import siswa: ' + err.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    getSiswaMaster,
    getSiswaMasterById,
    tambahSiswaMaster,
    editSiswaMaster,
    hapusSiswaMaster,
    importSiswaMaster
};