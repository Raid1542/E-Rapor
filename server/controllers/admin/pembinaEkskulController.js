const pembinaEkskulModel = require('../../models/pembinaEkskulModel');
const db = require('../../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

const getPembinaEkskul = async (req, res) => {
    try {
        const pembinaList = await pembinaEkskulModel.getAll();
        res.json({ success: true, data: pembinaList });
    } catch (err) {
        console.error('Error get pembina ekskul:', err);
        res.status(500).json({ message: 'Gagal mengambil data pembina' });
    }
};

const getPembinaEkskulById = async (req, res) => {
    try {
        const { id } = req.params;
        const pembina = await pembinaEkskulModel.getById(id);

        if (!pembina) {
            return res.status(404).json({ message: 'Pembina tidak ditemukan' });
        }

        res.json({ success: true, data: pembina });
    } catch (err) {
        console.error('Error get pembina by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail pembina' });
    }
};

const tambahPembinaEkskul = async (req, res) => {
    const {
        nama_lengkap, niy, nuptk, tempat_lahir, tanggal_lahir,
        jenis_kelamin, alamat, no_telepon, status
    } = req.body;

    // Validasi field wajib
    if (!nama_lengkap?.trim()) {
        return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    }
    if (!tempat_lahir?.trim()) {
        return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    }
    if (!tanggal_lahir) {
        return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    }
    if (!jenis_kelamin) {
        return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });
    }

    try {
        const id = await pembinaEkskulModel.create({
            nama_lengkap: nama_lengkap.trim(),
            niy: niy || null,
            nuptk: nuptk || null,
            tempat_lahir: tempat_lahir.trim(),
            tanggal_lahir,
            jenis_kelamin,
            alamat: alamat || null,
            no_telepon: no_telepon || null,
            status: status || 'aktif'
        });

        res.status(201).json({
            message: 'Pembina ekstrakurikuler berhasil ditambahkan',
            id
        });

    } catch (err) {
        console.error('Error tambah pembina:', err);
        res.status(500).json({ message: 'Gagal menambah pembina' });
    }
};

const editPembinaEkskul = async (req, res) => {
    const { id } = req.params;
    const {
        nama_lengkap, niy, nuptk, tempat_lahir, tanggal_lahir,
        jenis_kelamin, alamat, no_telepon, status
    } = req.body;

    // Validasi field wajib
    if (!nama_lengkap?.trim()) {
        return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    }
    if (!tempat_lahir?.trim()) {
        return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    }
    if (!tanggal_lahir) {
        return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    }
    if (!jenis_kelamin) {
        return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });
    }

    try {
        const success = await pembinaEkskulModel.update(id, {
            nama_lengkap: nama_lengkap.trim(),
            niy: niy || null,
            nuptk: nuptk || null,
            tempat_lahir: tempat_lahir.trim(),
            tanggal_lahir,
            jenis_kelamin,
            alamat: alamat || null,
            no_telepon: no_telepon || null,
            status: status || 'aktif'
        });

        if (!success) {
            return res.status(404).json({ message: 'Pembina tidak ditemukan' });
        }

        res.json({ message: 'Data pembina berhasil diperbarui' });

    } catch (err) {
        console.error('Error edit pembina:', err);
        res.status(500).json({ message: 'Gagal memperbarui data pembina' });
    }
};

const importPembinaEkskul = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) return res.status(400).json({ message: 'File Excel diperlukan' });

        const workbook = XLSX.readFile(req.file.path);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (data.length === 0) throw new Error('File Excel kosong');

        // Validasi kolom wajib di template
        const requiredCols = ['nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin'];
        const firstRow = data[0];
        for (const col of requiredCols) {
            if (!(col in firstRow)) {
                throw new Error(`Kolom wajib "${col}" tidak ditemukan di template`);
            }
        }

        await connection.beginTransaction();
        let successCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;

            // Validasi per baris
            if (!row.nama_lengkap || !row.tempat_lahir || !row.tanggal_lahir || !row.jenis_kelamin) {
                throw new Error(`Baris ${rowNum}: Data tidak lengkap`);
            }
            if (!['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
                throw new Error(`Baris ${rowNum}: Jenis kelamin harus Laki-laki atau Perempuan`);
            }

            await pembinaEkskulModel.create({
                nama_lengkap: row.nama_lengkap,
                niy: row.niy || null,
                nuptk: row.nuptk || null,
                tempat_lahir: row.tempat_lahir,
                tanggal_lahir: row.tanggal_lahir,
                jenis_kelamin: row.jenis_kelamin,
                alamat: row.alamat || null,
                no_telepon: row.no_telepon || null,
                status: 'aktif'
            }, connection);
            successCount++;
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import berhasil', total: successCount });

    } catch (err) {
        await connection.rollback();
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Import pembina error:', err);
        res.status(400).json({ message: err.message || 'Gagal mengimport data' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getPembinaEkskul,
    getPembinaEkskulById,
    tambahPembinaEkskul,
    editPembinaEkskul,
    importPembinaEkskul
};