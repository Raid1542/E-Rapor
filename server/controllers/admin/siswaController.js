const siswaModel = require('../../models/siswaModel');
const db = require('../../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

const getSiswa = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
        }
        const siswaList = await siswaModel.getSiswaByTahunAjaran(tahun_ajaran_id);
        res.json({ success: true, data: siswaList });
    } catch (err) {
        console.error('Error get siswa:', err);
        res.status(500).json({ message: 'Gagal mengambil data siswa' });
    }
};

const getSiswaById = async (req, res) => {
    try {
        const { id } = req.params;

        const taId = req.idTahunAjaranInduk;

        if (!taId) {
            return res.status(400).json({ message: 'ID Tahun Ajaran tidak ditemukan' });
        }

        const siswa = await siswaModel.getSiswaById(id, taId);
        if (!siswa) return res.status(404).json({ message: 'Siswa tidak ditemukan' });

        res.json({ success: true, data: siswa });
    } catch (err) {
        console.error('Error get siswa by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail siswa' });
    }
};

const tambahSiswa = async (req, res) => {
    try {
        const {
            nis,
            nisn,
            nama_lengkap,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            alamat,
            kelas_id,
            tahun_ajaran_id,
        } = req.body;
        if (tahun_ajaran_id != req.idTahunAjaranInduk) {
            return res.status(403).json({
                message: 'Operasi hanya diperbolehkan di tahun ajaran aktif.',
            });
        }
        const parsedKelasId = Number(kelas_id);
        if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
            return res.status(400).json({ message: 'kelas_id tidak valid' });
        }
        const siswaId = await siswaModel.createSiswa(
            {
                nis,
                nisn,
                nama_lengkap,
                tempat_lahir: tempat_lahir || null,
                tanggal_lahir: tanggal_lahir || null,
                jenis_kelamin,
                alamat: alamat || null,
                kelas_id: parsedKelasId,
                status: 'aktif',
            },
            tahun_ajaran_id
        );
        res
            .status(201)
            .json({
                success: true,
                message: 'Data siswa berhasil ditambahkan',
                id: siswaId,
            });
    } catch (err) {
        console.error('Error tambah siswa:', err);
        res.status(500).json({ message: 'Gagal menambah data siswa' });
    }
};

const editSiswa = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nis,
            nisn,
            nama_lengkap,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            alamat,
            kelas_id,
            status,
        } = req.body;
        const tahunAjaranId = req.idTahunAjaranInduk;
        if (!tahunAjaranId) {
            return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
        }
        const [siswaRows] = await db.execute(
            `
            SELECT sk.tahun_ajaran_id 
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE s.id_siswa = ? AND sk.tahun_ajaran_id = ?
        `,
            [id, tahunAjaranId]
        );
        if (siswaRows.length === 0) {
            return res
                .status(404)
                .json({ message: 'Siswa tidak ditemukan di tahun ajaran aktif' });
        }
        const parsedKelasId = Number(kelas_id);
        if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
            return res.status(400).json({ message: 'kelas_id tidak valid' });
        }
        const updated = await siswaModel.updateSiswa(
            id,
            {
                nis,
                nisn,
                nama_lengkap,
                tempat_lahir: tempat_lahir || null,
                tanggal_lahir: tanggal_lahir || null,
                jenis_kelamin,
                alamat: alamat || null,
                kelas_id: parsedKelasId,
                status: status || 'aktif',
            },
            tahunAjaranId
        );
        if (!updated) {
            return res.status(404).json({ message: 'Gagal memperbarui data siswa' });
        }
        res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit siswa:', err);
        res.status(500).json({ message: 'Gagal memperbarui data siswa' });
    }
};

const importSiswa = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file)
            return res.status(400).json({ message: 'File Excel diperlukan' });
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (data.length === 0) throw new Error('File Excel kosong');
        const tahunAjaranId = req.idTahunAjaranInduk;
        if (!tahunAjaranId) {
            throw new Error('Tidak ada tahun ajaran aktif');
        }
        await connection.beginTransaction();
        for (const row of data) {
            if (!row.nis || !row.nisn || !row.nama_lengkap || !row.kelas_id) {
                throw new Error(
                    'Kolom wajib (nis, nisn, nama_lengkap, kelas_id) tidak lengkap'
                );
            }
            let tanggal_lahir = row.tanggal_lahir || null;
            if (typeof tanggal_lahir === 'number') {
                const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) {
                    tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                } else {
                    tanggal_lahir = null;
                }
            } else if (typeof tanggal_lahir === 'string') {
                tanggal_lahir = tanggal_lahir.trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) tanggal_lahir = null;
            }
            const [kelasRows] = await connection.execute(
                'SELECT id_kelas FROM kelas WHERE nama_kelas = ?',
                [String(row.kelas_id).trim()]
            );
            if (kelasRows.length === 0) {
                throw new Error(`Kelas "${row.kelas_id}" tidak ditemukan`);
            }
            const kelasId = kelasRows[0].id_kelas;
            await siswaModel.createSiswa(
                {
                    nis: row.nis,
                    nisn: row.nisn,
                    nama_lengkap: row.nama_lengkap,
                    tempat_lahir: row.tempat_lahir || null,
                    tanggal_lahir,
                    jenis_kelamin: row.jenis_kelamin || 'Laki-laki',
                    alamat: row.alamat || null,
                    kelas_id: kelasId,
                    status: 'aktif',
                },
                tahunAjaranId,
                connection
            );
        }
        await connection.commit();
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import data siswa berhasil', total: data.length });
    } catch (err) {
        await connection.rollback();
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Import siswa error:', err);
        res
            .status(500)
            .json({ message: err.message || 'Gagal mengimport data siswa' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getSiswa,
    getSiswaById,
    tambahSiswa,
    editSiswa,
    importSiswa,
};