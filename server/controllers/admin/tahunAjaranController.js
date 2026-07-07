/**
 * Nama File: tahunAjaranController.js
 * Fungsi: Controller CRUD tahun ajaran (induk + semester) + ganti semester aktif
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const tahunAjaranModel = require('../../models/admin/tahunAjaranModel');
const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Sanitasi input tanggal ke format YYYY-MM-DD
const sanitizeDate = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const str = String(value).trim();
    if (str === '') return null;

    // Validasi format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) return str;
    }

    // Coba parse format lain
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
};

// Format tanggal untuk perbandingan (YYYY-MM-DD)
const formatDateForCompare = (dateValue) => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET ALL TAHUN AJARAN
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil daftar semua tahun ajaran dengan detail semester dan status penilaian
const getTahunAjaran = async (req, res) => {
    try {
        const data = await tahunAjaranModel.getAllTahunAjaran();

        const formattedData = data.map(row => {
            const isAktif = row.status_ganjil === 'aktif' || row.status_genap === 'aktif';
            return {
                id_induk: row.id_tahun_ajaran_induk, tahun_ajaran: row.tahun_ajaran,
                pts_ganjil: formatDateForCompare(row.pts_ganjil), pas_ganjil: formatDateForCompare(row.pas_ganjil),
                pts_genap: formatDateForCompare(row.pts_genap), pas_genap: formatDateForCompare(row.pas_genap),
                status: isAktif ? 'AKTIF' : 'NONAKTIF', semester_aktif: row.semester_aktif
                    ? row.semester_aktif.charAt(0).toUpperCase() + row.semester_aktif.slice(1).toLowerCase()
                    : 'Ganjil',
                id_detail_ganjil: row.id_ganjil, id_detail_genap: row.id_genap,
                status_pts_ganjil: row.status_pts_ganjil || 'nonaktif', status_pas_ganjil: row.status_pas_ganjil || 'nonaktif',
                status_pts_genap: row.status_pts_genap || 'nonaktif', status_pas_genap: row.status_pas_genap || 'nonaktif',
                created_at: row.created_at
            };
        });

        res.json({ success: true, data: formattedData, total: formattedData.length });
    } catch (err) {
        console.error('Error get tahun ajaran:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat data tahun ajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GET SEMESTER LIST
// ═════════════════════════════════════════════════════════════════════════════

// GET: Ambil daftar semua semester (Ganjil & Genap) untuk dropdown
const getSemesterList = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk, ta.tahun_ajaran, ta.semester, ta.status,
                    ta.tanggal_pembagian_pts, ta.tanggal_pembagian_pas, tai.tahun_ajaran as tahun_ajaran_induk
            FROM tahun_ajaran ta
            LEFT JOIN tahun_ajaran_induk tai ON ta.id_tahun_ajaran_induk = tai.id_tahun_ajaran_induk
            WHERE ta.semester IS NOT NULL
            ORDER BY tai.tahun_ajaran DESC, ta.semester ASC
        `);

        const formattedData = rows.map(row => ({
            id: row.id_tahun_ajaran, id_induk: row.id_tahun_ajaran_induk, tahun_ajaran: row.tahun_ajaran,
            semester: row.semester, is_aktif: row.status === 'aktif',
            tanggal_pembagian_pts: row.tanggal_pembagian_pts, tanggal_pembagian_pas: row.tanggal_pembagian_pas
        }));

        res.json({ success: true, data: formattedData, total: formattedData.length });
    } catch (err) {
        console.error('Error get semester list:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat data semester' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. CREATE TAHUN AJARAN
// ═════════════════════════════════════════════════════════════════════════════

// POST: Tambah tahun ajaran baru (auto-deactivate TA sebelumnya, validasi duplikasi)
const tambahTahunAjaran = async (req, res) => {
    try {
        const { tahun1, tahun2, pts_ganjil, pas_ganjil, pts_genap, pas_genap } = req.body;

        // Validasi field wajib
        if (!tahun1 || !tahun2) return res.status(400).json({ success: false, message: 'Tahun awal dan tahun akhir wajib diisi.' });

        // Validasi format tahun
        const t1 = parseInt(tahun1);
        const t2 = parseInt(tahun2);
        if (isNaN(t1) || isNaN(t2)) return res.status(400).json({ success: false, message: 'Tahun harus berupa angka yang valid.' });
        if (t2 <= t1) return res.status(400).json({ success: false, message: `Tahun akhir (${t2}) harus lebih besar dari tahun awal (${t1}).` });

        const tahun_ajaran = `${t1}/${t2}`;

        // Cek duplikasi tahun ajaran
        const [existing] = await db.execute('SELECT id_tahun_ajaran_induk, tahun_ajaran FROM tahun_ajaran_induk WHERE tahun_ajaran = ?', [tahun_ajaran]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: `Tahun ajaran "${tahun_ajaran}" sudah ada di sistem. Tidak dapat menambahkan data yang sama.` });
        }

        // Sanitasi tanggal
        const sanitizedData = {
            tahun_ajaran, pts_ganjil: sanitizeDate(pts_ganjil), pas_ganjil: sanitizeDate(pas_ganjil),
            pts_genap: sanitizeDate(pts_genap), pas_genap: sanitizeDate(pas_genap)
        };

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Nonaktifkan semua tahun ajaran aktif sebelumnya
            await connection.execute('UPDATE tahun_ajaran SET status = \'nonaktif\' WHERE status = \'aktif\'');

            // Buat tahun ajaran baru
            const id_induk = await tahunAjaranModel.createTahunAjaran(sanitizedData, connection);
            await connection.commit();

            res.status(201).json({ success: true, message: `Tahun ajaran ${tahun_ajaran} berhasil ditambahkan. Tahun ajaran sebelumnya otomatis dinonaktifkan.`, id_induk });
        } catch (err) {
            await connection.rollback();
            if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
                return res.status(400).json({ success: false, message: `Tahun ajaran "${tahun_ajaran}" sudah ada di sistem.` });
            }
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error tambah tahun ajaran:', err);
        res.status(500).json({ success: false, message: err.message || 'Gagal menambah tahun ajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. UPDATE TAHUN AJARAN
// ═════════════════════════════════════════════════════════════════════════════

// PUT: Update tanggal PTS/PAS (validasi penguncian jika penilaian sudah selesai)
const updateTahunAjaran = async (req, res) => {
    try {
        const { id_induk } = req.params;
        const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = req.body;

        // Validasi: Cek tahun ajaran ada
        const [cekTA] = await db.execute('SELECT id_tahun_ajaran_induk FROM tahun_ajaran_induk WHERE id_tahun_ajaran_induk = ?', [id_induk]);
        if (cekTA.length === 0) return res.status(404).json({ success: false, message: 'Tahun ajaran tidak ditemukan.' });

        // Validasi: Cek apakah ada field yang sudah dikunci
        const [statusCheck] = await db.execute(`
            SELECT g.status_pts AS status_pts_ganjil, g.status_pas AS status_pas_ganjil,
                    g.tanggal_pembagian_pts AS pts_ganjil_current, g.tanggal_pembagian_pas AS pas_ganjil_current,
                    ge.status_pts AS status_pts_genap, ge.status_pas AS status_pas_genap,
                    ge.tanggal_pembagian_pts AS pts_genap_current, ge.tanggal_pembagian_pas AS pas_genap_current
            FROM tahun_ajaran_induk tai
            LEFT JOIN tahun_ajaran g ON tai.id_tahun_ajaran_induk = g.id_tahun_ajaran_induk AND g.semester = 'Ganjil'
            LEFT JOIN tahun_ajaran ge ON tai.id_tahun_ajaran_induk = ge.id_tahun_ajaran_induk AND ge.semester = 'Genap'
            WHERE tai.id_tahun_ajaran_induk = ?
        `, [id_induk]);

        if (statusCheck.length > 0) {
            const status = statusCheck[0];
            const lockedFields = [];
            const formatDate = (date) => {
                if (!date) return null;
                if (typeof date === 'string') return date.split(' ')[0];
                return date.toISOString().split('T')[0];
            };

            // Cek PTS Ganjil
            if (pts_ganjil !== undefined && status.status_pts_ganjil === 'selesai') {
                if (formatDate(status.pts_ganjil_current) !== sanitizeDate(pts_ganjil)) lockedFields.push('PTS Ganjil');
            }
            // Cek PAS Ganjil
            if (pas_ganjil !== undefined && status.status_pas_ganjil === 'selesai') {
                if (formatDate(status.pas_ganjil_current) !== sanitizeDate(pas_ganjil)) lockedFields.push('PAS Ganjil');
            }
            // Cek PTS Genap
            if (pts_genap !== undefined && status.status_pts_genap === 'selesai') {
                if (formatDate(status.pts_genap_current) !== sanitizeDate(pts_genap)) lockedFields.push('PTS Genap');
            }
            // Cek PAS Genap
            if (pas_genap !== undefined && status.status_pas_genap === 'selesai') {
                if (formatDate(status.pas_genap_current) !== sanitizeDate(pas_genap)) lockedFields.push('PAS Genap');
            }

            if (lockedFields.length > 0) {
                return res.status(403).json({ success: false, message: `Tidak dapat mengubah tanggal ${lockedFields.join(', ')} karena penilaian sudah diarsipkan dan dikunci.` });
            }
        }

        // Ambil data lama untuk perbandingan
        const dataLama = await tahunAjaranModel.getTahunAjaranById(id_induk);
        if (!dataLama) return res.status(404).json({ success: false, message: 'Data tahun ajaran tidak ditemukan.' });

        // Sanitasi data baru
        const dataBaru = {
            pts_ganjil: pts_ganjil !== undefined ? sanitizeDate(pts_ganjil) : undefined,
            pas_ganjil: pas_ganjil !== undefined ? sanitizeDate(pas_ganjil) : undefined,
            pts_genap: pts_genap !== undefined ? sanitizeDate(pts_genap) : undefined,
            pas_genap: pas_genap !== undefined ? sanitizeDate(pas_genap) : undefined
        };

        // Cek apakah ada perubahan
        const hasChanges =
            (pts_ganjil !== undefined && formatDateForCompare(dataLama.pts_ganjil) !== (dataBaru.pts_ganjil || '')) ||
            (pas_ganjil !== undefined && formatDateForCompare(dataLama.pas_ganjil) !== (dataBaru.pas_ganjil || '')) ||
            (pts_genap !== undefined && formatDateForCompare(dataLama.pts_genap) !== (dataBaru.pts_genap || '')) ||
            (pas_genap !== undefined && formatDateForCompare(dataLama.pas_genap) !== (dataBaru.pas_genap || ''));

        if (!hasChanges) return res.status(400).json({ success: false, message: 'Tidak ada perubahan data. Tidak perlu menyimpan.' });

        // Update data
        const success = await tahunAjaranModel.updateTahunAjaran(id_induk, dataBaru);
        if (!success) return res.status(404).json({ success: false, message: 'Gagal memperbarui data tahun ajaran.' });

        res.json({ success: true, message: 'Data tahun ajaran berhasil diperbarui.' });
    } catch (err) {
        console.error('Error update tahun ajaran:', err);
        res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui data tahun ajaran' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. GANTI SEMESTER AKTIF
// ═════════════════════════════════════════════════════════════════════════════

// PUT: Ganti semester aktif (Ganjil ↔ Genap) dengan pencatatan riwayat
const gantiSemester = async (req, res) => {
    try {
        const { id_induk } = req.params;
        const { semester_baru, alasan } = req.body;
        const adminId = req.user?.id;

        console.log('[gantiSemester] START');
        console.log('ID TA:', id_induk);
        console.log('Semester baru:', semester_baru);
        console.log('Alasan:', alasan);
        console.log('Admin ID:', adminId);

        // Validasi: Semester harus valid
        if (!['Ganjil', 'Genap'].includes(semester_baru)) {
            return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });
        }

        // Validasi: Alasan wajib diisi
        if (!alasan || alasan.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Alasan pergantian semester wajib diisi' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Ambil data tahun ajaran induk
            const [cekInduk] = await connection.execute('SELECT id_tahun_ajaran_induk, tahun_ajaran FROM tahun_ajaran_induk WHERE id_tahun_ajaran_induk = ?', [id_induk]);
            if (cekInduk.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Tahun ajaran tidak ditemukan' });
            }

            const tahunAjaran = cekInduk[0].tahun_ajaran;
            const semesterLama = semester_baru === 'Ganjil' ? 'Genap' : 'Ganjil';

            // Cek semester lama ada
            const [idSemesterLama] = await connection.execute('SELECT id_tahun_ajaran FROM tahun_ajaran WHERE id_tahun_ajaran_induk = ? AND semester = ?', [id_induk, semesterLama]);
            if (idSemesterLama.length === 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: `Semester ${semesterLama} tidak ditemukan untuk tahun ajaran ini` });
            }

            const id_ta_lama = idSemesterLama[0].id_tahun_ajaran;

            // Info nilai (untuk response informatif, tidak blocking)
            let infoNilai = { total_siswa: 0, total_kelas: 0, siswa_sudah_input: 0, siswa_belum_lengkap: 0, status_pts: 'nonaktif', status_pas: 'nonaktif' };

            try {
                // Hitung total siswa di tahun ajaran ini
                const [cekSiswa] = await connection.execute('SELECT COUNT(DISTINCT sk.siswa_id) as total_siswa FROM siswa_kelas sk WHERE sk.id_tahun_ajaran_induk = ?', [id_induk]);
                infoNilai.total_siswa = cekSiswa[0]?.total_siswa || 0;

                const [cekKelas] = await connection.execute('SELECT COUNT(DISTINCT sk.kelas_id) as total_kelas FROM siswa_kelas sk WHERE sk.id_tahun_ajaran_induk = ?', [id_induk]);
                infoNilai.total_kelas = cekKelas[0]?.total_kelas || 0;

                // Hitung siswa yang sudah input nilai di semester lama
                const [cekAdaNilai] = await connection.execute('SELECT COUNT(DISTINCT nr.siswa_id) as siswa_sudah_input FROM nilai_rapor nr WHERE nr.tahun_ajaran_id = ?', [id_ta_lama]);
                infoNilai.siswa_sudah_input = cekAdaNilai[0]?.siswa_sudah_input || 0;

                // Hitung siswa yang belum lengkap (kurang PTS atau PAS)
                const [cekBelumLengkap] = await connection.execute(`
                    SELECT COUNT(DISTINCT sk.siswa_id) as siswa_belum_lengkap
                    FROM siswa_kelas sk
                    WHERE sk.id_tahun_ajaran_induk = ?
                    AND (
                        sk.siswa_id NOT IN (SELECT DISTINCT siswa_id FROM nilai_rapor WHERE tahun_ajaran_id = ? AND jenis_penilaian = 'PTS' AND nilai_rapor IS NOT NULL)
                        OR
                        sk.siswa_id NOT IN (SELECT DISTINCT siswa_id FROM nilai_rapor WHERE tahun_ajaran_id = ? AND jenis_penilaian = 'PAS' AND nilai_rapor IS NOT NULL)
                    )
                `, [id_induk, id_ta_lama, id_ta_lama]);
                infoNilai.siswa_belum_lengkap = cekBelumLengkap[0]?.siswa_belum_lengkap || 0;

                // Cek status PTS/PAS di semester lama
                const [cekStatus] = await connection.execute('SELECT status_pts, status_pas FROM tahun_ajaran WHERE id_tahun_ajaran = ?', [id_ta_lama]);
                if (cekStatus.length > 0) {
                    infoNilai.status_pts = cekStatus[0].status_pts;
                    infoNilai.status_pas = cekStatus[0].status_pas;
                }
            } catch (queryErr) {
                console.warn('Warning: Query info nilai error:', queryErr.message);
            }

            // Update: Ganti status semester
            await connection.execute('UPDATE tahun_ajaran SET status = \'nonaktif\' WHERE id_tahun_ajaran_induk = ? AND semester = ?', [id_induk, semesterLama]);
            await connection.execute('UPDATE tahun_ajaran SET status = \'aktif\' WHERE id_tahun_ajaran_induk = ? AND semester = ?', [id_induk, semester_baru]);

            // Riwayat: Catat pergantian semester
            await connection.execute(
                'INSERT INTO riwayat_ganti_semester (tahun_ajaran_induk_id, tahun_ajaran, semester_lama, semester_baru, alasan, admin_id) VALUES (?, ?, ?, ?, ?, ?)',
                [id_induk, tahunAjaran, semesterLama, semester_baru, alasan.trim(), adminId]
            );

            await connection.commit();
            console.log('[gantiSemester] Berhasil ganti semester');

            // Response dengan info lengkap
            const kelengkapan = infoNilai.total_siswa > 0 ? Math.round((infoNilai.siswa_sudah_input / infoNilai.total_siswa) * 100) : 0;

            let catatan = '';
            if (infoNilai.total_siswa === 0) {
                catatan = 'Belum ada siswa di tahun ajaran ini.';
            } else if (infoNilai.siswa_belum_lengkap > 0) {
                catatan = `Masih ada ${infoNilai.siswa_belum_lengkap} siswa dengan nilai belum lengkap di semester ${semesterLama}. Data nilai TIDAK hilang dan dapat dilanjutkan kapan saja.`;
            } else if (infoNilai.siswa_sudah_input > 0) {
                catatan = `Semua nilai di semester ${semesterLama} sudah lengkap (${kelengkapan}%). Data nilai tetap tersimpan.`;
            } else {
                catatan = 'Data nilai sebelumnya masih tersimpan, guru dapat melanjutkan input di semester yang baru.';
            }

            res.json({
                success: true,
                message: `Semester berhasil diganti dari ${semesterLama} ke ${semester_baru}`,
                data: {
                    tahun_ajaran: tahunAjaran, semester_lama: semesterLama, semester_baru: semester_baru,
                    alasan: alasan.trim(), info_nilai: infoNilai, kelengkapan_persen: kelengkapan, catatan: catatan
                }
            });
        } catch (err) {
            await connection.rollback();
            console.error('Error transaction:', err);
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error ganti semester:', err);
        res.status(500).json({ success: false, message: `Gagal mengganti semester: ${err.message}`, error: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
};

module.exports = { getTahunAjaran, getSemesterList, tambahTahunAjaran, updateTahunAjaran, gantiSemester };