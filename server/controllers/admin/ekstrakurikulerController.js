const ekstrakurikulerModel = require('../../models/ekstrakurikulerModel');

const getEkskul = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
        }
        const ekskulList =
            await ekstrakurikulerModel.getAllByTahunAjaran(tahun_ajaran_id);
        res.json({ success: true, data: ekskulList });
    } catch (err) {
        console.error('Error get ekstrakurikuler:', err);
        res.status(500).json({ message: 'Gagal mengambil data ekstrakurikuler' });
    }
};

const tambahEkskul = async (req, res) => {
    try {
        const { nama_ekskul, nama_pembina, keterangan } = req.body;
        const tahun_ajaran_id = req.idTahunAjaranInduk;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        if (!nama_ekskul) {
            return res
                .status(400)
                .json({ message: 'Nama ekstrakurikuler wajib diisi' });
        }
        const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
            nama_ekskul,
            tahun_ajaran_id
        );
        if (isDuplicate) {
            return res
                .status(400)
                .json({ message: `Ekstrakurikuler "${nama_ekskul}" sudah ada` });
        }
        const ekskulId = await ekstrakurikulerModel.create({
            nama_ekskul,
            nama_pembina: nama_pembina || null,
            keterangan: keterangan || null,
            tahun_ajaran_id,
        });
        res
            .status(201)
            .json({ message: 'Ekstrakurikuler berhasil ditambahkan', id: ekskulId });
    } catch (err) {
        console.error('Error tambah ekstrakurikuler:', err);
        res
            .status(500)
            .json({ message: err.message || 'Gagal menambah ekstrakurikuler' });
    }
};

const editEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_ekskul, nama_pembina, keterangan } = req.body;
        const tahun_ajaran_id = req.idTahunAjaranInduk;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        if (!nama_ekskul) {
            return res
                .status(400)
                .json({ message: 'Nama ekstrakurikuler wajib diisi' });
        }
        const ekskulLama = await ekstrakurikulerModel.getById(id);
        if (!ekskulLama || ekskulLama.tahun_ajaran_id !== tahun_ajaran_id) {
            return res
                .status(404)
                .json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }
        const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
            nama_ekskul,
            tahun_ajaran_id,
            id
        );
        if (isDuplicate) {
            return res
                .status(400)
                .json({ message: `Nama "${nama_ekskul}" sudah digunakan` });
        }
        const success = await ekstrakurikulerModel.update(id, {
            nama_ekskul,
            nama_pembina: nama_pembina || null,
            keterangan: keterangan || null,
            tahun_ajaran_id,
        });
        if (!success) {
            return res
                .status(400)
                .json({ message: 'Gagal memperbarui data ekstrakurikuler' });
        }
        res.json({ message: 'Data ekstrakurikuler berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit ekstrakurikuler:', err);
        res
            .status(500)
            .json({ message: err.message || 'Gagal memperbarui ekstrakurikuler' });
    }
};

const hapusEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;
        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        const ekskul = await ekstrakurikulerModel.getById(id);
        if (!ekskul || ekskul.tahun_ajaran_id !== taId) {
            return res
                .status(404)
                .json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }
        const success = await ekstrakurikulerModel.deleteById(id);
        if (!success) {
            return res
                .status(400)
                .json({ message: 'Gagal menghapus ekstrakurikuler' });
        }
        res.json({ message: 'Ekstrakurikuler berhasil dihapus' });
    } catch (err) {
        console.error('Error hapus ekstrakurikuler:', err);
        res.status(500).json({ message: 'Gagal menghapus ekstrakurikuler' });
    }
};

const getPesertaByEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;
        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        const peserta = await ekstrakurikulerModel.getPesertaByEkskul(id, taId);
        res.json({ success: true, data: peserta });
    } catch (err) {
        console.error('Error get peserta by ekskul:', err);
        res
            .status(500)
            .json({ message: 'Gagal mengambil daftar peserta ekstrakurikuler' });
    }
};

const getEkskulBySiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const taId = req.idTahunAjaranInduk;
        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        const ekskulList = await ekstrakurikulerModel.getEkskulSiswa(siswaId, taId);
        res.json({ success: true, data: ekskulList });
    } catch (err) {
        console.error('Error get ekskul by siswa:', err);
        res
            .status(500)
            .json({ message: 'Gagal mengambil data ekstrakurikuler siswa' });
    }
};

module.exports = {
    getEkskul,
    tambahEkskul,
    editEkskul,
    hapusEkskul,
    getPesertaByEkskul,
    getEkskulBySiswa
};