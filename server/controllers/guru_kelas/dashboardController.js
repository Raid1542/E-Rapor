/**
 * Nama File: dashboardController.js
 * UPDATE: ✅ Progress Kokurikuler (semua aspek saat PAS)
 *         ✅ Status Konfigurasi detail dengan validasi range gap
 *         ✅ Deskripsi Rata-rata hanya saat PTS
 *         ✅ Bobot hanya saat PAS
 *         ✅ Query sudah sesuai struktur tabel asli
 */

const db = require('../../config/db');

// ✅ Helper function untuk cek gap dalam range
function checkRangeGaps(rows, minExpected = 0, maxExpected = 100, minField = 'rentang_min', maxField = 'rentang_max') {
    const gaps = [];
    if (rows.length === 0) return gaps;
    
    let currentEnd = minExpected;
    
    rows.forEach((row) => {
        const rowMin = parseFloat(row[minField]);
        const rowMax = parseFloat(row[maxField]);
        
        if (rowMin > currentEnd) {
            gaps.push(`${currentEnd}-${rowMin}`);
        }
        
        currentEnd = Math.max(currentEnd, rowMax);
    });
    
    if (currentEnd < maxExpected) {
        gaps.push(`${currentEnd}-${maxExpected}`);
    }
    
    return gaps;
}

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const idTahunAjaranInduk = req.idTahunAjaranInduk;
        const idSemesterAktif = req.idSemesterAktif;
        
        // Ambil info tahun ajaran
        const [taRows] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, tahun_ajaran, semester,
                   status_pts, status_pas, tanggal_pembagian_pts, tanggal_pembagian_pas
            FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
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
        
        // Tentukan jenis penilaian aktif
        let jenis_penilaian_aktif = null;
        if (ta.status_pts === 'aktif') jenis_penilaian_aktif = 'PTS';
        else if (ta.status_pas === 'aktif') jenis_penilaian_aktif = 'PAS';
        
        // ✅ Ambil data kelas guru
        const [kelasRows] = await db.execute(`
            SELECT k.id_kelas, k.nama_kelas
            FROM kelas k
            INNER JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?
            LIMIT 1
        `, [userId, semesterId]);
        
        if (kelasRows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda belum ditugaskan sebagai guru kelas.',
                code: 'NOT_ASSIGNED'
            });
        }
        
        const kelasInfo = kelasRows[0];
        
        // ✅ Ambil jumlah siswa di kelas
        const [siswaRows] = await db.execute(`
            SELECT COUNT(*) as total
            FROM siswa_kelas sk
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
        `, [kelasInfo.id_kelas, indukId]);
        
        const totalSiswa = siswaRows[0]?.total || 0;
        
        // ✅ HITUNG PROGRESS ABSENSI
        let absensiSudah = 0;
        if (jenis_penilaian_aktif === 'PTS') {
            const [absensiPtsResult] = await db.execute(`
                SELECT COUNT(DISTINCT siswa_id) as sudah
                FROM absensi
                WHERE kelas_id = ? AND id_tahun_ajaran = ?
                AND (sakit_pts > 0 OR izin_pts > 0 OR alpha_pts > 0)
            `, [kelasInfo.id_kelas, semesterId]);
            absensiSudah = absensiPtsResult[0]?.sudah || 0;
        } else if (jenis_penilaian_aktif === 'PAS') {
            const [absensiPasResult] = await db.execute(`
                SELECT COUNT(DISTINCT siswa_id) as sudah
                FROM absensi
                WHERE kelas_id = ? AND id_tahun_ajaran = ?
                AND (sakit_total > 0 OR izin_total > 0 OR alpha_total > 0)
            `, [kelasInfo.id_kelas, semesterId]);
            absensiSudah = absensiPasResult[0]?.sudah || 0;
        }
        
        // ✅ HITUNG PROGRESS KOKURIKULER
        let kokurikulerSudah = 0;
        if (jenis_penilaian_aktif === 'PTS') {
            const [mutabaahResult] = await db.execute(`
                SELECT COUNT(DISTINCT id_siswa) as sudah
                FROM nilai_kokurikuler
                WHERE id_kelas = ? AND id_tahun_ajaran = ? 
                AND id_aspek_kokurikuler = 5
                AND jenis_penilaian = 'PTS'
                AND nilai IS NOT NULL
            `, [kelasInfo.id_kelas, semesterId]);
            kokurikulerSudah = mutabaahResult[0]?.sudah || 0;
        } else if (jenis_penilaian_aktif === 'PAS') {
            const [totalAspekResult] = await db.execute(`
                SELECT COUNT(*) as total_aspek FROM aspek_kokurikuler
            `);
            const totalAspek = totalAspekResult[0]?.total_aspek || 5;
            
            const [allAspekResult] = await db.execute(`
                SELECT COUNT(*) as sudah FROM (
                    SELECT nk.id_siswa, COUNT(DISTINCT nk.id_aspek_kokurikuler) as jumlah_aspek
                    FROM nilai_kokurikuler nk
                    WHERE nk.id_kelas = ? AND nk.id_tahun_ajaran = ?
                    AND nk.jenis_penilaian = 'PAS'
                    AND nk.nilai IS NOT NULL
                    GROUP BY nk.id_siswa
                    HAVING COUNT(DISTINCT nk.id_aspek_kokurikuler) = ?
                ) AS siswa_lengkap
            `, [kelasInfo.id_kelas, semesterId, totalAspek]);
            
            kokurikulerSudah = allAspekResult[0]?.sudah || 0;
        }
        
        // ✅ HITUNG PROGRESS CATATAN WALI KELAS
        const [catatanResult] = await db.execute(`
            SELECT COUNT(DISTINCT siswa_id) as sudah
            FROM catatan_wali_kelas
            WHERE kelas_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ?
            AND catatan_wali_kelas IS NOT NULL AND catatan_wali_kelas != ''
        `, [kelasInfo.id_kelas, semesterId, jenis_penilaian_aktif || 'PTS']);
        const catatanSudah = catatanResult[0]?.sudah || 0;
        
        // ✅ HITUNG PROGRESS EKSKUL (HANYA SAAT PAS AKTIF)
        let ekskulSudah = 0;
        if (jenis_penilaian_aktif === 'PAS') {
            const [ekskulResult] = await db.execute(`
                SELECT COUNT(DISTINCT pe.siswa_id) as sudah
                FROM peserta_ekstrakurikuler pe
                INNER JOIN siswa_kelas sk ON pe.siswa_id = sk.siswa_id
                WHERE sk.kelas_id = ? AND pe.tahun_ajaran_id = ?
                AND sk.id_tahun_ajaran_induk = ?
            `, [kelasInfo.id_kelas, semesterId, indukId]);
            ekskulSudah = ekskulResult[0]?.sudah || 0;
        }
        
        // ✅ Ambil mata pelajaran wajib yang diajar
        const [mapelRows] = await db.execute(`
            SELECT mp.id_mata_pelajaran, mp.nama_mapel, mp.kode_mapel, mp.jenis
            FROM mata_pelajaran mp
            INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id
            WHERE p.user_id = ? AND p.tahun_ajaran_id = ? AND p.kelas_id = ?
            ORDER BY mp.nama_mapel
        `, [userId, semesterId, kelasInfo.id_kelas]);
        
        const totalMapel = mapelRows.length;
        
        // Ambil komponen penilaian
        const [komponenRows] = await db.execute(`
            SELECT id_komponen, nama_komponen 
            FROM komponen_penilaian 
            ORDER BY urutan
        `);
        
        const totalKomponen = komponenRows.length;
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        
        // Hitung progress per mapel
        let totalPenilaianDibutuhkan = 0;
        let totalPenilaianAda = 0;
        const mataPelajaranList = [];
        
        for (const mapel of mapelRows) {
            let sudahDinilai = 0;
            
            if (jenis_penilaian_aktif === 'PTS' && ptsKomponen) {
                const [ptsResult] = await db.execute(`
                    SELECT COUNT(DISTINCT nd.siswa_id) as total
                    FROM nilai_detail nd
                    WHERE nd.mapel_id = ? 
                      AND nd.tahun_ajaran_id = ?
                      AND nd.komponen_id = ?
                      AND nd.nilai IS NOT NULL
                      AND nd.siswa_id IN (
                          SELECT siswa_id FROM siswa_kelas 
                          WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?
                      )
                `, [mapel.id_mata_pelajaran, semesterId, ptsKomponen.id_komponen, kelasInfo.id_kelas, indukId]);
                
                sudahDinilai = ptsResult[0]?.total || 0;
            } else if (jenis_penilaian_aktif === 'PAS') {
                const [lengkapResult] = await db.execute(`
                    SELECT COUNT(*) as total FROM (
                        SELECT nd.siswa_id, COUNT(DISTINCT nd.komponen_id) as jumlah_komponen
                        FROM nilai_detail nd
                        WHERE nd.mapel_id = ? 
                          AND nd.tahun_ajaran_id = ?
                          AND nd.nilai IS NOT NULL
                          AND nd.siswa_id IN (
                              SELECT siswa_id FROM siswa_kelas 
                              WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?
                          )
                        GROUP BY nd.siswa_id
                        HAVING COUNT(DISTINCT nd.komponen_id) = ?
                    ) AS siswa_lengkap
                `, [mapel.id_mata_pelajaran, semesterId, kelasInfo.id_kelas, indukId, totalKomponen]);
                
                sudahDinilai = lengkapResult[0]?.total || 0;
            }
            
            totalPenilaianDibutuhkan += totalSiswa;
            totalPenilaianAda += sudahDinilai;
            
            // Ambil detail nilai rapor per siswa
            const nilaiRaporList = [];
            
            if (jenis_penilaian_aktif) {
                const [raporRows] = await db.execute(`
                    SELECT 
                        s.id_siswa, s.nama_lengkap, s.nis,
                        nr.nilai_rapor, nr.deskripsi,
                        (SELECT COUNT(DISTINCT nd2.komponen_id)
                         FROM nilai_detail nd2
                         WHERE nd2.siswa_id = s.id_siswa 
                           AND nd2.mapel_id = ? 
                           AND nd2.tahun_ajaran_id = ? 
                           AND nd2.nilai IS NOT NULL) as jumlah_komponen_terisi
                    FROM siswa s
                    JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
                    LEFT JOIN nilai_rapor nr ON s.id_siswa = nr.siswa_id
                        AND nr.mapel_id = ? 
                        AND nr.tahun_ajaran_id = ? 
                        AND nr.semester = ? 
                        AND nr.jenis_penilaian = ?
                    WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
                    ORDER BY s.nama_lengkap
                `, [
                    mapel.id_mata_pelajaran, semesterId,
                    mapel.id_mata_pelajaran, semesterId, ta.semester, jenis_penilaian_aktif,
                    kelasInfo.id_kelas, indukId
                ]);
                
                for (const row of raporRows) {
                    const [komponenDetailRows] = await db.execute(`
                        SELECT kp.nama_komponen, nd.nilai,
                               CASE WHEN nd.nilai IS NOT NULL THEN 'sudah' ELSE 'belum' END as status
                        FROM komponen_penilaian kp
                        LEFT JOIN nilai_detail nd ON kp.id_komponen = nd.komponen_id
                            AND nd.siswa_id = ? 
                            AND nd.mapel_id = ? 
                            AND nd.tahun_ajaran_id = ?
                        ORDER BY kp.urutan
                    `, [row.id_siswa, mapel.id_mata_pelajaran, semesterId]);
                    
                    nilaiRaporList.push({
                        id_siswa: row.id_siswa,
                        nama: row.nama_lengkap,
                        nis: row.nis,
                        kelas_id: kelasInfo.id_kelas,
                        nama_kelas: kelasInfo.nama_kelas,
                        nilai_rapor: row.nilai_rapor,
                        deskripsi: row.deskripsi,
                        jumlah_komponen_terisi: row.jumlah_komponen_terisi || 0,
                        total_komponen: totalKomponen,
                        komponen_detail: komponenDetailRows.map(komp => ({
                            nama_komponen: komp.nama_komponen,
                            nilai: komp.nilai,
                            status: komp.status
                        })),
                        status: jenis_penilaian_aktif === 'PTS'
                            ? (row.jumlah_komponen_terisi > 0 ? '✓ Sudah Input PTS' : '✗ Belum Input PTS')
                            : (row.jumlah_komponen_terisi === totalKomponen ? '✓ Lengkap' : `${row.jumlah_komponen_terisi}/${totalKomponen} komponen`)
                    });
                }
            }
            
            mataPelajaranList.push({
                id: mapel.id_mata_pelajaran,
                nama: mapel.nama_mapel,
                total_kelas: 1,
                total_siswa: totalSiswa,
                sudah_dinilai: sudahDinilai,
                belum_dinilai: totalSiswa - sudahDinilai,
                nilai_rapor_list: nilaiRaporList
            });
        }
        
        const overallProgress = totalPenilaianDibutuhkan > 0 
            ? Math.round((totalPenilaianAda / totalPenilaianDibutuhkan) * 100) 
            : 0;
        
        // ✅ CEK KONFIGURASI LENGKAP DENGAN VALIDASI RANGE GAP
        let konfigurasiLengkap = true;
        const konfigurasiDetail = {
            kokurikuler: { lengkap: true, missing: [], gaps: [] },
            akademik: { lengkap: true, missing: [], gaps: [] },
            deskripsi_rata_rata: { lengkap: true, missing: [], gaps: [] },
            bobot: { lengkap: true, missing: [] },
            summary: []
        };
        
        // 1. Cek Kokurikuler - Validasi range 0-100
        if (jenis_penilaian_aktif === 'PTS') {
            // Untuk PTS: hanya cek Mutaba'ah (id_aspek_kokurikuler = 5)
            const [kokurikulerRows] = await db.execute(`
                SELECT rentang_min, rentang_max, grade, deskripsi
                FROM kategori_grade_kokurikuler
                WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? 
                AND jenis_penilaian = 'PTS' AND id_aspek_kokurikuler = 5
                ORDER BY rentang_min
            `, [kelasInfo.id_kelas, semesterId, ta.semester]);
            
            if (kokurikulerRows.length === 0) {
                konfigurasiDetail.kokurikuler.lengkap = false;
                konfigurasiDetail.kokurikuler.missing.push('Mutaba\'ah Yaumiyah');
                konfigurasiLengkap = false;
            } else {
                const gaps = checkRangeGaps(kokurikulerRows, 0, 100);
                if (gaps.length > 0) {
                    konfigurasiDetail.kokurikuler.lengkap = false;
                    konfigurasiDetail.kokurikuler.gaps.push({ aspek: 'Mutaba\'ah Yaumiyah', gaps });
                    konfigurasiLengkap = false;
                }
            }
        } else if (jenis_penilaian_aktif === 'PAS') {
            // Untuk PAS: cek semua aspek kokurikuler
            const [aspekRows] = await db.execute(`
                SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler
            `);
            
            for (const aspek of aspekRows) {
                const [kokurikulerRows] = await db.execute(`
                    SELECT rentang_min, rentang_max, grade, deskripsi
                    FROM kategori_grade_kokurikuler
                    WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? 
                    AND jenis_penilaian = 'PAS' AND id_aspek_kokurikuler = ?
                    ORDER BY rentang_min
                `, [kelasInfo.id_kelas, semesterId, ta.semester, aspek.id_aspek_kokurikuler]);
                
                if (kokurikulerRows.length === 0) {
                    konfigurasiDetail.kokurikuler.lengkap = false;
                    konfigurasiDetail.kokurikuler.missing.push(aspek.nama);
                    konfigurasiLengkap = false;
                } else {
                    const gaps = checkRangeGaps(kokurikulerRows, 0, 100);
                    if (gaps.length > 0) {
                        konfigurasiDetail.kokurikuler.lengkap = false;
                        konfigurasiDetail.kokurikuler.gaps.push({ aspek: aspek.nama, gaps });
                        konfigurasiLengkap = false;
                    }
                }
            }
        }
        
        // 2. Cek Akademik - Validasi range 0-100 per mapel
        for (const mapel of mapelRows) {
            const [akademikRows] = await db.execute(`
                SELECT min_nilai, max_nilai, deskripsi
                FROM konfigurasi_nilai_rapor
                WHERE mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ? 
                AND jenis_penilaian = ?
                ORDER BY min_nilai
            `, [mapel.id_mata_pelajaran, kelasInfo.id_kelas, semesterId, jenis_penilaian_aktif || 'PTS']);
            
            if (akademikRows.length === 0) {
                konfigurasiDetail.akademik.lengkap = false;
                konfigurasiDetail.akademik.missing.push(mapel.nama_mapel);
                konfigurasiLengkap = false;
            } else {
                const gaps = checkRangeGaps(akademikRows, 0, 100, 'min_nilai', 'max_nilai');
                if (gaps.length > 0) {
                    konfigurasiDetail.akademik.lengkap = false;
                    konfigurasiDetail.akademik.gaps.push({ mapel: mapel.nama_mapel, gaps });
                    konfigurasiLengkap = false;
                }
            }
        }
        
        // 3. Cek Deskripsi Rata-rata - Validasi range 0-100 (HANYA PTS)
        if (jenis_penilaian_aktif === 'PTS') {
            const [deskripsiRows] = await db.execute(`
                SELECT rentang_min, rentang_max, deskripsi
                FROM kategori_deskripsi_rata_rata
                WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?
                ORDER BY rentang_min
            `, [kelasInfo.id_kelas, semesterId, ta.semester]);
            
            if (deskripsiRows.length === 0) {
                konfigurasiDetail.deskripsi_rata_rata.lengkap = false;
                konfigurasiDetail.deskripsi_rata_rata.missing.push('Deskripsi Rata-rata');
                konfigurasiLengkap = false;
            } else {
                const gaps = checkRangeGaps(deskripsiRows, 0, 100);
                if (gaps.length > 0) {
                    konfigurasiDetail.deskripsi_rata_rata.lengkap = false;
                    konfigurasiDetail.deskripsi_rata_rata.gaps = gaps;
                    konfigurasiLengkap = false;
                }
            }
        } else if (jenis_penilaian_aktif === 'PAS') {
            konfigurasiDetail.deskripsi_rata_rata.lengkap = true;
        }
        
        // 4. Cek Bobot (HANYA PAS)
        if (jenis_penilaian_aktif === 'PAS') {
            for (const mapel of mapelRows) {
                const [bobotResult] = await db.execute(
                    `SELECT COUNT(*) AS total FROM konfigurasi_mapel_komponen 
                     WHERE mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ? 
                     AND jenis_penilaian = 'PAS' AND is_active = 1 AND bobot > 0`,
                    [mapel.id_mata_pelajaran, kelasInfo.id_kelas, semesterId]
                );
                if ((bobotResult[0]?.total || 0) === 0) {
                    konfigurasiDetail.bobot.lengkap = false;
                    konfigurasiDetail.bobot.missing.push(mapel.nama_mapel);
                    konfigurasiLengkap = false;
                }
            }
        } else if (jenis_penilaian_aktif === 'PTS') {
            konfigurasiDetail.bobot.lengkap = true;
        }
        
        // Generate summary untuk ditampilkan
        if (!konfigurasiDetail.kokurikuler.lengkap) {
            if (konfigurasiDetail.kokurikuler.missing.length > 0) {
                konfigurasiDetail.summary.push({
                    type: 'missing',
                    title: 'Kategori Kokurikuler',
                    message: `Aspek ${konfigurasiDetail.kokurikuler.missing.join(', ')} belum diatur kategorinya`
                });
            }
            if (konfigurasiDetail.kokurikuler.gaps.length > 0) {
                konfigurasiDetail.kokurikuler.gaps.forEach(gap => {
                    konfigurasiDetail.summary.push({
                        type: 'gap',
                        title: 'Kategori Kokurikuler',
                        message: `Aspek ${gap.aspek} ada gap di rentang ${gap.gaps.join(', ')}`
                    });
                });
            }
        }
        
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
        
        if (!konfigurasiDetail.deskripsi_rata_rata.lengkap) {
            if (konfigurasiDetail.deskripsi_rata_rata.missing.length > 0) {
                konfigurasiDetail.summary.push({
                    type: 'missing',
                    title: 'Deskripsi Rata-rata',
                    message: 'Deskripsi rata-rata untuk rapor PTS belum diatur'
                });
            }
            if (konfigurasiDetail.deskripsi_rata_rata.gaps.length > 0) {
                konfigurasiDetail.summary.push({
                    type: 'gap',
                    title: 'Deskripsi Rata-rata',
                    message: `Ada gap di rentang ${konfigurasiDetail.deskripsi_rata_rata.gaps.join(', ')}`
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
        
        const jadwal = {
            pts: ta.tanggal_pembagian_pts ? new Date(ta.tanggal_pembagian_pts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
            pas: ta.tanggal_pembagian_pas ? new Date(ta.tanggal_pembagian_pas).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null
        };
        
        res.json({
            success: true,
            data: {
                tahun_ajaran: ta.tahun_ajaran,
                semester: ta.semester,
                status_pts: ta.status_pts || 'nonaktif',
                status_pas: ta.status_pas || 'nonaktif',
                jenis_penilaian_aktif,
                jadwal,
                total_kelas: 1,
                total_siswa: totalSiswa,
                total_mapel: totalMapel,
                total_penilaian_dibutuhkan: totalPenilaianDibutuhkan,
                total_penilaian_ada: totalPenilaianAda,
                overall_progress: overallProgress,
                mata_pelajaran_list: mataPelajaranList,
                total_komponen: totalKomponen,
                konfigurasi_lengkap: konfigurasiLengkap,
                konfigurasi_detail: konfigurasiDetail,
                progress_lainnya: {
                    absensi: {
                        sudah: absensiSudah,
                        total: totalSiswa,
                        persentase: totalSiswa > 0 ? Math.round((absensiSudah / totalSiswa) * 100) : 0
                    },
                    kokurikuler: {
                        sudah: kokurikulerSudah,
                        total: totalSiswa,
                        persentase: totalSiswa > 0 ? Math.round((kokurikulerSudah / totalSiswa) * 100) : 0,
                        subtitle: jenis_penilaian_aktif === 'PTS' ? 'Mutaba\'ah Yaumiyah' : 'Semua Aspek'
                    },
                    catatan_wali_kelas: {
                        sudah: catatanSudah,
                        total: totalSiswa,
                        persentase: totalSiswa > 0 ? Math.round((catatanSudah / totalSiswa) * 100) : 0
                    },
                    ekskul: {
                        sudah: ekskulSudah,
                        total: totalSiswa,
                        persentase: totalSiswa > 0 ? Math.round((ekskulSudah / totalSiswa) * 100) : 0,
                        tersedia: jenis_penilaian_aktif === 'PAS'
                    }
                }
            }
        });
        
    } catch (err) {
        console.error('Error getDashboardData:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memuat data dashboard: ' + err.message 
        });
    }
};