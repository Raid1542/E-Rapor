/**
 * Nama File: rekapanController.js
 * Fungsi: Controller untuk rekapan nilai dan export Excel
 */

const db = require('../../config/db');
const ExcelJS = require('exceljs');

/**
 * GET /rekapan-nilai
 * Ambil rekapan nilai seluruh siswa di kelas
 */
exports.getRekapanNilai = async (req, res) => {
    try {
        const userId = req.user.id;

        // Ambil ID dari middleware
        const tahunAjaranIndukId = req.idTahunAjaranInduk;  // Untuk jadwal: guru_kelas, siswa_kelas, pembelajaran
        const semesterId = req.idSemesterAktif;              // Untuk nilai: nilai_rapor, konfigurasi
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Data tahun ajaran atau semester tidak ditemukan'
            });
        }

        const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : 'PAS';

        // Query jadwal pakai ID INDUK
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas FROM kelas k 
       INNER JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
       WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (kelasRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anda belum mengampu kelas di tahun ajaran ini'
            });
        }
        const kelasId = kelasRows[0].id_kelas;

        // Query mapel & siswa pakai ID INDUK
        const [mapelRows] = await db.execute(
            `SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel 
       FROM mata_pelajaran mp 
       INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id 
       WHERE p.kelas_id = ? AND p.id_tahun_ajaran_induk = ? 
       ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.id_mata_pelajaran ASC`,
            [kelasId, tahunAjaranIndukId]
        );
        const mapelList = mapelRows.map(row => row.kode_mapel);
        const mapelIdToKode = new Map(mapelRows.map(row => [row.id_mata_pelajaran, row.kode_mapel]));

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
       FROM siswa s 
       INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
       WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
       ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.json({ success: true, siswa: [], mapel_list: mapelList });
        }

        // Query nilai & config pakai ID SEMESTER
        const [nilaiRows] = await db.execute(
            `SELECT nr.siswa_id, nr.mapel_id, nr.nilai_rapor AS nilai 
       FROM nilai_rapor nr 
       WHERE nr.kelas_id = ? AND nr.id_tahun_ajaran_induk = ? AND nr.semester = ? AND nr.jenis_penilaian = ?`,
            [kelasId, semesterId, semester, jenisAktif]
        );

        const nilaiMap = {};
        siswaRows.forEach(s => {
            nilaiMap[s.id_siswa] = {};
            mapelList.forEach(kode => { nilaiMap[s.id_siswa][kode] = null; });
        });
        nilaiRows.forEach(row => {
            const kode = mapelIdToKode.get(row.mapel_id);
            if (kode && nilaiMap[row.siswa_id]) nilaiMap[row.siswa_id][kode] = row.nilai;
        });

        const [configRataRata] = await db.execute(
            `SELECT min_nilai, max_nilai, deskripsi 
       FROM konfigurasi_nilai_rapor 
       WHERE mapel_id IS NULL AND id_tahun_ajaran_induk = ? 
       ORDER BY min_nilai DESC`,
            [semesterId]
        );

        const getDeskripsiRataRata = (nilai, configList) => {
            if (nilai == null || nilai < 0) return 'Belum ada deskripsi';
            for (const c of configList) {
                if (nilai >= c.min_nilai && nilai <= c.max_nilai) return c.deskripsi;
            }
            return 'Belum ada deskripsi';
        };

        const siswa = siswaRows.map(s => {
            const nilaiMapel = nilaiMap[s.id_siswa] || {};
            const nilaiValid = Object.values(nilaiMapel).filter(v => v !== null);
            const rataRata = nilaiValid.length > 0
                ? Math.floor((nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length) * 100) / 100
                : null;
            const rataRataBulat = rataRata !== null ? Math.floor(rataRata) : null;
            const deskripsiRataRata = rataRataBulat !== null
                ? getDeskripsiRataRata(rataRataBulat, configRataRata)
                : 'Belum ada deskripsi';
            return {
                id_siswa: s.id_siswa,
                nama: s.nama,
                nis: s.nis,
                nilai_mapel: nilaiMapel,
                rata_rata: rataRata,
                deskripsi_rata_rata: deskripsiRataRata,
                ranking: null
            };
        });

        siswa.filter(s => s.rata_rata !== null)
            .sort((a, b) => b.rata_rata - a.rata_rata)
            .forEach((s, idx) => { s.ranking = idx + 1; });
        siswa.forEach(s => { if (s.rata_rata === null) s.ranking = null; });

        res.json({ success: true, siswa, mapel_list: mapelList });
    } catch (error) {
        console.error('Error di getRekapanNilai:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat rekapan nilai' });
    }
};

