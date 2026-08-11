/**
 * Nama File: seedAdmin.js
 * Fungsi: Script untuk membuat akun admin default di database.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mariadb = require("mariadb");

// Konfigurasi admin dari environment variable
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sekolah.sch.id";
const ADMIN_NAMA = process.env.ADMIN_NAMA || "admin 1";
const ADMIN_ROLE = process.env.ADMIN_ROLE || "admin";
const ADMIN_PASSWORD = process.env.DEFAULT_PASSWORD || "sekolah123";

async function seed() {
  // Koneksi ke database MariaDB
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Cek apakah admin sudah ada di database
    const existing = await conn.query(
      "SELECT id_user FROM user WHERE email_sekolah = ?",
      [ADMIN_EMAIL],
    );

    let idUser;
    if (existing.length > 0) {
      // Admin sudah ada, jangan timpa data
      idUser = existing[0].id_user;
      console.log("INFO: Admin sudah ada - tidak ada data yang ditimpa.");
    } else {
      // Buat akun admin baru dengan password di-hash
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const res = await conn.query(
        `INSERT INTO user (email_sekolah, password, nama_lengkap, status)
          VALUES (?, ?, ?, 'aktif')`,
        [ADMIN_EMAIL, hash, ADMIN_NAMA],
      );
      idUser = res.insertId;
      console.log("SUCCESS: Akun admin dibuat (password tersimpan sebagai hash bcrypt).");
    }

    // Pastikan role admin terdaftar
    await conn.query(
      "INSERT IGNORE INTO user_role (id_user, role) VALUES (?, ?)",
      [idUser, ADMIN_ROLE],
    );

    // Tampilkan info login
    console.log("--- Info login ---");
    console.log("Email    :", ADMIN_EMAIL);
    console.log("Password :", ADMIN_PASSWORD);
  } finally {
    await conn.end();
  }
}

// Jalankan seed
seed().catch((e) => {
  console.error("ERROR: Seed gagal:", e.message);
  process.exit(1);
});