/**
 * Nama File: ekstrakurikulerController.js
 * Fungsi: Controller untuk CRUD ekstrakurikuler
 */

const ekstrakurikulerModel = require('../../models/ekstrakurikulerModel');


const getEkskul = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
        }
        const ekskulList = await ekstrakurikulerModel.getAllByTahunAjaran(tahun_ajaran_id);
        res.json({ success: true, data: ekskulList });
    } catch (err) {
        console.error('Error get ekstrakurikuler:', err);
        res.status(500).json({ message: 'Gagal mengambil data ekstrakurikuler' });
    }
};

const tambahEkskul = async (req, res) => {
    try {
        const { nama_ekskul, pembina_id, keterangan } = req.body;
        const tahun_ajaran_id = req.idTahunAjaranInduk;
        
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        if (!nama_ekskul || !nama_ekskul.trim()) {
            return res.status(400).json({ message: 'Nama ekstrakurikuler wajib diisi' });
        }
        
        // Validasi pembina jika diisi
        if (pembina_id) {
            const pembinaList = await ekstrakurikulerModel.getAllPembinaAktif();
            const pembinaValid = pembinaList.find(p => p.id === Number(pembina_id));
            if (!pembinaValid) {
                return res.status(400).json({ message: 'Pembina tidak valid atau tidak aktif' });
            }
        }
        
        const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
            nama_ekskul,
            tahun_ajaran_id
        );
        if (isDuplicate) {
            return res.status(400).json({ message: `Ekstrakurikuler "${nama_ekskul}" sudah ada di tahun ajaran ini` });
        }
        
        const ekskulId = await ekstrakurikulerModel.create({
            nama_ekskul: nama_ekskul.trim(),
            pembina_id: pembina_id || null,
            keterangan: keterangan || null,
            tahun_ajaran_id,
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

const editEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_ekskul, pembina_id, keterangan } = req.body;
        const tahun_ajaran_id = req.idTahunAjaranInduk;
        
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        if (!nama_ekskul || !nama_ekskul.trim()) {
            return res.status(400).json({ message: 'Nama ekstrakurikuler wajib diisi' });
        }
        
        // Validasi ID
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }
        
        // Validasi pembina jika diisi
        if (pembina_id) {
            const pembinaList = await ekstrakurikulerModel.getAllPembinaAktif();
            const pembinaValid = pembinaList.find(p => p.id === Number(pembina_id));
            if (!pembinaValid) {
                return res.status(400).json({ message: 'Pembina tidak valid atau tidak aktif' });
            }
        }
        
        const ekskulLama = await ekstrakurikulerModel.getById(idNum);
        if (!ekskulLama || ekskulLama.tahun_ajaran_id !== tahun_ajaran_id) {
            return res.status(404).json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }
        
        const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
            nama_ekskul,
            tahun_ajaran_id,
            idNum
        );
        if (isDuplicate) {
            return res.status(400).json({ message: `Nama "${nama_ekskul}" sudah digunakan` });
        }
        
        const success = await ekstrakurikulerModel.update(idNum, {
            nama_ekskul: nama_ekskul.trim(),
            pembina_id: pembina_id || null,
            keterangan: keterangan || null,
            tahun_ajaran_id,
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

const hapusEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;
        
        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID tidak valid' });
        }
        
        const ekskul = await ekstrakurikulerModel.getById(idNum);
        if (!ekskul || ekskul.tahun_ajaran_id !== taId) {
            return res.status(404).json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }
        
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


const getPesertaByEkskul = async (req, res) => {
    try {
        const { id } = req.params;
        const { tahun_ajaran_id } = req.query;
        
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
        }
        
        const idNum = Number(id);
        if (isNaN(idNum)) {
            return res.status(400).json({ message: 'ID ekskul tidak valid' });
        }
        
        // Verifikasi ekskul ada
        const ekskul = await ekstrakurikulerModel.getById(idNum);
        if (!ekskul) {
            return res.status(404).json({ message: 'Ekstrakurikuler tidak ditemukan' });
        }
        
        const peserta = await ekstrakurikulerModel.getPesertaByEkskul(idNum, Number(tahun_ajaran_id));
        
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
                peserta: peserta
            }
        });
    } catch (err) {
        console.error('Error get peserta by ekskul:', err);
        res.status(500).json({ message: 'Gagal mengambil daftar peserta ekstrakurikuler' });
    }
};

const getEkskulBySiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { tahun_ajaran_id } = req.query;
        
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
        }
        
        const siswaIdNum = Number(siswaId);
        if (isNaN(siswaIdNum)) {
            return res.status(400).json({ message: 'ID siswa tidak valid' });
        }
        
        const ekskulList = await ekstrakurikulerModel.getEkskulSiswa(siswaIdNum, Number(tahun_ajaran_id));
        res.json({ success: true, data: ekskulList });
    } catch (err) {
        console.error('Error get ekskul by siswa:', err);
        res.status(500).json({ message: 'Gagal mengambil data ekstrakurikuler siswa' });
    }
};


const getPembinaDropdown = async (req, res) => {
    try {
        const pembinaList = await ekstrakurikulerModel.getAllPembinaAktif();
        res.json({ success: true, data: pembinaList });
    } catch (err) {
        console.error('Error get pembina dropdown:', err);
        res.status(500).json({ message: 'Gagal mengambil data pembina' });
    }
};

module.exports = {
    getEkskul,
    tambahEkskul,
    editEkskul,
    hapusEkskul,
    getPesertaByEkskul,
    getEkskulBySiswa,
    getPembinaDropdown
};