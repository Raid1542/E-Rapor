/**
 * Nama File: kelasController.js
 * Fungsi: Controller CRUD kelas + wali kelas (dengan validasi read-only saat PTS/PAS selesai)
 * UPDATE: ✅ FIXED - Wali kelas otomatis dibuat untuk SEMUA semester dalam tahun ajaran
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const kelasModel = require('../../models/admin/kelasModel');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Helper: Ambil SEMUA semester dalam tahun ajaran (bukan hanya yang aktif)
const getAllSemester = async (idInduk) => {
    const [rows] = await db.execute(
        'SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ?',
        [idInduk]
    );
    return rows;
};

// Helper: Ambil ID semester aktif berdasarkan ID induk
const getIdSemesterAktif = async (idInduk) => {
    const [rows] = await db.execute(
        'SELECT id_tahun_ajaran FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND status = \'aktif\' LIMIT 1',
        [idInduk]
    );
    return rows.length > 0 ? rows[0].id_tahun_ajaran : null;
};

// Helper: Set wali kelas untuk SEMUA semester dalam tahun ajaran
const setWaliKelasForAllSemesters = async (userId, kelasId, idInduk) => {
    const semesters = await getAllSemester(idInduk);
    
    for (const sem of semesters) {
        // Delete record lama
        await db.execute(
            'DELETE FROM guru_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?',
            [kelasId, sem.id_tahun_ajaran]
        );
        
        // Insert record baru
        await db.execute(
            `INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id, created_at, updated_at) 
             VALUES (?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE updated_at = NOW()`,
            [userId, kelasId, sem.id_tahun_ajaran]
        );
    }
};

// Helper: Hapus wali kelas dari SEMUA semester
const deleteWaliKelasFromAllSemesters = async (kelasId, idInduk) => {
    const semesters = await getAllSemester(idInduk);
    
    for (const sem of semesters) {
        await db.execute(
            'DELETE FROM guru_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?',
            [kelasId, sem.id_tahun_ajaran]
        );
    }
};

// Cek apakah kelas dalam mode read-only (PTS/PAS selesai)
const checkReadOnly = async (idInduk) => {
    const [rows] = await db.execute(
        'SELECT status_pts, status_pas, semester FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ?',
        [idInduk]
    );
    if (rows.length === 0) return { isReadOnly: false, lockedBy: null, lockedSemester: null };

    const lockedRow = rows.find(row => row.status_pts === 'selesai' || row.status_pas === 'selesai');
    if (lockedRow) {
        const lockType = lockedRow.status_pts === 'selesai' ? 'PTS' : 'PAS';
        return { isReadOnly: true, lockedBy: lockType, lockedSemester: lockedRow.semester };
    }
    return { isReadOnly: false, lockedBy: null, lockedSemester: null };
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET ALL KELAS
// ═════════════════════════════════════════════════════════════════════════════

const getKelas = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id) return res.status(400).json({ success: false, message: 'Tahun ajaran wajib dipilih' });
        const idInduk = Number(tahun_ajaran_id);

        const [rows] = await db.execute(`
            SELECT k.id_kelas AS id, k.nama_kelas, k.fase,
                COALESCE(wk.nama_lengkap, '-') AS wali_kelas, wk.user_id AS wali_kelas_id,
                COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa
            FROM kelas k
            LEFT JOIN (
                SELECT gk.kelas_id, u.nama_lengkap, gk.user_id
                FROM guru_kelas gk 
                JOIN user u ON gk.user_id = u.id_user
                JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE ta.id_tahun_ajaran_induk = ?
                GROUP BY gk.kelas_id
            ) wk ON k.id_kelas = wk.kelas_id
            LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.id_tahun_ajaran_induk = ?
            WHERE k.tahun_ajaran_id = ?
            GROUP BY k.id_kelas, k.nama_kelas, k.fase, wk.nama_lengkap, wk.user_id
            ORDER BY k.nama_kelas ASC
        `, [idInduk, idInduk, idInduk]);
        
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(idInduk);
        
        res.json({ 
            success: true, 
            data: rows,
            is_read_only: isReadOnly,
            locked_by: lockedBy,
            locked_semester: lockedSemester
        });
    } catch (err) {
        console.error('Error get kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET KELAS BY ID
// ═════════════════════════════════════════════════════════════════════════════

const getKelasById = async (req, res) => {
    try {
        const { id } = req.params;
        const [kelasRow] = await db.execute('SELECT tahun_ajaran_id FROM kelas WHERE id_kelas = ?', [id]);
        if (kelasRow.length === 0) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

        const tahunAjaranIdInduk = kelasRow[0].tahun_ajaran_id;
        const kelas = await kelasModel.getByIdWithDetails(id, tahunAjaranIdInduk);
        if (!kelas) return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });

        kelas.is_aktif = (kelas.status_tahun_ajaran === 'aktif');
        delete kelas.status_tahun_ajaran;

        kelas.id_tahun_ajaran_induk = tahunAjaranIdInduk;
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(tahunAjaranIdInduk);
        kelas.is_read_only = isReadOnly;
        kelas.locked_by = lockedBy;
        kelas.locked_semester = lockedSemester;

        res.json({ success: true, data: kelas });
    } catch (err) {
        console.error('Error get kelas by ID:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. GET KELAS FOR DROPDOWN
// ═════════════════════════════════════════════════════════════════════════════

const getKelasForDropdown = async (req, res) => {
    try {
        const idInduk = req.idTahunAjaranInduk;
        if (!idInduk) return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });

        const [rows] = await db.execute(
            'SELECT id_kelas AS id, nama_kelas AS nama, fase FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC',
            [idInduk]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get kelas for dropdown:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. CREATE KELAS
// ═════════════════════════════════════════════════════════════════════════════

const tambahKelas = async (req, res) => {
    const { nama_kelas, fase, user_id } = req.body;
    const idInduk = req.idTahunAjaranInduk;

    if (!nama_kelas || !fase || !idInduk) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    try {
        // Cek mode read-only
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(idInduk);
        if (isReadOnly) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat menambah kelas karena penilaian ${lockedBy} semester ${lockedSemester} telah diarsipkan.`
            });
        }

        // Cek duplikasi nama kelas
        const existing = await kelasModel.getByTahunAjaran(idInduk);
        const isDuplicate = existing.some(k => k.nama_kelas.toLowerCase().trim() === nama_kelas.toLowerCase().trim());
        if (isDuplicate) {
            return res.status(400).json({ success: false, message: `Kelas "${nama_kelas}" sudah ada di tahun ajaran ini` });
        }

        // ✅ PERBAIKAN: Cek apakah guru sudah menjadi wali kelas di kelas lain (semua semester)
        if (user_id && Number(user_id) > 0) {
            const [cekGuruSudahPunyaKelas] = await db.execute(
                `SELECT k.nama_kelas, ta.semester 
                 FROM guru_kelas gk 
                 JOIN kelas k ON gk.kelas_id = k.id_kelas 
                 JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                 WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?`,
                [Number(user_id), idInduk]
            );
            if (cekGuruSudahPunyaKelas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Guru ini sudah menjadi wali kelas di "${cekGuruSudahPunyaKelas[0].nama_kelas}" pada tahun ajaran yang sama.`
                });
            }
        }

        // Create kelas dengan tahun_ajaran_id = idInduk
        const id = await kelasModel.create({ 
            nama_kelas, 
            fase, 
            tahun_ajaran_id: idInduk 
        });

        // ✅ PERBAIKAN: Set wali kelas untuk SEMUA semester dalam tahun ajaran
        if (user_id && Number(user_id) > 0) {
            await setWaliKelasForAllSemesters(Number(user_id), id, idInduk);
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
        res.status(500).json({ success: false, message: err.message || 'Gagal menambah kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. UPDATE KELAS
// ═════════════════════════════════════════════════════════════════════════════

const editKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kelas, fase, user_id } = req.body;
        const idInduk = req.idTahunAjaranInduk;

        if (!nama_kelas || !fase || !idInduk) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nama kelas, fase, dan tahun ajaran wajib diisi' 
            });
        }

        // Cek mode read-only
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(idInduk);
        if (isReadOnly) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat mengedit kelas karena penilaian ${lockedBy} semester ${lockedSemester} telah diarsipkan.`
            });
        }

        // Cek keberadaan kelas
        const existingKelas = await kelasModel.getById(id);
        if (!existingKelas) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        // Cek apakah ada perubahan data
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

        // Cek duplikasi nama kelas (exclude current kelas)
        const allKelas = await kelasModel.getByTahunAjaran(idInduk);
        const isDuplicate = allKelas.some(k => k.nama_kelas.toLowerCase().trim() === nama_kelas.toLowerCase().trim() && k.id_kelas !== Number(id));
        if (isDuplicate) {
            return res.status(400).json({ success: false, message: `Nama kelas "${nama_kelas}" sudah digunakan di tahun ajaran ini` });
        }

        // Update kelas
        const success = await kelasModel.update(id, { 
            nama_kelas, 
            fase, 
            tahun_ajaran_id: idInduk 
        });
        if (!success) return res.status(404).json({ success: false, message: 'Gagal memperbarui kelas' });

        // ✅ PERBAIKAN: Update wali kelas untuk SEMUA semester jika berubah
        if (existingUserId !== newUserId) {
            if (newUserId && newUserId > 0) {
                // Cek apakah guru sudah punya kelas lain
                const [cekWaliLain] = await db.execute(
                    `SELECT k.nama_kelas 
                     FROM guru_kelas gk 
                     JOIN kelas k ON gk.kelas_id = k.id_kelas 
                     JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                     WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ? AND gk.kelas_id != ?`,
                    [newUserId, idInduk, id]
                );
                if (cekWaliLain.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Guru ini sudah menjadi wali kelas di "${cekWaliLain[0].nama_kelas}" pada tahun ajaran yang sama.`
                    });
                }
            }
            
            // ✅ PERBAIKAN: Hapus wali kelas lama dari semua semester, set yang baru
            await deleteWaliKelasFromAllSemesters(id, idInduk);
            
            if (newUserId && newUserId > 0) {
                await setWaliKelasForAllSemesters(newUserId, id, idInduk);
            }
        }

        res.json({ success: true, message: 'Data kelas berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit kelas:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. DELETE KELAS
// ═════════════════════════════════════════════════════════════════════════════

const hapusKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const idInduk = req.idTahunAjaranInduk;

        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        // Cek mode read-only
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(idInduk);
        if (isReadOnly) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat menghapus kelas karena penilaian ${lockedBy} semester ${lockedSemester} telah diarsipkan.`
            });
        }

        // Cek keberadaan kelas
        const [kelasRows] = await db.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?', 
            [id, idInduk]
        );
        if (kelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan atau bukan milik tahun ajaran aktif' });
        }

        // Cek dependensi
        const [cekDep] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM siswa_kelas WHERE kelas_id = ?) AS siswa_count,
                (SELECT COUNT(*) FROM absensi WHERE kelas_id = ?) AS absensi_count,
                (SELECT COUNT(*) FROM nilai_rapor WHERE kelas_id = ?) AS nilai_rapor_count,
                (SELECT COUNT(*) FROM pembelajaran WHERE kelas_id = ?) AS pembelajaran_count
        `, [id, id, id, id]);

        const dep = cekDep[0];
        const total = dep.siswa_count + dep.absensi_count + dep.nilai_rapor_count + dep.pembelajaran_count;
        if (total > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kelas tidak bisa dihapus karena masih ada data siswa, absensi, nilai, atau pembelajaran.' 
            });
        }

        // ✅ PERBAIKAN: Delete wali kelas dari SEMUA semester
        await deleteWaliKelasFromAllSemesters(id, idInduk);
        
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

// ═════════════════════════════════════════════════════════════════════════════
// 7. SET WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

const setWaliKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const idInduk = req.idTahunAjaranInduk;

        if (!idInduk) {
            return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
        }

        // Cek mode read-only
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(idInduk);
        if (isReadOnly) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat mengubah wali kelas karena penilaian ${lockedBy} semester ${lockedSemester} telah diarsipkan.`
            });
        }

        // Cek keberadaan kelas
        const [kelasRows] = await db.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?', 
            [id, idInduk]
        );
        if (kelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }

        // ✅ PERBAIKAN: Cek apakah guru sudah menjadi wali kelas di kelas lain (semua semester)
        if (user_id && Number(user_id) > 0) {
            const [cekGuruSudahPunyaKelas] = await db.execute(
                `SELECT k.nama_kelas 
                 FROM guru_kelas gk 
                 JOIN kelas k ON gk.kelas_id = k.id_kelas 
                 JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                 WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ? AND gk.kelas_id != ?`,
                [Number(user_id), idInduk, Number(id)]
            );
            if (cekGuruSudahPunyaKelas.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Guru ini sudah menjadi wali kelas di "${cekGuruSudahPunyaKelas[0].nama_kelas}" pada tahun ajaran yang sama.`
                });
            }
        }

        // ✅ PERBAIKAN: Hapus wali kelas lama dari semua semester, set yang baru
        await deleteWaliKelasFromAllSemesters(id, idInduk);
        
        if (user_id && Number(user_id) > 0) {
            await setWaliKelasForAllSemesters(Number(user_id), Number(id), idInduk);
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
    checkReadOnly 
};