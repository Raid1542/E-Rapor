/**
 * Nama File: kokurikulerController.js
 * Fungsi: Mengelola nilai kokurikuler siswa
 * 
 * RULES:
 * - PTS Aktif: Hanya Mutaba'ah yang bisa diinput
 * - PAS Aktif: Semua aspek bisa diinput (termasuk Mutaba'ah)
 * - Judul Proyek: HANYA bisa diatur saat PAS aktif
 */

const db = require('../../config/db');
const kokurikulerModel = require('../../models/guru_kelas/kokurikulerModel');
const proyekModel = require('../../models/guru_kelas/proyekKokurikulerModel');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER: Tentukan jenis penilaian
// ═════════════════════════════════════════════════════════════════════════════
const getJenisPenilaian = (status_pts, status_pas) => {
    if (status_pts === 'aktif') return 'PTS';
    if (status_pas === 'aktif') return 'PAS';
    return null; // Belum aktif
};

// ═════════════════════════════════════════════════════════════════════════════
// ID ASPEK (sesuai database)
// ═════════════════════════════════════════════════════════════════════════════
const ASPEK_ID = {
    BPI: 2,
    PROYEK: 3,
    LITERASI: 4,
    MUTABAAH: 5,
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /kokurikuler
// Mendapatkan data nilai kokurikuler seluruh siswa di kelas
// ✅ SELF-CONTAINED - tidak bergantung middleware
// ═════════════════════════════════════════════════════════════════════════════
exports.getNilaiKokurikuler = async (req, res) => {
    try {
        console.log('🔍 [BACKEND] getNilaiKokurikuler called');
        
        const userId = req.user.id;
        
        // Ambil tahun ajaran aktif
        const taAktif = await kokurikulerModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        console.log('📊 [BACKEND] Tahun ajaran:', taAktif.id_tahun_ajaran);
        
        const semesterId = taAktif.id_tahun_ajaran;
        const semester = taAktif.semester;

        // Ambil kelas
        const kelas_id = await kokurikulerModel.getKelasByGuru(userId, semesterId);

        if (!kelas_id) {
            return res.status(400).json({
                success: false,
                message: 'Kelas tidak ditemukan'
            });
        }

        console.log('📊 [BACKEND] Kelas ID:', kelas_id);

        // Ambil info kelas
        const [kelasInfo] = await db.execute(
            `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
            [kelas_id]
        );
        const kelasNama = kelasInfo[0]?.nama_kelas || 'Kelas Anda';

        // Ambil siswa
        const siswaRows = await kokurikulerModel.getSiswaByKelas(kelas_id, taAktif.id_tahun_ajaran_induk);

        console.log('📊 [BACKEND] Jumlah siswa:', siswaRows.length);

        if (siswaRows.length === 0) {
            return res.json({
                success: true,
                data: [],
                kelas: kelasNama,
                semester: semester,
                tahunAjaranId: semesterId,
                message: 'Tidak ada siswa di kelas ini'
            });
        }

        // Ambil nilai
        const nilaiRows = await kokurikulerModel.getNilaiByKelas(kelas_id, semesterId, semester);
        console.log('📊 [BACKEND] Jumlah nilai:', nilaiRows.length);

        // ✅ AMBIL KONFIGURASI GRADE
        const [gradeConfigRows] = await db.execute(`
            SELECT 
                id_aspek_kokurikuler,
                rentang_min,
                rentang_max,
                grade,
                deskripsi
            FROM kategori_grade_kokurikuler
            WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?
        `, [kelas_id, semesterId, semester]);

        console.log('📊 [BACKEND] Jumlah grade config:', gradeConfigRows.length);

        // Fungsi helper untuk cari grade
        const findGradeByNilai = (aspekId, nilai) => {
            if (nilai === null || nilai === undefined) {
                return { grade: null, deskripsi: null };
            }
            
            const config = gradeConfigRows.find(c => 
                c.id_aspek_kokurikuler === aspekId &&
                nilai >= parseFloat(c.rentang_min) &&
                nilai <= parseFloat(c.rentang_max)
            );
            
            return config 
                ? { grade: config.grade, deskripsi: config.deskripsi }
                : { grade: null, deskripsi: null };
        };

        // Convert nilai menjadi object dengan grade
        const nilaiBySiswa = {};
        nilaiRows.forEach(row => {
            if (!nilaiBySiswa[row.id_siswa]) {
                nilaiBySiswa[row.id_siswa] = {};
            }
            
            // Hitung grade dari konfigurasi
            let grade = row.grade;
            let deskripsi = row.deskripsi;
            
            if ((!grade || !deskripsi) && row.nilai !== null) {
                const calculated = findGradeByNilai(row.id_aspek_kokurikuler, row.nilai);
                grade = calculated.grade;
                deskripsi = calculated.deskripsi;
            }
            
            nilaiBySiswa[row.id_siswa][row.id_aspek_kokurikuler] = {
                nilai: row.nilai,
                grade: grade,
                deskripsi: deskripsi,
                id_judul_proyek: row.id_judul_proyek
            };
        });

        // Format response
        const result = siswaRows.map(siswa => ({
            id: siswa.id_siswa,
            nama: siswa.nama_lengkap,
            nis: siswa.nis,
            nisn: siswa.nisn,
            nilai: nilaiBySiswa[siswa.id_siswa] || {},
        }));

        console.log('✅ [BACKEND] Return data:', result.length, 'siswa');

        res.json({
            success: true,
            data: result,
            kelas: kelasNama,
            semester: semester,
            tahunAjaranId: semesterId
        });
    } catch (error) {
        console.error('❌ [BACKEND ERROR] getNilaiKokurikuler:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /kokurikuler/:siswaId
// ✅ SELF-CONTAINED - tidak bergantung middleware
// ═════════════════════════════════════════════════════════════════════════════
exports.getNilaiKokurikulerBySiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const userId = req.user.id;
        
        // Ambil tahun ajaran aktif
        const taAktif = await kokurikulerModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran aktif belum diatur'
            });
        }

        const semesterId = taAktif.id_tahun_ajaran;
        const semester = taAktif.semester;

        const kelas_id = await kokurikulerModel.getKelasByGuru(userId, semesterId);

        if (!kelas_id) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }

        const rows = await kokurikulerModel.getNilaiBySiswa(siswaId, kelas_id, semesterId, semester);

        res.json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error('Error getNilaiKokurikulerBySiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data kokurikuler.' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// PUT /kokurikuler/:siswaId
// ✅ VALIDASI: PTS → hanya Mutaba'ah, PAS → semua aspek
// ═════════════════════════════════════════════════════════════════════════════
exports.updateNilaiKokurikuler = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { aspek_id, nilai, grade, deskripsi, id_judul_proyek } = req.body;
        
        const userId = req.user.id;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        console.log('🔍 [BACKEND] updateNilaiKokurikuler:', { siswaId, aspek_id, nilai, status_pts, status_pas });

        if (!aspek_id || nilai === undefined) {
            return res.status(400).json({
                success: false,
                message: 'aspek_id dan nilai wajib diisi'
            });
        }

        // ✅ VALIDASI PERIODE
        const jenis_penilaian = getJenisPenilaian(status_pts, status_pas);
        
        if (!jenis_penilaian) {
            return res.status(403).json({
                success: false,
                message: 'Periode penilaian belum aktif. Silakan tunggu admin membuka periode penilaian.'
            });
        }
        
        // ✅ RULE: PTS aktif → HANYA Mutaba'ah
        if (jenis_penilaian === 'PTS') {
            if (aspek_id !== ASPEK_ID.MUTABAAH) {
                return res.status(403).json({
                    success: false,
                    message: 'Saat periode PTS aktif, hanya aspek Mutaba\'ah yang dapat diisi. Aspek lain akan diisi saat periode PAS.'
                });
            }
        }
        
        // ✅ RULE: PAS aktif → semua aspek bisa diisi (termasuk Mutaba'ah)
        // Tidak ada validasi khusus untuk PAS

        const kelas_id = await kokurikulerModel.getKelasByGuru(userId, semesterId);

        if (!kelas_id) {
            return res.status(403).json({ success: false, message: 'Anda belum ditugaskan sebagai wali kelas' });
        }

        // ✅ Hitung grade & deskripsi dari konfigurasi
        let finalGrade = grade;
        let finalDeskripsi = deskripsi;
        
        if ((!finalGrade || !finalDeskripsi) && nilai !== null) {
            const [gradeConfig] = await db.execute(`
                SELECT grade, deskripsi
                FROM kategori_grade_kokurikuler
                WHERE id_aspek_kokurikuler = ? 
                AND kelas_id = ? 
                AND tahun_ajaran_id = ? 
                AND semester = ?
                AND ? >= rentang_min 
                AND ? <= rentang_max
                LIMIT 1
            `, [aspek_id, kelas_id, semesterId, semester, nilai, nilai]);
            
            if (gradeConfig.length > 0) {
                finalGrade = gradeConfig[0].grade;
                finalDeskripsi = gradeConfig[0].deskripsi;
            }
        }

        // Cek apakah data sudah ada
        const existing = await kokurikulerModel.checkExistingNilai(
            siswaId, aspek_id, kelas_id, semesterId, semester, jenis_penilaian
        );

        if (existing) {
            await kokurikulerModel.updateNilai(
                existing.id_nilai_kokurikuler, 
                nilai, 
                finalGrade, 
                finalDeskripsi, 
                id_judul_proyek || null
            );
        } else {
            await kokurikulerModel.insertNilai(
                siswaId, aspek_id, kelas_id, semesterId, semester, 
                jenis_penilaian, nilai, finalGrade, finalDeskripsi, id_judul_proyek || null
            );
        }

        console.log('✅ [BACKEND] Nilai berhasil disimpan');

        res.json({
            success: true,
            message: 'Nilai berhasil disimpan',
            data: {
                id_siswa: parseInt(siswaId),
                aspek_id,
                nilai,
                grade: finalGrade,
                deskripsi: finalDeskripsi
            }
        });
    } catch (err) {
        console.error('❌ Error updateNilaiKokurikuler:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan nilai: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /kokurikuler/judul-proyek
// ✅ SELF-CONTAINED - bisa diakses kapan saja (untuk tampilkan judul)
// ═════════════════════════════════════════════════════════════════════════════
exports.getJudulProyek = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const taAktif = await kokurikulerModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tahun ajaran aktif belum diatur' 
            });
        }

        const kelasId = await kokurikulerModel.getKelasByGuru(userId, taAktif.id_tahun_ajaran);
        
        if (!kelasId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kelas tidak ditemukan' 
            });
        }

        const proyek = await proyekModel.getJudulProyekByKelas(kelasId, taAktif.id_tahun_ajaran);

        res.json({
            success: true,
            data: proyek || { id_judul_proyek: null, judul: '', deskripsi: '' }
        });
    } catch (err) {
        console.error('Error getJudulProyek:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil judul proyek: ' + err.message 
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /kokurikuler/judul-proyek
// ✅ HANYA BISA saat PAS aktif
// ═════════════════════════════════════════════════════════════════════════════
exports.saveJudulProyek = async (req, res) => {
    try {
        const { judul, deskripsi } = req.body;
        const userId = req.user.id;
        
        // ✅ CEK PERIODE: Hanya boleh saat PAS aktif
        const { status_pts, status_pas } = req.penilaianContext || {};
        
        console.log('🔍 [BACKEND] saveJudulProyek:', { status_pts, status_pas });
        
        if (status_pas !== 'aktif') {
            return res.status(403).json({
                success: false,
                message: 'Judul proyek hanya dapat diatur saat periode PAS aktif.'
            });
        }
        
        // ✅ FIX: Ambil kelasId dari getKelasByGuru (bukan req.infoKelasWali)
        const taAktif = await kokurikulerModel.getTahunAjaranAktif();
        if (!taAktif) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tahun ajaran aktif belum diatur' 
            });
        }

        const kelasId = await kokurikulerModel.getKelasByGuru(userId, taAktif.id_tahun_ajaran);
        
        if (!kelasId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kelas tidak ditemukan' 
            });
        }

        // Validasi judul
        if (!judul || typeof judul !== 'string' || judul.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul proyek tidak boleh kosong' 
            });
        }

        if (judul.trim().length > 255) {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul proyek maksimal 255 karakter' 
            });
        }

        const result = await proyekModel.saveJudulProyek(
            kelasId,
            taAktif.id_tahun_ajaran,
            judul.trim(),
            deskripsi?.trim() || null
        );

        console.log('✅ [BACKEND] Judul proyek berhasil disimpan');

        res.json({
            success: true,
            message: result.action === 'created' 
                ? 'Judul proyek berhasil disimpan' 
                : 'Judul proyek berhasil diperbarui',
            data: result
        });
    } catch (err) {
        console.error('Error saveJudulProyek:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                success: false, 
                message: 'Judul proyek sudah ada untuk kelas ini' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menyimpan judul proyek: ' + err.message 
        });
    }
};