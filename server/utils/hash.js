/**
 * Nama File: hash.js
 * Fungsi: Utilitas untuk hashing dan verifikasi password menggunakan bcryptjs.
 *         Digunakan untuk keamanan autentikasi pengguna.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const bcrypt = require('bcryptjs');

// Konstanta untuk salt rounds (jumlah iterasi hashing)
const SALT_ROUNDS = 10;

// Objek hash untuk operasi hashing dan verifikasi password
const hash = {
  // Menghasilkan hash dari password teks biasa
  async hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password harus berupa string yang valid');
    }
    
    try {
      return await bcrypt.hash(password, SALT_ROUNDS);
    } catch (err) {
      console.error('Gagal melakukan hashing password:', err);
      throw new Error('Terjadi kesalahan saat hashing password');
    }
  },

  // Membandingkan password teks biasa dengan hash yang tersimpan
  async comparePassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      throw new Error('Password dan hashed password wajib diisi');
    }
    
    if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
      throw new Error('Password dan hashed password harus berupa string');
    }
    
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (err) {
      console.error('Gagal memverifikasi password:', err);
      throw new Error('Terjadi kesalahan saat verifikasi password');
    }
  },
};

module.exports = hash;