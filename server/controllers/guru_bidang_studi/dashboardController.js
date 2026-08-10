/**
 * Nama File: dashboardController.js
 * Fungsi: Controller dashboard guru bidang studi (statistik, progress, detail komponen).
 *         Menampilkan konfigurasi detail dengan validasi range gap.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

/**
 * Cek gap dalam range nilai.
 */
const checkRangeGaps = (rows, minExpected = 0, maxExpected = 100, minField = 'min_nilai', maxField = 'max_nilai') => {
    const gaps = [];
    if (rows.length === 0) return gaps;

    const sorted = [...rows].sort((a, b) => parseFloat(a[minField]) - parseFloat(b[minField]));
    let currentEnd = minExpected;

    sorted.forEach(row => {
        const rowMin = parseFloat(row[minField]);
        const rowMax = parseFloat(row[maxField]);

        if (rowMin > currentEnd + 0.01) {
            gaps.push(`${currentEnd}-${rowMin}`);
        }

        currentEnd = Math.max(currentEnd, rowMax);
    });

    if (currentEnd < maxExpected - 0.01) {
        gaps.push(`${currentEnd}-${maxExpected}`);
    }

    return gaps;
};

/**
 * Ambil data dashboard lengkap untuk guru bidang studi.
 */
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // Ambil tahun ajaran aktif
        const [taRows] = await db.execute(`
        SELECT id_tahun_ajaran, id_tahun_ajaran_induk, tahun_ajaran, semester,
                status_pts, status_pas, tanggal_pembagian_pts, tanggal_pembagian_pas
        FROM tahun_ajaran 
        WHERE status = 'aktif' 
        LIMIT 1
    `);

        if (taRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran aktif tidak ditemukan.',
                code: 'NO_ACTIVE_YEAR'
            });
        }

        const ta = taRows[0];
        const semesterId = ta.id_tahun_ajaran;
        const indukId = ta.id_tahun_ajaran_induk;

        // Tentukan jenis penilaian aktif (PTS/PAS)
        let jenisPenilaianAktif = null;
        if (ta.status_pts === 'aktif') {
            jenisPenilaianAktif = 'PTS';
        } else if (ta.status_pas === 'aktif') {
            jenisPenilaianAktif = 'PAS';
        }

        // Hitung total kelas unik
        const [kelasUnikResult] = await db.execute(
            'SELECT COUNT(DISTINCT kelas_id) AS total FROM pembelajaran WHERE user_id = ? AND tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        const totalKelasUnik = kelasUnikResult[0]?.total || 0;

        // Hitung total siswa unik
        const [siswaUnikResult] = await db.execute(`
        SELECT COUNT(DISTINCT sk.siswa_id) AS total 
        FROM siswa_kelas sk
        WHERE sk.kelas_id IN (SELECT DISTINCT kelas_id FROM pembelajaran WHERE user_id = ? AND tahun_ajaran_id = ?)
        AND sk.id_tahun_ajaran_induk = ?
    `, [userId, semesterId, indukId]);
        const totalSiswaUnik = siswaUnikResult[0]?.total || 0;

        // Ambil mapel pilihan yang diajar
        const [mapelDasar] = await db.execute(`
        SELECT mp.id_mata_pelajaran, mp.nama_mapel, mp.jenis, COUNT(DISTINCT p.kelas_id) AS total_kelas_per_mapel
        FROM pembelajaran p
        JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
        WHERE p.user_id = ? AND p.tahun_ajaran_id = ? AND mp.jenis = 'pilihan'
        GROUP BY mp.id_mata_pelajaran, mp.nama_mapel, mp.jenis
        ORDER BY mp.nama_mapel
    `, [userId, semesterId]);

        if (mapelDasar.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan mengajar mapel apapun.',
                code: 'NOT_ASSIGNED'
            });
        }

        // Ambil total komponen penilaian
        const [komponenRows] = await db.execute(
            'SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan'
        );
        const totalKomponen = komponenRows.length;
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));

        const mataPelajaranList = [];
        let totalPenilaianAda = 0;
        let totalPenilaianDibutuhkan = 0;

        // Konfigurasi detail untuk validasi range gap
        let konfigurasiLengkap = true;
        const konfigurasiDetail = {
            akademik: { lengkap: true, missing: [], gaps: [] },
            bobot: { lengkap: true, missing: [] },
            summary: []
        };

        // Loop setiap mapel
        for (const mapel of mapelDasar) {
            // Hitung total siswa per mapel
            const [totalSiswaPerMapelResult] = await db.execute(`
        SELECT COUNT(DISTINCT sk.siswa_id) AS total
        FROM siswa_kelas sk
        WHERE sk.kelas_id IN (
            SELECT kelas_id FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
        )
        AND sk.id_tahun_ajaran_induk = ?
        `, [userId, mapel.id_mata_pelajaran, semesterId, indukId]);

            const totalSiswaMapel = totalSiswaPerMapelResult[0]?.total || 0;
            totalPenilaianDibutuhkan += totalSiswaMapel;

            // Hitung siswa yang sudah lengkap
            let sudahLengkap = 0;

            if (jenisPenilaianAktif === 'PTS' && ptsKomponen) {
                const [ptsResult] = await db.execute(`
            SELECT COUNT(DISTINCT nd.siswa_id) AS total
            FROM nilai_detail nd
            WHERE nd.mapel_id = ? AND nd.tahun_ajaran_id = ? AND nd.komponen_id = ? AND nd.nilai IS NOT NULL
            AND nd.siswa_id IN (
                SELECT sk.siswa_id FROM siswa_kelas sk
                WHERE sk.kelas_id IN (SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?)
                AND sk.id_tahun_ajaran_induk = ?
            )
        `, [mapel.id_mata_pelajaran, semesterId, ptsKomponen.id_komponen, userId, mapel.id_mata_pelajaran, semesterId, indukId]);
                sudahLengkap = ptsResult[0]?.total || 0;
            } else if (jenisPenilaianAktif === 'PAS') {
                const [lengkapResult] = await db.execute(`
            SELECT COUNT(*) AS total FROM (
                SELECT nd.siswa_id, COUNT(DISTINCT nd.komponen_id) as jumlah_komponen
                FROM nilai_detail nd
                WHERE nd.mapel_id = ? AND nd.tahun_ajaran_id = ? AND nd.nilai IS NOT NULL
                AND nd.siswa_id IN (
                    SELECT sk.siswa_id FROM siswa_kelas sk
                    WHERE sk.kelas_id IN (SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?)
                    AND sk.id_tahun_ajaran_induk = ?
                )
                GROUP BY nd.siswa_id
                HAVING COUNT(DISTINCT nd.komponen_id) = ?
            ) AS siswa_lengkap
        `, [mapel.id_mata_pelajaran, semesterId, userId, mapel.id_mata_pelajaran, semesterId, indukId, totalKomponen]);
                sudahLengkap = lengkapResult[0]?.total || 0;
            }

            totalPenilaianAda += sudahLengkap;

            // Ambil data nilai rapor per siswa dengan detail komponen
            const nilaiRaporList = [];

            if (jenisPenilaianAktif) {
                const [raporRows] = await db.execute(`
            SELECT 
                s.id_siswa, s.nama_lengkap, s.nis,
                k.id_kelas, k.nama_kelas,
                nr.nilai_rapor, nr.deskripsi,
                (SELECT COUNT(DISTINCT nd2.komponen_id) 
                    FROM nilai_detail nd2 
                    WHERE nd2.siswa_id = s.id_siswa AND nd2.mapel_id = ? AND nd2.tahun_ajaran_id = ? AND nd2.nilai IS NOT NULL) as jumlah_komponen_terisi
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            JOIN kelas k ON sk.kelas_id = k.id_kelas
            LEFT JOIN nilai_rapor nr ON s.id_siswa = nr.siswa_id 
                AND nr.mapel_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?
            WHERE sk.kelas_id IN (SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?)
            AND sk.id_tahun_ajaran_induk = ?
            ORDER BY k.nama_kelas, s.nama_lengkap
        `, [
                    mapel.id_mata_pelajaran, semesterId,
                    mapel.id_mata_pelajaran, semesterId, ta.semester, jenisPenilaianAktif,
                    userId, mapel.id_mata_pelajaran, semesterId, indukId
                ]);

                for (const row of raporRows) {
                    const [komponenDetailRows] = await db.execute(`
            SELECT kp.nama_komponen, nd.nilai,
                CASE WHEN nd.nilai IS NOT NULL THEN 'sudah' ELSE 'belum' END as status
            FROM komponen_penilaian kp
            LEFT JOIN nilai_detail nd ON kp.id_komponen = nd.komponen_id 
                AND nd.siswa_id = ? AND nd.mapel_id = ? AND nd.tahun_ajaran_id = ?
            ORDER BY kp.urutan
            `, [row.id_siswa, mapel.id_mata_pelajaran, semesterId]);

                    nilaiRaporList.push({
                        id_siswa: row.id_siswa,
                        nama: row.nama_lengkap,
                        nis: row.nis,
                        kelas_id: row.id_kelas,
                        nama_kelas: row.nama_kelas,
                        nilai_rapor: row.nilai_rapor,
                        deskripsi: row.deskripsi,
                        jumlah_komponen_terisi: row.jumlah_komponen_terisi || 0,
                        total_komponen: totalKomponen,
                        komponen_detail: komponenDetailRows.map(komp => ({
                            nama_komponen: komp.nama_komponen,
                            nilai: komp.nilai,
                            status: komp.status
                        })),
                        status: jenisPenilaianAktif === 'PTS'
                            ? (row.jumlah_komponen_terisi > 0 ? 'Sudah Input PTS' : 'Belum Input PTS')
                            : (row.jumlah_komponen_terisi === totalKomponen ? 'Lengkap' : `${row.jumlah_komponen_terisi}/${totalKomponen} komponen`)
                    });
                }
            }

            // Cek konfigurasi akademik dengan validasi range gap
            const [kategoriRows] = await db.execute(
                `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
            WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ?
            ORDER BY min_nilai ASC`,
                [mapel.id_mata_pelajaran, semesterId, jenisPenilaianAktif || 'PTS']
            );

            let kategoriTerconfig = false;
            if (kategoriRows.length === 0) {
                konfigurasiDetail.akademik.lengkap = false;
                konfigurasiDetail.akademik.missing.push(mapel.nama_mapel);
                konfigurasiLengkap = false;
            } else {
                kategoriTerconfig = true;
                const gaps = checkRangeGaps(kategoriRows, 0, 100, 'min_nilai', 'max_nilai');
                if (gaps.length > 0) {
                    konfigurasiDetail.akademik.lengkap = false;
                    konfigurasiDetail.akademik.gaps.push({ mapel: mapel.nama_mapel, gaps });
                    konfigurasiLengkap = false;
                }
            }

            // Cek konfigurasi bobot (hanya untuk PAS)
            let bobotTerconfig = jenisPenilaianAktif === 'PTS' ? true : false;
            if (jenisPenilaianAktif !== 'PTS') {
                const [bobotResult] = await db.execute(
                    'SELECT COUNT(*) AS total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND is_active = 1 AND bobot > 0',
                    [mapel.id_mata_pelajaran]
                );
                bobotTerconfig = (bobotResult[0]?.total || 0) > 0;

                if (!bobotTerconfig) {
                    konfigurasiDetail.bobot.lengkap = false;
                    konfigurasiDetail.bobot.missing.push(mapel.nama_mapel);
                    konfigurasiLengkap = false;
                }
            }

            mataPelajaranList.push({
                id: mapel.id_mata_pelajaran,
                nama: mapel.nama_mapel,
                total_kelas: mapel.total_kelas_per_mapel,
                total_siswa: totalSiswaMapel,
                sudah_dinilai: sudahLengkap,
                belum_dinilai: totalSiswaMapel - sudahLengkap,
                nilai_rapor_list: nilaiRaporList,
                konfigurasi: {
                    bobot: bobotTerconfig,
                    kategori: kategoriTerconfig,
                    lengkap: bobotTerconfig && kategoriTerconfig
                }
            });
        }

        // Generate summary
        if (!konfigurasiDetail.akademik.lengkap) {
            if (konfigurasiDetail.akademik.missing.length > 0) {
                konfigurasiDetail.summary.push({
                    type: 'missing',
                    title: 'Kategori Akademik',
                    message: `Mapel ${konfigurasiDetail.akademik.missing.join(', ')} belum diatur kategorinya`
                });
            }
            if (konfigurasiDetail.akademik.gaps.length > 0) {
                konfigurasiDetail.akademik.gaps.forEach(gap => {
                    konfigurasiDetail.summary.push({
                        type: 'gap',
                        title: 'Kategori Akademik',
                        message: `Mapel ${gap.mapel} ada gap di rentang ${gap.gaps.join(', ')}`
                    });
                });
            }
        }

        if (!konfigurasiDetail.bobot.lengkap) {
            if (konfigurasiDetail.bobot.missing.length > 0) {
                konfigurasiDetail.summary.push({
                    type: 'missing',
                    title: 'Bobot Penilaian',
                    message: `Mapel ${konfigurasiDetail.bobot.missing.join(', ')} belum diatur bobotnya`
                });
            }
        }

        // Hitung overall progress
        const overallProgress = totalPenilaianDibutuhkan > 0
            ? Math.round((totalPenilaianAda / totalPenilaianDibutuhkan) * 100)
            : 0;

        // Format jadwal
        const jadwal = {
            pts: ta.tanggal_pembagian_pts
                ? new Date(ta.tanggal_pembagian_pts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : null,
            pas: ta.tanggal_pembagian_pas
                ? new Date(ta.tanggal_pembagian_pas).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : null
        };

        // Return response
        res.json({
            success: true,
            data: {
                tahun_ajaran: ta.tahun_ajaran,
                semester: ta.semester,
                status_pts: ta.status_pts || 'nonaktif',
                status_pas: ta.status_pas || 'nonaktif',
                jenis_penilaian_aktif: jenisPenilaianAktif,
                jadwal,
                total_kelas: totalKelasUnik,
                total_siswa: totalSiswaUnik,
                total_mapel: mapelDasar.length,
                total_penilaian_dibutuhkan: totalPenilaianDibutuhkan,
                total_penilaian_ada: totalPenilaianAda,
                overall_progress: overallProgress,
                mata_pelajaran_list: mataPelajaranList,
                total_komponen: totalKomponen,
                konfigurasi_lengkap: konfigurasiLengkap,
                konfigurasi_detail: konfigurasiDetail
            }
        });
    } catch (err) {
        console.error('Error getDashboardData:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat data dashboard' });
    }
};