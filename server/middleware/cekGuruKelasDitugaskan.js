/**
 * Nama File: cekGuruKelasDitugaskan.js
 * Fungsi: Memastikan user yang login ditugaskan sebagai wali kelas 
 *         di semester yang sedang aktif.
 */

const db = require('../config/db');

const cekGuruKelasDitugaskan = async (req, res, next) => {
    try {
        let tahunAjaranAktifId = req.idSemesterAktif;
        const userId = req.user.id;

        // ✅ TAMBAH: Jika req.idSemesterAktif tidak ada, fetch dari database
        if (!tahunAjaranAktifId) {
            console.log('⚠️ [cekGuruKelasDitugaskan] req.idSemesterAktif tidak ada, fetch dari database...');
            
            const [taRows] = await db.execute(`
                SELECT id_tahun_ajaran 
                FROM tahun_ajaran 
                WHERE status = 'aktif'
                LIMIT 1
            `);

            if (taRows.length === 0) {
                console.error('❌ [cekGuruKelasDitugaskan] Tidak ada tahun ajaran aktif!');
                return res.status(400).json({
                    success: false,
                    message: 'Tahun ajaran aktif belum diatur oleh admin.'
                });
            }

            tahunAjaranAktifId = taRows[0].id_tahun_ajaran;
            // Set juga ke req untuk digunakan controller
            req.idSemesterAktif = tahunAjaranAktifId;
            
            console.log('✅ [cekGuruKelasDitugaskan] Tahun ajaran aktif ditemukan:', tahunAjaranAktifId);
        }

        console.log('🔍 [cekGuruKelasDitugaskan] userId:', userId);
        console.log('🔍 [cekGuruKelasDitugaskan] tahunAjaranAktifId:', tahunAjaranAktifId);

        const [rows] = await db.execute(
            `SELECT gk.id_guru_kelas, gk.kelas_id, k.nama_kelas 
             FROM guru_kelas gk
             INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             LIMIT 1`,
            [userId, tahunAjaranAktifId]
        );

        console.log('🔍 [cekGuruKelasDitugaskan] Hasil query:', rows);

        if (rows.length === 0) {
            console.log('❌ [cekGuruKelasDitugaskan] Data TIDAK DITEMUKAN!');
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai wali kelas di semester ini. Silakan hubungi Admin.',
                code: 'NOT_ASSIGNED'
            });
        }

        console.log('✅ [cekGuruKelasDitugaskan] Data ditemukan:', rows[0]);

        req.infoKelasWali = {
            id_guru_kelas: rows[0].id_guru_kelas,
            kelas_id: rows[0].kelas_id,
            nama_kelas: rows[0].nama_kelas
        };

        next();

    } catch (error) {
        console.error('❌ Error di middleware cekGuruKelasDitugaskan:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
};

module.exports = cekGuruKelasDitugaskan;