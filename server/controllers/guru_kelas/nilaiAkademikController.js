/**
 * Nama File: nilaiAkademikController.js
 * Fungsi: Controller untuk nilai akademik (mata pelajaran, nilai, input nilai)
 */

const db = require('../../config/db');
const komponenPenilaianModel = require('../../models/komponenPenilaianModel');
const bobotPenilaianModel = require('../../models/bobotPenilaianModel');
const konfigurasiNilaiRaporModel = require('../../models/konfigurasiNilaiRaporModel');

// Helper: mendapatkan deskripsi berdasarkan nilai dan daftar kategori
const getDeskripsiFromKategori = (nilai, kategoriList) => {
    if (nilai == null || nilai < 0) return 'Belum ada deskripsi';
    for (const k of kategoriList) {
        if (nilai >= k.min_nilai && nilai <= k.max_nilai) {
            return k.deskripsi;
        }
    }
    return 'Belum ada deskripsi';
};

/**
 * GET /mapel
 * Ambil daftar mata pelajaran untuk guru kelas
 */
exports.getMapelForGuruKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;

        if (!tahunAjaranIndukId) {
            return res.status(400).json({
                success: false,
                message: 'ID Tahun Ajaran Induk tidak ditemukan'
            });
        }

        const [rows] = await db.execute(
            `
        SELECT 
          mp.id_mata_pelajaran,
          mp.nama_mapel,
          mp.jenis,
          p.user_id AS pengajar_id,
          CASE WHEN p.user_id = ? THEN TRUE ELSE FALSE END AS bisa_input
        FROM pembelajaran p
        JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
        JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
        WHERE gk.user_id = ?
          AND p.id_tahun_ajaran_induk = ?  
        ORDER BY mp.jenis, mp.nama_mapel
      `,
            [userId, userId, tahunAjaranIndukId]
        );

        res.json({
            success: true,
            wajib: rows
                .filter(r => r.jenis === 'wajib')
                .map(r => ({
                    mata_pelajaran_id: r.id_mata_pelajaran,
                    nama_mapel: r.nama_mapel,
                    jenis: r.jenis,
                    bisa_input: Boolean(r.bisa_input),
                })),
            pilihan: rows
                .filter(r => r.jenis === 'pilihan')
                .map(r => ({
                    mata_pelajaran_id: r.id_mata_pelajaran,
                    nama_mapel: r.nama_mapel,
                    jenis: r.jenis,
                    bisa_input: Boolean(r.bisa_input),
                })),
        });
    } catch (err) {
        console.error('Error getMapelForGuruKelas:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar mata pelajaran'
        });
    }
};

/**
 * GET /nilai/:mapelId
 * Ambil nilai akademik per mata pelajaran untuk seluruh siswa di kelas
 */
