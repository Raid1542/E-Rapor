/**
 * Nama File: helpers.js
 * Fungsi: Helper functions untuk validasi, hitung grade, dan recompute nilai rapor
 *         Menangani auto-recompute saat kategori atau nilai berubah
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 * Update: 15 Juli 2026 - Fix Transaction Isolation Bug, Math.round, dan sinkronisasi dengan Atur Penilaian
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// 1. VALIDASI MAPEL WAJIB
// ═════════════════════════════════════════════════════════════════════════════

exports.isMapelWajibGuruKelas = async (userId, mapelId, semesterId) => {
    try {
        const [rows] = await db.execute(
            `SELECT mp.id_mata_pelajaran
            FROM mata_pelajaran mp
            JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id
            JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
            WHERE mp.id_mata_pelajaran = ? AND gk.user_id = ? AND mp.jenis = 'wajib' AND gk.tahun_ajaran_id = ?`,
            [mapelId, userId, semesterId]
        );
        return rows.length > 0;
    } catch (err) {
        console.error('Error isMapelWajibGuruKelas:', err);
        return false;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. HITUNG GRADE KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

exports.getGradeFromConfig = (configList, nilai, idAspek) => {
    if (nilai == null) return { grade: null, deskripsi: null };
    const configForAspek = configList.filter(c => c.id_aspek_kokurikuler === idAspek);
    for (const conf of configForAspek) {
        if (nilai >= conf.rentang_min && nilai <= conf.rentang_max) {
            return { grade: conf.grade, deskripsi: conf.deskripsi };
        }
    }
    return { grade: null, deskripsi: null };
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. HITUNG DESKRIPSI AKADEMIK
// ═════════════════════════════════════════════════════════════════════════════

exports.getDeskripsiFromKategori = (nilai, kategoriList) => {
    if (nilai == null || nilai < 0) return 'Belum ada deskripsi';
    for (const k of kategoriList) {
        if (nilai >= k.min_nilai && nilai <= k.max_nilai) return k.deskripsi;
    }
    return 'Belum ada deskripsi';
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. RECOMPUTE NILAI RAPOR (Dipanggil setelah Import/Update Nilai)
// ═════════════════════════════════════════════════════════════════════════════

// ✅ PERBAIKAN: Tambahkan parameter 'connection' opsional agar bisa membaca data dalam transaksi yang sama
exports.updateAllNilaiRaporForMapel = async (mapelId, userId, req, connection = null) => {
    try {
        // Gunakan connection transaksi jika ada, jika tidak gunakan pool global
        const dbToUse = connection || db;

        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester, jenis: jenisPenilaianAktif } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const jenisPenilaian = jenisPenilaianAktif || 'PAS';

        // ✅ PERBAIKAN: Ambil kelas_id dari guru_kelas (konsisten dengan controller)
        const [gkRows] = await dbToUse.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (gkRows.length === 0) throw new Error('Kelas tidak ditemukan');
        const { kelas_id } = gkRows[0];

        // Ambil semua siswa di kelas
        const [siswaRows] = await dbToUse.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelas_id, tahunAjaranIndukId]
        );

        // Ambil komponen penilaian
        const [komponenRows] = await dbToUse.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

        // ✅ PERBAIKAN: Ambil bobot dengan prioritas kelas_id spesifik > global
        const [bobotRows] = await dbToUse.execute(
            `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen 
            WHERE mapel_id = ? AND is_active = 1 AND (kelas_id = ? OR kelas_id IS NULL) 
            ORDER BY kelas_id DESC`,
            [mapelId, kelas_id]
        );

        const bobotMap = new Map();
        bobotRows.forEach(b => {
            // Prioritas: bobot spesifik kelas > bobot global
            if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) {
                bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
            }
        });

        // Identifikasi komponen UH, PTS, PAS
        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        // ✅ PERBAIKAN: Sekarang ini akan membaca data yang BARU SAJA di-insert dalam transaksi yang sama
        const [nilaiDetailRows] = await dbToUse.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelId, semesterId]
        );

        const nilaiDetailMap = new Map();
        nilaiDetailRows.forEach(row => {
            if (!nilaiDetailMap.has(row.siswa_id)) nilaiDetailMap.set(row.siswa_id, {});
            nilaiDetailMap.get(row.siswa_id)[row.komponen_id] = row.nilai;
        });

        // Proses setiap siswa
        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;
            const nilai = nilaiDetailMap.get(siswaId) || {};

            let nilaiRapor = 0;
            let deskripsi = 'Belum ada deskripsi';

            if (jenisPenilaian === 'PTS') {
                // PTS: nilai rapor = nilai PTS langsung
                const nilaiPTS = ptsKomponen ? (nilai[ptsKomponen.id_komponen] || 0) : 0;
                nilaiRapor = Math.round(nilaiPTS);

                // ✅ PERBAIKAN: Ambil kategori dari konfigurasi_nilai_rapor (sesuai dengan Atur Penilaian)
                const [kategoriPTSRows] = await dbToUse.execute(
                    `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND is_active = 1
                    ORDER BY min_nilai DESC`,
                    [mapelId, semesterId]
                );

                for (const k of kategoriPTSRows) {
                    if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
                        deskripsi = k.deskripsi;
                        break;
                    }
                }
            } else {
                // PAS: hitung dengan formula terbobot
                let nilaiPTSFinal = 0;
                if (ptsKomponen) {
                    // Ambil nilai rapor PTS yang sudah dihitung sebelumnya
                    const [ptsRow] = await dbToUse.execute(
                        `SELECT nilai_rapor FROM nilai_rapor 
                        WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [siswaId, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? parseFloat(ptsRow[0].nilai_rapor) : 0;
                }

                // Hitung rata-rata UH
                const nilaiUH = uhKomponenIds.map(id => nilai[id]).filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                
                // Nilai PAS
                const nilaiPAS = pasKomponen ? (nilai[pasKomponen.id_komponen] || 0) : 0;

                // Hitung total bobot
                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
                const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                // Hitung nilai rapor dengan formula terbobot
                if (totalBobot > 0) {
                    nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
                }
                
                nilaiRapor = Math.round(nilaiRapor);

                // ✅ PERBAIKAN: Ambil kategori dari konfigurasi_nilai_rapor (sesuai dengan Atur Penilaian)
                const [kategoriPASRows] = await dbToUse.execute(
                    `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND is_active = 1
                    ORDER BY min_nilai DESC`,
                    [mapelId, semesterId]
                );

                for (const k of kategoriPASRows) {
                    if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
                        deskripsi = k.deskripsi;
                        break;
                    }
                }
            }

            // Simpan/update nilai rapor
            await dbToUse.execute(
                `INSERT INTO nilai_rapor 
                (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                nilai_rapor = VALUES(nilai_rapor), 
                deskripsi = VALUES(deskripsi), 
                updated_at = NOW()`,
                [siswaId, mapelId, kelas_id, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId]
            );
        }
    } catch (err) {
        console.error('Error updateAllNilaiRaporForMapel:', err);
        throw err;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. RECOMPUTE NILAI RAPOR UNTUK KELAS TERTENTU
// ═════════════════════════════════════════════════════════════════════════════

exports.recomputeNilaiRaporForKelas = async (mapelId, kelasId, userId, req, connection = null) => {
    try {
        const dbToUse = connection || db;
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester, jenis: jenisPenilaianAktif } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const jenisPenilaian = jenisPenilaianAktif || 'PAS';

        // Ambil semua siswa di kelas
        const [siswaRows] = await dbToUse.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) return;

        // Ambil komponen penilaian
        const [komponenRows] = await dbToUse.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

        // ✅ PERBAIKAN: Ambil bobot dengan prioritas kelas_id spesifik > global
        const [bobotRows] = await dbToUse.execute(
            `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen 
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

        // Identifikasi komponen UH, PTS, PAS
        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        // Proses setiap siswa
        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;

            // Ambil nilai detail siswa
            const [nilaiRows] = await dbToUse.execute(
                `SELECT komponen_id, nilai FROM nilai_detail 
                WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                [siswaId, mapelId, semesterId]
            );

            const nilaiMap = new Map();
            nilaiRows.forEach(row => {
                if (row.nilai != null) nilaiMap.set(row.komponen_id, parseFloat(row.nilai));
            });

            let nilaiRapor = 0;
            let deskripsi = 'Belum ada deskripsi';

            if (jenisPenilaian === 'PTS') {
                // PTS: nilai rapor = nilai PTS langsung
                const nilaiPTS = ptsKomponen ? (nilaiMap.get(ptsKomponen.id_komponen) || 0) : 0;
                nilaiRapor = Math.round(nilaiPTS);

                // ✅ PERBAIKAN: Ambil kategori dari konfigurasi_nilai_rapor
                const [kategoriPTSRows] = await dbToUse.execute(
                    `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND is_active = 1
                    ORDER BY min_nilai DESC`,
                    [mapelId, semesterId]
                );

                for (const k of kategoriPTSRows) {
                    if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
                        deskripsi = k.deskripsi;
                        break;
                    }
                }
            } else {
                // PAS: hitung dengan formula terbobot
                let nilaiPTSFinal = 0;
                if (ptsKomponen) {
                    const [ptsRow] = await dbToUse.execute(
                        `SELECT nilai_rapor FROM nilai_rapor 
                        WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [siswaId, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? parseFloat(ptsRow[0].nilai_rapor) : 0;
                }

                // Hitung rata-rata UH
                const nilaiUH = uhKomponenIds
                    .map(id => nilaiMap.get(id))
                    .filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                
                // Nilai PAS
                const nilaiPAS = pasKomponen ? (nilaiMap.get(pasKomponen.id_komponen) || 0) : 0;

                // Hitung total bobot
                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
                const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                // Hitung nilai rapor
                if (totalBobot > 0) {
                    nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
                }
                
                nilaiRapor = Math.round(nilaiRapor);

                // ✅ PERBAIKAN: Ambil kategori dari konfigurasi_nilai_rapor
                const [kategoriPASRows] = await dbToUse.execute(
                    `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                    WHERE mapel_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND is_active = 1
                    ORDER BY min_nilai DESC`,
                    [mapelId, semesterId]
                );

                for (const k of kategoriPASRows) {
                    if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
                        deskripsi = k.deskripsi;
                        break;
                    }
                }
            }

            // Simpan/update nilai rapor
            await dbToUse.execute(
                `INSERT INTO nilai_rapor 
                (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                nilai_rapor = VALUES(nilai_rapor), 
                deskripsi = VALUES(deskripsi), 
                updated_at = NOW()`,
                [siswaId, mapelId, kelasId, semesterId, semester, jenisPenilaian, nilaiRapor, deskripsi, userId]
            );
        }
    } catch (err) {
        console.error('Error recomputeNilaiRaporForKelas:', err);
        throw err;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. RECOMPUTE NILAI KOKURIKULER
// ═════════════════════════════════════════════════════════════════════════════

exports.recomputeNilaiKokurikulerForKelas = async (idAspek, kelasId, userId, req) => {
    try {
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester, jenis: jenisPenilaianAktif } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const jenisPenilaian = jenisPenilaianAktif || 'PAS';

        // Ambil semua siswa di kelas
        const [siswaRows] = await db.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) return;

        // Ambil kategori grade kokurikuler
        const [kategoriRows] = await db.execute(
            `SELECT rentang_min, rentang_max, grade, deskripsi 
            FROM kategori_grade_kokurikuler 
            WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ?
            ORDER BY rentang_min ASC`,
            [idAspek, semesterId, semester, kelasId, jenisPenilaian]
        );

        if (kategoriRows.length === 0) return;

        // Proses setiap siswa
        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;

            // Ambil nilai kokurikuler siswa
            const [nilaiRows] = await db.execute(
                `SELECT nilai FROM nilai_kokurikuler 
                 WHERE id_siswa = ? 
                 AND id_aspek_kokurikuler = ? 
                 AND id_tahun_ajaran = ? 
                 AND semester = ?`,
                [siswaId, idAspek, semesterId, semester]
            );

            if (nilaiRows.length === 0 || nilaiRows[0].nilai === null) continue;

            const nilai = parseFloat(nilaiRows[0].nilai);
            let grade = null;
            let deskripsi = null;

            // Cari grade yang sesuai
            for (const k of kategoriRows) {
                if (nilai >= parseFloat(k.rentang_min) && nilai <= parseFloat(k.rentang_max)) {
                    grade = k.grade;
                    deskripsi = k.deskripsi;
                    break;
                }
            }

            // Update grade dan deskripsi
            if (grade) {
                await db.execute(
                    `UPDATE nilai_kokurikuler 
                    SET grade = ?, deskripsi = ?, updated_at = NOW()
                    WHERE id_siswa = ? 
                    AND id_aspek_kokurikuler = ?
                    AND id_tahun_ajaran = ? 
                    AND semester = ?`,
                    [grade, deskripsi, siswaId, idAspek, semesterId, semester]
                );
            }
        }
    } catch (err) {
        console.error('Error recomputeNilaiKokurikulerForKelas:', err);
        throw err;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. RECOMPUTE DESKRIPSI RATA-RATA
// ═════════════════════════════════════════════════════════════════════════════

exports.recomputeDeskripsiRataRataForKelas = async (kelasId, userId, req) => {
    try {
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        // Ambil semua siswa di kelas
        const [siswaRows] = await db.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) return;

        // Ambil kategori deskripsi rata-rata
        const [kategoriRows] = await db.execute(
            `SELECT rentang_min, rentang_max, deskripsi 
            FROM kategori_deskripsi_rata_rata 
            WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ?
            ORDER BY rentang_min ASC`,
            [semesterId, semester, kelasId]
        );

        if (kategoriRows.length === 0) return;

        // Proses setiap siswa
        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;

            // Hitung rata-rata nilai rapor PAS
            const [nilaiRaporRows] = await db.execute(
                `SELECT AVG(nilai_rapor) as rata_rata 
                FROM nilai_rapor 
                WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PAS'`,
                [siswaId, semesterId, semester]
            );

            if (nilaiRaporRows.length === 0 || nilaiRaporRows[0].rata_rata === null) continue;

            const rataRata = parseFloat(nilaiRaporRows[0].rata_rata);
            let deskripsi = null;

            // Cari deskripsi yang sesuai
            for (const k of kategoriRows) {
                if (rataRata >= parseFloat(k.rentang_min) && rataRata <= parseFloat(k.rentang_max)) {
                    deskripsi = k.deskripsi;
                    break;
                }
            }

            // Update deskripsi rata-rata di catatan wali kelas
            if (deskripsi) {
                await db.execute(
                    `UPDATE catatan_wali_kelas 
                    SET deskripsi_rata_rata = ?, updated_at = NOW()
                    WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
                    [deskripsi, siswaId, semesterId, semester]
                );
            }
        }
    } catch (err) {
        console.error('Error recomputeDeskripsiRataRataForKelas:', err);
        throw err;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 8. REKAPAN DATA UNTUK EKSPOR
// ═════════════════════════════════════════════════════════════════════════════

exports.getRekapanData = async (userId, req) => {
    const tahunAjaranIndukId = req?.idTahunAjaranInduk;
    const semesterId = req?.idSemesterAktif;
    const { semester } = req?.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId || !semester)
        throw new Error('Data tahun ajaran tidak ditemukan');

    // Ambil kelas guru
    const [kelasRows] = await db.query(
        `SELECT k.id_kelas FROM kelas k 
        JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
        [userId, semesterId]
    );
    if (kelasRows.length === 0) throw new Error('Kelas tidak ditemukan');
    const kelasId = kelasRows[0].id_kelas;

    // Ambil semua siswa
    const [siswaRows] = await db.query(
        `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
        FROM siswa s 
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
        ORDER BY s.nama_lengkap`,
        [kelasId, tahunAjaranIndukId]
    );

    // Ambil semua nilai rapor
    const [nilaiRows] = await db.query(
        `SELECT nr.siswa_id, mp.kode_mapel, nr.nilai_rapor AS nilai 
        FROM nilai_rapor nr 
        JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran 
        WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?`,
        [kelasId, semesterId, semester]
    );

    // Build daftar mapel unik
    const kodeMapelSet = new Set();
    nilaiRows.forEach(row => kodeMapelSet.add(row.kode_mapel));
    const mapelList = Array.from(kodeMapelSet);

    // Map nilai per siswa per mapel
    const nilaiMap = {};
    nilaiRows.forEach(row => {
        if (!nilaiMap[row.siswa_id]) nilaiMap[row.siswa_id] = {};
        nilaiMap[row.siswa_id][row.kode_mapel] = row.nilai;
    });

    // Build data siswa dengan ranking
    const siswa = siswaRows.map(s => {
        const nilaiMapel = {};
        mapelList.forEach(kode => {
            nilaiMapel[kode] = nilaiMap[s.id_siswa]?.[kode] || null;
        });
        const nilaiArray = Object.values(nilaiMapel).filter(v => v !== null);
        const rataRata =
            nilaiArray.length > 0
                ? parseFloat((nilaiArray.reduce((a, b) => a + b, 0) / nilaiArray.length).toFixed(2))
                : null;
        return {
            id_siswa: s.id_siswa,
            nama: s.nama,
            nis: s.nis,
            nilai_mapel: nilaiMapel,
            rata_rata: rataRata,
        };
    });

    // Hitung ranking
    siswa
        .filter(s => s.rata_rata !== null)
        .sort((a, b) => b.rata_rata - a.rata_rata)
        .forEach((s, i) => {
            s.ranking = i + 1;
        });
    siswa.forEach(s => {
        if (s.rata_rata === null) s.ranking = null;
    });

    return { siswa, mapel_list: mapelList };
};

// ═════════════════════════════════════════════════════════════════════════════
// 9. VALIDASI URUTAN GRADE
// ═════════════════════════════════════════════════════════════════════════════

exports.validateGradeOrder = async (
    idAspek,
    tahunAjaranId,
    semester,
    kelasId,
    grade,
    minNilai,
    maxNilai,
    excludeId = null
) => {
    const gradeOrder = { A: 4, B: 3, C: 2, D: 1, E: 0 };
    const newGradeValue = gradeOrder[grade.toUpperCase()];
    if (newGradeValue === undefined) return { valid: true };

    let query = `SELECT id_kategori_grade_kokurikuler, grade, rentang_min, rentang_max 
    FROM kategori_grade_kokurikuler 
    WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ?`;
    const params = [idAspek, tahunAjaranId, semester, kelasId];

    if (excludeId) {
        query += ` AND id_kategori_grade_kokurikuler != ?`;
        params.push(excludeId);
    }

    const [existingRows] = await db.execute(query, params);

    for (const existing of existingRows) {
        const existingGradeValue = gradeOrder[existing.grade.toUpperCase()];
        if (existingGradeValue === undefined) continue;

        if (newGradeValue > existingGradeValue && minNilai < existing.rentang_max) {
            return {
                valid: false,
                message: `Grade ${grade} harus di atas ${existing.grade} (max ${existing.rentang_max})`,
            };
        }
        if (newGradeValue < existingGradeValue && maxNilai > existing.rentang_min) {
            return {
                valid: false,
                message: `Grade ${grade} harus di bawah ${existing.grade} (min ${existing.rentang_min})`,
            };
        }
    }

    return { valid: true };
};