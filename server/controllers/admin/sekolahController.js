/**
 * Nama File: sekolahController.js
 * Fungsi: Controller profil sekolah (single record) + upload logo
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const sekolahModel = require('../../models/admin/sekolahModel');
const db = require('../../config/db');

// GET: Ambil data profil sekolah (nama, NPSN, alamat, kontak, kepala sekolah, logo)
const getSekolah = async (req, res) => {
    try {
        const sekolah = await sekolahModel.getSekolah();
        if (!sekolah) return res.status(404).json({ success: false, message: 'Data sekolah belum diatur' });
        res.json({ success: true, data: sekolah });
    } catch (err) {
        console.error('Error get sekolah:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data sekolah' });
    }
};

// PUT: Update data profil sekolah (partial update)
const editSekolah = async (req, res) => {
    try {
        const { nama_sekolah, npsn, nss, alamat, kode_pos, telepon, email, website, kepala_sekolah, niy_kepala_sekolah } = req.body;

        // Validasi nama sekolah
        if (!nama_sekolah || !nama_sekolah.trim()) return res.status(400).json({ success: false, message: 'Nama sekolah wajib diisi' });

        // Build data object (partial update)
        const data = {};
        if (nama_sekolah !== undefined) data.nama_sekolah = nama_sekolah.trim();
        if (npsn !== undefined) data.npsn = npsn;
        if (nss !== undefined) data.nss = nss;
        if (alamat !== undefined) data.alamat = alamat;
        if (kode_pos !== undefined) data.kode_pos = kode_pos;
        if (telepon !== undefined) data.telepon = telepon;
        if (email !== undefined) data.email = email;
        if (website !== undefined) data.website = website;
        if (kepala_sekolah !== undefined) data.kepala_sekolah = kepala_sekolah;
        if (niy_kepala_sekolah !== undefined) data.niy_kepala_sekolah = niy_kepala_sekolah;

        await sekolahModel.updateSekolah(data);
        res.json({ success: true, message: 'Data sekolah berhasil diperbarui' });
    } catch (err) {
        console.error('Error update sekolah:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data sekolah' });
    }
};

// PUT: Upload logo sekolah (auto-create record jika belum ada)
const uploadLogo = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'File logo diperlukan' });

        const logoPath = `/uploads/${req.file.filename}`;

        // Cek apakah data sekolah sudah ada
        const [rows] = await db.execute('SELECT id FROM sekolah LIMIT 1');

        if (rows.length > 0) {
            // Update logo existing
            await db.execute('UPDATE sekolah SET logo_path = ? WHERE id = ?', [logoPath, rows[0].id]);
        } else {
            // Insert record baru dengan data minimal
            await db.execute('INSERT INTO sekolah (nama_sekolah, logo_path) VALUES (?, ?)', ['SDIT Ulil Albab Batam', logoPath]);
        }

        res.json({ success: true, message: 'Logo berhasil diupdate', logoPath });
    } catch (err) {
        console.error('Error upload logo:', err);
        res.status(500).json({ success: false, message: 'Gagal mengupload logo' });
    }
};

module.exports = { getSekolah, editSekolah, uploadLogo };