/**
 * Nama File: nilaiAkademikController.js
 * Fungsi: Controller untuk manajemen nilai akademik siswa (mapel wajib).
 *         Menangani input nilai komponen, perhitungan nilai rapor otomatis,
 *         ekspor data ke Excel, dan import nilai dari Excel.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const nilaiModel = require('../../models/guru_kelas/nilaiModel');
const komponenPenilaianModel = require('../../models/guru_kelas/komponenPenilaianModel');
const konfigurasiNilaiRaporModel = require('../../models/guru_kelas/konfigurasiNilaiRaporModel');
const { isMapelWajibGuruKelas, updateAllNilaiRaporForMapel, getDeskripsiFromKategori } = require('./helpers');

/**
 * Hitung kesamaan string menggunakan Levenshtein Distance.
 */
const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

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

/**
 * Cek status kategori nilai akademik (bobot dan celah rentang).
 */
const cekStatusKategoriAkademik = async (mapelId, kelasId, semesterId, jenisPenilaian) => {
    try {
        const [taRows] = await db.execute(
            `SELECT status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [semesterId]
        );

        const statusPTS = taRows[0]?.status_pts || 'nonaktif';
        const statusPAS = taRows[0]?.status_pas || 'nonaktif';

        let bobotStatus;
        if (statusPTS === 'aktif') {
            bobotStatus = { total: 100, status: 'lengkap' };
        } else {
            const [bobotRows] = await db.execute(
                `SELECT komponen_id, bobot 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)
            ORDER BY kelas_id DESC`,
                [mapelId, kelasId]
            );

            const bobotMap = new Map();
            bobotRows.forEach(b => {
                if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) {
                    bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
                }
            });

            const totalBobot = Array.from(bobotMap.values()).reduce((sum, b) => sum + b, 0);
            bobotStatus = {
                total: totalBobot,
                status: Math.abs(totalBobot - 100) < 0.01 ? 'lengkap' : 'belum_100'
            };
        }

        const [kategoriRows] = await db.execute(
            `SELECT min_nilai, max_nilai 
        FROM konfigurasi_nilai_rapor
        WHERE (mapel_id = ? OR mapel_id IS NULL) 
        AND tahun_ajaran_id = ? 
        AND jenis_penilaian = ? 
        AND is_active = 1
        ORDER BY min_nilai ASC`,
            [mapelId, semesterId, jenisPenilaian]
        );

        const celah = [];
        if (kategoriRows.length === 0) {
            celah.push('0-100 (belum ada kategori)');
        } else {
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
        }

        const kategoriStatus = { covered: celah.length === 0, celah: celah };
        const configured = bobotStatus.status === 'lengkap' && kategoriStatus.covered;

        return { configured, bobot: bobotStatus, kategori: kategoriStatus };
    } catch (err) {
        return { configured: false, bobot: { total: 0, status: 'error' }, kategori: { covered: false, celah: ['Error checking'] } };
    }
};

/**
 * GET /mapel - Ambil daftar mata pelajaran untuk guru kelas.
 */
exports.getMapelForGuruKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const idInduk = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!idInduk || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak lengkap' });
        }

        const [rows] = await db.execute(`
        SELECT mp.id_mata_pelajaran, mp.nama_mapel, mp.kode_mapel, mp.jenis, p.user_id AS pengajar_id,
                CASE WHEN p.user_id = ? AND mp.jenis = 'wajib' THEN TRUE ELSE FALSE END AS bisa_input
        FROM pembelajaran p
        JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
        JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ? AND p.tahun_ajaran_id = ?
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
                    bisa_input: Boolean(r.bisa_input)
                })),
                pilihan: rows.filter(r => r.jenis === 'pilihan').map(r => ({
                    mata_pelajaran_id: r.id_mata_pelajaran,
                    nama_mapel: r.nama_mapel,
                    kode_mapel: r.kode_mapel,
                    jenis: r.jenis,
                    bisa_input: false
                }))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar mata pelajaran: ' + err.message });
    }
};

/**
 * GET /nilai/:mapelId - Ambil data nilai berdasarkan mata pelajaran.
 */
