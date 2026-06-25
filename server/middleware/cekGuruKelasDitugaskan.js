/**
 * Nama File: cekGuruKelasDitugaskan.js
 * Fungsi: Memastikan user yang login ditugaskan sebagai wali kelas 
 *         di tahun ajaran yang sedang aktif.
 * 
 * ✅ FIXED: Gunakan id_tahun_ajaran_induk (BUKAN id_tahun_ajaran)
 *           karena guru_kelas.tahun_ajaran_id menyimpan id_induk
 */

const db = require('../config/db');

const cekGuruKelasDitugaskan = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // ✅ PENTING: Gunakan id_tahun_ajaran_induk (bukan semester_id)
        let idInduk = req.idTahunAjaranInduk;

        // Jika belum ada, fetch dari database
        if (!idInduk) {
            console.log('⚠️ [cekGuruKelasDitugaskan] req.idTahunAjaranInduk tidak ada, fetch dari database...');
            
            const [taRows] = await db.execute(`
                SELECT id_tahun_ajaran_induk, id_tahun_ajaran, semester
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

            // ✅ Set id_induk (BUKAN semester_id)
            idInduk = taRows[0].id_tahun_ajaran_induk;
            req.idTahunAjaranInduk = idInduk;
            req.idSemesterAktif = taRows[0].id_tahun_ajaran;
            
            console.log('✅ [cekGuruKelasDitugaskan] Tahun ajaran aktif:', {
                id_induk: idInduk,
                semester_id: taRows[0].id_tahun_ajaran,
                semester: taRows[0].semester
            });
        }

        console.log('🔍 [cekGuruKelasDitugaskan] userId:', userId);
        console.log('🔍 [cekGuruKelasDitugaskan] idTahunAjaranInduk:', idInduk);

        // ✅ Query dengan id_tahun_ajaran_induk (BUKAN semester_id)
        const [rows] = await db.execute(
            `SELECT gk.id_guru_kelas, gk.kelas_id, k.nama_kelas 
             FROM guru_kelas gk
             INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
             LIMIT 1`,
            [userId, idInduk]  // ← Gunakan idInduk (id_tahun_ajaran_induk)
        );

        console.log('🔍 [cekGuruKelasDitugaskan] Hasil query:', rows);

        if (rows.length === 0) {
            console.log('❌ [cekGuruKelasDitugaskan] Data TIDAK DITEMUKAN!');
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini. Silakan hubungi Admin.',
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