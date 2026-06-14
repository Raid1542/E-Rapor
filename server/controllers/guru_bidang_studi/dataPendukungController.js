/**
 * Nama File: dataPendukungController.js
 * Fungsi: Mengelola data pendukung untuk guru bidang studi
 *         FIXED: Gunakan id_tahun_ajaran (bukan id_tahun_ajaran_induk)
 */

const db = require('../../config/db');

const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT 
            ta.id_tahun_ajaran,
            ta.id_tahun_ajaran_induk,
            ta.tahun_ajaran,
            ta.semester,
            ta.status_pts,
            ta.status_pas
        FROM tahun_ajaran ta
        WHERE ta.status = 'aktif'
        LIMIT 1
    `);
    
    return taRows.length > 0 ? taRows[0] : null;
};

/**
 * TAMBAHKAN FUNGSI INI di bagian akhir file
 */
exports.getKelasByMapel = async (req, res) => {
    try {
        const { mapel_id } = req.query;
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;

        if (!mapel_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter mapel_id wajib diisi'
            });
        }

        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        if (!semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Konteks tahun ajaran tidak ditemukan'
            });
        }

        // Ambil kelas yang diajar guru untuk mapel ini
        const [rows] = await db.execute(`
            SELECT DISTINCT k.id_kelas AS kelas_id, k.nama_kelas
            FROM pembelajaran p
            INNER JOIN kelas k ON p.kelas_id = k.id_kelas
            WHERE p.user_id = ? 
            AND p.mapel_id = ?
            AND p.tahun_ajaran_id = ?
            ORDER BY k.nama_kelas
        `, [userId, mapelIdNum, semesterId]);

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini di kelas manapun'
            });
        }

        res.json({
            success: true,
            data: rows
        });

    } catch (err) {
        console.error('Error getKelasByMapel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar kelas'
        });
    }
};

exports.getDaftarMapel = async (req, res) => {
    try {
        const userId = req.user.id;

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran aktif tidak ditemukan.'
            });
        }

        const tahunAjaranId = taAktif.id_tahun_ajaran;

        const [rows] = await db.execute(`
            SELECT DISTINCT 
                mp.id_mata_pelajaran AS mata_pelajaran_id, 
                mp.nama_mapel, 
                mp.jenis
            FROM pembelajaran p
            JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
            WHERE p.user_id = ? 
                AND p.tahun_ajaran_id = ?
                AND mp.jenis = 'pilihan'  -- ✅ HANYA MAPEL PILIHAN
            ORDER BY mp.nama_mapel
        `, [userId, tahunAjaranId]);

        res.json({ 
            success: true, 
            data: rows 
        });
    } catch (err) {
        console.error('Error getDaftarMapel:', err);
        res.status(500).json({ 
            success: false,
            message: 'Gagal mengambil daftar mata pelajaran' 
        });
    }
};

exports.getDaftarKelas = async (req, res) => {
    try {
        const userId = req.user.id;

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran aktif tidak ditemukan.'
            });
        }

        const tahunAjaranId = taAktif.id_tahun_ajaran;

        const [kelasRows] = await db.execute(`
            SELECT DISTINCT k.id_kelas, k.nama_kelas
            FROM pembelajaran p
            JOIN kelas k ON p.kelas_id = k.id_kelas
            WHERE p.user_id = ? 
                AND p.tahun_ajaran_id = ?
            ORDER BY k.nama_kelas
        `, [userId, tahunAjaranId]);

        res.json({
            success: true,
            data: kelasRows.map(row => ({
                kelas_id: row.id_kelas,
                nama_kelas: row.nama_kelas,
            })),
        });
    } catch (err) {
        console.error('Error getDaftarKelas:', err);
        res.status(500).json({ 
            success: false,
            message: 'Gagal mengambil daftar kelas' 
        });
    }
};

exports.getKomponenPenilaian = async (req, res) => {
    try {
        const [komponen] = await db.execute(`
            SELECT id_komponen, nama_komponen, urutan
            FROM komponen_penilaian
            ORDER BY urutan ASC
        `);
        res.json({ 
            success: true, 
            data: komponen 
        });
    } catch (err) {
        console.error('Error get komponen:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil komponen' 
        });
    }
};

exports.getTahunAjaranAktif = async (req, res) => {
    try {
        const taAktif = await getTahunAjaranAktif();
        
        if (!taAktif) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur oleh admin.',
            });
        }
        
        res.json({
            success: true,
            data: {
                id_tahun_ajaran: taAktif.id_tahun_ajaran,
                id_tahun_ajaran_induk: taAktif.id_tahun_ajaran_induk,
                tahun_ajaran: taAktif.tahun_ajaran,
                semester: taAktif.semester,
                status_pts: taAktif.status_pts,
                status_pas: taAktif.status_pas,
            },
        });
    } catch (err) {
        console.error('Error getTahunAjaranAktif:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil tahun ajaran aktif',
        });
    }
};