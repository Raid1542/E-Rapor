/**
 * Nama File: pembelajaranController.js
 * Fungsi: Controller penugasan mengajar (mapel wajib bulk + pilihan individual).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const pembelajaranModel = require('../../models/admin/pembelajaranModel');

/**
 * Ambil ID tahun ajaran aktif (semester) berdasarkan ID induk.
 */
const getIdTahunAjaranAktif = async (idInduk) => {
    const [rows] = await db.execute(
        'SELECT id_tahun_ajaran FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND status = \'aktif\' LIMIT 1',
        [idInduk]
    );
    return rows.length > 0 ? rows[0].id_tahun_ajaran : null;
};

/**
 * Validasi semester_id dari request.
 */
const validateSemesterId = async (semesterId) => {
    if (!semesterId || isNaN(Number(semesterId))) {
        return { valid: false, message: 'semester_id wajib diisi dan harus angka' };
    }

    const [rows] = await db.execute(`
    SELECT id_tahun_ajaran, id_tahun_ajaran_induk, tahun_ajaran, semester, status
    FROM tahun_ajaran WHERE id_tahun_ajaran = ?
    `, [Number(semesterId)]);

    if (rows.length === 0) {
        return { valid: false, message: 'Semester tidak ditemukan' };
    }

    return {
        valid: true,
        data: {
            id: rows[0].id_tahun_ajaran,
            id_induk: rows[0].id_tahun_ajaran_induk,
            tahun_ajaran: rows[0].tahun_ajaran,
            semester: rows[0].semester,
            is_aktif: rows[0].status === 'aktif'
        }
    };
};

/**
 * Ambil semua data pembelajaran.
 */
exports.getPembelajaran = async (req, res) => {
    try {
        const { tahun_ajaran_id } = req.query;
        if (!tahun_ajaran_id || isNaN(Number(tahun_ajaran_id))) {
            return res.status(400).json({ success: false, message: 'tahun_ajaran_id (semester_id) wajib diisi dan harus angka' });
        }
        const rows = await pembelajaranModel.getAllByTahunAjaran(Number(tahun_ajaran_id));
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data penugasan mengajar: ' + err.message });
    }
};

/**
 * Ambil data pembelajaran berdasarkan kelas.
 */