exports.getNilaiByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenisPenilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenisPenilaian) {
            return res.status(400).json({ success: false, message: 'Data konteks penilaian tidak lengkap' });
        }

        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        const kelasId = kelasRow[0].kelas_id;

        const [mapelDiKelas] = await db.execute(
            `SELECT id FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [kelasId, mapelId, semesterId]
        );
        if (mapelDiKelas.length === 0) return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });

        const [mapelDetail] = await db.execute(`SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?`, [mapelId]);
        const bisaInput = (mapelDetail[0]?.jenis || 'wajib') === 'wajib';

        const [namaKelasRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelasId]);
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        const [bobotCheck] = await db.execute(
            `SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, kelasId]
        );
        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap 
        FROM siswa s 
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif' 
        ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                siswaList: [],
                komponen: [],
                kelas: kelasNama,
                bisaInput,
                bobotSudahDiatur
            });
        }

        const siswaIds = siswaRows.map(s => s.id_siswa);
        const placeholders = siswaIds.map(() => '?').join(',');

        const [nilaiRows] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ? AND siswa_id IN (${placeholders})`,
            [mapelId, semesterId, ...siswaIds]
        );
        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);

        const [kategoriPTSRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND is_active = 1 ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );
        const [kategoriPASRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND is_active = 1 ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );
        const [allRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, jenis_penilaian FROM nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND siswa_id IN (${placeholders})`,
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
            const pasData = pasRaporMap.get(s.id_siswa);

            return {
                id: s.id_siswa,
                nama: s.nama_lengkap,
                nis: s.nis,
                nisn: s.nisn,
                nilai_rapor_pts: ptsData?.nilai ?? null,
                deskripsi_pts: ptsData ? getDeskripsiFromKategori(ptsData.nilai, kategoriPTSRows) : '',
                nilai_rapor_pas: pasData?.nilai ?? null,
                deskripsi_pas: pasData ? getDeskripsiFromKategori(pasData.nilai, kategoriPASRows) : '',
                nilai: { ...nilai }
            };
        });

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            bisaInput,
            bobotSudahDiatur
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai: ' + err.message });
    }
};

/**
 * PUT /nilai-komponen/:mapelId/:siswaId - Update nilai komponen siswa.
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
            return res.status(400).json({ success: false, message: 'Data konteks tidak lengkap' });
        }

        const [siswaStatus] = await db.execute(`SELECT status FROM siswa WHERE id_siswa = ?`, [siswaId]);
        if (siswaStatus.length === 0) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        if (siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai tidak dapat diubah.` });
        }

        const [mapelCheck] = await db.execute(`SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?`, [mapelId]);
        if (mapelCheck[0]?.jenis === 'pilihan') {
            const [pengajarCheck] = await db.execute(
                `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                [userId, mapelId, semesterId]
            );
            if (pengajarCheck.length === 0) return res.status(403).json({ success: false, message: 'Akses ditolak: Anda bukan pengajar mapel pilihan ini.' });
        } else {
            if (!await isMapelWajibGuruKelas(userId, mapelId, semesterId)) {
                return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya untuk mapel wajib yang Anda kelola.' });
            }
        }

        const [gkRows] = await db.execute(`SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`, [userId, semesterId]);
        if (gkRows.length === 0) return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan' });
        const kelasId = gkRows[0].kelas_id;

        const statusCheck = await cekStatusKategoriAkademik(mapelId, kelasId, semesterId, jenis);
        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(`• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)\n  Silakan atur di menu "Atur Penilaian" > "Bobot Akademik"`);
            }
            if (!statusCheck.kategori.covered) {
                masalah.push(`• Kategori nilai rapor belum lengkap\n  Celah rentang: ${statusCheck.kategori.celah.join(', ')}\n  Silakan atur di menu "Atur Penilaian" > "Kategori Akademik"`);
            }

            return res.status(400).json({
                success: false,
                message: `Konfigurasi Penilaian Belum Lengkap\n\nMapel ID: ${mapelId} | Periode: ${jenis}\n\nMasalah yang ditemukan:\n${masalah.join('\n\n')}\n\nSolusi:\n1. Buka menu "Atur Penilaian"\n2. Atur bobot komponen agar total 100%\n3. Atur kategori nilai rapor agar rentang 0-100 tercover\n4. Setelah selesai, Anda dapat menginput nilai siswa`,
                code: 'KONFIGURASI_BELUM_LENGKAP',
                data: { bobot: statusCheck.bobot, kategori: statusCheck.kategori, jenis_penilaian: jenis }
            });
        }

        const komponenList = await komponenPenilaianModel.getAllKomponen();
        const uhKomponenIds = komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        if (jenis === 'PTS') {
            for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
                const komponenId = parseInt(komponenIdStr, 10);
                if (nilaiSiswa == null) continue;
                if (ptsKomponen && komponenId !== ptsKomponen.id_komponen) {
                    return res.status(400).json({ success: false, message: `Periode PTS aktif. Hanya nilai ${ptsKomponen.nama_komponen} yang boleh diisi.` });
                }
            }
        }

        let savedCount = 0;
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (jenis === 'PAS' && ptsKomponen && komponenId === ptsKomponen.id_komponen) continue;
            if (jenis === 'PTS' && pasKomponen && komponenId === pasKomponen.id_komponen) continue;

            let nilaiBulat = null;
            if (nilaiSiswa != null && nilaiSiswa !== '') {
                const strNilai = String(nilaiSiswa).trim();
                if (strNilai.includes('.') || strNilai.includes(',')) {
                    return res.status(400).json({ success: false, message: `Nilai harus berupa bilangan bulat. Diterima: ${nilaiSiswa}` });
                }
                const parsedNilai = parseInt(strNilai, 10);
                if (isNaN(parsedNilai)) return res.status(400).json({ success: false, message: 'Nilai harus berupa angka valid.' });
                if (parsedNilai < 0 || parsedNilai > 100) return res.status(400).json({ success: false, message: 'Nilai harus antara 0 dan 100.' });
                nilaiBulat = parsedNilai;
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

        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL) ORDER BY kelas_id DESC`,
            [mapelId, kelasId]
        );
        const bobotMap = new Map();
        bobotRows.forEach(b => {
            if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
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
                    `SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
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

        await db.execute(
            `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
        ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
            [siswaId, mapelId, kelasId, semesterId, semester, jenis, Math.round(nilaiRapor), deskripsi, userId]
        );

        res.json({
            success: true,
            message: `Nilai komponen (${jenis}) berhasil disimpan`,
            nilai_rapor: Math.round(nilaiRapor),
            deskripsi: deskripsi,
            jenis_penilaian: jenis
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai komponen', error: err.message });
    }
};

/**
 * POST /nilai - Simpan nilai (single komponen) - Legacy.
 */
