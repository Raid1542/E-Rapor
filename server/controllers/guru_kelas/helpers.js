/**
 * Nama File: helpers.js
 * Fungsi: Helper functions yang dipakai bersama di controller guru kelas
 */

const db = require('../../config/db');

/**
 * Helper: Validasi apakah mata pelajaran adalah mapel wajib yang diampu guru kelas
 */
exports.isMapelWajibGuruKelas = async (userId, mapelId, tahunAjaranIndukId) => {
    try {
        const [rows] = await db.execute(`
            SELECT mp.id_mata_pelajaran
            FROM mata_pelajaran mp
            JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id
            JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
            WHERE mp.id_mata_pelajaran = ?
            AND gk.user_id = ?
            AND mp.jenis = 'wajib'
            AND gk.tahun_ajaran_id = ?
        `, [mapelId, userId, tahunAjaranIndukId]);
        return rows.length > 0;
    } catch (err) {
        console.error('Error di isMapelWajibGuruKelas:', err);
        return false;
    }
};

/**
 * Helper: Hitung grade & deskripsi berdasarkan nilai dan ID aspek
 */
exports.getGradeFromConfig = (configList, nilai, idAspek) => {
    if (nilai === null || nilai === undefined) {
        return { grade: null, deskripsi: null };
    }
    const configForAspek = configList.filter(c => c.id_aspek_kokurikuler === idAspek);
    for (const conf of configForAspek) {
        if (nilai >= conf.rentang_min && nilai <= conf.rentang_max) {
            return {
                grade: conf.grade,
                deskripsi: conf.deskripsi,
            };
        }
    }
    return { grade: null, deskripsi: null };
};

/**
 * Helper: Mendapatkan deskripsi berdasarkan nilai dan daftar kategori
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
 * Helper: Memperbarui semua nilai rapor untuk suatu mata pelajaran berdasarkan bobot terbaru
 */
exports.updateAllNilaiRaporForMapel = async (mapelId, userId, req) => {
    try {
        const tahunAjaranIndukId = req?.idTahunAjaranInduk;
        const semesterId = req?.idSemesterAktif;
        const { semester } = req?.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran atau semester tidak ditemukan di middleware');
        }

        const [gkRows] = await db.execute(
            `SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?`,
            [userId, semesterId]
        );
        if (gkRows.length === 0) throw new Error('Kelas aktif tidak ditemukan');
        const { kelas_id } = gkRows[0];

        const [siswaRows] = await db.execute(
            `SELECT siswa_id FROM siswa_kelas WHERE kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [kelas_id, tahunAjaranIndukId]
        );

        const [komponenRows] = await db.execute(`SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan`);

        const [bobotRows] = await db.execute(
            `SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen 
                WHERE mapel_id = ? AND is_active = 1
                AND (kelas_id = ? OR kelas_id IS NULL)
                ORDER BY kelas_id DESC`,
            [mapelId, kelas_id]
        );

        // Logic prioritas bobot: spesifik kelas menimpa global
        const bobotMap = new Map();
        bobotRows.forEach(b => {
            if (!bobotMap.has(b.komponen_id) || b.kelas_id !== null) {
                bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0);
            }
        });

        const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
        const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
        const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

        const [nilaiDetailRows] = await db.execute(
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

            let nilaiPTSFinal = 0;
            if (ptsKomponen) {
                const [ptsRow] = await db.execute(
                    `SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = 'PTS'`,
                    [siswaId, mapelId, semesterId, semester]
                );
                nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
            }

            const nilaiUH = uhKomponenIds.map(id => nilai[id]).filter(v => v != null && !isNaN(v));
            const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
            const nilaiPAS = pasKomponen ? (nilai[pasKomponen.id_komponen] || 0) : 0;

            const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
            const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
            const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
            const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

            let nilaiRapor = 0;
            if (totalBobot > 0) {
                nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
            }
            nilaiRapor = Math.floor(nilaiRapor);

            // Cek dulu struktur tabel, jika ada tahun_ajaran_id tetap pakai
            const [kategoriRows] = await db.execute(
                `SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor 
                    WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ? AND is_active = 1
                    ORDER BY min_nilai DESC`,
                [mapelId, semesterId]
            );

            let deskripsi = 'Belum ada deskripsi';
            for (const k of kategoriRows) {
                if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
                    deskripsi = k.deskripsi;
                    break;
                }
            }

            await db.execute(
                `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PAS', ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
                [siswaId, mapelId, kelas_id, semesterId, semester, nilaiRapor, deskripsi, userId]
            );
        }
    } catch (err) {
        console.error('Error di updateAllNilaiRaporForMapel:', err);
        throw err;
    }
};

