/**
 * Nama File: penilaianNilaiController.js
 * Fungsi: Mengelola input nilai siswa oleh guru bidang studi
 * UPDATE: Fix 8 bug kritis + Tambah field bobot_sudah_diatur
 */

const db = require('../../config/db');

/**
 * Mengambil nilai siswa berdasarkan mata pelajaran dan kelas.
 */
exports.getNilaiByMapelAndKelas = async (req, res) => {
    try {
        const { mapelId, kelasId } = req.params;
        const userId = req.user.id;

        if (!mapelId || !kelasId) {
            return res.status(400).json({
                success: false,
                message: 'ID mata pelajaran dan kelas wajib diisi',
            });
        }

        // Ambil tahun ajaran aktif (semester)
        const [taSemesterRows] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, status_pts, status_pas
            FROM tahun_ajaran
            WHERE status = 'aktif'
            LIMIT 1
        `);
        if (taSemesterRows.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Tahun ajaran aktif tidak ditemukan',
            });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const { semester, status_pts, status_pas } = taSemesterRows[0];

        // Tentukan jenis penilaian aktif
        let jenis_penilaian_aktif = null;
        if (status_pts === 'aktif') {
            jenis_penilaian_aktif = 'PTS';
        } else if (status_pas === 'aktif') {
            jenis_penilaian_aktif = 'PAS';
        }

        // Validasi akses guru
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

        // Ambil nama kelas
        const [namaKelasRow] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelasId]
        );
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        // ═══════════════════════════════════════════════════════════════
        // ✅ BARU: CEK BOBOT SUDAH DIATUR
        // ═══════════════════════════════════════════════════════════════
        const [bobotCheck] = await db.execute(`
            SELECT COUNT(*) as total 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? 
            AND tahun_ajaran_id = ?
            AND is_active = 1
            AND (kelas_id = ? OR kelas_id IS NULL)
        `, [mapelId, semesterId, kelasId]);

        const bobotSudahDiatur = (bobotCheck[0]?.total || 0) > 0;
        // ────────────────────────────────────────────────────────────────

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? 
            AND sk.id_tahun_ajaran_induk = ?
            AND s.status = 'aktif'
            ORDER BY s.nama_lengkap`,
            [kelasId, indukId]
        );

        // Jika tidak ada siswa aktif, return kosong
        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                siswaList: [],
                komponen: [],
                kelas: kelasNama,
                jenis_penilaian_aktif,
                bobot_sudah_diatur: bobotSudahDiatur,  // ✅ TAMBAHKAN
            });
        }

        // Ambil komponen penilaian
        const [komponenRows] = await db.execute(`
            SELECT id_komponen, nama_komponen 
            FROM komponen_penilaian 
            ORDER BY urutan
        `);

        const [nilaiRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, deskripsi, jenis_penilaian, is_locked
            FROM nilai_rapor
            WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
            [mapelId, semesterId, semester]
        );

        const siswaIds = siswaRows.map(s => s.id);
        const [allNilaiDetail] = await db.execute(
            `SELECT siswa_id, komponen_id, nilai 
            FROM nilai_detail 
            WHERE mapel_id = ? AND tahun_ajaran_id = ?
            AND siswa_id IN (${siswaIds.map(() => '?').join(',')})`,
            [mapelId, semesterId, ...siswaIds]
        );

        // Group nilai detail by siswa_id
        const nilaiBySiswa = new Map();
        allNilaiDetail.forEach(row => {
            if (!nilaiBySiswa.has(row.siswa_id)) {
                nilaiBySiswa.set(row.siswa_id, new Map());
            }
            nilaiBySiswa.get(row.siswa_id).set(row.komponen_id, row.nilai);
        });

        // Bangun Map untuk nilai rapor PTS dan PAS
        const nilaiRaporPTSMap = new Map();
        const nilaiRaporPASMap = new Map();

        nilaiRaporRows.forEach(row => {
            const data = {
                nilai_rapor: row.nilai_rapor,
                deskripsi: row.deskripsi,
                is_locked: row.is_locked || false,
            };

            if (row.jenis_penilaian === 'PTS') {
                nilaiRaporPTSMap.set(row.siswa_id, data);
            } else if (row.jenis_penilaian === 'PAS') {
                nilaiRaporPASMap.set(row.siswa_id, data);
            }
        });

        // Bangun list siswa dengan nilai detail dan rapor
        const siswaList = [];
        for (const s of siswaRows) {
            // Ambil nilai detail dari Map (tanpa query lagi!)
            const nilaiMap = nilaiBySiswa.get(s.id) || new Map();

            const nilaiRecord = {};
            komponenRows.forEach(k => {
                nilaiRecord[k.id_komponen] = nilaiMap.get(k.id_komponen) ?? null;
            });

            // Ambil data rapor PTS & PAS dari Map
            const raporPTS = nilaiRaporPTSMap.get(s.id);
            const raporPAS = nilaiRaporPASMap.get(s.id);

            siswaList.push({
                id: s.id,
                nama: s.nama,
                nis: s.nis,
                nisn: s.nisn,
                nilai: nilaiRecord,
                nilai_rapor_pts: raporPTS?.nilai_rapor ?? null,
                deskripsi_pts: raporPTS?.deskripsi ?? null,
                is_locked_pts: raporPTS?.is_locked || false,
                nilai_rapor_pas: raporPAS?.nilai_rapor ?? null,
                deskripsi_pas: raporPAS?.deskripsi ?? null,
                is_locked_pas: raporPAS?.is_locked || false,
            });
        }

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            jenis_penilaian_aktif,
            bobot_sudah_diatur: bobotSudahDiatur,  // ✅ TAMBAHKAN INI
        });
    } catch (err) {
        console.error('Error getNilaiByMapelAndKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data nilai' });
    }
};

