/**
 * Nama File: raporController.js
 * Fungsi: Generate rapor DOCX untuk guru kelas (PTS/PAS, Ganjil/Genap)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const path = require('path');
const fs = require('fs');

/**
 * GET /generate-rapor/:siswaId/:jenis/:semester
 * Generate laporan rapor dalam format DOCX
 */
exports.generateRaporPDF = async (req, res) => {
    try {
        const { siswaId, jenis, semester, tahunAjaranId } = req.raporParams || {};
        const userId = req.user.id;

        if (!siswaId || !jenis || !semester) {
            return res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });
        }

        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = tahunAjaranId || req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        // Normalisasi input
        const jenisNorm = jenis.trim().toUpperCase();
        if (!['PTS', 'PAS'].includes(jenisNorm)) {
            return res.status(400).json({ success: false, message: 'Jenis laporan harus PTS atau PAS' });
        }

        const rawSemester = semester.trim();
        let semesterNorm = '';
        if (rawSemester.toLowerCase() === 'ganjil') semesterNorm = 'Ganjil';
        else if (rawSemester.toLowerCase() === 'genap') semesterNorm = 'Genap';
        else return res.status(400).json({ success: false, message: 'Semester harus Ganjil atau Genap' });

        // ── Data Tahun Ajaran ────────────────────────────────────────────────
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
            if (taRows.length === 0) return res.status(400).json({ success: false, message: 'Tahun ajaran tidak ditemukan' });
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
            if (taAktifRows.length === 0) return res.status(400).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan' });
            const taAktif = taAktifRows[0];
            id_tahun_ajaran = taAktif.id_tahun_ajaran;
            tahun_ajaran = taAktif.tahun_ajaran;
            semester_db = taAktif.semester;
            tanggal_pembagian_pts = taAktif.tanggal_pembagian_pts;
            tanggal_pembagian_pas = taAktif.tanggal_pembagian_pas;

            // Validasi akses (non-admin)
            if (req.user.role !== 'admin') {
                if (jenisNorm === 'PTS' && taAktif.status_pts === 'nonaktif') {
                    return res.status(403).json({ success: false, message: 'Rapor PTS belum dibuka oleh admin' });
                }
                if (jenisNorm === 'PAS' && taAktif.status_pas === 'nonaktif') {
                    return res.status(403).json({ success: false, message: 'Rapor PAS belum dibuka oleh admin' });
                }
            }
        }

        if (!id_tahun_ajaran) return res.status(500).json({ success: false, message: 'ID tahun ajaran tidak valid' });

        // Validasi kesesuaian semester
        const normalizedDbSem = (semester_db || '').trim().toLowerCase() === 'ganjil' ? 'Ganjil'
            : (semester_db || '').trim().toLowerCase() === 'genap' ? 'Genap'
                : semester_db;
        if (semesterNorm !== normalizedDbSem) {
            return res.status(400).json({ success: false, message: `Semester tidak sesuai. Data: ${normalizedDbSem}, Request: ${semesterNorm}` });
        }

        // ── Validasi Kelas ───────────────────────────────────────────────────
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas, k.nama_kelas 
             FROM guru_kelas gk 
             JOIN kelas k ON gk.kelas_id = k.id_kelas 
             JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id
             WHERE gk.tahun_ajaran_id = ? AND sk.siswa_id = ? AND sk.id_tahun_ajaran_induk = ?`,
            [semesterId, siswaId, tahunAjaranIndukId]
        );
        if (kelasRows.length === 0) return res.status(403).json({ success: false, message: 'Siswa tidak ditemukan di kelas manapun' });
        const kelas_id = kelasRows[0].id_kelas ?? null;
        const nama_kelas = kelasRows[0].nama_kelas ?? 'Kelas Tidak Diketahui';
        if (!kelas_id) return res.status(500).json({ success: false, message: 'ID kelas tidak valid' });

        // ── Data Siswa ───────────────────────────────────────────────────────
        const [siswaRows] = await db.execute(
            `SELECT s.nama_lengkap, s.nis, s.nisn FROM siswa s 
             JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
             WHERE s.id_siswa = ? AND sk.id_tahun_ajaran_induk = ?`,
            [siswaId, tahunAjaranIndukId]
        );
        if (siswaRows.length === 0) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        const nama_lengkap = siswaRows[0].nama_lengkap ?? 'Nama Siswa';
        const nis = siswaRows[0].nis ?? 'NIS';
        const nisn = siswaRows[0].nisn ?? '–';

        // ── Fase & Guru Kelas ────────────────────────────────────────────────
        const [faseRows] = await db.execute(`SELECT fase FROM kelas WHERE id_kelas = ?`, [kelas_id]);
        const fase = faseRows[0]?.fase || '–';

        const [guruRows] = await db.execute(
            `SELECT u.nama_lengkap FROM user u JOIN guru_kelas gk ON u.id_user = gk.user_id 
             WHERE gk.kelas_id = ? AND gk.tahun_ajaran_id = ? LIMIT 1`,
            [kelas_id, semesterId]
        );
        const namagurukelas = guruRows[0]?.nama_lengkap || 'Nama Guru Kelas';

        // ── Nilai Akademik ───────────────────────────────────────────────────
        const [mapelRows] = await db.execute(`
            SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel, mp.nama_mapel, mp.urutan_rapor, mp.jenis
            FROM mata_pelajaran mp
            WHERE mp.id_mata_pelajaran IN (
                SELECT DISTINCT mapel_id FROM nilai_rapor 
                WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?
            )
            ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC
        `, [siswaId, semesterId, semesterNorm, jenisNorm]);

        const [nilaiRaporRows] = await db.execute(`
            SELECT nr.mapel_id, nr.nilai_rapor, nr.deskripsi FROM nilai_rapor nr
            WHERE nr.siswa_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?
        `, [siswaId, semesterId, semesterNorm, jenisNorm]);

        const nilaiRaporMap = new Map();
        nilaiRaporRows.forEach(row => nilaiRaporMap.set(row.mapel_id, { nilai_rapor: row.nilai_rapor, deskripsi: row.deskripsi }));

        // Fallback: hitung dari nilai_detail jika rapor belum ada
        for (const mp of mapelRows) {
            if (!nilaiRaporMap.has(mp.id_mata_pelajaran)) {
                const [detailRows] = await db.execute(
                    `SELECT nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
                    [siswaId, mp.id_mata_pelajaran, semesterId]
                );
                const nilaiValid = detailRows.map(r => r.nilai).filter(n => n != null && !isNaN(n) && n >= 0);
                if (nilaiValid.length > 0) {
                    nilaiRaporMap.set(mp.id_mata_pelajaran, {
                        nilai_rapor: Math.floor(nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length),
                        deskripsi: '–'
                    });
                } else {
                    nilaiRaporMap.set(mp.id_mata_pelajaran, { nilai_rapor: '-', deskripsi: '-' });
                }
            }
        }

        const semuaMapel = mapelRows.map((mp, index) => {
            const nilai = nilaiRaporMap.get(mp.id_mata_pelajaran) || { nilai_rapor: '-', deskripsi: '-' };
            return {
                no: index + 1,
                nama_mapel: mp.nama_mapel || '–',
                nilai_mapel: typeof nilai.nilai_rapor === 'number' ? Math.floor(nilai.nilai_rapor) : nilai.nilai_rapor,
                deskripsi_mapel: nilai.deskripsi || '–'
            };
        });

        const daftarMapel1 = semuaMapel.slice(0, 7);
        const daftarMapel2 = semuaMapel.slice(7);

        const nilaiList = semuaMapel.map(m => m.nilai_mapel).filter(v => typeof v === 'number' && v >= 0);
        const rataRata = nilaiList.length > 0 ? parseFloat((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length).toFixed(2)) : 0;
        const rataRataDisplay = rataRata.toFixed(2);

        // Deskripsi rata-rata
        const [deskRata] = await db.execute(
            `SELECT deskripsi FROM kategori_deskripsi_rata_rata 
             WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND ? BETWEEN rentang_min AND rentang_max LIMIT 1`,
            [kelas_id, semesterId, semesterNorm, rataRata]
        );
        const ckratarata = deskRata[0]?.deskripsi || '–';

        // ── Kokurikuler ──────────────────────────────────────────────────────
        const [kokurRows] = await db.execute(`
            SELECT nk.id_aspek_kokurikuler, nk.nilai, nk.grade, nk.deskripsi,
                COALESCE(jpt.judul, (SELECT judul FROM judul_proyek_per_tahun_ajaran 
                WHERE id_tahun_ajaran = nk.id_tahun_ajaran AND kelas_id = nk.id_kelas LIMIT 1)) AS nama_judul_proyek
            FROM nilai_kokurikuler nk
            LEFT JOIN judul_proyek_per_tahun_ajaran jpt ON nk.id_judul_proyek = jpt.id_judul_proyek
            WHERE nk.id_siswa = ? AND nk.id_tahun_ajaran = ? AND nk.semester = ? AND nk.jenis_penilaian = ?
        `, [siswaId, semesterId, semesterNorm, jenisNorm]);

        const getAspek = (idAspek) => {
            const row = kokurRows.find(r => r.id_aspek_kokurikuler === idAspek);
            return {
                nilai: row?.nilai ?? 0,
                grade: row?.grade || '–',
                deskripsi: row?.deskripsi || '–',
                namaJudulProyek: row?.nama_judul_proyek || '–'
            };
        };

        const aspekMutabaah = getAspek(5);
        const aspekBPI = getAspek(2);
        const aspekLiterasi = getAspek(4);
        const aspekProyek = getAspek(3);

        const my = aspekMutabaah.nilai, gmy = aspekMutabaah.grade, dmy = aspekMutabaah.deskripsi;
        const bpi = aspekBPI.nilai, gbpi = aspekBPI.grade, dbpi = aspekBPI.deskripsi;
        const li = aspekLiterasi.nilai, gli = aspekLiterasi.grade, dli = aspekLiterasi.deskripsi;
        const proyek = aspekProyek.nilai, gproyek = aspekProyek.grade, dproyek = aspekProyek.deskripsi, namaproyek = aspekProyek.namaJudulProyek;

        // ── Absensi ──────────────────────────────────────────────────────────
        const [abs] = await db.execute(
            `SELECT sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total FROM absensi WHERE siswa_id = ? AND id_tahun_ajaran = ?`,
            [siswaId, semesterId]
        );
        let s, i, a;
        if (jenisNorm === 'PTS') {
            s = abs[0]?.sakit_pts || 0; i = abs[0]?.izin_pts || 0; a = abs[0]?.alpha_pts || 0;
        } else {
            s = abs[0]?.sakit_total || 0; i = abs[0]?.izin_total || 0; a = abs[0]?.alpha_total || 0;
        }

        // ── Ekstrakurikuler ──────────────────────────────────────────────────
        const [ekskulRows] = await db.execute(
            `SELECT e.nama_ekskul, pe.deskripsi FROM peserta_ekstrakurikuler pe 
             JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul 
             WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ? LIMIT 4`,
            [siswaId, semesterId]
        );
        const ekskul1 = ekskulRows[0]?.nama_ekskul || '–', dekskul1 = ekskulRows[0]?.deskripsi || '–';
        const ekskul2 = ekskulRows[1]?.nama_ekskul || '–', dekskul2 = ekskulRows[1]?.deskripsi || '–';
        const ekskul3 = ekskulRows[2]?.nama_ekskul || '–', dekskul3 = ekskulRows[2]?.deskripsi || '–';
        const ekskul4 = ekskulRows[3]?.nama_ekskul || '–', dekskul4 = ekskulRows[3]?.deskripsi || '–';

        // ── Catatan Wali Kelas ───────────────────────────────────────────────
        const [catatan] = await db.execute(
            `SELECT catatan_wali_kelas FROM catatan_wali_kelas 
             WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [siswaId, semesterId, semesterNorm, jenisNorm]
        );
        const cttwalikelas = catatan[0]?.catatan_wali_kelas || '–';

        // ── Format Tanggal ───────────────────────────────────────────────────
        const formatTanggalIndonesia = (dateString) => {
            if (!dateString) return '';
            return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateString));
        };
        const tanggalSah = jenisNorm === 'PTS'
            ? (tanggal_pembagian_pts ? formatTanggalIndonesia(tanggal_pembagian_pts) : '–')
            : (tanggal_pembagian_pas ? formatTanggalIndonesia(tanggal_pembagian_pas) : '–');

        // ── Kenaikan Kelas (PAS Genap) ───────────────────────────────────────
        let tingkat = '–', naikKelas = '–';
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
                naikKelas = `${romawi[tingkatBerikutnya] || tingkatBerikutnya} (${terbilang[tingkatBerikutnya] || tingkatBerikutnya})`;
            } else if (statusNaik === 'tidak') {
                tingkat = 'Tidak Naik';
                naikKelas = '–';
            } else {
                tingkat = 'Belum ditentukan';
                naikKelas = '–';
            }
        }

        // ── Data Template ────────────────────────────────────────────────────
        const data = {
            nama: nama_lengkap, kelas: nama_kelas, nis, nisn, fase,
            semester: semesterNorm === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)',
            ta: tahun_ajaran, namagurukelas,
            tanggalraporpts: tanggalSah, tanggalraporpas: tanggalSah,
            semuaMapel, daftarMapel1, daftarMapel2,
            ratarata: rataRataDisplay, ckratarata,
            my, gmy, dmy, bpi, gbpi, dbpi, li, gli, dli,
            proyek, gproyek, dproyek, namaproyek,
            s, i, a,
            ekskul1, dekskul1, ekskul2, dekskul2, ekskul3, dekskul3, ekskul4, dekskul4,
            cttwalikelas, tingkat, naikkelas: naikKelas,
        };

        // ── Pilih & Generate Template ────────────────────────────────────────
        const templateFile = jenisNorm === 'PTS'
            ? (semesterNorm === 'Ganjil' ? 'template_pts_ganjil.docx' : 'template_pts_genap.docx')
            : (semesterNorm === 'Ganjil' ? 'template_pas_ganjil.docx' : 'template_pas_genap.docx');
        const templatePath = path.join(__dirname, '..', '..', 'templates', 'rapor', templateFile);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ success: false, message: `Template ${templateFile} tidak ditemukan` });
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true, linebreaks: true,
            delimiters: { start: '<<', end: '>>' },
            nullGetter: () => '–'
        });
        doc.render(data);

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        // ── Response ─────────────────────────────────────────────────────────
        const cleanNisn = (nisn || 'NISN').toString().replace(/[^0-9]/g, '');
        const fileName = `rapor_${jenisNorm.toLowerCase()}_${semesterNorm.toLowerCase()}_${cleanNisn}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);

    } catch (error) {
        console.error('Error generate rapor:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat rapor' });
    }
};