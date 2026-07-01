/**
 * Nama File: dashboardController.js
 * Fungsi: Controller dashboard guru kelas (statistik, progress, detail komponen)
 * UPDATE: ✅ Support logika PTS (hanya cek PTS) vs PAS (cek semua komponen)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

// GET: Ambil data dashboard lengkap untuk guru kelas
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
        
        // ✅ Ambil data kelas guru (gunakan gk.tahun_ajaran_id)
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
        const warnings = [];
        
        for (const mapel of mapelRows) {
            let sudahDinilai = 0;
            
            // ✅ LOGIKA PTS vs PAS
            if (jenis_penilaian_aktif === 'PTS' && ptsKomponen) {
                // Saat PTS aktif: hanya cek komponen PTS
                // Nilai PTS = Nilai Rapor PTS
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
                // Saat PAS aktif: cek semua komponen harus lengkap
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
            
            // ✅ Ambil detail nilai rapor per siswa
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
                
                // Ambil detail komponen untuk setiap siswa
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
            
            // Cek konfigurasi bobot & kategori
            let bobotTerconfig = jenis_penilaian_aktif === 'PTS' ? true : false;
            if (jenis_penilaian_aktif !== 'PTS') {
                const [bobotResult] = await db.execute(
                    'SELECT COUNT(*) AS total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND kelas_id = ? AND is_active = 1 AND bobot > 0',
                    [mapel.id_mata_pelajaran, kelasInfo.id_kelas]
                );
                bobotTerconfig = (bobotResult[0]?.total || 0) > 0;
            }
            
            const [kategoriResult] = await db.execute(
                'SELECT COUNT(*) AS total FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ?',
                [mapel.id_mata_pelajaran, semesterId, kelasInfo.id_kelas]
            );
            const kategoriTerconfig = (kategoriResult[0]?.total || 0) > 0;
            
            mataPelajaranList.push({
                id: mapel.id_mata_pelajaran,
                nama: mapel.nama_mapel,
                total_kelas: 1,
                total_siswa: totalSiswa,
                sudah_dinilai: sudahDinilai,
                belum_dinilai: totalSiswa - sudahDinilai,
                nilai_rapor_list: nilaiRaporList,
                konfigurasi: { 
                    bobot: bobotTerconfig, 
                    kategori: kategoriTerconfig, 
                    lengkap: bobotTerconfig && kategoriTerconfig 
                }
            });
            
            // Generate warnings jika konfigurasi belum lengkap
            if (!bobotTerconfig || !kategoriTerconfig) {
                const masalah = [];
                if (!bobotTerconfig && jenis_penilaian_aktif !== 'PTS') masalah.push('bobot belum diatur');
                if (!kategoriTerconfig) masalah.push('kategori nilai belum lengkap');
                if (masalah.length > 0) {
                    warnings.push({ 
                        mapel: mapel.nama_mapel, 
                        masalah: masalah.join(' dan ') 
                    });
                }
            }
        }
        
        const overallProgress = totalPenilaianDibutuhkan > 0 
            ? Math.round((totalPenilaianAda / totalPenilaianDibutuhkan) * 100) 
            : 0;
        
        // Format jadwal
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
                warnings,
                total_komponen: totalKomponen
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