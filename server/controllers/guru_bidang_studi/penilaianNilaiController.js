/**
 * Nama File: penilaianNilaiController.js
 * Fungsi: Mengelola input nilai siswa oleh guru bidang studi
 *
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
        const semesterId = taSemesterRows[0].id_tahun_ajaran; // = id_tahun_ajaran (semester)
        const { semester, status_pts, status_pas } = taSemesterRows[0];

        // Ambil ID INDUK dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        // Tentukan jenis penilaian aktif
        let jenis_penilaian_aktif = null;
        if (status_pts === 'aktif') {
            jenis_penilaian_aktif = 'PTS';
        } else if (status_pas === 'aktif') {
            jenis_penilaian_aktif = 'PAS';
        }

        // Ambil nilai rapor PTS & PAS (pakai semesterId = id_tahun_ajaran)
        const [nilaiRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, deskripsi, jenis_penilaian, is_locked
            FROM nilai_rapor
            WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
            [mapelId, semesterId, semester]
        );

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

        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelId, kelasId, tahunAjaranIndukId]
        );
        if (valid.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak mengajar mata pelajaran ini di kelas ini',
            });
        }

        const [namaKelasRow] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelasId]
        );
        const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
            ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        const [komponenRows] = await db.execute(`
            SELECT id_komponen, nama_komponen 
            FROM komponen_penilaian 
            ORDER BY urutan
        `);

        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot 
            FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND is_active = 1`,
            [mapelId]
        );

        const [configRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi 
            FROM konfigurasi_nilai_rapor 
            WHERE mapel_id = ? AND tahun_ajaran_id = ?
            ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        const bobotMap = new Map();
        bobotRows.forEach(b => bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0));

        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        const siswaList = [];
        for (const s of siswaRows) {
            const [nilaiDetailRows] = await db.execute(
                `SELECT komponen_id, nilai 
                FROM nilai_detail 
                WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                [s.id, mapelId, semesterId]
            );

            const nilaiMap = {};
            nilaiDetailRows.forEach(n => (nilaiMap[n.komponen_id] = n.nilai));

            const nilaiRaporPTS = nilaiRaporPTSMap.get(s.id);
            const nilaiRaporPAS = nilaiRaporPASMap.get(s.id);

            const nilaiRecord = {};
            komponenRows.forEach(k => {
                nilaiRecord[k.id_komponen] = nilaiMap[k.id_komponen] ?? null;
            });

            siswaList.push({
                id: s.id,
                nama: s.nama,
                nis: s.nis,
                nisn: s.nisn,
                nilai_rapor_pts: nilaiRaporPTS?.nilai_rapor || null,
                deskripsi_pts: nilaiRaporPTS?.deskripsi || null,
                is_locked_pts: nilaiRaporPTS?.is_locked || false,
                nilai_rapor_pas: nilaiRaporPAS?.nilai_rapor || null,
                deskripsi_pas: nilaiRaporPAS?.deskripsi || null,
                is_locked_pas: nilaiRaporPAS?.is_locked || false,
                nilai: nilaiRecord,
            });
        }

        res.json({
            success: true,
            siswaList,
            komponen: komponenRows,
            kelas: kelasNama,
            jenis_penilaian_aktif,
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
            [user_id, mapel_id, siswa_id, tahunAjaranIndukId, tahunAjaranIndukId]
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
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }

        const userId = req.user.id;
        const jenis_penilaian = req.jenis_penilaian;

        if (!jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Periode penilaian tidak aktif' });
        }

        // Ambil tahun ajaran aktif
        const [taSemesterRows] = await db.execute(`
            SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
        `);
        if (taSemesterRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const semester = taSemesterRows[0].semester;

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        // Validasi akses
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelIdNum, tahunAjaranIndukId]
        );
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        // Cek locked
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

        // Cek siswa aktif
        const [siswaAktifRows] = await db.execute(
            `SELECT 1 FROM siswa_kelas sk
            JOIN pembelajaran p ON sk.kelas_id = p.kelas_id AND sk.id_tahun_ajaran_induk = p.tahun_ajaran_id
            WHERE sk.siswa_id = ? AND p.user_id = ? AND p.mapel_id = ? AND p.tahun_ajaran_id = ?
            LIMIT 1`,
            [siswaIdNum, userId, mapelIdNum, tahunAjaranIndukId]
        );
        if (siswaAktifRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Siswa tidak aktif di kelas yang Anda ajar'
            });
        }

        // Ambil komponen
        const [komponenRows] = await db.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

        // Validasi komponen ID
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

        // Ambil nilai existing
        const [existingNilaiRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail 
            WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaIdNum, mapelIdNum, semesterId]
        );
        const existingNilaiMap = new Map();
        existingNilaiRows.forEach(row => existingNilaiMap.set(row.komponen_id, row.nilai));

        // ✅ TAMBAHAN: Hapus komponen yang di-set null (jika sebelumnya ada)
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
                ? Math.floor(parseFloat(nilaiSiswa))
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

        // ✅ PERBAIKAN: Simpan nilai detail - SKIP yang null
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);

            // ✅ SKIP jika null/undefined/kosong
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

            let nilaiBulat = Math.floor(parsed);
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

        // Ambil data untuk hitung rapor
        const [nilaiRows] = await db.execute(
            `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
            [siswaIdNum, mapelIdNum, semesterId]
        );
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND is_active = 1`,
            [mapelIdNum]
        );

        const nilaiMap = new Map();
        nilaiRows.forEach(row => nilaiMap.set(row.komponen_id, row.nilai || 0));
        const bobotMap = new Map();
        bobotRows.forEach(row => bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0));

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        let nilaiRaporPTS = null;
        let nilaiRaporPAS = null;
        let deskripsiPTS = null;
        let deskripsiPAS = null;

        // Hitung nilai rapor PTS
        if (ptsKomponen) {
            const nilaiPTS = nilaiMap.get(ptsKomponen.id_komponen);

            if (nilaiPTS !== undefined && nilaiPTS !== null) {
                nilaiRaporPTS = Math.floor(nilaiPTS);

                const [configRowsPTS] = await db.execute(
                    `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? ORDER BY min_nilai DESC`,
                    [mapelIdNum, semesterId]
                );

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
            const nilaiPTSForPAS = ptsKomponen ? (nilaiMap.get(ptsKomponen.id_komponen) || 0) : 0;
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
                nilaiRaporPAS = Math.floor(nilaiRapor);

                const [configRowsPAS] = await db.execute(
                    `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? ORDER BY min_nilai DESC`,
                    [mapelIdNum, semesterId]
                );

                for (const config of configRowsPAS) {
                    if (nilaiRaporPAS >= config.min_nilai && nilaiRaporPAS <= config.max_nilai) {
                        deskripsiPAS = config.deskripsi;
                        break;
                    }
                }

                if (!deskripsiPAS) {
                    return res.status(400).json({
                        success: false,
                        message: `Nilai rapor ${nilaiRaporPAS} tidak masuk kategori manapun. Silakan hubungi admin.`
                    });
                }
            }
        }

        // Ambil kelas_id
        const [kelasRows] = await db.execute(
            `SELECT kelas_id FROM pembelajaran WHERE mapel_id = ? AND user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
            [mapelIdNum, userId, tahunAjaranIndukId]
        );
        if (kelasRows.length === 0) {
            return res.status(500).json({ success: false, message: 'Kelas tidak ditemukan' });
        }
        const kelas_id = kelasRows[0].kelas_id;

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
                [siswaIdNum, mapelIdNum, kelas_id, semesterId, semester, nilaiRaporPTS, deskripsiPTS, userId]
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
                [siswaIdNum, mapelIdNum, kelas_id, semesterId, semester, nilaiRaporPAS, deskripsiPAS, userId]
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
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
    }
};