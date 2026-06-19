/**
 * Nama File: kelasController.js
 * Fungsi: Mengelola data kelas dan siswa untuk guru kelas
 */

const db = require('../../config/db');

/**
 * GET /kelas
 * Mendapatkan informasi kelas yang diampu oleh guru kelas
 */
exports.getKelasSaya = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ message: 'User ID tidak ditemukan' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif; // ← TAMBAHAN

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran tidak ditemukan' });
        }

        // ← DIUBAH: pakai semesterId bukan status = 'aktif'
        const [taSemesterRows] = await db.execute(
            `SELECT tahun_ajaran, semester FROM tahun_ajaran WHERE id_tahun_ajaran = ? LIMIT 1`,
            [semesterId]
        );

        if (!taSemesterRows.length) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran tidak ditemukan' });
        }

        const { tahun_ajaran, semester } = taSemesterRows[0];

        const query = `
            SELECT
                k.nama_kelas,
                COUNT(sk.siswa_id) AS jumlah_siswa,
                ? AS tahun_ajaran_display,
                ? AS semester_display
            FROM guru_kelas gk
            INNER JOIN kelas k ON gk.kelas_id = k.id_kelas
            LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.id_tahun_ajaran_induk = ?
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
            GROUP BY k.id_kelas
        `;

        // ← DIUBAH: parameter terakhir pakai semesterId bukan tahunAjaranIndukId
        const [rows] = await db.execute(query, [
            tahun_ajaran, semester, tahunAjaranIndukId, userId, semesterId
        ]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Anda belum ditugaskan sebagai guru kelas pada tahun ajaran ini.',
            });
        }

        res.json(
            rows.map(row => ({
                kelas: row.nama_kelas,
                jumlah_siswa: row.jumlah_siswa,
                tahun_ajaran: row.tahun_ajaran_display,
                semester: row.semester_display,
            }))
        );
    } catch (err) {
        console.error('Error di getKelasSaya:', err);
        res.status(500).json({ message: 'Gagal mengambil data kelas' });
    }
};

/**
 * GET /siswa
 * Mendapatkan daftar siswa di kelas yang diampu
 */
exports.getSiswaByKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // ✅ PERBAIKAN: Gunakan idSemesterAktif, bukan idTahunAjaranInduk
        const semesterId = req.idSemesterAktif; 

        if (!semesterId) {
            return res.status(400).json({ success: false, message: 'ID Semester aktif tidak ditemukan' });
        }

        // Cari kelas guru berdasarkan SEMESTER AKTIF (ID 7)
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas
             FROM guru_kelas gk
             JOIN kelas k ON gk.kelas_id = k.id_kelas
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`, 
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran ini.',
            });
        }

        const { kelas_id } = guruKelasRows[0];

        // Ambil siswa berdasarkan SEMESTER AKTIF juga
        const [siswaRows] = await db.execute(
            `SELECT
                s.id_siswa AS id,
                s.nis, s.nisn, s.nama_lengkap AS nama,
                s.tempat_lahir, s.tanggal_lahir, s.jenis_kelamin, s.alamat, s.status,
                k.nama_kelas AS kelas, k.fase
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            JOIN kelas k ON sk.kelas_id = k.id_kelas
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
            ORDER BY s.nama_lengkap`,
            [kelas_id, req.idTahunAjaranInduk]
        );

        res.json({
            success: true,
            data: siswaRows.map(row => ({
                ...row,
                statusSiswa: row.status || 'aktif',
            })),
        });
    } catch (err) {
        console.error('Error di getSiswaByKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// TAMBAHAN BARU — jangan ubah apapun di atas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /progress-penilaian
 * Mendapatkan progress pengisian nilai per mata pelajaran
 */
exports.getProgressPenilaian = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;

        if (!semesterId || !tahunAjaranIndukId) {
            return res.status(400).json({
                success: false,
                message: 'ID Semester atau Tahun Ajaran tidak ditemukan'
            });
        }

        // Cari kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id
             FROM guru_kelas gk
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda tidak memiliki kelas yang diampu pada tahun ajaran ini.'
            });
        }

        const kelasId = guruKelasRows[0].kelas_id;

        // Hitung jumlah siswa di kelas
        const [siswaRows] = await db.execute(
            `SELECT COUNT(*) AS total_siswa
             FROM siswa_kelas
             WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );
        const totalSiswa = siswaRows[0]?.total_siswa || 0;

        // Ambil semua mata pelajaran di kelas ini
        const [mapelRows] = await db.execute(
            `SELECT 
                mp.id_mata_pelajaran,
                mp.nama_mapel AS mata_pelajaran,
                mp.kode_mapel,
                mp.jenis
             FROM pembelajaran p
             JOIN mata_pelajaran mp ON mp.id_mata_pelajaran = p.mapel_id
             WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
             ORDER BY mp.nama_mapel`,
            [kelasId, semesterId]
        );

        if (mapelRows.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        // Hitung sudah_dinilai per mapel dari tabel nilai_rapor
        const result = await Promise.all(
            mapelRows.map(async (mapel) => {
                const [nilaiRows] = await db.execute(
                    `SELECT COUNT(DISTINCT nr.siswa_id) AS sudah_dinilai
                     FROM nilai_rapor nr
                     JOIN siswa_kelas sk ON sk.siswa_id = nr.siswa_id
                     WHERE nr.mapel_id = ?
                       AND nr.tahun_ajaran_id = ?
                       AND sk.kelas_id = ?
                       AND sk.id_tahun_ajaran_induk = ?`,
                    [mapel.id_mata_pelajaran, semesterId, kelasId, tahunAjaranIndukId]
                );

                const sudahDinilai = nilaiRows[0]?.sudah_dinilai || 0;

                return {
                    mata_pelajaran: mapel.mata_pelajaran,
                    kode_mapel: mapel.kode_mapel,
                    jenis: mapel.jenis,
                    total_siswa: totalSiswa,
                    sudah_dinilai: sudahDinilai,
                    belum_dinilai: totalSiswa - sudahDinilai,
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (err) {
        console.error('Error di getProgressPenilaian:', err);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data progress penilaian'
        });
    }
};