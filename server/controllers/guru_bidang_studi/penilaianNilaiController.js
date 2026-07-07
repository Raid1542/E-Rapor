/**
 * Nama File: penilaianNilaiController.js
 * Fungsi: Controller input nilai siswa (ambil, simpan single, simpan batch + hitung rapor)
 *         + IMPORT NILAI DARI EXCEL
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 * Update: 8 Juli 2026 - Tambah fitur import nilai dari Excel untuk GBS
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: HELPER FUNCTION - Hitung Kesamaan String (Levenshtein Distance)
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

// GET: Ambil daftar nilai siswa untuk mapel dan kelas tertentu
exports.getNilaiByMapelAndKelas = async (req, res) => {
    try {
        const { mapelId, kelasId } = req.params;
        const userId = req.user.id;

        if (!mapelId || !kelasId) return res.status(400).json({ success: false, message: 'ID mata pelajaran dan kelas wajib diisi' });

        // Step 1: Ambil tahun ajaran aktif
        const [taSemesterRows] = await db.execute('SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1');
        if (taSemesterRows.length === 0) return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const { semester, status_pts, status_pas } = taSemesterRows[0];

        let jenis_penilaian_aktif = null;
        if (status_pts === 'aktif') jenis_penilaian_aktif = 'PTS';
        else if (status_pas === 'aktif') jenis_penilaian_aktif = 'PAS';

        // Step 2: Validasi akses guru
        const [valid] = await db.execute('SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?', [userId, mapelId, kelasId, semesterId]);
        if (valid.length === 0) return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });

        // Step 3: Ambil nama kelas
        const [namaKelasRow] = await db.execute('SELECT nama_kelas FROM kelas WHERE id_kelas = ?', [kelasId]);
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        // Step 4: Cek bobot
        const [bobotCheck] = await db.execute(
            'SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)',
            [mapelId, semesterId, kelasId]
        );
        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;

        // Step 5: Ambil siswa aktif
        const [siswaRows] = await db.execute(
            'SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = \'aktif\' ORDER BY s.nama_lengkap',
            [kelasId, indukId]
        );

        if (siswaRows.length === 0) return res.json({ success: true, siswaList: [], komponen: [], kelas: kelasNama, jenis_penilaian_aktif, bobot_sudah_diatur: bobotSudahDiatur });

        // Step 6: Ambil komponen penilaian
        const [komponenRows] = await db.execute('SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan');

        // ═══════════════════════════════════════════════════════════════════════
        // ✅ UPDATE: Ambil konfigurasi kategori nilai REAL-TIME untuk PTS dan PAS
        // ═══════════════════════════════════════════════════════════════════════
        const [configPTSRows] = await db.execute(
            'SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = \'PTS\' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC',
            [mapelId, semesterId, kelasId, kelasId]
        );
        const [configPASRows] = await db.execute(
            'SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = \'PAS\' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC',
            [mapelId, semesterId, kelasId, kelasId]
        );

        // Helper: Cari deskripsi berdasarkan nilai dari konfigurasi
        const getDeskripsi = (nilai, configRows) => {
            if (nilai === null || nilai === undefined) return null;
            for (const config of configRows) {
                if (nilai >= config.min_nilai && nilai <= config.max_nilai) {
                    return config.deskripsi;
                }
            }
            return null;
        };

        // Step 7: Ambil nilai rapor (HANYA nilai_rapor, BUKAN deskripsi)
        const [nilaiRaporRows] = await db.execute(
            'SELECT siswa_id, nilai_rapor, jenis_penilaian, is_locked FROM nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?',
            [mapelId, semesterId, semester]
        );

        // Step 8: Ambil nilai detail
        const siswaIds = siswaRows.map(s => s.id);
        const [allNilaiDetail] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${siswaIds.map(() => '?').join(',')})`,
            [mapelId, semesterId, ...siswaIds]
        );

        const nilaiBySiswa = new Map();
        allNilaiDetail.forEach(row => {
            if (!nilaiBySiswa.has(row.siswa_id)) nilaiBySiswa.set(row.siswa_id, new Map());
            nilaiBySiswa.get(row.siswa_id).set(row.komponen_id, row.nilai);
        });

        const nilaiRaporPTSMap = new Map();
        const nilaiRaporPASMap = new Map();
        nilaiRaporRows.forEach(row => {
            const data = { nilai_rapor: row.nilai_rapor, is_locked: row.is_locked || false };
            if (row.jenis_penilaian === 'PTS') nilaiRaporPTSMap.set(row.siswa_id, data);
            else if (row.jenis_penilaian === 'PAS') nilaiRaporPASMap.set(row.siswa_id, data);
        });

        // Step 9: Bangun list siswa dengan deskripsi REAL-TIME
        const siswaList = [];
        for (const s of siswaRows) {
            const nilaiMap = nilaiBySiswa.get(s.id) || new Map();
            const nilaiRecord = {};
            komponenRows.forEach(k => { nilaiRecord[k.id_komponen] = nilaiMap.get(k.id_komponen) ?? null; });
            
            const raporPTS = nilaiRaporPTSMap.get(s.id);
            const raporPAS = nilaiRaporPASMap.get(s.id);
            
            // ✅ Ambil deskripsi dari konfigurasi REAL-TIME
            const deskripsiPTS = raporPTS ? getDeskripsi(raporPTS.nilai_rapor, configPTSRows) : null;
            const deskripsiPAS = raporPAS ? getDeskripsi(raporPAS.nilai_rapor, configPASRows) : null;
            
            siswaList.push({
                id: s.id, nama: s.nama, nis: s.nis, nisn: s.nisn, nilai: nilaiRecord,
                nilai_rapor_pts: raporPTS?.nilai_rapor ?? null, 
                deskripsi_pts: deskripsiPTS,
                is_locked_pts: raporPTS?.is_locked || false,
                nilai_rapor_pas: raporPAS?.nilai_rapor ?? null, 
                deskripsi_pas: deskripsiPAS,
                is_locked_pas: raporPAS?.is_locked || false
            });
        }

        res.json({ success: true, siswaList, komponen: komponenRows, kelas: kelasNama, jenis_penilaian_aktif, bobot_sudah_diatur: bobotSudahDiatur });
    } catch (err) {
        console.error('Error getNilaiByMapelAndKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai' });
    }
};

// POST: Simpan nilai untuk satu komponen penilaian
exports.simpanNilai = async (req, res) => {
    try {
        const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
        const user_id = req.user.id;

        // Validasi input
        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        if (nilai < 0 || nilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });

        // Ambil ID semester aktif
        const [taSemesterRows] = await db.execute('SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1');
        if (taSemesterRows.length === 0) return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        const semesterId = taSemesterRows[0].id_tahun_ajaran;

        // Ambil ID induk
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });

        // Validasi akses guru
        const [valid] = await db.execute(
            'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id IN (SELECT kelas_id FROM siswa_kelas WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?) AND tahun_ajaran_id = ?',
            [user_id, mapel_id, siswa_id, tahunAjaranIndukId, semesterId]
        );
        if (valid.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak' });

        // Insert atau update nilai detail
        await db.execute(
            'INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()',
            [siswa_id, mapel_id, komponen_id, nilai, semesterId]
        );

        res.json({ success: true, message: 'Nilai berhasil disimpan' });
    } catch (err) {
        console.error('Error simpanNilai:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
    }
};

// POST: Simpan nilai untuk banyak komponen sekaligus dan hitung nilai rapor otomatis
exports.simpanNilaiKomponenBanyak = async (req, res) => {
    try {
        const { mapelId, siswaId } = req.params;
        const { nilai } = req.body;
        const mapelIdNum = parseInt(mapelId, 10);
        const siswaIdNum = parseInt(siswaId, 10);

        // Validasi parameter
        if (isNaN(mapelIdNum) || isNaN(siswaIdNum)) return res.status(400).json({ success: false, message: 'ID tidak valid' });
        const userId = req.user.id;
        const jenis_penilaian = req.jenis_penilaian;
        if (!jenis_penilaian) return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif' });

        // Step 1: Ambil Tahun Ajaran Aktif
        const [taSemesterRows] = await db.execute('SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1');
        if (taSemesterRows.length === 0) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const semester = taSemesterRows[0].semester;

        // Step 2: Validasi Akses
        const [valid] = await db.execute('SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?', [userId, mapelIdNum, semesterId]);
        if (valid.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak' });

        // Step 3: Cek Locked
        const [lockedRows] = await db.execute(
            'SELECT is_locked FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?',
            [siswaIdNum, mapelIdNum, semesterId, semester, jenis_penilaian]
        );
        if (lockedRows.length > 0 && lockedRows[0].is_locked) return res.status(403).json({ success: false, message: `Nilai ${jenis_penilaian} sudah dikunci dan tidak dapat diubah.` });

        // Step 4: Cek Siswa Aktif + Ambil kelas_id
        const [siswaAktifRows] = await db.execute(
            'SELECT sk.kelas_id, s.status FROM siswa_kelas sk JOIN siswa s ON sk.siswa_id = s.id_siswa JOIN pembelajaran p ON sk.kelas_id = p.kelas_id WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ? AND sk.id_tahun_ajaran_induk = ? LIMIT 1',
            [siswaIdNum, userId, mapelIdNum, semesterId, indukId]
        );
        if (siswaAktifRows.length === 0) return res.status(400).json({ success: false, message: 'Siswa tidak aktif di kelas yang Anda ajar' });
        if (siswaAktifRows[0].status !== 'aktif') return res.status(403).json({ success: false, message: `Siswa tidak aktif (status: ${siswaAktifRows[0].status}). Nilai tidak dapat diubah.` });
        const kelasIdNum = siswaAktifRows[0].kelas_id;

        // Step 5: Ambil Komponen & Validasi
        const [komponenRows] = await db.execute('SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan');
        const validKomponenIds = new Set(komponenRows.map(k => k.id_komponen));
        for (const komponenIdStr of Object.keys(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (!validKomponenIds.has(komponenId)) return res.status(400).json({ success: false, message: `Komponen ID ${komponenId} tidak valid` });
        }

        // Validasi periode PTS: hanya komponen PTS yang boleh diinput
        if (jenis_penilaian === 'PTS') {
            const nonPTSComponents = Object.keys(nilai).filter(id => {
                const komponen = komponenRows.find(k => k.id_komponen == id);
                return komponen && !/^PTS$/i.test(komponen.nama_komponen);
            });
            const hasNonPTSValue = nonPTSComponents.some(id => {
                const nilaiSiswa = nilai[id];
                return nilaiSiswa !== null && nilaiSiswa !== '' && !isNaN(nilaiSiswa);
            });
            if (hasNonPTSValue) return res.status(400).json({ success: false, message: 'Saat periode PTS aktif, hanya komponen PTS yang boleh diinput' });
        }

        // Step 6: Simpan Nilai Detail
        const [existingNilaiRows] = await db.execute('SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?', [siswaIdNum, mapelIdNum, semesterId]);
        const existingNilaiMap = new Map();
        existingNilaiRows.forEach(row => existingNilaiMap.set(row.komponen_id, row.nilai));

        // Hapus komponen yang di-set null
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if ((nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') && existingNilaiMap.has(komponenId)) {
                await db.execute('DELETE FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?', [siswaIdNum, mapelIdNum, komponenId, semesterId]);
            }
        }

        // Cek perubahan
        let hasChanges = false;
        const perubahanList = [];
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            const nilaiBaru = (nilaiSiswa !== null && nilaiSiswa !== undefined && nilaiSiswa !== '') ? Math.round(parseFloat(nilaiSiswa)) : null;
            const nilaiLama = existingNilaiMap.get(komponenId) ?? null;
            if (nilaiBaru !== nilaiLama) {
                hasChanges = true;
                const komponenNama = komponenRows.find(k => k.id_komponen === komponenId)?.nama_komponen || komponenId;
                perubahanList.push({ komponen: komponenNama, lama: nilaiLama, baru: nilaiBaru });
            }
        }
        if (!hasChanges) return res.status(400).json({ success: false, message: 'Tidak ada perubahan data', no_changes: true });

        // Simpan nilai detail
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') continue;
            const parsed = parseFloat(nilaiSiswa);
            if (isNaN(parsed)) continue;
            if (!Number.isInteger(parsed)) return res.status(400).json({ success: false, message: `Nilai harus bilangan bulat. Diterima: ${nilaiSiswa}` });
            let nilaiBulat = Math.round(parsed);
            if (nilaiBulat < 0) nilaiBulat = 0;
            if (nilaiBulat > 100) nilaiBulat = 100;
            await db.execute(
                'INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()',
                [siswaIdNum, mapelIdNum, komponenId, nilaiBulat, semesterId, userId]
            );
        }

        // Step 7: Hitung Nilai Rapor
        const [nilaiRows] = await db.execute('SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?', [siswaIdNum, mapelIdNum, semesterId]);
        const [bobotRows] = await db.execute(
            'SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)',
            [mapelIdNum, semesterId, kelasIdNum]
        );
        const nilaiMap = new Map();
        nilaiRows.forEach(row => nilaiMap.set(row.komponen_id, row.nilai || 0));
        const bobotMap = new Map();
        bobotRows.forEach(row => {
            const existing = bobotMap.get(row.komponen_id);
            if (!existing || row.kelas_id !== null) bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0);
        });
        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));
        let nilaiRaporPTS = null, nilaiRaporPAS = null, deskripsiPTS = null, deskripsiPAS = null;

        // Helper: Ambil konfigurasi kategori nilai
        const getConfigRows = async (jenisPenilaian) => {
            const [rows] = await db.execute(
                'SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ? AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC',
                [mapelIdNum, semesterId, jenisPenilaian, kelasIdNum, kelasIdNum]
            );
            return rows;
        };

        // Hitung nilai rapor PTS (otomatis saat PTS aktif)
        if (ptsKomponen) {
            const nilaiPTS = nilaiMap.get(ptsKomponen.id_komponen);
            if (nilaiPTS !== undefined && nilaiPTS !== null) {
                nilaiRaporPTS = Math.round(nilaiPTS);
                const configRowsPTS = await getConfigRows('PTS');
                for (const config of configRowsPTS) {
                    if (nilaiRaporPTS >= config.min_nilai && nilaiRaporPTS <= config.max_nilai) { deskripsiPTS = config.deskripsi; break; }
                }
            }
        }

        // Hitung nilai rapor PAS
        if (jenis_penilaian === 'PAS') {
            const nilaiUH = uhKomponenIds.map(id => nilaiMap.get(id)).filter(v => v !== undefined && v !== null);
            const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
            const [ptsRaporRows] = await db.execute(
                'SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = \'PTS\'',
                [siswaIdNum, mapelIdNum, semesterId, semester]
            );
            const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;
            const nilaiPAS = pasKomponen ? (nilaiMap.get(pasKomponen.id_komponen) || 0) : 0;
            const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
            const bobotPTSForPAS = ptsKomponen ? (bobotMap.get(ptsKomponen.id_komponen) || 0) : 0;
            const bobotPAS = pasKomponen ? (bobotMap.get(pasKomponen.id_komponen) || 0) : 0;
            const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

            // Validasi bobot
            if (bobotRows.length === 0) return res.status(400).json({ success: false, message: 'Bobot penilaian belum dikonfigurasi. Silakan hubungi admin.' });
            if (Math.abs(totalBobot - 100) > 0.01) return res.status(400).json({ success: false, message: `Total bobot harus 100%. Saat ini: ${totalBobot.toFixed(2)}%` });

            // Hitung nilai rapor PAS dengan bobot
            if (totalBobot > 0) {
                const nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTSForPAS * bobotPTSForPAS) + (nilaiPAS * bobotPAS)) / totalBobot;
                nilaiRaporPAS = Math.round(nilaiRapor);
                const configRowsPAS = await getConfigRows('PAS');
                for (const config of configRowsPAS) {
                    if (nilaiRaporPAS >= config.min_nilai && nilaiRaporPAS <= config.max_nilai) { deskripsiPAS = config.deskripsi; break; }
                }
            }
        }

        // Step 8: Simpan Rapor
        if (jenis_penilaian === 'PTS' && nilaiRaporPTS !== null) {
            await db.execute(
                'INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, \'PTS\', ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()',
                [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPTS, deskripsiPTS, userId]
            );
        }
        if (jenis_penilaian === 'PAS' && nilaiRaporPAS !== null) {
            await db.execute(
                'INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, \'PAS\', ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()',
                [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPAS, deskripsiPAS, userId]
            );
        }

        res.json({
            success: true, message: `Nilai ${jenis_penilaian} berhasil disimpan`,
            nilai_rapor_pts: nilaiRaporPTS, deskripsi_pts: deskripsiPTS, nilai_rapor_pas: nilaiRaporPAS, deskripsi_pas: deskripsiPAS,
            perubahan: perubahanList, jumlah_perubahan: perubahanList.length
        });
    } catch (err) {
        console.error('Error simpanNilaiKomponenBanyak:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: DOWNLOAD TEMPLATE IMPORT NILAI GBS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-bidang-studi/nilai/import-template?mapel_id=X&kelas_id=Y
 * Download template Excel untuk import nilai GBS
 */
