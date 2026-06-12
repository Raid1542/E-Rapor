/**
 * Nama File: nilaiAkademikController.js
 * Fungsi: Mengelola nilai akademik siswa
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const nilaiModel = require('../../models/guru_kelas/nilaiModel');
const bobotPenilaianModel = require('../../models/guru_kelas/bobotPenilaianModel');
const komponenPenilaianModel = require('../../models/guru_kelas/komponenPenilaianModel');
const konfigurasiNilaiRaporModel = require('../../models/guru_kelas/konfigurasiNilaiRaporModel');
const { isMapelWajibGuruKelas, updateAllNilaiRaporForMapel, getDeskripsiFromKategori } = require('./helpers');

/**
 * GET /mapel
 * Mendapatkan daftar mata pelajaran untuk guru kelas
 */
exports.getMapelForGuruKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;

        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        const [rows] = await db.execute(
            `SELECT
                mp.id_mata_pelajaran,
                mp.nama_mapel,
                mp.jenis,
                p.user_id AS pengajar_id,
                CASE WHEN p.user_id = ? THEN TRUE ELSE FALSE END AS bisa_input
             FROM pembelajaran p
             JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
             JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
             WHERE gk.user_id = ?
             AND p.tahun_ajaran_id = ?
             ORDER BY mp.jenis, mp.nama_mapel`,
            [userId, userId, tahunAjaranIndukId]
        );

        res.json({
            success: true,
            wajib: rows.filter(r => r.jenis === 'wajib').map(r => ({
                mata_pelajaran_id: r.id_mata_pelajaran,
                nama_mapel: r.nama_mapel,
                jenis: r.jenis,
                bisa_input: Boolean(r.bisa_input),
            })),
            pilihan: rows.filter(r => r.jenis === 'pilihan').map(r => ({
                mata_pelajaran_id: r.id_mata_pelajaran,
                nama_mapel: r.nama_mapel,
                jenis: r.jenis,
                bisa_input: Boolean(r.bisa_input),
            })),
        });
    } catch (err) {
        console.error('Error getMapelForGuruKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar mata pelajaran' });
    }
};

/**
 * GET /nilai/:mapelId
 * Mendapatkan nilai akademik per mata pelajaran untuk seluruh siswa di kelas
 */
