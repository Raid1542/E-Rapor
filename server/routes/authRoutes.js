/**
 * Nama File: authRoutes.js
 * Fungsi: Route autentikasi untuk login pengguna.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const express = require('express');
const authController = require('../controllers/authController');

// Inisialisasi router Express
const router = express.Router();

// Endpoint untuk proses login pengguna
router.post('/login', authController.login);

// Ekspor router untuk digunakan di file server utama
module.exports = router;