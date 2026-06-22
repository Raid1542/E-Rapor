/**
 * Nama File: authController.js
 * ✅ UPDATED: Role langsung pakai underscore (sudah konsisten dengan database)
 */

const jwt = require('jsonwebtoken');
const { comparePassword } = require('../utils/hash');
const db = require('../config/db');
const userModel = require('../models/authModel');

const login = async (req, res) => {
  const { email_sekolah, password, role: selectedRole } = req.body;

  console.log('🔐 [Backend] Login attempt:', { email_sekolah, selectedRole });

  if (!email_sekolah || !password || !selectedRole) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, dan role wajib diisi',
    });
  }

  try {
    const [userRows] = await db.execute(
      `SELECT u.id_user, u.email_sekolah, u.password, u.nama_lengkap, u.status, ur.role
       FROM user u
       JOIN user_role ur ON u.id_user = ur.id_user
       WHERE u.email_sekolah = ?`,
      [email_sekolah]
    );

    if (userRows.length === 0) {
      console.log('❌ [Backend] User not found:', email_sekolah);
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    const user = userRows[0];

    if (user.status !== 'aktif') {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif',
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      console.log('❌ [Backend] Password mismatch for:', email_sekolah);
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    const roles = await userModel.getRolesByUserId(user.id_user);
    console.log('📋 [Backend] User roles from DB:', roles);
    console.log('🔍 [Backend] Checking if includes:', selectedRole);
    
    if (!roles.includes(selectedRole)) {
      console.log('❌ [Backend] Role mismatch! DB roles:', roles, 'Requested:', selectedRole);
      return res.status(403).json({
        success: false,
        message: `Anda tidak memiliki akses sebagai ${selectedRole}`,
      });
    }

    // ✅ FIX: Tambah penutup } di expiresIn
    const token = jwt.sign(
      { id: user.id_user, role: selectedRole },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }  // ← SUDAH BENAR
    );

    console.log('🔑 [Backend] Token created with role:', selectedRole);

    const [guruRows] = await db.execute(
      `SELECT niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, foto_path 
       FROM guru 
       WHERE user_id = ?`,
      [user.id_user]
    );
    const guruData = guruRows[0] || {};

    console.log('✅ [Backend] Login success for:', email_sekolah);

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
    console.error('❌ [Backend] Error login:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server: ' + err.message,
    });
  }
};

module.exports = { login };