exports.getPembelajaranByKelas = async (req, res) => {
    try {
        const { kelasId } = req.params;
        const { semester_id } = req.query;

        if (!kelasId || isNaN(Number(kelasId))) {
            return res.status(400).json({ success: false, message: 'kelasId wajib diisi dan harus angka' });
        }
        if (!semester_id) {
            return res.status(400).json({ success: false, message: 'semester_id wajib diisi di query parameter' });
        }

        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }

        const taId = validation.data.id;
        const idInduk = validation.data.id_induk;

        const [kelasRows] = await db.execute(`
        SELECT k.id_kelas, k.nama_kelas, k.fase, k.tahun_ajaran_id,
                ta.tahun_ajaran, ta.semester, ta.status, ta.id_tahun_ajaran_induk
        FROM kelas k 
        INNER JOIN tahun_ajaran ta ON k.tahun_ajaran_id = ta.id_tahun_ajaran_induk
        WHERE k.id_kelas = ? AND k.tahun_ajaran_id = ?
    `, [Number(kelasId), idInduk]);

        if (kelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        }
        const kelasInfo = kelasRows[0];

        const waliKelas = await pembelajaranModel.getWaliKelas(Number(kelasId), taId);
        const separated = await pembelajaranModel.getByKelasIdSeparated(Number(kelasId), taId);
        const mapelWajibBelumDitugaskan = await pembelajaranModel.getMapelWajibBelumDitugaskan(Number(kelasId), taId);
        const mapelPilihanBelumDitugaskan = await pembelajaranModel.getMapelPilihanBelumDitugaskan(Number(kelasId), taId);

        res.json({
            success: true,
            data: {
                kelas: {
                    id: kelasInfo.id_kelas,
                    nama_kelas: kelasInfo.nama_kelas,
                    tahun_ajaran_id: taId,
                    tahun_ajaran: kelasInfo.tahun_ajaran,
                    semester: validation.data.semester,
                    is_aktif: validation.data.is_aktif
                },
                wali_kelas: waliKelas ? { id: waliKelas.id_user, nama: waliKelas.nama_lengkap } : null,
                mapel_wajib: separated.mapel_wajib,
                mapel_pilihan: separated.mapel_pilihan,
                mapel_wajib_tersedia: mapelWajibBelumDitugaskan,
                mapel_pilihan_tersedia: mapelPilihanBelumDitugaskan
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data pembelajaran kelas: ' + err.message });
    }
};

/**
 * Ambil data dropdown untuk form pembelajaran.
 */
exports.getDropdownPembelajaran = async (req, res) => {
    try {
        let { semester_id } = req.query;

        if (!semester_id) {
            const idInduk = req.idTahunAjaranInduk;
            if (!idInduk) {
                return res.status(400).json({ success: false, message: 'semester_id wajib diisi atau tidak ada tahun ajaran aktif' });
            }
            semester_id = await getIdTahunAjaranAktif(idInduk);
        }

        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }

        const taId = validation.data.id;

        const guruKelas = await pembelajaranModel.getGuruKelasAktif();
        const guruBidangStudi = await pembelajaranModel.getGuruBidangStudiAktif();
        const kelas = await pembelajaranModel.getKelasByTahunAjaran(validation.data.id_induk);
        const semuaMapel = await pembelajaranModel.getMapelByTahunAjaran(taId);

        const mapel_wajib = semuaMapel.filter(mp => mp.jenis === 'wajib');
        const mapel_pilihan = semuaMapel.filter(mp => mp.jenis === 'pilihan');

        res.json({
            success: true,
            data: {
                guru_kelas: guruKelas,
                guru_bidang_studi: guruBidangStudi,
                kelas,
                mapel_wajib,
                mapel_pilihan,
                semester_info: validation.data
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data dropdown: ' + err.message });
    }
};

/**
 * Tambah mata pelajaran wajib secara bulk.
 */
exports.tambahMapelWajib = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { kelas_id, mapel_ids, semester_id } = req.body;

        if (!kelas_id || !mapel_ids || !Array.isArray(mapel_ids) || mapel_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'kelas_id dan mapel_ids (array) wajib diisi.' });
        }
        if (!semester_id) {
            return res.status(400).json({ success: false, message: 'semester_id wajib diisi.' });
        }

        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }

        const taId = validation.data.id;
        const idInduk = validation.data.id_induk;

        if (!validation.data.is_aktif) {
            return res.status(403).json({ success: false, message: `Tidak dapat menambah mapel di semester ${validation.data.semester} yang tidak aktif.` });
        }

        const kelasIdNum = Number(kelas_id);

        const [kelasCheck] = await connection.execute(
            'SELECT id_kelas, nama_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [kelasIdNum, idInduk]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Kelas tidak valid atau bukan milik tahun ajaran yang dipilih.' });
        }

        const waliKelas = await pembelajaranModel.getWaliKelas(kelasIdNum, taId);
        if (!waliKelas) {
            return res.status(400).json({ success: false, message: `Kelas ${kelasCheck[0].nama_kelas} belum memiliki wali kelas. Tetapkan wali kelas terlebih dahulu.` });
        }

        const placeholders = mapel_ids.map(() => '?').join(',');
        const [mapelCheck] = await connection.execute(
            `SELECT id_mata_pelajaran, nama_mapel, jenis FROM mata_pelajaran WHERE id_mata_pelajaran IN (${placeholders}) AND tahun_ajaran_id = ?`,
            [...mapel_ids.map(id => Number(id)), taId]
        );
        if (mapelCheck.length !== mapel_ids.length) {
            return res.status(400).json({ success: false, message: 'Beberapa mata pelajaran tidak valid atau bukan milik semester yang dipilih.' });
        }

        const nonWajib = mapelCheck.filter(m => m.jenis !== 'wajib');
        if (nonWajib.length > 0) {
            return res.status(400).json({ success: false, message: `"${nonWajib.map(m => m.nama_mapel).join(', ')}" bukan mata pelajaran wajib.` });
        }

        await connection.beginTransaction();
        const inserted = await pembelajaranModel.bulkInsertMapelWajib(kelasIdNum, mapel_ids.map(id => Number(id)), waliKelas.id_user, taId, connection);
        await connection.commit();

        res.status(201).json({
            success: true,
            message: `${inserted.length} mapel wajib berhasil ditugaskan ke ${waliKelas.nama_lengkap} di kelas ${kelasCheck[0].nama_kelas}.`,
            inserted_count: inserted.length,
            inserted_ids: inserted
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message || 'Gagal menambah mata pelajaran wajib' });
    } finally {
        connection.release();
    }
};

