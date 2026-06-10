const siswaModel = require('../../models/admin/siswaModel');
const db = require('../../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

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

const getSiswa = async (req, res) => {
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
            tahun_ajaran_id = await getIdTahunAjaranAktif(tahun_ajaran_id);
            if (!tahun_ajaran_id) {
                return res.json({ success: true, data: [] });
            }
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
        const idInduk = req.idTahunAjaranInduk;

        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran tidak ditemukan' });
        }

        const tahunAjaranId = await getIdTahunAjaranAktif(idInduk);
        if (!tahunAjaranId) {
            return res.status(400).json({ success: false, message: 'Tidak ada semester aktif' });
        }

        const siswa = await siswaModel.getSiswaById(id, tahunAjaranId);
        if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

        res.json({ success: true, data: siswa });
    } catch (err) {
        console.error('Error get siswa by ID:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail siswa' });
    }
};

const getSiswaByKelas = async (req, res) => {
    try {
        const { id } = req.params;
        let { tahun_ajaran_id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Kelas ID wajib diisi'
            });
        }

        if (!tahun_ajaran_id) {
            const [taAktif] = await db.execute(`
                SELECT id_tahun_ajaran, id_tahun_ajaran_induk 
                FROM tahun_ajaran 
                WHERE status = 'aktif' 
                LIMIT 1
            `);

            if (taAktif.length === 0) {
                return res.json({ success: true, data: [] });
            }

            tahun_ajaran_id = taAktif[0].id_tahun_ajaran;
        }

        const [taInfo] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [tahun_ajaran_id]
        );

        if (taInfo.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

        const [rows] = await db.execute(`
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
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
            ORDER BY s.nama_lengkap ASC
        `, [id, idTahunAjaranInduk]);

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get siswa by kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
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
        } = req.body;

        const idInduk = req.idTahunAjaranInduk;
        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        const tahun_ajaran_id = await getIdTahunAjaranAktif(idInduk);
        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif di tahun ajaran ini'
            });
        }

        const parsedKelasId = Number(kelas_id);
        if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
            return res.status(400).json({ success: false, message: 'kelas_id tidak valid' });
        }

        const [kelasCheck] = await db.execute(
            `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
            [parsedKelasId, tahun_ajaran_id]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kelas tidak valid atau bukan milik tahun ajaran aktif'
            });
        }

        const [cekDuplikat] = await db.execute(`
            SELECT s.id_siswa 
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.id_tahun_ajaran_induk = ? AND (s.nis = ? OR s.nisn = ?)
        `, [idInduk, nis?.trim(), nisn?.trim()]);

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
            idInduk
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
            message: err.message || 'Gagal menambah data siswa'
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

        const idInduk = req.idTahunAjaranInduk;
        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        const tahunAjaranId = await getIdTahunAjaranAktif(idInduk);
        if (!tahunAjaranId) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
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
            idInduk
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
            message: err.message || 'Gagal memperbarui data siswa'
        });
    }
};

const importSiswa = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file)
            return res.status(400).json({ success: false, message: 'File Excel diperlukan' });

        const { kelas_id } = req.body;
        if (!kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Kelas ID tidak ditemukan. Silakan import ulang.'
            });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) throw new Error('File Excel kosong');

        const idInduk = req.idTahunAjaranInduk;
        if (!idInduk) {
            throw new Error('Tidak ada tahun ajaran aktif');
        }

        const tahunAjaranId = await getIdTahunAjaranAktif(idInduk);
        if (!tahunAjaranId) {
            throw new Error('Tidak ada semester aktif di tahun ajaran ini');
        }

        const [kelasInfo] = await connection.execute(
            `SELECT id_kelas, nama_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
            [kelas_id, tahunAjaranId]
        );

        if (kelasInfo.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kelas tidak ditemukan di tahun ajaran aktif'
            });
        }

        const targetKelasNama = kelasInfo[0].nama_kelas;

        await connection.beginTransaction();

        const skipped = [];
        let processedCount = 0;
        const kelasMismatchRows = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2;

            if (!row.nis || !row.nisn || !row.nama_lengkap || !row.kelas_id) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: 'Kolom wajib (NIS, NISN, nama lengkap, kelas) tidak lengkap'
                });
                continue;
            }

            const excelKelasNama = String(row.kelas_id).trim();
            if (excelKelasNama.toLowerCase() !== targetKelasNama.toLowerCase()) {
                kelasMismatchRows.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    kelasDiExcel: excelKelasNama,
                    kelasTujuan: targetKelasNama
                });
                continue;
            }

            const [cekDuplikat] = await connection.execute(`
                SELECT s.id_siswa 
                FROM siswa s
                JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
                WHERE sk.id_tahun_ajaran_induk = ? AND (s.nis = ? OR s.nisn = ?)
            `, [idInduk, String(row.nis).trim(), String(row.nisn).trim()]);

            if (cekDuplikat.length > 0) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: `Siswa dengan NIS "${row.nis}" atau NISN "${row.nisn}" sudah ada di tahun ajaran ini`
                });
                continue;
            }

            // Parse tanggal lahir
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

            // Cek kelas di database
            const [kelasRows] = await connection.execute(
                'SELECT id_kelas FROM kelas WHERE nama_kelas = ? AND tahun_ajaran_id = ?',
                [excelKelasNama, tahunAjaranId]
            );
            if (kelasRows.length === 0) {
                skipped.push({
                    row: rowNumber,
                    nama: row.nama_lengkap || '-',
                    reason: `Kelas "${excelKelasNama}" tidak ditemukan di tahun ajaran aktif`
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
                    idInduk,
                    connection
                );
                processedCount++;
            } catch (insertErr) {
                if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
                    skipped.push({
                        row: rowNumber,
                        nama: row.nama_lengkap || '-',
                        reason: `Siswa dengan NIS "${row.nis}" atau NISN "${row.nisn}" sudah terdaftar di tahun ajaran ini`
                    });
                } else {
                    skipped.push({
                        row: rowNumber,
                        nama: row.nama_lengkap || '-',
                        reason: 'Gagal menyimpan data siswa'
                    });
                }
            }
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        if (kelasMismatchRows.length > 0) {
            const mismatchMessages = kelasMismatchRows.map((d) =>
                `• Baris ${d.row} (${d.nama})\n  Kelas di file: "${d.kelasDiExcel}"\n  Kelas tujuan: "${d.kelasTujuan}"`
            ).join('\n\n');

            return res.status(400).json({
                success: false,
                message: `Import Dibatalkan - Kelas Tidak Sesuai\n\nDitemukan ${kelasMismatchRows.length} data dengan kelas yang berbeda:\n\n${mismatchMessages}\n\n**Pastikan file Excel berisi data untuk kelas ${targetKelasNama}**`,
                mismatch_count: kelasMismatchRows.length,
                mismatch_details: kelasMismatchRows
            });
        }

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

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'Import gagal: Ada NIS atau NISN yang sudah terdaftar di tahun ajaran ini.'
            });
        }

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