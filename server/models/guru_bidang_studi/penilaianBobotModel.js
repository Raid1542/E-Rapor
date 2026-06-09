/**
 * Nama File: penilaianBobotModel.js
 * Fungsi: Model untuk mengelola bobot penilaian guru bidang studi
 *         - Ambil bobot per mapel
 *         - Update bobot (transaction)
 *         - Recompute nilai rapor semua siswa
 * Pembuat: Irwan Nugraha (refactor dari penilaianBobotController.js)
 * Tanggal: 9 Juni 2026
 */

const db = require('../../config/db');

const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT 
            ta.id_tahun_ajaran,
            ta.id_tahun_ajaran_induk,
            ta.semester,
            ta.status_pts,
            ta.status_pas
        FROM tahun_ajaran ta
        WHERE ta.status = 'aktif'
        LIMIT 1
    `);
    return taRows.length > 0 ? taRows[0] : null;
};

const getAllKomponenPenilaian = async () => {
    const [rows] = await db.execute(`
        SELECT id_komponen, nama_komponen, urutan
        FROM komponen_penilaian
        ORDER BY urutan ASC
    `);
    return rows;
};

const validateGuruMapel = async (userId, mapelId, tahunAjaranIndukId) => {
    const [rows] = await db.execute(
        `SELECT 1 FROM pembelajaran 
            WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
        [userId, mapelId, tahunAjaranIndukId]
    );
    return rows.length > 0;
};

const getBobotByMapel = async (mapelId) => {
    const [rows] = await db.execute(
        `SELECT komponen_id, bobot
            FROM konfigurasi_mapel_komponen
            WHERE mapel_id = ? AND is_active = 1`,
        [mapelId]
    );
    return rows;
};

getBobotMapByMapel = async (mapelId) => {
    const rows = await getBobotByMapel(mapelId);
    const map = new Map();
    rows.forEach(b => {
        map.set(b.komponen_id, parseFloat(b.bobot) || 0);
    });
    return map;
};

