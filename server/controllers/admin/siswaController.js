const siswaModel = require('../../models/siswaModel');
const db = require('../../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

const getSiswa = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran wajib dipilih' });
        }
        const siswaList = await siswaModel.getSiswaByTahunAjaran(tahun_ajaran_id);
        res.json({ success: true, data: siswaList });
    } catch (err) {
        console.error('Error get siswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
    }
};

const getSiswaById = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;

        if (!taId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran tidak ditemukan' });
        }

        const siswa = await siswaModel.getSiswaById(id, taId);
        if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

        res.json({ success: true, data: siswa });
    } catch (err) {
        console.error('Error get siswa by ID:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail siswa' });
    }
};

const getSiswaByKelas = async (req, res) => {
    try {
        const { id: kelasId } = req.params;
        const [kelasData] = await db.execute(
            `SELECT tahun_ajaran_id FROM kelas WHERE id_kelas = ?`,
            [kelasId]
        );
        
        if (kelasData.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kelas tidak ditemukan' 
            });
        }
        
        const tahunAjaranId = kelasData[0].tahun_ajaran_id;

        const [rows] = await db.execute(
            `
            SELECT 
                s.id_siswa,
                s.nama_lengkap,
                s.nis,
                s.nisn,
                s.tempat_lahir,
                s.tanggal_lahir,
                s.jenis_kelamin,
                s.alamat,
                s.status,
                k.nama_kelas,
                k.fase
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
            WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
            ORDER BY s.nama_lengkap ASC
            `,
            [kelasId, tahunAjaranId]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get siswa by kelas:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data siswa' 
        });
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

        // Validasi tahun ajaran
        if (tahun_ajaran_id != req.idTahunAjaranInduk) {
            return res.status(403).json({
                success: false,
                message: 'Operasi hanya diperbolehkan di tahun ajaran aktif.',
            });
        }

        const parsedKelasId = Number(kelas_id);
        if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
            return res.status(400).json({ success: false, message: 'kelas_id tidak valid' });
        }

        
        const [cekDuplikat] = await db.execute(`
            SELECT s.id_siswa 
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.tahun_ajaran_id = ? AND (s.nis = ? OR s.nisn = ?)
        `, [tahun_ajaran_id, nis?.trim(), nisn?.trim()]);

        if (cekDuplikat.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Siswa dengan NIS "${nis}" atau NISN "${nisn}" sudah ada di tahun ajaran ini!`
            });
        }

        const siswaId = await siswaModel.createSiswa(
            {
                nis: nis?.trim(),
                nisn: nisn?.trim(),
                nama_lengkap: nama_lengkap?.trim(),
                tempat_lahir: tempat_lahir?.trim() || null,
                tanggal_lahir: tanggal_lahir || null,
                jenis_kelamin,
                alamat: alamat?.trim() || null,
                kelas_id: parsedKelasId,
                status: 'aktif',
            },
            tahun_ajaran_id
        );

        res.status(201).json({
            success: true,
            message: 'Data siswa berhasil ditambahkan',
            id: siswaId,
        });

    } catch (err) {
        console.error('Error tambah siswa:', err);
        
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'NIS atau NISN sudah terdaftar di sistem!'
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Gagal menambah data siswa' 
        });
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
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        const existingSiswa = await siswaModel.getSiswaById(id, tahunAjaranId);
        if (!existingSiswa) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan di tahun ajaran aktif' });
        }

        const parsedKelasId = Number(kelas_id);
        if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
            return res.status(400).json({ success: false, message: 'kelas_id tidak valid' });
        }

        const hasChanges = 
            String(existingSiswa.nis || '').trim() !== String(nis || '').trim() ||
            String(existingSiswa.nisn || '').trim() !== String(nisn || '').trim() ||
            String(existingSiswa.nama || '').toLowerCase().trim() !== String(nama_lengkap || '').toLowerCase().trim() ||
            String(existingSiswa.tempat_lahir || '').toLowerCase().trim() !== String(tempat_lahir || '').toLowerCase().trim() ||
            String(existingSiswa.tanggal_lahir || '') !== String(tanggal_lahir || '') ||
            String(existingSiswa.jenis_kelamin || '').toLowerCase() !== String(jenis_kelamin || '').toLowerCase() ||
            String(existingSiswa.alamat || '').toLowerCase().trim() !== String(alamat || '').toLowerCase().trim() ||
            String(existingSiswa.kelas_id || '') !== String(parsedKelasId) ||
            String(existingSiswa.status || 'aktif').toLowerCase() !== String(status || 'aktif').toLowerCase();

        if (!hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data. Tidak perlu menyimpan.'
            });
        }

        const updated = await siswaModel.updateSiswa(
            id,
            {
                nis: nis?.trim(),
                nisn: nisn?.trim(),
                nama_lengkap: nama_lengkap?.trim(),
                tempat_lahir: tempat_lahir?.trim() || null,
                tanggal_lahir: tanggal_lahir || null,
                jenis_kelamin,
                alamat: alamat?.trim() || null,
                kelas_id: parsedKelasId,
                status: status || 'aktif',
            },
            tahunAjaranId
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Gagal memperbarui data siswa' });
        }

        res.json({ success: true, message: 'Data siswa berhasil diperbarui' });

    } catch (err) {
        console.error('Error edit siswa:', err);
        
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'NIS atau NISN sudah terdaftar di sistem!'
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Gagal memperbarui data siswa' 
        });
    }
};

const importSiswa = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file)
            return res.status(400).json({ success: false, message: 'File Excel diperlukan' });
            
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        if (data.length === 0) throw new Error('File Excel kosong');
        
        const tahunAjaranId = req.idTahunAjaranInduk;
        if (!tahunAjaranId) {
            throw new Error('Tidak ada tahun ajaran aktif');
        }
        
        await connection.beginTransaction();
        
        const skipped = [];
        let processedCount = 0;
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; 

            if (!row.nis || !row.nisn || !row.nama_lengkap || !row.kelas_id) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: 'Kolom wajib (nis, nisn, nama_lengkap, kelas_id) tidak lengkap'
                });
                continue; 
            }
            
            const [cekDuplikat] = await connection.execute(`
                SELECT s.id_siswa 
                FROM siswa s
                JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
                WHERE sk.tahun_ajaran_id = ? AND (s.nis = ? OR s.nisn = ?)
            `, [tahunAjaranId, String(row.nis).trim(), String(row.nisn).trim()]);
            
            if (cekDuplikat.length > 0) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: `NIS "${row.nis}" atau NISN "${row.nisn}" sudah terdaftar`
                });
                continue; 
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
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: `Kelas "${row.kelas_id}" tidak ditemukan`
                });
                continue; 
            }
            const kelasId = kelasRows[0].id_kelas;
            try {
                await siswaModel.createSiswa(
                    {
                        nis: String(row.nis).trim(),
                        nisn: String(row.nisn).trim(),
                        nama_lengkap: String(row.nama_lengkap).trim(),
                        tempat_lahir: row.tempat_lahir?.toString().trim() || null,
                        tanggal_lahir,
                        jenis_kelamin: row.jenis_kelamin || 'Laki-laki',
                        alamat: row.alamat?.toString().trim() || null,
                        kelas_id: kelasId,
                        status: 'aktif',
                    },
                    tahunAjaranId,
                    connection
                );
                processedCount++;
            } catch (insertErr) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: insertErr.message || 'Gagal menyimpan data'
                });
            }
        }
        
        await connection.commit();
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true,
            message: skipped.length > 0 
                ? `Import selesai: ${processedCount} berhasil, ${skipped.length} dilewati`
                : `Import data siswa berhasil: ${processedCount} data ditambahkan`,
            total: processedCount,
            skipped: skipped
        });
        
    } catch (err) {
        await connection.rollback();
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Import siswa error:', err);
        
        res.status(500).json({ 
            success: false,
            message: err.message || 'Gagal mengimport data siswa' 
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    getSiswa,
    getSiswaById,
    getSiswaByKelas,
    tambahSiswa,
    editSiswa,
    importSiswa,
};