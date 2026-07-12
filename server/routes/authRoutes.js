/**
 * Nama File: authRoutes.js
 * Fungsi: Route autentikasi untuk login pengguna
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Endpoint untuk login pengguna
router.post('/login', authController.login);

module.exports = router;