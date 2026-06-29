/**
 * Nama File: rekapanController.js
 * Fungsi: Rekapan nilai guru kelas (view + export Excel)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');
const ExcelJS = require('exceljs');

/** GET /rekapan-nilai - Rekapan nilai sesuai periode aktif (PTS/PAS) */
exports.getRekapanNilai = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;

        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({ success: false, message: 'Anda belum mengampu kelas' });
        }
        const kelasId = infoKelas.kelas_id;

        // Ambil mapel (pakai semesterId)
        const [mapelRows] = await db.execute(
            `SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel 
                FROM mata_pelajaran mp 
                INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id 
                WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ? 
                ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.id_mata_pelajaran ASC`,
            [kelasId, semesterId]
        );

        const mapelList = mapelRows.map(row => row.kode_mapel);
        const mapelIdToKode = new Map(mapelRows.map(row => [row.id_mata_pelajaran, row.kode_mapel]));

        // Ambil siswa (pakai id_induk)
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
                FROM siswa s 
                INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
                WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
                ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.json({ success: true, jenis_penilaian: jenisAktif, siswa: [], mapel_list: mapelList });
        }

        // Ambil nilai (pakai semesterId)
        let nilaiRows = [];
        if (jenisAktif) {
            const [rows] = await db.execute(
                `SELECT nr.siswa_id, nr.mapel_id, nr.nilai_rapor
                    FROM nilai_rapor nr 
                    WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?`,
                [kelasId, semesterId, semester, jenisAktif]
            );
            nilaiRows = rows;
        }

        // Ambil konfigurasi deskripsi (hanya PTS)
        let deskripsiConfigRows = [];
        if (jenisAktif === 'PTS') {
            const [rows] = await db.execute(
                `SELECT rentang_min, rentang_max, deskripsi 
                    FROM kategori_deskripsi_rata_rata 
                    WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
                [kelasId, semesterId, semester]
            );
            deskripsiConfigRows = rows;
        }

        // Build data siswa
        const siswaMap = new Map();
        siswaRows.forEach(siswa => {
            siswaMap.set(siswa.id_siswa, {
                id_siswa: siswa.id_siswa, nama: siswa.nama, nis: siswa.nis,
                nilai_mapel: {}, total: 0, count: 0,
            });
        });

        siswaMap.forEach((siswa) => {
            mapelList.forEach(kodeMapel => { siswa.nilai_mapel[kodeMapel] = null; });
        });

        nilaiRows.forEach(row => {
            const siswa = siswaMap.get(row.siswa_id);
            if (siswa) {
                const kode = mapelIdToKode.get(row.mapel_id);
                if (kode) {
                    siswa.nilai_mapel[kode] = row.nilai_rapor;
                    if (row.nilai_rapor != null) {
                        siswa.total += parseFloat(row.nilai_rapor);
                        siswa.count++;
                    }
                }
            }
        });

        const siswaArray = Array.from(siswaMap.values());
        siswaArray.forEach(siswa => {
            siswa.rata_rata = siswa.count > 0 ? parseFloat((siswa.total / siswa.count).toFixed(2)) : null;
        });

        const sorted = siswaArray.filter(s => s.rata_rata != null).sort((a, b) => b.rata_rata - a.rata_rata);
        sorted.forEach((siswa, idx) => { siswa.ranking = idx + 1; });
        siswaArray.forEach(siswa => { if (siswa.rata_rata == null) siswa.ranking = null; });

        const getDeskripsiRataRata = (nilai) => {
            if (jenisAktif !== 'PTS' || nilai == null) return null;
            const nilaiBulat = Math.floor(nilai);
            for (const config of deskripsiConfigRows) {
                if (nilaiBulat >= config.rentang_min && nilaiBulat <= config.rentang_max) return config.deskripsi;
            }
            return null;
        };

        const siswaList = siswaArray.map(siswa => ({
            id_siswa: siswa.id_siswa, nama: siswa.nama, nis: siswa.nis,
            nilai_mapel: siswa.nilai_mapel, rata_rata: siswa.rata_rata,
            deskripsi: getDeskripsiRataRata(siswa.rata_rata), ranking: siswa.ranking,
        }));

        res.json({ success: true, jenis_penilaian: jenisAktif, siswa: siswaList, mapel_list: mapelList });
    } catch (error) {
        console.error('Error getRekapanNilai:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat rekapan: ' + error.message });
    }
};

/** GET /rekapan-nilai/export-excel - Export rekapan ke Excel */
exports.exportRekapanNilaiExcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran tidak ditemukan');
        }

        const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : 'PTS';

        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) throw new Error('Kelas tidak ditemukan');
        const kelasId = infoKelas.kelas_id;

        // Ambil siswa (pakai id_induk)
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
                FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
                WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        // Ambil mapel (pakai semesterId)
        const [mapelRows] = await db.execute(
            `SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel 
                FROM mata_pelajaran mp INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id 
                WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
                ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC`,
            [kelasId, semesterId]
        );

        const mapelList = mapelRows.map(m => m.kode_mapel);
        const mapelIdToKode = new Map(mapelRows.map(row => [row.id_mata_pelajaran, row.kode_mapel]));

        // Ambil nilai (pakai semesterId)
        let nilaiRows = [];
        if (jenisAktif) {
            const [rows] = await db.execute(
                `SELECT nr.siswa_id, mp.kode_mapel, nr.nilai_rapor
                    FROM nilai_rapor nr INNER JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran
                    WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?`,
                [kelasId, semesterId, semester, jenisAktif]
            );
            nilaiRows = rows;
        }

        // Ambil konfigurasi deskripsi (pakai semesterId)
        let deskripsiConfigRows = [];
        if (jenisAktif === 'PTS') {
            const [rows] = await db.execute(
                `SELECT rentang_min, rentang_max, deskripsi 
                    FROM kategori_deskripsi_rata_rata 
                    WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?`,
                [kelasId, semesterId, semester]
            );
            deskripsiConfigRows = rows;
        }

        // Build data
        const siswaMap = new Map();
        siswaRows.forEach(siswa => {
            siswaMap.set(siswa.id_siswa, {
                id_siswa: siswa.id_siswa, nama: siswa.nama, nis: siswa.nis,
                nilai_mapel: {}, total: 0, count: 0,
            });
        });

        siswaMap.forEach((siswa) => {
            mapelList.forEach(kodeMapel => { siswa.nilai_mapel[kodeMapel] = null; });
        });

        nilaiRows.forEach(row => {
            const siswa = siswaMap.get(row.siswa_id);
            if (siswa) {
                siswa.nilai_mapel[row.kode_mapel] = row.nilai_rapor;
                if (row.nilai_rapor != null) {
                    siswa.total += parseFloat(row.nilai_rapor);
                    siswa.count++;
                }
            }
        });

        const siswaArray = Array.from(siswaMap.values());
        siswaArray.forEach(siswa => {
            siswa.rata_rata = siswa.count > 0 ? siswa.total / siswa.count : null;
        });

        const sorted = siswaArray.filter(s => s.rata_rata != null).sort((a, b) => b.rata_rata - a.rata_rata);
        sorted.forEach((siswa, idx) => { siswa.ranking = idx + 1; });
        siswaArray.forEach(siswa => { if (siswa.rata_rata == null) siswa.ranking = null; });

        const getDeskripsiRataRata = (nilai) => {
            if (jenisAktif !== 'PTS' || nilai == null) return null;
            const nilaiBulat = Math.floor(nilai);
            for (const config of deskripsiConfigRows) {
                if (nilaiBulat >= config.rentang_min && nilaiBulat <= config.rentang_max) return config.deskripsi;
            }
            return null;
        };

        // Generate Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Rekapan Nilai ${jenisAktif}`);

        const headerRow = jenisAktif === 'PTS'
            ? ['No', 'Nama', 'NIS', ...mapelList, 'Rata-rata', 'Deskripsi', 'Ranking']
            : ['No', 'Nama', 'NIS', ...mapelList, 'Rata-rata', 'Ranking'];
        
        const row1 = worksheet.addRow(headerRow);
        row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8690A' } };
        row1.alignment = { horizontal: 'center', vertical: 'middle' };
        row1.height = 25;

        const infoRow = worksheet.addRow([`Periode: ${jenisAktif} - Semester ${semester}`]);
        infoRow.font = { bold: true, italic: true, color: { argb: 'FF7A3A0A' } };
        infoRow.alignment = { horizontal: 'left' };
        worksheet.mergeCells(infoRow.number, 1, infoRow.number, headerRow.length);

        const siswaSorted = [...siswaArray].sort((a, b) => {
            if (a.ranking === null && b.ranking === null) return 0;
            if (a.ranking === null) return 1;
            if (b.ranking === null) return -1;
            return a.ranking - b.ranking;
        });

        siswaSorted.forEach((siswa, idx) => {
            const nilaiCols = mapelList.map(kodeMapel => {
                const nilai = siswa.nilai_mapel[kodeMapel];
                return nilai != null ? Math.floor(nilai) : '-';
            });
            
            const rowData = jenisAktif === 'PTS'
                ? [siswa.ranking || '-', siswa.nama, siswa.nis, ...nilaiCols, 
                    siswa.rata_rata != null ? siswa.rata_rata.toFixed(2) : '-', 
                    getDeskripsiRataRata(siswa.rata_rata) || '-', 
                    siswa.ranking != null ? siswa.ranking : '-']
                : [siswa.ranking || '-', siswa.nama, siswa.nis, ...nilaiCols, 
                    siswa.rata_rata != null ? siswa.rata_rata.toFixed(2) : '-', 
                    siswa.ranking != null ? siswa.ranking : '-'];
            
            const dataRow = worksheet.addRow(rowData);
            if (idx % 2 === 1) {
                dataRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
                });
            }
        });

        worksheet.columns.forEach((col, idx) => {
            if (idx === 0) col.width = 8;
            else if (idx === 1) col.width = 25;
            else if (idx === 2) col.width = 12;
            else if (jenisAktif === 'PTS' && idx === headerRow.length - 2) col.width = 12;
            else if (jenisAktif === 'PTS' && idx === headerRow.length - 1) col.width = 25;
            else if (jenisAktif === 'PTS' && idx === headerRow.length) col.width = 10;
            else if (jenisAktif === 'PAS' && idx === headerRow.length - 2) col.width = 12;
            else if (jenisAktif === 'PAS' && idx === headerRow.length - 1) col.width = 10;
            else col.width = 10;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=rekapan_nilai_${jenisAktif}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exportRekapanNilaiExcel:', err);
        res.status(500).json({ success: false, message: 'Gagal export Excel: ' + err.message });
    }
};