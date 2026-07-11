/**
 * Nama File: nilaiAkademikController.js
 * Fungsi: Controller untuk manajemen nilai akademik siswa (mapel wajib)
 *         Menangani input nilai komponen, perhitungan nilai rapor otomatis,
 *         ekspor data ke Excel, dan import nilai dari Excel
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
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
// HELPER - Hitung Kesamaan String (Levenshtein Distance)
// ═════════════════════════════════════════════════════════════════════════════

// Hitung tingkat kemiripan antara dua string untuk validasi nama
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
// HELPER - Cek Status Kategori Nilai Akademik
// ═════════════════════════════════════════════════════════════════════════════

// Validasi kelengkapan bobot komponen dan kategori nilai rapor
const cekStatusKategoriAkademik = async (mapelId, kelasId, semesterId, jenisPenilaian) => {
    try {
        // Ambil bobot komponen dari database
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
        const bobotStatus = {
            total: totalBobot,
            status: Math.abs(totalBobot - 100) < 0.01 ? 'lengkap' : 'belum_100',
        };

        // Ambil kategori nilai rapor dari database
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
            const sorted = [...kategoriRows].sort(
                (a, b) => parseFloat(a.min_nilai) - parseFloat(b.min_nilai)
            );

            // Deteksi celah rentang nilai
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
        }

        const kategoriStatus = {
            covered: celah.length === 0,
            celah: celah,
        };

        const configured = bobotStatus.status === 'lengkap' && kategoriStatus.covered;

        return {
            configured,
            bobot: bobotStatus,
            kategori: kategoriStatus,
        };
    } catch (err) {
        return {
            configured: false,
            bobot: { total: 0, status: 'error' },
            kategori: { covered: false, celah: ['Error checking'] },
        };
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET MAPEL UNTUK GURU KELAS
// ═════════════════════════════════════════════════════════════════════════════

// Ambil daftar mata pelajaran yang diajarkan di kelas guru
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
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar mata pelajaran: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET NILAI BY MAPEL
// ═════════════════════════════════════════════════════════════════════════════

// Ambil data nilai siswa per mata pelajaran dengan deskripsi rapor
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

        // Validasi kelas aktif guru
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        const kelas_id = kelasRow[0].kelas_id;

        // Validasi mapel di kelas
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

        // Cek status bobot komponen
        const [bobotCheck] = await db.execute(
            `SELECT COUNT(*) as total FROM konfigurasi_mapel_komponen 
        WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)`,
            [mapelId, kelas_id]
        );
        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;

        // Ambil data siswa aktif
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

        // Ambil nilai detail per komponen
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

        // Ambil konfigurasi kategori untuk deskripsi rapor
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

        // Ambil nilai rapor siswa
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

        // Build data siswa dengan deskripsi rapor
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
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai: ' + err.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. UPDATE NILAI KOMPONEN
// ═════════════════════════════════════════════════════════════════════════════

// Simpan nilai komponen dan hitung ulang nilai rapor otomatis
exports.updateNilaiKomponen = async (req, res) => {
    try {
        const { mapelId, siswaId } = req.params;
        const { nilai } = req.body;
        const userId = req.user.id;
        const jenis = req.jenis_penilaian;

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        // Validasi konteks penilaian
        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data konteks tidak lengkap' });
        }

        // Validasi status siswa aktif
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
                message: `Siswa tidak aktif (status: ${siswaStatus[0].status}). Nilai tidak dapat diubah.`,
            });
        }

        // Validasi akses berdasarkan jenis mapel
        const [mapelCheck] = await db.execute(
            `SELECT jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
            [mapelId]
        );
        const jenisMapel = mapelCheck[0]?.jenis;

        if (jenisMapel === 'pilihan') {
            const [pengajarCheck] = await db.execute(
                `SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                [userId, mapelId, semesterId]
            );
            if (pengajarCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Anda bukan pengajar mapel pilihan ini.',
                });
            }
        } else {
            const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: 'Akses ditolak: Hanya untuk mapel wajib yang Anda kelola.',
                });
            }
        }

        // Ambil kelas_id guru
        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (gkRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan' });
        }
        const kelas_id = gkRows[0].kelas_id;

        // Validasi kelengkapan konfigurasi penilaian
        const statusCheck = await cekStatusKategoriAkademik(
            mapelId,
            kelas_id,
            semesterId,
            jenis
        );

        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(
                    `• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)\n` +
                    `  Silakan atur di menu "Atur Penilaian" > "Bobot Akademik"`
                );
            }
            if (!statusCheck.kategori.covered) {
                masalah.push(
                    `• Kategori nilai rapor belum lengkap\n` +
                    `  Celah rentang: ${statusCheck.kategori.celah.join(', ')}\n` +
                    `  Silakan atur di menu "Atur Penilaian" > "Kategori Akademik"`
                );
            }

            return res.status(400).json({
                success: false,
                message:
                    `Konfigurasi Penilaian Belum Lengkap\n\n` +
                    `Mapel ID: ${mapelId} | Periode: ${jenis}\n\n` +
                    `Masalah yang ditemukan:\n${masalah.join('\n\n')}\n\n` +
                    `Solusi:\n` +
                    `1. Buka menu "Atur Penilaian"\n` +
                    `2. Atur bobot komponen agar total 100%\n` +
                    `3. Atur kategori nilai rapor agar rentang 0-100 tercover\n` +
                    `4. Setelah selesai, Anda dapat menginput nilai siswa`,
                code: 'KONFIGURASI_BELUM_LENGKAP',
                data: {
                    bobot: statusCheck.bobot,
                    kategori: statusCheck.kategori,
                    jenis_penilaian: jenis,
                },
            });
        }

        // Ambil daftar komponen penilaian
        const komponenList = await komponenPenilaianModel.getAllKomponen();
        const uhKomponenIds = komponenList
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        // Validasi periode PTS - hanya komponen PTS yang boleh diisi
        if (jenis === 'PTS') {
            for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
                const komponenId = parseInt(komponenIdStr, 10);
                const komponen = komponenList.find(k => k.id_komponen === komponenId);

                if (nilaiSiswa == null) continue;

                if (ptsKomponen && komponenId !== ptsKomponen.id_komponen) {
                    return res.status(400).json({
                        success: false,
                        message: `Periode PTS aktif. Hanya nilai ${ptsKomponen.nama_komponen} yang boleh diisi. Komponen "${komponen?.nama_komponen || komponenId}" tidak boleh diubah.`,
                    });
                }
            }
        }

        // Simpan nilai per komponen ke database
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

        // Ambil nilai terbaru dari database
        const [nilaiDetailRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaId, mapelId, semesterId]
        );

        const nilaiFromDB = {};
        nilaiDetailRows.forEach(row => {
            if (row.nilai != null) nilaiFromDB[row.komponen_id] = Math.round(parseFloat(row.nilai));
        });

        // Ambil bobot komponen
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot, kelas_id 
        FROM konfigurasi_mapel_komponen 
        WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL)
        ORDER BY kelas_id DESC`,
            [mapelId, kelas_id]
        );

        const bobotMap = new Map();
        bobotRows.forEach(b => {
            if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) {
                bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
            }
        });

        // Hitung nilai rapor berdasarkan periode
        let nilaiRapor = 0;
        let deskripsi = '';

        if (jenis === 'PTS') {
            // PTS: nilai rapor = nilai PTS langsung
            const nilaiPTS = ptsKomponen ? nilaiFromDB[ptsKomponen.id_komponen] || 0 : 0;
            nilaiRapor = nilaiPTS;
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(
                nilaiRapor,
                mapelId,
                semesterId,
                'PTS'
            );
        } else if (jenis === 'PAS') {
            // PAS: nilai rapor = rata-rata terbobot (UH, PTS, PAS)
            let nilaiPTSFinal = 0;
            if (ptsKomponen) {
                const [ptsRow] = await db.execute(
                    `SELECT nilai_rapor FROM nilai_rapor
            WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                    [siswaId, mapelId, semesterId, semester]
                );
                nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
            }

            const nilaiUH = uhKomponenIds
                .map(id => nilaiFromDB[id])
                .filter(v => v != null && !isNaN(v));
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
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(
                nilaiRapor,
                mapelId,
                semesterId,
                'PAS'
            );
        }

        // Simpan nilai rapor ke database
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
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai komponen',
            error: err.message,
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. SIMPAN NILAI (SINGLE KOMPONEN) - LEGACY
// ═════════════════════════════════════════════════════════════════════════════

// Simpan nilai untuk satu komponen (fungsi lama)
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
        return res.status(500).json({ success: false, message: 'Gagal menyimpan nilai: ' + (controllerError.message || controllerError) });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. UPDATE NILAI RAPOR
// ═════════════════════════════════════════════════════════════════════════════

// Update manual nilai rapor dan deskripsi
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
        res.status(500).json({ success: false, message: 'Gagal memperbarui nilai rapor' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. EKSPOR NILAI KE EXCEL
// ═════════════════════════════════════════════════════════════════════════════

// Ekspor rekap nilai siswa ke file Excel
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

        // Urutkan berdasarkan nilai rapor untuk ranking
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
        res.status(500).json({ message: 'Gagal mengekspor data ke Excel' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. DOWNLOAD TEMPLATE IMPORT NILAI
// ═════════════════════════════════════════════════════════════════════════════

// Generate template Excel untuk import nilai
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

        // Validasi kelas aktif
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelas_id = kelasRow[0].kelas_id;

        // Validasi mapel di kelas
        const [mapelCheck] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [kelas_id, mapelId, semesterId]
        );
        if (mapelCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Mapel ini tidak diajarkan di kelas Anda' });
        }

        const [mapelRow] = await db.execute(
            `SELECT nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ?`,
            [mapelId]
        );
        const namaMapel = mapelRow[0]?.nama_mapel || 'Mata Pelajaran';

        // Ambil data siswa aktif
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
        ORDER BY s.nama_lengkap ASC`,
            [kelas_id, tahunAjaranIndukId]
        );

        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`
        );

        const [kelasNamaRow] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelas_id]
        );
        const namaKelas = kelasNamaRow[0]?.nama_kelas || 'Kelas';

        // Generate workbook Excel
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

        // Header di row 1
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
                fgColor: { argb: colIdx < 4 ? colors.blue : colors.primary }
            };
        });

        // Data siswa mulai dari row 2
        siswaRows.forEach((siswa, index) => {
            const rowNum = 2 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 22;

            const isEvenRow = index % 2 === 0;

            const identitasData = [
                index + 1,
                siswa.nis || '',
                siswa.nisn || '',
                siswa.nama_lengkap || ''
            ];

            identitasData.forEach((val, colIdx) => {
                const cell = dataRow.getCell(colIdx + 1);
                cell.value = val;
                cell.font = { name: 'Calibri', size: 11, bold: colIdx === 3 };
                cell.alignment = { vertical: 'middle', horizontal: colIdx === 3 ? 'left' : 'center' };
                cell.border = thinBorder;
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? colors.lightBlue : colors.white }
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
                    fgColor: { argb: isEvenRow ? colors.lightOrange : colors.white }
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
                    prompt: 'Masukkan nilai antara 0-100'
                };
            });
        });

        if (siswaRows.length === 0) {
            worksheet.mergeCells('A2:H2');
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: colors.gray } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.lightOrange } };
            emptyCell.border = thinBorder;
        }

        worksheet.columns = [
            { width: 6 },
            { width: 15 },
            { width: 15 },
            { width: 30 },
            ...komponenRows.map(() => ({ width: 12 }))
        ];

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Sheet petunjuk
        const petunjukSheet = workbook.addWorksheet('Petunjuk');
        petunjukSheet.columns = [{ width: 90 }];

        const petunjukContent = [
            { text: 'PETUNJUK PENGISIAN TEMPLATE', bold: true, size: 14, color: colors.primary },
            { text: '' },
            { text: `${namaMapel}  |  ${namaKelas}  |  ${jenis_penilaian || 'PTS'}  |  ${siswaRows.length} siswa`, size: 11, color: colors.primaryDark },
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

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Nilai_${namaMapel.replace(/[^a-z0-9]/gi, '_')}_${namaKelas.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 8. IMPORT NILAI DARI EXCEL
// ═════════════════════════════════════════════════════════════════════════════

// Import nilai siswa dari file Excel dengan validasi lengkap
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
            return res.status(400).json({
                success: false,
                message: 'Data konteks penilaian tidak lengkap',
            });
        }

        // Validasi kelas aktif
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        const kelas_id = kelasRow[0].kelas_id;

        // Validasi mapel di kelas
        const [mapelCheck] = await db.execute(
            `SELECT 1 FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [kelas_id, mapelId, semesterId]
        );
        if (mapelCheck.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Mapel ini tidak diajarkan di kelas Anda',
            });
        }

        // Validasi akses guru
        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: Import nilai hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        // Validasi kelengkapan konfigurasi penilaian
        const statusCheck = await cekStatusKategoriAkademik(
            mapelId,
            kelas_id,
            semesterId,
            jenis_penilaian
        );

        if (!statusCheck.configured) {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(
                    `• Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)`
                );
            }
            if (!statusCheck.kategori.covered) {
                masalah.push(
                    `• Kategori nilai rapor belum lengkap (${statusCheck.kategori.celah.length} celah)`
                );
            }

            return res.status(400).json({
                success: false,
                message:
                    `Konfigurasi Penilaian Belum Lengkap\n\n` +
                    `Mapel ID: ${mapelId} | Periode: ${jenis_penilaian}\n\n` +
                    `Masalah yang ditemukan:\n${masalah.join('\n')}\n\n` +
                    `Solusi:\n` +
                    `1. Buka menu "Atur Penilaian"\n` +
                    `2. Atur bobot komponen agar total 100%\n` +
                    `3. Atur kategori nilai rapor agar rentang 0-100 tercover\n` +
                    `4. Setelah selesai, Anda dapat import nilai dari Excel`,
                code: 'KONFIGURASI_BELUM_LENGKAP',
                data: {
                    bobot: statusCheck.bobot,
                    kategori: statusCheck.kategori,
                    jenis_penilaian,
                },
            });
        }

        // Baca file Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong atau format tidak valid.',
            });
        }

        // Cari header row
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

        // Validasi kolom wajib
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

        const findColIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');

        const komponenHeaders = headers.slice(4);
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan ASC`
        );

        const komponenMap = {};
        komponenRows.forEach(k => {
            komponenMap[k.nama_komponen.toUpperCase().trim()] = k.id_komponen;
        });

        const komponenValid = [];
        const komponenInvalid = [];
        komponenHeaders.forEach(header => {
            const headerUpper = header.toUpperCase().trim();
            if (komponenMap[headerUpper]) {
                komponenValid.push({ header, id: komponenMap[headerUpper] });
            } else {
                komponenInvalid.push(header);
            }
        });

        if (komponenValid.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada kolom komponen penilaian yang valid.',
            });
        }

        const [komponenList] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );
        const uhKomponenIds = komponenList
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        // Filter komponen berdasarkan periode aktif
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

        const komponenDiabaikan = komponenValid.filter(kv =>
            !komponenBolehUpdate.find(kbu => kbu.id === kv.id)
        );

        // Validasi file tidak kosong
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
                    warnings: [{
                        row: 0,
                        message: 'File Excel kosong. Tidak ada baris data siswa.',
                    }],
                    komponen_diimport: komponenBolehUpdate.map(kv => kv.header),
                    periode_aktif: jenis_penilaian,
                },
            });
        }

        // Validasi data siswa ada
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
                    warnings: [{
                        row: 0,
                        message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.',
                    }],
                    komponen_diimport: komponenBolehUpdate.map(kv => kv.header),
                    periode_aktif: jenis_penilaian,
                },
            });
        }

        // Validasi ada nilai yang diisi
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

                // Nilai 0 dianggap valid
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
                    `2. Isi kolom komponen nilai (${komponenBolehUpdate.map(kv => kv.header).join(', ')}) dengan angka 0-100\n` +
                    `3. Upload kembali file yang sudah diisi\n\n` +
                    `Periode aktif: ${jenis_penilaian}`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    total_nilai_disimpan: 0,
                    errors: null,
                    warnings: [{
                        row: 0,
                        message: 'File Excel tidak berisi nilai. Hanya data identitas siswa yang terdeteksi.',
                    }],
                    komponen_diimport: komponenBolehUpdate.map(kv => kv.header),
                    periode_aktif: jenis_penilaian,
                },
            });
        }

        // Ambil data siswa dari database
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

        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalNilaiDisimpan = 0;

        let nilaiDiRound = 0;

        // Track duplikasi NIS
        const nisDiproses = new Set();
        const nisDuplikat = [];

        // Track duplikasi NISN
        const nisnDiproses = new Set();
        const nisnDuplikat = [];

        if (komponenDiabaikan.length > 0) {
            warnings.push({
                row: 0,
                message: `Kolom [${komponenDiabaikan.map(kv => kv.header).join(', ')}] diabaikan karena periode ${jenis_penilaian} sedang aktif. Hanya kolom [${komponenBolehUpdate.map(kv => kv.header).join(', ')}] yang akan diimport.`,
            });
        }

        if (komponenInvalid.length > 0) {
            warnings.push({
                row: 0,
                message: `Kolom [${komponenInvalid.join(', ')}] tidak dikenali sebagai komponen penilaian dan akan diabaikan.`,
            });
        }

        // Proses data per baris
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

            // Cek duplikasi NIS
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

            // Cek duplikasi NISN
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
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan`,
                });
                skippedCount++;
                continue;
            }

            // Validasi NISN cocok dengan database
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

            // Validasi nama cocok dengan database
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
            let rowHasError = false;

            let semuaNilaiNol = true;

            // Validasi semua nilai
            for (const kv of komponenValid) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-') continue;

                const nilai = parseFloat(nilaiStr);

                if (isNaN(nilai)) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": "${nilaiStr}" bukan angka yang valid`,
                    });
                    rowHasError = true;
                    continue;
                }

                if (nilai < 0 || nilai > 100) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}, Kolom "${kv.header}": Nilai ${nilai} di luar rentang 0-100`,
                    });
                    rowHasError = true;
                    continue;
                }
            }

            // Simpan nilai yang valid
            for (const kv of komponenBolehUpdate) {
                const headerIdx = headers.indexOf(kv.header);
                if (headerIdx < 0) continue;

                const nilaiStr = String(row[headerIdx] || '').trim();
                if (nilaiStr === '' || nilaiStr === '-') continue;

                const nilai = parseFloat(nilaiStr);
                if (isNaN(nilai) || nilai < 0 || nilai > 100) continue;

                const nilaiBulat = Math.round(nilai);

                if (nilai !== nilaiBulat) {
                    nilaiDiRound++;
                }

                if (nilaiBulat !== 0) {
                    semuaNilaiNol = false;
                }

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

            if (semuaNilaiNol && rowSavedCount > 0) {
                warnings.push({
                    row: i + 1,
                    message: `Baris ${i + 1} (${siswa.nama_lengkap}): Semua nilai diisi 0. Pastikan ini bukan kesalahan.`,
                });
            }

            if (rowSavedCount > 0) successCount++;
            else if (rowHasError) skippedCount++;
            else skippedCount++;
        }

        // Hitung ulang nilai rapor jika ada data tersimpan
        if (successCount > 0) {
            try {
                await updateAllNilaiRaporForMapel(mapelId, userId, req);
            } catch (recalcErr) {
                warnings.push({
                    row: 0,
                    message: 'Gagal menghitung ulang nilai rapor otomatis. Silakan refresh halaman.',
                });
            }
        }

        await connection.commit();

        // Build response message
        let message = '';
        let success = true;

        if (errors.length > 0) {
            success = false;
            if (successCount > 0) {
                message = `Import sebagian berhasil: ${successCount} siswa (${totalNilaiDisimpan} nilai) disimpan, tetapi ada ${errors.length} error yang perlu diperbaiki.`;
            } else {
                message = `Import gagal: ${errors.length} error ditemukan. Tidak ada data yang disimpan.`;
            }
        } else if (successCount > 0) {
            message = `Import berhasil! ${successCount} siswa, ${totalNilaiDisimpan} nilai disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport. Periksa file Excel Anda.';
        }

        if (komponenDiabaikan.length > 0) {
            message += `\n\nKolom [${komponenDiabaikan.map(kv => kv.header).join(', ')}] diabaikan karena periode ${jenis_penilaian} sedang aktif.`;
        }

        if (nilaiDiRound > 0) {
            message += `\n\n${nilaiDiRound} nilai desimal di-round ke bilangan bulat terdekat (contoh: 85.7 menjadi 86).`;
        }

        // Info duplikasi NIS
        if (nisDuplikat.length > 0) {
            const duplikatInfo = nisDuplikat.map(d => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`).join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisDuplikat.length} NIS DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });

            message += `\n\nPERHATIAN: ${nisDuplikat.length} NIS duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        // Info duplikasi NISN
        if (nisnDuplikat.length > 0) {
            const duplikatInfo = nisnDuplikat.map(d => `Baris ${d.row} (NISN: ${d.nisn}, ${d.nama})`).join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisnDuplikat.length} NISN DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });

            message += `\n\nPERHATIAN: ${nisnDuplikat.length} NISN duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        message += `\nINFO: Pastikan setiap siswa memiliki NIS dan NISN yang unik di file Excel.`;

        message += `\n\nPetunjuk:\n` +
            `- Kolom yang diimport: ${komponenBolehUpdate.map(kv => kv.header).join(', ')}\n` +
            `- Kolom yang diabaikan: ${komponenDiabaikan.length > 0 ? komponenDiabaikan.map(kv => kv.header).join(', ') : 'Tidak ada'}\n` +
            `- Periode aktif: ${jenis_penilaian}\n` +
            `- Format nilai: Angka bulat 0-100`;

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
                komponen_diabaikan: komponenDiabaikan.map(kv => kv.header),
                komponen_tidak_dikenali: komponenInvalid,
                periode_aktif: jenis_penilaian,
                ada_error: errors.length > 0,
                nilai_di_round: nilaiDiRound,
                nis_duplikat_count: nisDuplikat.length,
                nis_duplikat_detail: nisDuplikat,
                nisn_duplikat_count: nisnDuplikat.length,
                nisn_duplikat_detail: nisnDuplikat,
                baris_dengan_nilai: barisDenganNilai,
                baris_dengan_data_siswa: barisDenganDataSiswa,
                pesan_penting: (nisDuplikat.length > 0 || nisnDuplikat.length > 0)
                    ? `${nisDuplikat.length + nisnDuplikat.length} duplikasi ditemukan. Hanya data pertama yang diproses.`
                    : null,
            },
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport nilai: ' + err.message,
        });
    } finally {
        connection.release();
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 9. CEK STATUS KATEGORI NILAI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

// Endpoint untuk frontend mengecek kelengkapan konfigurasi penilaian
exports.cekStatusKategoriAkademik = async (req, res) => {
    try {
        const { mapel_id } = req.query;
        const userId = req.user.id;

        if (!mapel_id || isNaN(Number(mapel_id))) {
            return res.status(400).json({
                success: false,
                message: 'mapel_id wajib diisi',
            });
        }

        const mapelId = Number(mapel_id);
        const semesterId = req.idSemesterAktif;
        const { jenis: jenisPenilaian } = req.penilaianContext || {};

        if (!semesterId || !jenisPenilaian) {
            return res.status(400).json({
                success: false,
                message: 'Data konteks penilaian tidak lengkap',
            });
        }

        // Validasi akses guru
        const isValid = await isMapelWajibGuruKelas(userId, mapelId, semesterId);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola',
            });
        }

        // Ambil kelas_id
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (kelasRow.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki kelas aktif',
            });
        }
        const kelasId = kelasRow[0].kelas_id;

        // Cek status kategori
        const statusCheck = await cekStatusKategoriAkademik(
            mapelId,
            kelasId,
            semesterId,
            jenisPenilaian
        );

        // Build pesan informatif
        let message = '';
        if (statusCheck.configured) {
            message = 'Semua konfigurasi sudah lengkap';
        } else {
            const masalah = [];
            if (statusCheck.bobot.status !== 'lengkap') {
                masalah.push(`Bobot komponen belum 100% (saat ini: ${statusCheck.bobot.total}%)`);
            }
            if (!statusCheck.kategori.covered) {
                masalah.push(`Kategori nilai rapor belum lengkap (${statusCheck.kategori.celah.length} celah)`);
            }
            message = `Ditemukan ${masalah.length} masalah: ${masalah.join('; ')}`;
        }

        res.json({
            success: true,
            data: {
                configured: statusCheck.configured,
                bobot: statusCheck.bobot,
                kategori: statusCheck.kategori,
                jenis_penilaian: jenisPenilaian,
                message,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengecek status kategori: ' + err.message,
        });
    }
};