exports.getNilaiByMapel = async (req, res) => {
    try {
        const { mapelId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Tidak terautentikasi'
            });
        }

        // Ambil ID INDUK (untuk validasi jadwal)
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        // Ambil ID SEMESTER + context (untuk query nilai)
        const semesterId = req.idSemesterAktif;
        const { semester, jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Validasi akses: cek jadwal mengajar pakai ID INDUK
        const [kelasRow] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND id_tahun_ajaran_induk = ?`,
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
            `SELECT id FROM pembelajaran WHERE kelas_id = ? AND mata_pelajaran_id = ? AND id_tahun_ajaran_induk = ?`,
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

        const [namaKelasRow] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelas_id]
        );
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        // Ambil siswa: siswa_kelas pakai ID INDUK
        const [siswaRows] = await db.execute(
            `SELECT id_siswa, nis, nisn, nama_lengkap
      FROM siswa
      WHERE id_siswa IN (
        SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?
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

        // Ambil nilai_detail: pakai ID SEMESTER
        const [nilaiRows] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai
       FROM nilai_detail
       WHERE mapel_id = ? AND id_tahun_ajaran_induk = ?`,
            [mapelId, semesterId]
        );

        const [komponenRows] = await db.execute(`
      SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
    `);

        // Ambil bobot: konfigurasi_mapel_komponen pakai ID SEMESTER
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND id_tahun_ajaran_induk = ?`,
            [mapelId, semesterId]
        );

        // Ambil kategori: konfigurasi_nilai_rapor pakai ID SEMESTER
        const [kategoriRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi
      FROM konfigurasi_nilai_rapor
      WHERE (mapel_id = ? OR mapel_id IS NULL) AND id_tahun_ajaran_induk = ?
      ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        // Siapkan struktur data
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

        // Bangun daftar siswa dengan perhitungan dinamis
        const siswaList = await Promise.all(siswaRows.map(async (s) => {
            const nilai = nilaiMap[s.id_siswa] || {};
            let nilaiRaporFinal = 0;
            let deskripsiFinal = '';

            if (jenis_penilaian === 'PTS') {
                // PTS: nilai rapor = nilai PTS
                const nilaiPTS = ptsKomponenId ? (nilai[ptsKomponenId] || 0) : 0;
                nilaiRaporFinal = nilaiPTS;
                deskripsiFinal = getDeskripsiFromKategori(nilaiRaporFinal, kategoriRows);
            } else {
                // PAS: hitung ulang berdasarkan bobot terbaru
                const nilaiUH = uhKomponenIds
                    .map(id => nilai[id])
                    .filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

                const nilaiPAS = pasKomponenId ? (nilai[pasKomponenId] || 0) : 0;

                // Ambil nilai PTS FINAL dari nilai_rapor (PTS sudah final)
                let nilaiPTSFinal = 0;
                if (ptsKomponenId) {
                    const [ptsRow] = await db.execute(
                        `SELECT nilai_rapor FROM nilai_rapor
            WHERE siswa_id = ? AND mapel_id = ? AND id_tahun_ajaran_induk = ?
              AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [s.id_siswa, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
                }

                // Ambil bobot
                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponenId ? bobotMap.get(ptsKomponenId) || 0 : 0;
                const bobotPAS = pasKomponenId ? bobotMap.get(pasKomponenId) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                // Hitung nilai akhir
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
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data nilai'
        });
    }
};

/**
 * PUT /nilai-komponen/:mapelId/:siswaId
 * Update nilai komponen penilaian dan menghitung nilai rapor otomatis
 */
exports.updateNilaiKomponen = async (req, res) => {
    try {
        const { mapelId, siswaId } = req.params;
        const { nilai } = req.body;
        const userId = req.user.id;
        const jenis = req.jenis_penilaian;

        // Ambil ID dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        // Validasi akses guru kelas untuk mapel wajib
        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND id_tahun_ajaran_induk = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (gkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kelas aktif tidak ditemukan'
            });
        }
        const { kelas_id } = gkRows[0];

        // Ambil daftar komponen penilaian
        const komponenList = await komponenPenilaianModel.getAllKomponen();
        const uhKomponenIds = komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenList.find(k => /^PAS$/i.test(k.nama_komponen));

        // ===== VALIDASI INPUT SAAT PTS AKTIF =====
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
                return res.status(400).json({
                    success: false,
                    message: `Nilai ${ptsKomponen.nama_komponen} wajib diisi di periode PTS.`
                });
            }
        }

        // ===== SIMPAN NILAI DETAIL KE DATABASE (PAKAI ID SEMESTER) =====
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            let nilaiBulat = null;
            if (nilaiSiswa != null && nilaiSiswa !== '' && !isNaN(nilaiSiswa)) {
                nilaiBulat = Math.floor(parseFloat(nilaiSiswa));
                if (nilaiBulat < 0) nilaiBulat = 0;
                if (nilaiBulat > 100) nilaiBulat = 100;
            }
            await db.execute(
                `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, id_tahun_ajaran_induk, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), updated_at = NOW()`,
                [siswaId, mapelId, komponenId, nilaiBulat, semesterId, userId]
            );
        }

        // ===== AMBIL SEMUA NILAI DARI DATABASE (PAKAI ID SEMESTER) =====
        const [nilaiDetailRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND id_tahun_ajaran_induk = ?`,
            [siswaId, mapelId, semesterId]
        );
        const nilaiFromDB = {};
        nilaiDetailRows.forEach(row => {
            if (row.nilai != null) nilaiFromDB[row.komponen_id] = Math.floor(parseFloat(row.nilai));
        });

        // ===== AMBIL BOBOT PENILAIAN (PAKAI ID SEMESTER) =====
        const bobotList = await bobotPenilaianModel.getBobotByMapel(mapelId, semesterId);
        const bobotMap = new Map();
        bobotList.forEach(b => bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0));

        // ===== VARIABEL UNTUK HASIL PERHITUNGAN =====
        let nilaiRapor = 0;
        let deskripsi = '';

        // ===== PERHITUNGAN UNTUK PERIODE PTS =====
        if (jenis === 'PTS') {
            const nilaiPTS = ptsKomponen ? nilaiFromDB[ptsKomponen.id_komponen] || 0 : 0;
            nilaiRapor = nilaiPTS;
            deskripsi = await konfigurasiNilaiRaporModel.getDeskripsiByNilai(nilaiRapor, mapelId, semesterId);
        }
        // ===== PERHITUNGAN UNTUK PERIODE PAS =====
        else if (jenis === 'PAS') {
            let nilaiPTSFinal = 0;
            if (ptsKomponen) {
                const [ptsRow] = await db.execute(
                    `SELECT nilai_rapor FROM nilai_rapor 
          WHERE siswa_id = ? AND mapel_id = ? AND id_tahun_ajaran_induk = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
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

        // ===== SIMPAN KE TABEL nilai_rapor (PAKAI ID SEMESTER) =====
        const nilaiRaporBulat = Math.floor(nilaiRapor);
        await db.execute(
            `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, id_tahun_ajaran_induk, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
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
        console.error('❌ Error updateNilaiKomponen:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai komponen',
            error: err.message
        });
    }
};

module.exports = exports;