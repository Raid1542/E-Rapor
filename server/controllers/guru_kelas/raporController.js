/**
 * Nama File: raporController.js
 * Fungsi: Controller generate rapor DOCX untuk guru kelas (PTS/PAS, Ganjil/Genap)
 *         Menangani generate rapor per siswa dan bulk download dalam format ZIP
 *         Deskripsi rapor dihitung real-time dari konfigurasi_nilai_rapor
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

// Konstanta path template rapor
const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates', 'rapor');

// Konstanta delimiter template
const TEMPLATE_DELIMITERS = { start: '<<', end: '>>' };

// Konstanta kompresi ZIP
const ZIP_COMPRESSION_LEVEL = 9;

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Sanitasi string untuk nama file (ganti "/" dengan "-" dan hapus karakter ilegal)
const sanitizeFileName = (str) => {
    if (!str) return '';
    return str
        .replace(/\//g, '-')
        .replace(/[\\:*?"<>|]/g, '_')
        .trim();
};

// Sanitasi nama untuk file (ganti spasi dengan underscore)
const sanitizeNameForFile = (str) => {
    if (!str) return '';
    return str
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
};

// Format tanggal ke format Indonesia (contoh: 30 Juni 2026)
const formatTanggalIndonesia = (dateString) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(dateString));
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GENERATE RAPOR PER SISWA (DOCX)
// ═════════════════════════════════════════════════════════════════════════════

// Generate laporan rapor dalam format DOCX untuk satu siswa
exports.generateRaporPDF = async (req, res) => {
    try {
        const { siswaId, jenis, semester, tahunAjaranId } = req.raporParams || {};
        const userId = req.user.id;

        // Validasi parameter wajib
        if (!siswaId || !jenis || !semester) {
            return res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = tahunAjaranId || req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        // Normalisasi jenis penilaian
        const jenisNorm = jenis.trim().toUpperCase();
        if (!['PTS', 'PAS'].includes(jenisNorm)) {
            return res.status(400).json({ success: false, message: 'Jenis laporan harus PTS atau PAS' });
        }

        // Normalisasi semester
        const rawSemester = semester.trim();
        let semesterNorm = '';
        if (rawSemester.toLowerCase() === 'ganjil') semesterNorm = 'Ganjil';
        else if (rawSemester.toLowerCase() === 'genap') semesterNorm = 'Genap';
        else return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });

        // Ambil data tahun ajaran
        let id_tahun_ajaran, tahun_ajaran, semester_db, tanggal_pembagian_pts, tanggal_pembagian_pas;

        if (tahunAjaranId) {
            const [taRows] = await db.execute(
                `SELECT ta.id_tahun_ajaran, tai.tahun_ajaran, ta.semester AS semester_db, 
                ta.tanggal_pembagian_pts, ta.tanggal_pembagian_pas
            FROM tahun_ajaran ta
            JOIN tahun_ajaran_induk tai ON ta.id_tahun_ajaran_induk = tai.id_tahun_ajaran_induk
            WHERE ta.id_tahun_ajaran = ?`,
                [tahunAjaranId]
            );
            if (taRows.length === 0) {
                return res.status(400).json({ success: false, message: 'Tahun ajaran tidak ditemukan' });
            }
            const ta = taRows[0];
            id_tahun_ajaran = ta.id_tahun_ajaran;
            tahun_ajaran = ta.tahun_ajaran;
            semester_db = ta.semester_db;
            tanggal_pembagian_pts = ta.tanggal_pembagian_pts;
            tanggal_pembagian_pas = ta.tanggal_pembagian_pas;
        } else {
            const [taAktifRows] = await db.execute(
                `SELECT ta.id_tahun_ajaran, tai.tahun_ajaran, ta.semester,
                ta.tanggal_pembagian_pts, ta.tanggal_pembagian_pas,
                ta.status_pts, ta.status_pas
            FROM tahun_ajaran ta
            JOIN tahun_ajaran_induk tai ON ta.id_tahun_ajaran_induk = tai.id_tahun_ajaran_induk
            WHERE ta.id_tahun_ajaran = ?`,
                [semesterId]
            );
            if (taAktifRows.length === 0) {
                return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
            }
            const taAktif = taAktifRows[0];
            id_tahun_ajaran = taAktif.id_tahun_ajaran;
            tahun_ajaran = taAktif.tahun_ajaran;
            semester_db = taAktif.semester;
            tanggal_pembagian_pts = taAktif.tanggal_pembagian_pts;
            tanggal_pembagian_pas = taAktif.tanggal_pembagian_pas;

            // Validasi akses untuk non-admin
            if (req.user.role !== 'admin') {
                if (jenisNorm === 'PTS' && taAktif.status_pts === 'nonaktif') {
                    return res.status(403).json({ success: false, message: 'Rapor PTS belum dibuka oleh admin' });
                }
                if (jenisNorm === 'PAS' && taAktif.status_pas === 'nonaktif') {
                    return res.status(403).json({ success: false, message: 'Rapor PAS belum dibuka oleh admin' });
                }
            }
        }

        if (!id_tahun_ajaran) {
            return res.status(500).json({ success: false, message: 'ID tahun ajaran tidak valid' });
        }

        // Validasi kesesuaian semester
        const normalizedDbSem =
            (semester_db || '').trim().toLowerCase() === 'ganjil'
                ? 'Ganjil'
                : (semester_db || '').trim().toLowerCase() === 'genap'
                    ? 'Genap'
                    : semester_db;
        if (semesterNorm !== normalizedDbSem) {
            return res.status(400).json({
                success: false,
                message: `Semester tidak sesuai. Data: ${normalizedDbSem}, Request: ${semesterNorm}`,
            });
        }

        // Validasi kelas siswa
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas, k.nama_kelas 
        FROM guru_kelas gk 
        JOIN kelas k ON gk.kelas_id = k.id_kelas 
        JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id
        WHERE gk.tahun_ajaran_id = ? AND sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?`,
            [semesterId, siswaId, tahunAjaranIndukId]
        );
        if (kelasRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Siswa tidak ditemukan di kelas manapun' });
        }
        const kelas_id = kelasRows[0].id_kelas ?? null;
        const nama_kelas = kelasRows[0].nama_kelas ?? 'Kelas Tidak Diketahui';
        if (!kelas_id) {
            return res.status(500).json({ success: false, message: 'ID kelas tidak valid' });
        }

        // Ambil data siswa
        const [siswaRows] = await db.execute(
            `SELECT s.nama_lengkap, s.nis, s.nisn FROM siswa s 
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE s.id_siswa = ? AND sk.id_tahun_ajaran_induk = ?`,
            [siswaId, tahunAjaranIndukId]
        );
        if (siswaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        }
        const nama_lengkap = siswaRows[0].nama_lengkap ?? 'Nama Siswa';
        const nis = siswaRows[0].nis ?? 'NIS';
        const nisn = siswaRows[0].nisn ?? '–';

        // Generate data rapor dari database
        const raporData = await generateRaporData(
            siswaId,
            jenisNorm,
            semesterNorm,
            semesterId,
            kelas_id,
            nama_kelas,
            nama_lengkap,
            nis,
            nisn,
            tahun_ajaran,
            tanggal_pembagian_pts,
            tanggal_pembagian_pas
        );

        // Pilih template berdasarkan jenis dan semester
        const templateFile =
            jenisNorm === 'PTS'
                ? semesterNorm === 'Ganjil'
                    ? 'template_pts_ganjil.docx'
                    : 'template_pts_genap.docx'
                : semesterNorm === 'Ganjil'
                    ? 'template_pas_ganjil.docx'
                    : 'template_pas_genap.docx';
        const templatePath = path.join(TEMPLATE_DIR, templateFile);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ success: false, message: `Template ${templateFile} tidak ditemukan` });
        }

        // Render template dengan data rapor
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: TEMPLATE_DELIMITERS,
            nullGetter: () => '–',
        });
        doc.render(raporData);

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        // Format nama file rapor
        const cleanTahunAjaran = sanitizeFileName(tahun_ajaran || '');
        const cleanNama = sanitizeNameForFile(nama_lengkap);
        const cleanNisn = (nisn || 'NISN').toString().replace(/[^0-9]/g, '');
        const fileName = `Rapor_${jenisNorm}_${semesterNorm}_${cleanTahunAjaran}_${cleanNama}_${cleanNisn}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);
    } catch (error) {
        console.error('Error generate rapor:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat rapor' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. GENERATE SEMUA RAPOR SEKALIGUS (ZIP)
// ═════════════════════════════════════════════════════════════════════════════

// Generate semua rapor siswa dalam satu file ZIP untuk download bulk
exports.generateRaporBulk = async (req, res) => {
    try {
        const { jenis, semester } = req.penilaianContext || {};
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        // Validasi parameter wajib
        if (!jenis || !semester || !tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });
        }

        // Normalisasi jenis penilaian
        const jenisNorm = jenis.trim().toUpperCase();
        if (!['PTS', 'PAS'].includes(jenisNorm)) {
            return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
        }

        const semesterNorm = semester.trim().toLowerCase() === 'ganjil' ? 'Ganjil' : 'Genap';

        // Ambil data tahun ajaran aktif
        const [taRows] = await db.execute(
            `SELECT ta.id_tahun_ajaran, tai.tahun_ajaran, ta.semester,
                ta.tanggal_pembagian_pts, ta.tanggal_pembagian_pas,
                ta.status_pts, ta.status_pas
        FROM tahun_ajaran ta
        JOIN tahun_ajaran_induk tai ON ta.id_tahun_ajaran_induk = tai.id_tahun_ajaran_induk
        WHERE ta.id_tahun_ajaran = ?`,
            [semesterId]
        );

        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
        }

        const taAktif = taRows[0];
        const tahun_ajaran = taAktif.tahun_ajaran;
        const tanggal_pembagian_pts = taAktif.tanggal_pembagian_pts;
        const tanggal_pembagian_pas = taAktif.tanggal_pembagian_pas;

        // Validasi akses untuk non-admin
        if (req.user.role !== 'admin') {
            if (jenisNorm === 'PTS' && taAktif.status_pts === 'nonaktif') {
                return res.status(403).json({ success: false, message: 'Rapor PTS belum dibuka oleh admin' });
            }
            if (jenisNorm === 'PAS' && taAktif.status_pas === 'nonaktif') {
                return res.status(403).json({ success: false, message: 'Rapor PAS belum dibuka oleh admin' });
            }
        }

        // Ambil data kelas guru
        const [kelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas 
        FROM guru_kelas gk 
        JOIN kelas k ON gk.kelas_id = k.id_kelas 
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (kelasRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda belum ditugaskan sebagai wali kelas' });
        }

        const kelasId = kelasRows[0].kelas_id;
        const namaKelas = kelasRows[0].nama_kelas;

        // Ambil semua siswa aktif di kelas
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap, s.nis, s.nisn 
        FROM siswa s 
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
        ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tidak ada siswa di kelas ini' });
        }

        // Format nama file ZIP
        const cleanTahunAjaran = sanitizeFileName(tahun_ajaran || '');
        const cleanKelas = sanitizeFileName(namaKelas || 'Kelas');
        const zipFileName = `Rapor_${jenisNorm}_${semesterNorm}_${cleanTahunAjaran}_${cleanKelas}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        // Buat ZIP archive
        const archive = archiver('zip', {
            zlib: { level: ZIP_COMPRESSION_LEVEL },
        });

        archive.on('error', err => {
            console.error('Error creating ZIP:', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Gagal membuat ZIP' });
            }
        });

        archive.pipe(res);

        // Pilih template berdasarkan jenis dan semester
        const templateFile =
            jenisNorm === 'PTS'
                ? semesterNorm === 'Ganjil'
                    ? 'template_pts_ganjil.docx'
                    : 'template_pts_genap.docx'
                : semesterNorm === 'Ganjil'
                    ? 'template_pas_ganjil.docx'
                    : 'template_pas_genap.docx';
        const templatePath = path.join(TEMPLATE_DIR, templateFile);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ success: false, message: `Template ${templateFile} tidak ditemukan` });
        }

        // Generate rapor untuk setiap siswa
        let successCount = 0;
        let errorCount = 0;

        for (const siswa of siswaRows) {
            try {
                const raporData = await generateRaporData(
                    siswa.id_siswa,
                    jenisNorm,
                    semesterNorm,
                    semesterId,
                    kelasId,
                    namaKelas,
                    siswa.nama_lengkap,
                    siswa.nis,
                    siswa.nisn,
                    tahun_ajaran,
                    tanggal_pembagian_pts,
                    tanggal_pembagian_pas
                );

                const content = fs.readFileSync(templatePath, 'binary');
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: TEMPLATE_DELIMITERS,
                    nullGetter: () => '–',
                });

                doc.render(raporData);
                const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

                // Format nama file DOCX dalam ZIP
                const cleanNisn = (siswa.nisn || String(siswa.id_siswa)).replace(/[^0-9]/g, '');
                const cleanNama = sanitizeNameForFile(siswa.nama_lengkap);
                const studentFileName = `Rapor_${jenisNorm}_${semesterNorm}_${cleanTahunAjaran}_${cleanNama}_${cleanNisn}.docx`;

                archive.append(buf, { name: studentFileName });
                successCount++;
            } catch (err) {
                console.error(`Error generating rapor for student ${siswa.nama_lengkap}:`, err);
                errorCount++;
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Error generateRaporBulk:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Gagal membuat rapor bulk: ' + error.message });
        }
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. HELPER FUNCTION - GENERATE DATA RAPOR
// ═════════════════════════════════════════════════════════════════════════════

// Helper function untuk generate data rapor dari database
async function generateRaporData(
    siswaId,
    jenisNorm,
    semesterNorm,
    semesterId,
    kelasId,
    nama_kelas,
    nama_lengkap,
    nis,
    nisn,
    tahun_ajaran,
    tanggal_pembagian_pts,
    tanggal_pembagian_pas
) {
    // Ambil fase dan nama guru kelas
    const [faseRows] = await db.execute(`SELECT fase FROM kelas WHERE id_kelas = ?`, [kelasId]);
    const fase = faseRows[0]?.fase || '–';

    const [guruRows] = await db.execute(
        `SELECT u.nama_lengkap FROM user u JOIN guru_kelas gk ON u.id_user = gk.user_id 
        WHERE gk.kelas_id = ? AND gk.tahun_ajaran_id = ? LIMIT 1`,
        [kelasId, semesterId]
    );
    const namagurukelas = guruRows[0]?.nama_lengkap || 'Nama Guru Kelas';

    // Ambil daftar mata pelajaran yang memiliki nilai rapor
    const [mapelRows] = await db.execute(
        `SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.urutan_rapor, mp.jenis
        FROM mata_pelajaran mp
        WHERE mp.id_mata_pelajaran IN (
            SELECT DISTINCT mapel_id FROM nilai_rapor 
            WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?
        )
        ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC`,
        [siswaId, semesterId, semesterNorm, jenisNorm]
    );

    // Ambil nilai rapor siswa
    const [nilaiRaporRows] = await db.execute(
        `SELECT nr.mapel_id, nr.nilai_rapor FROM nilai_rapor nr
        WHERE nr.siswa_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?`,
        [siswaId, semesterId, semesterNorm, jenisNorm]
    );

    // Ambil konfigurasi kategori real-time berdasarkan jenis penilaian
    const [kategoriRows] = await db.execute(
        `SELECT knr.mapel_id, knr.min_nilai, knr.max_nilai, knr.deskripsi, knr.kelas_id
        FROM konfigurasi_nilai_rapor knr
        WHERE knr.tahun_ajaran_id = ? 
        AND knr.jenis_penilaian = ? 
        AND knr.is_active = 1
        AND (knr.kelas_id IS NULL OR knr.kelas_id = ?)
        ORDER BY knr.mapel_id, 
                CASE WHEN knr.kelas_id = ? THEN 0 ELSE 1 END, 
                knr.min_nilai DESC`,
        [semesterId, jenisNorm, kelasId, kelasId]
    );

    // Helper untuk hitung deskripsi otomatis dari konfigurasi
    const getDeskripsiOtomatis = (mapelId, nilai) => {
        if (nilai === null || nilai === undefined) return '–';

        const configMapel = kategoriRows.filter(k => k.mapel_id === mapelId);

        for (const config of configMapel) {
            if (nilai >= config.min_nilai && nilai <= config.max_nilai) {
                return config.deskripsi;
            }
        }
        return '–';
    };

    // Build map dengan deskripsi yang dihitung real-time
    const nilaiRaporMap = new Map();
    nilaiRaporRows.forEach(row => {
        nilaiRaporMap.set(row.mapel_id, {
            nilai_rapor: row.nilai_rapor,
            deskripsi: getDeskripsiOtomatis(row.mapel_id, row.nilai_rapor),
        });
    });

    // Fallback: hitung dari nilai_detail jika rapor belum ada
    for (const mp of mapelRows) {
        if (!nilaiRaporMap.has(mp.id_mata_pelajaran)) {
            const [detailRows] = await db.execute(
                `SELECT nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                [siswaId, mp.id_mata_pelajaran, semesterId]
            );
            const nilaiValid = detailRows
                .map(r => r.nilai)
                .filter(n => n != null && !isNaN(n) && n >= 0);
            if (nilaiValid.length > 0) {
                const nilaiRata = Math.floor(
                    nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length
                );
                nilaiRaporMap.set(mp.id_mata_pelajaran, {
                    nilai_rapor: nilaiRata,
                    deskripsi: getDeskripsiOtomatis(mp.id_mata_pelajaran, nilaiRata),
                });
            } else {
                nilaiRaporMap.set(mp.id_mata_pelajaran, { nilai_rapor: '-', deskripsi: '-' });
            }
        }
    }

    // Build data semua mapel untuk template
    const semuaMapel = mapelRows.map((mp, index) => {
        const nilai = nilaiRaporMap.get(mp.id_mata_pelajaran) || { nilai_rapor: '-', deskripsi: '-' };
        return {
            no: index + 1,
            nama_mapel: mp.nama_mapel || '–',
            nilai_mapel:
                typeof nilai.nilai_rapor === 'number' ? Math.floor(nilai.nilai_rapor) : nilai.nilai_rapor,
            deskripsi_mapel: nilai.deskripsi || '–',
        };
    });

    // Split mapel untuk template (7 mapel per halaman)
    const daftarMapel1 = semuaMapel.slice(0, 7);
    const daftarMapel2 = semuaMapel.slice(7);

    // Hitung rata-rata nilai akademik
    const nilaiList = semuaMapel
        .map(m => m.nilai_mapel)
        .filter(v => typeof v === 'number' && v >= 0);
    const rataRata =
        nilaiList.length > 0
            ? parseFloat((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length).toFixed(2))
            : 0;
    const rataRataDisplay = rataRata.toFixed(2);

    // Ambil deskripsi rata-rata dari konfigurasi
    const [deskRata] = await db.execute(
        `SELECT deskripsi FROM kategori_deskripsi_rata_rata 
        WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND ? BETWEEN rentang_min AND rentang_max LIMIT 1`,
        [kelasId, semesterId, semesterNorm, rataRata]
    );
    const ckratarata = deskRata[0]?.deskripsi || '–';

    // Ambil data kokurikuler siswa
    const [kokurRows] = await db.execute(
        `SELECT nk.id_aspek_kokurikuler, nk.nilai, nk.grade, nk.deskripsi,
        COALESCE(jpt.judul, (SELECT judul FROM judul_proyek_per_tahun_ajaran 
        WHERE id_tahun_ajaran = nk.id_tahun_ajaran AND kelas_id = nk.id_kelas LIMIT 1)) AS nama_judul_proyek
        FROM nilai_kokurikuler nk
        LEFT JOIN judul_proyek_per_tahun_ajaran jpt ON nk.id_judul_proyek = jpt.id_judul_proyek
        WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?`,
        [siswaId, semesterId, semesterNorm, jenisNorm]
    );

    // Helper untuk ambil data aspek kokurikuler
    const getAspek = idAspek => {
        const row = kokurRows.find(r => r.id_aspek_kokurikuler === idAspek);
        return {
            nilai: row?.nilai ?? 0,
            grade: row?.grade || '–',
            deskripsi: row?.deskripsi || '–',
            namaJudulProyek: row?.nama_judul_proyek || '–',
        };
    };

    // Data aspek kokurikuler (ID: 5=Mutaba'ah, 2=BPI, 4=Literasi, 3=Proyek)
    const aspekMutabaah = getAspek(5);
    const aspekBPI = getAspek(2);
    const aspekLiterasi = getAspek(4);
    const aspekProyek = getAspek(3);

    const my = aspekMutabaah.nilai,
        gmy = aspekMutabaah.grade,
        dmy = aspekMutabaah.deskripsi;
    const bpi = aspekBPI.nilai,
        gbpi = aspekBPI.grade,
        dbpi = aspekBPI.deskripsi;
    const li = aspekLiterasi.nilai,
        gli = aspekLiterasi.grade,
        dli = aspekLiterasi.deskripsi;
    const proyek = aspekProyek.nilai,
        gproyek = aspekProyek.grade,
        dproyek = aspekProyek.deskripsi,
        namaproyek = aspekProyek.namaJudulProyek;

    // Ambil data absensi siswa
    const [abs] = await db.execute(
        `SELECT sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?`,
        [siswaId, semesterId]
    );
    let s, i, a;
    if (jenisNorm === 'PTS') {
        s = abs[0]?.sakit_pts || 0;
        i = abs[0]?.izin_pts || 0;
        a = abs[0]?.alpha_pts || 0;
    } else {
        s = abs[0]?.sakit_total || 0;
        i = abs[0]?.izin_total || 0;
        a = abs[0]?.alpha_total || 0;
    }

    // Ambil data ekstrakurikuler siswa (maksimal 4 ekskul)
    const [ekskulRows] = await db.execute(
        `SELECT e.nama_ekskul, pe.deskripsi FROM peserta_ekstrakurikuler pe 
        JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul 
        WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ? LIMIT 4`,
        [siswaId, semesterId]
    );
    const ekskul1 = ekskulRows[0]?.nama_ekskul || '–',
        dekskul1 = ekskulRows[0]?.deskripsi || '–';
    const ekskul2 = ekskulRows[1]?.nama_ekskul || '–',
        dekskul2 = ekskulRows[1]?.deskripsi || '–';
    const ekskul3 = ekskulRows[2]?.nama_ekskul || '–',
        dekskul3 = ekskulRows[2]?.deskripsi || '–';
    const ekskul4 = ekskulRows[3]?.nama_ekskul || '–',
        dekskul4 = ekskulRows[3]?.deskripsi || '–';

    // Ambil catatan wali kelas
    const [catatan] = await db.execute(
        `SELECT catatan_wali_kelas FROM catatan_wali_kelas 
         WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
        [siswaId, semesterId, semesterNorm, jenisNorm]
    );
    const cttwalikelas = catatan[0]?.catatan_wali_kelas || '–';

    // Format tanggal pembagian rapor
    const tanggalSah =
        jenisNorm === 'PTS'
            ? tanggal_pembagian_pts
                ? formatTanggalIndonesia(tanggal_pembagian_pts)
                : '–'
            : tanggal_pembagian_pas
                ? formatTanggalIndonesia(tanggal_pembagian_pas)
                : '–';

    // Hitung status kenaikan kelas (khusus PAS Genap)
    let tingkat = '–',
        naikKelas = '–';
    if (jenisNorm === 'PAS' && semesterNorm === 'Genap') {
        const [naikRows] = await db.execute(
            `SELECT naik_tingkat FROM catatan_wali_kelas 
        WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = 'Genap' AND jenis_penilaian = 'PAS'`,
            [siswaId, semesterId]
        );
        const statusNaik = naikRows[0]?.naik_tingkat;
        if (statusNaik === 'ya') {
            const kelasAngka = parseInt(nama_kelas.match(/\d+/)?.[0] || '1');
            const tingkatBerikutnya = kelasAngka + 1;
            const romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
            const terbilang = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam'];
            tingkat = 'Naik';
            naikKelas = `${romawi[tingkatBerikutnya] || tingkatBerikutnya} (${terbilang[tingkatBerikutnya] || tingkatBerikutnya
                })`;
        } else if (statusNaik === 'tidak') {
            tingkat = 'Tidak Naik';
            naikKelas = '–';
        } else {
            tingkat = 'Belum ditentukan';
            naikKelas = '–';
        }
    }

    // Return data untuk template rapor
    return {
        nama: nama_lengkap,
        kelas: nama_kelas,
        nis,
        nisn,
        fase,
        semester: semesterNorm === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)',
        ta: tahun_ajaran,
        namagurukelas,
        tanggalraporpts: tanggalSah,
        tanggalraporpas: tanggalSah,
        semuaMapel,
        daftarMapel1,
        daftarMapel2,
        ratarata: rataRataDisplay,
        ckratarata,
        my,
        gmy,
        dmy,
        bpi,
        gbpi,
        dbpi,
        li,
        gli,
        dli,
        proyek,
        gproyek,
        dproyek,
        namaproyek,
        s,
        i,
        a,
        ekskul1,
        dekskul1,
        ekskul2,
        dekskul2,
        ekskul3,
        dekskul3,
        ekskul4,
        dekskul4,
        cttwalikelas,
        tingkat,
        naikkelas: naikKelas,
    };
}