const updateBobotPenilaian = async (mapelId, bobotList) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Hapus bobot lama untuk mapel ini
        await connection.execute(
            `DELETE FROM konfigurasi_mapel_komponen 
                WHERE mapel_id = ?`,
            [mapelId]
        );

        // Insert bobot baru
        for (const b of bobotList) {
            await connection.execute(
                `INSERT INTO konfigurasi_mapel_komponen 
                    (mapel_id, komponen_id, bobot, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, 1, NOW(), NOW())`,
                [mapelId, b.komponen_id, parseFloat(b.bobot)]
            );
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const getSiswaByMapel = async (mapelId, tahunAjaranIndukId) => {
    const [rows] = await db.execute(`
        SELECT sk.siswa_id, sk.kelas_id
        FROM siswa_kelas sk
        WHERE sk.id_tahun_ajaran_induk = ?  
            AND sk.kelas_id IN (
                SELECT DISTINCT p.kelas_id
                FROM pembelajaran p
                WHERE p.mapel_id = ? 
                    AND p.tahun_ajaran_id = ?
            )
    `, [tahunAjaranIndukId, mapelId, tahunAjaranIndukId]);
    return rows;
};

const getNilaiDetailBySiswa = async (siswaId, mapelId, semesterId) => {
    const [rows] = await db.execute(
        `SELECT komponen_id, nilai 
            FROM nilai_detail 
            WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
        [siswaId, mapelId, semesterId]
    );
    
    const map = {};
    rows.forEach(r => {
        if (r.nilai != null) {
            map[r.komponen_id] = Math.floor(parseFloat(r.nilai));
        }
    });
    return map;
};

const getNilaiRaporPTS = async (siswaId, mapelId, semesterId, semester) => {
    const [rows] = await db.execute(
        `SELECT nilai_rapor 
            FROM nilai_rapor
            WHERE siswa_id = ? 
            AND mapel_id = ? 
            AND tahun_ajaran_id = ? 
            AND semester = ? 
            AND jenis_penilaian = 'PTS'`,
        [siswaId, mapelId, semesterId, semester]
    );
    return rows.length > 0 ? rows[0].nilai_rapor : 0;
};

const getKategoriNilaiRapor = async (mapelId, semesterId) => {
    const [rows] = await db.execute(
        `SELECT min_nilai, max_nilai, deskripsi 
            FROM konfigurasi_nilai_rapor 
            WHERE (mapel_id = ? OR mapel_id IS NULL) 
            AND tahun_ajaran_id = ? 
            ORDER BY min_nilai DESC`,
            [mapelId, semesterId]
    );
    return rows;
};

const findDeskripsiByNilai = (nilaiRapor, kategoriRows) => {
    for (const k of kategoriRows) {
        if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
            return k.deskripsi;
        }
    }
    return 'Belum ada deskripsi';
};

const saveNilaiRapor = async (data) => {
    await db.execute(
        `INSERT INTO nilai_rapor 
            (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, 
            jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            nilai_rapor = VALUES(nilai_rapor),
            deskripsi = VALUES(deskripsi),
            updated_at = NOW()`,
        [
            data.siswa_id,
            data.mapel_id,
            data.kelas_id,
            data.semester_id,
            data.semester,
            data.jenis_penilaian,
            data.nilai_rapor,
            data.deskripsi,
            data.user_id
        ]
    );
};

const hitungNilaiRaporSiswa = (params) => {
    const {
        jenisAktif,
        nilaiFromDB,
        bobotMap,
        komponenRows,
        nilaiPTSFinal = 0
    } = params;

    const uhKomponenIds = komponenRows
        .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
        .map(k => k.id_komponen);
    const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

    let nilaiRapor = 0;

    if (jenisAktif === 'PTS') {
        // Saat PTS aktif: nilai rapor = nilai PTS
        nilaiRapor = ptsKomponen ? (nilaiFromDB[ptsKomponen.id_komponen] || 0) : 0;
    } else {
        // Saat PAS aktif: hitung dengan bobot
        const nilaiUH = uhKomponenIds
            .map(id => nilaiFromDB[id])
            .filter(v => v != null && !isNaN(v));
        const rataUH = nilaiUH.length > 0 
            ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length 
            : 0;
        const nilaiPAS = pasKomponen ? (nilaiFromDB[pasKomponen.id_komponen] || 0) : 0;

        const totalBobotUH = uhKomponenIds
            .reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
        const bobotPTS = ptsKomponen ? (bobotMap.get(ptsKomponen.id_komponen) || 0) : 0;
        const bobotPAS = pasKomponen ? (bobotMap.get(pasKomponen.id_komponen) || 0) : 0;
        const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

        if (totalBobot > 0) {
            nilaiRapor = (
                (rataUH * totalBobotUH) + 
                (nilaiPTSFinal * bobotPTS) + 
                (nilaiPAS * bobotPAS)
            ) / totalBobot;
        } else {
            // Fallback: rata-rata sederhana
            nilaiRapor = (rataUH + nilaiPTSFinal + nilaiPAS) / 3;
        }
    }

    return Math.floor(nilaiRapor);
};

const recomputeAllNilaiRapor = async (mapelId, userId) => {
    try {
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) {
            throw new Error('Tahun ajaran aktif tidak ditemukan');
        }

        const { semester, id_tahun_ajaran: semesterId, id_tahun_ajaran_induk: indukId } = taAktif;

        // Tentukan jenis penilaian aktif
        let jenisAktif = 'PAS';
        if (taAktif.status_pts === 'aktif') {
            jenisAktif = 'PTS';
        } else if (taAktif.status_pas === 'aktif') {
            jenisAktif = 'PAS';
        }

        // Ambil data pendukung
        const siswaRows = await getSiswaByMapel(mapelId, indukId);
        if (siswaRows.length === 0) {
            return { success: true, count: 0, message: 'Tidak ada siswa' };
        }

        const komponenRows = await getAllKomponenPenilaian();
        const bobotMap = await getBobotMapByMapel(mapelId);
        const kategoriRows = await getKategoriNilaiRapor(mapelId, semesterId);

        let countUpdated = 0;

        for (const row of siswaRows) {
            const { siswa_id, kelas_id } = row;

            // Ambil nilai detail siswa
            const nilaiFromDB = await getNilaiDetailBySiswa(siswa_id, mapelId, semesterId);

            // Untuk PAS, ambil nilai rapor PTS yang sudah tersimpan
            let nilaiPTSFinal = 0;
            if (jenisAktif === 'PAS') {
                nilaiPTSFinal = await getNilaiRaporPTS(siswa_id, mapelId, semesterId, semester);
            }

            // Hitung nilai rapor
            const nilaiRapor = hitungNilaiRaporSiswa({
                jenisAktif,
                nilaiFromDB,
                bobotMap,
                komponenRows,
                nilaiPTSFinal
            });

            // Cari deskripsi
            const deskripsi = findDeskripsiByNilai(nilaiRapor, kategoriRows);

            // Simpan ke database
            await saveNilaiRapor({
                siswa_id,
                mapel_id: mapelId,
                kelas_id,
                semester_id: semesterId,
                semester,
                jenis_penilaian: jenisAktif,
                nilai_rapor: nilaiRapor,
                deskripsi,
                user_id: userId
            });

            countUpdated++;
        }

        return {
            success: true,
            count: countUpdated,
            message: `Berhasil menghitung ulang nilai rapor untuk ${countUpdated} siswa`
        };

    } catch (err) {
        console.error('Error recomputeAllNilaiRapor:', err);
        throw err;
    }
};

module.exports = {
    // Helper
    getTahunAjaranAktif,
    getAllKomponenPenilaian,
    validateGuruMapel,
    
    // Bobot
    getBobotByMapel,
    getBobotMapByMapel,
    updateBobotPenilaian,
    
    // Recompute
    getSiswaByMapel,
    getNilaiDetailBySiswa,
    getNilaiRaporPTS,
    getKategoriNilaiRapor,
    findDeskripsiByNilai,
    hitungNilaiRaporSiswa,
    saveNilaiRapor,
    recomputeAllNilaiRapor,
};