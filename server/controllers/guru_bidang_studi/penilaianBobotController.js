/**
 * Nama File: penilaianBobotController.js
 * Fungsi: Controller untuk mengelola bobot penilaian (tipis, logic di model)
 */

const bobotModel = require('../../models/guru_bidang_studi/penilaianBobotModel');

exports.getBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user.id;

        // Ambil tahun ajaran aktif
        const taAktif = await bobotModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        // Validasi akses guru
        const isValid = await bobotModel.validateGuruMapel(
            userId, 
            mapelId, 
            taAktif.id_tahun_ajaran_induk
        );
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        // Ambil komponen penilaian
        const komponenList = await bobotModel.getAllKomponenPenilaian();
        if (komponenList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Komponen penilaian belum diatur oleh admin.'
            });
        }

        // Jika PTS aktif → return bobot locked (PTS = 100%)
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
                is_locked: true
            });
        }

        // Ambil bobot dari database
        const bobotMap = await bobotModel.getBobotMapByMapel(mapelId);
        const result = komponenList.map(k => ({
            komponen_id: k.id_komponen,
            bobot: bobotMap.get(k.id_komponen) || 0,
        }));

        res.json({
            success: true,
            data: result,
            is_locked: false
        });

    } catch (err) {
        console.error('Error getBobotPenilaian:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil bobot: ' + err.message
        });
    }
};

exports.updateBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const bobotList = req.body;
        const userId = req.user.id;

        // Validasi input
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

        // Blokir saat PTS aktif
        if (taAktif.status_pts === 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Bobot tidak dapat diubah saat periode PTS aktif.'
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

        // Total harus 100%
        const total = bobotList.reduce((sum, b) => sum + parseFloat(b.bobot), 0);
        if (Math.abs(total - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Total bobot harus 100%. Saat ini: ${total.toFixed(2)}%`
            });
        }

        // Validasi akses guru
        const isValid = await bobotModel.validateGuruMapel(
            userId, 
            mapelId, 
            taAktif.id_tahun_ajaran_induk
        );
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak.'
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

        // Update bobot (transaction)
        await bobotModel.updateBobotPenilaian(mapelId, bobotList);

        // Recompute nilai rapor semua siswa
        const recomputeResult = await bobotModel.recomputeAllNilaiRapor(mapelId, userId);

        res.json({
            success: true,
            message: 'Bobot berhasil disimpan',
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