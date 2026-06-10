const kelasModel = require('../../models/admin/kelasModel');
const db = require('../../config/db');


const getIdTahunAjaranAktif = async (idInduk) => {
    const [rows] = await db.execute(
        `SELECT id_tahun_ajaran 
            FROM tahun_ajaran 
            WHERE id_tahun_ajaran_induk = ? AND status = 'aktif'
            LIMIT 1`,
        [idInduk]
    );
    return rows.length > 0 ? rows[0].id_tahun_ajaran : null;
};

const getKelas = async (req, res) => {
    try {
        let { tahun_ajaran_id } = req.query;

        if (!tahun_ajaran_id) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran wajib dipilih' });
        }

        const [cekInduk] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran_induk WHERE id_tahun_ajaran_induk = ?`,
            [tahun_ajaran_id]
        );

        if (cekInduk.length > 0) {
            const activeSemester = await getIdTahunAjaranAktif(tahun_ajaran_id);
            if (!activeSemester) {
                const [firstSemester] = await db.execute(
                    `SELECT id_tahun_ajaran FROM tahun_ajaran 
                        WHERE id_tahun_ajaran_induk = ? 
                        ORDER BY semester ASC 
                        LIMIT 1`,
                    [tahun_ajaran_id]
                );

                if (firstSemester.length === 0) {
                    return res.json({ success: true, data: [] });
                }

                tahun_ajaran_id = firstSemester[0].id_tahun_ajaran;
            } else {
                tahun_ajaran_id = activeSemester;
            }
        }

        const [taInfo] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [tahun_ajaran_id]
        );

        if (taInfo.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

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
                SELECT gk.kelas_id, u.nama_lengkap, gk.user_id
                FROM guru_kelas gk
                JOIN user u ON gk.user_id = u.id_user
                WHERE gk.tahun_ajaran_id = ?
            ) wk ON k.id_kelas = wk.kelas_id
            LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.id_tahun_ajaran_induk = ?
            WHERE k.tahun_ajaran_id = ?  
            GROUP BY k.id_kelas, k.nama_kelas, k.fase, wk.nama_lengkap, wk.user_id
            ORDER BY k.nama_kelas ASC
            `,
            [tahun_ajaran_id, idTahunAjaranInduk, tahun_ajaran_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data kelas' });
    }
};

const getKelasById = async (req, res) => {
    try {
        const { id } = req.params;

        const [kelasRow] = await db.execute(
            `SELECT tahun_ajaran_id FROM kelas WHERE id_kelas = ?`,
            [id]
        );

        if (kelasRow.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        const tahunAjaranId = kelasRow[0].tahun_ajaran_id;
        const kelas = await kelasModel.getByIdWithDetails(id, tahunAjaranId);

        if (!kelas) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        kelas.is_aktif = (kelas.status_tahun_ajaran === 'aktif');
        delete kelas.status_tahun_ajaran;

        res.json({ success: true, data: kelas });

    } catch (err) {
        console.error('Error get kelas by ID:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail kelas' });
    }
};

