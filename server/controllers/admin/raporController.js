const db = require('../../config/db');
const tahunAjaranModel = require('../../models/admin/tahunAjaranModel');

const getIdSemester = async (idInduk, semester) => {
    const [rows] = await db.execute(
        `SELECT id_tahun_ajaran, semester, status, status_pts, status_pas 
            FROM tahun_ajaran 
            WHERE id_tahun_ajaran_induk = ? AND semester = ?
            LIMIT 1`,
        [idInduk, semester]
    );
    return rows.length > 0 ? rows[0] : null;
};

const getIdTahunAjaranAktif = async (idInduk) => {
    const [rows] = await db.execute(
        `SELECT id_tahun_ajaran, semester 
            FROM tahun_ajaran 
            WHERE id_tahun_ajaran_induk = ? AND status = 'aktif' 
            LIMIT 1`,
        [idInduk]
    );
    return rows.length > 0 ? rows[0] : null;
};

const getTahunAjaranAll = async (req, res) => {
    try {
        const rows = await tahunAjaranModel.getAllTahunAjaran();
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get semua tahun ajaran:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat tahun ajaran' });
    }
};

const getKelasByTahunAjaran = async (req, res) => {
    try {
        const { tahun_ajaran_id, semester } = req.query;

        console.log('📥 GET /arsip-rapor/kelas:', { tahun_ajaran_id, semester });

        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'tahun_ajaran_id wajib diisi'
            });
        }

        // ✅ Frontend mengirim id_induk, langsung pakai untuk query kelas
        const idInduk = parseInt(tahun_ajaran_id, 10);

        if (isNaN(idInduk)) {
            return res.status(400).json({
                success: false,
                message: 'tahun_ajaran_id tidak valid'
            });
        }

        // ✅ Query kelas dengan id_induk (karena kelas berlaku 1 TA penuh)
        const [rows] = await db.execute(
            `SELECT id_kelas, nama_kelas 
             FROM kelas 
             WHERE tahun_ajaran_id = ? 
             ORDER BY nama_kelas`,
            [idInduk]  // ← LANGSUNG pakai id_induk!
        );

        console.log('📋 Kelas ditemukan:', rows.length);

        // Ambil info semester untuk response (opsional)
        let semesterInfo = null;
        if (semester) {
            const [semRows] = await db.execute(
                `SELECT id_tahun_ajaran, semester, status, status_pts, status_pas 
                 FROM tahun_ajaran 
                 WHERE id_tahun_ajaran_induk = ? AND semester = ?
                 LIMIT 1`,
                [idInduk, semester]
            );
            semesterInfo = semRows[0] || null;
        }

        res.json({
            success: true,
            data: rows,
            semester_info: semesterInfo
        });
    } catch (err) {
        console.error('❌ Error get kelas by tahun ajaran:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memuat daftar kelas: ' + err.message 
        });
    }
};

