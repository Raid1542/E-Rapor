/**
 * Nama File: guruKelasController.js
 * Fungsi: Controller manajemen wali kelas (get/set) + daftar guru kelas
 * UPDATE: ✅ FIXED - Set wali kelas untuk SEMUA semester dalam tahun ajaran
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Helper: Ambil SEMUA semester dalam tahun ajaran
const getAllSemester = async (idInduk) => {
    const [rows] = await db.execute(
        'SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ?',
        [idInduk]
    );
    return rows;
};

// Helper: Set wali kelas untuk SEMUA semester dalam tahun ajaran
const setWaliKelasForAllSemesters = async (userId, kelasId, idInduk) => {
    const semesters = await getAllSemester(idInduk);
    
    for (const sem of semesters) {
        // Delete record lama
        await db.execute(
            'DELETE FROM guru_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?',
            [kelasId, sem.id_tahun_ajaran]
        );
        
        // Insert record baru
        await db.execute(
            `INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id, created_at, updated_at) 
             VALUES (?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE updated_at = NOW()`,
            [userId, kelasId, sem.id_tahun_ajaran]
        );
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

const getWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;
        if (!taId) return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });

        const [rows] = await db.execute(
            `SELECT u.id_user AS user_id, u.nama_lengkap AS nama 
             FROM guru_kelas gk 
             JOIN user u ON gk.user_id = u.id_user 
             JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
             WHERE gk.kelas_id = ? AND ta.id_tahun_ajaran_induk = ?
             LIMIT 1`,
            [id, taId]
        );
        const waliKelas = rows.length > 0 ? rows[0] : null;
        res.json({ success: true, data: waliKelas });
    } catch (err) {
        console.error('Error get wali kelas:', err);
        res.status(500).json({ message: 'Gagal mengambil data wali kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. SET WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

const setWaliKelas = async (req, res) => {
    const { user_id } = req.body;
    const { id } = req.params;

    // Validasi user_id
    if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
        return res.status(400).json({ success: false, message: 'user_id harus angka positif' });
    }

    // Validasi ID kelas
    if (!id || isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'ID kelas tidak valid' });
    }

    const taId = req.idTahunAjaranInduk;
    if (!taId) return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });

    try {
        // Validasi keberadaan kelas
        const [kelasResult] = await db.execute('SELECT id_kelas FROM kelas WHERE id_kelas = ?', [id]);
        if (kelasResult.length === 0) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

        // Validasi guru (role guru_kelas + status aktif)
        const [guruResult] = await db.execute(
            `SELECT u.id_user 
             FROM user u 
             INNER JOIN user_role ur ON u.id_user = ur.id_user 
             WHERE u.id_user = ? AND ur.role = 'guru_kelas' AND u.status = 'aktif'`,
            [user_id]
        );
        if (guruResult.length === 0) return res.status(404).json({ success: false, message: 'Guru tidak ditemukan atau bukan guru kelas aktif' });

        // ✅ PERBAIKAN: Cek apakah guru sudah menjadi wali kelas di kelas lain
        const [cekGuruSudahPunyaKelas] = await db.execute(
            `SELECT k.nama_kelas 
             FROM guru_kelas gk 
             JOIN kelas k ON gk.kelas_id = k.id_kelas 
             JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
             WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ? AND gk.kelas_id != ?`,
            [user_id, taId, id]
        );
        if (cekGuruSudahPunyaKelas.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Guru ini sudah menjadi wali kelas di "${cekGuruSudahPunyaKelas[0].nama_kelas}" pada tahun ajaran yang sama.`
            });
        }

        // ✅ PERBAIKAN: Set wali kelas untuk SEMUA semester dalam tahun ajaran
        await setWaliKelasForAllSemesters(user_id, id, taId);
        
        res.json({ success: true, message: 'Wali kelas berhasil ditetapkan' });
    } catch (err) {
        console.error('Error set wali kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal menetapkan wali kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. GET DAFTAR GURU KELAS
// ═════════════════════════════════════════════════════════════════════════════

const getGuruKelasList = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT u.id_user AS user_id, u.nama_lengkap AS nama 
             FROM user u 
             INNER JOIN user_role ur ON u.id_user = ur.id_user 
             WHERE u.status = 'aktif' AND ur.role = 'guru_kelas' 
             ORDER BY u.nama_lengkap ASC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get guru kelas list:', err);
        res.status(500).json({ message: 'Gagal mengambil daftar guru kelas' });
    }
};

module.exports = { getWaliKelas, setWaliKelas, getGuruKelasList };