/**
 * GET /rekapan-nilai/export-excel
 * Export rekapan nilai ke Excel
 */
exports.exportRekapanNilaiExcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran atau semester tidak ditemukan');
        }

        // Jadwal & siswa pakai ID INDUK
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas FROM kelas k 
       JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
       WHERE gk.user_id = ? AND gk.id_tahun_ajaran_induk = ?`,
            [userId, tahunAjaranIndukId]
        );

        if (kelasRows.length === 0) throw new Error('Kelas tidak ditemukan');
        const kelasId = kelasRows[0].id_kelas;

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
       FROM siswa s 
       JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
       WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
       ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        // Nilai pakai ID SEMESTER
        const [nilaiRows] = await db.execute(
            `SELECT nr.siswa_id, mp.kode_mapel, nr.nilai_rapor AS nilai 
       FROM nilai_rapor nr 
       JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran 
       WHERE nr.kelas_id = ? AND nr.id_tahun_ajaran_induk = ? AND nr.semester = ?`,
            [kelasId, semesterId, semester]
        );

        const kodeMapelSet = new Set();
        nilaiRows.forEach(row => kodeMapelSet.add(row.kode_mapel));
        const mapelList = Array.from(kodeMapelSet);

        const nilaiMap = {};
        nilaiRows.forEach(row => {
            if (!nilaiMap[row.siswa_id]) nilaiMap[row.siswa_id] = {};
            nilaiMap[row.siswa_id][row.kode_mapel] = row.nilai;
        });

        const siswa = siswaRows.map(s => {
            const nilaiMapel = {};
            mapelList.forEach(kode => {
                nilaiMapel[kode] = nilaiMap[s.id_siswa]?.[kode] || null;
            });
            const nilaiArray = Object.values(nilaiMapel).filter(v => v !== null);
            const rataRata = nilaiArray.length > 0
                ? parseFloat((nilaiArray.reduce((a, b) => a + b, 0) / nilaiArray.length).toFixed(2))
                : null;
            return {
                id_siswa: s.id_siswa,
                nama: s.nama,
                nis: s.nis,
                nilai_mapel: nilaiMapel,
                rata_rata: rataRata
            };
        });

        siswa.filter(s => s.rata_rata !== null)
            .sort((a, b) => b.rata_rata - a.rata_rata)
            .forEach((s, i) => { s.ranking = i + 1; });
        siswa.forEach(s => { if (s.rata_rata === null) s.ranking = null; });

        // Generate Excel dengan ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekapan Nilai');

        const headerRow = ['No', 'Nama', 'NIS', ...mapelList, 'Rata-rata', 'Ranking'];
        worksheet.addRow(headerRow);

        // Gaya header
        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Urutkan siswa berdasarkan ranking
        const siswaSortedByRanking = [...siswa].sort((a, b) => {
            if (a.ranking === null && b.ranking === null) return 0;
            if (a.ranking === null) return 1;
            if (b.ranking === null) return -1;
            return a.ranking - b.ranking;
        });

        siswaSortedByRanking.forEach((s, idx) => {
            const nilaiCols = mapelList.map(kode => {
                const val = s.nilai_mapel[kode];
                return val !== null ? Math.floor(val) : '-';
            });
            worksheet.addRow([
                idx + 1,
                s.nama,
                s.nis,
                ...nilaiCols,
                s.rata_rata !== null ? Math.floor(s.rata_rata) : '-',
                s.ranking ? `${s.ranking}` : '-',
            ]);
        });

        worksheet.columns.forEach(col => (col.width = 12));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=rekapan_nilai_kelas.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exportRekapanNilaiExcel:', err);
        res.status(500).json({ message: 'Gagal mengekspor file Excel' });
    }
};

module.exports = exports;