const getDaftarSiswaUntukRapor = async (req, res) => {
    try {
        const tahunAjaranIdInduk = req.tahunAjaranId;
        const kelasId = req.kelasId;
        const { semester } = req.query;

        if (!semester || !['Ganjil', 'Genap'].includes(semester)) {
            return res.status(400).json({
                success: false,
                message: 'semester wajib diisi (Ganjil atau Genap)'
            });
        }

        const semesterData = await getIdSemester(tahunAjaranIdInduk, semester);

        if (!semesterData) {
            return res.status(404).json({
                success: false,
                message: `Semester ${semester} tidak ditemukan`
            });
        }

        const [siswaRows] = await db.execute(
            `SELECT 
            s.id_siswa,
            s.nama_lengkap AS nama,
            s.nis,
            s.nisn
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
        ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIdInduk]
        );

        res.json({
            success: true,
            data: siswaRows,
            semester_info: {
                id: semesterData.id_tahun_ajaran,
                semester: semesterData.semester,
                status_pts: semesterData.status_pts,
                status_pas: semesterData.status_pas
            }
        });
    } catch (err) {
        console.error('Error getDaftarSiswaUntukRapor:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data siswa'
        });
    }
};

const aturStatusPenilaian = async (req, res) => {
    try {
        const { jenis, status, tahun_ajaran_id, semester } = req.body;

        if (!['PTS', 'PAS'].includes(jenis)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis harus PTS atau PAS'
            });
        }
        if (!['aktif', 'nonaktif', 'selesai'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status harus aktif, nonaktif, atau selesai'
            });
        }
        if (!tahun_ajaran_id || tahun_ajaran_id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran ID wajib diisi'
            });
        }
        if (!semester || !['Ganjil', 'Genap'].includes(semester)) {
            return res.status(400).json({
                success: false,
                message: 'Semester wajib diisi (Ganjil atau Genap)'
            });
        }

        const semesterData = await getIdSemester(tahun_ajaran_id, semester);

        if (!semesterData) {
            return res.status(404).json({
                success: false,
                message: `Semester ${semester} tidak ditemukan`
            });
        }

        const idTahunAjaran = semesterData.id_tahun_ajaran;
        const { status_pts, status_pas } = semesterData;

        if (jenis === 'PAS' && status === 'aktif') {
            if (status_pts === 'aktif') {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak bisa membuka PAS karena PTS masih aktif. Selesaikan PTS terlebih dahulu.'
                });
            }
            if (status_pts === 'nonaktif') {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak bisa membuka PAS karena PTS belum diselesaikan. Arsipkan PTS terlebih dahulu.'
                });
            }
        }

        if (jenis === 'PTS' && status === 'aktif') {
            if (status_pas === 'aktif') {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak bisa membuka PTS karena PAS masih aktif. Selesaikan PAS terlebih dahulu.'
                });
            }
        }

        if (jenis === 'PTS' && status === 'aktif' && status_pas === 'selesai') {
            return res.status(400).json({
                success: false,
                message: 'Tidak bisa membuka PTS karena PAS sudah selesai diarsipkan.'
            });
        }

        if (jenis === 'PAS' && status === 'aktif' && status_pts !== 'selesai') {
            return res.status(400).json({
                success: false,
                message: 'Harus menyelesaikan PTS terlebih dahulu sebelum membuka PAS.'
            });
        }

        const statusField = jenis === 'PTS' ? 'status_pts' : 'status_pas';
        const query = `UPDATE tahun_ajaran SET ${statusField} = ? WHERE id_tahun_ajaran = ?`;

        await db.execute(query, [status, idTahunAjaran]);

        console.log(`Status ${jenis} diubah menjadi "${status}" untuk TA ID: ${tahun_ajaran_id}, Semester: ${semester}`);

        res.json({
            success: true,
            message: `Status ${jenis} semester ${semester} berhasil diubah menjadi "${status}"`,
            data: {
                jenis,
                status,
                semester,
                status_pts: jenis === 'PTS' ? status : status_pts,
                status_pas: jenis === 'PAS' ? status : status_pas
            }
        });
    } catch (error) {
        console.error('Error atur status penilaian:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengubah status penilaian'
        });
    }
};

// ✅ UPDATED: Tambah parameter 'jenis' untuk filter PTS/PAS
const ambilDataRaporLengkap = async (siswaId, taId, semester, jenis = 'PTS') => {
    const data = {};

    // Data Akademik
    const [nilaiRaporRows] = await db.execute(
        `SELECT
            mp.kode_mapel,
            mp.nama_mapel,
            nr.nilai_rapor,
            nr.deskripsi
        FROM nilai_rapor nr
        JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran
        WHERE nr.siswa_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?`,
        [siswaId, taId, semester]
    );

    data.akademik = nilaiRaporRows.map(row => ({
        kode_mapel: row.kode_mapel,
        nama_mapel: row.nama_mapel,
        nilai: row.nilai_rapor,
        deskripsi: row.deskripsi,
    }));

    // ✅ Data Kokurikuler - SESUAI STRUKTUR DB
    const [kokurRows] = await db.execute(
        `SELECT 
        ak.kode AS kode_aspek,
        ak.nama AS nama_aspek,
        nk.nilai,
        nk.grade,
        nk.deskripsi,
        nk.jenis_penilaian,
        jp.judul AS nama_judul_proyek
    FROM nilai_kokurikuler nk
    LEFT JOIN aspek_kokurikuler ak ON nk.id_aspek_kokurikuler = ak.id_aspek_kokurikuler
    LEFT JOIN judul_proyek_per_tahun_ajaran jp ON nk.id_judul_proyek = jp.id_judul_proyek
    WHERE nk.id_siswa = ? 
      AND nk.id_tahun_ajaran = ? 
      AND nk.semester = ?
      AND nk.jenis_penilaian = ?`,
        [siswaId, taId, semester, jenis]
    );

    const kokurikulerData = {
        nilai_mutabaah: null,
        nilai_bpi: null,
        nilai_literasi: null,
        nilai_proyek: null,
        nama_judul_proyek: null,
        detail: []
    };

    kokurRows.forEach(row => {
        const kodeAspek = (row.kode_aspek || '').toUpperCase().trim();

        switch (kodeAspek) {
            case 'MUTABAAH':
                kokurikulerData.nilai_mutabaah = row.nilai;
                break;
            case 'BPI':
                kokurikulerData.nilai_bpi = row.nilai;
                break;
            case 'LITERASI':
                kokurikulerData.nilai_literasi = row.nilai;
                break;
            case 'PROYEK':
                kokurikulerData.nilai_proyek = row.nilai;
                break;
        }

        if (row.nama_judul_proyek && !kokurikulerData.nama_judul_proyek) {
            kokurikulerData.nama_judul_proyek = row.nama_judul_proyek;
        }

        kokurikulerData.detail.push({
            kode_aspek: kodeAspek,
            nama_aspek: row.nama_aspek,
            nilai: row.nilai,
            grade: row.grade,
            deskripsi: row.deskripsi,
            judul_proyek: row.nama_judul_proyek
        });
    });

    data.kokurikuler = kokurikulerData;

    // ✅ Data Absensi - SESUAI STRUKTUR DB (pilih kolom berdasarkan jenis)
    const absensiFields = jenis === 'PTS' 
        ? 'sakit_pts AS sakit, izin_pts AS izin, alpha_pts AS alpha'
        : 'sakit_total AS sakit, izin_total AS izin, alpha_total AS alpha';

    const [absensiRows] = await db.execute(
        `SELECT ${absensiFields} FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?`,
        [siswaId, taId]
    );

    data.absensi = absensiRows[0] || { sakit: 0, izin: 0, alpha: 0 };

    // Data Ekstrakurikuler
    const [ekskulRows] = await db.execute(
        `SELECT e.nama_ekskul, pe.deskripsi
        FROM peserta_ekstrakurikuler pe
        JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul
        WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
        [siswaId, taId]
    );

    data.ekskul = ekskulRows.map(row => ({
        nama: row.nama_ekskul,
        deskripsi: row.deskripsi,
    }));

    // Catatan Wali Kelas
    const [catatanRows] = await db.execute(
        `SELECT catatan_wali_kelas, naik_tingkat
        FROM catatan_wali_kelas
        WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
        [siswaId, taId, semester]
    );

    data.catatan_wali_kelas = catatanRows[0]?.catatan_wali_kelas || '';
    data.naik_tingkat = catatanRows[0]?.naik_tingkat || null;

    return data;
};

const arsipkanRapor = async (req, res) => {
    try {
        const { jenis, semester, tahun_ajaran_id } = req.body;

        if (!['PTS', 'PAS'].includes(jenis)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis harus PTS atau PAS'
            });
        }
        if (!['Ganjil', 'Genap'].includes(semester)) {
            return res.status(400).json({
                success: false,
                message: 'Semester harus Ganjil atau Genap'
            });
        }
        if (!tahun_ajaran_id) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran ID wajib diisi'
            });
        }

        const semesterData = await getIdSemester(tahun_ajaran_id, semester);

        if (!semesterData) {
            return res.status(404).json({
                success: false,
                message: `Semester ${semester} tidak ditemukan`
            });
        }

        const taId = semesterData.id_tahun_ajaran;

        const statusField = jenis === 'PTS' ? 'status_pts' : 'status_pas';
        if (semesterData[statusField] !== 'aktif') {
            return res.status(400).json({
                success: false,
                message: `${jenis} harus dalam status aktif terlebih dahulu sebelum bisa diarsipkan`
            });
        }

        const [siswaList] = await db.execute(
            `SELECT sk.siswa_id, sk.kelas_id FROM siswa_kelas sk
            WHERE sk.id_tahun_ajaran_induk = ?`,
            [tahun_ajaran_id]
        );

        if (siswaList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada siswa di semester ini'
            });
        }

        for (const siswa of siswaList) {
            const dataRapor = await ambilDataRaporLengkap(
                siswa.siswa_id,
                taId,
                semester,
                jenis
            );

            await db.execute(
                `INSERT INTO arsip_rapor (
                    id_siswa, id_tahun_ajaran, semester, jenis, data_rapor
                ) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                data_rapor = VALUES(data_rapor),
                created_at = NOW()`,
                [siswa.siswa_id, taId, semester, jenis, JSON.stringify(dataRapor)]
            );
        }

        const query = `UPDATE tahun_ajaran SET ${statusField} = 'selesai' WHERE id_tahun_ajaran = ?`;
        await db.execute(query, [taId]);

        res.json({
            success: true,
            message: `Rapor ${jenis} untuk semester ${semester} berhasil diarsipkan dan dikunci.`,
            total_siswa: siswaList.length
        });
    } catch (err) {
        console.error('Error arsipkanRapor:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengarsipkan rapor'
        });
    }
};

module.exports = {
    getTahunAjaranAll,
    getKelasByTahunAjaran,
    getDaftarSiswaUntukRapor,
    aturStatusPenilaian,
    arsipkanRapor
};