exports.getNilaiByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: Anda tidak memiliki kelas aktif',
            });
        }
        const kelas_id = kelasRow[0].kelas_id;

        const [mapelDiKelas] = await db.execute(
            `SELECT id FROM pembelajaran WHERE kelas_id = ? AND mata_pelajaran_id = ? AND tahun_ajaran_id = ?`,
            [kelas_id, mapelId, tahunAjaranIndukId]
        );
        if (mapelDiKelas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: Mata pelajaran ini tidak diajarkan di kelas Anda',
            });
        }

        const [mapelDetail] = await db.execute(
            `SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
            [mapelId]
        );
        const jenisMapel = mapelDetail[0]?.jenis || 'wajib';
        const bisa_input = jenisMapel === 'wajib';

        const [namaKelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelas_id]);
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        const [siswaRows] = await db.execute(
            `SELECT id_siswa, nis, nisn, nama_lengkap
             FROM siswa
             WHERE id_siswa IN (
                SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND tahun_ajaran_id = ?
             )
             ORDER BY nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                siswaList: [],
                komponen: [],
                kelas: kelasNama,
                bisa_input,
            });
        }

        const [nilaiRows] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai
             FROM nilai_detail
             WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelId, semesterId]
        );

        const [komponenRows] = await db.execute(`
            SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
        `);

        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelId, semesterId]
        );

        const [kategoriRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi
             FROM konfigurasi_nilai_rapor
             WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ?
             ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        const nilaiMap = {};
        nilaiRows.forEach(n => {
            if (!nilaiMap[n.siswa_id]) nilaiMap[n.siswa_id] = {};
            nilaiMap[n.siswa_id][n.komponen_id] = n.nilai;
        });

        const bobotMap = new Map();
        bobotRows.forEach(b => {
            bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
        });

        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));
        const ptsKomponenId = ptsKomponen?.id_komponen;
        const pasKomponenId = pasKomponen?.id_komponen;

        const siswaList = await Promise.all(siswaRows.map(async (s) => {
            const nilai = nilaiMap[s.id_siswa] || {};
            let nilaiRaporFinal = 0;
            let deskripsiFinal = '';

            if (jenis_penilaian === 'PTS') {
                const nilaiPTS = ptsKomponenId ? (nilai[ptsKomponenId] || 0) : 0;
                nilaiRaporFinal = nilaiPTS;
                deskripsiFinal = getDeskripsiFromKategori(nilaiRaporFinal, kategoriRows);
            } else {
                const nilaiUH = uhKomponenIds
                    .map(id => nilai[id])
                    .filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                const nilaiPAS = pasKomponenId ? (nilai[pasKomponenId] || 0) : 0;

                let nilaiPTSFinal = 0;
                if (ptsKomponenId) {
                    const [ptsRow] = await db.execute(
                        `SELECT nilai_rapor FROM nilai_rapor
                         WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
                         AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [s.id_siswa, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
                }

                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponenId ? bobotMap.get(ptsKomponenId) || 0 : 0;
                const bobotPAS = pasKomponenId ? bobotMap.get(pasKomponenId) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                if (totalBobot > 0) {
                    nilaiRaporFinal = (
                        rataUH * totalBobotUH +
                        nilaiPTSFinal * bobotPTS +
                        nilaiPAS * bobotPAS
                    ) / totalBobot;
                } else {
                    nilaiRaporFinal = (rataUH + nilaiPTSFinal + nilaiPAS) / 3;
                }
                nilaiRaporFinal = Math.floor(nilaiRaporFinal);
                deskripsiFinal = getDeskripsiFromKategori(nilaiRaporFinal, kategoriRows);
            }

            return {
                id: s.id_siswa,
                nama: s.nama_lengkap,
                nis: s.nis,
                nisn: s.nisn,
                nilai_rapor: nilaiRaporFinal,
                deskripsi: deskripsiFinal,
                nilai: { ...nilai },
            };
        }));

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            bisa_input,
        });
    } catch (err) {
        console.error('Error getNilaiByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai' });
    }
};

/**
 * PUT /nilai-komponen/:mapelId/:siswaId
 * Memperbarui nilai komponen penilaian dan menghitung nilai rapor otomatis
 */
exports.updateNilaiKomponen = async (req, res) => {
    try {
        const { mapelId, siswaId } = req.params;
        const { nilai } = req.body;
        const userId = req.user.id;
        const jenis = req.jenis_penilaian;

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const isValid = await isMapelWajibGuruKelas(userId, mapelId, tahunAjaranIndukId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );
        if (gkRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan' });
        }
        const { kelas_id } = gkRows[0];

        const komponenList = await komponenPenilaianModel.getAllKomponen();
        const uhKomponenIds = komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        if (jenis === 'PTS') {
            for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
                const komponenId = parseInt(komponenIdStr, 10);
                if (komponenId !== ptsKomponen?.id_komponen && nilaiSiswa != null) {
                    const namaKomponen = komponenList.find(k => k.id_komponen === komponenId)?.nama_komponen || komponenIdStr;
                    return res.status(400).json({
                        success: false,
                        message: `Periode PTS aktif. Hanya nilai ${ptsKomponen?.nama_komponen || 'PTS'} yang boleh diisi.`,
                    });
                }
            }
            if (ptsKomponen && (nilai[ptsKomponen.id_komponen] == null || nilai[ptsKomponen.id_komponen] === '')) {
                return res.status(400).json({ success: false, message: `Nilai ${ptsKomponen.nama_komponen} wajib diisi di periode PTS.` });
            }
        }

        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            let nilaiBulat = null;
            if (nilaiSiswa != null && nilaiSiswa !== '' && !isNaN(nilaiSiswa)) {
                nilaiBulat = Math.floor(parseFloat(nilaiSiswa));
                if (nilaiBulat < 0) nilaiBulat = 0;
                if (nilaiBulat > 100) nilaiBulat = 100;
            }
            await db.execute(
                `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                [siswaId, mapelId, komponenId, nilaiBulat, semesterId, userId]
            );
        }

        const [nilaiDetailRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaId, mapelId, semesterId]
        );

        const nilaiFromDB = {};
        nilaiDetailRows.forEach(row => {
            if (row.nilai != null) nilaiFromDB[row.komponen_id] = Math.floor(parseFloat(row.nilai));
        });

        const bobotList = await bobotPenilaianModel.getBobotByMapel(mapelId, semesterId);
        const bobotMap = new Map();
        bobotList.forEach(b => bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0));

        let nilaiRapor = 0;
        let deskripsi = '';

        if (jenis === 'PTS') {
            const nilaiPTS = ptsKomponen ? nilaiFromDB[ptsKomponen.id_komponen] || 0 : 0;
            nilaiRapor = nilaiPTS;
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId, semesterId);
        } else if (jenis === 'PAS') {
            let nilaiPTSFinal = 0;
            if (ptsKomponen) {
                const [ptsRow] = await db.execute(
                    `SELECT nilai_rapor FROM nilai_rapor
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
                nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTSFinal * bobotPTS) + (nilaiPAS * bobotPAS)) / totalBobot;
            }
            nilaiRapor = Math.floor(nilaiRapor) || 0;
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId, semesterId);
        }

        const nilaiRaporBulat = Math.floor(nilaiRapor);
        await db.execute(
            `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
            [siswaId, mapelId, kelas_id, semesterId, semester, jenis, nilaiRaporBulat, deskripsi, userId]
        );

        res.json({
            success: true,
            message: `Nilai komponen (${jenis}) berhasil disimpan`,
            nilai_rapor: nilaiRaporBulat,
            deskripsi: deskripsi,
            jenis_penilaian: jenis,
        });
    } catch (err) {
        console.error(' Error updateNilaiKomponen:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai komponen', error: err.message });
    }
};

