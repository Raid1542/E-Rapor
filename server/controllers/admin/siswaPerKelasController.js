/**
 * Nama File: siswaPerKelasController.js
 * Fungsi: Controller untuk mengelola relasi siswa ke kelas
 * UPDATE: ✅ TAMBAH validasi read-only di assign & keluarkan siswa
 */

const SiswaPerKelasModel = require('../../models/admin/siswaPerKelasModel');
const SiswaModel = require('../../models/admin/siswaModel');
const db = require('../../config/db');

// ✅ Import checkReadOnly dari kelasController
const { checkReadOnly } = require('./kelasController');

const getTahunAjaranAktif = async () => {
    const [rows] = await db.execute(`
        SELECT id_tahun_ajaran_induk 
        FROM tahun_ajaran 
        WHERE status = 'aktif' 
        LIMIT 1
    `);
    return rows.length > 0 ? rows[0].id_tahun_ajaran_induk : null;
};

const getSiswaByKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { tahun_ajaran_id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Kelas ID wajib diisi'
            });
        }

        let tahunAjaranId = tahun_ajaran_id ? parseInt(tahun_ajaran_id) : null;

        if (!tahunAjaranId) {
            tahunAjaranId = await getTahunAjaranAktif();
            if (!tahunAjaranId) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Tidak ada tahun ajaran aktif'
                });
            }
        }

        const siswaList = await SiswaPerKelasModel.getSiswaByKelas(id, tahunAjaranId);

        res.json({
            success: true,
            data: siswaList,
            total: siswaList.length
        });

    } catch (err) {
        console.error('Error getSiswaByKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data siswa: ' + err.message
        });
    }
};

const getSiswaAvailable = async (req, res) => {
    try {
        const { tahun_ajaran_id, search } = req.query;

        let tahunAjaranId = tahun_ajaran_id ? parseInt(tahun_ajaran_id) : null;

        if (!tahunAjaranId) {
            tahunAjaranId = await getTahunAjaranAktif();
            if (!tahunAjaranId) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Tidak ada tahun ajaran aktif'
                });
            }
        }

        const siswaList = await SiswaPerKelasModel.getSiswaBelumPunyaKelas(tahunAjaranId, search);

        res.json({
            success: true,
            data: siswaList,
            total: siswaList.length
        });

    } catch (err) {
        console.error('Error getSiswaAvailable:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data siswa: ' + err.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// ✅ UPDATED: Validasi read-only sebelum assign siswa
// ═══════════════════════════════════════════════════════════════
const assignSiswaKeKelas = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id: kelasId } = req.params;
        const { siswa_ids, tahun_ajaran_id } = req.body;

        if (!kelasId) {
            return res.status(400).json({
                success: false,
                message: 'Kelas ID wajib diisi'
            });
        }

        if (!Array.isArray(siswa_ids) || siswa_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Pilih minimal 1 siswa untuk di-assign'
            });
        }

        let tahunAjaranId = tahun_ajaran_id || await getTahunAjaranAktif();
        if (!tahunAjaranId) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        // ✅ BARU: CEK READ-ONLY
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(tahunAjaranId);
        if (isReadOnly) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat menambah siswa karena penilaian ${lockedBy} semester ${lockedSemester} telah diarsipkan. Data siswa dikunci sampai tahun ajaran berakhir.`
            });
        }

        await connection.beginTransaction();

        let assignedCount = 0;
        const skipped = [];

        for (const siswaId of siswa_ids) {
            try {
                const siswa = await SiswaModel.getSiswaById(siswaId);
                if (!siswa) {
                    skipped.push({
                        id: siswaId,
                        reason: 'Siswa tidak ditemukan di master data'
                    });
                    continue;
                }

                const existingKelas = await SiswaPerKelasModel.checkSiswaPunyaKelas(siswaId, tahunAjaranId);
                if (existingKelas) {
                    skipped.push({
                        id: siswaId,
                        nama: siswa.nama_lengkap,
                        reason: `Sudah terdaftar di kelas ${existingKelas.nama_kelas}`
                    });
                    continue;
                }

                await SiswaPerKelasModel.assignSiswaKeKelas(siswaId, kelasId, tahunAjaranId, connection);
                assignedCount++;

            } catch (err) {
                console.error(`Error assign siswa ${siswaId}:`, err);
                skipped.push({
                    id: siswaId,
                    reason: err.message
                });
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: skipped.length > 0
                ? `Assign selesai: ${assignedCount} berhasil, ${skipped.length} dilewati`
                : `Berhasil assign ${assignedCount} siswa ke kelas`,
            assigned: assignedCount,
            skipped: skipped
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error assignSiswaKeKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal assign siswa: ' + err.message
        });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════
// ✅ UPDATED: Validasi read-only sebelum keluarkan siswa
// ═══════════════════════════════════════════════════════════════
const keluarkanSiswaDariKelas = async (req, res) => {
    try {
        const { id: kelasId, siswaId } = req.params;
        const { tahun_ajaran_id } = req.query;

        let tahunAjaranId = tahun_ajaran_id || await getTahunAjaranAktif();
        if (!tahunAjaranId) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        // ✅ BARU: CEK READ-ONLY
        const { isReadOnly, lockedBy, lockedSemester } = await checkReadOnly(tahunAjaranId);
        if (isReadOnly) {
            return res.status(403).json({
                success: false,
                message: `Tidak dapat mengeluarkan siswa karena penilaian ${lockedBy} semester ${lockedSemester} telah diarsipkan. Data siswa dikunci sampai tahun ajaran berakhir.`
            });
        }

        const siswaInKelas = await SiswaPerKelasModel.getSiswaByIdInKelas(siswaId, kelasId, tahunAjaranId);
        if (!siswaInKelas) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak terdaftar di kelas ini'
            });
        }

        const deleted = await SiswaPerKelasModel.hapusSiswaDariKelas(siswaId, kelasId, tahunAjaranId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengeluarkan siswa dari kelas'
            });
        }

        res.json({
            success: true,
            message: `Siswa "${siswaInKelas.nama_lengkap}" berhasil dikeluarkan dari kelas (data master tetap aman)`
        });

    } catch (err) {
        console.error('Error keluarkanSiswaDariKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengeluarkan siswa: ' + err.message
        });
    }
};

module.exports = {
    getSiswaByKelas,
    getSiswaAvailable,
    assignSiswaKeKelas,
    keluarkanSiswaDariKelas
};