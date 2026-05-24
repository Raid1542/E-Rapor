const db = require('../../config/db');
const guruModel = require('../../models/guruModel');

const getDashboardStats = async (req, res) => {
    try {
        const taId = req.idTahunAjaranInduk; // Ambil dari middleware

        if (!taId || typeof taId !== 'number') {
            return res
                .status(500)
                .json({ message: 'Tidak ada tahun ajaran aktif yang valid' });
        }

        // Count Guru
        const [guruRows] = await db.execute(`
            SELECT COUNT(DISTINCT u.id_user) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role IN ('guru kelas', 'guru bidang studi')
                AND u.status = 'aktif'
        `);

        // Count Siswa
        const [siswaRows] = await db.execute(
            `
            SELECT COUNT(*) AS total
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.tahun_ajaran_id = ?
        `,
            [taId]
        );

        // Count Admin
        const [adminRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role = 'admin'
                AND u.status = 'aktif'
        `);

        // Count Ekstrakurikuler
        const [ekskulRows] = await db.execute(
            `
            SELECT COUNT(*) AS total
            FROM ekstrakurikuler
            WHERE tahun_ajaran_id = ?
        `,
            [taId]
        );

        // Count Kelas
        const [kelasRows] = await db.execute(
            `
            SELECT COUNT(*) AS total
            FROM kelas
            WHERE tahun_ajaran_id = ?
        `,
            [taId]
        );

        // Count Mata Pelajaran
        const [mapelRows] = await db.execute(
            `
            SELECT COUNT(*) AS total
            FROM mata_pelajaran
            WHERE tahun_ajaran_id = ?
        `,
            [taId]
        );

        res.json({
            success: true,
            data: {
                guru: Number(guruRows[0].total) || 0,
                siswa: Number(siswaRows[0].total) || 0,
                admin: Number(adminRows[0].total) || 0,
                ekstrakurikuler: Number(ekskulRows[0].total) || 0,
                kelas: Number(kelasRows[0].total) || 0,
                mata_pelajaran: Number(mapelRows[0].total) || 0,
            },
        });
    } catch (err) {
        console.error('Error get dashboard stats:', err);
        res.status(500).json({ message: 'Gagal memuat statistik dashboard' });
    }
};

const uploadFotoProfil = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File foto diperlukan' });
        }

        const userId = req.user.id; // Dari JWT middleware
        const fotoPath = `/uploads/${req.file.filename}`;

        // Simpan path ke database
        const success = await guruModel.updateFoto(userId, fotoPath);

        if (!success) {
            return res.status(404).json({ message: 'Guru tidak ditemukan' });
        }

        // Perbarui localStorage di frontend nanti
        res.json({
            success: true,
            message: 'Foto profil berhasil diupload',
            fotoPath,
        });
    } catch (err) {
        console.error('Error upload foto profil:', err);
        res.status(500).json({ message: 'Gagal mengupload foto profil' });
    }
};

module.exports = {
    getDashboardStats,
    uploadFotoProfil
};