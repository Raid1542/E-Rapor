/**
 * Nama File: helpers.js
 * Fungsi: Helper functions untuk validasi, hitung grade, dan recompute nilai rapor.
 *         Menangani auto-recompute saat kategori atau nilai berubah.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

/**
 * Validasi apakah mata pelajaran adalah wajib dan diajarkan oleh guru kelas.
 */
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
        return false;
    }
};

/**
 * Hitung grade kokurikuler berdasarkan konfigurasi rentang nilai.
 */
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

/**
 * Hitung deskripsi akademik berdasarkan kategori nilai rapor.
 */
exports.getDeskripsiFromKategori = (nilai, kategoriList) => {
    if (nilai == null || nilai < 0) return 'Belum ada deskripsi';

    for (const k of kategoriList) {
        if (nilai >= k.min_nilai && nilai <= k.max_nilai) {
            return k.deskripsi;
        }
    }
    return 'Belum ada deskripsi';
};

/**
 * Recompute nilai rapor untuk semua siswa di kelas setelah import/update nilai.
 */
exports.updateAllNilaiRaporForMapel = async (mapelId, userId, req, connection = null) => {
    try {
        const dbToUse = connection || db;
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester, jenis: jenisPenilaianAktif } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const jenisPenilaian = jenisPenilaianAktif || 'PAS';

        const [gkRows] = await dbToUse.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (gkRows.length === 0) throw new Error('Kelas tidak ditemukan');
        const { kelas_id } = gkRows[0];

        const [siswaRows] = await dbToUse.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelas_id, tahunAjaranIndukId]
        );

        const [komponenRows] = await dbToUse.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

        const [bobotRows] = await dbToUse.execute(
            `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen 
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

        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        const [nilaiDetailRows] = await dbToUse.execute(
            `SELECT siswa_id, komponen_id, nilai FROM nilai_detail WHERE mapel_id = ? AND tahun_ajaran_id = ?`,
            [mapelId, semesterId]
        );

        const nilaiDetailMap = new Map();
        nilaiDetailRows.forEach(row => {
            if (!nilaiDetailMap.has(row.siswa_id)) nilaiDetailMap.set(row.siswa_id, {});
            nilaiDetailMap.get(row.siswa_id)[row.komponen_id] = row.nilai;
        });

        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;
            const nilai = nilaiDetailMap.get(siswaId) || {};

            let nilaiRapor = 0;
            let deskripsi = 'Belum ada deskripsi';

            if (jenisPenilaian === 'PTS') {
                const nilaiPTS = ptsKomponen ? (nilai[ptsKomponen.id_komponen] || 0) : 0;
                nilaiRapor = Math.round(nilaiPTS);

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
                let nilaiPTSFinal = 0;
                if (ptsKomponen) {
                    const [ptsRow] = await dbToUse.execute(
                        `SELECT nilai_rapor FROM nilai_rapor 
                WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [siswaId, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? parseFloat(ptsRow[0].nilai_rapor) : 0;
                }

                const nilaiUH = uhKomponenIds.map(id => nilai[id]).filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                const nilaiPAS = pasKomponen ? (nilai[pasKomponen.id_komponen] || 0) : 0;

                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
                const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                if (totalBobot > 0) {
                    nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
                }

                nilaiRapor = Math.round(nilaiRapor);

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
        throw err;
    }
};

