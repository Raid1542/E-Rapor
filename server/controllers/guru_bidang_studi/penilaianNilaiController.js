/**
 * Nama File: penilaianNilaiController.js
 * Fungsi: Mengelola input nilai siswa oleh guru bidang studi
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

        // Ambil ID SEMESTER aktif
        const [taSemesterRows] = await db.execute(`
        SELECT id_tahun_ajaran, semester, status_pts, status_pas
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
        const { semester, status_pts, status_pas } = taSemesterRows[0];

        // Ambil ID INDUK
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        // Tentukan jenis penilaian aktif
        let jenis_penilaian_aktif = 'PAS';
        if (status_pts === 'aktif') {
            jenis_penilaian_aktif = 'PTS';
        } else if (status_pas === 'aktif') {
            jenis_penilaian_aktif = 'PAS';
        } else {
            return res.status(403).json({
                success: false,
                message: 'Periode penilaian tidak aktif. Tidak dapat mengambil data nilai.',
            });
        }

        // Validasi akses
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
        _id = ? AND mata_pelajaran_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
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

        // Ambil siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama
        FROM siswa s
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
        ORDER BY s.nama_lengkap`,
            [kelasId, semesterId]
        );

        const [komponenRows] = await db.execute(`
        SELECT id_komponen, nama_komponen 
        FROM komponen_penilaian 
        ORDER BY urutan
    `);

        // Ambil bobot PER SEMESTER
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot 
        FROM konfigurasi_mapel_komponen 
        WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelId, semesterId]
        );

        // Ambil kategori PER SEMESTER
        const [configRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi 
        FROM konfigurasi_nilai_rapor 
        WHERE mapel_id = ? AND tahun_ajaran_id = ?
        ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
        );

        // Ambil nilai rapor yang sudah disimpan
        const [nilaiRaporRows] = await db.execute(
            `SELECT siswa_id, nilai_rapor, deskripsi, jenis_penilaian
        FROM nilai_rapor
        WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [mapelId, semesterId, semester, jenis_penilaian_aktif]
        );

        const nilaiRaporMap = new Map();
        nilaiRaporRows.forEach(row => {
            nilaiRaporMap.set(row.siswa_id, {
                nilai_rapor: row.nilai_rapor,
                deskripsi: row.deskripsi,
            });
        });

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

            if (nilaiRaporMap.has(s.id)) {
                const dataRapor = nilaiRaporMap.get(s.id);
                const nilaiRecord = {};
                komponenRows.forEach(k => {
                    nilaiRecord[k.id_komponen] = nilaiMap[k.id_komponen] ?? null;
                });

                siswaList.push({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis,
                    nisn: s.nisn,
                    nilai_rapor: dataRapor.nilai_rapor,
                    deskripsi: dataRapor.deskripsi,
                    nilai: nilaiRecord,
                });
            } else {
                // Hitung preview nilai rapor
                const nilaiUH = uhKomponenIds.map(id => nilaiMap[id]).filter(v => v != null);
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const nilaiPTS = ptsKomponen ? nilaiMap[ptsKomponen.id_komponen] || 0 : 0;
                const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
                const nilaiPAS = pasKomponen ? nilaiMap[pasKomponen.id_komponen] || 0 : 0;
                const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;

                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;
                let nilaiRapor = 0;
                let deskripsi = 'Belum ada deskripsi';

                const hasBobotConfig = bobotRows.length > 0;

                if (hasBobotConfig && totalBobot > 0) {
                    nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTS * bobotPTS) + (nilaiPAS * bobotPAS)) / totalBobot;
                } else {
                    nilaiRapor = 0;
                }

                const nilaiRaporBulat = Math.floor(nilaiRapor);

                for (const config of configRows) {
                    if (nilaiRaporBulat >= config.min_nilai && nilaiRaporBulat <= config.max_nilai) {
                        deskripsi = config.deskripsi;
                        break;
                    }
                }

                const nilaiRecord = {};
                komponenRows.forEach(k => {
                    nilaiRecord[k.id_komponen] = nilaiMap[k.id_komponen] ?? null;
                });

                siswaList.push({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis,
                    nisn: s.nisn,
                    nilai_rapor: nilaiRaporBulat,
                    deskripsi: deskripsi,
                    nilai: nilaiRecord,
                });
            }
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

        // Validasi akses
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
        WHERE user_id = ? AND mata_pelajaran_id = ? AND kelas_id IN (
        SELECT kelas_id FROM siswa_kelas 
        WHERE siswa_id = ? AND tahun_ajaran_id = ?
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

        // Ambil ID SEMESTER aktif
        const [taSemesterRows] = await db.execute(`
        SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
        if (taSemesterRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }
        const semesterId = taSemesterRows[0].id_tahun_ajaran;
        const semester = taSemesterRows[0].semester;

        // Ambil ID INDUK
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        if (!tahunAjaranIndukId) {
            return res.status(400).json({ success: false, message: 'ID Tahun Ajaran Induk tidak ditemukan' });
        }

        // Validasi akses
        const [valid] = await db.execute(
            `SELECT 1 FROM pembelajaran 
        WHERE user_id = ? AND mata_pelajaran_id = ? AND tahun_ajaran_id = ?`,
            [userId, mapelIdNum, tahunAjaranIndukId]
        );
        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ditolak' });
        }

        // Simpan nilai detail PER SEMESTER
        for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
            const komponenId = parseInt(komponenIdStr, 10);
            let nilaiBulat = 0;
            if (nilaiSiswa != null && nilaiSiswa !== '' && !isNaN(nilaiSiswa)) {
                nilaiBulat = Math.floor(parseFloat(nilaiSiswa));
                if (nilaiBulat < 0) nilaiBulat = 0;
                if (nilaiBulat > 100) nilaiBulat = 100;
            }
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
        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);
        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelIdNum, semesterId]
        );

        const nilaiMap = new Map();
        nilaiRows.forEach(row => nilaiMap.set(row.komponen_id, row.nilai || 0));
        const bobotMap = new Map();
        bobotRows.forEach(row => bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0));

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        const nilaiUH = uhKomponenIds.map(id => nilaiMap.get(id) || 0);
        const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
        const nilaiPTS = ptsKomponen ? nilaiMap.get(ptsKomponen.id_komponen) || 0 : 0;
        const nilaiPAS = pasKomponen ? nilaiMap.get(pasKomponen.id_komponen) || 0 : 0;

        const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
        const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
        const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
        const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

        let nilaiRapor = 0;
        const hasBobotConfig = bobotRows.length > 0;
        if (hasBobotConfig && totalBobot > 0) {
            nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTS * bobotPTS) + (nilaiPAS * bobotPAS)) / totalBobot;
        } else {
            nilaiRapor = 0;
        }

        const nilaiRaporBulat = Math.floor(nilaiRapor);

        // Ambil kategori PER SEMESTER
        let deskripsi = 'Belum ada deskripsi';
        const [configRows] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? ORDER BY min_nilai DESC`,
            [mapelIdNum, semesterId]
        );
        for (const config of configRows) {
            if (nilaiRaporBulat >= config.min_nilai && nilaiRaporBulat <= config.max_nilai) {
                deskripsi = config.deskripsi;
                break;
            }
        }

        // Ambil kelas_id dari pembelajaran
        const [kelasRows] = await db.execute(
            `SELECT kelas_id FROM pembelajaran WHERE mata_pelajaran_id = ? AND user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
            [mapelIdNum, userId, tahunAjaranIndukId]
        );
        if (kelasRows.length === 0) {
            return res.status(500).json({ success: false, message: 'Kelas tidak ditemukan' });
        }
        const kelas_id = kelasRows[0].kelas_id;

        // Simpan nilai rapor PER SEMESTER
        await db.execute(
        `INSERT INTO nilai_rapor 
        (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        nilai_rapor = VALUES(nilai_rapor),
        deskripsi = VALUES(deskripsi),
        updated_at = NOW()`,
            [siswaIdNum, mapelIdNum, kelas_id, semesterId, semester, jenis_penilaian, nilaiRaporBulat, deskripsi, userId]
        );

        res.json({
            success: true,
            message: `Nilai (${jenis_penilaian}) berhasil disimpan`,
            nilai_rapor: nilaiRaporBulat,
            deskripsi: deskripsi,
        });
    } catch (err) {
        console.error('Error simpanNilaiKomponenBanyak:', err);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
    }
};