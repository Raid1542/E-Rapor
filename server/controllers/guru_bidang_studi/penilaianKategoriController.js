/**
 * Nama File: penilaianKategoriController.js
 * Fungsi: Mengelola kategori nilai akademik (predikat A, B, C, dll)
 */

const db = require('../../config/db');

const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT id_tahun_ajaran 
        FROM tahun_ajaran 
        WHERE status = 'aktif' 
        LIMIT 1
    `);
    return taRows.length > 0 ? taRows[0] : null;
};

const cekRangeOverlap = async (mapelId, tahunAjaranId, minNilai, maxNilai, excludeId = null) => {
    let query = `
        SELECT id_config, min_nilai, max_nilai, deskripsi
        FROM konfigurasi_nilai_rapor
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        AND (
            (? <= max_nilai AND ? >= min_nilai)
        )
    `;
    const params = [mapelId, tahunAjaranId, minNilai, maxNilai];
    
    if (excludeId) {
        query += ` AND id_config != ?`;
        params.push(excludeId);
    }
    
    const [overlaps] = await db.execute(query, params);
    return overlaps;
};

const cekCoverage0to100 = async (mapelId, tahunAjaranId) => {
    const [kategoriRows] = await db.execute(`
        SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        ORDER BY min_nilai ASC
    `, [mapelId, tahunAjaranId]);
    
    if (kategoriRows.length === 0) {
        return { covered: false, gap: '0-100' };
    }
    
    // Cek apakah dimulai dari 0
    if (kategoriRows[0].min_nilai > 0) {
        return { 
            covered: false, 
            gap: `0-${kategoriRows[0].min_nilai - 1}` 
        };
    }
    
    // Cek apakah ada gap antar kategori
    for (let i = 0; i < kategoriRows.length - 1; i++) {
        const currentMax = kategoriRows[i].max_nilai;
        const nextMin = kategoriRows[i + 1].min_nilai;
        
        if (nextMin > currentMax + 1) {
            return { 
                covered: false, 
                gap: `${currentMax + 1}-${nextMin - 1}` 
            };
        }
    }
    
    // Cek apakah berakhir di 100
    const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
    if (lastMax < 100) {
        return { 
            covered: false, 
            gap: `${lastMax + 1}-100` 
        };
    }
    
    return { covered: true };
};

exports.getKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id } = req.query;

        if (!mapel_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter mapel_id wajib diisi'
            });
        }

        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada semester aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        const [kategori] = await db.execute(
            `SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan
                FROM konfigurasi_nilai_rapor
                WHERE mapel_id = ? AND tahun_ajaran_id = ?
                ORDER BY urutan ASC`,
            [mapelIdNum, semesterId]
        );

        // Cek coverage 0-100 (info untuk frontend)
        const coverage = await cekCoverage0to100(mapelIdNum, semesterId);

        res.json({
            success: true,
            data: kategori,
            coverage: coverage
        });

    } catch (err) {
        console.error('Error getKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kategori akademik'
        });
    }
};

exports.createKategoriAkademik = async (req, res) => {
    try {
        let { min_nilai, max_nilai, deskripsi, mapel_id } = req.body;

        // Parse dan validasi tipe data
        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));
        
        if (isNaN(min_nilai) || isNaN(max_nilai)) {
            return res.status(400).json({
                success: false,
                message: 'Nilai min dan max harus berupa angka.'
            });
        }

        // Range nilai valid
        if (min_nilai < 0 || max_nilai > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 0 dan 100.'
            });
        }

        if (min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${min_nilai}) tidak boleh lebih besar dari nilai maksimum (${max_nilai}).`
            });
        }

        // Deskripsi wajib diisi
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Deskripsi minimal 3 karakter.'
            });
        }
        deskripsi = deskripsi.trim();

        // mapel_id valid
        const mapelIdNum = parseInt(mapel_id, 10);
        if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id tidak valid'
            });
        }

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const tahun_ajaran_id = taAktif.id_tahun_ajaran;

        // Cek overlap dengan kategori lain (CRITICAL!)
        const overlaps = await cekRangeOverlap(
            mapelIdNum, 
            tahun_ajaran_id, 
            min_nilai, 
            max_nilai
        );
        
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => 
                `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`
            ).join(', ');
            
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${overlapInfo}`
            });
        }

        // Cek apakah mapel ini ada di pembelajaran guru ini
        const userId = req.user.id;
        const [validMapel] = await db.execute(
            `SELECT 1 FROM pembelajaran 
                WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelIdNum, tahun_ajaran_id]
        );
        
        if (validMapel.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Insert kategori baru
        const [result] = await db.execute(
            `INSERT INTO konfigurasi_nilai_rapor 
                (mapel_id, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, urutan)
                VALUES (?, ?, ?, ?, ?, 
                    (SELECT IFNULL(MAX(urutan), 0) + 1 
                    FROM (SELECT urutan 
                            FROM konfigurasi_nilai_rapor 
                            WHERE mapel_id = ? AND tahun_ajaran_id = ?) AS tmp)
                )`,
            [mapelIdNum, tahun_ajaran_id, min_nilai, max_nilai, deskripsi, mapelIdNum, tahun_ajaran_id]
        );

        res.json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            id: result.insertId,
        });

    } catch (err) {
        console.error('Error createKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah kategori: ' + err.message
        });
    }
};