/**
 * Recompute nilai rapor untuk kelas tertentu (digunakan saat update konfigurasi).
 */
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

        const [siswaRows] = await dbToUse.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) return;

        const [komponenRows] = await dbToUse.execute(
            `SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`
        );

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

        const uhKomponenIds = komponenRows
            .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
            .map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;

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
                const nilaiPTS = ptsKomponen ? (nilaiMap.get(ptsKomponen.id_komponen) || 0) : 0;
                nilaiRapor = Math.round(nilaiPTS);

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
                let nilaiPTSFinal = 0;
                if (ptsKomponen) {
                    const [ptsRow] = await dbToUse.execute(
                        `SELECT nilai_rapor FROM nilai_rapor 
                WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                        [siswaId, mapelId, semesterId, semester]
                    );
                    nilaiPTSFinal = ptsRow.length > 0 ? parseFloat(ptsRow[0].nilai_rapor) : 0;
                }

                const nilaiUH = uhKomponenIds
                    .map(id => nilaiMap.get(id))
                    .filter(v => v != null && !isNaN(v));
                const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
                const nilaiPAS = pasKomponen ? (nilaiMap.get(pasKomponen.id_komponen) || 0) : 0;

                const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
                const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
                const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
                const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

                if (totalBobot > 0) {
                    nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
                }

                nilaiRapor = Math.round(nilaiRapor);

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
        throw err;
    }
};

/**
 * Recompute nilai kokurikuler untuk kelas tertentu.
 */
exports.recomputeNilaiKokurikulerForKelas = async (idAspek, kelasId, userId, req) => {
    try {
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester, jenis: jenisPenilaianAktif } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const jenisPenilaian = jenisPenilaianAktif || 'PAS';

        const [siswaRows] = await db.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) return;

        const [kategoriRows] = await db.execute(
            `SELECT rentang_min, rentang_max, grade, deskripsi 
        FROM kategori_grade_kokurikuler 
        WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ?
        ORDER BY rentang_min ASC`,
            [idAspek, semesterId, semester, kelasId, jenisPenilaian]
        );

        if (kategoriRows.length === 0) return;

        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;

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

            for (const k of kategoriRows) {
                if (nilai >= parseFloat(k.rentang_min) && nilai <= parseFloat(k.rentang_max)) {
                    grade = k.grade;
                    deskripsi = k.deskripsi;
                    break;
                }
            }

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
        throw err;
    }
};

/**
 * Recompute deskripsi rata-rata untuk kelas tertentu.
 */
exports.recomputeDeskripsiRataRataForKelas = async (kelasId, userId, req) => {
    try {
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const [siswaRows] = await db.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) return;

        const [kategoriRows] = await db.execute(
            `SELECT rentang_min, rentang_max, deskripsi 
        FROM kategori_deskripsi_rata_rata 
        WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ?
        ORDER BY rentang_min ASC`,
            [semesterId, semester, kelasId]
        );

        if (kategoriRows.length === 0) return;

        for (const siswa of siswaRows) {
            const siswaId = siswa.siswa_id;

            const [nilaiRaporRows] = await db.execute(
                `SELECT AVG(nilai_rapor) as rata_rata 
            FROM nilai_rapor 
            WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PAS'`,
                [siswaId, semesterId, semester]
            );

            if (nilaiRaporRows.length === 0 || nilaiRaporRows[0].rata_rata === null) continue;

            const rataRata = parseFloat(nilaiRaporRows[0].rata_rata);
            let deskripsi = null;

            for (const k of kategoriRows) {
                if (rataRata >= parseFloat(k.rentang_min) && rataRata <= parseFloat(k.rentang_max)) {
                    deskripsi = k.deskripsi;
                    break;
                }
            }

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
        throw err;
    }
};

/**
 * Ambil data rekapan untuk keperluan ekspor.
 */
exports.getRekapanData = async (userId, req) => {
    const tahunAjaranIndukId = req?.idTahunAjaranInduk;
    const semesterId = req?.idSemesterAktif;
    const { semester } = req?.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId || !semester) {
        throw new Error('Data tahun ajaran tidak ditemukan');
    }

    const [kelasRows] = await db.execute(
        `SELECT k.id_kelas FROM kelas k 
        JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
        [userId, semesterId]
    );
    if (kelasRows.length === 0) throw new Error('Kelas tidak ditemukan');
    const kelasId = kelasRows[0].id_kelas;

    const [siswaRows] = await db.execute(
        `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
        FROM siswa s 
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
        ORDER BY s.nama_lengkap`,
        [kelasId, tahunAjaranIndukId]
    );

    const [nilaiRows] = await db.execute(
        `SELECT nr.siswa_id, mp.kode_mapel, nr.nilai_rapor AS nilai 
        FROM nilai_rapor nr 
        JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran 
        WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?`,
        [kelasId, semesterId, semester]
    );

    const kodeMapelSet = new Set();
    nilaiRows.forEach(row => kodeMapelSet.add(row.kode_mapel));
    const mapelList = Array.from(kodeMapelSet);

    const nilaiMap = {};
    nilaiRows.forEach(row => {
        if (!nilaiMap[row.siswa_id]) nilaiMap[row.siswa_id] = {};
        nilaiMap[row.siswa_id][row.kode_mapel] = row.nilai;
    });

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
            rata_rata: rataRata
        };
    });

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

/**
 * Validasi urutan grade berdasarkan rentang nilai.
 */
exports.validateGradeOrder = async (idAspek, tahunAjaranId, semester, kelasId, grade, minNilai, maxNilai, excludeId = null) => {
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
                message: `Grade ${grade} harus di atas ${existing.grade} (max ${existing.rentang_max})`
            };
        }
        if (newGradeValue < existingGradeValue && maxNilai > existing.rentang_min) {
            return {
                valid: false,
                message: `Grade ${grade} harus di bawah ${existing.grade} (min ${existing.rentang_min})`
            };
        }
    }

    return { valid: true };
};