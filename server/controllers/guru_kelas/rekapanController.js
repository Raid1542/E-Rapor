/**
 * Nama File: rekapanController.js
 * Fungsi: Mengelola rekapan nilai untuk guru kelas
 * UPDATE: 
 *   - PTS aktif: nilai + rata-rata + ranking + deskripsi
 *   - PAS aktif: nilai + rata-rata + ranking (TANPA deskripsi)
 *   - FIX: Gunakan rentang_min dan rentang_max (bukan min_nilai/max_nilai)
 */

const db = require('../../config/db');
const ExcelJS = require('exceljs');

/**
 * GET /rekapan-nilai
 * Mendapatkan rekapan nilai sesuai periode aktif (PTS/PAS)
 */
exports.getRekapanNilai = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data tahun ajaran atau semester tidak ditemukan' 
            });
        }

        // ✅ Tentukan jenis penilaian aktif
        const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;

        // Ambil kelas guru
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas 
             FROM kelas k 
             INNER JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (kelasRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Anda belum mengampu kelas di tahun ajaran ini' 
            });
        }

        const kelasId = kelasRows[0].id_kelas;

        // Ambil daftar mapel
        const [mapelRows] = await db.execute(
            `SELECT DISTINCT mp.id_mata_pelajaran, mp.kode_mapel 
             FROM mata_pelajaran mp 
             INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id 
             WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ? 
             ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC, mp.id_mata_pelajaran ASC`,
            [kelasId, tahunAjaranIndukId]
        );

        const mapelList = mapelRows.map(row => row.kode_mapel);
        const mapelIdToKode = new Map(mapelRows.map(row => [row.id_mata_pelajaran, row.kode_mapel]));

        // Ambil daftar siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
             FROM siswa s 
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
             ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        if (siswaRows.length === 0) {
            return res.json({ 
                success: true, 
                jenis_penilaian: jenisAktif,
                siswa: [], 
                mapel_list: mapelList 
            });
        }

        // ✅ QUERY: Ambil nilai sesuai jenis penilaian aktif
        let nilaiRows = [];
        if (jenisAktif) {
            const [rows] = await db.execute(
                `SELECT nr.siswa_id, nr.mapel_id, nr.nilai_rapor
                 FROM nilai_rapor nr 
                 WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?
                 AND nr.jenis_penilaian = ?`,
                [kelasId, semesterId, semester, jenisAktif]
            );
            nilaiRows = rows;
        }

        // ✅ QUERY: Ambil konfigurasi deskripsi rata-rata (HANYA untuk PTS)
        // ✅ FIX: Gunakan rentang_min dan rentang_max (bukan min_nilai/max_nilai)
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
                id_siswa: siswa.id_siswa,
                nama: siswa.nama,
                nis: siswa.nis,
                nilai_mapel: {},
                total: 0,
                count: 0,
            });
        });

        // Initialize nilai_mapel untuk semua mapel
        siswaMap.forEach((siswa) => {
            mapelList.forEach(kodeMapel => {
                siswa.nilai_mapel[kodeMapel] = null;
            });
        });

        // Isi nilai dari database
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

        // Hitung rata-rata
        const siswaArray = Array.from(siswaMap.values());
        
        siswaArray.forEach(siswa => {
            siswa.rata_rata = siswa.count > 0 
                ? parseFloat((siswa.total / siswa.count).toFixed(2))
                : null;
        });

        // Hitung ranking
        const sorted = siswaArray
            .filter(s => s.rata_rata != null)
            .sort((a, b) => b.rata_rata - a.rata_rata);
        sorted.forEach((siswa, idx) => {
            siswa.ranking = idx + 1;
        });
        siswaArray.forEach(siswa => {
            if (siswa.rata_rata == null) siswa.ranking = null;
        });

        // ✅ Fungsi helper untuk ambil deskripsi rata-rata (HANYA untuk PTS)
        const getDeskripsiRataRata = (nilai) => {
            if (jenisAktif !== 'PTS') return null; // ✅ PAS tidak pakai deskripsi
            if (nilai == null) return null;
            
            const nilaiBulat = Math.floor(nilai);
            
            for (const config of deskripsiConfigRows) {
                // ✅ FIX: Gunakan rentang_min dan rentang_max
                if (nilaiBulat >= config.rentang_min && nilaiBulat <= config.rentang_max) {
                    return config.deskripsi;
                }
            }
            return null;
        };

        // Format response
        const siswaList = siswaArray.map(siswa => ({
            id_siswa: siswa.id_siswa,
            nama: siswa.nama,
            nis: siswa.nis,
            nilai_mapel: siswa.nilai_mapel,
            rata_rata: siswa.rata_rata,
            deskripsi: getDeskripsiRataRata(siswa.rata_rata), // ✅ null jika PAS
            ranking: siswa.ranking,
        }));

        res.json({ 
            success: true, 
            jenis_penilaian: jenisAktif,
            siswa: siswaList, 
            mapel_list: mapelList 
        });

    } catch (error) {
        console.error('Error di getRekapanNilai:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memuat rekapan nilai: ' + error.message 
        });
    }
};

