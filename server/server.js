/**
 * Nama File: server.js
 * Fungsi: Titik masuk utama aplikasi backend E-Rapor SDIT Ulil Albab.
 *         Menginisialisasi Express, middleware, routing, dan error handling.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Inisialisasi aplikasi Express
const app = express();

// Konstanta konfigurasi server
const PORT = process.env.PORT || 5000;
const UPLOADS_PATH = path.join(__dirname, 'public', 'uploads');
const TEMPLATES_PATH = path.join(__dirname, 'public', 'templates');

// Konfigurasi opsi CORS
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',');
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware keamanan dengan CSP diperketat
app.use(
  helmet({
    // PERBAIKAN: Izinkan aset statis (foto/logo) dimuat oleh frontend (origin berbeda)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"]
      }
    }
  })
);
app.use(cors(corsOptions));

// Rate limiter untuk mencegah brute force pada login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Terlalu banyak percobaan login, coba lagi nanti.' }
});

// Rate limiter umum untuk API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: 'Terlalu banyak request API.' }
});

// Parsing body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Buat direktori uploads dan templates jika belum tersedia
if (!fs.existsSync(UPLOADS_PATH)) fs.mkdirSync(UPLOADS_PATH, { recursive: true });
if (!fs.existsSync(TEMPLATES_PATH)) fs.mkdirSync(TEMPLATES_PATH, { recursive: true });

// Sediakan akses file statis untuk folder uploads
app.use('/uploads', express.static(UPLOADS_PATH));

// Folder templates tidak diakses publik langsung (aman)
// Jika butuh akses, gunakan controller dengan middleware authenticate

// Impor modul routing API
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const guruKelasRoutes = require('./routes/guruKelasRoutes');
const guruBidangStudiRoutes = require('./routes/guruBidangStudiRoutes');
const sekolahPublicRoutes = require('./routes/sekolahPublicRoutes');

// Daftarkan routing dengan rate limiter
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/guru-kelas', guruKelasRoutes);
app.use('/api/guru-bidang-studi', guruBidangStudiRoutes);
app.use('/api/sekolah', sekolahPublicRoutes);

// Endpoint debug HANYA aktif di mode development
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/uploads', (req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_PATH);
      res.json({
        uploadsPath: UPLOADS_PATH,
        files: files,
        fileCount: files.length,
        exists: fs.existsSync(UPLOADS_PATH)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Endpoint root untuk health check aplikasi
app.get('/', (req, res) => {
  res.send('Backend E-Rapor SDIT Ulil Albab berjalan!');
});

// Handler untuk endpoint yang tidak ditemukan (404 Not Found)
// PENTING: Handler 404 harus sebelum error handler global
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Global error handler untuk menangani error di seluruh aplikasi
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Ukuran file terlalu besar (maksimal 5MB)' });
  }

  const invalidFileErrors = [
    'Format file tidak didukung',
    'Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'
  ];

  if (invalidFileErrors.includes(err.message)) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Jalankan server dan tampilkan status aktif
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;