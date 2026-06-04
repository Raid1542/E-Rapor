/**
 * Nama File: pembelajaranController.js
 * Fungsi: Controller untuk CRUD pembelajaran dengan validasi lengkap:
 *         - Cek duplikasi (guru + kelas + mapel + TA)
 *         - Validasi otomatis mapel wajib = wali kelas
 *         - Validasi 1 mapel di 1 kelas = 1 guru
 *         - Cek hasChanges untuk edit
 *         - Cek nilai rapor sebelum hapus
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Update: Perbaikan nama kolom (mapel_id), tambah validasi human error,
 *         tambah endpoint getPembelajaranByKelas untuk flow baru
 */

const db = require('../../config/db');
const pembelajaranModel = require('../../models/pembelajaranModel');


const getPembelajaran = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        
        if (!tahun_ajaran_id || isNaN(Number(tahun_ajaran_id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'tahun_ajaran_id wajib diisi dan harus angka' 
            });
        }

        const rows = await pembelajaranModel.getAllByTahunAjaran(Number(tahun_ajaran_id));

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get pembelajaran:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data penugasan mengajar' 
        });
    }
};

const getPembelajaranByKelas = async (req, res) => {
    try {
        const { kelasId } = req.params;
        
        if (!kelasId || isNaN(Number(kelasId))) {
            return res.status(400).json({ 
                success: false, 
                message: 'kelasId wajib diisi dan harus angka' 
            });
        }

        // Ambil info kelas + status TA
        const kelasInfo = await pembelajaranModel.getKelasInfo(Number(kelasId));
        if (!kelasInfo) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kelas tidak ditemukan' 
            });
        }

        // Ambil wali kelas
        const waliKelas = await pembelajaranModel.getWaliKelas(
            Number(kelasId), 
            kelasInfo.tahun_ajaran_id
        );

        // Ambil data pembelajaran, pisah wajib vs pilihan
        const separated = await pembelajaranModel.getByKelasIdSeparated(Number(kelasId));

        res.json({
            success: true,
            data: {
                kelas: {
                    id: kelasInfo.id_kelas,
                    nama_kelas: kelasInfo.nama_kelas,
                    tahun_ajaran_id: kelasInfo.tahun_ajaran_id,
                    tahun_ajaran: kelasInfo.tahun_ajaran,
                    semester: kelasInfo.semester_aktif,
                    is_aktif: kelasInfo.status_ta === 'aktif'
                },
                wali_kelas: waliKelas ? {
                    id: waliKelas.id_user,
                    nama: waliKelas.nama_lengkap
                } : null,
                mapel_wajib: separated.mapel_wajib,
                mapel_pilihan: separated.mapel_pilihan
            }
        });
    } catch (err) {
        console.error('Error get pembelajaran by kelas:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data pembelajaran kelas' 
        });
    }
};

const getDropdownPembelajaran = async (req, res) => {
    try {
        const taId = req.idTahunAjaranInduk;
        if (!taId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tidak ada tahun ajaran aktif' 
            });
        }

        const guru = await pembelajaranModel.getGuruAktif();
        const kelas = await pembelajaranModel.getKelasByTahunAjaran(taId);
        const mata_pelajaran = await pembelajaranModel.getMapelByTahunAjaran(taId);

        res.json({
            success: true,
            data: {
                guru,
                kelas,
                mata_pelajaran
            }
        });
    } catch (err) {
        console.error('Error get dropdown pembelajaran:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data dropdown' 
        });
    }
};

