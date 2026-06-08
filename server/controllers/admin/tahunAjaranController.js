/**
 * Nama File: tahunAjaranController.js
 * Fungsi: Controller untuk mengelola tahun ajaran (2 tabel: induk + semester)
 * Update: 
 *   - Fix error "Incorrect date value" - konversi '' → null
 *   - Tambah validasi hasChanges untuk edit
 *   - Perkuat validasi duplikasi untuk tambah
 */

const tahunAjaranModel = require('../../models/tahunAjaranModel');
const db = require('../../config/db');

const sanitizeDate = (value) => {
    if (value === undefined || value === null || value === '') return null;
    
    const str = String(value).trim();
    if (str === '') return null;
    
    // Validasi format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
            return str;
        }
    }
    
    // Coba parse format lain
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return null;
};

const formatDateForCompare = (dateValue) => {
    if (!dateValue) return '';
    
    // Jika sudah format YYYY-MM-DD
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }
    
    // Jika Date object atau string lain
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTahunAjaran = async (req, res) => {
    try {
        const data = await tahunAjaranModel.getAllTahunAjaran();

        const formattedData = data.map(row => {
            const isAktif = row.status_ganjil === 'aktif' || row.status_genap === 'aktif';
            const semesterAktif = row.semester_aktif?.toLowerCase() || 'ganjil';
            
            return {
                id_induk: row.id_tahun_ajaran_induk,
                tahun_ajaran: row.tahun_ajaran,

                pts_ganjil: formatDateForCompare(row.pts_ganjil),
                pas_ganjil: formatDateForCompare(row.pas_ganjil),
                pts_genap: formatDateForCompare(row.pts_genap),
                pas_genap: formatDateForCompare(row.pas_genap),

                status: isAktif ? 'AKTIF' : 'NONAKTIF',
                semester_aktif: row.semester_aktif,

                id_detail_ganjil: row.id_ganjil,
                id_detail_genap: row.id_genap,

                status_pts_ganjil: row.status_pts_ganjil || 'nonaktif',
                status_pas_ganjil: row.status_pas_ganjil || 'nonaktif',
                status_pts_genap: row.status_pts_genap || 'nonaktif',
                status_pas_genap: row.status_pas_genap || 'nonaktif',

                created_at: row.created_at
            };
        });

        res.json({
            success: true,
            data: formattedData,
            total: formattedData.length
        });

    } catch (err) {
        console.error('Error get tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data tahun ajaran'
        });
    }
};

