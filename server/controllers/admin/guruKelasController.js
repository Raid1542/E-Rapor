const db = require('../../config/db');

const getWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk; // ← Dari middleware cekTahunAjaranAktif
        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        const [rows] = await db.execute(
            `
            SELECT 
                u.id_user AS user_id,
                u.nama_lengkap AS nama
            FROM guru_kelas gk
            JOIN user u ON gk.user_id = u.id_user
            WHERE gk.kelas_id = ? AND gk.tahun_ajaran_id = ?
        `,
            [id, taId]
        );
        const waliKelas = rows.length > 0 ? rows[0] : null;
        res.json({ success: true, data: waliKelas });
    } catch (err) {
        console.error('Error get wali kelas:', err);
        res.status(500).json({ message: 'Gagal mengambil data wali kelas' });
    }
};

const setWaliKelas = async (req, res) => {
    const { user_id } = req.body;
    const { id } = req.params;
    if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
        return res.status(400).json({
            success: false,
            message: 'user_id harus angka positif',
        });
    }
    if (!id || isNaN(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: 'ID kelas tidak valid',
        });
    }
    const taId = req.idTahunAjaranInduk; // ← Dari middleware cekTahunAjaranAktif
    if (!taId) {
        return res
            .status(400)
            .json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
    }
    try {
        const [kelasResult] = await db.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ?',
            [id]
        );
        if (kelasResult.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'Kelas tidak ditemukan' });
        }
        const [guruResult] = await db.execute(
            `
            SELECT u.id_user 
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE u.id_user = ? AND ur.role = 'guru kelas' AND u.status = 'aktif'
        `,
            [user_id]
        );
        if (guruResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Guru tidak ditemukan atau bukan guru kelas aktif',
            });
        }
        const updateQuery = `
            INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE user_id = ?
        `;
        await db.execute(updateQuery, [user_id, id, taId, user_id]);
        res.json({
            success: true,
            message: 'Wali kelas berhasil ditetapkan',
        });
    } catch (err) {
        console.error('Error set wali kelas:', err);
        res
            .status(500)
            .json({ success: false, message: 'Gagal menetapkan wali kelas' });
    }
};

const getGuruKelasList = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                u.id_user AS user_id,
                u.nama_lengkap AS nama
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE u.status = 'aktif'
                AND ur.role = 'guru kelas'
            ORDER BY u.nama_lengkap ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get guru kelas list:', err);
        res.status(500).json({ message: 'Gagal mengambil daftar guru kelas' });
    }
};

module.exports = {
    getWaliKelas,
    setWaliKelas,
    getGuruKelasList
};