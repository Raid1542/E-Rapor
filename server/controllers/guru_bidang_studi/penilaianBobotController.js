/**
 * Nama File: penilaianBobotController.js
 * Fungsi: Mengelola bobot penilaian untuk guru bidang studi
 */

const db = require('../../config/db');

const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT 
            ta.id_tahun_ajaran,
            ta.id_tahun_ajaran_induk,
            ta.semester,
            ta.status_pts,
            ta.status_pas
        FROM tahun_ajaran ta
        WHERE ta.status = 'aktif'
        LIMIT 1
    `);

    return taRows.length > 0 ? taRows[0] : null;
};

exports.getBobotPenilaian = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user.id;

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const status_pts = taAktif.status_pts;

        // Validasi akses guru ke mapel
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
                WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, semesterId]
        );

        if (valid.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini'
            });
        }

        const [komponenList] = await db.execute(`
            SELECT id_komponen, nama_komponen, urutan
            FROM komponen_penilaian
            ORDER BY urutan ASC
        `);

        if (komponenList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Komponen penilaian belum diatur oleh admin.'
            });
        }

        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));

        if (status_pts === 'aktif') {
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

        const [bobot] = await db.execute(
            `SELECT komponen_id, bobot
                FROM konfigurasi_mapel_komponen
                WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1`,
            [mapelId, semesterId]
        );

        const bobotMap = {};
        bobot.forEach(b => {
            bobotMap[b.komponen_id] = parseFloat(b.bobot) || 0;
        });

        const result = komponenList.map(k => ({
            komponen_id: k.id_komponen,
            bobot: bobotMap[k.id_komponen] || 0,
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

        // bobotList harus array
        if (!Array.isArray(bobotList) || bobotList.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data bobot tidak valid.'
            });
        }

        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(500).json({
                success: false,
                message: 'Tidak ada tahun ajaran aktif'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const status_pts = taAktif.status_pts;

        // BLOKIR EDIT SAAT PTS AKTIF
        if (status_pts === 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Bobot penilaian tidak dapat diubah saat periode PTS aktif. Nilai rapor otomatis = nilai PTS.',
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
            if (isNaN(numBobot)) {
                return res.status(400).json({
                    success: false,
                    message: `Bobot untuk komponen ID ${b.komponen_id} harus berupa angka.`
                });
            }

            if (numBobot < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Bobot tidak boleh negatif (komponen ID ${b.komponen_id}: ${numBobot}).`
                });
            }

            if (numBobot > 100) {
                return res.status(400).json({
                    success: false,
                    message: `Bobot tidak boleh lebih dari 100 (komponen ID ${b.komponen_id}: ${numBobot}).`
                });
            }
        }

        // Total bobot harus tepat 100% (lebih ketat)
        const total = bobotList.reduce((sum, b) => sum + (parseFloat(b.bobot) || 0), 0);
        if (Math.abs(total - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Total bobot harus tepat 100%. Saat ini: ${total.toFixed(2)}%`
            });
        }

        // Cek akses guru
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
                WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, semesterId]
        );

        if (valid.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Anda tidak mengajar mata pelajaran ini.'
            });
        }

        // Cek apakah ada komponen penilaian
        const [komponenRows] = await db.execute(
            `SELECT id_komponen FROM komponen_penilaian`
        );
        
        const validKomponenIds = new Set(komponenRows.map(k => k.id_komponen));
        for (const b of bobotList) {
            if (!validKomponenIds.has(b.komponen_id)) {
                return res.status(400).json({
                    success: false,
                    message: `Komponen ID ${b.komponen_id} tidak valid.`
                });
            }
        }

        // Hapus + Insert dalam satu transaction
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Hapus bobot lama
            await connection.execute(
                `DELETE FROM konfigurasi_mapel_komponen 
                    WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
                [mapelId, semesterId]
            );

            // Insert bobot baru
            for (const b of bobotList) {
                await connection.execute(
                    `INSERT INTO konfigurasi_mapel_komponen 
                        (mapel_id, komponen_id, bobot, tahun_ajaran_id, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
                    [mapelId, b.komponen_id, parseFloat(b.bobot), semesterId]
                );
            }

            await connection.commit();
        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        } finally {
            connection.release();
        }

        // Recompute nilai rapor
        await recomputeAllNilaiRapor(mapelId, userId, semesterId);

        res.json({
            success: true,
            message: 'Bobot penilaian berhasil disimpan'
        });

    } catch (err) {
        console.error('Error updateBobotPenilaian:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan bobot: ' + err.message
        });
    }
};

const recomputeAllNilaiRapor = async (mapelId, userId, semesterId) => {
    try {
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            throw new Error('Tahun ajaran aktif tidak ditemukan');
        }

        const { semester } = taAktif;

        let jenisAktif = 'PAS';
        if (taAktif.status_pts === 'aktif') {
            jenisAktif = 'PTS';
        } else if (taAktif.status_pas === 'aktif') {
            jenisAktif = 'PAS';
        }

        const [siswaRows] = await db.execute(`
            SELECT sk.siswa_id, sk.kelas_id
            FROM siswa_kelas sk
            WHERE sk.tahun_ajaran_id = ?  
                AND sk.kelas_id IN (
                    SELECT DISTINCT p.kelas_id
                    FROM pembelajaran p
                    WHERE p.mapel_id = ? 
                        AND p.tahun_ajaran_id = ?
                )
        `, [semesterId, mapelId, semesterId]);

        if (siswaRows.length === 0) {
            console.log(`Tidak ada siswa untuk mapel ${mapelId}.`);
            return;
        }

        const [komponenRows] = await db.execute(`
            SELECT id_komponen, nama_komponen 
            FROM komponen_penilaian 
            ORDER BY urutan
        `);

        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot 
                FROM konfigurasi_mapel_komponen 
                WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelId, semesterId]
        );

        const bobotMap = new Map(bobotRows.map(b => [b.komponen_id, parseFloat(b.bobot) || 0]));
        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        for (const row of siswaRows) {
            const siswaId = row.siswa_id;
            const kelas_id = row.kelas_id;

            const [nilaiDetailRows] = await db.execute(
                    `SELECT komponen_id, nilai 
                    FROM nilai_detail 
                    WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                [siswaId, mapelId, semesterId]
            );

            const nilaiFromDB = {};
            nilaiDetailRows.forEach(r => {
                if (r.nilai != null) nilaiFromDB[r.komponen_id] = Math.floor(parseFloat(r.nilai));
            });

            let nilaiRapor = 0;

            if (jenisAktif === 'PTS') {
                nilaiRapor = ptsKomponen ? nilaiFromDB[ptsKomponen.id_komponen] || 0 : 0;
            } else {
                let nilaiPTSFinal = 0;
                if (ptsKomponen) {
                    const [ptsRow] = await db.execute(
                        `SELECT nilai_rapor 
                            FROM nilai_rapor
                            WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [siswaId, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
                }

                const nilaiUH = uhKomponenIds.map(id => nilaiFromDB[id]).filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                const nilaiPAS = pasKomponen ? nilaiFromDB[pasKomponen.id_komponen] || 0 : 0;

                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
                const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                if (totalBobot > 0) {
                    nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
                } else {
                    nilaiRapor = (rataUH + nilaiPTSFinal + nilaiPAS) / 3;
                }
            }

            nilaiRapor = Math.floor(nilaiRapor);

            const [kategoriRows] = await db.execute(
                `SELECT min_nilai, max_nilai, deskripsi 
                    FROM konfigurasi_nilai_rapor 
                    WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ? 
                    ORDER BY min_nilai DESC`,
                [mapelId, semesterId]
            );

            let deskripsi = 'Belum ada deskripsi';
            for (const k of kategoriRows) {
                if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
                    deskripsi = k.deskripsi;
                    break;
                }
            }

            await db.execute(
                `INSERT INTO nilai_rapor 
                    (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                    nilai_rapor = VALUES(nilai_rapor),
                    deskripsi = VALUES(deskripsi),
                    updated_at = NOW()`,
                [siswaId, mapelId, kelas_id, semesterId, semester, jenisAktif, nilaiRapor, deskripsi, userId]
            );
        }

        console.log(`Berhasil menghitung ulang nilai rapor untuk ${siswaRows.length} siswa di mapel ${mapelId}`);

    } catch (err) {
        console.error('Error recomputeAllNilaiRapor:', err);
        throw err;
    }
};