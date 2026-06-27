const db = require('../config/db');

const cekGuruKelasDitugaskan = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        let idInduk = req.idTahunAjaranInduk;

        if (!idInduk) {
            const [taRows] = await db.execute(`
                SELECT id_tahun_ajaran_induk, id_tahun_ajaran, semester
                FROM tahun_ajaran 
                WHERE status = 'aktif'
                LIMIT 1
            `);

            if (taRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tahun ajaran aktif belum diatur oleh admin.'
                });
            }

            idInduk = taRows[0].id_tahun_ajaran_induk;
            req.idTahunAjaranInduk = idInduk;
            req.idSemesterAktif = taRows[0].id_tahun_ajaran;
        }

        console.log('🔍 [cekGuruKelasDitugaskan] userId:', userId, 'idInduk:', idInduk);

        // ✅ PERBAIKAN: JOIN ke tahun_ajaran untuk konversi id_induk → semester_id
        const [rows] = await db.execute(
            `SELECT gk.id_guru_kelas, gk.kelas_id, k.nama_kelas 
             FROM guru_kelas gk
             INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
             INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
             WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
             LIMIT 1`,
            [userId, idInduk]  // ← Sekarang cocok!
        );

        console.log('🔍 [cekGuruKelasDitugaskan] Hasil:', rows);

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini. Silakan hubungi Admin.',
                code: 'NOT_ASSIGNED'
            });
        }

        req.infoKelasWali = {
            id_guru_kelas: rows[0].id_guru_kelas,
            kelas_id: rows[0].kelas_id,
            nama_kelas: rows[0].nama_kelas
        };

        next();

    } catch (error) {
        console.error('❌ Error di middleware:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
};

module.exports = cekGuruKelasDitugaskan;