exports.downloadTemplateNilaiGBS = async (req, res) => {
    try {
        const { mapel_id, kelas_id } = req.query;
        const userId = req.user.id;

        if (!mapel_id || !kelas_id || isNaN(Number(mapel_id)) || isNaN(Number(kelas_id))) {
            return res.status(400).json({ success: false, message: 'mapel_id dan kelas_id wajib diisi' });
        }

        const mapelId = Number(mapel_id);
        const kelasId = Number(kelas_id);

        // Step 1: Ambil tahun ajaran aktif
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const semester = taRows[0].semester;

        // Step 2: Validasi akses guru ke mapel + kelas
        const [valid] = await db.execute(
            'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
            [userId, mapelId, kelasId, semesterId]
        );
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        // Step 3: Ambil nama mapel dan kelas
        const [mapelRow] = await db.execute(
            'SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?',
            [mapelId]
        );
        const namaMapel = mapelRow[0]?.nama_mapel || 'Mata Pelajaran';

        const [kelasRow] = await db.execute(
            'SELECT nama_kelas FROM kelas WHERE id_kelas = ?',
            [kelasId]
        );
        const namaKelas = kelasRow[0]?.nama_kelas || 'Kelas';

        // Step 4: Ambil siswa aktif di kelas
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
             ORDER BY s.nama_lengkap ASC`,
            [kelasId, indukId]
        );

        // Step 5: Ambil komponen penilaian
        const [komponenRows] = await db.execute(
            'SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC'
        );

        // Step 6: Ambil jenis penilaian aktif
        const [statusRows] = await db.execute(
            'SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        const status_pts = statusRows[0]?.status_pts || 'nonaktif';
        const status_pas = statusRows[0]?.status_pas || 'nonaktif';
        const jenis_penilaian = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : 'PTS';

        // ═════════════════════════════════════════════════════════════════════════════
        // BUILD EXCEL WORKBOOK DENGAN EXCELJS
        // ═════════════════════════════════════════════════════════════════════════════

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Template Input Nilai');

        // ─── Row 1: Column Headers ─────────────────────────────────────────
        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', ...komponenRows.map(k => k.nama_komponen)];
        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;

        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colIdx < 4 ? 'FF4A90E2' : 'FFE8690A' }
            };
        });

        // ─── Row 2+: Data Siswa ────────────────────────────────────────────
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
            noCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            noCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' }
            };

            // Kolom NIS
            const nisCell = dataRow.getCell(2);
            nisCell.value = siswa.nis || '';
            nisCell.font = { name: 'Calibri', size: 11 };
            nisCell.alignment = { vertical: 'middle', horizontal: 'center' };
            nisCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            nisCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' }
            };

            // Kolom NISN
            const nisnCell = dataRow.getCell(3);
            nisnCell.value = siswa.nisn || '';
            nisnCell.font = { name: 'Calibri', size: 11 };
            nisnCell.alignment = { vertical: 'middle', horizontal: 'center' };
            nisnCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            nisnCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' }
            };

            // Kolom Nama Siswa
            const namaCell = dataRow.getCell(4);
            namaCell.value = siswa.nama_lengkap || '';
            namaCell.font = { name: 'Calibri', size: 11, bold: true };
            namaCell.alignment = { vertical: 'middle', horizontal: 'left' };
            namaCell.border = {
                top: { style: 'thin', color: { argargb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            namaCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' }
            };

            // Kolom Nilai (kosong, siap diisi)
            komponenRows.forEach((komp, kompIdx) => {
                const cell = dataRow.getCell(5 + kompIdx);
                cell.value = '';
                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' }
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

        // ─── Pesan Jika Tidak Ada Siswa ─────────────────────────────────────
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A2:H2');
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
            emptyCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
        }

        // ─── Set Column Width ──────────────────────────────────────────────
        worksheet.columns = [
            { width: 6 },   // No
            { width: 15 },  // NIS
            { width: 15 },  // NISN
            { width: 30 },  // Nama Siswa
            ...komponenRows.map(() => ({ width: 12 })) // Komponen nilai
        ];

        // ─── Freeze Header Row ─────────────────────────────────────────────
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // ═════════════════════════════════════════════════════════════════════════════
        // GENERATE & SEND
        // ═════════════════════════════════════════════════════════════════════════════

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_${jenis_penilaian}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);

    } catch (err) {
        console.error('Error downloadTemplateNilaiGBS:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: IMPORT NILAI DARI EXCEL GBS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/guru-bidang-studi/nilai/import
 * Upload file Excel dan import nilai siswa untuk GBS
 * Body: multipart/form-data dengan field 'file', 'mapel_id', dan 'kelas_id'
 */
exports.importNilaiExcelGBS = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diupload' });
        }

        const { mapel_id, kelas_id } = req.body;
        const userId = req.user.id;

        if (!mapel_id || !kelas_id || isNaN(Number(mapel_id)) || isNaN(Number(kelas_id))) {
            return res.status(400).json({ success: false, message: 'mapel_id dan kelas_id wajib diisi' });
        }

        const mapelId = Number(mapel_id);
        const kelasId = Number(kelas_id);

        // Step 1: Ambil tahun ajaran aktif
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const semester = taRows[0].semester;
        const status_pts = taRows[0].status_pts || 'nonaktif';
        const status_pas = taRows[0].status_pas || 'nonaktif';
        const jenis_penilaian = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;

        if (!jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Periode penilaian belum aktif' });
        }

        // Step 2: Validasi akses guru ke mapel + kelas
        const [valid] = await db.execute(
            'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
            [userId, mapelId, kelasId, semesterId]
        );
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        // Step 3: Baca File Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong atau format tidak valid. Minimal harus ada header dan 1 baris data.'
            });
        }

        // Step 4: Cari Header Row
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

        // Step 5: Validasi Kolom Wajib
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

        // Step 6: Ambil Komponen dari Header
        const komponenHeaders = headers.slice(4);
        const [komponenRows] = await db.execute(
            'SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC'
        );

        const komponenMap = {};
        komponenRows.forEach(k => {
            komponenMap[k.nama_komponen.toUpperCase().trim()] = k.id_komponen;
        });

        const komponenValid = [];
        komponenHeaders.forEach(header => {
            const headerUpper = header.toUpperCase().trim();
            if (komponenMap[headerUpper]) {
                komponenValid.push({ header, id: komponenMap[headerUpper] });
            }
        });

        if (komponenValid.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada kolom komponen penilaian yang valid.'
            });
        }

        // Step 7: Filter Komponen Berdasarkan Periode
        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

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

        // Step 8: Ambil Data Siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`,
            [kelasId, indukId]
        );

        const siswaMapByNIS = {};
        siswaRows.forEach(s => {
            if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s;
        });

        // Step 9: Proses Data per Baris
        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;

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
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini`
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

            // Proses setiap komponen
            for (const kv of komponenBolehUpdate) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-') continue;

                const nilai = parseFloat(nilaiStr);
                if (isNaN(nilai)) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" bukan angka`
                    });
                    continue;
                }

                if (nilai < 0 || nilai > 100) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": Nilai ${nilai} di luar rentang 0-100`
                    });
                    continue;
                }

                const nilaiBulat = Math.round(nilai);
                await connection.execute(
                    `INSERT INTO nilai_detail 
                     (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     nilai = VALUES(nilai), 
                     updated_at = NOW()`,
                    [siswaId, mapelId, kv.id, nilaiBulat, semesterId, userId]
                );
                rowSavedCount++;
                totalNilaiDisimpan++;
            }

            if (rowSavedCount > 0) successCount++;
            else skippedCount++;
        }

        // Step 10: Recompute Nilai Rapor untuk semua siswa yang berhasil diimport
        if (successCount > 0) {
            try {
                const siswaIds = siswaRows.map(s => s.id_siswa);
                const placeholders = siswaIds.map(() => '?').join(',');

                // Ambil nilai detail untuk semua siswa
                const [nilaiRows] = await connection.execute(
                    `SELECT siswa_id, komponen_id, nilai FROM nilai_detail 
                     WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
                    [mapelId, semesterId, ...siswaIds]
                );

                // Ambil bobot
                const [bobotRows] = await connection.execute(
                    `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen 
                     WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`,
                    [mapelId, semesterId, kelasId]
                );

                // Group nilai by siswa
                const nilaiBySiswa = {};
                nilaiRows.forEach(row => {
                    if (!nilaiBySiswa[row.siswa_id]) nilaiBySiswa[row.siswa_id] = {};
                    nilaiBySiswa[row.siswa_id][row.komponen_id] = row.nilai || 0;
                });

                // Group bobot
                const bobotMap = {};
                bobotRows.forEach(row => {
                    const existing = bobotMap[row.komponen_id];
                    if (!existing || row.kelas_id !== null) {
                        bobotMap[row.komponen_id] = parseFloat(row.bobot) || 0;
                    }
                });

                // Hitung nilai rapor per siswa
                for (const siswaId of siswaIds) {
                    const nilaiSiswa = nilaiBySiswa[siswaId] || {};

                    // Hitung PTS
                    if (ptsKomponen && nilaiSiswa[ptsKomponen.id_komponen] !== undefined) {
                        const nilaiPTS = Math.round(nilaiSiswa[ptsKomponen.id_komponen]);

                        const [configPTSRows] = await connection.execute(
                            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                             WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' 
                             AND (kelas_id = ? OR kelas_id IS NULL) 
                             ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
                            [mapelId, semesterId, kelasId, kelasId]
                        );

                        let deskripsiPTS = null;
                        for (const config of configPTSRows) {
                            if (nilaiPTS >= config.min_nilai && nilaiPTS <= config.max_nilai) {
                                deskripsiPTS = config.deskripsi;
                                break;
                            }
                        }

                        await connection.execute(
                            `INSERT INTO nilai_rapor 
                             (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                             VALUES (?, ?, ?, ?, ?, 'PTS', ?, ?, ?, NOW())
                             ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
                            [siswaId, mapelId, kelasId, semesterId, semester, nilaiPTS, deskripsiPTS, userId]
                        );
                    }

                    // Hitung PAS
                    if (jenis_penilaian === 'PAS') {
                        const nilaiUH = uhKomponenIds.map(id => nilaiSiswa[id]).filter(v => v !== undefined && v !== null);
                        const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

                        const [ptsRaporRows] = await connection.execute(
                            `SELECT nilai_rapor FROM nilai_rapor 
                             WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                            [siswaId, mapelId, semesterId, semester]
                        );
                        const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;

                        const nilaiPAS = pasKomponen ? (nilaiSiswa[pasKomponen.id_komponen] || 0) : 0;

                        const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap[id] || 0), 0);
                        const bobotPTSForPAS = ptsKomponen ? (bobotMap[ptsKomponen.id_komponen] || 0) : 0;
                        const bobotPAS = pasKomponen ? (bobotMap[pasKomponen.id_komponen] || 0) : 0;
                        const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

                        if (totalBobot > 0) {
                            const nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTSForPAS * bobotPTSForPAS) + (nilaiPAS * bobotPAS)) / totalBobot;
                            const nilaiRaporPAS = Math.round(nilaiRapor);

                            const [configPASRows] = await connection.execute(
                                `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                                 WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' 
                                 AND (kelas_id = ? OR kelas_id IS NULL) 
                                 ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
                                [mapelId, semesterId, kelasId, kelasId]
                            );

                            let deskripsiPAS = null;
                            for (const config of configPASRows) {
                                if (nilaiRaporPAS >= config.min_nilai && nilaiRaporPAS <= config.max_nilai) {
                                    deskripsiPAS = config.deskripsi;
                                    break;
                                }
                            }

                            await connection.execute(
                                `INSERT INTO nilai_rapor 
                                 (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                                 VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW())
                                 ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
                                [siswaId, mapelId, kelasId, semesterId, semester, nilaiRaporPAS, deskripsiPAS, userId]
                            );
                        }
                    }
                }
            } catch (recalcErr) {
                console.error('Error hitung ulang nilai rapor:', recalcErr);
            }
        }

        await connection.commit();

        let message = '';
        if (successCount > 0) {
            message = `Import berhasil! ${successCount} siswa berhasil diimport dengan ${totalNilaiDisimpan} nilai disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport.';
        }

        if (errors.length > 0) {
            message += `\n⚠️ Ada ${errors.length} error yang perlu diperbaiki.`;
        }

        res.json({
            success: true,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_nilai_disimpan: totalNilaiDisimpan,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings.slice(0, 10) : null,
                komponen_diimport: komponenBolehUpdate.map(kv => kv.header),
                periode_aktif: jenis_penilaian
            }
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error importNilaiExcelGBS:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport nilai: ' + err.message
        });
    } finally {
        connection.release();
    }
};