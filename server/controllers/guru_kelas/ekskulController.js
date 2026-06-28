/**
 * Nama File: ekskulController.js
 * Fungsi: Mengelola ekstrakurikuler siswa

 */

const db = require('../../config/db');

/**
 * GET /ekskul
 */
exports.getEkskulSiswa = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        // ✅ TAMBAHAN BARU: Ambil status PAS dari middleware
        const pasStatus = req.tahunAjaranAktif?.status_pas || 'nonaktif';

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        // 1. Ambil kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas 
             FROM guru_kelas gk 
             JOIN kelas k ON gk.kelas_id = k.id_kelas 
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }
        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // 2. Ambil siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn 
             FROM siswa s 
             JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
             WHERE sk.kelas_id = ? 
             AND sk.id_tahun_ajaran_induk = ?
             ORDER BY s.nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        const data = [];
        for (const siswa of siswaRows) {
            // 3. Ambil ekskul siswa
            const [ekskulRows] = await db.execute(
                `SELECT e.id_ekskul, e.nama_ekskul, pe.deskripsi 
                 FROM peserta_ekstrakurikuler pe 
                 JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul 
                 WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
                [siswa.id_siswa, semesterId]
            );

            data.push({
                id: siswa.id_siswa,
                nama: siswa.nama,
                nis: siswa.nis,
                nisn: siswa.nisn,
                ekskul: ekskulRows.map(e => ({
                    id: e.id_ekskul,
                    nama: e.nama_ekskul,
                    deskripsi: e.deskripsi
                })),
                jumlah_ekskul: ekskulRows.length,
            });
        }

        // 4. Ambil master ekskul
        const [daftar_ekskul] = await db.execute(
            `SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ?`,
            [semesterId]
        );

        // ✅ KIRIM pasStatus KE FRONTEND
        res.json({
            success: true,
            data,
            daftar_ekskul,
            kelas: nama_kelas,
            semester: semester,
            pasStatus: pasStatus
        });
    } catch (err) {
        console.error('Error getEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data ekstrakurikuler' });
    }
};


/**
 * PUT /ekskul/:siswaId
 * ✅ FIXED: Dynamic placeholder untuk NOT IN
 */
exports.updateEkskulSiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { ekskulList } = req.body;

        // Validasi array
        if (!Array.isArray(ekskulList) || ekskulList.length > 3) {
            return res.status(400).json({
                success: false,
                message: 'ekskulList harus berupa array, maksimal 3 item'
            });
        }

        // ✅ VALIDASI: Cek duplikat ekskul_id
        const ekskulIds = ekskulList.map(e => parseInt(e.ekskul_id)).filter(id => id > 0);
        if (new Set(ekskulIds).size !== ekskulIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Ekstrakurikuler tidak boleh dipilih lebih dari sekali'
            });
        }

        // ✅ VALIDASI: Cek deskripsi tidak kosong
        for (let i = 0; i < ekskulList.length; i++) {
            const item = ekskulList[i];
            if (!item.ekskul_id || item.ekskul_id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Ekstrakurikuler ke-${i + 1} harus dipilih`
                });
            }
            const deskripsi = item.deskripsi?.trim() || '';
            if (!deskripsi) {
                return res.status(400).json({
                    success: false,
                    message: `Deskripsi ekstrakurikuler ke-${i + 1} wajib diisi`
                });
            }
        }

        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        // 1. Cek kelas guru
        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }
        const { kelas_id } = guruKelasRows[0];

        // 2. Validasi siswa
        const [valid] = await db.execute(
            `SELECT 1 FROM siswa_kelas 
             WHERE siswa_id = ? 
             AND kelas_id = ? 
             AND id_tahun_ajaran_induk = ?`,
            [siswaId, kelas_id, tahunAjaranIndukId]
        );

        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Siswa tidak terdaftar di kelas Anda' });
        }

        // 3. ✅ FIXED: Hapus ekskul lama dengan dynamic placeholder
        if (ekskulIds.length > 0) {
            // ✅ Buat placeholder dinamis: ?, ?, ?
            const placeholders = ekskulIds.map(() => '?').join(',');
            await db.execute(
                `DELETE FROM peserta_ekstrakurikuler 
                 WHERE siswa_id = ? 
                 AND tahun_ajaran_id = ? 
                 AND ekskul_id NOT IN (${placeholders})`,
                [siswaId, semesterId, ...ekskulIds]  // ✅ Spread array
            );
        } else {
            // Jika semua dihapus
            await db.execute(
                `DELETE FROM peserta_ekstrakurikuler 
                 WHERE siswa_id = ? AND tahun_ajaran_id = ?`,
                [siswaId, semesterId]
            );
        }

        // 4. Insert/Update ekskul yang dipilih
        for (const ekskul of ekskulList) {
            const ekskulId = parseInt(ekskul.ekskul_id);
            const deskripsi = ekskul.deskripsi?.trim() || '';

            if (ekskulId <= 0) continue;

            await db.execute(
                `INSERT INTO peserta_ekstrakurikuler 
                 (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 deskripsi = VALUES(deskripsi), 
                 updated_at = CURRENT_TIMESTAMP`,
                [siswaId, ekskulId, semesterId, deskripsi]
            );
        }

        res.json({ success: true, message: 'Ekstrakurikuler berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui ekstrakurikuler: ' + err.message });
    }
};