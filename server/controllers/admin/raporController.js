/**
 * Nama File: raporController.js
 * Fungsi: Controller arsip rapor + atur status PTS/PAS + data rapor lengkap
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');
const tahunAjaranModel = require('../../models/admin/tahunAjaranModel');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Ambil ID semester berdasarkan ID induk dan nama semester
const getIdSemester = async (idInduk, semester) => {
    const [rows] = await db.execute(
        'SELECT id_tahun_ajaran, semester, status, status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND semester = ? LIMIT 1',
        [idInduk, semester]
    );
    return rows.length > 0 ? rows[0] : null;
};

// Ambil ID tahun ajaran aktif berdasarkan ID induk
const getIdTahunAjaranAktif = async (idInduk) => {
    const [rows] = await db.execute(
        'SELECT id_tahun_ajaran, semester FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND status = \'aktif\' LIMIT 1',
        [idInduk]
    );
    return rows.length > 0 ? rows[0] : null;
};

// Ambil data rapor lengkap untuk satu siswa (akademik, kokurikuler, absensi, ekskul, catatan)
const ambilDataRaporLengkap = async (siswaId, taId, semester, jenis = 'PTS') => {
    const data = {};
    try {
        // Data Akademik
        const [nilaiRaporRows] = await db.execute(
            'SELECT mp.kode_mapel, mp.nama_mapel, nr.nilai_rapor, nr.deskripsi FROM nilai_rapor nr JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran WHERE nr.siswa_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?',
            [siswaId, taId, semester]
        );
        data.akademik = nilaiRaporRows.map(row => ({ kode_mapel: row.kode_mapel, nama_mapel: row.nama_mapel, nilai: row.nilai_rapor, deskripsi: row.deskripsi }));

        // Data Kokurikuler
        const [kokurRows] = await db.execute(`
            SELECT ak.kode AS kode_aspek, ak.nama AS nama_aspek, nk.nilai, nk.grade, nk.deskripsi, nk.jenis_penilaian, jp.judul AS nama_judul_proyek
            FROM nilai_kokurikuler nk
            LEFT JOIN aspek_kokurikuler ak ON nk.id_aspek_kokurikuler = ak.id_aspek_kokurikuler
            LEFT JOIN judul_proyek_per_tahun_ajaran jp ON nk.id_judul_proyek = jp.id_judul_proyek
            WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
        `, [siswaId, taId, semester, jenis]);

        const kokurikulerData = { nilai_mutabaah: null, nilai_bpi: null, nilai_literasi: null, nilai_proyek: null, nama_judul_proyek: null, detail: [] };
        kokurRows.forEach(row => {
            const kodeAspek = (row.kode_aspek || '').toUpperCase().trim();
            if (kodeAspek === 'MUTABAAH') kokurikulerData.nilai_mutabaah = row.nilai;
            else if (kodeAspek === 'BPI') kokurikulerData.nilai_bpi = row.nilai;
            else if (kodeAspek === 'LITERASI') kokurikulerData.nilai_literasi = row.nilai;
            else if (kodeAspek === 'PROYEK') kokurikulerData.nilai_proyek = row.nilai;
            if (row.nama_judul_proyek && !kokurikulerData.nama_judul_proyek) kokurikulerData.nama_judul_proyek = row.nama_judul_proyek;
            kokurikulerData.detail.push({ kode_aspek: kodeAspek, nama_aspek: row.nama_aspek, nilai: row.nilai, grade: row.grade, deskripsi: row.deskripsi, judul_proyek: row.nama_judul_proyek });
        });
        data.kokurikuler = kokurikulerData;

        // Data Absensi
        const absensiFields = jenis === 'PTS' ? 'sakit_pts AS sakit, izin_pts AS izin, alpha_pts AS alpha' : 'sakit_total AS sakit, izin_total AS izin, alpha_total AS alpha';
        const [absensiRows] = await db.execute(`SELECT ${absensiFields} FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?`, [siswaId, taId]);
        data.absensi = absensiRows[0] || { sakit: 0, izin: 0, alpha: 0 };

        // Data Ekstrakurikuler
        const [ekskulRows] = await db.execute(
            'SELECT e.nama_ekskul, pe.deskripsi FROM peserta_ekstrakurikuler pe JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?',
            [siswaId, taId]
        );
        data.ekskul = ekskulRows.map(row => ({ nama: row.nama_ekskul, deskripsi: row.deskripsi }));

        // Catatan Wali Kelas
        const [catatanRows] = await db.execute(
            'SELECT catatan_wali_kelas, naik_tingkat FROM catatan_wali_kelas WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ?',
            [siswaId, taId, semester]
        );
        data.catatan_wali_kelas = catatanRows[0]?.catatan_wali_kelas || '';
        data.naik_tingkat = catatanRows[0]?.naik_tingkat || null;

        return data;
    } catch (err) {
        console.error(`Error ambilDataRaporLengkap untuk siswa ${siswaId}:`, err);
        throw new Error(`Gagal mengambil data rapor: ${err.message}`);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET SEMUA TAHUN AJARAN
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil daftar semua tahun ajaran untuk dropdown
const getTahunAjaranAll = async (req, res) => {
    try {
        const rows = await tahunAjaranModel.getAllTahunAjaran();
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error get semua tahun ajaran:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat daftar tahun ajaran. Silakan coba lagi atau hubungi administrator.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET KELAS BY TAHUN AJARAN
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil daftar kelas berdasarkan tahun ajaran dan semester
const getKelasByTahunAjaran = async (req, res) => {
    try {
        const { tahun_ajaran_id, semester } = req.query;
        if (!tahun_ajaran_id) return res.status(400).json({ success: false, message: 'Parameter tahun_ajaran_id wajib diisi. Silakan pilih tahun ajaran terlebih dahulu.' });

        const idInduk = parseInt(tahun_ajaran_id, 10);
        if (isNaN(idInduk)) return res.status(400).json({ success: false, message: 'ID tahun ajaran tidak valid. Silakan pilih tahun ajaran yang tersedia.' });

        // Ambil daftar kelas
        const [rows] = await db.execute('SELECT id_kelas, nama_kelas FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas', [idInduk]);
        if (rows.length === 0) {
            return res.json({ success: true, data: [], message: 'Tidak ada kelas yang terdaftar untuk tahun ajaran ini. Silakan tambahkan kelas terlebih dahulu.', semester_info: null });
        }

        // Ambil info semester jika ada
        let semesterInfo = null;
        if (semester) {
            const [semRows] = await db.execute(
                'SELECT id_tahun_ajaran, semester, status, status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND semester = ? LIMIT 1',
                [idInduk, semester]
            );
            semesterInfo = semRows[0] || null;
        }

        res.json({ success: true, data: rows, semester_info: semesterInfo });
    } catch (err) {
        console.error('Error get kelas by tahun ajaran:', err);
        res.status(500).json({ success: false, message: `Gagal memuat daftar kelas: ${err.message}. Silakan coba lagi.` });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. GET DAFTAR SISWA UNTUK RAPOR
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil daftar siswa untuk arsip rapor berdasarkan kelas dan semester
const getDaftarSiswaUntukRapor = async (req, res) => {
    try {
        const tahunAjaranIdInduk = req.tahunAjaranId;
        const kelasId = req.kelasId;
        const { semester } = req.query;

        // Validasi input
        if (!tahunAjaranIdInduk) return res.status(400).json({ success: false, message: 'Tahun ajaran tidak ditemukan. Silakan pilih tahun ajaran terlebih dahulu.' });
        if (!kelasId) return res.status(400).json({ success: false, message: 'Kelas tidak ditemukan. Silakan pilih kelas terlebih dahulu.' });
        if (!semester || !['Ganjil', 'Genap'].includes(semester)) return res.status(400).json({ success: false, message: 'Semester tidak valid. Harap pilih semester Ganjil atau Genap.' });

        // Ambil data semester
        const semesterData = await getIdSemester(tahunAjaranIdInduk, semester);
        if (!semesterData) return res.status(404).json({ success: false, message: `Data semester ${semester} untuk tahun ajaran ini tidak ditemukan. Silakan periksa konfigurasi tahun ajaran.` });

        // Ambil daftar siswa
        const [siswaRows] = await db.execute(
            'SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn FROM siswa s INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? ORDER BY s.nama_lengkap',
            [kelasId, tahunAjaranIdInduk]
        );

        if (siswaRows.length === 0) {
            return res.json({
                success: true, data: [], message: 'Tidak ada siswa terdaftar di kelas ini untuk tahun ajaran selected.',
                semester_info: { id: semesterData.id_tahun_ajaran, semester: semesterData.semester, status_pts: semesterData.status_pts, status_pas: semesterData.status_pas }
            });
        }

        res.json({
            success: true, data: siswaRows,
            semester_info: { id: semesterData.id_tahun_ajaran, semester: semesterData.semester, status_pts: semesterData.status_pts, status_pas: semesterData.status_pas }
        });
    } catch (err) {
        console.error('Error getDaftarSiswaUntukRapor:', err);
        res.status(500).json({ success: false, message: `Gagal memuat data siswa: ${err.message}. Silakan coba lagi.` });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. ATUR STATUS PENILAIAN (PTS/PAS)
// ═════════════════════════════════════════════════════════════════════════════

// POST: Atur status penilaian PTS atau PAS (aktif/nonaktif/selesai)
// Business Rules: PTS & PAS tidak boleh aktif bersamaan, urutan PTS→PAS
const aturStatusPenilaian = async (req, res) => {
    try {
        const { jenis, status, tahun_ajaran_id, semester } = req.body;

        // Validasi input
        if (!jenis || !['PTS', 'PAS'].includes(jenis)) return res.status(400).json({ success: false, message: 'Jenis penilaian tidak valid. Pilih PTS atau PAS.' });
        if (!status || !['aktif', 'nonaktif', 'selesai'].includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid. Pilih aktif, nonaktif, atau selesai.' });
        if (!tahun_ajaran_id || tahun_ajaran_id <= 0) return res.status(400).json({ success: false, message: 'ID tahun ajaran tidak valid. Silakan pilih tahun ajaran yang tersedia.' });
        if (!semester || !['Ganjil', 'Genap'].includes(semester)) return res.status(400).json({ success: false, message: 'Semester tidak valid. Pilih Ganjil atau Genap.' });

        // Ambil data semester
        const semesterData = await getIdSemester(tahun_ajaran_id, semester);
        if (!semesterData) return res.status(404).json({ success: false, message: `Data semester ${semester} untuk tahun ajaran ini tidak ditemukan di database.` });

        const idTahunAjaran = semesterData.id_tahun_ajaran;
        const { status_pts, status_pas } = semesterData;

        // Validasi business logic
        if (jenis === 'PAS' && status === 'aktif') {
            if (status_pts === 'aktif') return res.status(400).json({ success: false, message: 'Tidak dapat membuka PAS karena PTS masih berstatus AKTIF. Silakan selesaikan (arsipkan) PTS terlebih dahulu.' });
            if (status_pts === 'nonaktif') return res.status(400).json({ success: false, message: 'Tidak dapat membuka PAS karena PTS belum pernah dibuka. Silakan buka dan selesaikan PTS terlebih dahulu.' });
        }
        if (jenis === 'PTS' && status === 'aktif') {
            if (status_pas === 'aktif') return res.status(400).json({ success: false, message: 'Tidak dapat membuka PTS karena PAS masih berstatus AKTIF. Silakan selesaikan (arsipkan) PAS terlebih dahulu.' });
        }
        if (jenis === 'PTS' && status === 'aktif' && status_pas === 'selesai') {
            return res.status(400).json({ success: false, message: 'Tidak dapat membuka PTS karena PAS sudah diarsipkan (selesai). Urutan penilaian harus PTS dahulu, kemudian PAS.' });
        }
        if (jenis === 'PAS' && status === 'aktif' && status_pts !== 'selesai') {
            return res.status(400).json({ success: false, message: 'Harap selesaikan (arsipkan) PTS terlebih dahulu sebelum membuka PAS.' });
        }

        // Update status
        const statusField = jenis === 'PTS' ? 'status_pts' : 'status_pas';
        const query = `UPDATE tahun_ajaran SET ${statusField} = ? WHERE id_tahun_ajaran = ?`;
        await db.execute(query, [status, idTahunAjaran]);

        console.log(`Status ${jenis} berhasil diubah menjadi "${status}" untuk TA ID: ${tahun_ajaran_id}, Semester: ${semester}`);

        res.json({
            success: true,
            message: `Status ${jenis} Semester ${semester} berhasil diubah menjadi "${status.toUpperCase()}". Guru sekarang dapat ${status === 'aktif' ? 'menginput nilai' : status === 'selesai' ? 'mengunduh rapor (data terkunci)' : 'melihat nilai (tidak dapat mengedit)'}.`,
            data: { jenis, status, semester, status_pts: jenis === 'PTS' ? status : status_pts, status_pas: jenis === 'PAS' ? status : status_pas }
        });
    } catch (error) {
        console.error('Error atur status penilaian:', error);
        res.status(500).json({ success: false, message: `Gagal mengubah status penilaian: ${error.message}. Silakan coba lagi.` });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. ARSIPKAN RAPOR
// ═════════════════════════════════════════════════════════════════════════════

// POST: Arsipkan rapor semua siswa (data JSON di arsip_rapor, status jadi 'selesai')
const arsipkanRapor = async (req, res) => {
    try {
        const { jenis, semester, tahun_ajaran_id } = req.body;

        // Validasi input
        if (!jenis || !['PTS', 'PAS'].includes(jenis)) return res.status(400).json({ success: false, message: 'Jenis penilaian tidak valid. Pilih PTS atau PAS.' });
        if (!semester || !['Ganjil', 'Genap'].includes(semester)) return res.status(400).json({ success: false, message: 'Semester tidak valid. Pilih Ganjil atau Genap.' });
        if (!tahun_ajaran_id) return res.status(400).json({ success: false, message: 'ID tahun ajaran wajib diisi.' });

        // Ambil data semester
        const semesterData = await getIdSemester(tahun_ajaran_id, semester);
        if (!semesterData) return res.status(404).json({ success: false, message: `Data semester ${semester} untuk tahun ajaran ini tidak ditemukan.` });

        const taId = semesterData.id_tahun_ajaran;

        // Validasi: harus dalam status aktif
        const statusField = jenis === 'PTS' ? 'status_pts' : 'status_pas';
        if (semesterData[statusField] !== 'aktif') {
            return res.status(400).json({ success: false, message: `${jenis} harus dalam status AKTIF terlebih dahulu sebelum bisa diarsipkan. Silakan aktifkan ${jenis} terlebih dahulu.` });
        }

        // Ambil daftar siswa
        const [siswaList] = await db.execute('SELECT sk.siswa_id, sk.kelas_id FROM siswa_kelas sk WHERE sk.id_tahun_ajaran_induk = ?', [tahun_ajaran_id]);
        if (siswaList.length === 0) return res.status(404).json({ success: false, message: 'Tidak ada siswa terdaftar di tahun ajaran ini. Tidak ada data yang bisa diarsipkan.' });

        console.log(`Mulai mengarsipkan rapor ${jenis} untuk ${siswaList.length} siswa...`);

        let successCount = 0;
        let errorCount = 0;

        // Arsipkan rapor per siswa
        for (const siswa of siswaList) {
            try {
                const dataRapor = await ambilDataRaporLengkap(siswa.siswa_id, taId, semester, jenis);
                await db.execute(
                    'INSERT INTO arsip_rapor (id_siswa, id_tahun_ajaran, semester, jenis, data_rapor) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data_rapor = VALUES(data_rapor), created_at = NOW()',
                    [siswa.siswa_id, taId, semester, jenis, JSON.stringify(dataRapor)]
                );
                successCount++;
            } catch (err) {
                console.error(`Gagal mengarsipkan rapor siswa ${siswa.siswa_id}:`, err);
                errorCount++;
            }
        }

        // Update status menjadi selesai
        const query = `UPDATE tahun_ajaran SET ${statusField} = 'selesai' WHERE id_tahun_ajaran = ?`;
        await db.execute(query, [taId]);

        console.log(`Arsip selesai: ${successCount} berhasil, ${errorCount} gagal`);

        const message = errorCount === 0 
            ? `Rapor ${jenis} Semester ${semester} berhasil diarsipkan dan dikunci permanen. Total ${successCount} siswa.`
            : `Arsip selesai dengan ${errorCount} kegagalan. ${successCount} dari ${siswaList.length} rapor berhasil diarsipkan.`;

        res.json({ success: errorCount === 0, message, total_siswa: siswaList.length, success_count: successCount, error_count: errorCount });
    } catch (err) {
        console.error('Error arsipkanRapor:', err);
        res.status(500).json({ success: false, message: `Gagal mengarsipkan rapor: ${err.message}. Silakan coba lagi.` });
    }
};

module.exports = { getTahunAjaranAll, getKelasByTahunAjaran, getDaftarSiswaUntukRapor, aturStatusPenilaian, arsipkanRapor };