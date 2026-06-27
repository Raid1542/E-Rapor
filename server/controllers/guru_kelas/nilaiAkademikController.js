/**
 * Nama File: nilaiAkademikController.js
 * Fungsi: Mengelola nilai akademik siswa
 * ✅ FIXED: Semua isMapelWajibGuruKelas pakai semesterId
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
 */
exports.getMapelForGuruKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        console.log('📚 [getMapelForGuruKelas] userId:', userId);
        console.log('📚 [getMapelForGuruKelas] idInduk:', idInduk);
        console.log('📚 [getMapelForGuruKelas] semesterId:', semesterId);

        if (!idInduk || !semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran tidak lengkap'
            });
        }

        const [rows] = await db.execute(`
            SELECT
                mp.id_mata_pelajaran,
                mp.nama_mapel,
                mp.kode_mapel,
                mp.jenis,
                p.user_id AS pengajar_id,
                CASE 
                    WHEN p.user_id = ? AND mp.jenis = 'wajib' THEN TRUE 
                    ELSE FALSE 
                END AS bisa_input
            FROM pembelajaran p
            JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
            JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
            WHERE gk.user_id = ?
            AND gk.tahun_ajaran_id = ?
            AND p.tahun_ajaran_id = ?
            ORDER BY mp.jenis DESC, mp.nama_mapel
        `, [userId, userId, semesterId, semesterId]);

        console.log('📚 Found', rows.length, 'mapel');

        res.json({
            success: true,
            data: {
                wajib: rows.filter(r => r.jenis === 'wajib').map(r => ({
                    mata_pelajaran_id: r.id_mata_pelajaran,
                    nama_mapel: r.nama_mapel,
                    kode_mapel: r.kode_mapel,
                    jenis: r.jenis,
                    bisa_input: Boolean(r.bisa_input),
                })),
                pilihan: rows.filter(r => r.jenis === 'pilihan').map(r => ({
                    mata_pelajaran_id: r.id_mata_pelajaran,
                    nama_mapel: r.nama_mapel,
                    kode_mapel: r.kode_mapel,
                    jenis: r.jenis,
                    bisa_input: false,
                })),
            }
        });
    } catch (err) {
        console.error('❌ Error getMapelForGuruKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar mata pelajaran: ' + err.message
        });
    }
};

/**
 * GET /nilai/:mapelId
 */
