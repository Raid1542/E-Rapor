/**
 * Nama File: penilaianNilaiController.js
 * Fungsi: Controller input nilai siswa (ambil, simpan single, simpan batch + hitung rapor).
 *         + Import nilai dari Excel dengan validasi konfigurasi & human error prevention.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// Konstanta untuk kode error
const ERROR_CODES = {
    KONFIGURASI_BELUM_LENGKAP: 'KONFIGURASI_BELUM_LENGKAP'
};

/**
 * Hitung kesamaan string menggunakan Levenshtein Distance untuk toleransi typo nama.
 */
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

/**
 * Cek status konfigurasi penilaian akademik (bobot + kategori rapor).
 */
const cekStatusKategoriAkademikGBS = async (mapelId, kelasId, semesterId) => {
    try {
        const [taRows] = await db.execute(
            `SELECT status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );

        const statusPTS = taRows[0]?.status_pts || 'nonaktif';
        const statusPAS = taRows[0]?.status_pas || 'nonaktif';
        const periodeAktif = statusPTS === 'aktif' ? 'PTS' : statusPAS === 'aktif' ? 'PAS' : null;

        let bobotStatus;
        if (statusPTS === 'aktif') {
            bobotStatus = { total: 100, status: 'lengkap' };
        } else {
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
            bobotStatus = {
                total: totalBobot,
                status: Math.abs(totalBobot - 100) < 0.01 ? 'lengkap' : 'belum_100'
            };
        }

        const [kategoriPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' 
        AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai ASC`,
            [mapelId, semesterId, kelasId, kelasId]
        );

        const [kategoriPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' 
        AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai ASC`,
            [mapelId, semesterId, kelasId, kelasId]
        );

        const cekCelah = (kategoriRows) => {
            const celah = [];
            if (kategoriRows.length === 0) return ['0-100 (belum ada kategori)'];

            const sorted = [...kategoriRows].sort((a, b) => parseFloat(a.min_nilai) - parseFloat(b.min_nilai));
            const firstMin = parseFloat(sorted[0].min_nilai);
            if (firstMin > 0) celah.push(`0-${Math.floor(firstMin - 1)}`);

            for (let i = 0; i < sorted.length - 1; i++) {
                const currentMax = parseFloat(sorted[i].max_nilai);
                const nextMin = parseFloat(sorted[i + 1].min_nilai);
                if (nextMin > currentMax + 1) {
                    celah.push(`${Math.floor(currentMax + 1)}-${Math.floor(nextMin - 1)}`);
                }
            }

            const lastMax = parseFloat(sorted[sorted.length - 1].max_nilai);
            if (lastMax < 100) celah.push(`${Math.floor(lastMax + 1)}-100`);

            return celah;
        };

        const kategoriStatus = {
            pts: { covered: cekCelah(kategoriPTSRows).length === 0, celah: cekCelah(kategoriPTSRows) },
            pas: { covered: cekCelah(kategoriPASRows).length === 0, celah: cekCelah(kategoriPASRows) }
        };

        let configured = false;
        let message = '';
        const masalah = [];

        if (periodeAktif === 'PTS') {
            configured = bobotStatus.status === 'lengkap' && kategoriStatus.pts.covered;
            if (bobotStatus.status !== 'lengkap') masalah.push(`Bobot komponen belum 100% (saat ini: ${bobotStatus.total}%)`);
            if (!kategoriStatus.pts.covered) masalah.push(`Kategori PTS belum lengkap (${kategoriStatus.pts.celah.length} celah)`);
            message = configured ? 'Semua konfigurasi sudah lengkap' : `Ditemukan ${masalah.length} masalah: ${masalah.join('; ')}`;
        } else if (periodeAktif === 'PAS') {
            configured = bobotStatus.status === 'lengkap' && kategoriStatus.pas.covered;
            if (bobotStatus.status !== 'lengkap') masalah.push(`Bobot komponen belum 100% (saat ini: ${bobotStatus.total}%)`);
            if (!kategoriStatus.pas.covered) masalah.push(`Kategori PAS belum lengkap (${kategoriStatus.pas.celah.length} celah)`);
            message = configured ? 'Semua konfigurasi sudah lengkap' : `Ditemukan ${masalah.length} masalah: ${masalah.join('; ')}`;
        } else {
            message = 'Periode penilaian belum aktif';
        }

        return { configured, bobot: bobotStatus, kategori: kategoriStatus, message, periode_aktif: periodeAktif };
    } catch (err) {
        return {
            configured: false,
            bobot: { total: 0, status: 'error' },
            kategori: { pts: { covered: false, celah: ['Error'] }, pas: { covered: false, celah: ['Error'] } },
            message: 'Gagal mengecek status',
            periode_aktif: null
        };
    }
};

/**
 * GET /nilai/:mapelId/:kelasId - Ambil daftar nilai siswa untuk mapel dan kelas tertentu.
 */
exports.getNilaiByMapelAndKelas = async (req, res) => {
    try {
        const { mapelId, kelasId } = req.params;
        const userId = req.user.id;

        if (!mapelId || !kelasId) {
            return res.status(400).json({ success: false, message: 'ID mata pelajaran dan kelas wajib diisi' });
        }

        const [taSemesterRows] = await db.execute(
            `SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`
        );

        if (taSemesterRows.length === 0) {
            return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const { semester, status_pts, status_pas } = taSemesterRows[0];

        let jenisPenilaianAktif = null;
        if (status_pts === 'aktif') jenisPenilaianAktif = 'PTS';
        else if (status_pas === 'aktif') jenisPenilaianAktif = 'PAS';

        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, semesterId]
        );

        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        const [namaKelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelasId]);
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        const [bobotCheck] = await db.execute(
            `SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, semesterId, kelasId]
        );
        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;

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
                jenis_penilaian_aktif: jenisPenilaianAktif,
                bobot_sudah_diatur: bobotSudahDiatur
            });
        }

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);

        const [configPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
            [mapelId, semesterId, kelasId, kelasId]
        );

        const [configPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
            [mapelId, semesterId, kelasId, kelasId]
        );

        const getDeskripsi = (nilai, configRows) => {
            if (nilai === null || nilai === undefined) return null;
            for (const config of configRows) {
                if (nilai >= config.min_nilai && nilai <= config.max_nilai) return config.deskripsi;
            }
            return null;
        };

        const [nilaiRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, jenis_penilaian, is_locked FROM nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
            [mapelId, semesterId, semester]
        );

        const siswaIds = siswaRows.map(s => s.id);
        const placeholders = siswaIds.map(() => '?').join(',');
        const [allNilaiDetail] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
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

        const siswaList = [];
        for (const s of siswaRows) {
            const nilaiMap = nilaiBySiswa.get(s.id) || new Map();
            const nilaiRecord = {};
            komponenRows.forEach(k => { nilaiRecord[k.id_komponen] = nilaiMap.get(k.id_komponen) ?? null; });

            const raporPTS = nilaiRaporPTSMap.get(s.id);
            const raporPAS = nilaiRaporPASMap.get(s.id);

            siswaList.push({
                id: s.id,
                nama: s.nama,
                nis: s.nis,
                nisn: s.nisn,
                nilai: nilaiRecord,
                nilai_rapor_pts: raporPTS?.nilai_rapor ?? null,
                deskripsi_pts: raporPTS ? getDeskripsi(raporPTS.nilai_rapor, configPTSRows) : null,
                is_locked_pts: raporPTS?.is_locked || false,
                nilai_rapor_pas: raporPAS?.nilai_rapor ?? null,
                deskripsi_pas: raporPAS ? getDeskripsi(raporPAS.nilai_rapor, configPASRows) : null,
                is_locked_pas: raporPAS?.is_locked || false
            });
        }

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            jenis_penilaian_aktif: jenisPenilaianAktif,
            bobot_sudah_diatur: bobotSudahDiatur
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai: ' + err.message });
    }
};

