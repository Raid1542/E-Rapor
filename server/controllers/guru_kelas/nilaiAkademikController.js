/**
 * Nama File: nilaiAkademikController.js
 * Fungsi: Controller untuk manajemen nilai akademik siswa (mapel wajib).
 *         Menangani input nilai komponen, perhitungan nilai rapor otomatis,
 *         ekspor data ke Excel, dan IMPORT NILAI DARI EXCEL.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 * Update: 7 Juli 2026 - Tambah fitur import nilai dari Excel + Validasi NISN & Nama
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const nilaiModel = require('../../models/guru_kelas/nilaiModel');
const bobotPenilaianModel = require('../../models/guru_kelas/bobotPenilaianModel');
const komponenPenilaianModel = require('../../models/guru_kelas/komponenPenilaianModel');
const konfigurasiNilaiRaporModel = require('../../models/guru_kelas/konfigurasiNilaiRaporModel');
const { isMapelWajibGuruKelas, updateAllNilaiRaporForMapel, getDeskripsiFromKategori } = require('./helpers');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION - Hitung Kesamaan String (Levenshtein Distance)
// ═════════════════════════════════════════════════════════════════════════════

const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - (matrix[len1][len2] / maxLen);
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET MAPEL UNTUK GURU KELAS
// ═════════════════════════════════════════════════════════════════════════════

exports.getMapelForGuruKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!idInduk || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak lengkap' });
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
        console.error('Error getMapelForGuruKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar mata pelajaran: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET NILAI BY MAPEL
// ═════════════════════════════════════════════════════════════════════════════

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

        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        const kelas_id = kelasRow[0].kelas_id;

        const [mapelDiKelas] = await db.execute(
            `SELECT id FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
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

        const [bobotCheck] = await db.execute(
            `SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen 
             WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, kelas_id]
        );
        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap 
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
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

        const siswaIds = siswaRows.map(s => s.id_siswa);
        const placeholders = siswaIds.map(() => '?').join(',');

        const [nilaiRows] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail 
             WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
            [mapelId, semesterId, ...siswaIds]
        );

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);
        const [bobotRows] = await db.execute(`
            SELECT komponen_id, bobot, kelas_id 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)
            ORDER BY kelas_id DESC
        `, [mapelId, kelas_id]);

        const [kategoriPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor
             WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND is_active = 1
             ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        const [kategoriPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor
             WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND is_active = 1
             ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        const [allRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, jenis_penilaian FROM nilai_rapor
             WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND siswa_id IN (${placeholders})`,
            [mapelId, semesterId, semester, ...siswaIds]
        );

        const ptsRaporMap = new Map();
        const pasRaporMap = new Map();
        allRaporRows.forEach(r => {
            if (r.jenis_penilaian === 'PTS') ptsRaporMap.set(r.siswa_id, { nilai: r.nilai_rapor, exists: true });
            if (r.jenis_penilaian === 'PAS') pasRaporMap.set(r.siswa_id, { nilai: r.nilai_rapor, exists: true });
        });

        const nilaiMap = {};
        nilaiRows.forEach(n => {
            if (!nilaiMap[n.siswa_id]) nilaiMap[n.siswa_id] = {};
            nilaiMap[n.siswa_id][n.komponen_id] = n.nilai;
        });

        const siswaList = siswaRows.map(s => {
            const nilai = nilaiMap[s.id_siswa] || {};
            const ptsData = ptsRaporMap.get(s.id_siswa);
            const raporPTS = ptsData?.nilai ?? null;
            const deskripsiPTS = ptsData ? getDeskripsiFromKategori(raporPTS, kategoriPTSRows) : '';

            const pasData = pasRaporMap.get(s.id_siswa);
            const raporPAS = pasData?.nilai ?? null;
            const deskripsiPAS = pasData ? getDeskripsiFromKategori(raporPAS, kategoriPASRows) : '';

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

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPDATE NILAI KOMPONEN
// ═════════════════════════════════════════════════════════════════════════════

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

        const [siswaStatus] = await db.execute(`SELECT status FROM siswa WHERE id_siswa = ?`, [siswaId]);
        if (siswaStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }
        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai tidak dapat diubah.` });
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

            if (jenis === 'PAS' && ptsKomponen && komponenId === ptsKomponen.id_komponen) continue;
            if (jenis === 'PTS' && pasKomponen && komponenId === pasKomponen.id_komponen) continue;

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
            WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)
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
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId, semesterId, 'PTS');
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
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId, semesterId, 'PAS');
        }

        const nilaiRaporBulat = Math.round(nilaiRapor);
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
        console.error('Error updateNilaiKomponen:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai komponen', error: err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. SIMPAN NILAI (SINGLE KOMPONEN) - LEGACY
// ═════════════════════════════════════════════════════════════════════════════

exports.simpanNilai = async (req, res) => {
    const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
    const user_id = req.user.id;
    const tahunAjaranIndukId = req.idTahunAjaranInduk;
    const semesterId = req.idSemesterAktif;

    try {
        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        }
        if (nilai < 0 || nilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }

        const [siswaStatus] = await db.execute(`SELECT status FROM siswa WHERE id_siswa = ?`, [siswa_id]);
        if (siswaStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }
        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai tidak dapat disimpan.` });
        }

        const isValid = await isMapelWajibGuruKelas(user_id, mapel_id, semesterId);
        if (!isValid) {
            return res.status(403).json({ success: false, message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola' });
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

        return res.status(200).json({ success: true, message: 'Nilai berhasil disimpan', data: saved });
    } catch (controllerError) {
        console.error('[simpanNilai] Error:', controllerError.message || controllerError);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + (controllerError.message || controllerError) });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. UPDATE NILAI RAPOR
// ═════════════════════════════════════════════════════════════════════════════

exports.updateNilaiRapor = async (req, res) => {
    const { mapelId, siswaId } = req.params;
    const { nilai_rapor, deskripsi } = req.body;
    const userId = req.user.id;

    try {
        const nilaiRaporInt = parseInt(nilai_rapor);
        if (isNaN(nilaiRaporInt) || nilaiRaporInt < 0 || nilaiRaporInt > 100) {
            return res.status(400).json({ success: false, message: 'Nilai rapor harus berupa angka bulat antara 0–100' });
        }

        const [siswaStatus] = await db.execute(`SELECT status FROM siswa WHERE id_siswa = ?`, [siswaId]);
        if (siswaStatus.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }
        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai rapor tidak dapat diubah.` });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({ success: false, message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola' });
        }

        if (!tahunAjaranIndukId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (gkRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan' });
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
            data: { siswa_id: siswaId, mapel_id: mapelId, nilai_rapor: nilaiRaporInt, deskripsi: deskripsi || '' },
        });
    } catch (err) {
        console.error('Error updateNilaiRapor:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui nilai rapor' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. EKSPOR NILAI KE EXCEL
// ═════════════════════════════════════════════════════════════════════════════

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

        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({ message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola' });
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
        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);

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
        siswaList.forEach((siswa, index) => { siswa.ranking = index + 1; });

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

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 7. DOWNLOAD TEMPLATE IMPORT NILAI (SIMPLE - LANGSUNG KOLOM)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/nilai/import-template?mapel_id=X
 * Template Excel sederhana - langsung kolom header tanpa title/info
 */
