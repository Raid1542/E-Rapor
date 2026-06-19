/**
 * Nama File: authController.js
 * Fungsi: Mengelola logika autentikasi pengguna, termasuk proses login,
 *         validasi kredensial, pengecekan peran (role), dan pembuatan token JWT.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const jwt = require('jsonwebtoken');
const { comparePassword } = require('../utils/hash');
const db = require('../config/db');
const userModel = require('../models/authModel');

/**
 * Melakukan autentikasi pengguna berdasarkan email, password, dan role yang dipilih.
 * Jika kredensial valid dan role sesuai, mengembalikan token JWT dan data pengguna.
 */
const login = async (req, res) => {
  const { email_sekolah, password, role: selectedRole } = req.body;

  // Validasi input wajib
  if (!email_sekolah || !password || !selectedRole) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, dan role wajib diisi',
    });
  }

  try {
    // Ambil data pengguna berdasarkan email
    const [userRows] = await db.execute(
      `SELECT u.id_user, u.email_sekolah, u.password, u.nama_lengkap, u.status, ur.role
            FROM user u
            JOIN user_role ur ON u.id_user = ur.id_user
            WHERE u.email_sekolah = ?`,
      [email_sekolah]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    const user = userRows[0];

    // Periksa status akun
    if (user.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif',
      });
    }

    // Verifikasi password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    // Ambil semua role pengguna
    const roles = await userModel.getRolesByUserId(user.id_user);
    if (!roles.includes(selectedRole)) {
      return res.status(403).json({
        success: false,
        message: `Anda tidak memiliki akses sebagai ${selectedRole}`,
      });
    }

    // Buat token JWT dengan role yang dipilih
    const token = jwt.sign(
      { id: user.id_user, role: selectedRole },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Ambil data tambahan dari tabel guru (jika ada)
    const [guruRows] = await db.execute(
      `SELECT niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, foto_path 
            FROM guru 
            WHERE user_id = ?`,
      [user.id_user]
    );
    const guruData = guruRows[0] || {};

    // Respons sukses
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id_user,
        role: selectedRole,
        roles: roles,
        nama_lengkap: user.nama_lengkap,
        email_sekolah: user.email_sekolah,
        profileImage: guruData.foto_path || null,
        niy: guruData.niy || '',
        nuptk: guruData.nuptk || '',
        jenis_kelamin: guruData.jenis_kelamin || 'Laki-laki',
        alamat: guruData.alamat || '',
        no_telepon: guruData.no_telepon || '',
        tempat_lahir: guruData.tempat_lahir || '',
        tanggal_lahir: guruData.tanggal_lahir || null,
      },
    });
  } catch (err) {
    console.error('Error login:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
};

// Ekspor controller
module.exports = { login };