/**
 * POST /nilai - Simpan nilai untuk satu komponen penilaian.
 */
exports.simpanNilai = async (req, res) => {
    try {
        const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
        const user_id = req.user.id;

        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        }

        if (nilai < 0 || nilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100' });
        }

        const [taSemesterRows] = await db.execute(`SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`);
        if (taSemesterRows.length === 0) {
            return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;

        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id IN (SELECT kelas_id FROM siswa_kelas WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?) AND tahun_ajaran_id = ?`,
            [user_id, mapel_id, siswa_id, tahunAjaranIndukId, semesterId]
        );

        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        await db.execute(
            `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW()) 
        ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
            [siswa_id, mapel_id, komponen_id, nilai, semesterId]
        );

        res.json({ success: true, message: 'Nilai berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + err.message });
    }
};

/**
 * PUT /nilai/:mapelId/:siswaId - Simpan nilai untuk banyak komponen sekaligus dan hitung nilai rapor otomatis.
 */
exports.simpanNilaiKomponenBanyak = async (req, res) => {
    try {
        const { mapelId, siswaId } = req.params;
        const { nilai } = req.body;
        const mapelIdNum = parseInt(mapelId, 10);
        const siswaIdNum = parseInt(siswaId, 10);

        if (isNaN(mapelIdNum) || isNaN(siswaIdNum)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }

        const userId = req.user.id;
        const jenisPenilaian = req.jenis_penilaian;

        if (!jenisPenilaian) {
            return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif' });
        }

        const [taSemesterRows] = await db.execute(`SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`);
        if (taSemesterRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const semester = taSemesterRows[0].semester;

        const [valid] = await db.execute(`SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`, [userId, mapelIdNum, semesterId]);
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        const [lockedRows] = await db.execute(
            `SELECT is_locked FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [siswaIdNum, mapelIdNum, semesterId, semester, jenisPenilaian]
        );
        if (lockedRows.length > 0 && lockedRows[0].is_locked) {
            return res.status(403).json({ success: false, message: `Nilai ${jenisPenilaian} sudah dikunci dan tidak dapat diubah.` });
        }

        const [siswaAktifRows] = await db.execute(
            `SELECT sk.kelas_id, s.status FROM siswa_kelas sk 
        JOIN siswa s ON sk.siswa_id = s.id_siswa 
        JOIN pembelajaran p ON sk.kelas_id = p.kelas_id 
        WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ? AND sk.id_tahun_ajaran_induk = ? 
        LIMIT 1`,
            [siswaIdNum, userId, mapelIdNum, semesterId, indukId]
        );

        if (siswaAktifRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Siswa tidak aktif di kelas yang Anda ajar' });
        }
        if (siswaAktifRows[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: `Siswa tidak aktif (status: ${siswaAktifRows[0].status}). Nilai tidak dapat diubah.` });
        }

        const kelasIdNum = siswaAktifRows[0].kelas_id;
        const statusCheck = await cekStatusKategoriAkademikGBS(mapelIdNum, kelasIdNum, semesterId);

        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(`• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)\n  Silakan atur di menu "Atur Penilaian" > "Bobot Penilaian"`);
            }
            if (!statusCheck.kategori.pts.covered || !statusCheck.kategori.pas.covered) {
                const celah = [...statusCheck.kategori.pts.celah.map(c => `PTS: ${c}`), ...statusCheck.kategori.pas.celah.map(c => `PAS: ${c}`)];
                masalah.push(`• Kategori nilai rapor belum lengkap\n  Celah rentang: ${celah.join(', ')}\n  Silakan atur di menu "Atur Penilaian" > "Kategori Akademik"`);
            }
            return res.status(400).json({
                success: false,
                message: `Konfigurasi Penilaian Belum Lengkap\n\nMasalah yang ditemukan:\n${masalah.join('\n\n')}\n\nSolusi:\n1. Buka menu "Atur Penilaian"\n2. Atur bobot komponen agar total 100%\n3. Atur kategori nilai rapor agar rentang 0-100 tercover\n4. Setelah selesai, Anda dapat menginput nilai siswa`,
                code: ERROR_CODES.KONFIGURASI_BELUM_LENGKAP,
                data: { bobot: statusCheck.bobot, kategori: statusCheck.kategori }
            });
        }

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);
        const validKomponenIds = new Set(komponenRows.map(k => k.id_komponen));

        // Filter nilai yang diizinkan berdasarkan periode aktif (mengabaikan yang lain)
        const filteredNilai = {};
        if (jenisPenilaian === 'PTS') {
            const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
            if (ptsKomponen && nilai[ptsKomponen.id_komponen] !== undefined) {
                filteredNilai[ptsKomponen.id_komponen] = nilai[ptsKomponen.id_komponen];
            }
        } else if (jenisPenilaian === 'PAS') {
            const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
            const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

            for (const [idStr, val] of Object.entries(nilai)) {
                const idNum = parseInt(idStr, 10);
                if (uhKomponenIds.includes(idNum) || (pasKomponen && idNum === pasKomponen.id_komponen)) {
                    filteredNilai[idStr] = val;
                }
            }
        }

        // Validasi komponen yang difilter
        for (const komponenIdStr of Object.keys(filteredNilai)) {
            if (!validKomponenIds.has(parseInt(komponenIdStr, 10))) {
                return res.status(400).json({ success: false, message: `Komponen ID ${komponenIdStr} tidak valid` });
            }
        }

        const [existingNilaiRows] = await db.execute(`SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`, [siswaIdNum, mapelIdNum, semesterId]);
        const existingNilaiMap = new Map();
        existingNilaiRows.forEach(row => existingNilaiMap.set(row.komponen_id, row.nilai));

        // Hapus komponen yang di-set null (hanya pada filteredNilai)
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(filteredNilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if ((nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') && existingNilaiMap.has(komponenId)) {
                await db.execute(`DELETE FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?`, [siswaIdNum, mapelIdNum, komponenId, semesterId]);
            }
        }

        let hasChanges = false;
        const perubahanList = [];

        for (const [komponenIdStr, nilaiSiswa] of Object.entries(filteredNilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            const nilaiBaru = nilaiSiswa !== null && nilaiSiswa !== undefined && nilaiSiswa !== '' ? Math.round(parseFloat(nilaiSiswa)) : null;
            const nilaiLama = existingNilaiMap.get(komponenId) ?? null;

            if (nilaiBaru !== nilaiLama) {
                hasChanges = true;
                perubahanList.push({
                    komponen: komponenRows.find(k => k.id_komponen === komponenId)?.nama_komponen || komponenId,
                    lama: nilaiLama,
                    baru: nilaiBaru
                });
            }
        }

        if (!hasChanges) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data pada komponen yang diizinkan', no_changes: true });
        }

        for (const [komponenIdStr, nilaiSiswa] of Object.entries(filteredNilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') continue;

            const parsed = parseFloat(nilaiSiswa);
            if (isNaN(parsed) || !Number.isInteger(parsed)) {
                return res.status(400).json({ success: false, message: `Nilai harus bilangan bulat. Diterima: ${nilaiSiswa}` });
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

        // Hitung nilai rapor
        const [nilaiRows] = await db.execute(`SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`, [siswaIdNum, mapelIdNum, semesterId]);
        const [bobotRows] = await db.execute(`SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`, [mapelIdNum, semesterId, kelasIdNum]);

        const nilaiMap = new Map();
        nilaiRows.forEach(row => nilaiMap.set(row.komponen_id, row.nilai || 0));

        const bobotMap = new Map();
        bobotRows.forEach(row => {
            const existing = bobotMap.get(row.komponen_id);
            if (!existing || row.kelas_id !== null) {
                bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0);
            }
        });

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        let nilaiRaporPTS = null, deskripsiPTS = null, nilaiRaporPAS = null, deskripsiPAS = null;

        const getConfigRows = async (jenis) => {
            const [rows] = await db.execute(
                `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ? AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`,
                [mapelIdNum, semesterId, jenis, kelasIdNum, kelasIdNum]
            );
            return rows;
        };

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

        if (jenisPenilaian === 'PAS') {
            const nilaiUH = uhKomponenIds.map(id => nilaiMap.get(id)).filter(v => v !== undefined && v !== null);
            const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

            const [ptsRaporRows] = await db.execute(`SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`, [siswaIdNum, mapelIdNum, semesterId, semester]);
            const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;
            const nilaiPAS = pasKomponen ? nilaiMap.get(pasKomponen.id_komponen) || 0 : 0;

            const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
            const bobotPTSForPAS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
            const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
            const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

            if (bobotRows.length === 0) {
                return res.status(400).json({ success: false, message: 'Bobot penilaian belum dikonfigurasi. Silakan hubungi admin.' });
            }
            if (Math.abs(totalBobot - 100) > 0.01) {
                return res.status(400).json({ success: false, message: `Total bobot harus 100%. Saat ini: ${totalBobot.toFixed(2)}%` });
            }

            if (totalBobot > 0) {
                nilaiRaporPAS = Math.round((rataUH * totalBobotUH + nilaiPTSForPAS * bobotPTSForPAS + nilaiPAS * bobotPAS) / totalBobot);
                const configRowsPAS = await getConfigRows('PAS');
                for (const config of configRowsPAS) {
                    if (nilaiRaporPAS >= config.min_nilai && nilaiRaporPAS <= config.max_nilai) {
                        deskripsiPAS = config.deskripsi;
                        break;
                    }
                }
            }
        }

        if (jenisPenilaian === 'PTS' && nilaiRaporPTS !== null) {
            await db.execute(`INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, 'PTS', ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`, [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPTS, deskripsiPTS, userId]);
        }
        if (jenisPenilaian === 'PAS' && nilaiRaporPAS !== null) {
            await db.execute(`INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`, [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPAS, deskripsiPAS, userId]);
        }

        res.json({
            success: true,
            message: `Nilai ${jenisPenilaian} berhasil disimpan`,
            nilai_rapor_pts: nilaiRaporPTS,
            deskripsi_pts: deskripsiPTS,
            nilai_rapor_pas: nilaiRaporPAS,
            deskripsi_pas: deskripsiPAS,
            perubahan: perubahanList,
            jumlah_perubahan: perubahanList.length
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + err.message });
    }
};

/**
 * GET /nilai/template - Download template import nilai GBS.
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

        const [taRows] = await db.execute(`SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`);
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const semester = taRows[0].semester;
        const statusPTS = taRows[0].status_pts || 'nonaktif';
        const statusPAS = taRows[0].status_pas || 'nonaktif';

        const [valid] = await db.execute(`SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`, [userId, mapelId, kelasId, semesterId]);
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        const [mapelRow] = await db.execute(`SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`, [mapelId]);
        const namaMapel = mapelRow[0]?.nama_mapel || 'Mata Pelajaran';

        const [kelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelasId]);
        const namaKelas = kelasRow[0]?.nama_kelas || 'Kelas';

        const [siswaRows] = await db.execute(`SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap FROM siswa s INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif' ORDER BY s.nama_lengkap ASC`, [kelasId, indukId]);

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`);

        // Filter komponen berdasarkan periode aktif
        let komponenUntukTemplate = [];
        let jenisPenilaian = '';

        if (statusPTS === 'aktif') {
            komponenUntukTemplate = komponenRows.filter(k => k.nama_komponen.toUpperCase() === 'PTS');
            jenisPenilaian = 'PTS';
        } else if (statusPAS === 'aktif') {
            komponenUntukTemplate = komponenRows.filter(k => {
                const namaUpper = k.nama_komponen.toUpperCase();
                return /^UH[\s\-_]*\d+$/i.test(namaUpper) || namaUpper === 'PAS';
            });
            jenisPenilaian = 'PAS';
        } else {
            return res.status(400).json({ success: false, message: 'Periode penilaian belum aktif' });
        }

        // Ambil nilai yang sudah ada di database untuk di-pre-fill ke template
        const siswaIds = siswaRows.map(s => s.id_siswa);
        let existingNilaiMap = {};
        if (siswaIds.length > 0) {
            const placeholders = siswaIds.map(() => '?').join(',');
            const [existingNilaiRows] = await db.execute(
                `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
                [mapelId, semesterId, ...siswaIds]
            );

            existingNilaiRows.forEach(row => {
                if (!existingNilaiMap[row.siswa_id]) {
                    existingNilaiMap[row.siswa_id] = {};
                }
                existingNilaiMap[row.siswa_id][row.komponen_id] = row.nilai;
            });
        }

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
            border: 'FFCCCCCC'
        };
        const thinBorder = {
            top: { style: 'thin', color: { argb: colors.border } },
            left: { style: 'thin', color: { argb: colors.border } },
            bottom: { style: 'thin', color: { argb: colors.border } },
            right: { style: 'thin', color: { argb: colors.border } }
        };

        const worksheet = workbook.addWorksheet('Template Input Nilai');

        // Headers hanya berisi kolom yang relevan (Dinamis)
        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', ...komponenUntukTemplate.map(k => k.nama_komponen)];
        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;

        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.white } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = thinBorder;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colIdx < 4 ? colors.blue : colors.primary } };
        });

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
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white } };
                cell.protection = { locked: true };
            });

            komponenUntukTemplate.forEach((komp, kompIdx) => {
                const cell = dataRow.getCell(5 + kompIdx);

                // Pre-fill: Masukkan nilai yang sudah ada dari database. Jika belum ada, biarkan kosong
                const existingNilai = existingNilaiMap[siswa.id_siswa]?.[komp.id_komponen];
                cell.value = existingNilai !== undefined ? existingNilai : '';

                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEvenRow ? colors.lightOrange : colors.white } };
                cell.dataValidation = {
                    type: 'whole',
                    operator: 'between',
                    formulae: [0, 100],
                    showErrorMessage: true,
                    errorTitle: 'Nilai Tidak Valid',
                    error: 'Nilai harus berupa angka antara 0 sampai 100',
                    showInputMessage: true,
                    promptTitle: 'Input Nilai',
                    prompt: 'Masukkan nilai antara 0-100. Kosongkan jika belum ada nilai.'
                };
            });
        });

        if (siswaRows.length === 0) {
            const lastCol = String.fromCharCode(65 + 4 + komponenUntukTemplate.length);
            worksheet.mergeCells(`A2:${lastCol}2`);
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: colors.gray } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightOrange } };
            emptyCell.border = thinBorder;
        }

        worksheet.columns = [{ width: 6 }, { width: 15 }, { width: 15 }, { width: 30 }, ...komponenUntukTemplate.map(() => ({ width: 12 }))];
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Sheet petunjuk
        const petunjukSheet = workbook.addWorksheet('PENTING_BACA_INI');
        petunjukSheet.columns = [{ width: 100 }];

        const petunjukContent = [
            { text: `⚠️ PETUNJUK PENGISIAN TEMPLATE - PERIODE ${jenisPenilaian}`, bold: true, size: 14, color: colors.primary },
            { text: '' },
            { text: `${namaMapel}  |  ${namaKelas}  |  ${siswaRows.length} siswa`, size: 11, color: colors.primaryDark },
            { text: '' },
            { text: 'ATURAN WAJIB:', bold: true, size: 12, color: colors.primaryDark },
            { text: '1. JANGAN mengubah kolom No, NIS, NISN, dan Nama Siswa (Kolom terkunci).', bold: true },
            { text: '2. Data angka yang sudah ada di template adalah nilai saat ini di database.', bold: true, color: 'FF166534' },
            { text: '3. Ubah nilai sesuai kebutuhan. KOLOM KOSONG = TIDAK MENGUBAH NILAI LAMA.', bold: true, color: 'FF166534' },
            { text: '4. NILAI BARU AKAN MENIMPA (OVERWRITE) nilai yang sudah ada di database.', bold: true, color: 'FF991B1B' },
            { text: '5. Pastikan minimal ada 1 nilai yang diubah/diisi di seluruh file.', bold: true },
            { text: '' },
            { text: 'CARA IMPORT:', bold: true, size: 12 },
            { text: '1. Ubah nilai pada template ini sesuai kebutuhan.', size: 11 },
            { text: '2. Simpan file (jangan ubah format .xlsx atau nama sheet).', size: 11 },
            { text: '3. Upload kembali melalui menu "Import Nilai" di aplikasi.', size: 11 },
            { text: '' },
            { text: 'E-Rapor SDIT Ulil Albab Batam © 2026', size: 9, color: colors.gray }
        ];

        petunjukContent.forEach((item, idx) => {
            const cell = petunjukSheet.getCell(`A${idx + 1}`);
            cell.value = item.text;
            cell.font = { name: 'Calibri', size: item.size || 11, bold: item.bold || false, color: { argb: item.color || colors.black } };
            cell.alignment = { vertical: 'middle', wrapText: true };
            petunjukSheet.getRow(idx + 1).height = item.bold ? 24 : 18;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_Periode_${jenisPenilaian}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal membuat template: ' + err.message });
    }
};

