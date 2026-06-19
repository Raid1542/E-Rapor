/**
 * Nama File: kokurikulerController.js
 * Fungsi: Mengelola nilai kokurikuler siswa
 * Struktur tabel: normalized (1 row = 1 aspek per siswa)
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Tentukan jenis penilaian secara konsisten
// ═════════════════════════════════════════════════════════════════════════════
const getJenisPenilaian = (status_pts, status_pas) => {
    if (status_pts === 'aktif') return 'PTS';
    if (status_pas === 'aktif') return 'PAS';
    // ✅ PERBAIKAN: Default ke 'PAS' jika tidak ada periode aktif
    // Ini harus SAMA di semua fungsi (save & fetch)
    return 'PAS';
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /kokurikuler
// Mendapatkan data nilai kokurikuler seluruh siswa di kelas
// ═════════════════════════════════════════════════════════════════════════════
exports.getNilaiKokurikuler = async (req, res) => {
    try {
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        console.log('📊 [DEBUG] Params:', { userId, semesterId, semester });

        if (!semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Ambil kelas - COBA QUERY LEBIH SEDERHANA
        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas 
             WHERE user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
            [userId, semesterId]
        );

        console.log('📊 [DEBUG] Guru kelas:', guruKelasRows);

        if (guruKelasRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kelas tidak ditemukan'
            });
        }

        const kelas_id = guruKelasRows[0].kelas_id;

        // ✅ PERBAIKAN: Query siswa yang lebih fleksibel
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap, s.nis, s.nisn
             FROM siswa s
             WHERE s.id_siswa IN (
                 SELECT siswa_id FROM siswa_kelas 
                 WHERE kelas_id = ?
             )
             ORDER BY s.nama_lengkap`,
            [kelas_id]
        );

        console.log('📊 [DEBUG] Jumlah siswa:', siswaRows.length);
        console.log('📊 [DEBUG] Data siswa:', siswaRows);

        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'Tidak ada siswa di kelas ini'
            });
        }

        // Ambil nilai kokurikuler
        const [nilaiRows] = await db.execute(
            `SELECT id_nilai_kokurikuler, id_siswa, id_aspek_kokurikuler, 
                    nilai, grade, deskripsi
             FROM nilai_kokurikuler
             WHERE id_kelas = ? AND id_tahun_ajaran = ? AND semester = ?`,
            [kelas_id, semesterId, semester]
        );

        console.log('📊 [DEBUG] Jumlah nilai:', nilaiRows.length);

        // Group nilai
        const nilaiMap = new Map();
        nilaiRows.forEach(row => {
            if (!nilaiMap.has(row.id_siswa)) {
                nilaiMap.set(row.id_siswa, []);
            }
            nilaiMap.get(row.id_siswa).push({
                id_nilai_kokurikuler: row.id_nilai_kokurikuler,
                aspek_id: row.id_aspek_kokurikuler,
                nilai: row.nilai,
                grade: row.grade,
                deskripsi: row.deskripsi
            });
        });

        // Format response
        const result = siswaRows.map(siswa => ({
            id_siswa: siswa.id_siswa,
            nama: siswa.nama_lengkap,
            nis: siswa.nis,
            nisn: siswa.nisn,
            nilai: nilaiMap.get(siswa.id_siswa) || []
        }));

        console.log('📊 [DEBUG] Response:', result);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('❌ [ERROR] getNilaiKokurikuler:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /kokurikuler/:siswaId
// Ambil nilai kokurikuler untuk satu siswa
// ═════════════════════════════════════════════════════════════════════════════
exports.getNilaiKokurikulerBySiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        const jenis_penilaian = getJenisPenilaian(status_pts, status_pas);

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
            [userId, semesterId]
        );

        if (gkRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }

        const kelas_id = gkRows[0].kelas_id;

        const [rows] = await db.execute(
            `SELECT 
               id_nilai_kokurikuler,
               id_aspek_kokurikuler,
               nilai,
               grade,
               deskripsi,
               id_judul_proyek
             FROM nilai_kokurikuler
             WHERE id_siswa = ? AND id_kelas = ? AND id_tahun_ajaran = ?
               AND semester = ?`,
            [siswaId, kelas_id, semesterId, semester]
        );

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Error getNilaiKokurikulerBySiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data kokurikuler.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// PUT /kokurikuler/:siswaId
// Memperbarui nilai kokurikuler siswa (per aspek)
// ═════════════════════════════════════════════════════════════════════════════
exports.updateNilaiKokurikuler = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { aspek_id, nilai, grade, deskripsi, id_judul_proyek } = req.body;
        
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        console.log('💾 [UPDATE KOKURIKULER] Payload:', {
            siswaId,
            aspek_id,
            nilai,
            grade,
            deskripsi
        });

        if (!aspek_id || nilai === undefined) {
            return res.status(400).json({
                success: false,
                message: 'aspek_id dan nilai wajib diisi'
            });
        }

        // ✅ PERBAIKAN: Gunakan helper yang SAMA dengan getNilaiKokurikuler
        const jenis_penilaian = getJenisPenilaian(status_pts, status_pas);
        console.log('💾 [UPDATE KOKURIKULER] Jenis penilaian:', jenis_penilaian);

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
            [userId, semesterId]
        );

        if (gkRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda belum ditugaskan sebagai wali kelas' });
        }

        const kelas_id = gkRows[0].kelas_id;

        // Cek apakah data sudah ada
        const [existing] = await db.execute(
            `SELECT id_nilai_kokurikuler FROM nilai_kokurikuler 
             WHERE id_siswa = ? AND id_aspek_kokurikuler = ? AND id_kelas = ? 
               AND id_tahun_ajaran = ? AND semester = ? AND jenis_penilaian = ?`,
            [siswaId, aspek_id, kelas_id, semesterId, semester, jenis_penilaian]
        );

        if (existing.length > 0) {
            // UPDATE
            console.log('💾 [UPDATE KOKURIKULER] Updating existing record:', existing[0].id_nilai_kokurikuler);
            await db.execute(
                `UPDATE nilai_kokurikuler 
                 SET nilai = ?, grade = ?, deskripsi = ?, id_judul_proyek = ?, updated_at = NOW()
                 WHERE id_nilai_kokurikuler = ?`,
                [nilai, grade, deskripsi, id_judul_proyek || null, existing[0].id_nilai_kokurikuler]
            );
        } else {
            // INSERT
            console.log('💾 [UPDATE KOKURIKULER] Inserting new record');
            const [result] = await db.execute(
                `INSERT INTO nilai_kokurikuler 
                 (id_siswa, id_aspek_kokurikuler, id_kelas, id_tahun_ajaran, semester, jenis_penilaian, nilai, grade, deskripsi, id_judul_proyek)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [siswaId, aspek_id, kelas_id, semesterId, semester, jenis_penilaian, nilai, grade, deskripsi, id_judul_proyek || null]
            );
            console.log('💾 [UPDATE KOKURIKULER] Inserted ID:', result.insertId);
        }

        res.json({
            success: true,
            message: 'Nilai berhasil disimpan',
            data: {
                id_siswa: parseInt(siswaId),
                aspek_id,
                nilai,
                grade,
                deskripsi
            }
        });
    } catch (err) {
        console.error('❌ Error updateNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai: ' + err.message
        });
    }
};