/**
 * Menyimpan nilai untuk satu komponen penilaian.
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

        // Ambil ID SEMESTER aktif
        const [taSemesterRows] = await db.execute(`
            SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
        `);
        if (taSemesterRows.length === 0) {
            return res.status(500).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;

        // Ambil ID INDUK
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND kelas_id IN (
                SELECT kelas_id FROM siswa_kelas 
                WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?
            ) AND tahun_ajaran_id = ?`,
            [user_id, mapel_id, siswa_id, tahunAjaranIndukId, semesterId]
        );

        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        await db.execute(
            `INSERT INTO nilai_detail 
            (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            nilai = VALUES(nilai),
            updated_at = NOW()`,
            [siswa_id, mapel_id, komponen_id, nilai, semesterId]
        );

        res.json({ success: true, message: 'Nilai berhasil disimpan' });
    } catch (err) {
        console.error('Error simpanNilai:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
    }
};

/**
 * Menyimpan nilai untuk banyak komponen sekaligus dan menghitung nilai rapor otomatis.
 */
exports.simpanNilaiKomponenBanyak = async (req, res) => {
    try {
        const { mapelId, siswaId } = req.params;
        const { nilai } = req.body;
        const mapelIdNum = parseInt(mapelId, 10);
        const siswaIdNum = parseInt(siswaId, 10);

        if (isNaN(mapelIdNum) || isNaN(siswaIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'ID tidak valid'
            });
        }

        const userId = req.user.id;
        const jenis_penilaian = req.jenis_penilaian;

        if (!jenis_penilaian) {
            return res.status(400).json({
                success: false,
                message: 'Periode penilaian tidak aktif'
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 1: Ambil Tahun Ajaran Aktif
        // ═══════════════════════════════════════════════════════════════
        const [taSemesterRows] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester 
            FROM tahun_ajaran 
            WHERE status = 'aktif' 
            LIMIT 1
        `);
        if (taSemesterRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const indukId = taSemesterRows[0].id_tahun_ajaran_induk;
        const semester = taSemesterRows[0].semester;

        // ═══════════════════════════════════════════════════════════════
        // STEP 2: Validasi Akses (PAKAI SEMESTER ID!)
        // ═══════════════════════════════════════════════════════════════
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelIdNum, semesterId]
        );

        if (valid.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak'
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Cek Locked
        // ═══════════════════════════════════════════════════════════════
        const [lockedRows] = await db.execute(
            `SELECT is_locked FROM nilai_rapor 
            WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [siswaIdNum, mapelIdNum, semesterId, semester, jenis_penilaian]
        );
        if (lockedRows.length > 0 && lockedRows[0].is_locked) {
            return res.status(403).json({
                success: false,
                message: `Nilai ${jenis_penilaian} sudah dikunci dan tidak dapat diubah.`
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 4: Cek Siswa Aktif + Ambil kelas_id
        // ═══════════════════════════════════════════════════════════════
        const [siswaAktifRows] = await db.execute(
            `SELECT sk.kelas_id, s.status
        FROM siswa_kelas sk
        JOIN siswa s ON sk.siswa_id = s.id_siswa
        JOIN pembelajaran p ON sk.kelas_id = p.kelas_id
        WHERE sk.siswa_id = ? 
            AND p.user_id = ? 
            AND p.mapel_id = ? 
            AND p.tahun_ajaran_id = ?
            AND sk.id_tahun_ajaran_induk = ?
        LIMIT 1`,
            [siswaIdNum, userId, mapelIdNum, semesterId, indukId]
        );

        if (siswaAktifRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Siswa tidak aktif di kelas yang Anda ajar'
            });
        }

        if (siswaAktifRows[0].status !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: `Siswa tidak aktif (status: ${siswaAktifRows[0].status}). Nilai tidak dapat diubah.`
            });
        }

        const kelasIdNum = siswaAktifRows[0].kelas_id;

        // ═══════════════════════════════════════════════════════════════
        // STEP 5: Ambil Komponen & Validasi
        // ═══════════════════════════════════════════════════════════════
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

        const validKomponenIds = new Set(komponenRows.map(k => k.id_komponen));
        for (const komponenIdStr of Object.keys(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if (!validKomponenIds.has(komponenId)) {
                return res.status(400).json({
                    success: false,
                    message: `Komponen ID ${komponenId} tidak valid`
                });
            }
        }

        // Validasi periode PTS
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
                    message: 'Saat periode PTS aktif, hanya komponen PTS yang boleh diinput'
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 6: Simpan Nilai Detail
        // ═══════════════════════════════════════════════════════════════
        const [existingNilaiRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail 
            WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaIdNum, mapelIdNum, semesterId]
        );
        const existingNilaiMap = new Map();
        existingNilaiRows.forEach(row => existingNilaiMap.set(row.komponen_id, row.nilai));

        // Hapus komponen yang di-set null
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            if ((nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '')
                && existingNilaiMap.has(komponenId)) {
                await db.execute(
                    `DELETE FROM nilai_detail 
                    WHERE siswa_id = ? AND mapel_id = ? AND komponen_id = ? AND tahun_ajaran_id = ?`,
                    [siswaIdNum, mapelIdNum, komponenId, semesterId]
                );
            }
        }

        // Cek perubahan
        let hasChanges = false;
        const perubahanList = [];
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            const nilaiBaru = (nilaiSiswa !== null && nilaiSiswa !== undefined && nilaiSiswa !== '')
                ? Math.round(parseFloat(nilaiSiswa))
                : null;
            const nilaiLama = existingNilaiMap.get(komponenId) ?? null;

            if (nilaiBaru !== nilaiLama) {
                hasChanges = true;
                const komponenNama = komponenRows.find(k => k.id_komponen === komponenId)?.nama_komponen || komponenId;
                perubahanList.push({
                    komponen: komponenNama,
                    lama: nilaiLama,
                    baru: nilaiBaru
                });
            }
        }

        if (!hasChanges) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada perubahan data',
                no_changes: true
            });
        }

        // Simpan nilai detail
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);

            if (nilaiSiswa === null || nilaiSiswa === undefined || nilaiSiswa === '') {
                continue;
            }

            const parsed = parseFloat(nilaiSiswa);
            if (isNaN(parsed)) continue;

            if (!Number.isInteger(parsed)) {
                return res.status(400).json({
                    success: false,
                    message: `Nilai harus bilangan bulat. Diterima: ${nilaiSiswa}`
                });
            }

            let nilaiBulat = Math.round(parsed);
            if (nilaiBulat < 0) nilaiBulat = 0;
            if (nilaiBulat > 100) nilaiBulat = 100;

            await db.execute(
                `INSERT INTO nilai_detail 
                (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                nilai = VALUES(nilai),
                updated_at = NOW()`,
                [siswaIdNum, mapelIdNum, komponenId, nilaiBulat, semesterId, userId]
            );
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 7: Hitung Nilai Rapor
        // ═══════════════════════════════════════════════════════════════
        const [nilaiRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaIdNum, mapelIdNum, semesterId]
        );

        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot, kelas_id 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? 
            AND tahun_ajaran_id = ?
            AND is_active = 1
            AND (kelas_id = ? OR kelas_id IS NULL)`,
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

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        let nilaiRaporPTS = null;
        let nilaiRaporPAS = null;
        let deskripsiPTS = null;
        let deskripsiPAS = null;

        const getConfigRows = async () => {
            const [rows] = await db.execute(
                `SELECT min_nilai, max_nilai, deskripsi 
                FROM konfigurasi_nilai_rapor 
                WHERE mapel_id = ? AND tahun_ajaran_id = ?
                AND (kelas_id = ? OR kelas_id IS NULL)
                ORDER BY 
                    CASE WHEN kelas_id = ? THEN 0 ELSE 1 END,
                    min_nilai DESC`,
                [mapelIdNum, semesterId, kelasIdNum, kelasIdNum]
            );
            return rows;
        };

        // Hitung nilai rapor PTS (otomatis saat PTS aktif)
        if (ptsKomponen) {
            const nilaiPTS = nilaiMap.get(ptsKomponen.id_komponen);

            if (nilaiPTS !== undefined && nilaiPTS !== null) {
                nilaiRaporPTS = Math.round(nilaiPTS);

                const configRowsPTS = await getConfigRows();

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
            const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;

            const [ptsRaporRows] = await db.execute(
                `SELECT nilai_rapor FROM nilai_rapor
                WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                [siswaIdNum, mapelIdNum, semesterId, semester]
            );
            const nilaiPTSForPAS = ptsRaporRows.length > 0 ? ptsRaporRows[0].nilai_rapor : 0;

            const nilaiPAS = pasKomponen ? (nilaiMap.get(pasKomponen.id_komponen) || 0) : 0;

            const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
            const bobotPTSForPAS = ptsKomponen ? (bobotMap.get(ptsKomponen.id_komponen) || 0) : 0;
            const bobotPAS = pasKomponen ? (bobotMap.get(pasKomponen.id_komponen) || 0) : 0;
            const totalBobot = totalBobotUH + bobotPTSForPAS + bobotPAS;

            if (bobotRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bobot penilaian belum dikonfigurasi. Silakan hubungi admin.'
                });
            }

            if (Math.abs(totalBobot - 100) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Total bobot harus 100%. Saat ini: ${totalBobot.toFixed(2)}%`
                });
            }

            if (totalBobot > 0) {
                const nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTSForPAS * bobotPTSForPAS) + (nilaiPAS * bobotPAS)) / totalBobot;
                nilaiRaporPAS = Math.round(nilaiRapor);

                const configRowsPAS = await getConfigRows();

                for (const config of configRowsPAS) {
                    if (nilaiRaporPAS >= config.min_nilai && nilaiRaporPAS <= config.max_nilai) {
                        deskripsiPAS = config.deskripsi;
                        break;
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 8: Simpan Rapor (pakai kelas_id dari siswa_kelas)
        // ═══════════════════════════════════════════════════════════════

        // Simpan nilai rapor PTS
        if (jenis_penilaian === 'PTS' && nilaiRaporPTS !== null) {
            await db.execute(
                `INSERT INTO nilai_rapor 
                (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PTS', ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                nilai_rapor = VALUES(nilai_rapor),
                deskripsi = VALUES(deskripsi),
                updated_at = NOW()`,
                [siswaIdNum, mapelIdNum, kelasIdNum, semesterId, semester, nilaiRaporPTS, deskripsiPTS, userId]
            );
        }

        // Simpan nilai rapor PAS
        if (jenis_penilaian === 'PAS' && nilaiRaporPAS !== null) {
            await db.execute(
                `INSERT INTO nilai_rapor 
                (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                nilai_rapor = VALUES(nilai_rapor),
                deskripsi = VALUES(deskripsi),
                updated_at = NOW()`,
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
            jumlah_perubahan: perubahanList.length
        });
    } catch (err) {
        console.error('Error simpanNilaiKomponenBanyak:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai: ' + err.message
        });
    }
};