/**
 * POST /nilai/import - Import nilai dari Excel GBS dengan human error prevention.
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

        const [taRows] = await db.execute(`SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`);
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const semester = taRows[0].semester;
        const jenisPenilaian = taRows[0].status_pts === 'aktif' ? 'PTS' : taRows[0].status_pas === 'aktif' ? 'PAS' : null;

        if (!jenisPenilaian) {
            return res.status(400).json({ success: false, message: 'Periode penilaian belum aktif' });
        }

        const [valid] = await db.execute(`SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`, [userId, mapelId, kelasId, semesterId]);
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        const statusCheck = await cekStatusKategoriAkademikGBS(mapelId, kelasId, semesterId);
        if (!statusCheck.configured) {
            return res.status(400).json({
                success: false,
                message: `Konfigurasi Penilaian Belum Lengkap: ${statusCheck.message}`,
                code: ERROR_CODES.KONFIGURASI_BELUM_LENGKAP,
                data: { bobot: statusCheck.bobot, kategori: statusCheck.kategori }
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({ success: false, message: 'File Excel kosong atau format tidak valid.' });
        }

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i].map(c => String(c).trim().toLowerCase());
            if (row.includes('nis') && row.some(c => c.includes('nama'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({ success: false, message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".' });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;

        const findColIndex = name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`);
        const komponenValid = komponenRows.map(k => ({ header: k.nama_komponen, id: k.id_komponen }));

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        const komponenBolehUpdate = [];
        if (jenisPenilaian === 'PTS') {
            if (ptsKomponen) komponenValid.forEach(kv => { if (kv.id === ptsKomponen.id_komponen) komponenBolehUpdate.push(kv); });
        } else if (jenisPenilaian === 'PAS') {
            komponenValid.forEach(kv => { if (uhKomponenIds.includes(kv.id) || (pasKomponen && kv.id === pasKomponen.id_komponen)) komponenBolehUpdate.push(kv); });
        }

        let adaNilaiDiFile = false;
        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            for (const kv of komponenBolehUpdate) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;
                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr && nilaiStr !== '-' && nilaiStr !== '') {
                    adaNilaiDiFile = true;
                    break;
                }
            }
            if (adaNilaiDiFile) break;
        }

        if (!adaNilaiDiFile) {
            return res.status(400).json({
                success: false,
                message: `File tidak valid: Tidak ada nilai yang diisi.\n\nSistem mendeteksi file hanya berisi identitas siswa tanpa nilai komponen.\nPastikan Anda mengisi minimal 1 kolom nilai (0-100) sebelum mengupload.`
            });
        }

        const [siswaRows] = await db.execute(`SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status FROM siswa s INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`, [kelasId, indukId]);
        const siswaMapByNIS = {};
        siswaRows.forEach(s => { if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s; });

        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;
        let totalNilaiDiupdate = 0;

        const nisDiproses = new Set();

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const namaSiswa = String(row[idxNama] || '').trim();

            if (!nis) {
                if (namaSiswa) warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS kosong untuk "${namaSiswa}". Data dilewati.` });
                skippedCount++;
                continue;
            }

            if (nisDiproses.has(nis)) {
                warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS "${nis}" DUPLIKAT. Hanya data pertama yang diproses.` });
                skippedCount++;
                continue;
            }
            nisDiproses.add(nis);

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({ row: i + 1, message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini.` });
                skippedCount++;
                continue;
            }

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}".` });
                    skippedCount++;
                    continue;
                }
            }

            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < 0.7) {
                        errors.push({ row: i + 1, message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}".` });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({ row: i + 1, message: `Baris ${i + 1}: Nama sedikit berbeda (typo), namun tetap diproses.` });
                    }
                }
            }

            const siswaId = siswa.id_siswa;
            let rowSavedCount = 0;

            for (const kv of komponenBolehUpdate) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();

                if (nilaiStr === '' || nilaiStr === '-') continue;

                const nilai = parseFloat(nilaiStr);
                if (isNaN(nilai)) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" bukan angka valid.` });
                    continue;
                }

                if (nilai < 0 || nilai > 100) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}, Kolom "${kv.header}": Nilai ${nilai} di luar rentang 0-100.` });
                    continue;
                }

                const nilaiBulat = Math.round(nilai);

                const [checkExisting] = await connection.execute(
                    `SELECT 1 FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?`,
                    [siswaId, mapelId, kv.id, semesterId]
                );

                if (checkExisting.length > 0) {
                    totalNilaiDiupdate++;
                }

                await connection.execute(
                    `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                    [siswaId, mapelId, kv.id, nilaiBulat, semesterId, userId]
                );
                rowSavedCount++;
                totalNilaiDisimpan++;
            }

            if (rowSavedCount > 0) successCount++;
            else skippedCount++;
        }

        if (successCount > 0) {
            try {
                const processedSiswaIds = Array.from(nisDiproses).map(nis => siswaMapByNIS[nis]?.id_siswa).filter(Boolean);
                if (processedSiswaIds.length > 0) {
                    const placeholders = processedSiswaIds.map(() => '?').join(',');
                    const [nilaiRows] = await connection.execute(`SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`, [mapelId, semesterId, ...processedSiswaIds]);
                    const [bobotRows] = await connection.execute(`SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`, [mapelId, semesterId, kelasId]);

                    const nilaiBySiswa = {};
                    nilaiRows.forEach(row => {
                        if (!nilaiBySiswa[row.siswa_id]) nilaiBySiswa[row.siswa_id] = {};
                        nilaiBySiswa[row.siswa_id][row.komponen_id] = row.nilai || 0;
                    });

                    const bobotMap = {};
                    bobotRows.forEach(row => {
                        const existing = bobotMap[row.komponen_id];
                        if (!existing || row.kelas_id !== null) bobotMap[row.komponen_id] = parseFloat(row.bobot) || 0;
                    });

                    for (const siswaId of processedSiswaIds) {
                        const nilaiSiswa = nilaiBySiswa[siswaId] || {};

                        if (jenisPenilaian === 'PTS' && ptsKomponen && nilaiSiswa[ptsKomponen.id_komponen] !== undefined) {
                            const nilaiPTS = Math.round(nilaiSiswa[ptsKomponen.id_komponen]);
                            const [configPTSRows] = await connection.execute(`SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`, [mapelId, semesterId, kelasId, kelasId]);
                            let deskripsiPTS = null;
                            for (const config of configPTSRows) {
                                if (nilaiPTS >= config.min_nilai && nilaiPTS <= config.max_nilai) {
                                    deskripsiPTS = config.deskripsi;
                                    break;
                                }
                            }
                            await connection.execute(`INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, 'PTS', ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`, [siswaId, mapelId, kelasId, semesterId, semester, nilaiPTS, deskripsiPTS, userId]);
                        }

                        if (jenisPenilaian === 'PAS') {
                            const nilaiUH = uhKomponenIds.map(id => nilaiSiswa[id]).filter(v => v !== undefined && v !== null);
                            const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                            const [ptsRaporRows] = await connection.execute(`SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`, [siswaId, mapelId, semesterId, semester]);
                            const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;
                            const nilaiPAS = pasKomponen ? nilaiSiswa[pasKomponen.id_komponen] || 0 : 0;

                            const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap[id] || 0), 0);
                            const bobotPTSForPAS = ptsKomponen ? bobotMap[ptsKomponen.id_komponen] || 0 : 0;
                            const bobotPAS = pasKomponen ? bobotMap[pasKomponen.id_komponen] || 0 : 0;
                            const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

                            if (totalBobot > 0) {
                                const nilaiRapor = Math.round((rataUH * totalBobotUH + nilaiPTSForPAS * bobotPTSForPAS + nilaiPAS * bobotPAS) / totalBobot);
                                const [configPASRows] = await connection.execute(`SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY CASE WHEN kelas_id = ? THEN 0 ELSE 1 END, min_nilai DESC`, [mapelId, semesterId, kelasId, kelasId]);
                                let deskripsiPAS = null;
                                for (const config of configPASRows) {
                                    if (nilaiRapor >= config.min_nilai && nilaiRapor <= config.max_nilai) {
                                        deskripsiPAS = config.deskripsi;
                                        break;
                                    }
                                }
                                await connection.execute(`INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`, [siswaId, mapelId, kelasId, semesterId, semester, nilaiRapor, deskripsiPAS, userId]);
                            }
                        }
                    }
                }
            } catch (recalcErr) {
                warnings.push({ row: 0, message: 'Peringatan: Gagal menghitung ulang nilai rapor otomatis. Silakan cek kembali.' });
            }
        }

        await connection.commit();

        let message = '';
        if (successCount > 0) {
            message = `✅ Import berhasil! ${successCount} siswa diproses.\n`;
            message += `📊 Detail: ${totalNilaiDisimpan} nilai disimpan/diperbarui (Termasuk ${totalNilaiDiupdate} nilai lama yang DITIMPA).\n\n`;
            message += `ℹ️ CATATAN PENTING:\n`;
            message += `- Kolom yang Anda kosongkan di Excel TIDAK mengubah nilai lama di database.\n`;
            message += `- Hanya kolom yang diisi dengan angka yang akan diperbarui.`;
        } else {
            message = '⚠️ Tidak ada data nilai yang berhasil diimport. Pastikan Anda mengisi kolom nilai, bukan hanya identitas siswa.';
        }

        if (errors.length > 0) {
            message += `\n\n❌ Ada ${errors.length} error yang menyebabkan beberapa baris dilewati.`;
        }

        res.json({
            success: errors.length === 0 && successCount > 0,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_nilai_disimpan: totalNilaiDisimpan,
                total_nilai_diupdate: totalNilaiDiupdate,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings : null
            }
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Gagal mengimport nilai: ' + err.message });
    } finally {
        connection.release();
    }
};

/**
 * GET /nilai/status-kategori - Cek status konfigurasi penilaian akademik.
 */
exports.cekStatusKategoriAkademikGBS = async (req, res) => {
    try {
        const { mapel_id, kelas_id } = req.query;
        const userId = req.user.id;

        if (!mapel_id || !kelas_id || isNaN(Number(mapel_id)) || isNaN(Number(kelas_id))) {
            return res.status(400).json({ success: false, message: 'mapel_id dan kelas_id wajib diisi' });
        }

        const mapelId = Number(mapel_id);
        const kelasId = Number(kelas_id);

        const [taRows] = await db.execute(`SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1`);
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taRows[0].id_tahun_ajaran;

        const [valid] = await db.execute(`SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`, [userId, mapelId, kelasId, semesterId]);
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mata pelajaran ini di kelas ini' });
        }

        const statusCheck = await cekStatusKategoriAkademikGBS(mapelId, kelasId, semesterId);

        res.json({ success: true, data: statusCheck });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengecek status konfigurasi: ' + err.message });
    }
};

// Export untuk keperluan unit testing
exports._calculateSimilarity = calculateSimilarity;