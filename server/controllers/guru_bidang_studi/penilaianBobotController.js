/**
 * Nama File: penilaianBobotController.js
 * UPDATE: Fix bug parameter, sesuaikan dengan model & middleware
 */

const bobotModel = require('../../models/guru_bidang_studi/penilaianBobotModel');

exports.getBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const { kelas_id } = req.query; 
        const userId = req.user.id;

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

        const taAktif = await bobotModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        const isValid = await bobotModel.validateGuruMapel(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        const komponenList = await bobotModel.getAllKomponenPenilaian();
        if (komponenList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Komponen penilaian belum diatur oleh admin.'
            });
        }

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

// GANTI SELURUH fungsi updateBobotPenilaian dengan ini:
exports.updateBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const { kelas_id, bobot_list } = req.body;
        const userId = req.user.id;

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

        const bobotList = bobot_list || req.body;
        if (!Array.isArray(bobotList) || bobotList.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data bobot tidak valid.'
            });
        }

        const taAktif = await bobotModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;

        if (taAktif.status_pts === 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Bobot tidak dapat diubah saat periode PTS aktif.',
            });
        }

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

        const total = bobotList.reduce((sum, b) => sum + parseFloat(b.bobot), 0);
        if (Math.abs(total - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Total bobot harus 100%. Saat ini: ${total.toFixed(2)}%`
            });
        }

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

        await bobotModel.updateBobotPenilaian(
            mapelId,
            semesterId,
            bobotList,
            kelasIdNum
        );

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