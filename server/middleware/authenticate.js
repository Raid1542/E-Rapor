/**
 * Nama File: authenticate.js
 * Fungsi: Middleware verifikasi JWT token (dari header Authorization atau query)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const jwt = require('jsonwebtoken');

// Middleware: verifikasi JWT token dan simpan payload user di req.user
const authenticate = (req, res, next) => {
    let token = null;
    const authHeader = req.headers['authorization'];

    // Ambil token dari header Authorization (Bearer) atau query parameter
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token && req.query && req.query.token) {
        token = req.query.token;
    }

    // Cek keberadaan token
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token tidak ditemukan', code: 'NO_TOKEN' });
    }

    try {
        // Verifikasi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Validasi payload token
        if (!decoded.id || !decoded.role) {
            return res.status(403).json({ success: false, message: 'Token tidak valid: payload tidak lengkap', code: 'INVALID_TOKEN' });
        }

        // Simpan data user di request object
        req.user = decoded;
        next();
    } catch (err) {
        // Handle token expired
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token telah kadaluarsa', code: 'TOKEN_EXPIRED' });
        }
        // Handle invalid token
        return res.status(403).json({ success: false, message: 'Token tidak valid', code: 'INVALID_TOKEN' });
    }
};

module.exports = authenticate;