exports.simpanNilai = async (req, res) => {
    const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
    const user_id = req.user.id;
    const semesterId = req.idSemesterAktif;

    try {
        if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
        }

        const strNilai = String(nilai).trim();
        if (strNilai.includes('.') || strNilai.includes(',')) {
            return res.status(400).json({ success: false, message: 'Nilai harus berupa bilangan bulat.' });
        }
        const parsedNilai = parseInt(strNilai, 10);
        if (isNaN(parsedNilai) || parsedNilai < 0 || parsedNilai > 100) {
            return res.status(400).json({ success: false, message: 'Nilai harus berupa angka bulat antara 0 dan 100.' });
        }

        const [siswaStatus] = await db.execute(`SELECT status FROM siswa WHERE id_siswa = ?`, [siswa_id]);
        if (siswaStatus.length === 0 || siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: 'Siswa tidak ditemukan atau tidak aktif.' });
        }
        if (!await isMapelWajibGuruKelas(user_id, mapel_id, semesterId)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }

        const [pembelajaran] = await db.execute(
            `SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [user_id, mapel_id, semesterId]
        );
        if (!pembelajaran[0]) {
            return res.status(403).json({ success: false, message: 'Anda tidak mengajar mapel ini' });
        }

        const saved = await nilaiModel.simpanNilaiDetail({
            siswa_id,
            mapel_id,
            komponen_id,
            nilai: parsedNilai,
            kelas_id: pembelajaran[0].kelas_id,
            tahun_ajaran_id: semesterId,
            user_id
        });

        return res.status(200).json({ success: true, message: 'Nilai berhasil disimpan', data: saved });
    } catch (controllerError) {
        return res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + (controllerError.message || controllerError) });
    }
};

/**
 * PUT /nilai-rapor/:mapelId/:siswaId - Update nilai rapor secara manual.
 */
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
        if (siswaStatus.length === 0 || siswaStatus[0].status !== 'aktif') {
            return res.status(403).json({ success: false, message: 'Siswa tidak ditemukan atau tidak aktif.' });
        }

        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenisPenilaian } = req.penilaianContext || {};
        if (!await isMapelWajibGuruKelas(userId, mapelId, semesterId)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak.' });
        }

        const [gkRows] = await db.execute(`SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`, [userId, semesterId]);
        if (gkRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan' });
        }

        await db.execute(
            `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
        ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
            [siswaId, mapelId, gkRows[0].kelas_id, req.idTahunAjaranInduk, semester, jenisPenilaian || 'PAS', nilaiRaporInt, deskripsi || '', userId]
        );

        res.json({
            success: true,
            message: 'Nilai rapor berhasil diperbarui',
            data: { siswa_id: siswaId, mapel_id: mapelId, nilai_rapor: nilaiRaporInt, deskripsi: deskripsi || '' }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui nilai rapor' });
    }
};

