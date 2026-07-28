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

// Inisialisasi aplikasi Express
const app = express();

// Konstanta konfigurasi server
const PORT = process.env.PORT || 5000;
const UPLOADS_PATH = path.join(__dirname, 'public', 'uploads');
const TEMPLATES_PATH = path.join(__dirname, 'public', 'templates');

// Konfigurasi opsi CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Terapkan middleware CORS
app.use(cors(corsOptions));

// Terapkan middleware untuk parsing body request
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Buat direktori uploads jika belum tersedia
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

// Buat direktori templates jika belum tersedia
if (!fs.existsSync(TEMPLATES_PATH)) {
  fs.mkdirSync(TEMPLATES_PATH, { recursive: true });
}

// Sediakan akses file statis untuk folder uploads dan templates
app.use('/uploads', express.static(UPLOADS_PATH));
app.use('/templates', express.static(TEMPLATES_PATH));

// Impor modul routing API
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const guruKelasRoutes = require('./routes/guruKelasRoutes');
const guruBidangStudiRoutes = require('./routes/guruBidangStudiRoutes');
const sekolahPublicRoutes = require('./routes/sekolahPublicRoutes');

// Daftarkan routing ke aplikasi
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/guru-kelas', guruKelasRoutes);
app.use('/api/guru-bidang-studi', guruBidangStudiRoutes);
app.use('/api/sekolah', sekolahPublicRoutes);

// Endpoint debug untuk memeriksa isi folder uploads
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

// Endpoint root untuk health check aplikasi
app.get('/', (req, res) => {
  res.send('Backend E-Rapor SDIT Ulil Albab berjalan!');
});

// Global error handler untuk menangani error di seluruh aplikasi
app.use((err, req, res, next) => {
  // Tangani error khusus dari multer saat upload file
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Ukuran file terlalu besar (maksimal 5MB)'
      });
    }
  }

  // Daftar pesan error format file yang tidak valid
  const invalidFileErrors = [
    'Format file tidak didukung',
    'Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'
  ];

  // Tangani error format file yang tidak didukung
  if (invalidFileErrors.includes(err.message)) {
    return res.status(400).json({ message: err.message });
  }

  // Tangani error umum pada server
  res.status(500).json({
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handler untuk endpoint yang tidak ditemukan (404 Not Found)
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Jalankan server dan tampilkan status aktif
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;