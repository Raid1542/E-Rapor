const kelasModel = require('../../models/kelasModel');
const db = require('../../config/db');


const getKelas = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
        }
        const [rows] = await db.execute(
            `
    SELECT 
        k.id_kelas AS id,
        k.nama_kelas,
        k.fase,
        COALESCE(wk.nama_lengkap, '-') AS wali_kelas,
        wk.user_id AS wali_kelas_id,
        COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa
    FROM kelas k
    LEFT JOIN (
        SELECT 
            gk.kelas_id,
            u.nama_lengkap,
            gk.user_id
        FROM guru_kelas gk
        JOIN user u ON gk.user_id = u.id_user
        WHERE gk.tahun_ajaran_id = ?
    ) wk ON k.id_kelas = wk.kelas_id
    LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.tahun_ajaran_id = ?
    WHERE k.tahun_ajaran_id = ?  
    GROUP BY k.id_kelas, k.nama_kelas, k.fase, wk.nama_lengkap, wk.user_id
    ORDER BY k.nama_kelas ASC
`,
            [tahun_ajaran_id, tahun_ajaran_id, tahun_ajaran_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get kelas:', err);
        res.status(500).json({ message: 'Gagal mengambil data kelas' });
    }
};

const getKelasById = async (req, res) => {
    try {
        const { id } = req.params;
        const kelas = await kelasModel.getById(id);
        if (!kelas)
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });
        res.json({ success: true, data: kelas });
    } catch (err) {
        console.error('Error get kelas by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail kelas' });
    }
};

const getKelasForDropdown = async (req, res) => {
    try {
        const taId = req.idTahunAjaranInduk; // ← Dari middleware cekTahunAjaranAktif
        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }

        const [rows] = await db.execute(
            `
            SELECT 
                id_kelas AS id,
                nama_kelas AS nama,
                fase
            FROM kelas
            WHERE tahun_ajaran_id = ?
            ORDER BY nama_kelas ASC
        `,
            [taId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get kelas for dropdown:', err);
        res.status(500).json({ message: 'Gagal mengambil daftar kelas' });
    }
};

const tambahKelas = async (req, res) => {
    const { nama_kelas, fase } = req.body;
    const tahun_ajaran_id = req.idTahunAjaranInduk; // ← Dari middleware

    if (!nama_kelas || !fase || !tahun_ajaran_id) {
        return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // Cek duplikat HANYA di tahun ajaran aktif
    const existing = await kelasModel.getByTahunAjaran(tahun_ajaran_id);
    const isDuplicate = existing.some(k => k.nama_kelas === nama_kelas);
    if (isDuplicate) {
        return res
            .status(400)
            .json({ message: `Kelas "${nama_kelas}" sudah ada di tahun ajaran ini` });
    }

    const id = await kelasModel.create({ nama_kelas, fase, tahun_ajaran_id });
    res.status(201).json({ message: 'Kelas berhasil ditambahkan', id });
};

const editKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kelas, fase } = req.body;
        const tahun_ajaran_id = req.idTahunAjaranInduk; // ← Ambil dari middleware

        if (!nama_kelas || !fase || !tahun_ajaran_id) {
            return res
                .status(400)
                .json({ message: 'Nama kelas, fase, dan tahun ajaran wajib diisi' });
        }

        const existingKelas = await kelasModel.getById(id);
        if (!existingKelas)
            return res.status(404).json({ message: 'Kelas tidak ditemukan' });

        // Cek duplikat HANYA di tahun ajaran aktif, kecuali diri sendiri
        const allKelas = await kelasModel.getByTahunAjaran(tahun_ajaran_id);
        const isDuplicate = allKelas.some(
            k => k.nama_kelas === nama_kelas && k.id_kelas !== Number(id)
        );
        if (isDuplicate) {
            return res
                .status(400)
                .json({
                    message: `Nama kelas "${nama_kelas}" sudah digunakan di tahun ajaran ini`,
                });
        }

        // Update dengan tahun_ajaran_id (meski tidak berubah, tetap kirim)
        const success = await kelasModel.update(id, {
            nama_kelas,
            fase,
            tahun_ajaran_id,
        });
        if (!success)
            return res.status(404).json({ message: 'Gagal memperbarui kelas' });

        res.json({ message: 'Data kelas berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit kelas:', err);
        res.status(500).json({ message: 'Gagal memperbarui data kelas' });
    }
};

const hapusKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;

        if (!taId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }

        // Cek apakah kelas benar-benar milik tahun ajaran aktif
        const [kelasRows] = await db.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [id, taId]
        );
        if (kelasRows.length === 0) {
            return res
                .status(404)
                .json({
                    message: 'Kelas tidak ditemukan atau bukan milik tahun ajaran aktif',
                });
        }

        // Cek apakah masih digunakan
        const [cekDep] = await db.execute(
            `
            SELECT 
                (SELECT COUNT(*) FROM siswa_kelas WHERE kelas_id = ?) AS siswa_count,
                (SELECT COUNT(*) FROM guru_kelas WHERE kelas_id = ?) AS guru_count,
                (SELECT COUNT(*) FROM absensi WHERE kelas_id = ?) AS absensi_count,
                (SELECT COUNT(*) FROM nilai WHERE kelas_id = ?) AS nilai_count
        `,
            [id, id, id, id]
        );

        const dep = cekDep[0];
        const total =
            dep.siswa_count + dep.guru_count + dep.absensi_count + dep.nilai_count;

        if (total > 0) {
            return res.status(400).json({
                message:
                    'Kelas tidak bisa dihapus karena masih digunakan di data siswa, guru, atau nilai.',
            });
        }

        // Hapus kelas
        const [result] = await db.execute('DELETE FROM kelas WHERE id_kelas = ?', [
            id,
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gagal menghapus kelas' });
        }

        res.json({ message: 'Kelas berhasil dihapus' });
    } catch (err) {
        console.error('Error hapus kelas:', err);
        res.status(500).json({ message: 'Gagal menghapus kelas' });
    }
};

module.exports = {
    getKelas,
    getKelasById,
    getKelasForDropdown,
    tambahKelas,
    editKelas,
    hapusKelas,
};