const getKelasForDropdown = async (req, res) => {
    try {
        const idInduk = req.idTahunAjaranInduk;
        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        const taId = await getIdTahunAjaranAktif(idInduk);
        if (!taId) {
            return res.json({ success: true, data: [] });
        }

        const [rows] = await db.execute(
            `SELECT id_kelas AS id, nama_kelas AS nama, fase
                FROM kelas
                WHERE tahun_ajaran_id = ?
                ORDER BY nama_kelas ASC`,
            [taId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get kelas for dropdown:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar kelas' });
    }
};

const tambahKelas = async (req, res) => {
    const { nama_kelas, fase, user_id } = req.body;
    const idInduk = req.idTahunAjaranInduk;

    if (!nama_kelas || !fase || !idInduk) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    try {
        const tahun_ajaran_id = await getIdTahunAjaranAktif(idInduk);
        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif di tahun ajaran ini'
            });
        }

        const existing = await kelasModel.getByTahunAjaran(tahun_ajaran_id);
        const isDuplicate = existing.some(k =>
            k.nama_kelas.toLowerCase().trim() === nama_kelas.toLowerCase().trim()
        );

        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                message: `Kelas "${nama_kelas}" sudah ada di tahun ajaran ini`
            });
        }

        if (user_id && Number(user_id) > 0) {
            const [cekGuruSudahPunyaKelas] = await db.execute(
                `SELECT k.nama_kelas 
                    FROM guru_kelas gk
                    JOIN kelas k ON gk.kelas_id = k.id_kelas
                    WHERE gk.user_id = ? 
                    AND gk.tahun_ajaran_id = ?`,
                [Number(user_id), tahun_ajaran_id]
            );

            if (cekGuruSudahPunyaKelas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Guru ini sudah menjadi wali kelas di "${cekGuruSudahPunyaKelas[0].nama_kelas}" pada tahun ajaran yang sama.`
                });
            }
        }

        // ═══ INSERT KELAS ═══
        const id = await kelasModel.create({ nama_kelas, fase, tahun_ajaran_id });

        if (user_id && Number(user_id) > 0) {
            await db.execute(
                `INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id, created_at, updated_at) 
                VALUES (?, ?, ?, NOW(), NOW())`,
                [Number(user_id), id, tahun_ajaran_id]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Kelas berhasil ditambahkan',
            id,
            data: { id }
        });

    } catch (err) {
        console.error('Error tambah kelas:', err);

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: `Kelas "${nama_kelas}" sudah ada di tahun ajaran ini`
            });
        }

        res.status(500).json({
            success: false,
            message: err.message || 'Gagal menambah kelas'
        });
    }
};

const editKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kelas, fase, user_id } = req.body;
        const idInduk = req.idTahunAjaranInduk;

        if (!nama_kelas || !fase || !idInduk) {
            return res.status(400).json({ success: false, message: 'Nama kelas, fase, dan tahun ajaran wajib diisi' });
        }

        const tahun_ajaran_id = await getIdTahunAjaranAktif(idInduk);
        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
        }

        const existingKelas = await kelasModel.getById(id);
        if (!existingKelas)
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

        const existingUserId = existingKelas.wali_kelas_id || null;
        const newUserId = user_id ? Number(user_id) : null;

        const hasChanges =
            existingKelas.nama_kelas.toLowerCase().trim() !== nama_kelas.toLowerCase().trim() ||
            existingKelas.fase.toLowerCase().trim() !== fase.toLowerCase().trim() ||
            existingUserId !== newUserId;

        if (!hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data. Tidak perlu menyimpan.'
            });
        }

        const allKelas = await kelasModel.getByTahunAjaran(tahun_ajaran_id);
        const isDuplicate = allKelas.some(
            k => k.nama_kelas.toLowerCase().trim() === nama_kelas.toLowerCase().trim() && k.id_kelas !== Number(id)
        );
        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                message: `Nama kelas "${nama_kelas}" sudah digunakan di tahun ajaran ini`
            });
        }

        const success = await kelasModel.update(id, {
            nama_kelas,
            fase,
            tahun_ajaran_id,
        });

        if (!success)
            return res.status(404).json({ success: false, message: 'Gagal memperbarui kelas' });

        if (existingUserId !== newUserId) {
            if (newUserId && newUserId > 0) {
                const [cekWaliLain] = await db.execute(
                    `SELECT k.nama_kelas 
                        FROM guru_kelas gk
                        JOIN kelas k ON gk.kelas_id = k.id_kelas
                        WHERE gk.user_id = ? 
                        AND gk.tahun_ajaran_id = ?
                        AND gk.kelas_id != ?`,
                    [newUserId, tahun_ajaran_id, id]
                );

                if (cekWaliLain.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Guru ini sudah menjadi wali kelas di "${cekWaliLain[0].nama_kelas}" pada tahun ajaran yang sama.`
                    });
                }
            }

            await db.execute(
                'DELETE FROM guru_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?',
                [id, tahun_ajaran_id]
            );

            if (newUserId && newUserId > 0) {
                await db.execute(
                    'INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                    [newUserId, id, tahun_ajaran_id]
                );
            }
        }

        res.json({ success: true, message: 'Data kelas berhasil diperbarui' });

    } catch (err) {
        console.error('Error edit kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data kelas' });
    }
};

const hapusKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const idInduk = req.idTahunAjaranInduk;

        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        const tahun_ajaran_id = await getIdTahunAjaranAktif(idInduk);
        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
        }

        const [kelasRows] = await db.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [id, tahun_ajaran_id]
        );
        if (kelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan atau bukan milik tahun ajaran aktif'
            });
        }

        const [cekDep] = await db.execute(
            `SELECT 
                (SELECT COUNT(*) FROM siswa_kelas WHERE kelas_id = ?) AS siswa_count,
                (SELECT COUNT(*) FROM absensi WHERE kelas_id = ?) AS absensi_count,
                (SELECT COUNT(*) FROM nilai_rapor WHERE kelas_id = ?) AS nilai_rapor_count,
                (SELECT COUNT(*) FROM pembelajaran WHERE kelas_id = ?) AS pembelajaran_count`,
            [id, id, id, id]
        );

        const dep = cekDep[0];
        const total =
            dep.siswa_count +
            dep.absensi_count +
            dep.nilai_rapor_count +
            dep.pembelajaran_count;

        if (total > 0) {
            return res.status(400).json({
                success: false,
                message: 'Kelas tidak bisa dihapus karena masih ada data siswa, absensi, nilai, atau pembelajaran.'
            });
        }

        await db.execute(
            'DELETE FROM guru_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?',
            [id, tahun_ajaran_id]
        );

        const [result] = await db.execute('DELETE FROM kelas WHERE id_kelas = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Gagal menghapus kelas' });
        }

        res.json({ success: true, message: 'Kelas berhasil dihapus' });

    } catch (err) {
        console.error('Error hapus kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus kelas' });
    }
};

const setWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const idInduk = req.idTahunAjaranInduk;

        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        const tahun_ajaran_id = await getIdTahunAjaranAktif(idInduk);
        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
        }

        const [kelasRows] = await db.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [id, tahun_ajaran_id]
        );
        if (kelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        if (user_id && Number(user_id) > 0) {
            const [cekGuruSudahPunyaKelas] = await db.execute(
                `SELECT k.nama_kelas 
                    FROM guru_kelas gk
                    JOIN kelas k ON gk.kelas_id = k.id_kelas
                    WHERE gk.user_id = ? 
                    AND gk.tahun_ajaran_id = ?
                    AND gk.kelas_id != ?`,
                [Number(user_id), tahun_ajaran_id, Number(id)]
            );

            if (cekGuruSudahPunyaKelas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Guru ini sudah menjadi wali kelas di "${cekGuruSudahPunyaKelas[0].nama_kelas}" pada tahun ajaran yang sama.`
                });
            }
        }

        await db.execute(
            'DELETE FROM guru_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?',
            [id, tahun_ajaran_id]
        );

        if (user_id && Number(user_id) > 0) {
            await db.execute(
                `INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id, created_at, updated_at) 
                VALUES (?, ?, ?, NOW(), NOW())`,
                [Number(user_id), Number(id), tahun_ajaran_id]
            );
        }

        res.json({ success: true, message: 'Wali kelas berhasil ditetapkan' });

    } catch (err) {
        console.error('Error set wali kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal menetapkan wali kelas' });
    }
};

module.exports = {
    getKelas,
    getKelasById,
    getKelasForDropdown,
    tambahKelas,
    editKelas,
    hapusKelas,
    setWaliKelas,
};