/**
 * Helper internal: mengambil data rekap nilai untuk ekspor
 */
exports.getRekapanData = async (userId, req) => {
    const tahunAjaranIndukId = req?.idTahunAjaranInduk;
    const semesterId = req?.idSemesterAktif;
    const { semester } = req?.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId || !semester) throw new Error('Data tahun ajaran atau semester tidak ditemukan');

    const [kelasRows] = await db.query(
        `SELECT k.id_kelas FROM kelas k 
            JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
            WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
        [userId, semesterId]
    );
    if (kelasRows.length === 0) throw new Error('Kelas tidak ditemukan');
    const kelasId = kelasRows[0].id_kelas;

    const [siswaRows] = await db.query(
        `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
            FROM siswa s 
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
            WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
            ORDER BY s.nama_lengkap`,
        [kelasId, tahunAjaranIndukId]
    );

    const [nilaiRows] = await db.query(
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
        mapelList.forEach(kode => { nilaiMapel[kode] = nilaiMap[s.id_siswa]?.[kode] || null; });
        const nilaiArray = Object.values(nilaiMapel).filter(v => v !== null);
        const rataRata = nilaiArray.length > 0 ? parseFloat((nilaiArray.reduce((a, b) => a + b, 0) / nilaiArray.length).toFixed(2)) : null;
        return { id_siswa: s.id_siswa, nama: s.nama, nis: s.nis, nilai_mapel: nilaiMapel, rata_rata: rataRata };
    });

    siswa.filter(s => s.rata_rata !== null).sort((a, b) => b.rata_rata - a.rata_rata).forEach((s, i) => { s.ranking = i + 1; });
    siswa.forEach(s => { if (s.rata_rata === null) s.ranking = null; });

    return { siswa, mapel_list: mapelList };
};

/**
 * Helper: Validasi urutan grade untuk kokurikuler
 */
exports.validateGradeOrder = async (idAspek, tahunAjaranId, semester, kelasId, grade, minNilai, maxNilai, excludeId = null) => {
    const gradeOrder = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 };
    const newGradeValue = gradeOrder[grade.toUpperCase()];

    if (newGradeValue === undefined) return { valid: true };

    let query = `
        SELECT id_kategori_grade_kokurikuler, grade, rentang_min, rentang_max 
        FROM kategori_grade_kokurikuler 
        WHERE id_aspek_kokurikuler = ? 
        AND tahun_ajaran_id = ? 
        AND semester = ?
        AND kelas_id = ?
    `;
    const params = [idAspek, tahunAjaranId, semester, kelasId];

    if (excludeId) {
        query += ` AND id_kategori_grade_kokurikuler != ?`;
        params.push(excludeId);
    }

    const [existingRows] = await db.execute(query, params);

    for (const existing of existingRows) {
        const existingGradeValue = gradeOrder[existing.grade.toUpperCase()];
        if (existingGradeValue === undefined) continue;

        if (newGradeValue > existingGradeValue) {
            if (minNilai < existing.rentang_max) {
                return {
                    valid: false,
                    message: `Grade ${grade} (lebih tinggi) harus memiliki range nilai di atas ${existing.grade} (max ${existing.rentang_max}). Range Anda: ${minNilai}-${maxNilai}`
                };
            }
        }

        if (newGradeValue < existingGradeValue) {
            if (maxNilai > existing.rentang_min) {
                return {
                    valid: false,
                    message: `Grade ${grade} (lebih rendah) harus memiliki range nilai di bawah ${existing.grade} (min ${existing.rentang_min}). Range Anda: ${minNilai}-${maxNilai}`
                };
            }
        }
    }

    return { valid: true };
};