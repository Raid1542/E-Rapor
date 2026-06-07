const db = require('../../config/db');
const guruModel = require('../../models/guruModel');

const getDashboardStats = async (req, res) => {
    try {
        // Cari ID DETAIL dan ID INDUK yang status = 'aktif'
        const [taAktif] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester
            FROM tahun_ajaran 
            WHERE status = 'aktif' 
            LIMIT 1
        `);

        if (taAktif.length === 0) {
            return res.json({
                success: true,
                data: {
                    guru: 0, siswa: 0, admin: 0,
                    ekstrakurikuler: 0, kelas: 0, mata_pelajaran: 0,
                }
            });
        }

        const taIdDetail = taAktif[0].id_tahun_ajaran;          
        const taIdInduk = taAktif[0].id_tahun_ajaran_induk;  
        const semesterAktif = taAktif[0].semester;             

        console.log('🔍 [Dashboard] TA Aktif:', { 
            taIdDetail, 
            taIdInduk, 
            semester: semesterAktif 
        });

        // Count Guru (aktif saja)
        const [guruRows] = await db.execute(`
            SELECT COUNT(DISTINCT u.id_user) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role IN ('guru kelas', 'guru bidang studi')
                AND u.status = 'aktif'
        `);
        const guruCount = Number(guruRows[0].total) || 0;

        // Count Siswa (hanya yang AKTIF + di TA aktif)
        const [siswaRows] = await db.execute(`
            SELECT COUNT(DISTINCT s.id_siswa) AS total
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.tahun_ajaran_id = ?
                AND (s.status = 'aktif' OR s.status IS NULL)
        `, [taIdDetail]);
        const siswaCount = Number(siswaRows[0].total) || 0;

        // Count Admin (aktif saja)
        const [adminRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role = 'admin'
                AND u.status = 'aktif'
        `);
        const adminCount = Number(adminRows[0].total) || 0;

        // Count Ekstrakurikuler (CEK 2 KEMUNGKINAN)
        const [ekskulRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM ekstrakurikuler
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);
        const ekskulCount = Number(ekskulRows[0].total) || 0;

        // Count Kelas (CEK 2 KEMUNGKINAN)
        const [kelasRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM kelas
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);
        const kelasCount = Number(kelasRows[0].total) || 0;

        // Count Mata Pelajaran (CEK 2 KEMUNGKINAN)
        const [mapelRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM mata_pelajaran
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);
        const mapelCount = Number(mapelRows[0].total) || 0;

        res.json({
            success: true,
            data: {
                guru: guruCount,
                siswa: siswaCount,
                admin: adminCount,
                ekstrakurikuler: ekskulCount,
                kelas: kelasCount,
                mata_pelajaran: mapelCount,
            },
            debug: {
                ta_aktif: {
                    id_detail: taIdDetail,
                    id_induk: taIdInduk,
                    semester: semesterAktif
                },
                counts: {
                    guru: guruCount,
                    siswa: siswaCount,
                    admin: adminCount,
                    ekskul: ekskulCount,
                    kelas: kelasCount,
                    mapel: mapelCount
                }
            }
        });
    } catch (err) {
        console.error('Error getDashboardStats:', err);
        res.status(500).json({ 
            success: false,
            message: 'Gagal memuat statistik dashboard' 
        });
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