/**
 * GET /nilai-ekspor/:mapelId - Ekspor nilai ke Excel.
 */
exports.eksporNilaiExcel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Tidak terautentikasi' });

        const semesterId = req.idSemesterAktif;
        if (!await isMapelWajibGuruKelas(userId, mapelId, semesterId)) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        const [kelasRow] = await db.execute(`SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`, [userId, semesterId]);
        if (kelasRow.length === 0) return res.status(403).json({ message: 'Anda tidak memiliki kelas aktif' });
        const kelasId = kelasRow[0].kelas_id;

        const [mapelRows] = await db.execute(`SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`, [mapelId]);
        const namaMapel = mapelRows[0]?.nama_mapel || 'Mapel';

        const nilaiData = await nilaiModel.getNilaiByKelasMapel(kelasId, mapelId, semesterId);
        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);

        const siswaMap = {};
        nilaiData.forEach(item => {
            if (!siswaMap[item.id_siswa]) {
                siswaMap[item.id_siswa] = { id_siswa: item.id_siswa, nama: item.nama_lengkap, nis: item.nis, nisn: item.nisn, nilai_rapor: item.nilai_rapor || 0 };
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
                rowData.push(siswa[`nilai_${komp.id_komponen}`] !== undefined && siswa[`nilai_${komp.id_komponen}`] !== null ? siswa[`nilai_${komp.id_komponen}`] : '-');
            });
            rowData.push(siswa.nilai_rapor.toFixed(2));
            rowData.push(siswa.ranking);
            return rowData;
        });

        const worksheet = XLSX.utils.aoa_to_sheet([finalHeaders, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="Rekap_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ message: 'Gagal mengekspor data ke Excel' });
    }
};

