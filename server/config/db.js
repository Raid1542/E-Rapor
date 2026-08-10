/**
 * Nama File: db.js
 * Fungsi: Connection pool MySQL/MariaDB (config dari .env, max 10 koneksi)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const mysql = require('mysql2/promise');

// Konfigurasi connection pool untuk database MariaDB/MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 30,
    connectTimeout: 30000,
    idleTimeout: 60000,
    queueLimit: 0,
    dateStrings: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Verifikasi koneksi database saat inisialisasi
pool.getConnection()
    .then(() => {
        console.log('Koneksi ke MariaDB berhasil');
    })
    .catch((err) => {
        console.error('Gagal koneksi ke MariaDB:', err.message);
        process.exit(1);
    });

// Verifikasi eksekusi query dasar (hanya di development)
if (process.env.NODE_ENV === 'development') {
    pool.execute('SELECT 1')
        .then(() => {
            console.log('Query test berhasil');
        })
        .catch((err) => {
            console.error('Query test gagal:', err.message);
        });
}

module.exports = pool;