/**
 * GET /rekapan-nilai/export-excel
 * Mengekspor rekapan nilai sesuai periode aktif
 */
exports.exportRekapanNilaiExcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, status_pts, status_pas } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            throw new Error('Data tahun ajaran atau semester tidak ditemukan');
        }

        // ✅ Tentukan jenis penilaian aktif
        const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : 'PTS';

        // Ambil kelas
        const [kelasRows] = await db.execute(
            `SELECT k.id_kelas 
             FROM kelas k 
             JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
             WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (kelasRows.length === 0) {
            throw new Error('Kelas tidak ditemukan');
        }

        const kelasId = kelasRows[0].id_kelas;

        // Ambil siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis 
             FROM siswa s 
             JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? 
             ORDER BY s.nama_lengkap`,
            [kelasId, tahunAjaranIndukId]
        );

        // Ambil mapel
        const [mapelRows] = await db.execute(
            `SELECT DISTINCT mp.kode_mapel 
             FROM mata_pelajaran mp 
             INNER JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mapel_id 
             WHERE p.kelas_id = ? AND p.tahun_ajaran_id = ?
             ORDER BY mp.urutan_rapor IS NULL, mp.urutan_rapor ASC`,
            [kelasId, tahunAjaranIndukId]
        );

        const mapelList = mapelRows.map(m => m.kode_mapel);
        const mapelIdToKode = new Map(mapelRows.map(row => [row.id_mata_pelajaran, row.kode_mapel]));

        // ✅ QUERY: Ambil nilai sesuai jenis aktif
        let nilaiRows = [];
        if (jenisAktif) {
            const [rows] = await db.execute(
                `SELECT nr.siswa_id, mp.kode_mapel, nr.nilai_rapor
                 FROM nilai_rapor nr
                 INNER JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran
                 WHERE nr.kelas_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?
                 AND nr.jenis_penilaian = ?`,
                [kelasId, semesterId, semester, jenisAktif]
            );
            nilaiRows = rows;
        }

        // ✅ QUERY: Ambil konfigurasi deskripsi (HANYA untuk PTS)
        // ✅ FIX: Gunakan rentang_min dan rentang_max
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
                id_siswa: siswa.id_siswa,
                nama: siswa.nama,
                nis: siswa.nis,
                nilai_mapel: {},
                total: 0,
                count: 0,
            });
        });

        siswaMap.forEach((siswa) => {
            mapelList.forEach(kodeMapel => {
                siswa.nilai_mapel[kodeMapel] = null;
            });
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

        // ✅ Fungsi helper untuk ambil deskripsi (HANYA untuk PTS)
        const getDeskripsiRataRata = (nilai) => {
            if (jenisAktif !== 'PTS') return null; // ✅ PAS tidak pakai deskripsi
            if (nilai == null) return null;
            
            const nilaiBulat = Math.floor(nilai);
            
            for (const config of deskripsiConfigRows) {
                // ✅ FIX: Gunakan rentang_min dan rentang_max
                if (nilaiBulat >= config.rentang_min && nilaiBulat <= config.rentang_max) {
                    return config.deskripsi;
                }
            }
            return null;
        };

        // Generate Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Rekapan Nilai ${jenisAktif}`);

        // ✅ Header: berbeda untuk PTS dan PAS
        let headerRow;
        if (jenisAktif === 'PTS') {
            // PTS: No, Nama, NIS, [Mapel...], Rata-rata, Deskripsi, Ranking
            headerRow = ['No', 'Nama', 'NIS', ...mapelList, 'Rata-rata', 'Deskripsi', 'Ranking'];
        } else {
            // PAS: No, Nama, NIS, [Mapel...], Rata-rata, Ranking (TANPA Deskripsi)
            headerRow = ['No', 'Nama', 'NIS', ...mapelList, 'Rata-rata', 'Ranking'];
        }
        
        const row1 = worksheet.addRow(headerRow);
        
        row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8690A' } };
        row1.alignment = { horizontal: 'center', vertical: 'middle' };
        row1.height = 25;

        // Info periode
        const infoRow = worksheet.addRow([`Periode: ${jenisAktif} - Semester ${semester}`]);
        infoRow.font = { bold: true, italic: true, color: { argb: 'FF7A3A0A' } };
        infoRow.alignment = { horizontal: 'left' };
        worksheet.mergeCells(infoRow.number, 1, infoRow.number, headerRow.length);

        // Data rows - urutkan berdasarkan ranking
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
            
            let rowData;
            if (jenisAktif === 'PTS') {
                // PTS: dengan deskripsi
                rowData = [
                    siswa.ranking || '-',
                    siswa.nama,
                    siswa.nis,
                    ...nilaiCols,
                    siswa.rata_rata != null ? siswa.rata_rata.toFixed(2) : '-',
                    getDeskripsiRataRata(siswa.rata_rata) || '-',
                    siswa.ranking != null ? siswa.ranking : '-'
                ];
            } else {
                // PAS: tanpa deskripsi
                rowData = [
                    siswa.ranking || '-',
                    siswa.nama,
                    siswa.nis,
                    ...nilaiCols,
                    siswa.rata_rata != null ? siswa.rata_rata.toFixed(2) : '-',
                    siswa.ranking != null ? siswa.ranking : '-'
                ];
            }
            
            const dataRow = worksheet.addRow(rowData);
            
            // Warna selang-seling
            if (idx % 2 === 1) {
                dataRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
                });
            }
        });

        // Set column widths
        worksheet.columns.forEach((col, idx) => {
            if (idx === 0) col.width = 8; // No/Ranking
            else if (idx === 1) col.width = 25; // Nama
            else if (idx === 2) col.width = 12; // NIS
            else if (jenisAktif === 'PTS' && idx === headerRow.length - 2) col.width = 12; // Rata-rata (PTS)
            else if (jenisAktif === 'PTS' && idx === headerRow.length - 1) col.width = 25; // Deskripsi (PTS)
            else if (jenisAktif === 'PTS' && idx === headerRow.length) col.width = 10; // Ranking (PTS)
            else if (jenisAktif === 'PAS' && idx === headerRow.length - 2) col.width = 12; // Rata-rata (PAS)
            else if (jenisAktif === 'PAS' && idx === headerRow.length - 1) col.width = 10; // Ranking (PAS)
            else col.width = 10; // Mapel
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=rekapan_nilai_${jenisAktif}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Error exportRekapanNilaiExcel:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal mengekspor file Excel: ' + err.message 
        });
    }
};