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

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas FROM guru_kelas gk JOIN kelas k ON gk.kelas_id = k.id_kelas WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        const { kelas_id, nama_kelas } = guruKelasRows[0];

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ? ORDER BY s.nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        const data = [];
        for (const siswa of siswaRows) {
            const [ekskulRows] = await db.execute(
                `SELECT e.id_ekskul, e.nama_ekskul, e.deskripsi FROM peserta_ekstrakurikuler pe JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
                [siswa.id_siswa, semesterId]
            );
            data.push({
                id: siswa.id_siswa, nama: siswa.nama, nis: siswa.nis, nisn: siswa.nisn,
                ekskul: ekskulRows.map(e => ({ id: e.id_ekskul, nama: e.nama_ekskul, deskripsi: e.deskripsi })),
                jumlah_ekskul: ekskulRows.length,
            });
        }

        const [daftar_ekskul] = await db.execute(`SELECT id_ekskul, nama_ekskul, deskripsi FROM ekstrakurikuler WHERE tahun_ajaran_id = ?`, [semesterId]);

        res.json({ success: true, data, daftar_ekskul, kelas: nama_kelas, semester: semester });
    } catch (err) {
        console.error('Error getEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data ekstrakurikuler' });
    }
};

/**
 * PUT /ekskul/:siswaId
 */
exports.updateEkskulSiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { ekskulList } = req.body;

        if (!Array.isArray(ekskulList) || ekskulList.length > 3) {
            return res.status(400).json({ message: 'ekskulList harus berupa array, maksimal 3 item' });
        }

        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        const { kelas_id } = guruKelasRows[0];

        const [valid] = await db.execute(
            `SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [siswaId, kelas_id, tahunAjaranIndukId]
        );

        if (valid.length === 0) return res.status(403).json({ message: 'Siswa tidak terdaftar di kelas Anda' });

        for (const ekskul of ekskulList) {
            await db.execute(
                `INSERT INTO peserta_ekstrakurikuler (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE deskripsi = VALUES(deskripsi), updated_at = NOW()`,
                [siswaId, ekskul.id, semesterId, ekskul.deskripsi || '']
            );
        }

        res.json({ success: true, message: 'Ekstrakurikuler berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui ekstrakurikuler' });
    }
};