exports.getNilaiByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Data konteks penilaian tidak lengkap' });
        }

        // 1. Validasi Kelas Guru
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        const kelas_id = kelasRow[0].kelas_id;

        // 2. Validasi Akses Mapel
        const [mapelDiKelas] = await db.execute(
            `SELECT id FROM pembelajaran 
             WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [kelas_id, mapelId, semesterId]
        );
        if (mapelDiKelas.length === 0) {
            return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });
        }

        const [mapelDetail] = await db.execute(`SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?`, [mapelId]);
        const jenisMapel = mapelDetail[0]?.jenis || 'wajib';
        const bisa_input = jenisMapel === 'wajib';

        const [namaKelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelas_id]);
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        // 3. CEK: Apakah bobot sudah diatur?
        const [bobotCheck] = await db.execute(
            `SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen 
             WHERE mapel_id = ? AND is_active = 1 
             AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, kelas_id]
        );

        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;
        console.log('📊 Bobot sudah diatur:', bobotSudahDiatur);

        // 4. Ambil HANYA Siswa Aktif
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap 
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? 
             AND sk.id_tahun_ajaran_induk = ?
             AND s.status = 'aktif'
             ORDER BY s.nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                siswaList: [],
                komponen: [],
                kelas: kelasNama,
                bisa_input,
                bobot_sudah_diatur: bobotSudahDiatur
            });
        }

        // 5. Ambil Data Pendukung
        const siswaIds = siswaRows.map(s => s.id_siswa);
        const placeholders = siswaIds.map(() => '?').join(',');

        const [nilaiRows] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail 
             WHERE mapel_id = ? AND tahun_ajaran_id = ? 
             AND siswa_id IN (${placeholders})`,
            [mapelId, semesterId, ...siswaIds]
        );

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);
        const [bobotRows] = await db.execute(`
            SELECT komponen_id, bobot, kelas_id 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND is_active = 1
            AND (kelas_id = ? OR kelas_id IS NULL)
            ORDER BY kelas_id DESC
        `, [mapelId, kelas_id]);

        const [kategoriPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor
             WHERE (mapel_id = ? OR mapel_id IS NULL) 
             AND tahun_ajaran_id = ? 
             AND jenis_penilaian = 'PTS'
             AND is_active = 1
             ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        const [kategoriPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor
             WHERE (mapel_id = ? OR mapel_id IS NULL) 
             AND tahun_ajaran_id = ? 
             AND jenis_penilaian = 'PAS'
             AND is_active = 1
             ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        const [allRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, jenis_penilaian FROM nilai_rapor
             WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?
             AND siswa_id IN (${placeholders})`,
            [mapelId, semesterId, semester, ...siswaIds]
        );

        const ptsRaporMap = new Map();
        const pasRaporMap = new Map();
        allRaporRows.forEach(r => {
            if (r.jenis_penilaian === 'PTS') {
                ptsRaporMap.set(r.siswa_id, { nilai: r.nilai_rapor, exists: true });
            }
            if (r.jenis_penilaian === 'PAS') {
                pasRaporMap.set(r.siswa_id, { nilai: r.nilai_rapor, exists: true });
            }
        });

        const nilaiMap = {};
        nilaiRows.forEach(n => {
            if (!nilaiMap[n.siswa_id]) nilaiMap[n.siswa_id] = {};
            nilaiMap[n.siswa_id][n.komponen_id] = n.nilai;
        });

        const bobotMap = new Map();
        bobotRows.forEach(b => {
            if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) {
                bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
            }
        });

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));
        const ptsKomponenId = ptsKomponen?.id_komponen;
        const pasKomponenId = pasKomponen?.id_komponen;

        const siswaList = siswaRows.map(s => {
            const nilai = nilaiMap[s.id_siswa] || {};
            const ptsData = ptsRaporMap.get(s.id_siswa);

            const raporPTS = ptsData?.nilai ?? null;
            const deskripsiPTS = ptsData
                ? getDeskripsiFromKategori(raporPTS, kategoriPTSRows)
                : '';

            const pasData = pasRaporMap.get(s.id_siswa);
            const raporPAS = pasData?.nilai ?? null;
            const deskripsiPAS = pasData
                ? getDeskripsiFromKategori(raporPAS, kategoriPASRows)
                : '';

            return {
                id: s.id_siswa,
                nama: s.nama_lengkap,
                nis: s.nis,
                nisn: s.nisn,
                nilai_rapor_pts: raporPTS,
                deskripsi_pts: deskripsiPTS,
                nilai_rapor_pas: raporPAS,
                deskripsi_pas: deskripsiPAS,
                nilai: { ...nilai },
            };
        });

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            bisa_input,
            bobot_sudah_diatur: bobotSudahDiatur
        });
    } catch (err) {
        console.error('Error getNilaiByMapel:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai: ' + err.message });
    }
};

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
            return res.status(400).json({ success: false, message: 'Data konteks tidak lengkap' });
        }

        console.log(`🔍 [Update Nilai] Siswa: ${siswaId}, Mapel: ${mapelId}, Jenis: ${jenis}`);
        console.log(`🔍 [Update Nilai] Nilai yang diterima:`, nilai);

        const [siswaStatus] = await db.execute(
            `SELECT status FROM siswa WHERE id_siswa = ?`,
            [siswaId]
        );

        if (siswaStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }

        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai tidak dapat diubah.`
            });
        }

        const [mapelCheck] = await db.execute('SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?', [mapelId]);
        const jenisMapel = mapelCheck[0]?.jenis;

        if (jenisMapel === 'pilihan') {
            const [pengajarCheck] = await db.execute(
                'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?',
                [userId, mapelId, semesterId]
            );
            if (pengajarCheck.length === 0) {
                return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan pengajar mapel pilihan ini.' });
            }
        } else {
            // ✅ PERBAIKAN 1: GANTI tahunAjaranIndukId → semesterId
            const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
            if (!isValid) {
                return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya untuk mapel wajib yang Anda kelola.' });
            }
        }

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (gkRows.length === 0) return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan' });
        const kelas_id = gkRows[0].kelas_id;

        const komponenList = await komponenPenilaianModel.getAllKomponen();
        const uhKomponenIds = komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        if (jenis === 'PTS') {
            for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
                const komponenId = parseInt(komponenIdStr, 10);
                const komponen = komponenList.find(k => k.id_komponen === komponenId);

                if (nilaiSiswa == null) continue;

                if (ptsKomponen && komponenId !== ptsKomponen.id_komponen) {
                    return res.status(400).json({
                        success: false,
                        message: `Periode PTS aktif. Hanya nilai ${ptsKomponen.nama_komponen} yang boleh diisi. Komponen "${komponen?.nama_komponen || komponenId}" tidak boleh diubah.`
                    });
                }
            }
        }

        let savedCount = 0;
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);

            if (jenis === 'PAS' && ptsKomponen && komponenId === ptsKomponen.id_komponen) {
                continue;
            }

            if (jenis === 'PTS' && pasKomponen && komponenId === pasKomponen.id_komponen) {
                continue;
            }

            let nilaiBulat = null;
            if (nilaiSiswa != null && nilaiSiswa !== '' && !isNaN(nilaiSiswa)) {
                nilaiBulat = Math.round(parseFloat(nilaiSiswa));
                if (nilaiBulat < 0) nilaiBulat = 0;
                if (nilaiBulat > 100) nilaiBulat = 100;
            }

            await db.execute(
                `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                [siswaId, mapelId, komponenId, nilaiBulat, semesterId, userId]
            );
            savedCount++;
        }

        console.log(`✅ [Save] ${savedCount} komponen berhasil disimpan`);

        const [nilaiDetailRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaId, mapelId, semesterId]
        );

        const nilaiFromDB = {};
        nilaiDetailRows.forEach(row => {
            if (row.nilai != null) nilaiFromDB[row.komponen_id] = Math.round(parseFloat(row.nilai));
        });

        const [bobotRows] = await db.execute(`
            SELECT komponen_id, bobot, kelas_id 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND is_active = 1
            AND (kelas_id = ? OR kelas_id IS NULL)
            ORDER BY kelas_id DESC
        `, [mapelId, kelas_id]);

        const bobotMap = new Map();
        bobotRows.forEach(b => {
            if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) {
                bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
            }
        });

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
            nilaiRapor = Math.round(nilaiRapor) || 0;
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId, semesterId);
        }

        const nilaiRaporBulat = Math.round(nilaiRapor);
        await db.execute(
            `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
            [siswaId, mapelId, kelas_id, semesterId, semester, jenis, nilaiRaporBulat, deskripsi, userId]
        );

        console.log(`✅ [Rapor] Nilai rapor ${jenis}: ${nilaiRaporBulat}`);

        res.json({
            success: true,
            message: `Nilai komponen (${jenis}) berhasil disimpan`,
            nilai_rapor: nilaiRaporBulat,
            deskripsi: deskripsi,
            jenis_penilaian: jenis,
        });
    } catch (err) {
        console.error('Error updateNilaiKomponen:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai komponen', error: err.message });
    }
};

/**
 * POST /nilai
 */
exports.simpanNilai = async (req, res) => {
    const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
    const user_id = req.user.id;
    
    // ✅ PERBAIKAN: Declare semesterId SEBELUM dipakai
    const tahunAjaranIndukId = req.idTahunAjaranInduk;
    const semesterId = req.idSemesterAktif;
    
    try {
        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        }
        if (nilai < 0 || nilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }

        const [siswaStatus] = await db.execute(
            `SELECT status FROM siswa WHERE id_siswa = ?`,
            [siswa_id]
        );

        if (siswaStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }

        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai tidak dapat disimpan.`
            });
        }

        // ✅ PERBAIKAN 2: GANTI req.idTahunAjaranInduk → semesterId
        const isValid = await isMapelWajibGuruKelas(user_id, mapel_id, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        const [pembelajaran] = await db.execute(
            `SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [user_id, mapel_id, semesterId]
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
        console.error('[simpanNilai] Error:', controllerError.message || controllerError);
        return res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai: ' + (controllerError.message || controllerError),
        });
    }
};

/**
 * PUT /nilai-rapor/:mapelId/:siswaId
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

        const [siswaStatus] = await db.execute(
            `SELECT status FROM siswa WHERE id_siswa = ?`,
            [siswaId]
        );

        if (siswaStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }

        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai rapor tidak dapat diubah.`
            });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        // ✅ PERBAIKAN 3: GANTI req.idTahunAjaranInduk → semesterId
        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        if (!tahunAjaranIndukId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan',
            });
        }

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
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

        // ✅ PERBAIKAN 4: GANTI tahunAjaranIndukId → semesterId
        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
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