/**
 * POST /nilai
 * Menyimpan nilai detail (UH, PTS, PAS) untuk suatu komponen
 */
exports.simpanNilai = async (req, res) => {
    const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
    const user_id = req.user.id;
    try {
        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        }
        if (nilai < 0 || nilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }

        const isValid = await isMapelWajibGuruKelas(user_id, mapel_id, req.idTahunAjaranInduk);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        const [pembelajaran] = await db.execute(
            'SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mata_pelajaran_id = ? AND tahun_ajaran_id = ?',
            [user_id, mapel_id, tahunAjaranIndukId]
        );
        if (!pembelajaran[0]) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mapel ini' });
        }
        const kelas_id = pembelajaran[0].kelas_id;

        const saved = await nilaiModel.simpanNilaiDetail({
            siswa_id,
            mapel_id,
            komponen_id,
            nilai,
            kelas_id,
            tahun_ajaran_id: semesterId,
            user_id,
        });

        return res.status(200).json({
            success: true,
            message: 'Nilai berhasil disimpan',
            data: saved,
        });
    } catch (controllerError) {
        console.error('[simpanNilai] Error di controller:', controllerError.message || controllerError);
        return res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai: ' + (controllerError.message || controllerError),
        });
    }
};

/**
 * PUT /nilai-rapor/:mapelId/:siswaId
 * Memperbarui nilai rapor akhir secara manual oleh guru kelas
 */