exports.downloadTemplateNilai = async (req, res) => {
    try {
        const { mapel_id } = req.query;
        const userId = req.user.id;

        if (!mapel_id || isNaN(Number(mapel_id))) {
            return res.status(400).json({ success: false, message: 'mapel_id wajib diisi' });
        }

        const mapelId = Number(mapel_id);
        const semesterId = req.idSemesterAktif;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!semesterId || !tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        // ─── Ambil Data Kelas ─────────────────────────────────────────────
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelas_id = kelasRow[0].kelas_id;

        // ─── Validasi Akses Mapel ─────────────────────────────────────────
        const [mapelCheck] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [kelas_id, mapelId, semesterId]
        );
        if (mapelCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });
        }

        // ─── Ambil Nama Mapel ─────────────────────────────────────────────
        const [mapelRow] = await db.execute(
            `SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
            [mapelId]
        );
        const namaMapel = mapelRow[0]?.nama_mapel || 'Mata Pelajaran';

        // ─── Ambil Daftar Siswa ───────────────────────────────────────────
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
             ORDER BY s.nama_lengkap ASC`,
            [kelas_id, tahunAjaranIndukId]
        );

        // ─── Ambil Komponen Penilaian ─────────────────────────────────────
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`
        );

        // ─── Ambil Nama Kelas ─────────────────────────────────────────────
        const [kelasNamaRow] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelas_id]
        );
        const namaKelas = kelasNamaRow[0]?.nama_kelas || 'Kelas';

        // ═══════════════════════════════════════════════════════════════════
        // BUILD EXCEL WORKBOOK
        // ═══════════════════════════════════════════════════════════════════

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        // ─── Warna Brand ──────────────────────────────────────────────────
        const colors = {
            primary: 'FFE8690A',      // Orange brand
            primaryDark: 'FFC95B08',  // Dark orange
            blue: 'FF4A90E2',         // Blue for identity
            white: 'FFFFFFFF',
            black: 'FF000000',
            gray: 'FF666666',
            lightOrange: 'FFFFF5E6',  // Light orange bg
            lightBlue: 'FFE8F4FD',    // Light blue bg
            border: 'FFCCCCCC'
        };

        // ─── Style Definitions ────────────────────────────────────────────
        const thinBorder = {
            top: { style: 'thin', color: { argb: colors.border } },
            left: { style: 'thin', color: { argb: colors.border } },
            bottom: { style: 'thin', color: { argb: colors.border } },
            right: { style: 'thin', color: { argb: colors.border } }
        };

        // ═══════════════════════════════════════════════════════════════════
        // SHEET 1: TEMPLATE INPUT NILAI (LANGSUNG KOLOM)
        // ═══════════════════════════════════════════════════════════════════

        const worksheet = workbook.addWorksheet('Template Input Nilai');

        // ─── Row 1: Column Headers (LANGSUNG DI ROW 1) ────────────────────
        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', ...komponenRows.map(k => k.nama_komponen)];
        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;

        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.white } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = thinBorder;

            // Warna berbeda: Biru untuk identitas, Orange untuk nilai
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colIdx < 4 ? colors.blue : colors.primary }
            };
        });

        // ─── Row 2+: Data Siswa ───────────────────────────────────────────
        siswaRows.forEach((siswa, index) => {
            const rowNum = 2 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 22;

            const isEvenRow = index % 2 === 0;

            // Kolom No
            const noCell = dataRow.getCell(1);
            noCell.value = index + 1;
            noCell.font = { name: 'Calibri', size: 11, bold: true };
            noCell.alignment = { vertical: 'middle', horizontal: 'center' };
            noCell.border = thinBorder;
            noCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white }
            };

            // Kolom NIS
            const nisCell = dataRow.getCell(2);
            nisCell.value = siswa.nis || '';
            nisCell.font = { name: 'Calibri', size: 11 };
            nisCell.alignment = { vertical: 'middle', horizontal: 'center' };
            nisCell.border = thinBorder;
            nisCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white }
            };

            // Kolom NISN
            const nisnCell = dataRow.getCell(3);
            nisnCell.value = siswa.nisn || '';
            nisnCell.font = { name: 'Calibri', size: 11 };
            nisnCell.alignment = { vertical: 'middle', horizontal: 'center' };
            nisnCell.border = thinBorder;
            nisnCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white }
            };

            // Kolom Nama Siswa
            const namaCell = dataRow.getCell(4);
            namaCell.value = siswa.nama_lengkap || '';
            namaCell.font = { name: 'Calibri', size: 11, bold: true };
            namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
            namaCell.border = thinBorder;
            namaCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white }
            };

            // Kolom Nilai (kosong, siap diisi)
            komponenRows.forEach((komp, kompIdx) => {
                const cell = dataRow.getCell(5 + kompIdx);
                cell.value = '';
                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = thinBorder;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? colors.lightOrange : colors.white }
                };

                // ✅ DATA VALIDATION: Hanya angka 0-100
                cell.dataValidation = {
                    type: 'whole',
                    operator: 'between',
                    formulae: [0, 100],
                    showErrorMessage: true,
                    errorTitle: 'Nilai Tidak Valid',
                    error: 'Nilai harus berupa angka antara 0 sampai 100',
                    showInputMessage: true,
                    promptTitle: 'Input Nilai',
                    prompt: 'Masukkan nilai antara 0-100'
                };
            });
        });

        // ─── Pesan Jika Tidak Ada Siswa ───────────────────────────────────
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A2:H2');
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: colors.gray } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightOrange } };
            emptyCell.border = thinBorder;
        }

        // ─── Set Column Width ─────────────────────────────────────────────
        worksheet.columns = [
            { width: 6 },   // No
            { width: 15 },  // NIS
            { width: 15 },  // NISN
            { width: 30 },  // Nama Siswa
            ...komponenRows.map(() => ({ width: 12 })) // Komponen nilai
        ];

        // ─── Freeze Header Row (Row 1) ────────────────────────────────────
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // ═══════════════════════════════════════════════════════════════════
        // SHEET 2: PETUNJUK (SIMPLE)
        // ═══════════════════════════════════════════════════════════════════

        const petunjukSheet = workbook.addWorksheet('Petunjuk');
        petunjukSheet.columns = [{ width: 90 }];

        const petunjukContent = [
            { text: 'PETUNJUK PENGISIAN TEMPLATE', bold: true, size: 14, color: colors.primary },
            { text: '' },
            { text: `📚 ${namaMapel}  |  🏫 ${namaKelas}  |  📝 ${jenis_penilaian || 'PTS'}  |  👥 ${siswaRows.length} siswa`, size: 11, color: colors.primaryDark },
            { text: '' },
            { text: 'ATURAN PENTING:', bold: true, size: 11 },
            { text: '1. JANGAN mengubah kolom No, NIS, NISN, dan Nama Siswa' },
            { text: '2. Isi nilai pada kolom komponen (UH1-5, PTS, PAS) dengan angka 0-100' },
            { text: '3. Kosongkan sel jika nilai belum ada/belum diinput' },
            { text: '' },
            { text: `CATATAN: Saat ini periode ${jenis_penilaian || 'PTS'} sedang aktif.`, bold: true, size: 11, color: colors.primaryDark },
            {
                text: jenis_penilaian === 'PTS'
                    ? '→ Hanya kolom PTS yang akan diimport (UH dan PAS diabaikan)'
                    : '→ Hanya kolom UH dan PAS yang akan diimport (PTS diabaikan)'
            },
            { text: '' },
            { text: 'CARA IMPORT:', bold: true, size: 11 },
            { text: '1. Isi template ini dengan nilai siswa' },
            { text: '2. Simpan file (jangan ubah format .xlsx)' },
            { text: '3. Upload kembali melalui menu "Import Nilai"' },
            { text: '' },
            { text: 'E-Rapor SDIT Ulil Albab Batam © 2026', size: 9, color: colors.gray }
        ];

        petunjukContent.forEach((item, idx) => {
            const cell = petunjukSheet.getCell(`A${idx + 1}`);
            cell.value = item.text;
            cell.font = {
                name: 'Calibri',
                size: item.size || 11,
                bold: item.bold || false,
                color: { argb: item.color || colors.black }
            };
            cell.alignment = { vertical: 'middle' };
            petunjukSheet.getRow(idx + 1).height = item.bold ? 22 : 18;
        });

        // ═══════════════════════════════════════════════════════════════════
        // GENERATE & SEND
        // ═══════════════════════════════════════════════════════════════════

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}_${namaKelas.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);

    } catch (err) {
        console.error('Error downloadTemplateNilai:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 8. IMPORT NILAI DARI EXCEL (DENGAN VALIDASI KETAT & NOTIFIKASI JELAS)
// ═════════════════════════════════════════════════════════════════════════════

exports.importNilaiExcel = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diupload' });
        }

        const { mapel_id } = req.body;
        const userId = req.user.id;

        if (!mapel_id || isNaN(Number(mapel_id))) {
            return res.status(400).json({ success: false, message: 'mapel_id wajib diisi' });
        }

        const mapelId = Number(mapel_id);
        const semesterId = req.idSemesterAktif;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!semesterId || !tahunAjaranIndukId || !semester || !jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Data konteks penilaian tidak lengkap' });
        }

        // ─── Validasi Akses Guru ─────────────────────────────────────────
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelas_id = kelasRow[0].kelas_id;

        const [mapelCheck] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [kelas_id, mapelId, semesterId]
        );
        if (mapelCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });
        }

        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: Import nilai hanya untuk mata pelajaran wajib yang Anda kelola'
            });
        }

        // ─── Baca File Excel ─────────────────────────────────────────────
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong atau format tidak valid.'
            });
        }

        // ─── Cari Header Row ─────────────────────────────────────────────
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i].map(c => String(c).trim().toLowerCase());
            if (row.includes('nis') && row.some(c => c.includes('nama'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".'
            });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;

        // ─── Validasi Kolom Wajib ────────────────────────────────────────
        const requiredColumns = ['NIS', 'Nama Siswa'];
        const missingColumns = requiredColumns.filter(col =>
            !headers.some(h => h.toLowerCase() === col.toLowerCase())
        );

        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`
            });
        }

        const findColIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');

        // ─── Ambil Komponen dari Header ──────────────────────────────────
        const komponenHeaders = headers.slice(4);
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`
        );

        const komponenMap = {};
        komponenRows.forEach(k => {
            komponenMap[k.nama_komponen.toUpperCase().trim()] = k.id_komponen;
        });

        const komponenValid = [];
        const komponenInvalid = []; // 🆕 BARU: Track kolom yang tidak dikenali
        komponenHeaders.forEach(header => {
            const headerUpper = header.toUpperCase().trim();
            if (komponenMap[headerUpper]) {
                komponenValid.push({ header, id: komponenMap[headerUpper] });
            } else {
                komponenInvalid.push(header); // 🆕 BARU
            }
        });

        if (komponenValid.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada kolom komponen penilaian yang valid.'
            });
        }

        // ─── Filter Komponen Berdasarkan Periode ─────────────────────────
        const [komponenList] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );
        const uhKomponenIds = komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        const komponenBolehUpdate = [];
        if (jenis_penilaian === 'PTS') {
            if (ptsKomponen) {
                komponenValid.forEach(kv => {
                    if (kv.id === ptsKomponen.id_komponen) komponenBolehUpdate.push(kv);
                });
            }
        } else if (jenis_penilaian === 'PAS') {
            komponenValid.forEach(kv => {
                if (uhKomponenIds.includes(kv.id) || (pasKomponen && kv.id === pasKomponen.id_komponen)) {
                    komponenBolehUpdate.push(kv);
                }
            });
        }

        if (komponenBolehUpdate.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Tidak ada komponen yang valid untuk periode ${jenis_penilaian}.`
            });
        }

        // 🆕 BARU: Identifikasi kolom yang akan diabaikan karena periode
        const komponenDiabaikan = komponenValid.filter(kv =>
            !komponenBolehUpdate.find(kbu => kbu.id === kv.id)
        );

        // ─── Ambil Data Siswa ────────────────────────────────────────────
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`,
            [kelas_id, tahunAjaranIndukId]
        );

        const siswaMapByNIS = {};
        siswaRows.forEach(s => {
            if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s;
        });

        // ─── Proses Data per Baris ───────────────────────────────────────
        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;

        // 🆕 BARU: Warning untuk kolom yang diabaikan karena periode
        if (komponenDiabaikan.length > 0) {
            warnings.push({
                row: 0,
                message: `⚠️ Kolom [${komponenDiabaikan.map(kv => kv.header).join(', ')}] diabaikan karena periode ${jenis_penilaian} sedang aktif. Hanya kolom [${komponenBolehUpdate.map(kv => kv.header).join(', ')}] yang akan diimport.`
            });
        }

        // 🆕 BARU: Warning untuk kolom yang tidak dikenali
        if (komponenInvalid.length > 0) {
            warnings.push({
                row: 0,
                message: `⚠️ Kolom [${komponenInvalid.join(', ')}] tidak dikenali sebagai komponen penilaian dan akan diabaikan.`
            });
        }

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const namaSiswa = String(row[idxNama] || '').trim();

            if (!nis) {
                if (namaSiswa) {
                    warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS kosong untuk "${namaSiswa}"` });
                }
                skippedCount++;
                continue;
            }

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan`
                });
                skippedCount++;
                continue;
            }

            // Validasi NISN
            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"`
                    });
                    skippedCount++;
                    continue;
                }
            }

            // Validasi Nama
            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < 0.7) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"`
                        });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.`
                        });
                    }
                }
            }

            const siswaId = siswa.id_siswa;
            let rowSavedCount = 0;
            let rowHasError = false;

            // 🆕 BARU: Validasi SEMUA kolom komponen (termasuk yang diabaikan)
            for (const kv of komponenValid) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-') continue;

                const nilai = parseFloat(nilaiStr);

                // Validasi angka
                if (isNaN(nilai)) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" bukan angka yang valid`
                    });
                    rowHasError = true;
                    continue;
                }

                // Validasi range 0-100
                if (nilai < 0 || nilai > 100) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": Nilai ${nilai} di luar rentang 0-100`
                    });
                    rowHasError = true;
                    continue;
                }
            }

            // Proses hanya kolom yang boleh diupdate
            for (const kv of komponenBolehUpdate) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-') continue;

                const nilai = parseFloat(nilaiStr);
                if (isNaN(nilai) || nilai < 0 || nilai > 100) continue; // Sudah divalidasi di atas

                const nilaiBulat = Math.round(nilai);
                await connection.execute(
                    `INSERT INTO nilai_detail 
                     (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                    [siswaId, mapelId, kv.id, nilaiBulat, semesterId, userId]
                );
                rowSavedCount++;
                totalNilaiDisimpan++;
            }

            if (rowSavedCount > 0) successCount++;
            else if (rowHasError) skippedCount++;
            else skippedCount++;
        }

        // ─── Recompute Nilai Rapor ───────────────────────────────────────
        if (successCount > 0) {
            try {
                await updateAllNilaiRaporForMapel(mapelId, userId, req);
            } catch (recalcErr) {
                console.error('Error hitung ulang nilai rapor:', recalcErr);
                warnings.push({
                    row: 0,
                    message: '⚠️ Gagal menghitung ulang nilai rapor otomatis. Silakan refresh halaman.'
                });
            }
        }

        await connection.commit();

        // ─── Build Response ──────────────────────────────────────────────
        let message = '';
        let success = true;

        if (errors.length > 0) {
            success = false;
            if (successCount > 0) {
                message = `⚠️ Import sebagian berhasil: ${successCount} siswa (${totalNilaiDisimpan} nilai) disimpan, tetapi ada ${errors.length} error yang perlu diperbaiki.`;
            } else {
                message = `❌ Import gagal: ${errors.length} error ditemukan. Tidak ada data yang disimpan.`;
            }
        } else if (successCount > 0) {
            message = `✅ Import berhasil! ${successCount} siswa, ${totalNilaiDisimpan} nilai disimpan.`;
        } else {
            message = 'ℹ️ Tidak ada data yang berhasil diimport. Periksa file Excel Anda.';
        }

        // 🆕 BARU: Tambahkan info kolom yang diabaikan
        if (komponenDiabaikan.length > 0) {
            message += `\n\nℹ️ Kolom [${komponenDiabaikan.map(kv => kv.header).join(', ')}] diabaikan karena periode ${jenis_penilaian} sedang aktif.`;
        }

        res.json({
            success: success,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_nilai_disimpan: totalNilaiDisimpan,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings : null,
                komponen_diimport: komponenBolehUpdate.map(kv => kv.header),
                komponen_diabaikan: komponenDiabaikan.map(kv => kv.header), // 🆕 BARU
                komponen_tidak_dikenali: komponenInvalid, // 🆕 BARU
                periode_aktif: jenis_penilaian,
                ada_error: errors.length > 0
            }
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error importNilaiExcel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport nilai: ' + err.message
        });
    } finally {
        connection.release();
    }
};