/**
 * GET /nilai/import-template - Download template import nilai (dinamis + pre-fill data database).
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
        const { semester, jenis: jenisPenilaian } = req.penilaianContext || {};

        if (!semesterId || !tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const [kelasRow] = await db.execute(`SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`, [userId, semesterId]);
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelasId = kelasRow[0].kelas_id;

        const [mapelCheck] = await db.execute(`SELECT 1 FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`, [kelasId, mapelId, semesterId]);
        if (mapelCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });
        }

        const [mapelRow] = await db.execute(`SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`, [mapelId]);
        const namaMapel = mapelRow[0]?.nama_mapel || 'Mata Pelajaran';

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap 
        FROM siswa s 
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif' 
        ORDER BY s.nama_lengkap ASC`,
            [kelasId, tahunAjaranIndukId]
        );
        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`);
        const [kelasNamaRow] = await db.execute(`SELECT nama_kelas FROM kelas WHERE id_kelas = ?`, [kelasId]);
        const namaKelas = kelasNamaRow[0]?.nama_kelas || 'Kelas';

        // Filter komponen berdasarkan periode aktif agar template tidak membingungkan
        let komponenUntukTemplate = [];
        if (jenisPenilaian === 'PTS') {
            komponenUntukTemplate = komponenRows.filter(k => k.nama_komponen.toUpperCase() === 'PTS');
        } else if (jenisPenilaian === 'PAS') {
            komponenUntukTemplate = komponenRows.filter(k => {
                const namaUpper = k.nama_komponen.toUpperCase();
                return /^UH[\s\-_]*\d+$/i.test(namaUpper) || namaUpper === 'PAS';
            });
        } else {
            komponenUntukTemplate = komponenRows; // Fallback
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
        const worksheet = workbook.addWorksheet('Template Input Nilai');

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
                    prompt: 'Masukkan nilai antara 0-100. Kosongkan jika tidak ingin mengubah nilai lama.'
                };
            });
        });

        if (siswaRows.length === 0) {
            const lastColLetter = String.fromCharCode(65 + 3 + komponenUntukTemplate.length);
            worksheet.mergeCells(`A2:${lastColLetter}2`);
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: colors.gray } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightOrange } };
            emptyCell.border = thinBorder;
        }

        worksheet.columns = [{ width: 6 }, { width: 15 }, { width: 15 }, { width: 30 }, ...komponenUntukTemplate.map(() => ({ width: 12 }))];
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        const petunjukSheet = workbook.addWorksheet('PENTING_BACA_INI');
        petunjukSheet.columns = [{ width: 100 }];

        // Update petunjuk agar guru tahu bahwa data sudah terisi
        const petunjukContent = [
            { text: `⚠️ PETUNJUK PENGISIAN TEMPLATE - PERIODE ${jenisPenilaian || 'PTS'}`, bold: true, size: 14, color: colors.primary },
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
        const fileName = `Template_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_Periode_${jenisPenilaian || 'Aktif'}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal membuat template: ' + err.message });
    }
};

/**
 * POST /nilai/import - Import nilai dari Excel.
 */
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
        const { semester, jenis: jenisPenilaian } = req.penilaianContext || {};

        if (!semesterId || !tahunAjaranIndukId || !semester || !jenisPenilaian) {
            return res.status(400).json({ success: false, message: 'Data konteks penilaian tidak lengkap' });
        }

        const [kelasRow] = await db.execute(`SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`, [userId, semesterId]);
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelasId = kelasRow[0].kelas_id;

        const [mapelCheck] = await db.execute(`SELECT 1 FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`, [kelasId, mapelId, semesterId]);
        if (mapelCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });
        }
        if (!await isMapelWajibGuruKelas(userId, mapelId, semesterId)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak: Import nilai hanya untuk mata pelajaran wajib yang Anda kelola' });
        }

        const statusCheck = await cekStatusKategoriAkademik(mapelId, kelasId, semesterId, jenisPenilaian);
        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(`• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)`);
            }
            if (!statusCheck.kategori.covered) {
                masalah.push(`• Kategori nilai rapor belum lengkap (${statusCheck.kategori.celah.length} celah)`);
            }
            return res.status(400).json({
                success: false,
                message: `Konfigurasi Penilaian Belum Lengkap\n\nMapel ID: ${mapelId} | Periode: ${jenisPenilaian}\n\nMasalah yang ditemukan:\n${masalah.join('\n')}\n\nSolusi:\n1. Buka menu "Atur Penilaian"\n2. Atur bobot komponen agar total 100%\n3. Atur kategori nilai rapor agar rentang 0-100 tercover\n4. Setelah selesai, Anda dapat import nilai dari Excel`,
                code: 'KONFIGURASI_BELUM_LENGKAP',
                data: { bobot: statusCheck.bobot, kategori: statusCheck.kategori, jenis_penilaian: jenisPenilaian }
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
        if (data.length < 2) {
            return res.status(400).json({ success: false, message: 'File Excel kosong atau format tidak valid.' });
        }

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            if (data[i].map(c => String(c).trim().toLowerCase()).includes('nis') && data[i].some(c => String(c).toLowerCase().includes('nama'))) {
                headerRowIndex = i;
                break;
            }
        }
        if (headerRowIndex === -1) {
            return res.status(400).json({ success: false, message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".' });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;
        const requiredColumns = ['NIS', 'Nama Siswa'];
        const missingColumns = requiredColumns.filter(col => !headers.some(h => h.toLowerCase() === col.toLowerCase()));
        if (missingColumns.length > 0) {
            return res.status(400).json({ success: false, message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}` });
        }

        const findColIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');

        const [komponenList] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);
        const komponenMap = {};
        komponenList.forEach(k => { komponenMap[k.nama_komponen.toUpperCase().trim()] = k.id_komponen; });

        const komponenValid = [];
        const komponenInvalid = [];
        headers.slice(4).forEach(header => {
            const headerUpper = header.toUpperCase().trim();
            if (komponenMap[headerUpper]) {
                komponenValid.push({ header, id: komponenMap[headerUpper] });
            } else {
                komponenInvalid.push(header);
            }
        });

        if (komponenValid.length === 0) {
            return res.status(400).json({ success: false, message: 'Tidak ada kolom komponen penilaian yang valid.' });
        }

        const uhKomponenIds = komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        const komponenBolehUpdate = [];
        if (jenisPenilaian === 'PTS') {
            if (ptsKomponen) {
                komponenValid.forEach(kv => { if (kv.id === ptsKomponen.id_komponen) komponenBolehUpdate.push(kv); });
            }
        } else if (jenisPenilaian === 'PAS') {
            komponenValid.forEach(kv => {
                if (uhKomponenIds.includes(kv.id) || (pasKomponen && kv.id === pasKomponen.id_komponen)) {
                    komponenBolehUpdate.push(kv);
                }
            });
        }

        if (komponenBolehUpdate.length === 0) {
            return res.status(400).json({ success: false, message: `Tidak ada komponen yang valid untuk periode ${jenisPenilaian}.` });
        }
        const komponenDiabaikan = komponenValid.filter(kv => !komponenBolehUpdate.find(kbu => kbu.id === kv.id));

        let adaBarisDataValid = false;
        let adaDataSiswa = false;
        let adaNilaiDiFile = false;
        let barisDenganDataSiswa = 0;
        let barisDenganNilai = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            if (row.some(cell => String(cell).trim() !== '')) adaBarisDataValid = true;

            const nis = String(row[idxNIS] || '').trim();
            const nama = String(row[idxNama] || '').trim();
            if (nis || nama) {
                adaDataSiswa = true;
                barisDenganDataSiswa++;
            }

            let barisIniPunyaNilai = false;
            for (const kv of komponenValid) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;
                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr && nilaiStr !== '-' && nilaiStr !== '') {
                    adaNilaiDiFile = true;
                    barisIniPunyaNilai = true;
                }
            }
            if (barisIniPunyaNilai) barisDenganNilai++;
        }

        if (!adaBarisDataValid) {
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong. Tidak ada baris data siswa.',
                data: { total_baris: 0, berhasil: 0, gagal: 0, dilewati: 0, total_nilai_disimpan: 0, errors: null, warnings: [{ row: 0, message: 'File Excel kosong. Tidak ada baris data siswa.' }], komponen_diimport: komponenBolehUpdate.map(kv => kv.header), periode_aktif: jenisPenilaian }
            });
        }
        if (!adaDataSiswa) {
            return res.status(400).json({
                success: false,
                message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.',
                data: { total_baris: data.length - dataStartIndex, berhasil: 0, gagal: 0, dilewati: data.length - dataStartIndex, total_nilai_disimpan: 0, errors: null, warnings: [{ row: 0, message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.' }], komponen_diimport: komponenBolehUpdate.map(kv => kv.header), periode_aktif: jenisPenilaian }
            });
        }
        if (!adaNilaiDiFile) {
            return res.status(400).json({
                success: false,
                message: `File Excel tidak valid - tidak ada nilai yang diisi.\n\nSolusi:\n1. Download ulang template Excel\n2. Isi kolom komponen nilai (${komponenBolehUpdate.map(kv => kv.header).join(', ')}) dengan angka 0-100\n3. Upload kembali file yang sudah diisi\n\nPeriode aktif: ${jenisPenilaian}`,
                data: { total_baris: data.length - dataStartIndex, berhasil: 0, gagal: 0, dilewati: data.length - dataStartIndex, total_nilai_disimpan: 0, errors: null, warnings: [{ row: 0, message: 'File Excel tidak berisi nilai. Hanya data identitas siswa yang terdeteksi.' }], komponen_diimport: komponenBolehUpdate.map(kv => kv.header), periode_aktif: jenisPenilaian }
            });
        }

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status 
        FROM siswa s 
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`,
            [kelasId, tahunAjaranIndukId]
        );
        const siswaMapByNIS = {};
        siswaRows.forEach(s => { if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s; });

        await connection.beginTransaction();
        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;
        const nisDiproses = new Set();
        const nisDuplikat = [];
        const nisnDiproses = new Set();
        const nisnDuplikat = [];

        if (komponenDiabaikan.length > 0) {
            warnings.push({ row: 0, message: `Kolom [${komponenDiabaikan.map(kv => kv.header).join(', ')}] diabaikan karena periode ${jenisPenilaian} sedang aktif. Hanya kolom [${komponenBolehUpdate.map(kv => kv.header).join(', ')}] yang akan diimport.` });
        }
        if (komponenInvalid.length > 0) {
            warnings.push({ row: 0, message: `Kolom [${komponenInvalid.join(', ')}] tidak dikenali sebagai komponen penilaian dan akan diabaikan.` });
        }

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const namaSiswa = String(row[idxNama] || '').trim();

            if (!nis) {
                if (namaSiswa) warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS kosong untuk "${namaSiswa}"` });
                skippedCount++;
                continue;
            }
            if (nisDiproses.has(nis)) {
                nisDuplikat.push({ row: i + 1, nis, nama: namaSiswa });
                warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS "${nis}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.` });
                skippedCount++;
                continue;
            }
            nisDiproses.add(nis);

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                if (nisnExcel) {
                    if (nisnDiproses.has(nisnExcel)) {
                        nisnDuplikat.push({ row: i + 1, nisn: nisnExcel, nama: namaSiswa });
                        warnings.push({ row: i + 1, message: `Baris ${i + 1}: NISN "${nisnExcel}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.` });
                        skippedCount++;
                        continue;
                    }
                    nisnDiproses.add(nisnExcel);
                }
            }

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({ row: i + 1, message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan` });
                skippedCount++;
                continue;
            }

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"` });
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
                        errors.push({ row: i + 1, message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"` });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({ row: i + 1, message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.` });
                    }
                }
            }

            const siswaId = siswa.id_siswa;
            let rowSavedCount = 0;
            let rowHasError = false;
            let semuaNilaiNol = true;

            for (const kv of komponenValid) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;
                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-' || nilaiStr.toLowerCase() === 'null') continue;

                if (nilaiStr.includes('.') || nilaiStr.includes(',')) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" tidak valid. Nilai wajib bilangan bulat (contoh: 85, bukan 85.5).` });
                    rowHasError = true;
                    continue;
                }
                const nilaiInt = parseInt(nilaiStr, 10);
                if (isNaN(nilaiInt)) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" bukan angka yang valid.` });
                    rowHasError = true;
                    continue;
                }
                if (nilaiInt < 0 || nilaiInt > 100) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}, Kolom "${kv.header}": Nilai ${nilaiInt} di luar rentang 0-100.` });
                    rowHasError = true;
                    continue;
                }
            }

            for (const kv of komponenBolehUpdate) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;
                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-' || nilaiStr.toLowerCase() === 'null') continue;

                const nilaiInt = parseInt(nilaiStr, 10);
                if (isNaN(nilaiInt) || nilaiInt < 0 || nilaiInt > 100) continue;
                if (nilaiInt !== 0) semuaNilaiNol = false;

                await connection.execute(
                    `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                    [siswaId, mapelId, kv.id, nilaiInt, semesterId, userId]
                );
                rowSavedCount++;
                totalNilaiDisimpan++;
            }

            if (semuaNilaiNol && rowSavedCount > 0) {
                warnings.push({ row: i + 1, message: `Baris ${i + 1} (${siswa.nama_lengkap}): Semua nilai diisi 0. Pastikan ini bukan kesalahan.` });
            }
            if (rowSavedCount > 0) {
                successCount++;
            } else if (rowHasError) {
                skippedCount++;
            } else {
                skippedCount++;
            }
        }

        if (successCount > 0) {
            try {
                await updateAllNilaiRaporForMapel(mapelId, userId, req, connection);
            } catch (recalcErr) {
                warnings.push({ row: 0, message: 'Gagal menghitung ulang nilai rapor otomatis. Silakan refresh halaman.' });
            }
        }

        await connection.commit();

        let message = '';
        let success = true;
        if (errors.length > 0) {
            success = false;
            message = successCount > 0
                ? `Import sebagian berhasil: ${successCount} siswa (${totalNilaiDisimpan} nilai) disimpan, tetapi ada ${errors.length} error yang perlu diperbaiki.`
                : `Import gagal: ${errors.length} error ditemukan. Tidak ada data yang disimpan.`;
        } else if (successCount > 0) {
            message = `Import berhasil! ${successCount} siswa, ${totalNilaiDisimpan} nilai disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport. Periksa file Excel Anda.';
        }

        if (komponenDiabaikan.length > 0) {
            message += `\n\nKolom [${komponenDiabaikan.map(kv => kv.header).join(', ')}] diabaikan karena periode ${jenisPenilaian} sedang aktif.`;
        }
        if (nisDuplikat.length > 0) {
            warnings.unshift({ row: 0, message: `DITEMUKAN ${nisDuplikat.length} NIS DUPLIKAT: ${nisDuplikat.map(d => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`).join(', ')}. Hanya data pertama yang diproses, duplikat diabaikan.` });
            message += `\n\nPERHATIAN: ${nisDuplikat.length} NIS duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }
        if (nisnDuplikat.length > 0) {
            warnings.unshift({ row: 0, message: `DITEMUKAN ${nisnDuplikat.length} NISN DUPLIKAT: ${nisnDuplikat.map(d => `Baris ${d.row} (NISN: ${d.nisn}, ${d.nama})`).join(', ')}. Hanya data pertama yang diproses, duplikat diabaikan.` });
            message += `\n\nPERHATIAN: ${nisnDuplikat.length} NISN duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        message += `\nINFO: Pastikan setiap siswa memiliki NIS dan NISN yang unik di file Excel.\n\nPetunjuk:\n- Kolom yang diimport: ${komponenBolehUpdate.map(kv => kv.header).join(', ')}\n- Kolom yang diabaikan: ${komponenDiabaikan.length > 0 ? komponenDiabaikan.map(kv => kv.header).join(', ') : 'Tidak ada'}\n- Periode aktif: ${jenisPenilaian}\n- Format nilai: Angka bulat 0-100 (Desimal/Koma akan ditolak)`;

        res.json({
            success,
            message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_nilai_disimpan: totalNilaiDisimpan,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings : null,
                komponen_diimport: komponenBolehUpdate.map(kv => kv.header),
                komponen_diabaikan: komponenDiabaikan.map(kv => kv.header),
                komponen_tidak_dikenali: komponenInvalid,
                periode_aktif: jenisPenilaian,
                ada_error: errors.length > 0,
                nis_duplikat_count: nisDuplikat.length,
                nis_duplikat_detail: nisDuplikat,
                nisn_duplikat_count: nisnDuplikat.length,
                nisn_duplikat_detail: nisnDuplikat,
                baris_dengan_nilai: barisDenganNilai,
                baris_dengan_data_siswa: barisDenganDataSiswa,
                pesan_penting: (nisDuplikat.length > 0 || nisnDuplikat.length > 0) ? `${nisDuplikat.length + nisnDuplikat.length} duplikasi ditemukan. Hanya data pertama yang diproses.` : null
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
 * GET /nilai/cek-status-kategori - Cek status kategori nilai akademik.
 */
exports.cekStatusKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id } = req.query;
        const userId = req.user.id;
        if (!mapel_id || isNaN(Number(mapel_id))) {
            return res.status(400).json({ success: false, message: 'mapel_id wajib diisi' });
        }

        const mapelId = Number(mapel_id);
        const semesterId = req.idSemesterAktif;
        const { jenis: jenisPenilaian } = req.penilaianContext || {};
        if (!semesterId || !jenisPenilaian) {
            return res.status(400).json({ success: false, message: 'Data konteks penilaian tidak lengkap' });
        }

        if (!await isMapelWajibGuruKelas(userId, mapelId, semesterId)) {
            return res.status(403).json({ success: false, message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola' });
        }

        const [kelasRow] = await db.execute(`SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`, [userId, semesterId]);
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelasId = kelasRow[0].kelas_id;

        const statusCheck = await cekStatusKategoriAkademik(mapelId, kelasId, semesterId, jenisPenilaian);
        let message = statusCheck.configured
            ? 'Semua konfigurasi sudah lengkap'
            : `Ditemukan masalah: Bobot ${statusCheck.bobot.total}%, Celah kategori: ${statusCheck.kategori.celah.join(', ')}`;

        res.json({
            success: true,
            data: {
                configured: statusCheck.configured,
                bobot: statusCheck.bobot,
                kategori: statusCheck.kategori,
                jenis_penilaian: jenisPenilaian,
                message
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengecek status kategori: ' + err.message });
    }
};

// Export untuk keperluan unit testing
exports._calculateSimilarity = calculateSimilarity;