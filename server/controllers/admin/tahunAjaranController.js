/**
 * Nama File: tahunAjaranController.js
 * Fungsi: Controller untuk mengelola tahun ajaran (2 tabel: induk + semester)
 *         Mendukung tampilan 1 baris UI (Ganjil & Genap digabung)
 */

const tahunAjaranModel = require('../../models/tahunAjaranModel');
const db = require('../../config/db');

const getTahunAjaran = async (req, res) => {
    try {
        const data = await tahunAjaranModel.getAllTahunAjaran();

        // Format response agar sesuai dengan kolom tabel di frontend
        const formattedData = data.map(row => ({
            id_induk: row.id_tahun_ajaran_induk,
            tahun_ajaran: row.tahun_ajaran,

            // Tanggal PTS/PAS Ganjil
            pts_ganjil: row.pts_ganjil,
            pas_ganjil: row.pas_ganjil,

            // Tanggal PTS/PAS Genap
            pts_genap: row.pts_genap,
            pas_genap: row.pas_genap,

            // Status & Semester Aktif
            status: row.status_ganjil === 'aktif' ? 'AKTIF' : 'NONAKTIF',
            semester_aktif: row.semester_aktif,

            // ID Detail untuk keperluan edit (opsional)
            id_detail_ganjil: row.id_ganjil,
            id_detail_genap: row.id_genap,

            created_at: row.created_at
        }));

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

        if (!tahun1 || !tahun2) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran wajib diisi (contoh: 2024/2025)'
            });
        }

        const tahun_ajaran = `${tahun1}/${tahun2}`;

        // Cek duplikasi
        const existing = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran_induk WHERE tahun_ajaran = ?`,
            [tahun_ajaran]
        );

        if (existing[0].length > 0) {
            return res.status(400).json({
                success: false,
                message: `Tahun ajaran ${tahun_ajaran} sudah ada!`
            });
        }

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            await connection.execute(`
                UPDATE tahun_ajaran 
                SET status = 'nonaktif' 
                WHERE status = 'aktif'
            `);
            
            // Buat tahun ajaran baru
            const id_induk = await tahunAjaranModel.createTahunAjaran({
                tahun_ajaran,
                pts_ganjil: pts_ganjil || null,
                pas_ganjil: pas_ganjil || null,
                pts_genap: pts_genap || null,
                pas_genap: pas_genap || null
            }, connection);
            
            await connection.commit();
            
            res.status(201).json({
                success: true,
                message: `Tahun ajaran ${tahun_ajaran} berhasil ditambahkan. Tahun ajaran sebelumnya otomatis dinonaktifkan.`,
                id_induk
            });
            
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error('Error tambah tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah tahun ajaran'
        });
    }
};


const updateTahunAjaran = async (req, res) => {
    try {
        const { id_induk } = req.params; // ← Perhatikan: pakai id_induk, bukan id!
        const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = req.body;

        // Validasi: minimal ada 1 field yang diupdate
        if (!pts_ganjil && !pas_ganjil && !pts_genap && !pas_genap) {
            return res.status(400).json({
                success: false,
                message: 'Minimal satu tanggal PTS/PAS harus diisi untuk diupdate'
            });
        }

        // Update via model (transaction: update ganjil/genap sesuai field yang dikirim)
        const success = await tahunAjaranModel.updateTahunAjaran(id_induk, {
            pts_ganjil,
            pas_ganjil,
            pts_genap,
            pas_genap
        });

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Data tahun ajaran berhasil diperbarui'
        });

    } catch (err) {
        console.error('Error update tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data tahun ajaran'
        });
    }
};

const gantiSemester = async (req, res) => {
    try {
        const { id_induk } = req.params;
        const { semester_baru } = req.body;

        // Validasi input
        if (!['Ganjil', 'Genap'].includes(semester_baru)) {
            return res.status(400).json({
                success: false,
                message: 'Semester harus Ganjil atau Genap'
            });
        }

        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // ✅ CEK 1: Apakah tahun ajaran induk ada?
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
            
            // ✅ CEK 2: Ambil ID tahun_ajaran untuk semester lama
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
            
            // ✅ CEK 3: Validasi data (SKIP jika tabel belum ada - development mode)
            let totalSiswa = 0;
            let totalKelas = 0;
            let siswaSudahInput = 0;
            
            try {
                // Cek siswa di kelas (tahun_ajaran_id merujuk ke induk)
                const [cekSiswa] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.siswa_id) as total_siswa
                    FROM siswa_kelas sk
                    WHERE sk.tahun_ajaran_id = ?
                `, [id_induk]);
                totalSiswa = cekSiswa[0]?.total_siswa || 0;
                
                // Cek kelas
                const [cekKelas] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.kelas_id) as total_kelas
                    FROM siswa_kelas sk
                    WHERE sk.tahun_ajaran_id = ?
                `, [id_induk]);
                totalKelas = cekKelas[0]?.total_kelas || 0;
                
                // Cek nilai rapor (id_tahun_ajaran merujuk ke semester)
                const [cekAdaNilai] = await connection.execute(`
                    SELECT COUNT(DISTINCT nr.siswa_id) as siswa_sudah_input
                    FROM nilai_rapor nr
                    WHERE nr.id_tahun_ajaran = ?
                `, [id_ta_lama]);
                siswaSudahInput = cekAdaNilai[0]?.siswa_sudah_input || 0;
                
            } catch (queryErr) {
                // Tabel belum ada → skip validasi (development)
                console.warn('⚠️ Warning: Tabel siswa_kelas/nilai_rapor belum ada, skip validasi');
            }
            
            // ✅ VALIDASI: Jika ada data, pastikan nilai sudah lengkap
            if (totalSiswa > 0 && siswaSudahInput === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `⚠️ Belum Ada Nilai untuk Semester ${semesterLama}`,
                    detail: `Terdapat ${totalSiswa} siswa di ${totalKelas} kelas, namun belum ada input nilai rapor untuk semester ${semesterLama}.\n\nPastikan semua nilai sudah diinput sebelum mengganti semester.`,
                    warning: true
                });
            }
            
            // ✅ PERBAIKI: Cek nilai belum lengkap dengan query yang benar
            if (siswaSudahInput > 0) {
                const [cekNilai] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.siswa_id) as siswa_belum_lengkap
                    FROM siswa_kelas sk
                    WHERE sk.tahun_ajaran_id = ?
                    AND (
                        -- Cek apakah siswa ini belum punya nilai PTS
                        sk.siswa_id NOT IN (
                            SELECT siswa_id FROM nilai_rapor 
                            WHERE id_tahun_ajaran = ? AND jenis_penilaian = 'PTS'
                        )
                        OR
                        -- Atau belum punya nilai PAS
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

            // ✅ UPDATE: Ganti status semester
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
            console.error('❌ Error transaction:', err);
            throw err;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error('❌ Error ganti semester:', err);
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