const db = require('../../config/db');
const pembelajaranModel = require('../../models/pembelajaranModel');

// GET all pembelajaran by tahun ajaran
const getPembelajaran = async (req, res) => {
    try {
        const taId = req.idTahunAjaranInduk;
        if (!taId) return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });

        const rows = await pembelajaranModel.getAllByTahunAjaran(taId);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get pembelajaran:', err);
        res.status(500).json({ message: 'Gagal mengambil data penugasan mengajar' });
    }
};

// GET data untuk dropdown form
const getDropdownPembelajaran = async (req, res) => {
    try {
        const taId = req.idTahunAjaranInduk;
        if (!taId) return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });

        const guru = await pembelajaranModel.getGuruAktif();
        const kelas = await pembelajaranModel.getKelasByTahunAjaran(taId);
        const mata_pelajaran = await pembelajaranModel.getMapelByTahunAjaran(taId);

        // Query tahun ajaran aktif (tidak ada di model, tetap pakai db)
        const [taRows] = await db.execute(`
            SELECT id_tahun_ajaran AS id, tahun_ajaran, semester
            FROM tahun_ajaran WHERE status = 'aktif'
        `);

        res.json({
            success: true,
            data: {
                guru,
                kelas,
                mata_pelajaran,
                tahun_ajaran_aktif: taRows[0] || null,
            },
        });
    } catch (err) {
        console.error('Error get dropdown pembelajaran:', err);
        res.status(500).json({ message: 'Gagal mengambil data dropdown' });
    }
};

// TAMBAH pembelajaran (dengan transaction)
const tambahPembelajaran = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { kelas_id, mata_pelajaran_id, user_id } = req.body;
        const taId = req.idTahunAjaranInduk;

        if (!kelas_id || !mata_pelajaran_id || !user_id || !taId) {
            return res.status(400).json({ message: 'Semua field wajib diisi' });
        }

        // Validasi foreign key (spesifik, tetap pakai db.execute)
        const [kelasCheck] = await connection.execute(
            `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
            [kelas_id, taId]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ message: 'Kelas tidak valid atau bukan milik tahun ajaran aktif' });
        }

        const [mapelCheck] = await connection.execute(
            `SELECT id_mata_pelajaran FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?`,
            [mata_pelajaran_id, taId]
        );
        if (mapelCheck.length === 0) {
            return res.status(400).json({ message: 'Mata pelajaran tidak valid atau bukan milik tahun ajaran aktif' });
        }

        const [guruCheck] = await connection.execute(
            `SELECT id_user FROM user WHERE id_user = ?`,
            [user_id]
        );
        if (guruCheck.length === 0) {
            return res.status(400).json({ message: 'Guru tidak valid' });
        }

        await connection.beginTransaction();

        const id = await pembelajaranModel.create(
            { tahun_ajaran_id: taId, kelas_id, mata_pelajaran_id, user_id },
            connection
        );

        await connection.commit();
        res.status(201).json({ message: 'Penugasan mengajar berhasil ditambahkan', id });

    } catch (err) {
        await connection.rollback();
        console.error('Error tambah pembelajaran:', err);
        res.status(500).json({ message: 'Gagal menambah penugasan mengajar' });
    } finally {
        connection.release();
    }
};

// EDIT pembelajaran (dengan transaction)
const editPembelajaran = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { kelas_id, mata_pelajaran_id, user_id } = req.body;
        const taId = req.idTahunAjaranInduk;

        if (!kelas_id || !mata_pelajaran_id || !user_id || !taId) {
            return res.status(400).json({ message: 'Semua field wajib diisi' });
        }

        // Cek data exist di tahun ajaran aktif
        const [existing] = await connection.execute(
            `SELECT id FROM pembelajaran WHERE id = ? AND tahun_ajaran_id = ?`,
            [id, taId]
        );
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Penugasan tidak ditemukan' });
        }

        // Validasi foreign key (spesifik, tetap pakai db.execute)
        const [kelasCheck] = await connection.execute(
            `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
            [kelas_id, taId]
        );
        if (kelasCheck.length === 0) return res.status(400).json({ message: 'Kelas tidak valid' });

        const [mapelCheck] = await connection.execute(
            `SELECT id_mata_pelajaran FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?`,
            [mata_pelajaran_id, taId]
        );
        if (mapelCheck.length === 0) return res.status(400).json({ message: 'Mata pelajaran tidak valid' });

        const [guruCheck] = await connection.execute(
            `SELECT id_user FROM user WHERE id_user = ?`,
            [user_id]
        );
        if (guruCheck.length === 0) return res.status(400).json({ message: 'Guru tidak valid' });

        await connection.beginTransaction();

        const success = await pembelajaranModel.update(
            id,
            { kelas_id, mata_pelajaran_id, user_id },
            connection
        );

        await connection.commit();

        if (!success) return res.status(404).json({ message: 'Gagal memperbarui penugasan' });
        res.json({ message: 'Penugasan mengajar berhasil diperbarui' });

    } catch (err) {
        await connection.rollback();
        console.error('Error edit pembelajaran:', err);
        res.status(500).json({ message: 'Gagal memperbarui penugasan mengajar' });
    } finally {
        connection.release();
    }
};

// HAPUS pembelajaran
const hapusPembelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;

        if (!taId) return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });

        const success = await pembelajaranModel.deleteById(id);

        if (!success) return res.status(404).json({ message: 'Penugasan tidak ditemukan' });
        res.json({ message: 'Penugasan mengajar berhasil dihapus' });

    } catch (err) {
        console.error('Error hapus pembelajaran:', err);
        res.status(500).json({ message: 'Gagal menghapus penugasan mengajar' });
    }
};

module.exports = {
    getPembelajaran,
    getDropdownPembelajaran,
    tambahPembelajaran,
    editPembelajaran,
    hapusPembelajaran
};