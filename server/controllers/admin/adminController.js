/**
 * Nama File: adminController.js
 * Fungsi: Controller CRUD admin + ganti password + upload foto
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const userModel = require('../../models/admin/adminModel');
const db = require('../../config/db');
const hashUtils = require('../../utils/hash');
const fs = require('fs');
const path = require('path');

// GET: Ambil daftar semua admin dengan data profil lengkap
const getAdmin = async (req, res) => {
    try {
        const rows = await userModel.getAdminList();
        const adminList = rows.map(row => {
            let tanggal_lahir = '';
            if (row.tanggal_lahir) {
                if (row.tanggal_lahir instanceof Date) {
                    const d = row.tanggal_lahir;
                    tanggal_lahir = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                } else if (typeof row.tanggal_lahir === 'string') {
                    tanggal_lahir = row.tanggal_lahir.split('T')[0];
                }
            }
            return {
                id: row.id, nama: row.nama, email: row.email, statusAdmin: row.statusAdmin,
                niy: row.niy || '', nuptk: row.nuptk || '', tempat_lahir: row.tempat_lahir || '',
                tanggal_lahir: tanggal_lahir, jenis_kelamin: row.jenis_kelamin || '',
                alamat: row.alamat || '', no_telepon: row.no_telepon || '', profileImage: row.foto_path || null
            };
        });
        res.json({ success: true, data: adminList });
    } catch (err) {
        console.error('Error get admin:', err);
        res.status(500).json({ message: 'Gagal mengambil data admin' });
    }
};

// GET: Ambil detail admin berdasarkan ID
const getAdminById = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await userModel.findById(id);
        if (!admin) return res.status(404).json({ message: 'Admin tidak ditemukan' });

        const [guruRows] = await db.execute(
            'SELECT niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, foto_path FROM guru WHERE user_id = ?',
            [id]
        );
        const guru = guruRows[0] || {};

        res.json({
            success: true,
            data: {
                id: admin.id_user, nama: admin.nama_lengkap, email: admin.email_sekolah,
                statusAdmin: admin.status === 'aktif' ? 'AKTIF' : 'NONAKTIF',
                niy: guru.niy || '', nuptk: guru.nuptk || '', jenis_kelamin: guru.jenis_kelamin || '',
                alamat: guru.alamat || '', no_telepon: guru.no_telepon || '',
                tempat_lahir: guru.tempat_lahir || '', tanggal_lahir: guru.tanggal_lahir || null,
                profileImage: guru.foto_path || null
            }
        });
    } catch (err) {
        console.error('Error get admin by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail admin' });
    }
};

// POST: Tambah admin baru dengan data profil lengkap
const tambahAdmin = async (req, res) => {
    const { nama_lengkap, email_sekolah, tempat_lahir, tanggal_lahir, jenis_kelamin, niy, nuptk, alamat, no_telepon } = req.body;

    // Validasi input wajib
    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const adminData = {
            email_sekolah, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin,
            niy: niy || null, nuptk: nuptk || null, alamat: alamat || null, no_telepon: no_telepon || null
        };
        const id_user = await userModel.createAdmin(adminData, connection);
        await connection.commit();
        res.status(201).json({ message: 'Admin berhasil ditambahkan', id: id_user });
    } catch (err) {
        await connection.rollback();
        console.error('Error tambah admin:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ message: 'Email sudah terdaftar. Silakan gunakan email yang berbeda.' });
        }
        res.status(500).json({ message: 'Gagal menambah admin' });
    } finally {
        connection.release();
    }
};

// PUT: Update data admin berdasarkan ID
const editAdmin = async (req, res) => {
    const { id } = req.params;
    const { nama_lengkap, email_sekolah, tempat_lahir, tanggal_lahir, jenis_kelamin, niy, nuptk, alamat, no_telepon, status } = req.body;

    // Validasi input wajib
    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const adminData = {
            email_sekolah, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin,
            niy: niy || null, nuptk: nuptk || null, alamat: alamat || null, no_telepon: no_telepon || null,
            status: status || 'aktif'
        };
        await userModel.updateAdmin(id, adminData, connection);
        await connection.commit();
        res.json({ message: 'Data admin berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        console.error('Error edit admin:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ message: 'Email sudah terdaftar. Silakan gunakan email yang berbeda.' });
        }
        res.status(500).json({ message: 'Gagal memperbarui data admin' });
    } finally {
        connection.release();
    }
};

// PUT: Ganti password admin dengan verifikasi password lama
const gantiPasswordAdmin = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validasi input
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Kata sandi lama dan baru wajib diisi' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Kata sandi baru minimal 8 karakter' });

    try {
        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

        // Verifikasi password lama (Pakai hashUtils yang aman untuk Linux)
        const isMatch = await hashUtils.comparePassword(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Kata sandi lama salah' });

        // Hash dan update password baru
        const hashedPassword = await hashUtils.hashPassword(newPassword);
        const success = await userModel.updatePassword(userId, hashedPassword);
        if (!success) return res.status(500).json({ message: 'Gagal memperbarui password' });

        return res.json({ message: 'Kata sandi berhasil diubah' });
    } catch (err) {
        console.error('Error ganti password admin:', err);
        return res.status(500).json({ message: 'Terjadi kesalahan saat mengganti kata sandi' });
    }
};

// PUT: Upload foto profil admin
const uploadFotoProfil = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ message: 'File foto diperlukan' });

        const fotoPath = '/uploads/' + req.file.filename;

        // PERBAIKAN: Hapus foto lama sebelum update
        const [guruRows] = await db.execute('SELECT foto_path FROM guru WHERE user_id = ?', [userId]);

        if (guruRows.length > 0 && guruRows[0].foto_path) {
            // Hapus file foto lama dari disk
            const oldFotoPath = path.join(__dirname, '../../public', guruRows[0].foto_path);
            if (fs.existsSync(oldFotoPath)) {
                fs.unlinkSync(oldFotoPath);
            }
            // Update foto_path di database
            await db.execute('UPDATE guru SET foto_path = ? WHERE user_id = ?', [fotoPath, userId]);
        } else {
            // Insert data guru baru jika belum ada
            await db.execute('INSERT INTO guru (user_id, foto_path) VALUES (?, ?)', [userId, fotoPath]);
        }

        res.json({ message: 'Foto profil berhasil diupload', fotoPath: fotoPath });
    } catch (err) {
        console.error('Error upload foto profil:', err);
        res.status(500).json({ message: 'Gagal mengupload foto profil' });
    }
};

module.exports = { getAdmin, getAdminById, tambahAdmin, editAdmin, gantiPasswordAdmin, uploadFotoProfil };