exports.updateNilaiRapor = async (req, res) => {
    const { mapelId, siswaId } = req.params;
    const { nilai_rapor, deskripsi } = req.body;
    const userId = req.user.id;
    try {
        const nilaiRaporInt = parseInt(nilai_rapor);
        if (isNaN(nilaiRaporInt) || nilaiRaporInt < 0 || nilaiRaporInt > 100) {
            return res.status(400).json({
                success: false,
                message: 'Nilai rapor harus berupa angka bulat antara 0–100',
            });
        }

        const isValid = await isMapelWajibGuruKelas(userId, mapelId, req.idTahunAjaranInduk);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const { semester, jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan',
            });
        }

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );
        if (gkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan',
            });
        }
        const { kelas_id } = gkRows[0];

        await db.execute(
            `INSERT INTO nilai_rapor
             (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
             nilai_rapor = VALUES(nilai_rapor),
             deskripsi = VALUES(deskripsi),
             updated_at = NOW()`,
            [siswaId, mapelId, kelas_id, tahunAjaranIndukId, semester, jenis_penilaian || 'PAS', nilaiRaporInt, deskripsi || '', userId]
        );

        res.json({
            success: true,
            message: 'Nilai rapor berhasil diperbarui',
            data: {
                siswa_id: siswaId,
                mapel_id: mapelId,
                nilai_rapor: nilaiRaporInt,
                deskripsi: deskripsi || '',
            },
        });
    } catch (err) {
        console.error('Error updateNilaiRapor:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui nilai rapor',
        });
    }
};

/**
 * GET /nilai-ekspor/:mapelId
 * Mengekspor data nilai ke format Excel (XLSX)
 */
exports.eksporNilaiExcel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Tidak terautentikasi' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        const isValid = await isMapelWajibGuruKelas(userId, mapelId, tahunAjaranIndukId);
        if (!isValid) {
            return res.status(403).json({
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, tahunAjaranIndukId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({ message: 'Anda tidak memiliki kelas aktif' });
        }
        const { kelas_id } = kelasRow[0];

        const [mapelRows] = await db.execute(
            `SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
            [mapelId]
        );
        if (mapelRows.length === 0) {
            return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });
        }
        const namaMapel = mapelRows[0].nama_mapel;

        const nilaiData = await nilaiModel.getNilaiByKelasMapel(kelas_id, mapelId, semesterId);
        const [komponenRows] = await db.execute(`
            SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
        `);

        const siswaMap = {};
        nilaiData.forEach(item => {
            if (!siswaMap[item.id_siswa]) {
                siswaMap[item.id_siswa] = {
                    id_siswa: item.id_siswa,
                    nama: item.nama_lengkap,
                    nis: item.nis,
                    nisn: item.nisn,
                    nilai_rapor: item.nilai_rapor || 0,
                };
            }
            if (item.komponen_id) {
                siswaMap[item.id_siswa][`nilai_${item.komponen_id}`] = item.nilai;
            }
        });

        const siswaList = Object.values(siswaMap).sort((a, b) => b.nilai_rapor - a.nilai_rapor);
        siswaList.forEach((siswa, index) => {
            siswa.ranking = index + 1;
        });

        const headers = ['No', 'Nama Siswa', 'NIS', 'NISN'];
        const komponenHeaders = komponenRows.map(k => k.nama_komponen);
        const finalHeaders = [...headers, ...komponenHeaders, 'Nilai Rapor', 'Ranking'];

        const rows = siswaList.map((siswa, index) => {
            const rowData = [index + 1, siswa.nama, siswa.nis, siswa.nisn || ''];
            komponenRows.forEach(komp => {
                const nilai = siswa[`nilai_${komp.id_komponen}`];
                rowData.push(nilai !== undefined && nilai !== null ? nilai : '-');
            });
            rowData.push(siswa.nilai_rapor.toFixed(2));
            rowData.push(siswa.ranking);
            return rowData;
        });

        const worksheet = XLSX.utils.aoa_to_sheet([finalHeaders, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `Rekap_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        console.error('Error ekspor nilai ke Excel:', err);
        res.status(500).json({ message: 'Gagal mengekspor data ke Excel' });
    }
};