const tambahTahunAjaran = async (req, res) => {
    try {
        const { tahun1, tahun2, pts_ganjil, pas_ganjil, pts_genap, pas_genap } = req.body;

        // ═══ VALIDASI 1: Field wajib ═══
        if (!tahun1 || !tahun2) {
            return res.status(400).json({
                success: false,
                message: 'Tahun awal dan tahun akhir wajib diisi.'
            });
        }

        // ═══ VALIDASI 2: Format tahun harus angka ═══
        const t1 = parseInt(tahun1);
        const t2 = parseInt(tahun2);
        
        if (isNaN(t1) || isNaN(t2)) {
            return res.status(400).json({
                success: false,
                message: 'Tahun harus berupa angka yang valid.'
            });
        }

        // ═══ VALIDASI 3: Tahun akhir harus > tahun awal ═══
        if (t2 <= t1) {
            return res.status(400).json({
                success: false,
                message: `Tahun akhir (${t2}) harus lebih besar dari tahun awal (${t1}).`
            });
        }

        // ═══ VALIDASI 4: Tahun tidak terlalu jauh (maks 10 tahun ke depan) ═══
        const currentYear = new Date().getFullYear();
        if (t1 < 2000 || t2 > currentYear + 10) {
            return res.status(400).json({
                success: false,
                message: `Tahun harus antara 2000 dan ${currentYear + 10}.`
            });
        }

        const tahun_ajaran = `${t1}/${t2}`;

        // ═══ VALIDASI 5: Cek duplikasi tahun ajaran ═══
        const [existing] = await db.execute(
            `SELECT id_tahun_ajaran_induk, tahun_ajaran FROM tahun_ajaran_induk WHERE tahun_ajaran = ?`,
            [tahun_ajaran]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Tahun ajaran "${tahun_ajaran}" sudah ada di sistem. Tidak dapat menambahkan data yang sama.`
            });
        }

        // ═══ SANITASI TANGGAL ═══
        const sanitizedData = {
            tahun_ajaran,
            pts_ganjil: sanitizeDate(pts_ganjil),
            pas_ganjil: sanitizeDate(pas_ganjil),
            pts_genap: sanitizeDate(pts_genap),
            pas_genap: sanitizeDate(pas_genap)
        };

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Nonaktifkan semua TA aktif sebelumnya
            await connection.execute(`
                UPDATE tahun_ajaran 
                SET status = 'nonaktif' 
                WHERE status = 'aktif'
            `);
            
            // Buat tahun ajaran baru
            const id_induk = await tahunAjaranModel.createTahunAjaran(sanitizedData, connection);
            
            await connection.commit();
            
            res.status(201).json({
                success: true,
                message: `Tahun ajaran ${tahun_ajaran} berhasil ditambahkan. Tahun ajaran sebelumnya otomatis dinonaktifkan.`,
                id_induk
            });
            
        } catch (err) {
            await connection.rollback();
            
            // Handle error duplikasi dari database (safety net)
            if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
                return res.status(400).json({
                    success: false,
                    message: `Tahun ajaran "${tahun_ajaran}" sudah ada di sistem.`
                });
            }
            
            throw err;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error('Error tambah tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Gagal menambah tahun ajaran'
        });
    }
};

const updateTahunAjaran = async (req, res) => {
    try {
        const { id_induk } = req.params;
        const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = req.body;

        // ═══ VALIDASI 1: Cek tahun ajaran ada ═══
        const [cekTA] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran_induk WHERE id_tahun_ajaran_induk = ?`,
            [id_induk]
        );

        if (cekTA.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran tidak ditemukan.'
            });
        }

        // ═══ VALIDASI 2: Ambil data lama untuk perbandingan ═══
        const dataLama = await tahunAjaranModel.getTahunAjaranById(id_induk);
        if (!dataLama) {
            return res.status(404).json({
                success: false,
                message: 'Data tahun ajaran tidak ditemukan.'
            });
        }

        // ═══ SANITASI data baru ═══
        const dataBaru = {
            pts_ganjil: sanitizeDate(pts_ganjil),
            pas_ganjil: sanitizeDate(pas_ganjil),
            pts_genap: sanitizeDate(pts_genap),
            pas_genap: sanitizeDate(pas_genap)
        };

        // ═══ VALIDASI 3: Cek apakah ada perubahan (hasChanges) ═══
        const hasChanges = 
            formatDateForCompare(dataLama.pts_ganjil) !== (dataBaru.pts_ganjil || '') ||
            formatDateForCompare(dataLama.pas_ganjil) !== (dataBaru.pas_ganjil || '') ||
            formatDateForCompare(dataLama.pts_genap) !== (dataBaru.pts_genap || '') ||
            formatDateForCompare(dataLama.pas_genap) !== (dataBaru.pas_genap || '');

        if (!hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data. Tidak perlu menyimpan.'
            });
        }

        // ═══ UPDATE data ═══
        const success = await tahunAjaranModel.updateTahunAjaran(id_induk, dataBaru);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Gagal memperbarui data tahun ajaran.'
            });
        }

        res.json({
            success: true,
            message: 'Data tahun ajaran berhasil diperbarui.'
        });

    } catch (err) {
        console.error('Error update tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Gagal memperbarui data tahun ajaran'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/admin/tahun-ajaran/:id_induk/semester
// ═══════════════════════════════════════════════════════════════
const gantiSemester = async (req, res) => {
    try {
        const { id_induk } = req.params;
        const { semester_baru } = req.body;

        if (!['Ganjil', 'Genap'].includes(semester_baru)) {
            return res.status(400).json({
                success: false,
                message: 'Semester harus Ganjil atau Genap'
            });
        }

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [cekInduk] = await connection.execute(
                `SELECT id_tahun_ajaran_induk, tahun_ajaran FROM tahun_ajaran_induk WHERE id_tahun_ajaran_induk = ?`,
                [id_induk]
            );

            if (cekInduk.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Tahun ajaran tidak ditemukan'
                });
            }

            const semesterLama = semester_baru === 'Ganjil' ? 'Genap' : 'Ganjil';
            
            const [idSemesterLama] = await connection.execute(`
                SELECT id_tahun_ajaran FROM tahun_ajaran 
                WHERE id_tahun_ajaran_induk = ? AND semester = ?
            `, [id_induk, semesterLama]);

            if (idSemesterLama.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Semester ${semesterLama} tidak ditemukan untuk tahun ajaran ini`
                });
            }

            const id_ta_lama = idSemesterLama[0].id_tahun_ajaran;
            
            // Validasi data (SKIP jika tabel belum ada)
            let totalSiswa = 0;
            let totalKelas = 0;
            let siswaSudahInput = 0;
            
            try {
                const [cekSiswa] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.siswa_id) as total_siswa
                    FROM siswa_kelas sk
                    WHERE sk.tahun_ajaran_id = ?
                `, [id_induk]);
                totalSiswa = cekSiswa[0]?.total_siswa || 0;
                
                const [cekKelas] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.kelas_id) as total_kelas
                    FROM siswa_kelas sk
                    WHERE sk.tahun_ajaran_id = ?
                `, [id_induk]);
                totalKelas = cekKelas[0]?.total_kelas || 0;
                
                const [cekAdaNilai] = await connection.execute(`
                    SELECT COUNT(DISTINCT nr.siswa_id) as siswa_sudah_input
                    FROM nilai_rapor nr
                    WHERE nr.id_tahun_ajaran = ?
                `, [id_ta_lama]);
                siswaSudahInput = cekAdaNilai[0]?.siswa_sudah_input || 0;
                
            } catch (queryErr) {
                console.warn('⚠️ Warning: Tabel siswa_kelas/nilai_rapor belum ada, skip validasi');
            }
            
            if (totalSiswa > 0 && siswaSudahInput === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `⚠️ Belum Ada Nilai untuk Semester ${semesterLama}`,
                    detail: `Terdapat ${totalSiswa} siswa di ${totalKelas} kelas, namun belum ada input nilai rapor untuk semester ${semesterLama}.\n\nPastikan semua nilai sudah diinput sebelum mengganti semester.`,
                    warning: true
                });
            }
            
            if (siswaSudahInput > 0) {
                const [cekNilai] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.siswa_id) as siswa_belum_lengkap
                    FROM siswa_kelas sk
                    WHERE sk.tahun_ajaran_id = ?
                    AND (
                        sk.siswa_id NOT IN (
                            SELECT siswa_id FROM nilai_rapor 
                            WHERE id_tahun_ajaran = ? AND jenis_penilaian = 'PTS'
                        )
                        OR
                        sk.siswa_id NOT IN (
                            SELECT siswa_id FROM nilai_rapor 
                            WHERE id_tahun_ajaran = ? AND jenis_penilaian = 'PAS'
                        )
                    )
                `, [id_induk, id_ta_lama, id_ta_lama]);
                
                if (cekNilai[0].siswa_belum_lengkap > 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `⚠️ Ada Nilai yang Belum Lengkap`,
                        detail: `Masih ada ${cekNilai[0].siswa_belum_lengkap} siswa yang nilainya belum lengkap di semester ${semesterLama}. Harap lengkapi nilai PTS dan PAS terlebih dahulu.`,
                        warning: true
                    });
                }
            }

            await connection.execute(`
                UPDATE tahun_ajaran 
                SET status = 'nonaktif' 
                WHERE id_tahun_ajaran_induk = ? AND semester = ?
            `, [id_induk, semesterLama]);
            
            await connection.execute(`
                UPDATE tahun_ajaran 
                SET status = 'aktif' 
                WHERE id_tahun_ajaran_induk = ? AND semester = ?
            `, [id_induk, semester_baru]);
            
            await connection.commit();
            
            res.json({
                success: true,
                message: `Semester berhasil diganti ke ${semester_baru}.`,
                semester_aktif: semester_baru
            });
            
        } catch (err) {
            await connection.rollback();
            console.error('Error transaction:', err);
            throw err;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error('Error ganti semester:', err);
        res.status(500).json({
            success: false,
            message: `Gagal mengganti semester: ${err.message}`,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

module.exports = {
    getTahunAjaran,
    tambahTahunAjaran,
    updateTahunAjaran,
    gantiSemester
};