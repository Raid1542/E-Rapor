/**
 * Nama File: penilaianNilaiController.js
 * Fungsi: Controller input nilai siswa (ambil, simpan single, simpan batch + hitung rapor)
 *         + Import nilai dari Excel dengan validasi konfigurasi penilaian
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 * Update: 11 Juli 2026 - Tambah validasi konfigurasi penilaian (bobot + kategori rapor)
 * Update: 11 Juli 2026 - Endpoint cek-status-kategori untuk frontend
 * Update: 11 Juli 2026 - Hapus emoji dari komentar (sesuai coding convention)
 * Update: 11 Juli 2026 - Indentasi 2 spasi (sesuai coding convention)
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// Konstanta untuk kode error
const ERROR_CODES = {
    KONFIGURASI_BELUM_LENGKAP: 'KONFIGURASI_BELUM_LENGKAP',
};

// Helper: Hitung kesamaan string (Levenshtein Distance)
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
    return 1 - matrix[len1][len2] / maxLen;
};

// Helper: Cek status konfigurasi penilaian akademik (bobot + kategori rapor)
const cekStatusKategoriAkademikGBS = async (mapelId, kelasId, semesterId) => {
    try {
        // 1. Cek bobot komponen
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot, kelas_id 
       FROM konfigurasi_mapel_komponen 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 
       AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, semesterId, kelasId]
        );

        const bobotMap = new Map();
        bobotRows.forEach(b => {
            const existing = bobotMap.get(b.komponen_id);
            if (!existing || b.kelas_id !== null) {
                bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
            }
        });

        const totalBobot = Array.from(bobotMap.values()).reduce((sum, b) => sum + b, 0);
        const bobotStatus = {
            total: totalBobot,
            status: Math.abs(totalBobot - 100) < 0.01 ? 'lengkap' : 'belum_100',
        };

        // 2. Cek kategori nilai rapor PTS
        const [kategoriPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai 
       FROM konfigurasi_nilai_rapor 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' 
       AND (kelas_id = ? OR kelas_id IS NULL) 
       ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai ASC`,
            [mapelId, semesterId, kelasId, kelasId]
        );

        // 3. Cek kategori nilai rapor PAS
        const [kategoriPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai 
       FROM konfigurasi_nilai_rapor 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' 
       AND (kelas_id = ? OR kelas_id IS NULL) 
       ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai ASC`,
            [mapelId, semesterId, kelasId, kelasId]
        );

        // Helper: Cek celah rentang
        const cekCelah = kategoriRows => {
            const celah = [];
            if (kategoriRows.length === 0) {
                return ['0-100 (belum ada kategori)'];
            }

            const sorted = [...kategoriRows].sort(
                (a, b) => parseFloat(a.min_nilai) - parseFloat(b.min_nilai)
            );

            const firstMin = parseFloat(sorted[0].min_nilai);
            if (firstMin > 0) {
                celah.push(`0-${Math.floor(firstMin - 1)}`);
            }

            for (let i = 0; i < sorted.length - 1; i++) {
                const currentMax = parseFloat(sorted[i].max_nilai);
                const nextMin = parseFloat(sorted[i + 1].min_nilai);
                if (nextMin > currentMax + 1) {
                    celah.push(`${Math.floor(currentMax + 1)}-${Math.floor(nextMin - 1)}`);
                }
            }

            const lastMax = parseFloat(sorted[sorted.length - 1].max_nilai);
            if (lastMax < 100) {
                celah.push(`${Math.floor(lastMax + 1)}-100`);
            }

            return celah;
        };

        const kategoriStatus = {
            pts: {
                covered: cekCelah(kategoriPTSRows).length === 0,
                celah: cekCelah(kategoriPTSRows),
            },
            pas: {
                covered: cekCelah(kategoriPASRows).length === 0,
                celah: cekCelah(kategoriPASRows),
            },
        };

        const configured =
            bobotStatus.status === 'lengkap' &&
            kategoriStatus.pts.covered &&
            kategoriStatus.pas.covered;

        let message = '';
        if (configured) {
            message = 'Semua konfigurasi sudah lengkap';
        } else {
            const masalah = [];
            if (bobotStatus.status !== 'lengkap') {
                masalah.push(`Bobot komponen belum 100% (saat ini: ${bobotStatus.total}%)`);
            }
            if (!kategoriStatus.pts.covered) {
                masalah.push(`Kategori PTS belum lengkap (${kategoriStatus.pts.celah.length} celah)`);
            }
            if (!kategoriStatus.pas.covered) {
                masalah.push(`Kategori PAS belum lengkap (${kategoriStatus.pas.celah.length} celah)`);
            }
            message = `Ditemukan ${masalah.length} masalah: ${masalah.join('; ')}`;
        }

        return {
            configured,
            bobot: bobotStatus,
            kategori: kategoriStatus,
            message,
        };
    } catch (err) {
        console.error('Error cekStatusKategoriAkademikGBS:', err);
        return {
            configured: false,
            bobot: { total: 0, status: 'error' },
            kategori: {
                pts: { covered: false, celah: ['Error checking'] },
                pas: { covered: false, celah: ['Error checking'] },
            },
            message: 'Gagal mengecek status konfigurasi',
        };
    }
};

// GET: Ambil daftar nilai siswa untuk mapel dan kelas tertentu
exports.getNilaiByMapelAndKelas = async (req, res) => {
    try {
        const { mapelId, kelasId } = req.params;
        const userId = req.user.id;

        if (!mapelId || !kelasId) {
            return res
                .status(400)
                .json({ success: false, message: 'ID mata pelajaran dan kelas wajib diisi' });
        }

        // Step 1: Ambil tahun ajaran aktif
        const [taSemesterRows] = await db.execute(
            `SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas 
       FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        if (taSemesterRows.length === 0) {
            return res
                .status(500)
                .json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const { semester, status_pts, status_pas } = taSemesterRows[0];

        let jenis_penilaian_aktif = null;
        if (status_pts === 'aktif') jenis_penilaian_aktif = 'PTS';
        else if (status_pas === 'aktif') jenis_penilaian_aktif = 'PAS';

        // Step 2: Validasi akses guru
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );
        if (valid.length === 0) {
            return res
                .status(403)
                .json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        // Step 3: Ambil nama kelas
        const [namaKelasRow] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelasId]
        );
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        // Step 4: Cek bobot
        const [bobotCheck] = await db.execute(
            `SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 
       AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, semesterId, kelasId]
        );
        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;

        // Step 5: Ambil siswa aktif
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama 
       FROM siswa s 
       JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
       WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif' 
       ORDER BY s.nama_lengkap`,
            [kelasId, indukId]
        );

        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                siswaList: [],
                komponen: [],
                kelas: kelasNama,
                jenis_penilaian_aktif,
                bobot_sudah_diatur: bobotSudahDiatur,
            });
        }

        // Step 6: Ambil komponen penilaian
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

        // Ambil konfigurasi kategori nilai real-time untuk PTS dan PAS
        const [configPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' 
       AND (kelas_id = ? OR kelas_id IS NULL) 
       ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
            [mapelId, semesterId, kelasId, kelasId]
        );
        const [configPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' 
       AND (kelas_id = ? OR kelas_id IS NULL) 
       ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
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

        // Step 7: Ambil nilai rapor
        const [nilaiRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, jenis_penilaian, is_locked FROM nilai_rapor 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
            [mapelId, semesterId, semester]
        );

        // Step 8: Ambil nilai detail
        const siswaIds = siswaRows.map(s => s.id);
        const placeholders = siswaIds.map(() => '?').join(',');
        const [allNilaiDetail] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
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

        // Step 9: Bangun list siswa dengan deskripsi real-time
        const siswaList = [];
        for (const s of siswaRows) {
            const nilaiMap = nilaiBySiswa.get(s.id) || new Map();
            const nilaiRecord = {};
            komponenRows.forEach(k => {
                nilaiRecord[k.id_komponen] = nilaiMap.get(k.id_komponen) ?? null;
            });

            const raporPTS = nilaiRaporPTSMap.get(s.id);
            const raporPAS = nilaiRaporPASMap.get(s.id);

            const deskripsiPTS = raporPTS ? getDeskripsi(raporPTS.nilai_rapor, configPTSRows) : null;
            const deskripsiPAS = raporPAS ? getDeskripsi(raporPAS.nilai_rapor, configPASRows) : null;

            siswaList.push({
                id: s.id,
                nama: s.nama,
                nis: s.nis,
                nisn: s.nisn,
                nilai: nilaiRecord,
                nilai_rapor_pts: raporPTS?.nilai_rapor ?? null,
                deskripsi_pts: deskripsiPTS,
                is_locked_pts: raporPTS?.is_locked || false,
                nilai_rapor_pas: raporPAS?.nilai_rapor ?? null,
                deskripsi_pas: deskripsiPAS,
                is_locked_pas: raporPAS?.is_locked || false,
            });
        }

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            jenis_penilaian_aktif,
            bobot_sudah_diatur: bobotSudahDiatur,
        });
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
        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        }
        if (nilai < 0 || nilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }

        // Ambil ID semester aktif
        const [taSemesterRows] = await db.execute(
            `SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        if (taSemesterRows.length === 0) {
            return res
                .status(500)
                .json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;

        // Ambil ID induk
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res
                .status(400)
                .json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        // Validasi akses guru
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
       WHERE user_id = ? AND mapel_id = ? 
       AND kelas_id IN (SELECT kelas_id FROM siswa_kelas WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?) 
       AND tahun_ajaran_id = ?`,
            [user_id, mapel_id, siswa_id, tahunAjaranIndukId, semesterId]
        );
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        // Insert atau update nilai detail
        await db.execute(
            `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW()) 
       ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
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
        if (isNaN(mapelIdNum) || isNaN(siswaIdNum)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }
        const userId = req.user.id;
        const jenis_penilaian = req.jenis_penilaian;
        if (!jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif' });
        }

        // Step 1: Ambil tahun ajaran aktif
        const [taSemesterRows] = await db.execute(
            `SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        if (taSemesterRows.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const semester = taSemesterRows[0].semester;

        // Step 2: Validasi akses
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelIdNum, semesterId]
        );
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        // Step 3: Cek locked
        const [lockedRows] = await db.execute(
            `SELECT is_locked FROM nilai_rapor 
       WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [siswaIdNum, mapelIdNum, semesterId, semester, jenis_penilaian]
        );
        if (lockedRows.length > 0 && lockedRows[0].is_locked) {
            return res.status(403).json({
                success: false,
                message: `Nilai ${jenis_penilaian} sudah dikunci dan tidak dapat diubah.`,
            });
        }

        // Step 4: Cek siswa aktif + ambil kelas_id
        const [siswaAktifRows] = await db.execute(
            `SELECT sk.kelas_id, s.status FROM siswa_kelas sk 
       JOIN siswa s ON sk.siswa_id = s.id_siswa 
       JOIN pembelajaran p ON sk.kelas_id = p.kelas_id 
       WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ? AND sk.id_tahun_ajaran_induk = ? 
       LIMIT 1`,
            [siswaIdNum, userId, mapelIdNum, semesterId, indukId]
        );
        if (siswaAktifRows.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: 'Siswa tidak aktif di kelas yang Anda ajar' });
        }
        if (siswaAktifRows[0].status !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: `Siswa tidak aktif (status: ${siswaAktifRows[0].status}). Nilai tidak dapat diubah.`,
            });
        }
        const kelasIdNum = siswaAktifRows[0].kelas_id;

        // BARU: Step 4.5 - Cek konfigurasi penilaian
        const statusCheck = await cekStatusKategoriAkademikGBS(mapelIdNum, kelasIdNum, semesterId);
        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(
                    `• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)\n` +
                    `  Silakan atur di menu "Atur Penilaian" > "Bobot Penilaian"`
                );
            }
            if (!statusCheck.kategori.pts.covered || !statusCheck.kategori.pas.covered) {
                const celah = [
                    ...statusCheck.kategori.pts.celah.map(c => `PTS: ${c}`),
                    ...statusCheck.kategori.pas.celah.map(c => `PAS: ${c}`),
                ];
                masalah.push(
                    `• Kategori nilai rapor belum lengkap\n` +
                    `  Celah rentang: ${celah.join(', ')}\n` +
                    `  Silakan atur di menu "Atur Penilaian" > "Kategori Akademik"`
                );
            }

            return res.status(400).json({
                success: false,
                message:
                    `Konfigurasi Penilaian Belum Lengkap\n\n` +
                    `Masalah yang ditemukan:\n${masalah.join('\n\n')}\n\n` +
                    `Solusi:\n` +
                    `1. Buka menu "Atur Penilaian"\n` +
                    `2. Atur bobot komponen agar total 100%\n` +
                    `3. Atur kategori nilai rapor agar rentang 0-100 tercover\n` +
                    `4. Setelah selesai, Anda dapat menginput nilai siswa`,
                code: ERROR_CODES.KONFIGURASI_BELUM_LENGKAP,
                data: {
                    bobot: statusCheck.bobot,
                    kategori: statusCheck.kategori,
                },
            });
        }

        // Step 5: Ambil komponen & validasi
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );
        const validKomponenIds = new Set(komponenRows.map(k => k.id_komponen));
        for (const komponenIdStr of Object.keys(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (!validKomponenIds.has(komponenId)) {
                return res
                    .status(400)
                    .json({ success: false, message: `Komponen ID ${komponenId} tidak valid` });
            }
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
            if (hasNonPTSValue) {
                return res.status(400).json({
                    success: false,
                    message: 'Saat periode PTS aktif, hanya komponen PTS yang boleh diinput',
                });
            }
        }

        // Step 6: Simpan nilai detail
        const [existingNilaiRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaIdNum, mapelIdNum, semesterId]
        );
        const existingNilaiMap = new Map();
        existingNilaiRows.forEach(row => existingNilaiMap.set(row.komponen_id, row.nilai));

        // Hapus komponen yang di-set null
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (
                (nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') &&
                existingNilaiMap.has(komponenId)
            ) {
                await db.execute(
                    `DELETE FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?`,
                    [siswaIdNum, mapelIdNum, komponenId, semesterId]
                );
            }
        }

        // Cek perubahan
        let hasChanges = false;
        const perubahanList = [];
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            const nilaiBaru =
                nilaiSiswa !== null && nilaiSiswa !== undefined && nilaiSiswa !== ''
                    ? Math.round(parseFloat(nilaiSiswa))
                    : null;
            const nilaiLama = existingNilaiMap.get(komponenId) ?? null;
            if (nilaiBaru !== nilaiLama) {
                hasChanges = true;
                const komponenNama =
                    komponenRows.find(k => k.id_komponen === komponenId)?.nama_komponen || komponenId;
                perubahanList.push({ komponen: komponenNama, lama: nilaiLama, baru: nilaiBaru });
            }
        }
        if (!hasChanges) {
            return res
                .status(400)
                .json({ success: false, message: 'Tidak ada perubahan data', no_changes: true });
        }

        // Simpan nilai detail
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') continue;
            const parsed = parseFloat(nilaiSiswa);
            if (isNaN(parsed)) continue;
            if (!Number.isInteger(parsed)) {
                return res.status(400).json({
                    success: false,
                    message: `Nilai harus bilangan bulat. Diterima: ${nilaiSiswa}`,
                });
            }
            let nilaiBulat = Math.round(parsed);
            if (nilaiBulat < 0) nilaiBulat = 0;
            if (nilaiBulat > 100) nilaiBulat = 100;
            await db.execute(
                `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                [siswaIdNum, mapelIdNum, komponenId, nilaiBulat, semesterId, userId]
            );
        }

        // Step 7: Hitung nilai rapor
        const [nilaiRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaIdNum, mapelIdNum, semesterId]
        );
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen 
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelIdNum, semesterId, kelasIdNum]
        );
        const nilaiMap = new Map();
        nilaiRows.forEach(row => nilaiMap.set(row.komponen_id, row.nilai || 0));
        const bobotMap = new Map();
        bobotRows.forEach(row => {
            const existing = bobotMap.get(row.komponen_id);
            if (!existing || row.kelas_id !== null) {
                bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0);
            }
        });
        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));
        let nilaiRaporPTS = null,
            nilaiRaporPAS = null,
            deskripsiPTS = null,
            deskripsiPAS = null;

        // Helper: Ambil konfigurasi kategori nilai
        const getConfigRows = async jenisPenilaian => {
            const [rows] = await db.execute(
                `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
         WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ? 
         AND (kelas_id = ? OR kelas_id IS NULL) 
         ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
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
                    if (nilaiRaporPTS >= config.min_nilai && nilaiRaporPTS <= config.max_nilai) {
                        deskripsiPTS = config.deskripsi;
                        break;
                    }
                }
            }
        }

        // Hitung nilai rapor PAS
        if (jenis_penilaian === 'PAS') {
            const nilaiUH = uhKomponenIds
                .map(id => nilaiMap.get(id))
                .filter(v => v !== undefined && v !== null);
            const rataUH =
                nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
            const [ptsRaporRows] = await db.execute(
                `SELECT nilai_rapor FROM nilai_rapor 
         WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                [siswaIdNum, mapelIdNum, semesterId, semester]
            );
            const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;
            const nilaiPAS = pasKomponen ? nilaiMap.get(pasKomponen.id_komponen) || 0 : 0;
            const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
            const bobotPTSForPAS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
            const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
            const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

            // Validasi bobot
            if (bobotRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bobot penilaian belum dikonfigurasi. Silakan hubungi admin.',
                });
            }
            if (Math.abs(totalBobot - 100) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Total bobot harus 100%. Saat ini: ${totalBobot.toFixed(2)}%`,
                });
            }

            // Hitung nilai rapor PAS dengan bobot
            if (totalBobot > 0) {
                const nilaiRapor =
                    (rataUH * totalBobotUH + nilaiPTSForPAS * bobotPTSForPAS + nilaiPAS * bobotPAS) /
                    totalBobot;
                nilaiRaporPAS = Math.round(nilaiRapor);
                const configRowsPAS = await getConfigRows('PAS');
                for (const config of configRowsPAS) {
                    if (nilaiRaporPAS >= config.min_nilai && nilaiRaporPAS <= config.max_nilai) {
                        deskripsiPAS = config.deskripsi;
                        break;
                    }
                }
            }
        }

        // Step 8: Simpan rapor
        if (jenis_penilaian === 'PTS' && nilaiRaporPTS !== null) {
            await db.execute(
                `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'PTS', ?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
                [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPTS, deskripsiPTS, userId]
            );
        }
        if (jenis_penilaian === 'PAS' && nilaiRaporPAS !== null) {
            await db.execute(
                `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
                [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPAS, deskripsiPAS, userId]
            );
        }

        res.json({
            success: true,
            message: `Nilai ${jenis_penilaian} berhasil disimpan`,
            nilai_rapor_pts: nilaiRaporPTS,
            deskripsi_pts: deskripsiPTS,
            nilai_rapor_pas: nilaiRaporPAS,
            deskripsi_pas: deskripsiPAS,
            perubahan: perubahanList,
            jumlah_perubahan: perubahanList.length,
        });
    } catch (err) {
        console.error('Error simpanNilaiKomponenBanyak:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + err.message });
    }
};

// GET: Download template import nilai GBS
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
            `SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const semester = taRows[0].semester;

        // Step 2: Validasi akses guru ke mapel + kelas
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );
        if (valid.length === 0) {
            return res
                .status(403)
                .json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        // Step 3: Ambil nama mapel dan kelas
        const [mapelRow] = await db.execute(
            `SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
            [mapelId]
        );
        const namaMapel = mapelRow[0]?.nama_mapel || 'Mata Pelajaran';

        const [kelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelasId]);
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
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`
        );

        // Step 6: Ambil jenis penilaian aktif
        const [statusRows] = await db.execute(
            `SELECT status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        const status_pts = statusRows[0]?.status_pts || 'nonaktif';
        const status_pas = statusRows[0]?.status_pas || 'nonaktif';
        const jenis_penilaian = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : 'PTS';

        // Build Excel workbook dengan ExcelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        const colors = {
            primary: 'FFE8690A',
            primaryDark: 'FFC95B08',
            blue: 'FF4A90E2',
            white: 'FFFFFFFF',
            black: 'FF000000',
            gray: 'FF666666',
            lightOrange: 'FFFFF5E6',
            lightBlue: 'FFE8F4FD',
            border: 'FFCCCCCC',
        };

        const thinBorder = {
            top: { style: 'thin', color: { argb: colors.border } },
            left: { style: 'thin', color: { argb: colors.border } },
            bottom: { style: 'thin', color: { argb: colors.border } },
            right: { style: 'thin', color: { argb: colors.border } },
        };

        const worksheet = workbook.addWorksheet('Template Input Nilai');

        // Header langsung di row 1
        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', ...komponenRows.map(k => k.nama_komponen)];
        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;

        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.white } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = thinBorder;

            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colIdx < 4 ? colors.blue : colors.primary },
            };
        });

        // Data siswa mulai dari row 2
        siswaRows.forEach((siswa, index) => {
            const rowNum = 2 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 22;

            const isEvenRow = index % 2 === 0;

            const identitasData = [index + 1, siswa.nis || '', siswa.nisn || '', siswa.nama_lengkap || ''];

            identitasData.forEach((val, colIdx) => {
                const cell = dataRow.getCell(colIdx + 1);
                cell.value = val;
                cell.font = { name: 'Calibri', size: 11, bold: colIdx === 3 };
                cell.alignment = { vertical: 'middle', horizontal: colIdx === 3 ? 'left' : 'center' };
                cell.border = thinBorder;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white },
                };
                cell.protection = { locked: true };
            });

            komponenRows.forEach((komp, kompIdx) => {
                const cell = dataRow.getCell(5 + kompIdx);
                cell.value = '';
                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = thinBorder;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? colors.lightOrange : colors.white },
                };

                cell.dataValidation = {
                    type: 'whole',
                    operator: 'between',
                    formulae: [0, 100],
                    showErrorMessage: true,
                    errorTitle: 'Nilai Tidak Valid',
                    error: 'Nilai harus berupa angka antara 0 sampai 100',
                    showInputMessage: true,
                    promptTitle: 'Input Nilai',
                    prompt: 'Masukkan nilai antara 0-100',
                };
            });
        });

        // Empty state mulai dari row 2
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A2:H2');
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: colors.gray } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightOrange } };
            emptyCell.border = thinBorder;
        }

        // Set column width
        worksheet.columns = [
            { width: 6 },
            { width: 15 },
            { width: 15 },
            { width: 30 },
            ...komponenRows.map(() => ({ width: 12 })),
        ];

        // Freeze hanya 1 row (header)
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Sheet petunjuk
        const petunjukSheet = workbook.addWorksheet('Petunjuk');
        petunjukSheet.columns = [{ width: 90 }];

        const petunjukContent = [
            { text: 'PETUNJUK PENGISIAN TEMPLATE', bold: true, size: 14, color: colors.primary },
            { text: '' },
            {
                text: `${namaMapel}  |  ${namaKelas}  |  ${jenis_penilaian}  |  ${siswaRows.length} siswa`,
                size: 11,
                color: colors.primaryDark,
            },
            { text: '' },
            { text: 'ATURAN PENTING:', bold: true, size: 11 },
            { text: '1. JANGAN mengubah kolom No, NIS, NISN, dan Nama Siswa' },
            { text: '2. Isi nilai pada kolom komponen (UH1-5, PTS, PAS) dengan angka 0-100' },
            { text: '3. Kosongkan sel jika nilai belum ada/belum diinput' },
            { text: '' },
            {
                text: `CATATAN: Saat ini periode ${jenis_penilaian} sedang aktif.`,
                bold: true,
                size: 11,
                color: colors.primaryDark,
            },
            {
                text:
                    jenis_penilaian === 'PTS'
                        ? '→ Hanya kolom PTS yang akan diimport (UH dan PAS diabaikan)'
                        : '→ Hanya kolom UH dan PAS yang akan diimport (PTS diabaikan)',
            },
            { text: '' },
            { text: 'CARA IMPORT:', bold: true, size: 11 },
            { text: '1. Isi template ini dengan nilai siswa' },
            { text: '2. Simpan file (jangan ubah format .xlsx)' },
            { text: '3. Upload kembali melalui menu "Import Nilai"' },
            { text: '' },
            { text: 'E-Rapor SDIT Ulil Albab Batam © 2026', size: 9, color: colors.gray },
        ];

        petunjukContent.forEach((item, idx) => {
            const cell = petunjukSheet.getCell(`A${idx + 1}`);
            cell.value = item.text;
            cell.font = {
                name: 'Calibri',
                size: item.size || 11,
                bold: item.bold || false,
                color: { argb: item.color || colors.black },
            };
            cell.alignment = { vertical: 'middle' };
            petunjukSheet.getRow(idx + 1).height = item.bold ? 22 : 18;
        });

        // Generate & send
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}_${namaKelas.replace(
            /[^a-z0-9]/gi,
            '_'
        )}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        console.error('Error downloadTemplateNilaiGBS:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message,
        });
    }
};

// POST: Import nilai dari Excel GBS dengan 5 human error prevention
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
            `SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
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
            `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );
        if (valid.length === 0) {
            return res
                .status(403)
                .json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        // BARU: Step 2.5 - Cek konfigurasi penilaian
        const statusCheck = await cekStatusKategoriAkademikGBS(mapelId, kelasId, semesterId);
        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(`• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)`);
            }
            if (!statusCheck.kategori.pts.covered || !statusCheck.kategori.pas.covered) {
                const celah = [
                    ...statusCheck.kategori.pts.celah.map(c => `PTS: ${c}`),
                    ...statusCheck.kategori.pas.celah.map(c => `PAS: ${c}`),
                ];
                masalah.push(`• Kategori nilai rapor belum lengkap (${celah.length} celah)`);
            }

            return res.status(400).json({
                success: false,
                message:
                    `Konfigurasi Penilaian Belum Lengkap\n\n` +
                    `Masalah yang ditemukan:\n${masalah.join('\n')}\n\n` +
                    `Solusi:\n` +
                    `1. Buka menu "Atur Penilaian"\n` +
                    `2. Atur bobot komponen agar total 100%\n` +
                    `3. Atur kategori nilai rapor agar rentang 0-100 tercover\n` +
                    `4. Setelah selesai, Anda dapat import nilai dari Excel`,
                code: ERROR_CODES.KONFIGURASI_BELUM_LENGKAP,
                data: {
                    bobot: statusCheck.bobot,
                    kategori: statusCheck.kategori,
                },
            });
        }

        // Step 3: Baca file Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong atau format tidak valid. Minimal harus ada header dan 1 baris data.',
            });
        }

        // Step 4: Cari header row
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
                message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".',
            });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;

        // Human error #1: Validasi file kosong total
        let adaBarisDataValid = false;
        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (row && row.length > 0 && row.some(cell => String(cell).trim() !== '')) {
                adaBarisDataValid = true;
                break;
            }
        }

        if (!adaBarisDataValid) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel kosong - tidak ada data sama sekali.\n\n` +
                    `File hanya berisi header tanpa baris data siswa.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Pastikan ada baris data siswa\n` +
                    `3. Isi nilai pada kolom komponen\n` +
                    `4. Upload kembali file yang sudah diisi`,
                data: {
                    total_baris: 0,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: 0,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [
                        {
                            row: 0,
                            message: 'File Excel kosong. Tidak ada baris data siswa.',
                        },
                    ],
                },
            });
        }

        // Step 5: Validasi kolom wajib
        const requiredColumns = ['NIS', 'Nama Siswa'];
        const missingColumns = requiredColumns.filter(col =>
            !headers.some(h => h.toLowerCase() === col.toLowerCase())
        );

        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`,
            });
        }

        const findColIndex = name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');

        // Human error #2: Validasi data siswa kosong
        let adaDataSiswa = false;
        let barisDenganDataSiswa = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const nama = String(row[idxNama] || '').trim();

            if (nis || nama) {
                adaDataSiswa = true;
                barisDenganDataSiswa++;
            }
        }

        if (!adaDataSiswa) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel tidak valid - tidak ada data siswa.\n\n` +
                    `File berisi baris kosong tanpa data NIS atau Nama Siswa.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Pastikan kolom NIS dan Nama Siswa terisi\n` +
                    `3. Isi nilai pada kolom komponen\n` +
                    `4. Upload kembali file yang sudah diisi`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [
                        {
                            row: 0,
                            message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.',
                        },
                    ],
                },
            });
        }

        // Step 6: Ambil komponen dari header
        const komponenHeaders = headers.slice(4);
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`
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
                message: 'Tidak ada kolom komponen penilaian yang valid.',
            });
        }

        // Step 7: Filter komponen berdasarkan periode
        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
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
                message: `Tidak ada komponen yang valid untuk periode ${jenis_penilaian}.`,
            });
        }

        // Human error #3: Validasi file tanpa nilai
        let adaNilaiDiFile = false;
        let barisDenganNilai = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            let barisIniPunyaNilai = false;

            for (const kv of komponenValid) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();

                // Nilai 0 adalah nilai valid, bukan kosong
                if (nilaiStr && nilaiStr !== '-' && nilaiStr !== '') {
                    adaNilaiDiFile = true;
                    barisIniPunyaNilai = true;
                }
            }

            if (barisIniPunyaNilai) barisDenganNilai++;
        }

        if (!adaNilaiDiFile) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel tidak valid - tidak ada nilai yang diisi.\n\n` +
                    `File hanya berisi data identitas siswa (Nama, NIS, NISN) tanpa nilai komponen.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Isi kolom komponen nilai (${komponenBolehUpdate
                        .map(kv => kv.header)
                        .join(', ')}) dengan angka 0-100\n` +
                    `3. Upload kembali file yang sudah diisi\n\n` +
                    `Periode aktif: ${jenis_penilaian}`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [
                        {
                            row: 0,
                            message: 'File Excel tidak berisi nilai. Hanya data identitas siswa yang terdeteksi.',
                        },
                    ],
                },
            });
        }

        // Step 8: Ambil data siswa
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

        // Step 9: Proses data per baris
        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;

        // Human error #4: Track duplikasi NIS
        const nisDiproses = new Set();
        const nisDuplikat = [];

        // Human error #5: Track duplikasi NISN
        const nisnDiproses = new Set();
        const nisnDuplikat = [];

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

            // Human error #4: Cek duplikasi NIS
            if (nisDiproses.has(nis)) {
                nisDuplikat.push({ row: i + 1, nis, nama: namaSiswa });
                warnings.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: NIS "${nis}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.`,
                });
                skippedCount++;
                continue;
            }
            nisDiproses.add(nis);

            // Human error #5: Cek duplikasi NISN
            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                if (nisnExcel) {
                    if (nisnDiproses.has(nisnExcel)) {
                        nisnDuplikat.push({ row: i + 1, nisn: nisnExcel, nama: namaSiswa });
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: NISN "${nisnExcel}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.`,
                        });
                        skippedCount++;
                        continue;
                    }
                    nisnDiproses.add(nisnExcel);
                }
            }

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini`,
                });
                skippedCount++;
                continue;
            }

            // Validasi NISN cocok dengan DB
            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"`,
                    });
                    skippedCount++;
                    continue;
                }
            }

            // Nama boleh duplikat - hanya validasi nama cocok dengan DB
            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < 0.7) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"`,
                        });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.`,
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
                        message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" bukan angka`,
                    });
                    continue;
                }

                if (nilai < 0 || nilai > 100) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": Nilai ${nilai} di luar rentang 0-100`,
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

        // Step 10: Recompute nilai rapor untuk semua siswa yang berhasil diimport
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
                        const nilaiUH = uhKomponenIds
                            .map(id => nilaiSiswa[id])
                            .filter(v => v !== undefined && v !== null);
                        const rataUH =
                            nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

                        const [ptsRaporRows] = await connection.execute(
                            `SELECT nilai_rapor FROM nilai_rapor 
               WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                            [siswaId, mapelId, semesterId, semester]
                        );
                        const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;

                        const nilaiPAS = pasKomponen ? nilaiSiswa[pasKomponen.id_komponen] || 0 : 0;

                        const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap[id] || 0), 0);
                        const bobotPTSForPAS = ptsKomponen ? bobotMap[ptsKomponen.id_komponen] || 0 : 0;
                        const bobotPAS = pasKomponen ? bobotMap[pasKomponen.id_komponen] || 0 : 0;
                        const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

                        if (totalBobot > 0) {
                            const nilaiRapor =
                                (rataUH * totalBobotUH + nilaiPTSForPAS * bobotPTSForPAS + nilaiPAS * bobotPAS) /
                                totalBobot;
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
        let success = true;

        if (successCount > 0) {
            message = `Import berhasil! ${successCount} siswa berhasil diimport dengan ${totalNilaiDisimpan} nilai disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport.';
        }

        if (errors.length > 0) {
            message += `\n\nAda ${errors.length} error yang perlu diperbaiki.`;
        }

        // Tampilkan info NIS duplikat
        if (nisDuplikat.length > 0) {
            const duplikatInfo = nisDuplikat
                .map(d => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`)
                .join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisDuplikat.length} NIS DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });

            message += `\n\nPERHATIAN: ${nisDuplikat.length} NIS duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        // Tampilkan info NISN duplikat
        if (nisnDuplikat.length > 0) {
            const duplikatInfo = nisnDuplikat
                .map(d => `Baris ${d.row} (NISN: ${d.nisn}, ${d.nama})`)
                .join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisnDuplikat.length} NISN DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });

            message += `\n\nPERHATIAN: ${nisnDuplikat.length} NISN duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        message += `\nINFO: Pastikan setiap siswa memiliki NIS dan NISN yang unik di file Excel.`;

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
                periode_aktif: jenis_penilaian,
                nis_duplikat_count: nisDuplikat.length,
                nis_duplikat_detail: nisDuplikat,
                nisn_duplikat_count: nisnDuplikat.length,
                nisn_duplikat_detail: nisnDuplikat,
                baris_dengan_nilai: barisDenganNilai,
                baris_dengan_data_siswa: barisDenganDataSiswa,
                pesan_penting:
                    nisDuplikat.length > 0 || nisnDuplikat.length > 0
                        ? `${nisDuplikat.length + nisnDuplikat.length
                        } duplikasi ditemukan. Hanya data pertama yang diproses.`
                        : null,
            },
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error importNilaiExcelGBS:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport nilai: ' + err.message,
        });
    } finally {
        connection.release();
    }
};

// GET: Cek status konfigurasi penilaian akademik
exports.cekStatusKategoriAkademikGBS = async (req, res) => {
    try {
        const { mapel_id, kelas_id } = req.query;
        const userId = req.user.id;

        if (!mapel_id || !kelas_id || isNaN(Number(mapel_id)) || isNaN(Number(kelas_id))) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id dan kelas_id wajib diisi',
            });
        }

        const mapelId = Number(mapel_id);
        const kelasId = Number(kelas_id);

        // Ambil semester aktif
        const [taRows] = await db.execute(
            `SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );
        if (taRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur',
            });
        }
        const semesterId = taRows[0].id_tahun_ajaran;

        // Validasi akses guru ke mapel + kelas
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
       WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );
        if (valid.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini di kelas ini',
            });
        }

        const statusCheck = await cekStatusKategoriAkademikGBS(mapelId, kelasId, semesterId);

        res.json({
            success: true,
            data: statusCheck,
        });
    } catch (err) {
        console.error('Error cekStatusKategoriAkademikGBS:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengecek status konfigurasi: ' + err.message,
        });
    }
};