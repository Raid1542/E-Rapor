/**
 * Nama File: ekskulController.js
 * Fungsi: CRUD ekstrakurikuler siswa (max 3 ekskul per siswa)
 * UPDATE: Fix bug query guru_kelas yang salah pakai tahunAjaranIndukId
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET EKSKUL SISWA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/ekskul
 * Ambil ekskul semua siswa di kelas + master ekskul untuk dropdown
 */
exports.getEkskulSiswa = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};
        const pasStatus = req.tahunAjaranAktif?.status_pas || 'nonaktif';

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        // ✅ PERBAIKAN: Ambil kelas guru dengan JOIN ke tahun_ajaran
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas 
                FROM guru_kelas gk 
                INNER JOIN kelas k ON gk.kelas_id = k.id_kelas 
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, tahunAjaranIndukId]  // ✅ Pakai tahunAjaranIndukId dengan JOIN
        );

        if (guruKelasRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini',
                code: 'NOT_ASSIGNED'  // ✅ Tambah code agar frontend bisa handle
            });
        }
        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Ambil siswa + ekskul per siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn 
                FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
                WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
                ORDER BY s.nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        const data = [];
        for (const siswa of siswaRows) {
            const [ekskulRows] = await db.execute(
                `SELECT e.id_ekskul, e.nama_ekskul, pe.deskripsi 
                    FROM peserta_ekstrakurikuler pe JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul 
                    WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
                [siswa.id_siswa, semesterId]
            );

            data.push({
                id: siswa.id_siswa,
                nama: siswa.nama,
                nis: siswa.nis,
                nisn: siswa.nisn,
                ekskul: ekskulRows.map(e => ({ id: e.id_ekskul, nama: e.nama_ekskul, deskripsi: e.deskripsi })),
                jumlah_ekskul: ekskulRows.length,
            });
        }

        // Master ekskul untuk dropdown
        const [daftar_ekskul] = await db.execute(
            `SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ?`,
            [semesterId]
        );

        res.json({ success: true, data, daftar_ekskul, kelas: nama_kelas, semester, pasStatus });
    } catch (err) {
        console.error('Error getEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data ekskul' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPDATE EKSKUL SISWA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-kelas/ekskul/:siswaId
 * Update ekskul siswa (max 3, tidak boleh duplikat, deskripsi wajib)
 */
exports.updateEkskulSiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { ekskulList } = req.body;

        // Validasi array max 3
        if (!Array.isArray(ekskulList) || ekskulList.length > 3) {
            return res.status(400).json({ success: false, message: 'Maksimal 3 ekskul' });
        }

        // Validasi duplikat
        const ekskulIds = ekskulList.map(e => parseInt(e.ekskul_id)).filter(id => id > 0);
        if (new Set(ekskulIds).size !== ekskulIds.length) {
            return res.status(400).json({ success: false, message: 'Ekskul tidak boleh duplikat' });
        }

        // Validasi deskripsi
        for (let i = 0; i < ekskulList.length; i++) {
            const item = ekskulList[i];
            if (!item.ekskul_id || item.ekskul_id <= 0) {
                return res.status(400).json({ success: false, message: `Ekskul ke-${i + 1} harus dipilih` });
            }
            if (!item.deskripsi?.trim()) {
                return res.status(400).json({ success: false, message: `Deskripsi ekskul ke-${i + 1} wajib diisi` });
            }
        }

        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        // ✅ PERBAIKAN: Ambil kelas guru dengan JOIN ke tahun_ajaran
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id 
                FROM guru_kelas gk
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda belum ditugaskan sebagai wali kelas',
                code: 'NOT_ASSIGNED'
            });
        }
        const { kelas_id } = guruKelasRows[0];

        // Validasi siswa di kelas
        const [valid] = await db.execute(
            `SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [siswaId, kelas_id, tahunAjaranIndukId]
        );

        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Siswa tidak di kelas Anda' });
        }

        // Hapus ekskul lama yang tidak dipilih
        if (ekskulIds.length > 0) {
            const placeholders = ekskulIds.map(() => '?').join(',');
            await db.execute(
                `DELETE FROM peserta_ekstrakurikuler 
                    WHERE siswa_id = ? AND tahun_ajaran_id = ? AND ekskul_id NOT IN (${placeholders})`,
                [siswaId, semesterId, ...ekskulIds]
            );
        } else {
            await db.execute(
                `DELETE FROM peserta_ekstrakurikuler WHERE siswa_id = ? AND tahun_ajaran_id = ?`,
                [siswaId, semesterId]
            );
        }

        // Insert/Update ekskul yang dipilih
        for (const ekskul of ekskulList) {
            const ekskulId = parseInt(ekskul.ekskul_id);
            const deskripsi = ekskul.deskripsi?.trim() || '';
            if (ekskulId <= 0) continue;

            await db.execute(
                `INSERT INTO peserta_ekstrakurikuler (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE deskripsi = VALUES(deskripsi), updated_at = CURRENT_TIMESTAMP`,
                [siswaId, ekskulId, semesterId, deskripsi]
            );
        }

        res.json({ success: true, message: 'Ekskul berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal update ekskul: ' + err.message });
    }
};