/**
 * Nama File: penilaianBobotController.js
 * Fungsi: Controller untuk manajemen bobot penilaian per mata pelajaran.
 *         Menangani pengambilan dan update bobot komponen penilaian,
 *         validasi total bobot 100%, dan auto-recompute nilai rapor.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const bobotModel = require('../../models/guru_bidang_studi/penilaianBobotModel');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET BOBOT PENILAIAN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-bidang-studi/bobot/:mapelId
 * Ambil konfigurasi bobot penilaian untuk mata pelajaran dan kelas tertentu.
 * 
 * Alur Kerja:
 *   1. Validasi parameter (mapelId, kelas_id)
 *   2. Cek tahun ajaran aktif
 *   3. Validasi akses guru ke mapel
 *   4. Jika PTS aktif → return bobot locked (PTS = 100%)
 *   5. Jika PAS aktif → return bobot dari database
 * 
 * @param {string} req.params.mapelId - ID mata pelajaran
 * @param {string} req.query.kelas_id - ID kelas
 */
exports.getBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const { kelas_id } = req.query; 
        const userId = req.user.id;

        // Validasi parameter kelas_id
        if (!kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter kelas_id wajib diisi (via query string)'
            });
        }

        const kelasIdNum = parseInt(kelas_id, 10);
        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid'
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await bobotModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Validasi akses guru ke mapel
        const isValid = await bobotModel.validateGuruMapel(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Ambil daftar komponen penilaian
        const komponenList = await bobotModel.getAllKomponenPenilaian();
        if (komponenList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Komponen penilaian belum diatur oleh admin.'
            });
        }

        // Jika PTS aktif → bobot locked (PTS = 100%)
        if (taAktif.status_pts === 'aktif') {
            const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
            const result = komponenList.map(k => ({
                komponen_id: k.id_komponen,
                bobot: k.id_komponen === ptsKomponen?.id_komponen ? 100 : 0,
                locked: true,
            }));

            return res.json({
                success: true,
                data: result,
                is_locked: true,
                mapel: req.penugasanMapel?.nama_mapel || 'Mata Pelajaran',
                kelas_id: kelasIdNum,
                kelas_list: req.penugasanMapel?.kelas_list || []
            });
        }

        // Jika PAS aktif → ambil bobot dari database
        const bobotMap = await bobotModel.getBobotMapByMapel(mapelId, semesterId, kelasIdNum);
        
        const result = komponenList.map(k => ({
            komponen_id: k.id_komponen,
            bobot: bobotMap.get(k.id_komponen) || 0,
        }));

        res.json({
            success: true,
            data: result,
            is_locked: false,
            mapel: req.penugasanMapel?.nama_mapel || 'Mata Pelajaran',
            kelas_id: kelasIdNum,
            kelas_list: req.penugasanMapel?.kelas_list || []
        });

    } catch (err) {
        console.error('Error getBobotPenilaian:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil bobot: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPDATE BOBOT PENILAIAN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-bidang-studi/bobot/:mapelId
 * Update konfigurasi bobot penilaian untuk mata pelajaran dan kelas tertentu.
 * 
 * Validasi:
 *   - Total bobot harus 100%
 *   - Setiap bobot harus 0-100
 *   - Komponen ID harus valid
 *   - Tidak bisa update saat PTS aktif
 * 
 * Fitur:
 *   - Auto-recompute semua nilai rapor setelah bobot berubah
 * 
 * @param {string} req.params.mapelId - ID mata pelajaran
 * @param {number} req.body.kelas_id - ID kelas
 * @param {Array} req.body.bobot_list - Array bobot [{komponen_id, bobot}]
 */
exports.updateBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const { kelas_id, bobot_list } = req.body;
        const userId = req.user.id;

        // Validasi parameter kelas_id
        if (!kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Parameter kelas_id wajib diisi di body'
            });
        }

        const kelasIdNum = parseInt(kelas_id, 10);
        if (isNaN(kelasIdNum) || kelasIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'kelas_id tidak valid'
            });
        }

        // Ambil bobot list dari body
        const bobotList = bobot_list || req.body;
        if (!Array.isArray(bobotList) || bobotList.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data bobot tidak valid.'
            });
        }

        // Ambil tahun ajaran aktif
        const taAktif = await bobotModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        // Validasi: tidak bisa update saat PTS aktif
        if (taAktif.status_pts === 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Bobot tidak dapat diubah saat periode PTS aktif.',
            });
        }

        // Validasi setiap bobot
        for (const b of bobotList) {
            if (!b.komponen_id || b.bobot === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Data bobot tidak lengkap.'
                });
            }
            const numBobot = parseFloat(b.bobot);
            if (isNaN(numBobot) || numBobot < 0 || numBobot > 100) {
                return res.status(400).json({
                    success: false,
                    message: `Bobot komponen ID ${b.komponen_id} tidak valid (0-100).`
                });
            }
        }

        // Validasi total bobot harus 100%
        const total = bobotList.reduce((sum, b) => sum + parseFloat(b.bobot), 0);
        if (Math.abs(total - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Total bobot harus 100%. Saat ini: ${total.toFixed(2)}%`
            });
        }

        // Validasi komponen ID
        const komponenList = await bobotModel.getAllKomponenPenilaian();
        const validIds = new Set(komponenList.map(k => k.id_komponen));
        for (const b of bobotList) {
            if (!validIds.has(b.komponen_id)) {
                return res.status(400).json({
                    success: false,
                    message: `Komponen ID ${b.komponen_id} tidak valid.`
                });
            }
        }

        // Update bobot di database
        await bobotModel.updateBobotPenilaian(
            mapelId,
            semesterId,
            bobotList,
            kelasIdNum
        );

        // Recompute semua nilai rapor dengan bobot baru
        const recomputeResult = await bobotModel.recomputeAllNilaiRapor(
            mapelId,
            userId,
            kelasIdNum
        );

        res.json({
            success: true,
            message: `Bobot untuk ${req.penugasanMapel?.nama_mapel} berhasil disimpan`,
            mapel: req.penugasanMapel?.nama_mapel,
            kelas_id: kelasIdNum,
            recomputed: recomputeResult
        });

    } catch (err) {
        console.error('Error updateBobotPenilaian:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan bobot: ' + err.message
        });
    }
};