const tambahPembelajaran = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { kelas_id, mapel_id, user_id } = req.body; 
        const taId = req.idTahunAjaranInduk;

        // ═══ VALIDASI Field wajib ═══
        if (!kelas_id || !mapel_id || !user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Guru, kelas, dan mata pelajaran wajib diisi.' 
            });
        }

        if (!taId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tidak ada tahun ajaran aktif.' 
            });
        }

        const kelasIdNum = Number(kelas_id);
        const mapelIdNum = Number(mapel_id);
        const userIdNum = Number(user_id);

        // ═══ VALIDASI Cek guru ada ═══
        const [guruCheck] = await connection.execute(
            `SELECT id_user FROM user WHERE id_user = ? AND status = 'aktif'`,
            [userIdNum]
        );
        if (guruCheck.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Guru tidak valid atau tidak aktif.' 
            });
        }

        // ═══ VALIDASI Cek kelas ada di TA aktif ═══
        const [kelasCheck] = await connection.execute(
            `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
            [kelasIdNum, taId]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kelas tidak valid atau bukan milik tahun ajaran aktif.' 
            });
        }

        // ═══ VALIDASI Cek mapel ada di TA aktif + ambil jenis mapel ═══
        const [mapelCheck] = await connection.execute(
            `SELECT id_mata_pelajaran, nama_mapel, jenis 
                FROM mata_pelajaran 
                WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?`,
            [mapelIdNum, taId]
        );
        if (mapelCheck.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mata pelajaran tidak valid atau bukan milik tahun ajaran aktif.' 
            });
        }
        const jenisMapel = mapelCheck[0].jenis;
        const namaMapel = mapelCheck[0].nama_mapel;

        // ═══ VALIDASI Cek duplikasi (guru + kelas + mapel + TA) ═══
        const isDuplicate = await pembelajaranModel.isDuplicate(
            userIdNum, kelasIdNum, mapelIdNum, taId
        );
        if (isDuplicate) {
            return res.status(400).json({ 
                success: false, 
                message: `Kombinasi guru, kelas, dan mata pelajaran "${namaMapel}" ini sudah ada.` 
            });
        }

        // ═══ VALIDASI Validasi otomatis mapel wajib vs pilihan ═══
        const waliKelas = await pembelajaranModel.getWaliKelas(kelasIdNum, taId);
        const isWaliKelas = waliKelas && waliKelas.id_user === userIdNum;

        if (jenisMapel === 'wajib') {
            // Mapel WAJIB harus diajar WALI KELAS
            if (!isWaliKelas) {
                const namaWali = waliKelas ? waliKelas.nama_lengkap : '(belum ada wali kelas)';
                return res.status(400).json({ 
                    success: false, 
                    message: `"${namaMapel}" adalah mata pelajaran WAJIB. Hanya wali kelas (${namaWali}) yang boleh mengajarkannya di kelas ini.` 
                });
            }
        } else {
            // Mapel PILIHAN tidak boleh diajar WALI KELAS (opsional, bisa disesuaikan)
            if (isWaliKelas) {
                return res.status(400).json({ 
                    success: false, 
                    message: `"${namaMapel}" adalah mata pelajaran PILIHAN. Wali kelas tidak boleh mengajarkannya, harus guru bidang studi.` 
                });
            }
        }


        // ═══ INSERT DATA ═══
        await connection.beginTransaction();

        const id = await pembelajaranModel.create(
            { 
                tahun_ajaran_id: taId, 
                kelas_id: kelasIdNum, 
                mapel_id: mapelIdNum,
                user_id: userIdNum 
            },
            connection
        );

        await connection.commit();
        
        res.status(201).json({ 
            success: true, 
            message: `Penugasan "${namaMapel}" berhasil ditambahkan.`,
            id 
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error tambah pembelajaran:', err);
        
        // Handle error duplikasi dari UNIQUE constraint (safety net)
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'Kombinasi guru, kelas, dan mata pelajaran ini sudah ada.'
            });
        }

        res.status(500).json({ 
            success: false, 
            message: err.message || 'Gagal menambah penugasan mengajar' 
        });
    } finally {
        connection.release();
    }
};

const editPembelajaran = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { kelas_id, mapel_id, user_id } = req.body; 
        const taId = req.idTahunAjaranInduk;

        // ═══ VALIDASI Field wajib ═══
        if (!kelas_id || !mapel_id || !user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Guru, kelas, dan mata pelajaran wajib diisi.' 
            });
        }

        if (!taId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tidak ada tahun ajaran aktif.' 
            });
        }

        const idNum = Number(id);
        const kelasIdNum = Number(kelas_id);
        const mapelIdNum = Number(mapel_id);
        const userIdNum = Number(user_id);

        // ═══ VALIDASI Cek data exist + ambil data lama ═══
        const oldData = await pembelajaranModel.getById(idNum);
        if (!oldData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Penugasan tidak ditemukan.' 
            });
        }

        // ═══ VALIDASI Cek data milik TA aktif ═══
        if (oldData.tahun_ajaran_id !== taId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak dapat mengedit penugasan dari tahun ajaran yang tidak aktif.' 
            });
        }

        // ═══ VALIDASI Cek hasChanges (tidak ada perubahan) ═══
        const hasChanges = 
            oldData.user_id !== userIdNum ||
            oldData.kelas_id !== kelasIdNum ||
            oldData.mapel_id !== mapelIdNum;

        if (!hasChanges) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tidak ada perubahan data. Tidak perlu menyimpan.' 
            });
        }

        // ═══ VALIDASI Cek guru ada ═══
        const [guruCheck] = await connection.execute(
            `SELECT id_user FROM user WHERE id_user = ? AND status = 'aktif'`,
            [userIdNum]
        );
        if (guruCheck.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Guru tidak valid atau tidak aktif.' 
            });
        }

        // ═══ VALIDASI Cek kelas ada di TA aktif ═══
        const [kelasCheck] = await connection.execute(
            `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
            [kelasIdNum, taId]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kelas tidak valid atau bukan milik tahun ajaran aktif.' 
            });
        }

        // ═══ VALIDASI Cek mapel ada di TA aktif + ambil jenis ═══
        const [mapelCheck] = await connection.execute(
            `SELECT id_mata_pelajaran, nama_mapel, jenis 
                FROM mata_pelajaran 
                WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?`,
            [mapelIdNum, taId]
        );
        if (mapelCheck.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mata pelajaran tidak valid atau bukan milik tahun ajaran aktif.' 
            });
        }
        const jenisMapel = mapelCheck[0].jenis;
        const namaMapel = mapelCheck[0].nama_mapel;

        // ═══ VALIDASI Cek duplikasi (exclude ID sendiri) ═══
        const isDuplicate = await pembelajaranModel.isDuplicate(
            userIdNum, kelasIdNum, mapelIdNum, taId, idNum
        );
        if (isDuplicate) {
            return res.status(400).json({ 
                success: false, 
                message: `Kombinasi guru, kelas, dan mata pelajaran "${namaMapel}" ini sudah ada.` 
            });
        }

        // ═══ VALIDASI Validasi otomatis mapel wajib vs pilihan ═══
        const waliKelas = await pembelajaranModel.getWaliKelas(kelasIdNum, taId);
        const isWaliKelas = waliKelas && waliKelas.id_user === userIdNum;

        if (jenisMapel === 'wajib') {
            if (!isWaliKelas) {
                const namaWali = waliKelas ? waliKelas.nama_lengkap : '(belum ada wali kelas)';
                return res.status(400).json({ 
                    success: false, 
                    message: `"${namaMapel}" adalah mata pelajaran WAJIB. Hanya wali kelas (${namaWali}) yang boleh mengajarkannya.` 
                });
            }
        } else {
            if (isWaliKelas) {
                return res.status(400).json({ 
                    success: false, 
                    message: `"${namaMapel}" adalah mata pelajaran PILIHAN. Wali kelas tidak boleh mengajarkannya.` 
                });
            }
        }


        // ═══ UPDATE DATA ═══
        await connection.beginTransaction();

        const success = await pembelajaranModel.update(
            idNum,
            { 
                kelas_id: kelasIdNum, 
                mapel_id: mapelIdNum, 
                user_id: userIdNum 
            },
            connection
        );

        await connection.commit();

        if (!success) {
            return res.status(404).json({ 
                success: false, 
                message: 'Gagal memperbarui penugasan.' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Penugasan "${namaMapel}" berhasil diperbarui.` 
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error edit pembelajaran:', err);

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({
                success: false,
                message: 'Kombinasi guru, kelas, dan mata pelajaran ini sudah ada.'
            });
        }

        res.status(500).json({ 
            success: false, 
            message: err.message || 'Gagal memperbarui penugasan mengajar' 
        });
    } finally {
        connection.release();
    }
};

const hapusPembelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const taId = req.idTahunAjaranInduk;

        // ═══ VALIDASI TA aktif ═══
        if (!taId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tidak ada tahun ajaran aktif.' 
            });
        }

        const idNum = Number(id);

        // ═══ VALIDASI Ambil data + cek milik TA aktif ═══
        const data = await pembelajaranModel.getById(idNum);
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                message: 'Penugasan tidak ditemukan.' 
            });
        }

        if (data.tahun_ajaran_id !== taId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Tidak dapat menghapus penugasan dari tahun ajaran yang tidak aktif.' 
            });
        }

        // ═══ VALIDASI Cek apakah sudah ada nilai rapor ═══
        const jumlahNilai = await pembelajaranModel.hasNilaiRapor(
            data.mapel_id, 
            data.kelas_id, 
            data.tahun_ajaran_id
        );
        
        if (jumlahNilai > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Tidak bisa dihapus: sudah ada ${jumlahNilai} data nilai rapor untuk "${data.nama_mapel}" di kelas "${data.nama_kelas}". Hapus data nilai rapor terlebih dahulu.` 
            });
        }

        // ═══ DELETE DATA ═══
        const success = await pembelajaranModel.deleteById(idNum);

        if (!success) {
            return res.status(404).json({ 
                success: false, 
                message: 'Penugasan tidak ditemukan.' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Penugasan "${data.nama_mapel}" dari ${data.nama_guru} di kelas ${data.nama_kelas} berhasil dihapus.` 
        });

    } catch (err) {
        console.error('Error hapus pembelajaran:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus penugasan mengajar' 
        });
    }
};

module.exports = {
    getPembelajaran,
    getPembelajaranByKelas,
    getDropdownPembelajaran,
    tambahPembelajaran,
    editPembelajaran,
    hapusPembelajaran
};