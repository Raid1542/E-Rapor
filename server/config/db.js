/**
 * Nama File: db.js
 * Fungsi: Connection pool MySQL/MariaDB (config dari .env, max 10 koneksi)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const mysql = require('mysql2/promise');

// ═════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION POOL
// ═════════════════════════════════════════════════════════════════════════════

// Connection pool untuk database MariaDB/MySQL (config dari environment variables)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 30,        
    connectTimeout: 30000,       // ✅ Timeout saat connect (pengganti acquireTimeout)
    idleTimeout: 60000,          // ✅ Timeout koneksi idle (pengganti timeout)
    queueLimit: 0,               // ✅ Antrian tidak terbatas
    dateStrings: true,
    enableKeepAlive: true,       // ✅ Jaga koneksi tetap hidup
    keepAliveInitialDelay: 0
});


// ═════════════════════════════════════════════════════════════════════════════
// CONNECTION TEST
// ═════════════════════════════════════════════════════════════════════════════

// Test 1: Verifikasi koneksi database
pool.getConnection()
    .then(() => console.log('Koneksi ke MariaDB berhasil'))
    .catch(err => {
        console.error('Gagal koneksi ke MariaDB:', err.message);
        process.exit(1); // Hentikan proses jika koneksi gagal
    });

// Test 2: Verifikasi query execution
pool.execute('SELECT 1')
    .then(() => console.log('Query test berhasil'))
    .catch(err => console.error('Query test gagal:', err.message));

module.exports = pool;