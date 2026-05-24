const sekolahModel = require('../../models/sekolahModel');
const db = require('../../config/db');

const getSekolah = async (req, res) => {
    try {
        const sekolah = await sekolahModel.getSekolah();
        if (!sekolah)
            return res.status(404).json({ message: 'Data sekolah belum diatur' });
        res.json({ success: true, data: sekolah });
    } catch (err) {
        console.error('Error get sekolah:', err);
        res.status(500).json({ message: 'Gagal mengambil data sekolah' });
    }
};

const editSekolah = async (req, res) => {
    try {
        const {
            nama_sekolah,
            npsn,
            nss,
            alamat,
            kode_pos,
            telepon,
            email,
            website,
            kepala_sekolah,
            niy_kelapa_sekolah,
        } = req.body;
        const data = {};
        if (nama_sekolah !== undefined) data.nama_sekolah = nama_sekolah;
        if (npsn !== undefined) data.npsn = npsn;
        if (nss !== undefined) data.nss = nss;
        if (alamat !== undefined) data.alamat = alamat;
        if (kode_pos !== undefined) data.kode_pos = kode_pos;
        if (telepon !== undefined) data.telepon = telepon;
        if (email !== undefined) data.email = email;
        if (website !== undefined) data.website = website;
        if (kepala_sekolah !== undefined) data.kepala_sekolah = kepala_sekolah;
        if (niy_kelapa_sekolah !== undefined)
            data.niy_kepala_sekolah = niy_kelapa_sekolah;
        await sekolahModel.updateSekolah(data);
        res.json({ message: 'Data sekolah berhasil diperbarui' });
    } catch (err) {
        console.error('Error update sekolah:', err);
        res.status(500).json({ message: 'Gagal memperbarui data sekolah' });
    }
};

const uploadLogo = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'File logo diperlukan' });
        const logoPath = `/uploads/${req.file.filename}`;
        const [rows] = await db.execute('SELECT id FROM sekolah WHERE id = 1');
        if (rows.length > 0) {
            await db.execute('UPDATE sekolah SET logo_path = ? WHERE id = 1', [
                logoPath,
            ]);
        } else {
            await db.execute(
                `
                INSERT INTO sekolah (id, nama_sekolah, npsn, nss, alamat, kode_pos, telepon, email, website, kepala_sekolah, niy_kepala_sekolah, logo_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    1,
                    'SDIT Ulil Albab',
                    '0000000000',
                    '00000000',
                    'Alamat Sekolah',
                    '00000',
                    '0000000000',
                    'info@sekolah.sch.id',
                    'https://sekolah.sch.id',
                    'Kepala Sekolah',
                    '0000000000000000',
                    logoPath,
                ]
            );
        }
        res.json({ message: 'Logo berhasil diupdate', logoPath });
    } catch (err) {
        console.error('Error upload logo:', err);
        res.status(500).json({ message: 'Gagal mengupload logo' });
    }
};

module.exports = {
    getSekolah,
    editSekolah,
    uploadLogo
};