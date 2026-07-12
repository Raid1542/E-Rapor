/**
 * Nama File: dashboardController.js
 * Fungsi: Controller dashboard admin (statistik, progress guru, kelengkapan rapor)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const guruModel = require('../../models/admin/guruModel');

/* ==========================================================================
   GET: Ambil statistik dashboard (jumlah guru, siswa, admin, ekskul, kelas, mapel)
   ========================================================================== */

const getDashboardStats = async (req, res) => {
    try {
        const [taAktif] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester, tahun_ajaran, status_pts, status_pas
            FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
        `);

        if (taAktif.length === 0) {
            return res.json({
                success: true,
                data: {
                    guru: 0, siswa: 0, admin: 0, ekstrakurikuler: 0, kelas: 0, mata_pelajaran: 0,
                    tahun_ajaran: null, semester: null, status_pts: 'nonaktif', status_pas: 'nonaktif'
                }
            });
        }

        const taIdDetail = taAktif[0].id_tahun_ajaran;
        const taIdInduk = taAktif[0].id_tahun_ajaran_induk;

        // Count semua entitas
        const [guruRows] = await db.execute(
            'SELECT COUNT(DISTINCT u.id_user) AS total FROM user u INNER JOIN user_role ur ON u.id_user = ur.id_user WHERE ur.role IN (\'guru_kelas\', \'guru_bidang_studi\') AND u.status = \'aktif\''
        );
        const [siswaRows] = await db.execute('SELECT COUNT(DISTINCT s.id_siswa) AS total FROM siswa s WHERE s.status = \'aktif\'');
        const [adminRows] = await db.execute(
            'SELECT COUNT(*) AS total FROM user u INNER JOIN user_role ur ON u.id_user = ur.id_user WHERE ur.role = \'admin\' AND u.status = \'aktif\''
        );
        const [ekskulRows] = await db.execute('SELECT COUNT(*) AS total FROM ekstrakurikuler WHERE tahun_ajaran_id IN (?, ?)', [taIdDetail, taIdInduk]);
        const [kelasRows] = await db.execute('SELECT COUNT(*) AS total FROM kelas WHERE tahun_ajaran_id IN (?, ?)', [taIdDetail, taIdInduk]);
        const [mapelRows] = await db.execute('SELECT COUNT(*) AS total FROM mata_pelajaran WHERE tahun_ajaran_id IN (?, ?)', [taIdDetail, taIdInduk]);

        res.json({
            success: true,
            data: {
                guru: Number(guruRows[0].total) || 0,
                siswa: Number(siswaRows[0].total) || 0,
                admin: Number(adminRows[0].total) || 0,
                ekstrakurikuler: Number(ekskulRows[0].total) || 0,
                kelas: Number(kelasRows[0].total) || 0,
                mata_pelajaran: Number(mapelRows[0].total) || 0,
                tahun_ajaran: taAktif[0].tahun_ajaran,
                semester: taAktif[0].semester,
                id_detail: taIdDetail,
                status_pts: taAktif[0].status_pts || 'nonaktif',
                status_pas: taAktif[0].status_pas || 'nonaktif'
            }
        });
    } catch (err) {
        console.error('Error getDashboardStats:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat statistik dashboard' });
    }
};

/* ==========================================================================
   PUT: Upload foto profil admin/guru
   ========================================================================== */

const uploadFotoProfil = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'File foto diperlukan' });
        const userId = req.user.id;
        const fotoPath = `/uploads/${req.file.filename}`;
        const success = await guruModel.updateFoto(userId, fotoPath);
        if (!success) return res.status(404).json({ message: 'Guru tidak ditemukan' });
        res.json({ success: true, message: 'Foto profil berhasil diupload', fotoPath });
    } catch (err) {
        console.error('Error upload foto profil:', err);
        res.status(500).json({ message: 'Gagal mengupload foto profil' });
    }
};

/* ==========================================================================
   HELPER — ambil tahun ajaran aktif + jenis penilaian yang sedang berjalan
   Dipakai oleh getProgressGuru & getKelengkapanRapor di bawah.
   ========================================================================== */

const getPeriodeAktif = async () => {
    const [taAktif] = await db.execute(`
        SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester,
               status_pts, status_pas
        FROM tahun_ajaran
        WHERE status = 'aktif'
        LIMIT 1
    `);

    if (taAktif.length === 0) return null;

    const jenisAktif = [];
    if (taAktif[0].status_pts === 'aktif') jenisAktif.push('PTS');
    if (taAktif[0].status_pas === 'aktif') jenisAktif.push('PAS');

    return {
        taIdDetail: taAktif[0].id_tahun_ajaran,
        taIdInduk: taAktif[0].id_tahun_ajaran_induk,
        semester: taAktif[0].semester,
        jenisAktif,
    };
};

/* ==========================================================================
   PROGRESS INPUT NILAI GURU (versi optimized — JOIN+GROUP BY)
   ========================================================================== */

const getProgressGuru = async (req, res) => {
    try {
        const periode = await getPeriodeAktif();

        if (!periode || periode.jenisAktif.length === 0) {
            return res.json({
                success: true,
                data: { total_guru: 0, sudah_input: 0, belum_input: 0 }
            });
        }

        const { taIdDetail, taIdInduk, semester, jenisAktif } = periode;

        const [assignments] = await db.execute(`
            SELECT
                p.user_id,
                p.mapel_id,
                p.kelas_id,
                (
                    SELECT COUNT(*) FROM siswa_kelas sk
                    WHERE sk.kelas_id = p.kelas_id
                      AND sk.id_tahun_ajaran_induk = ?
                ) AS total_siswa
            FROM pembelajaran p
            WHERE p.tahun_ajaran_id IN (?, ?)
        `, [taIdInduk, taIdDetail, taIdInduk]);

        if (assignments.length === 0) {
            return res.json({
                success: true,
                data: { total_guru: 0, sudah_input: 0, belum_input: 0 }
            });
        }

        const placeholdersJenis = jenisAktif.map(() => '?').join(',');
        const [terisiRows] = await db.execute(`
            SELECT
                nr.mapel_id,
                nr.kelas_id,
                nr.jenis_penilaian,
                COUNT(DISTINCT nr.siswa_id) AS jumlah_terisi
            FROM nilai_rapor nr
            WHERE nr.semester = ?
              AND nr.jenis_penilaian IN (${placeholdersJenis})
            GROUP BY nr.mapel_id, nr.kelas_id, nr.jenis_penilaian
        `, [semester, ...jenisAktif]);

        const terisiMap = new Map();
        for (const row of terisiRows) {
            const key = `${row.mapel_id}-${row.kelas_id}-${row.jenis_penilaian}`;
            terisiMap.set(key, Number(row.jumlah_terisi));
        }

        let sudahInput = 0;
        let belumInput = 0;

        // Map: user_id -> apakah SEMUA assignment guru ini sudah lengkap
        const statusPerGuru = new Map();

        for (const a of assignments) {
            const totalSiswa = Number(a.total_siswa) || 0;
            if (totalSiswa === 0) continue;

            const lengkapAssignmentIni = jenisAktif.every((jenis) => {
                const key = `${a.mapel_id}-${a.kelas_id}-${jenis}`;
                const terisi = terisiMap.get(key) || 0;
                return terisi >= totalSiswa;
            });

            // Guru dianggap "sudah input" hanya jika SEMUA assignment-nya lengkap.
            // Begitu ditemukan satu assignment yang belum lengkap, guru itu
            // langsung ditandai "belum" dan tidak akan berubah lagi.
            const statusSaatIni = statusPerGuru.get(a.user_id);
            if (statusSaatIni === false) {
                // sudah ditandai belum, tetap belum
                continue;
            }
            statusPerGuru.set(a.user_id, lengkapAssignmentIni);
        }

        for (const lengkap of statusPerGuru.values()) {
            if (lengkap) sudahInput++;
            else belumInput++;
        }

        res.json({
            success: true,
            data: {
                total_guru: sudahInput + belumInput,
                sudah_input: sudahInput,
                belum_input: belumInput,
            }
        });
    } catch (err) {
        console.error('Error getProgressGuru:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat progress input nilai guru'
        });
    }
};

/* ==========================================================================
   KELENGKAPAN RAPOR PER KELAS (versi optimized — JOIN+GROUP BY)
   ========================================================================== */

const getKelengkapanRapor = async (req, res) => {
    try {
        const periode = await getPeriodeAktif();

        if (!periode || periode.jenisAktif.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const { taIdDetail, taIdInduk, semester, jenisAktif } = periode;

        const [kelasRows] = await db.execute(`
            SELECT id_kelas, nama_kelas
            FROM kelas
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);

        if (kelasRows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const [siswaRows] = await db.execute(`
            SELECT siswa_id, kelas_id
            FROM siswa_kelas
            WHERE id_tahun_ajaran_induk = ?
        `, [taIdInduk]);

        const [mapelRows] = await db.execute(`
            SELECT DISTINCT kelas_id, mapel_id
            FROM pembelajaran
            WHERE tahun_ajaran_id IN (?, ?)
        `, [taIdDetail, taIdInduk]);

        const placeholdersJenis = jenisAktif.map(() => '?').join(',');
        const [nilaiRows] = await db.execute(`
            SELECT
                siswa_id,
                mapel_id,
                kelas_id,
                COUNT(DISTINCT jenis_penilaian) AS jenis_terisi
            FROM nilai_rapor
            WHERE semester = ?
              AND jenis_penilaian IN (${placeholdersJenis})
            GROUP BY siswa_id, mapel_id, kelas_id
        `, [semester, ...jenisAktif]);

        const siswaPerKelas = new Map();
        for (const s of siswaRows) {
            if (!siswaPerKelas.has(s.kelas_id)) siswaPerKelas.set(s.kelas_id, []);
            siswaPerKelas.get(s.kelas_id).push(s.siswa_id);
        }

        const mapelPerKelas = new Map();
        for (const m of mapelRows) {
            if (!mapelPerKelas.has(m.kelas_id)) mapelPerKelas.set(m.kelas_id, []);
            mapelPerKelas.get(m.kelas_id).push(m.mapel_id);
        }

        const nilaiMap = new Map();
        for (const n of nilaiRows) {
            const key = `${n.siswa_id}-${n.mapel_id}-${n.kelas_id}`;
            nilaiMap.set(key, Number(n.jenis_terisi));
        }

        const totalJenisAktif = jenisAktif.length;
        const hasil = [];

        for (const kelas of kelasRows) {
            const daftarSiswa = siswaPerKelas.get(kelas.id_kelas) || [];
            const daftarMapel = mapelPerKelas.get(kelas.id_kelas) || [];

            const totalSiswa = daftarSiswa.length;
            const totalMapel = daftarMapel.length;
            if (totalSiswa === 0 || totalMapel === 0) continue;

            let lengkap = 0;
            let proses = 0;
            let kosong = 0;

            for (const siswaId of daftarSiswa) {
                let mapelLengkap = 0;

                for (const mapelId of daftarMapel) {
                    const key = `${siswaId}-${mapelId}-${kelas.id_kelas}`;
                    const jenisTerisi = nilaiMap.get(key) || 0;
                    if (jenisTerisi >= totalJenisAktif) mapelLengkap++;
                }

                if (mapelLengkap === totalMapel) lengkap++;
                else if (mapelLengkap === 0) kosong++;
                else proses++;
            }

            hasil.push({
                id_kelas: kelas.id_kelas,
                nama_kelas: kelas.nama_kelas,
                total_siswa: totalSiswa,
                rapor_lengkap: lengkap,
                rapor_proses: proses,
                rapor_kosong: kosong,
            });
        }

        res.json({ success: true, data: hasil });
    } catch (err) {
        console.error('Error getKelengkapanRapor:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data kelengkapan rapor'
        });
    }
};

/* ==========================================================================
   EXPORTS
   ========================================================================== */

module.exports = {
    getDashboardStats,
    uploadFotoProfil,
    getProgressGuru,
    getKelengkapanRapor,
};