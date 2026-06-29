/**
 * Nama File: penilaianBobotModel.js
 * Fungsi: Model bobot penilaian guru bidang studi + recompute nilai rapor
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

// Ambil tahun ajaran yang sedang aktif
const getTahunAjaranAktif = async () => {
    const [taRows] = await db.execute(`
        SELECT ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk, ta.semester, ta.status_pts, ta.status_pas
        FROM tahun_ajaran ta WHERE ta.status = 'aktif' LIMIT 1
    `);
    return taRows.length > 0 ? taRows[0] : null;
};

// Ambil semua komponen penilaian (UH, PTS, PAS, dll)
const getAllKomponenPenilaian = async () => {
    const [rows] = await db.execute('SELECT id_komponen, nama_komponen, urutan FROM komponen_penilaian ORDER BY urutan ASC');
    return rows;
};

// Validasi apakah guru berhak mengajar mapel di semester ini
const validateGuruMapel = async (userId, mapelId, semesterId) => {
    const [rows] = await db.execute(
        'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?',
        [userId, mapelId, semesterId]
    );
    return rows.length > 0;
};

// Ambil bobot komponen untuk mapel tertentu (opsional filter kelas)
const getBobotByMapel = async (mapelId, semesterId, kelasId = null) => {
    let query = 'SELECT komponen_id, bobot, kelas_id FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND is_active = 1';
    const params = [mapelId, semesterId];
    if (kelasId) { query += ' AND (kelas_id = ? OR kelas_id IS NULL)'; params.push(kelasId); }
    else { query += ' AND kelas_id IS NULL'; }
    const [rows] = await db.execute(query, params);
    return rows;
};

// Ambil bobot dalam format Map (prioritas: spesifik kelas > global)
const getBobotMapByMapel = async (mapelId, semesterId, kelasId = null) => {
    const rows = await getBobotByMapel(mapelId, semesterId, kelasId);
    const map = new Map();
    rows.forEach(b => {
        const existing = map.get(b.komponen_id);
        if (!existing || (b.kelas_id !== null && existing.kelas_id === null)) {
            map.set(b.komponen_id, { bobot: parseFloat(b.bobot) || 0, kelas_id: b.kelas_id });
        }
    });
    const resultMap = new Map();
    map.forEach((value, key) => resultMap.set(key, value.bobot));
    return resultMap;
};

// Update bobot komponen (hapus lama + insert baru dalam transaction)
const updateBobotPenilaian = async (mapelId, semesterId, bobotList, kelasId = null) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (kelasId) {
            await connection.execute(
                'DELETE FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ?',
                [mapelId, semesterId, kelasId]
            );
        } else {
            await connection.execute(
                'DELETE FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id IS NULL',
                [mapelId, semesterId]
            );
        }
        for (const b of bobotList) {
            await connection.execute(
                'INSERT INTO konfigurasi_mapel_komponen (mapel_id, kelas_id, tahun_ajaran_id, komponen_id, bobot, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())',
                [mapelId, kelasId, semesterId, b.komponen_id, parseFloat(b.bobot)]
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

// Ambil daftar siswa yang belajar mapel tersebut
const getSiswaByMapel = async (mapelId, semesterId, indukId) => {
    const [rows] = await db.execute(`
        SELECT sk.siswa_id, sk.kelas_id FROM siswa_kelas sk
        WHERE sk.id_tahun_ajaran_induk = ? AND sk.kelas_id IN (
            SELECT DISTINCT p.kelas_id FROM pembelajaran p WHERE p.mapel_id = ? AND p.tahun_ajaran_id = ?
        )
    `, [indukId, mapelId, semesterId]);
    return rows;
};

// Ambil nilai detail per komponen untuk 1 siswa
const getNilaiDetailBySiswa = async (siswaId, mapelId, semesterId) => {
    const [rows] = await db.execute(
        'SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?',
        [siswaId, mapelId, semesterId]
    );
    const map = {};
    rows.forEach(r => { if (r.nilai != null) map[r.komponen_id] = Math.floor(parseFloat(r.nilai)); });
    return map;
};

// Ambil nilai rapor PTS siswa
const getNilaiRaporPTS = async (siswaId, mapelId, semesterId, semester) => {
    const [rows] = await db.execute(
        'SELECT nilai_rapor FROM nilai_rapor WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = \'PTS\'',
        [siswaId, mapelId, semesterId, semester]
    );
    return rows.length > 0 ? rows[0].nilai_rapor : 0;
};

// Ambil konfigurasi kategori nilai rapor
const getKategoriNilaiRapor = async (mapelId, semesterId, kelasId = null) => {
    let query = 'SELECT min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE (mapel_id = ? OR mapel_id IS NULL) AND tahun_ajaran_id = ?';
    const params = [mapelId, semesterId];
    if (kelasId) { query += ' AND (kelas_id = ? OR kelas_id IS NULL)'; params.push(kelasId); }
    else { query += ' AND kelas_id IS NULL'; }
    query += ' ORDER BY min_nilai DESC';
    const [rows] = await db.execute(query, params);
    return rows;
};

// Cari deskripsi berdasarkan range nilai
const findDeskripsiByNilai = (nilaiRapor, kategoriRows) => {
    for (const k of kategoriRows) {
        if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) return k.deskripsi;
    }
    return 'Belum ada deskripsi';
};

// Simpan nilai rapor ke database (UPSERT)
const saveNilaiRapor = async (data) => {
    await db.execute(
        `INSERT INTO nilai_rapor (siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, nilai_rapor, deskripsi, created_by_user_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE nilai_rapor = VALUES(nilai_rapor), deskripsi = VALUES(deskripsi), updated_at = NOW()`,
        [data.siswa_id, data.mapel_id, data.kelas_id, data.semester_id, data.semester, data.jenis_penilaian, data.nilai_rapor, data.deskripsi, data.user_id]
    );
};

// Hitung nilai rapor siswa (PTS: langsung, PAS: rata-rata terbobot)
const hitungNilaiRaporSiswa = (params) => {
    const { jenisAktif, nilaiFromDB, bobotMap, komponenRows, nilaiPTSFinal = 0 } = params;
    const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
    const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));
    let nilaiRapor = 0;
    if (jenisAktif === 'PTS') {
        nilaiRapor = ptsKomponen ? (nilaiFromDB[ptsKomponen.id_komponen] || 0) : 0;
    } else {
        const nilaiUH = uhKomponenIds.map(id => nilaiFromDB[id]).filter(v => v != null && !isNaN(v));
        const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
        const nilaiPAS = pasKomponen ? (nilaiFromDB[pasKomponen.id_komponen] || 0) : 0;
        const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
        const bobotPTS = ptsKomponen ? (bobotMap.get(ptsKomponen.id_komponen) || 0) : 0;
        const bobotPAS = pasKomponen ? (bobotMap.get(pasKomponen.id_komponen) || 0) : 0;
        const totalBobot = totalBobotUH + bobotPTS + bobotPAS;
        if (totalBobot > 0) {
            nilaiRapor = ((rataUH * totalBobotUH) + (nilaiPTSFinal * bobotPTS) + (nilaiPAS * bobotPAS)) / totalBobot;
        } else {
            nilaiRapor = (rataUH + nilaiPTSFinal + nilaiPAS) / 3;
        }
    }
    return Math.round(nilaiRapor);
};

// Hitung ulang nilai rapor semua siswa setelah bobot berubah
const recomputeAllNilaiRapor = async (mapelId, userId, kelasId = null) => {
    try {
        const taAktif = await getTahunAjaranAktif();
        if (!taAktif) throw new Error('Tahun ajaran aktif tidak ditemukan');
        const { semester, id_tahun_ajaran: semesterId, id_tahun_ajaran_induk: indukId } = taAktif;
        let jenisAktif = 'PAS';
        if (taAktif.status_pts === 'aktif') jenisAktif = 'PTS';
        else if (taAktif.status_pas === 'aktif') jenisAktif = 'PAS';
        const siswaRows = await getSiswaByMapel(mapelId, semesterId, indukId);
        const filteredSiswa = kelasId ? siswaRows.filter(s => s.kelas_id === parseInt(kelasId)) : siswaRows;
        if (filteredSiswa.length === 0) return { success: true, count: 0, message: 'Tidak ada siswa' };
        const komponenRows = await getAllKomponenPenilaian();
        const bobotMap = await getBobotMapByMapel(mapelId, semesterId);
        const kategoriRows = await getKategoriNilaiRapor(mapelId, semesterId, kelasId);
        let countUpdated = 0;
        for (const row of filteredSiswa) {
            const { siswa_id, kelas_id } = row;
            const nilaiFromDB = await getNilaiDetailBySiswa(siswa_id, mapelId, semesterId);
            let nilaiPTSFinal = 0;
            if (jenisAktif === 'PAS') nilaiPTSFinal = await getNilaiRaporPTS(siswa_id, mapelId, semesterId, semester);
            const nilaiRapor = hitungNilaiRaporSiswa({ jenisAktif, nilaiFromDB, bobotMap, komponenRows, nilaiPTSFinal });
            const deskripsi = findDeskripsiByNilai(nilaiRapor, kategoriRows);
            await saveNilaiRapor({
                siswa_id, mapel_id: mapelId, kelas_id, semester_id: semesterId, semester,
                jenis_penilaian: jenisAktif, nilai_rapor: nilaiRapor, deskripsi, user_id: userId
            });
            countUpdated++;
        }
        return { success: true, count: countUpdated, message: `Berhasil menghitung ulang nilai rapor untuk ${countUpdated} siswa` };
    } catch (err) {
        console.error('Error recomputeAllNilaiRapor:', err);
        throw err;
    }
};

module.exports = {
    getTahunAjaranAktif, getAllKomponenPenilaian, validateGuruMapel, getBobotByMapel, getBobotMapByMapel,
    updateBobotPenilaian, getSiswaByMapel, getNilaiDetailBySiswa, getNilaiRaporPTS, getKategoriNilaiRapor,
    findDeskripsiByNilai, hitungNilaiRaporSiswa, saveNilaiRapor, recomputeAllNilaiRapor,
};