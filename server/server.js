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

// Konstanta untuk port dan path
const PORT = process.env.PORT || 5000;
const UPLOADS_PATH = path.join(__dirname, 'public', 'uploads');
const TEMPLATES_PATH = path.join(__dirname, 'public', 'templates');

// Konfigurasi CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware CORS
app.use(cors(corsOptions));

// Middleware untuk parsing body request
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Pastikan folder uploads tersedia
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

// Pastikan folder templates tersedia
if (!fs.existsSync(TEMPLATES_PATH)) {
  fs.mkdirSync(TEMPLATES_PATH, { recursive: true });
}

// Sediakan file statis untuk uploads dan templates
app.use('/uploads', express.static(UPLOADS_PATH));
app.use('/templates', express.static(TEMPLATES_PATH));

// Import dan konfigurasi routing API
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const guruKelasRoutes = require('./routes/guruKelasRoutes');
const guruBidangStudiRoutes = require('./routes/guruBidangStudiRoutes');
const sekolahPublicRoutes = require('./routes/sekolahPublicRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/guru-kelas', guruKelasRoutes);
app.use('/api/guru-bidang-studi', guruBidangStudiRoutes);
app.use('/api/sekolah', sekolahPublicRoutes);

// Endpoint debug untuk keperluan development
app.get('/debug/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_PATH);
    
    res.json({
      uploadsPath: UPLOADS_PATH,
      files: files,
      fileCount: files.length,
      exists: fs.existsSync(UPLOADS_PATH),
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

// Endpoint root untuk health check
app.get('/', (req, res) => {
  res.send('Backend E-Rapor SDIT Ulil Albab berjalan!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);

  // Tangani error Multer untuk file upload
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Ukuran file terlalu besar (maksimal 5MB)',
      });
    }
  }

  // Tangani error format file yang tidak didukung
  const invalidFileErrors = [
    'Format file tidak didukung',
    'Hanya file .png, .jpg, .jpeg, .webp yang diizinkan',
  ];

  if (invalidFileErrors.includes(err.message)) {
    return res.status(400).json({ 
      message: err.message 
    });
  }

  // Tangani error umum
  res.status(500).json({
    message: 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Handler untuk endpoint tidak ditemukan (404)
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Endpoint tidak ditemukan' 
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});