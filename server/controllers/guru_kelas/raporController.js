/**
 * Nama File: raporController.js
 * Fungsi: Controller untuk generate rapor (DOCX)
 */

const db = require('../../config/db');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

/**
 * GET /generate-rapor/:siswaId/:jenis/:semester
 * GET /generate-rapor/:siswaId/:jenis/:semester/:tahunAjaranId
 * Generate laporan rapor dalam format DOCX
 */
exports.generateRaporPDF = async (req, res) => {
    try {
        const { siswaId, jenis, semester, tahunAjaranId } = req.raporParams || {};
        const userId = req.user.id;

        if (!siswaId || !jenis || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Parameter tidak lengkap'
            });
        }

        // Ambil ID dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        // Gunakan ID Semester dari params (jika ada) atau dari middleware (aktif)
        const semesterId = tahunAjaranId || req.idSemesterAktif;
        const { semester: activeSemester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran tidak ditemukan'
            });
        }

        // Normalisasi jenis laporan
        const jenisNorm = jenis.trim().toUpperCase();
        if (!['PTS', 'PAS'].includes(jenisNorm)) {
            return res.status(400).json({
                success: false,
                message: 'Jenis laporan harus PTS atau PAS'
            });
        }

        // Normalisasi semester
        const rawSemester = semester.trim();
        let semesterNorm = '';
        if (rawSemester.toLowerCase() === 'ganjil') semesterNorm = 'Ganjil';
        else if (rawSemester.toLowerCase() === 'genap') semesterNorm = 'Genap';
        else return res.status(400).json({
            success: false,
            message: 'Semester harus Ganjil atau Genap'
        });

        // Ambil data tahun ajaran dari DB
        let id_tahun_ajaran, tahun_ajaran, semester_db, tanggal_pembagian_pts, tanggal_pembagian_pas;
        if (tahunAjaranId) {
            const [taRows] = await db.execute(
                `SELECT id_tahun_ajaran, tahun_ajaran, semester AS semester_db, 
                tanggal_pembagian_pts, tanggal_pembagian_pas
         FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
                [tahunAjaranId]
            );
            if (taRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tahun ajaran tidak ditemukan'
                });
            }
            const ta = taRows[0];
            id_tahun_ajaran = ta.id_tahun_ajaran;
            tahun_ajaran = ta.tahun_ajaran;
            semester_db = ta.semester_db;
            tanggal_pembagian_pts = ta.tanggal_pembagian_pts;
            tanggal_pembagian_pas = ta.tanggal_pembagian_pas;
        } else {
            // Fallback ke data aktif
            id_tahun_ajaran = semesterId;
            tahun_ajaran = req.tahunAjaranDisplay || 'Tahun Ajaran Tidak Diketahui';
            semester_db = semesterNorm;
            tanggal_pembagian_pts = req.tanggalPembagianPts;
            tanggal_pembagian_pas = req.tanggalPembagianPas;

            if (req.user.role !== 'admin') {
                if (jenisNorm === 'PTS' && status_pts !== 'aktif') {
                    return res.status(403).json({
                        success: false,
                        message: status_pts === 'nonaktif' ? 'Rapor PTS belum dibuka' : 'Rapor PTS sudah dikunci'
                    });
                }
                if (jenisNorm === 'PAS' && status_pas !== 'aktif') {
                    return res.status(403).json({
                        success: false,
                        message: status_pas === 'nonaktif' ? 'Rapor PAS belum dibuka' : 'Rapor PAS sudah dikunci'
                    });
                }
            }
        }

        if (id_tahun_ajaran === null) {
            return res.status(500).json({
                success: false,
                message: 'ID tahun ajaran tidak valid'
            });
        }

        // Validasi kesesuaian semester
        const rawDbSem = (semester_db || '').trim();
        let normalizedDbSem = rawDbSem.toLowerCase() === 'ganjil' ? 'Ganjil'
            : rawDbSem.toLowerCase() === 'genap' ? 'Genap'
                : rawDbSem;
        if (semesterNorm !== normalizedDbSem) {
            return res.status(400).json({
                success: false,
                message: `Semester tidak sesuai. Data: ${normalizedDbSem}, Request: ${semesterNorm}`
            });
        }

        // QUERY JADWAL & VALIDASI KELAS (PAKAI ID INDUK)
        let kelasRows = [];
        if (req.user.role === 'admin') {
            [kelasRows] = await db.execute(
                `SELECT k.id_kelas, k.nama_kelas 
         FROM kelas k 
         JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
         WHERE sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?`,
                [siswaId, tahunAjaranIndukId]
            );
        } else {
            [kelasRows] = await db.execute(
                `SELECT k.id_kelas, k.nama_kelas 
         FROM guru_kelas gk 
         JOIN kelas k ON gk.kelas_id = k.id_kelas 
         JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
         WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ? 
           AND sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?`,
                [userId, tahunAjaranIndukId, siswaId, tahunAjaranIndukId]
            );
        }

        if (kelasRows.length === 0) {
            return res.status(403).json({
                success: false,
                message: req.user.role === 'admin' ? 'Siswa tidak ditemukan' : 'Siswa tidak di kelas Anda'
            });
        }
        const kelasRow = kelasRows[0];
        const kelas_id = kelasRow.id_kelas ?? null;
        const nama_kelas = kelasRow.nama_kelas ?? 'Kelas Tidak Diketahui';
        if (kelas_id === null) {
            return res.status(500).json({
                success: false,
                message: 'ID kelas tidak valid'
            });
        }

        // QUERY DATA SISWA (PAKAI ID INDUK)
        const [siswaRows] = await db.execute(
            `SELECT s.nama_lengkap, s.nis, s.nisn 
       FROM siswa s 
       JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
       WHERE s.id_siswa = ? AND sk.id_tahun_ajaran_induk = ?`,
            [siswaId, tahunAjaranIndukId]
        );
        if (siswaRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }
        const siswa = siswaRows[0];
        const nama_lengkap = siswa.nama_lengkap ?? 'Nama Siswa';
        const nis = siswa.nis ?? 'NIS';
        const nisn = siswa.nisn ?? '–';

        const [faseRows] = await db.execute(
            `SELECT fase FROM kelas WHERE nama_kelas = ?`,
            [nama_kelas]
        );
        const fase = faseRows[0]?.fase || '–';

        let namagurukelas = 'Nama Guru Kelas';
        if (req.user.role === 'admin') {
            const [guruRows] = await db.execute(
                `SELECT u.nama_lengkap 
         FROM user u 
         JOIN guru_kelas gk ON u.id_user = gk.user_id 
         WHERE gk.kelas_id = ? AND gk.id_tahun_ajaran_induk = ? 
         LIMIT 1`,
                [kelas_id, tahunAjaranIndukId]
            );
            namagurukelas = guruRows[0]?.nama_lengkap || 'Nama Guru Kelas';
        } else {
            const [guruRows] = await db.execute(
                `SELECT u.nama_lengkap FROM user u WHERE u.id_user = ?`,
                [userId]
            );
            namagurukelas = guruRows[0]?.nama_lengkap || 'Nama Guru Kelas';
        }

        // QUERY NILAI AKADEMIK (PAKAI ID SEMESTER)
        const [mapelRows] = await db.execute(`
      SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, 
             mp.urutan_rapor, mp.jenis
      FROM mata_pelajaran mp
      WHERE mp.id_mata_pelajaran IN (
        SELECT DISTINCT mapel_id FROM nilai_rapor 
        WHERE siswa_id = ? AND id_tahun_ajaran_induk = ? 
          AND semester = ? AND jenis_penilaian = ?
      )
      ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC`,
            [siswaId, semesterId, semesterNorm, jenisNorm]
        );

        const [nilaiRaporRows] = await db.execute(`
      SELECT nr.mapel_id, nr.nilai_rapor, nr.deskripsi 
      FROM nilai_rapor nr 
      WHERE nr.siswa_id = ? AND nr.id_tahun_ajaran_induk = ? 
        AND nr.semester = ? AND nr.jenis_penilaian = ?`,
            [siswaId, semesterId, semesterNorm, jenisNorm]
        );

        const nilaiRaporMap = new Map();
        nilaiRaporRows.forEach(row =>
            nilaiRaporMap.set(row.mapel_id, {
                nilai_rapor: row.nilai_rapor,
                deskripsi: row.deskripsi
            })
        );

        for (const mp of mapelRows) {
            const mapelId = mp.id_mata_pelajaran;
            if (!nilaiRaporMap.has(mapelId)) {
                const [detailRows] = await db.execute(
                    `SELECT nilai FROM nilai_detail 
           WHERE siswa_id = ? AND mapel_id = ? AND id_tahun_ajaran_induk = ?`,
                    [siswaId, mapelId, semesterId]
                );
                const nilaiValid = detailRows
                    .map(r => r.nilai)
                    .filter(n => n != null && !isNaN(n) && n >= 0);
                if (nilaiValid.length > 0) {
                    const rataRata = Math.floor(
                        nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length
                    );
                    nilaiRaporMap.set(mapelId, { nilai_rapor: rataRata, deskripsi: '–' });
                } else {
                    nilaiRaporMap.set(mapelId, { nilai_rapor: '-', deskripsi: '-' });
                }
            }
        }

        const semuaMapel = mapelRows.map((mp, index) => {
            const nilai = nilaiRaporMap.get(mp.id_mata_pelajaran) || { nilai_rapor: '-', deskripsi: '-' };
            const nilaiAkhir = typeof nilai.nilai_rapor === 'number'
                ? Math.floor(nilai.nilai_rapor)
                : nilai.nilai_rapor;
            return {
                no: index + 1,
                nama_mapel: mp.nama_mapel || '–',
                nilai_mapel: nilaiAkhir,
                deskripsi_mapel: nilai.deskripsi || '–'
            };
        });

        const daftarMapel1 = semuaMapel.slice(0, 7);
        const daftarMapel2 = semuaMapel.slice(7);

        const nilaiList = semuaMapel
            .map(m => m.nilai_mapel)
            .filter(v => typeof v === 'number' && v >= 0);
        const rataRata = nilaiList.length > 0
            ? parseFloat((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length).toFixed(2))
            : 0;
        const [deskRata] = await db.execute(
            `SELECT deskripsi FROM konfigurasi_nilai_rapor 
       WHERE mapel_id IS NULL AND ? BETWEEN min_nilai AND max_nilai`,
            [rataRata]
        );
        const ckratarata = deskRata[0]?.deskripsi || '–';

        // QUERY KOKURIKULER (PAKAI ID SEMESTER)
        const [kokur] = await db.execute(`
      SELECT nk.nilai_mutabaah, nk.grade_mutabaah, nk.deskripsi_mutabaah, 
             nk.nilai_bpi, nk.grade_bpi, nk.deskripsi_bpi, 
             nk.nilai_literasi, nk.grade_literasi, nk.deskripsi_literasi, 
             nk.nilai_proyek, nk.grade_proyek, nk.deskripsi_proyek, 
             jpt.judul AS nama_judul_proyek 
      FROM nilai_kokurikuler nk 
      LEFT JOIN judul_proyek_per_tahun_ajaran jpt 
        ON nk.id_judul_proyek = jpt.id_judul_proyek
      WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran_induk = ? 
        AND nk.semester = ? AND nk.jenis_penilaian = ?`,
            [siswaId, semesterId, semesterNorm, jenisNorm]
        );
        const getKokurValue = (arr, key, fallback = '–') => arr[0]?.[key] ?? fallback;
        const my = getKokurValue(kokur, 'nilai_mutabaah', 0);
        const gmy = getKokurValue(kokur, 'grade_mutabaah', '–');
        const dmy = getKokurValue(kokur, 'deskripsi_mutabaah', '–');
        const bpi = getKokurValue(kokur, 'nilai_bpi', 0);
        const gbpi = getKokurValue(kokur, 'grade_bpi', '–');
        const dbpi = getKokurValue(kokur, 'deskripsi_bpi', '–');
        const li = getKokurValue(kokur, 'nilai_literasi', 0);
        const gli = getKokurValue(kokur, 'grade_literasi', '–');
        const dli = getKokurValue(kokur, 'deskripsi_literasi', '–');
        const proyek = getKokurValue(kokur, 'nilai_proyek', 0);
        const gproyek = getKokurValue(kokur, 'grade_proyek', '–');
        const dproyek = getKokurValue(kokur, 'deskripsi_proyek', '–');
        const namaproyek = getKokurValue(kokur, 'nama_judul_proyek', '–');

        // QUERY ABSENSI (PAKAI ID SEMESTER)
        const [abs] = await db.execute(
            `SELECT sakit, izin, alpha FROM absensi 
       WHERE siswa_id = ? AND id_tahun_ajaran_induk = ? 
         AND semester = ? AND jenis_penilaian = ?`,
            [siswaId, semesterId, semesterNorm, jenisNorm]
        );
        const s = abs[0]?.sakit || 0;
        const i = abs[0]?.izin || 0;
        const a = abs[0]?.alpha || 0;

        // QUERY EKSKUL (PAKAI ID SEMESTER)
        const [ekskulRows] = await db.execute(
            `SELECT e.nama_ekskul, pe.deskripsi 
       FROM peserta_ekstrakurikuler pe 
       JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul 
       WHERE pe.siswa_id = ? AND pe.id_tahun_ajaran_induk = ? 
       LIMIT 4`,
            [siswaId, semesterId]
        );
        const ekskul1 = ekskulRows[0]?.nama_ekskul || '–';
        const dekskul1 = ekskulRows[0]?.deskripsi || '–';
        const ekskul2 = ekskulRows[1]?.nama_ekskul || '–';
        const dekskul2 = ekskulRows[1]?.deskripsi || '–';
        const ekskul3 = ekskulRows[2]?.nama_ekskul || '–';
        const dekskul3 = ekskulRows[2]?.deskripsi || '–';
        const ekskul4 = ekskulRows[3]?.nama_ekskul || '–';
        const dekskul4 = ekskulRows[3]?.deskripsi || '–';

        // QUERY CATATAN WALI (PAKAI ID SEMESTER)
        const [catatan] = await db.execute(
            `SELECT catatan_wali_kelas FROM catatan_wali_kelas 
        WHERE siswa_id = ? AND id_tahun_ajaran_induk = ? 
            AND semester = ? AND jenis_penilaian = ?`,
            [siswaId, semesterId, semesterNorm, jenisNorm]
        );
        const cttwalikelas = catatan[0]?.catatan_wali_kelas || '–';

        const formatTanggalIndonesia = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            }).format(date);
        };
        const tanggalSah = jenisNorm === 'PTS'
            ? (tanggal_pembagian_pts ? formatTanggalIndonesia(tanggal_pembagian_pts) : formatTanggalIndonesia(new Date()))
            : (tanggal_pembagian_pas ? formatTanggalIndonesia(tanggal_pembagian_pas) : formatTanggalIndonesia(new Date()));

        let tingkat = '–', naikKelas = '–';
        if (jenisNorm === 'PAS' && semesterNorm === 'Genap') {
            const [naikRows] = await db.execute(
                `SELECT naik_tingkat FROM catatan_wali_kelas 
            WHERE siswa_id = ? AND id_tahun_ajaran_induk = ? 
            AND semester = 'Genap' AND jenis_penilaian = 'PAS'`,
                [siswaId, semesterId]
            );
            const statusNaik = naikRows[0]?.naik_tingkat;
            if (statusNaik === 'ya') {
                const kelasAngka = parseInt(nama_kelas.match(/\d+/)?.[0] || '1');
                const tingkatBerikutnya = kelasAngka + 1;
                const romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
                const terbilang = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam'];
                tingkat = 'Naik';
                naikKelas = `${romawi[tingkatBerikutnya] || tingkatBerikutnya} (${terbilang[tingkatBerikutnya] || tingkatBerikutnya})`;
            } else if (statusNaik === 'tidak') {
                tingkat = 'Tidak Naik';
                naikKelas = '–';
            } else {
                tingkat = 'Belum ditentukan';
                naikKelas = '–';
            }
        }

        const data = {
            nama: nama_lengkap, kelas: nama_kelas, nis: nis, nisn: nisn, fase: fase,
            semester: semesterNorm === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)',
            ta: tahun_ajaran,
            namagurukelas: namagurukelas,
            tanggalraporpts: tanggalSah, tanggalraporpas: tanggalSah,
            semuaMapel, daftarMapel1, daftarMapel2,
            ratarata: rataRata, ckratarata,
            my, gmy, dmy, bpi, gbpi, dbpi, li, gli, dli,
            proyek, gproyek, dproyek, namaproyek,
            s, i, a,
            ekskul1, dekskul1, ekskul2, dekskul2, ekskul3, dekskul3, ekskul4, dekskul4,
            cttwalikelas, tingkat, naikkelas: naikKelas,
        };

        const templateFile = jenisNorm === 'PTS'
            ? (semesterNorm === 'Ganjil' ? 'template_pts_ganjil.docx' : 'template_pts_genap.docx')
            : (semesterNorm === 'Ganjil' ? 'template_pas_ganjil.docx' : 'template_pas_genap.docx');
        const templatePath = path.join(__dirname, '..', 'templates', 'rapor', templateFile);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                success: false,
                message: `Template ${templateFile} tidak ditemukan`
            });
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '<<', end: '>>' },
            nullGetter: () => '–'
        });
        doc.render(data);
        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        const fileName = `rapor_${jenisNorm.toLowerCase()}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);
    } catch (error) {
        console.error('Error generate rapor:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat rapor' });
    }
};

module.exports = exports;