/**
 * Tambah mata pelajaran pilihan secara individual.
 */
exports.tambahMapelPilihan = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { kelas_id, mapel_id, user_id, semester_id } = req.body;

        if (!kelas_id || !mapel_id || !user_id) {
            return res.status(400).json({ success: false, message: 'Kelas, mata pelajaran, dan guru pengampu wajib diisi.' });
        }
        if (!semester_id) {
            return res.status(400).json({ success: false, message: 'semester_id wajib diisi.' });
        }

        const validation = await validateSemesterId(semester_id);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }

        const taId = validation.data.id;
        const idInduk = validation.data.id_induk;

        if (!validation.data.is_aktif) {
            return res.status(403).json({ success: false, message: `Tidak dapat menambah mapel di semester ${validation.data.semester} yang tidak aktif.` });
        }

        const kelasIdNum = Number(kelas_id);
        const mapelIdNum = Number(mapel_id);
        const userIdNum = Number(user_id);

        const [kelasCheck] = await connection.execute(
            'SELECT id_kelas, nama_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [kelasIdNum, idInduk]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Kelas tidak valid atau bukan milik tahun ajaran yang dipilih.' });
        }

        const [mapelCheck] = await connection.execute(
            'SELECT id_mata_pelajaran, nama_mapel, jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?',
            [mapelIdNum, taId]
        );
        if (mapelCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Mata pelajaran tidak valid.' });
        }
        if (mapelCheck[0].jenis !== 'pilihan') {
            return res.status(400).json({ success: false, message: `"${mapelCheck[0].nama_mapel}" bukan mata pelajaran pilihan.` });
        }

        const [guruCheck] = await connection.execute(
            'SELECT id_user, nama_lengkap FROM user WHERE id_user = ? AND status = \'aktif\'',
            [userIdNum]
        );
        if (guruCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Guru tidak valid atau tidak aktif.' });
        }

        const isMapelDuplicate = await pembelajaranModel.isMapelDuplicateInKelas(kelasIdNum, mapelIdNum, taId);
        if (isMapelDuplicate) {
            return res.status(400).json({ success: false, message: `Mata pelajaran "${mapelCheck[0].nama_mapel}" sudah ditugaskan di kelas ini.` });
        }

        await connection.beginTransaction();
        const id = await pembelajaranModel.create({ tahun_ajaran_id: taId, kelas_id: kelasIdNum, mapel_id: mapelIdNum, user_id: userIdNum }, connection);
        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Mapel pilihan "${mapelCheck[0].nama_mapel}" berhasil ditugaskan ke ${guruCheck[0].nama_lengkap} di kelas ${kelasCheck[0].nama_kelas}.`,
            id
        });
    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ success: false, message: 'Kombinasi ini sudah ada.' });
        }
        res.status(500).json({ success: false, message: err.message || 'Gagal menambah mata pelajaran pilihan' });
    } finally {
        connection.release();
    }
};

/**
 * Tambah pembelajaran (Legacy).
 */
exports.tambahPembelajaran = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { kelas_id, mapel_id, user_id, semester_id } = req.body;
        if (!kelas_id || !mapel_id || !user_id) {
            return res.status(400).json({ success: false, message: 'Guru, kelas, dan mata pelajaran wajib diisi.' });
        }

        let taId;
        let idInduk;
        if (semester_id) {
            const validation = await validateSemesterId(semester_id);
            if (!validation.valid) {
                return res.status(400).json({ success: false, message: validation.message });
            }
            if (!validation.data.is_aktif) {
                return res.status(403).json({ success: false, message: `Semester ${validation.data.semester} tidak aktif.` });
            }
            taId = validation.data.id;
            idInduk = validation.data.id_induk;
        } else {
            const idIndukTemp = req.idTahunAjaranInduk;
            if (!idIndukTemp) {
                return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif.' });
            }
            taId = await getIdTahunAjaranAktif(idIndukTemp);
            if (!taId) {
                return res.status(400).json({ success: false, message: 'Tidak ada semester aktif.' });
            }
            idInduk = idIndukTemp;
        }

        const kelasIdNum = Number(kelas_id);
        const mapelIdNum = Number(mapel_id);
        const userIdNum = Number(user_id);

        const [guruCheck] = await connection.execute(
            'SELECT id_user FROM user WHERE id_user = ? AND status = \'aktif\'',
            [userIdNum]
        );
        if (guruCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Guru tidak valid atau tidak aktif.' });
        }

        const [kelasCheck] = await connection.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [kelasIdNum, idInduk]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Kelas tidak valid.' });
        }

        const [mapelCheck] = await connection.execute(
            'SELECT id_mata_pelajaran, nama_mapel, jenis FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?',
            [mapelIdNum, taId]
        );
        if (mapelCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Mata pelajaran tidak valid.' });
        }

        const namaMapel = mapelCheck[0].nama_mapel;

        const isDuplicate = await pembelajaranModel.isDuplicate(userIdNum, kelasIdNum, mapelIdNum, taId);
        if (isDuplicate) {
            return res.status(400).json({ success: false, message: 'Kombinasi ini sudah ada.' });
        }

        const isMapelDuplicate = await pembelajaranModel.isMapelDuplicateInKelas(kelasIdNum, mapelIdNum, taId);
        if (isMapelDuplicate) {
            return res.status(400).json({ success: false, message: `Mapel "${namaMapel}" sudah ada di kelas ini.` });
        }

        await connection.beginTransaction();
        const id = await pembelajaranModel.create({ tahun_ajaran_id: taId, kelas_id: kelasIdNum, mapel_id: mapelIdNum, user_id: userIdNum }, connection);
        await connection.commit();

        res.status(201).json({ success: true, message: `Penugasan "${namaMapel}" berhasil ditambahkan.`, id });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message || 'Gagal menambah penugasan' });
    } finally {
        connection.release();
    }
};

/**
 * Update data pembelajaran.
 */
exports.editPembelajaran = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { kelas_id, mapel_id, user_id, semester_id } = req.body;

        if (!kelas_id || !mapel_id || !user_id) {
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
        }

        let taId;
        let idInduk;
        if (semester_id) {
            const validation = await validateSemesterId(semester_id);
            if (!validation.valid) {
                return res.status(400).json({ success: false, message: validation.message });
            }
            if (!validation.data.is_aktif) {
                return res.status(403).json({ success: false, message: `Semester ${validation.data.semester} tidak aktif.` });
            }
            taId = validation.data.id;
            idInduk = validation.data.id_induk;
        } else {
            const idIndukTemp = req.idTahunAjaranInduk;
            if (!idIndukTemp) {
                return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif.' });
            }
            taId = await getIdTahunAjaranAktif(idIndukTemp);
            if (!taId) {
                return res.status(400).json({ success: false, message: 'Tidak ada semester aktif.' });
            }
            idInduk = idIndukTemp;
        }

        const idNum = Number(id);
        const kelasIdNum = Number(kelas_id);
        const mapelIdNum = Number(mapel_id);
        const userIdNum = Number(user_id);

        const oldData = await pembelajaranModel.getById(idNum);
        if (!oldData) {
            return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan.' });
        }
        if (oldData.tahun_ajaran_id !== taId) {
            return res.status(403).json({ success: false, message: 'Data tidak milik semester yang dipilih.' });
        }

        const hasChanges = oldData.user_id !== userIdNum || oldData.kelas_id !== kelasIdNum || oldData.mapel_id !== mapelIdNum;
        if (!hasChanges) {
            return res.status(400).json({ success: false, message: 'Tidak ada perubahan data.' });
        }

        const [guruCheck] = await connection.execute(
            'SELECT id_user FROM user WHERE id_user = ? AND status = \'aktif\'',
            [userIdNum]
        );
        if (guruCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Guru tidak valid.' });
        }

        const [kelasCheck] = await connection.execute(
            'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
            [kelasIdNum, idInduk]
        );
        if (kelasCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Kelas tidak valid.' });
        }

        const [mapelCheck] = await connection.execute(
            'SELECT id_mata_pelajaran, nama_mapel FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?',
            [mapelIdNum, taId]
        );
        if (mapelCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Mapel tidak valid.' });
        }

        const namaMapel = mapelCheck[0].nama_mapel;

        const isDuplicate = await pembelajaranModel.isDuplicate(userIdNum, kelasIdNum, mapelIdNum, taId, idNum);
        if (isDuplicate) {
            return res.status(400).json({ success: false, message: 'Kombinasi ini sudah ada.' });
        }

        await connection.beginTransaction();
        const success = await pembelajaranModel.update(idNum, { kelas_id: kelasIdNum, mapel_id: mapelIdNum, user_id: userIdNum }, connection);
        await connection.commit();

        if (!success) {
            return res.status(404).json({ success: false, message: 'Gagal memperbarui.' });
        }

        res.json({ success: true, message: `Penugasan "${namaMapel}" berhasil diperbarui.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui' });
    } finally {
        connection.release();
    }
};

