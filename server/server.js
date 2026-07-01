/**
 * Nama File: server.js
 * Fungsi: Titik masuk utama aplikasi backend E-Rapor SDIT Ulil Albab.
 *         Menginisialisasi Express, middleware, routing, dan error handling.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Middleware CORS
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Pastikan folder uploads tersedia
const uploadsPath = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Pastikan folder templates tersedia
const templatesPath = path.join(__dirname, 'public', 'templates');
if (!fs.existsSync(templatesPath)) {
  fs.mkdirSync(templatesPath, { recursive: true });
}

// Sediakan file statis
app.use('/uploads', express.static(uploadsPath));
app.use('/templates', express.static(templatesPath));

// Routing API
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const guruKelasRoutes = require('./routes/guruKelasRoutes');
app.use('/api/guru-kelas', guruKelasRoutes);

const guruBidangStudiRoutes = require('./routes/guruBidangStudiRoutes');
app.use('/api/guru-bidang-studi', guruBidangStudiRoutes);

const sekolahPublicRoutes = require('./routes/sekolahPublicRoutes');
app.use('/api/sekolah', sekolahPublicRoutes);

// Endpoint debug untuk keperluan development
app.get('/debug/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      uploadsPath,
      files,
      fileCount: files.length,
      exists: fs.existsSync(uploadsPath),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint root
app.get('/', (req, res) => {
  res.send('Backend E-Rapor SDIT Ulil Albab berjalan!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);

  // Tangani error Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Ukuran file terlalu besar (maksimal 5MB)',
      });
    }
  }

  // Tangani error format file
  if (
    err.message === 'Format file tidak didukung' ||
    err.message === 'Hanya file .png, .jpg, .jpeg, .webp yang diizinkan'
  ) {
    return res.status(400).json({ message: err.message });
  }

  // Tangani error umum
  res.status(500).json({
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Handler untuk endpoint tidak ditemukan (404)
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