exports.updateKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;
        let { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;

        // Parse dan validasi
        min_nilai = Math.floor(parseFloat(min_nilai));
        max_nilai = Math.floor(parseFloat(max_nilai));
        urutan = parseInt(urutan) || 0;

        if (isNaN(min_nilai) || isNaN(max_nilai)) {
            return res.status(400).json({
                success: false,
                message: 'Nilai min dan max harus berupa angka.'
            });
        }

        if (min_nilai < 0 || max_nilai > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai harus antara 0 dan 100.'
            });
        }

        if (min_nilai > max_nilai) {
            return res.status(400).json({
                success: false,
                message: `Nilai minimum (${min_nilai}) tidak boleh lebih besar dari nilai maksimum (${max_nilai}).`
            });
        }

        // Deskripsi wajib
        if (!deskripsi || deskripsi.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Deskripsi minimal 3 karakter.'
            });
        }
        deskripsi = deskripsi.trim();

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const tahun_ajaran_id = taAktif.id_tahun_ajaran;

        // Cek apakah kategori ada
        const [existing] = await db.execute(
            `SELECT id_config, mapel_id, min_nilai, max_nilai, deskripsi 
                FROM konfigurasi_nilai_rapor 
                WHERE id_config = ?`,
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        // Cek apakah ada perubahan (ceegah simpan tanpa perubahan)
        const old = existing[0];
        const isUnchanged = 
            old.min_nilai === min_nilai &&
            old.max_nilai === max_nilai &&
            old.deskripsi.trim() === deskripsi;
        
        if (isUnchanged) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data.'
            });
        }

        // Cek overlap (exclude kategori sendiri)
        const overlaps = await cekRangeOverlap(
            old.mapel_id,
            tahun_ajaran_id,
            min_nilai,
            max_nilai,
            id  // exclude diri sendiri
        );
        
        if (overlaps.length > 0) {
            const overlapInfo = overlaps.map(o => 
                `${o.deskripsi} (${o.min_nilai}-${o.max_nilai})`
            ).join(', ');
            
            return res.status(400).json({
                success: false,
                message: `Range nilai ${min_nilai}-${max_nilai} tumpang tindih dengan kategori: ${overlapInfo}`
            });
        }

        // Cek akses guru ke mapel ini
        const userId = req.user.id;
        const [validMapel] = await db.execute(
            `SELECT 1 FROM pembelajaran 
                WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, old.mapel_id, tahun_ajaran_id]
        );
        
        if (validMapel.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Update kategori
        const [result] = await db.execute(
            `UPDATE konfigurasi_nilai_rapor 
                SET 
                min_nilai = ?,
                max_nilai = ?,
                deskripsi = ?,
                urutan = ?
                WHERE id_config = ?`,
            [min_nilai, max_nilai, deskripsi, urutan, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Kategori akademik berhasil diperbarui',
        });

    } catch (err) {
        console.error('Error updateKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui kategori: ' + err.message
        });
    }
};

exports.deleteKategoriAkademik = async (req, res) => {
    try {
        const { id } = req.params;

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const tahun_ajaran_id = taAktif.id_tahun_ajaran;

        // Cek kategori ada
        const [existing] = await db.execute(
            `SELECT id_config, mapel_id, min_nilai, max_nilai 
                FROM konfigurasi_nilai_rapor 
                WHERE id_config = ?`,
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        const kategori = existing[0];

        // Cek akses guru
        const userId = req.user.id;
        const [validMapel] = await db.execute(
            `SELECT 1 FROM pembelajaran 
                WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, kategori.mapel_id, tahun_ajaran_id]
        );
        
        if (validMapel.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Cek apakah ada nilai siswa yang pakai range ini (CRITICAL!)
        const [nilaiRows] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM nilai_rapor 
            WHERE mapel_id = ? AND tahun_ajaran_id = ?
            AND nilai_rapor BETWEEN ? AND ?
        `, [kategori.mapel_id, tahun_ajaran_id, kategori.min_nilai, kategori.max_nilai]);

        if (nilaiRows[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak dapat menghapus kategori. Ada ${nilaiRows[0].total} nilai siswa yang menggunakan range ${kategori.min_nilai}-${kategori.max_nilai}.`
            });
        }

        // Hapus kategori
        const [result] = await db.execute(
            `DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus'
        });

    } catch (err) {
        console.error('Error deleteKategoriAkademik:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kategori: ' + err.message
        });
    }
};