const mapelModel = require('../../models/mapelModel');
const db = require('../../config/db');

const getMataPelajaran = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id || isNaN(Number(tahun_ajaran_id))) {
            return res
                .status(400)
                .json({ message: 'tahun_ajaran_id wajib diisi dan harus angka' });
        }
        const rows = await mapelModel.getAllByTahunAjaran(Number(tahun_ajaran_id));
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get mata pelajaran:', err);
        res.status(500).json({ message: 'Gagal mengambil data mata pelajaran' });
    }
};

const getMataPelajaranById = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }
        const rows = await mapelModel.getById(idNum);
        if (rows.length === 0) {
            return res
                .status(404)
                .json({ message: 'Mata pelajaran tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error get mata pelajaran by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail mata pelajaran' });
    }
};

const tambahMataPelajaran = async (req, res) => {
    try {
        const {
            kode_mapel,
            nama_mapel,
            jenis,
            kurikulum,
            tahun_ajaran_id,
            urutan_rapor,
        } = req.body;
        if (
            !kode_mapel ||
            !nama_mapel ||
            !jenis ||
            !kurikulum ||
            !tahun_ajaran_id
        ) {
            return res.status(400).json({ message: 'Semua field wajib diisi' });
        }
        const allowedJenis = ['wajib', 'pilihan'];
        if (!allowedJenis.includes(jenis)) {
            return res.status(400).json({ message: 'Jenis tidak valid' });
        }
        const taId = Number(tahun_ajaran_id);
        if (isNaN(taId)) {
            return res.status(400).json({ message: 'tahun_ajaran_id harus angka' });
        }
        const taValid = await mapelModel.isTahunAjaranValid(taId);
        if (!taValid) {
            return res.status(400).json({ message: 'Tahun ajaran tidak valid' });
        }
        const isDuplicate = await mapelModel.isKodeMapelExist(
            kode_mapel.trim().toUpperCase(),
            taId
        );
        if (isDuplicate) {
            return res
                .status(400)
                .json({ message: 'Kode mapel sudah digunakan di tahun ajaran ini' });
        }
        // Jika urutan_rapor TIDAK dikirim (atau null), hitung otomatis
        let finalUrutanRapor = null;
        if (urutan_rapor == null || urutan_rapor === '') {
            const maxUrutan = await db.execute(
                `SELECT MAX(urutan_rapor) AS max FROM mata_pelajaran WHERE tahun_ajaran_id = ? AND jenis = ?`,
                [taId, jenis]
            );
            finalUrutanRapor = (maxUrutan[0][0]?.max || 0) + 1;
        } else {
            finalUrutanRapor = Number(urutan_rapor);
        }

        const result = await mapelModel.create({
            kode_mapel: kode_mapel.trim().toUpperCase(),
            nama_mapel: nama_mapel.trim(),
            jenis,
            kurikulum: kurikulum.trim(),
            tahun_ajaran_id: taId,
            urutan_rapor: finalUrutanRapor,
        });
        res.status(201).json({
            message: 'Mata pelajaran berhasil ditambahkan',
            id: result.insertId,
        });
    } catch (err) {
        console.error('Error tambah mata pelajaran:', err);
        res.status(500).json({ message: 'Gagal menambah mata pelajaran' });
    }
};

const editMataPelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }
        const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = req.body;
        const trimmedKodeMapel = (kode_mapel || '').toString().trim();
        const trimmedNamaMapel = (nama_mapel || '').toString().trim();
        const trimmedJenis = (jenis || '').toString().trim();
        const trimmedKurikulum = (kurikulum || '').toString().trim();
        if (
            !trimmedKodeMapel ||
            !trimmedNamaMapel ||
            !trimmedJenis ||
            !trimmedKurikulum
        ) {
            return res.status(400).json({ message: 'Semua field wajib diisi' });
        }
        const allowedJenis = ['wajib', 'pilihan'];
        if (!allowedJenis.includes(trimmedJenis)) {
            return res
                .status(400)
                .json({ message: 'Jenis tidak valid. Harus "wajib" atau "pilihan".' });
        }
        const [oldMapel] = await db.execute(
            'SELECT tahun_ajaran_id FROM mata_pelajaran WHERE id_mata_pelajaran = ?',
            [idNum]
        );
        if (oldMapel.length === 0) {
            return res
                .status(404)
                .json({ message: 'Mata pelajaran tidak ditemukan' });
        }
        const taId = oldMapel[0].tahun_ajaran_id;
        const isDuplicate = await mapelModel.isKodeMapelExist(
            trimmedKodeMapel.toUpperCase(),
            taId,
            idNum
        );
        if (isDuplicate) {
            return res
                .status(400)
                .json({ message: 'Kode mapel sudah digunakan di tahun ajaran ini' });
        }
        let finalUrutanRapor = null;
        if (
            urutan_rapor !== undefined &&
            urutan_rapor !== '' &&
            urutan_rapor !== null
        ) {
            finalUrutanRapor = Number(urutan_rapor);
        }
        const result = await mapelModel.update(idNum, {
            kode_mapel: trimmedKodeMapel.toUpperCase(),
            nama_mapel: trimmedNamaMapel,
            jenis: trimmedJenis,
            kurikulum: trimmedKurikulum,
            urutan_rapor: finalUrutanRapor,
            tahun_ajaran_id: taId,
        });
        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: 'Mata pelajaran tidak ditemukan' });
        }
        res.json({ message: 'Data mata pelajaran berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit mata pelajaran:', err);
        res.status(500).json({ message: 'Gagal memperbarui data mata pelajaran' });
    }
};

const hapusMataPelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }
        const [nilaiRows] = await db.execute(
            'SELECT id_nilai_rapor FROM nilai_rapor WHERE mapel_id = ? LIMIT 1',
            [idNum]
        );
        if (nilaiRows.length > 0) {
            return res
                .status(400)
                .json({
                    message:
                        'Tidak bisa dihapus: mata pelajaran ini sudah digunakan di data nilai',
                });
        }
        const result = await mapelModel.delete(idNum);
        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: 'Mata pelajaran tidak ditemukan' });
        }
        res.json({ message: 'Mata pelajaran berhasil dihapus' });
    } catch (err) {
        console.error('Error hapus mata pelajaran:', err);
        res.status(500).json({ message: 'Gagal menghapus mata pelajaran' });
    }
};

module.exports = {
    getMataPelajaran,
    getMataPelajaranById,
    tambahMataPelajaran,
    editMataPelajaran,
    hapusMataPelajaran
};