/**
 * Hapus data pembelajaran.
 */
exports.hapusPembelajaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { semester_id } = req.body;

        let taId;
        if (semester_id) {
            const validation = await validateSemesterId(semester_id);
            if (!validation.valid) {
                return res.status(400).json({ success: false, message: validation.message });
            }
            if (!validation.data.is_aktif) {
                return res.status(403).json({ success: false, message: `Semester ${validation.data.semester} tidak aktif.` });
            }
            taId = validation.data.id;
        } else {
            const idInduk = req.idTahunAjaranInduk;
            if (!idInduk) {
                return res.status(400).json({ success: false, message: 'Tidak ada tahun ajaran aktif.' });
            }
            taId = await getIdTahunAjaranAktif(idInduk);
            if (!taId) {
                return res.status(400).json({ success: false, message: 'Tidak ada semester aktif.' });
            }
        }

        const idNum = Number(id);

        const data = await pembelajaranModel.getById(idNum);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan.' });
        }
        if (data.tahun_ajaran_id !== taId) {
            return res.status(403).json({ success: false, message: 'Data tidak milik semester aktif.' });
        }

        const jumlahNilai = await pembelajaranModel.hasNilaiRapor(data.mapel_id, data.kelas_id, data.tahun_ajaran_id);
        if (jumlahNilai > 0) {
            return res.status(400).json({ success: false, message: `Tidak bisa dihapus: sudah ada ${jumlahNilai} data nilai rapor.` });
        }

        const success = await pembelajaranModel.deleteById(idNum);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Penugasan tidak ditemukan.' });
        }

        res.json({ success: true, message: `Penugasan "${data.nama_mapel}" dari ${data.nama_guru} di kelas ${data.nama_kelas} berhasil dihapus.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal menghapus penugasan: ' + err.message });
    }
};