/**
 * Nama File: db.js
 * Fungsi: Mengelola koneksi pool ke database MySQL/MariaDB untuk sistem e-rapor.
 *         Menginisialisasi connection pool dan melakukan uji koneksi saat server dijalankan.
 *         Konfigurasi database diambil dari environment variables (.env).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const mysql = require('mysql2/promise');

// ═════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION POOL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Connection pool untuk database MariaDB/MySQL.
 * Konfigurasi diambil dari environment variables:
 *   - DB_HOST: Host database
 *   - DB_USER: Username database
 *   - DB_PASSWORD: Password database
 *   - DB_NAME: Nama database
 * 
 * Fitur:
 *   - Pool dengan maksimal 10 koneksi
 *   - dateStrings: true untuk format tanggal string
 *   - Auto-reconnect jika koneksi terputus
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
});

// ═════════════════════════════════════════════════════════════════════════════
// CONNECTION TEST
// ═════════════════════════════════════════════════════════════════════════════

// Test 1: Verifikasi koneksi database
pool.getConnection()
    .then(() => {
        console.log('Koneksi ke MariaDB berhasil');
    })
    .catch(err => {
        console.error('Gagal koneksi ke MariaDB:', err.message);
        process.exit(1); // Hentikan proses jika koneksi gagal
    });

// Test 2: Verifikasi query execution
pool.execute('SELECT 1')
    .then(() => {
        console.log('Query test berhasil');
    })
    .catch(err => {
        console.error('Query test gagal:', err.message);
    });

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = pool;