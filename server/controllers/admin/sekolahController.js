/**
 * Nama File: sekolahController.js
 * Fungsi: Controller untuk manajemen data profil sekolah (identitas, alamat, kontak)
 *         dan upload logo sekolah. Data sekolah bersifat tunggal (single record).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const sekolahModel = require('../../models/admin/sekolahModel');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET DATA SEKOLAH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/sekolah
 * Ambil data profil sekolah (nama, NPSN, alamat, kontak, kepala sekolah, logo).
 */
const getSekolah = async (req, res) => {
    try {
        const sekolah = await sekolahModel.getSekolah();
        if (!sekolah) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data sekolah belum diatur' 
            });
        }
        res.json({ success: true, data: sekolah });
    } catch (err) {
        console.error('Error get sekolah:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data sekolah' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPDATE DATA SEKOLAH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/admin/sekolah
 * Update data profil sekolah (partial update).
 * 
 * Field yang dapat diupdate:
 *   - nama_sekolah (wajib), npsn, nss, alamat, kode_pos
 *   - telepon, email, website
 *   - kepala_sekolah, niy_kepala_sekolah
 */
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
            niy_kepala_sekolah,
        } = req.body;

        // Validasi nama sekolah
        if (!nama_sekolah || !nama_sekolah.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Nama sekolah wajib diisi'
            });
        }

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

        res.json({
            success: true,
            message: 'Data sekolah berhasil diperbarui'
        });
    } catch (err) {
        console.error('Error update sekolah:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data sekolah'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPLOAD LOGO SEKOLAH
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/admin/sekolah/logo
 * Upload logo sekolah. Jika data sekolah belum ada, buat record baru dengan nama default.
 * 
 * @param {File} req.file - File logo (dari multer)
 */
const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'File logo diperlukan' 
            });
        }

        const logoPath = `/uploads/${req.file.filename}`;

        // Cek apakah data sekolah sudah ada
        const [rows] = await db.execute('SELECT id FROM sekolah LIMIT 1');

        if (rows.length > 0) {
            // Update logo existing
            await db.execute('UPDATE sekolah SET logo_path = ? WHERE id = ?', [logoPath, rows[0].id]);
        } else {
            // Insert record baru dengan data minimal
            await db.execute(
                `INSERT INTO sekolah (nama_sekolah, logo_path) VALUES (?, ?)`,
                ['SDIT Ulil Albab Batam', logoPath]
            );
        }

        res.json({
            success: true,
            message: 'Logo berhasil diupdate',
            logoPath
        });
    } catch (err) {
        console.error('Error upload logo:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupload logo'
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    getSekolah,
    editSekolah,
    uploadLogo
};