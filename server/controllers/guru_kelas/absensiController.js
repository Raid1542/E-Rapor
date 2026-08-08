/**
 * Nama File: absensiController.js
 * Fungsi: Controller absensi siswa guru kelas (PTS/PAS) + import Excel.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const absensiModel = require('../../models/guru_kelas/absensiModel');
const db = require('../../config/db');
const ExcelJS = require('exceljs');

// Konstanta untuk batas maksimal absensi
const MAX_ABSEN = 90;

// Konstanta untuk threshold similarity nama
const SIMILARITY_THRESHOLD = 0.7;

/**
 * Hitung kesamaan string menggunakan Levenshtein Distance.
 */
const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLen;
};

/**
 * GET /absensi - Ambil data absensi siswa di kelas.
 */
exports.getAbsensiSiswa = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jenis, semester } = req.penilaianContext || {};

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
        }

        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({ success: false, message: 'Data kelas tidak ditemukan. Silakan hubungi admin.' });
        }

        const kelasId = infoKelas.kelas_id;
        const namaKelas = infoKelas.nama_kelas;
        const tahunAjaranId = req.idSemesterAktif;
        const indukId = req.idTahunAjaranInduk;

        if (!tahunAjaranId || !kelasId || !indukId) {
            return res.status(500).json({ success: false, message: 'Data tahun ajaran atau kelas tidak valid' });
        }

        const absensiList = await absensiModel.getAbsensiByKelas(kelasId, tahunAjaranId, indukId);

        const formattedData = absensiList.map(row => {
            if (jenis === 'PTS') {
                return {
                    id_siswa: row.id_siswa,
                    nama: row.nama_lengkap,
                    nis: row.nis || '',
                    nisn: row.nisn || '',
                    sakit: row.sakit_pts,
                    izin: row.izin_pts,
                    alpha: row.alpha_pts,
                    sudah_diinput: row.sudah_diinput === 1
                };
            } else {
                return {
                    id_siswa: row.id_siswa,
                    nama: row.nama_lengkap,
                    nis: row.nis || '',
                    nisn: row.nisn || '',
                    sakit: row.sakit_total,
                    izin: row.izin_total,
                    alpha: row.alpha_total,
                    sudah_diinput: row.sudah_diinput === 1,
                    pts_sakit: row.sakit_pts,
                    pts_izin: row.izin_pts,
                    pts_alpha: row.alpha_pts
                };
            }
        });

        res.json({
            success: true,
            data: {
                kelas_id: kelasId,
                kelas: namaKelas,
                jenis_penilaian: jenis,
                semester,
                absensi: formattedData,
                total: formattedData.length
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data absensi: ' + err.message
        });
    }
};

/**
 * POST /absensi - Simpan atau update data absensi siswa.
 */
exports.upsertAbsensi = async (req, res) => {
    try {
        const userId = req.user?.id;
        const jenis = req.body.jenis?.toUpperCase() || req.penilaianContext?.jenis;
        const { siswa_id, sakit, izin, alpha } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
        }
        if (!jenis || !['PTS', 'PAS'].includes(jenis)) {
            return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
        }
        if (!siswa_id) {
            return res.status(400).json({ success: false, message: 'ID siswa wajib diisi' });
        }

        const nilaiSakit = parseInt(sakit) || 0;
        const nilaiIzin = parseInt(izin) || 0;
        const nilaiAlpha = parseInt(alpha) || 0;

        if (nilaiSakit < 0 || nilaiIzin < 0 || nilaiAlpha < 0) {
            return res.status(400).json({ success: false, message: 'Nilai absensi tidak boleh negatif' });
        }

        if (nilaiSakit > MAX_ABSEN || nilaiIzin > MAX_ABSEN || nilaiAlpha > MAX_ABSEN) {
            return res.status(400).json({ success: false, message: `Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari` });
        }

        const totalHari = nilaiSakit + nilaiIzin + nilaiAlpha;
        if (totalHari > MAX_ABSEN) {
            return res.status(400).json({ success: false, message: `Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari` });
        }

        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({ success: false, message: 'Data kelas tidak ditemukan' });
        }

        const kelasId = infoKelas.kelas_id;
        const tahunAjaranId = req.idSemesterAktif;

        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({ success: false, message: 'Data tahun ajaran atau kelas tidak valid' });
        }

        if (jenis === 'PAS') {
            const ptsData = await absensiModel.checkPTSExists(siswa_id, tahunAjaranId);
            if (ptsData) {
                if (nilaiSakit < ptsData.sakit_pts) {
                    return res.status(400).json({ success: false, message: `Total sakit (${nilaiSakit}) tidak boleh kurang dari data PTS yang sudah tercatat (${ptsData.sakit_pts})` });
                }
                if (nilaiIzin < ptsData.izin_pts) {
                    return res.status(400).json({ success: false, message: `Total izin (${nilaiIzin}) tidak boleh kurang dari data PTS yang sudah tercatat (${ptsData.izin_pts})` });
                }
                if (nilaiAlpha < ptsData.alpha_pts) {
                    return res.status(400).json({ success: false, message: `Total alpha (${nilaiAlpha}) tidak boleh kurang dari data PTS yang sudah tercatat (${ptsData.alpha_pts})` });
                }
            }
        }

        const [siswaCheck] = await db.execute(
            'SELECT 1 FROM siswa_kelas sk WHERE sk.siswa_id = ? AND sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?',
            [siswa_id, kelasId, req.idTahunAjaranInduk]
        );

        if (siswaCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Siswa tidak terdaftar di kelas Anda' });
        }

        if (jenis === 'PTS') {
            await absensiModel.upsertAbsensiPTS(siswa_id, kelasId, tahunAjaranId, nilaiSakit, nilaiIzin, nilaiAlpha);
        } else {
            await absensiModel.upsertAbsensiPAS(siswa_id, kelasId, tahunAjaranId, nilaiSakit, nilaiIzin, nilaiAlpha);
        }

        res.json({ success: true, message: `Absensi ${jenis} berhasil disimpan` });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan absensi: ' + err.message
        });
    }
};

/**
 * GET /absensi/import-template - Download template import absensi.
 */
exports.downloadTemplateAbsensi = async (req, res) => {
    try {
        const userId = req.user.id;
        const { jenis } = req.query;

        if (!jenis || !['PTS', 'PAS'].includes(jenis.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Parameter jenis (PTS/PAS) wajib diisi' });
        }

        const jenisPenilaian = jenis.toUpperCase();

        const [taRows] = await db.execute("SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1");
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;

        const [kelasRow] = await db.execute('SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?', [userId, semesterId]);
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }

        const kelasId = kelasRow[0].kelas_id;
        const [namaKelasRow] = await db.execute('SELECT nama_kelas FROM kelas WHERE id_kelas = ?', [kelasId]);
        const namaKelas = namaKelasRow[0]?.nama_kelas || 'Kelas';

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap 
        FROM siswa s 
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif' 
        ORDER BY s.nama_lengkap ASC`,
            [kelasId, indukId]
        );

        const [existingAbsensiRows] = await db.execute(
            `SELECT siswa_id, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total 
        FROM absensi 
        WHERE kelas_id = ? AND id_tahun_ajaran = ?`,
            [kelasId, semesterId]
        );

        const absensiMap = {};
        existingAbsensiRows.forEach(row => {
            absensiMap[row.siswa_id] = {
                sakit: jenisPenilaian === 'PAS' ? (row.sakit_total || 0) : (row.sakit_pts || 0),
                izin: jenisPenilaian === 'PAS' ? (row.izin_total || 0) : (row.izin_pts || 0),
                alpha: jenisPenilaian === 'PAS' ? (row.alpha_total || 0) : (row.alpha_pts || 0)
            };
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Template Absensi');

        const instructionRow = worksheet.getRow(1);
        instructionRow.height = 40;
        const instrCell = instructionRow.getCell(1);

        if (jenisPenilaian === 'PAS') {
            instrCell.value = '⚠️ PENTING (PERIODE PAS): Isi dengan JUMLAH TOTAL SEMESTER. Nilai TIDAK BOLEH lebih kecil dari data PTS yang sudah tercatat. (Contoh: Jika PTS sakit 2 hari, dan ada tambahan 1 hari, isi dengan 3, bukan 1).';
            instrCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFF0000' } };
        } else {
            instrCell.value = 'Isi dengan jumlah hari absensi selama periode PTS. Biarkan 0 jika siswa hadir penuh.';
            instrCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        }
        instrCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        worksheet.mergeCells('A1:G1');

        const headerRow = worksheet.getRow(2);
        headerRow.height = 28;

        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', 'Sakit', 'Izin', 'Alpha'];
        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colIdx < 4 ? 'FF34495E' : 'FFE8690A' } };
        });

        siswaRows.forEach((siswa, index) => {
            const rowNum = 3 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 22;

            const isEvenRow = index % 2 === 0;
            const existing = absensiMap[siswa.id_siswa] || { sakit: 0, izin: 0, alpha: 0 };

            const identitasData = [index + 1, siswa.nis || '', siswa.nisn || '', siswa.nama_lengkap || ''];

            identitasData.forEach((val, colIdx) => {
                const cell = dataRow.getCell(colIdx + 1);
                cell.value = val;
                cell.font = { name: 'Calibri', size: 11, bold: colIdx === 3 };
                cell.alignment = { vertical: 'middle', horizontal: colIdx === 3 ? 'left' : 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' } };
                cell.protection = { locked: true };
            });

            ['sakit', 'izin', 'alpha'].forEach((field, fieldIdx) => {
                const colIdx = 5 + fieldIdx;
                const cell = dataRow.getCell(colIdx);
                cell.value = existing[field];
                cell.font = { name: 'Calibri', size: 11, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' } };

                cell.dataValidation = {
                    type: 'whole',
                    operator: 'between',
                    formulae: [0, MAX_ABSEN],
                    showErrorMessage: true,
                    errorTitle: 'Nilai Tidak Valid',
                    error: `Nilai absensi harus berupa angka antara 0 sampai ${MAX_ABSEN}`,
                    showInputMessage: true,
                    promptTitle: 'Input Absensi',
                    prompt: `Masukkan jumlah hari (0-${MAX_ABSEN})`
                };
            });
        });

        if (siswaRows.length === 0) {
            worksheet.mergeCells('A3:G3');
            const emptyCell = worksheet.getCell('A3');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        }

        worksheet.columns = [
            { width: 6 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 10 }, { width: 10 }, { width: 10 }
        ];
        worksheet.views = [{ state: 'frozen', ySplit: 2 }];

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Absensi_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_${jenisPenilaian}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal membuat template: ' + err.message });
    }
};

/**
 * POST /absensi/import - Import data absensi dari Excel.
 */
exports.importAbsensiExcel = async (req, res) => {
    const connection = await db.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diupload' });
        }

        const userId = req.user.id;
        const { jenis } = req.query;

        if (!jenis || !['PTS', 'PAS'].includes(jenis.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Parameter jenis (PTS/PAS) wajib diisi' });
        }

        const jenisPenilaian = jenis.toUpperCase();

        const [taRows] = await db.execute("SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1");
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;

        const [kelasRow] = await db.execute('SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?', [userId, semesterId]);
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }

        const kelasId = kelasRow[0].kelas_id;

                const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            return res.status(400).json({ success: false, message: 'File Excel tidak valid atau sheet kosong.' });
        }

        // Konversi ke array 2D agar 100% kompatibel dengan logika validasi di bawahnya
        const data = [];
        const maxRow = worksheet.rowCount;
        const maxCol = worksheet.columnCount > 0 ? worksheet.columnCount : 10;
        
        for (let r = 1; r <= maxRow; r++) {
            const row = worksheet.getRow(r);
            const rowData = [];
            for (let c = 1; c <= maxCol; c++) {
                const cell = row.getCell(c);
                let val = cell.value;
                // Handle jika cell berisi formula atau rich text
                if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
                if (val && typeof val === 'object' && val.richText) val = val.richText.map(rt => rt.text).join('');
                rowData.push(val === null || val === undefined ? '' : val);
            }
            data.push(rowData);
        }

        if (data.length < 3) {
            return res.status(400).json({ success: false, message: 'File Excel tidak valid. Minimal harus ada header dan 1 baris data.' });
        }

        let headerRowIndex = -1;
        for (let i = 1; i < Math.min(10, data.length); i++) {
            const row = data[i].map(c => String(c).trim().toLowerCase());
            if (row.includes('nis') && row.some(c => c.includes('nama'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({ success: false, message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".' });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;

        const requiredColumns = ['NIS', 'Nama Siswa', 'Sakit', 'Izin', 'Alpha'];
        const missingColumns = requiredColumns.filter(col => !headers.some(h => h.toLowerCase() === col.toLowerCase()));

        if (missingColumns.length > 0) {
            return res.status(400).json({ success: false, message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}` });
        }

        const findColIndex = name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');
        const idxSakit = findColIndex('Sakit');
        const idxIzin = findColIndex('Izin');
        const idxAlpha = findColIndex('Alpha');

        let adaDataSiswa = false;
        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (row && row.length > 0 && (String(row[idxNIS] || '').trim() || String(row[idxNama] || '').trim())) {
                adaDataSiswa = true;
                break;
            }
        }

        if (!adaDataSiswa) {
            return res.status(400).json({
                success: false,
                message: 'File Excel tidak valid - tidak ada data siswa.\n\nSolusi:\n1. Download ulang template Excel\n2. Pastikan kolom NIS dan Nama Siswa terisi\n3. Upload kembali file yang sudah diisi',
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    total_records_saved: 0,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.' }],
                    periode: jenisPenilaian
                }
            });
        }

        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status 
        FROM siswa s 
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`,
            [kelasId, indukId]
        );

        const siswaMapByNIS = {};
        siswaRows.forEach(s => {
            if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s;
        });

        const [existingAbsensiRows] = await db.execute(
            `SELECT siswa_id, MAX(sakit_pts) as sakit_pts, MAX(izin_pts) as izin_pts, MAX(alpha_pts) as alpha_pts 
        FROM absensi 
        WHERE kelas_id = ? AND id_tahun_ajaran = ? 
        GROUP BY siswa_id`,
            [kelasId, semesterId]
        );

        const existingAbsensiMap = {};
        existingAbsensiRows.forEach(row => {
            existingAbsensiMap[row.siswa_id] = {
                sakit_pts: row.sakit_pts || 0,
                izin_pts: row.izin_pts || 0,
                alpha_pts: row.alpha_pts || 0
            };
        });

        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalRecordsSaved = 0;

        const nisDiproses = new Set();
        const nisDuplikat = [];
        const nisnDiproses = new Set();
        const nisnDuplikat = [];

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const namaSiswa = String(row[idxNama] || '').trim();

            if (!nis) {
                if (namaSiswa) warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS kosong untuk "${namaSiswa}"` });
                skippedCount++;
                continue;
            }

            if (nisDiproses.has(nis)) {
                nisDuplikat.push({ row: i + 1, nis, nama: namaSiswa });
                warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS "${nis}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.` });
                skippedCount++;
                continue;
            }
            nisDiproses.add(nis);

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                if (nisnExcel) {
                    if (nisnDiproses.has(nisnExcel)) {
                        nisnDuplikat.push({ row: i + 1, nisn: nisnExcel, nama: namaSiswa });
                        warnings.push({ row: i + 1, message: `Baris ${i + 1}: NISN "${nisnExcel}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.` });
                        skippedCount++;
                        continue;
                    }
                    nisnDiproses.add(nisnExcel);
                }
            }

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({ row: i + 1, message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini` });
                skippedCount++;
                continue;
            }

            const siswaId = siswa.id_siswa;

            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({ row: i + 1, message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"` });
                    skippedCount++;
                    continue;
                }
            }

            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < SIMILARITY_THRESHOLD) {
                        errors.push({ row: i + 1, message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"` });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({ row: i + 1, message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.` });
                    }
                }
            }

            const sakit = parseInt(String(row[idxSakit] || '0').trim()) || 0;
            const izin = parseInt(String(row[idxIzin] || '0').trim()) || 0;
            const alpha = parseInt(String(row[idxAlpha] || '0').trim()) || 0;

            if (sakit < 0 || izin < 0 || alpha < 0) {
                errors.push({ row: i + 1, message: `Baris ${i + 1}: Nilai absensi tidak boleh negatif` });
                skippedCount++;
                continue;
            }

            if (sakit > MAX_ABSEN || izin > MAX_ABSEN || alpha > MAX_ABSEN) {
                errors.push({ row: i + 1, message: `Baris ${i + 1}: Nilai absensi tidak boleh lebih dari ${MAX_ABSEN} hari` });
                skippedCount++;
                continue;
            }

            const totalHari = sakit + izin + alpha;
            if (totalHari > MAX_ABSEN) {
                errors.push({ row: i + 1, message: `Baris ${i + 1}: Total absensi (${totalHari} hari) tidak boleh lebih dari ${MAX_ABSEN} hari` });
                skippedCount++;
                continue;
            }

            if (jenisPenilaian === 'PAS') {
                const existingData = existingAbsensiMap[siswaId];
                if (existingData) {
                    if (sakit < existingData.sakit_pts) {
                        errors.push({ row: i + 1, message: `Baris ${i + 1}: Total sakit (${sakit}) tidak boleh kurang dari data PTS yang sudah tercatat (${existingData.sakit_pts})` });
                        skippedCount++;
                        continue;
                    }
                    if (izin < existingData.izin_pts) {
                        errors.push({ row: i + 1, message: `Baris ${i + 1}: Total izin (${izin}) tidak boleh kurang dari data PTS yang sudah tercatat (${existingData.izin_pts})` });
                        skippedCount++;
                        continue;
                    }
                    if (alpha < existingData.alpha_pts) {
                        errors.push({ row: i + 1, message: `Baris ${i + 1}: Total alpha (${alpha}) tidak boleh kurang dari data PTS yang sudah tercatat (${existingData.alpha_pts})` });
                        skippedCount++;
                        continue;
                    }
                }
            }

            if (jenisPenilaian === 'PTS') {
                await connection.execute(
                    `INSERT INTO absensi (siswa_id, kelas_id, id_tahun_ajaran, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            sakit_pts = VALUES(sakit_pts), izin_pts = VALUES(izin_pts), alpha_pts = VALUES(alpha_pts),
            sakit_total = GREATEST(COALESCE(sakit_total, 0), VALUES(sakit_pts)),
            izin_total = GREATEST(COALESCE(izin_total, 0), VALUES(izin_pts)),
            alpha_total = GREATEST(COALESCE(alpha_total, 0), VALUES(alpha_pts)),
            updated_at = NOW()`,
                    [siswaId, kelasId, semesterId, sakit, izin, alpha, sakit, izin, alpha]
                );
            } else {
                const existingData = existingAbsensiMap[siswaId];
                const ptsSakit = existingData?.sakit_pts || 0;
                const ptsIzin = existingData?.izin_pts || 0;
                const ptsAlpha = existingData?.alpha_pts || 0;

                await connection.execute(
                    `INSERT INTO absensi (siswa_id, kelas_id, id_tahun_ajaran, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            sakit_total = VALUES(sakit_total), izin_total = VALUES(izin_total), alpha_total = VALUES(alpha_total),
            updated_at = NOW()`,
                    [siswaId, kelasId, semesterId, ptsSakit, ptsIzin, ptsAlpha, sakit, izin, alpha]
                );
            }

            successCount++;
            totalRecordsSaved++;
        }

        await connection.commit();

        let message = '';
        let success = true;

        if (errors.length > 0) {
            success = false;
            if (successCount > 0) {
                message = `Import sebagian berhasil: ${successCount} data absensi ${jenisPenilaian} disimpan, tetapi ada ${errors.length} error yang perlu diperbaiki.`;
            } else {
                message = `Import gagal: ${errors.length} error ditemukan. Tidak ada data yang disimpan.`;
            }
        } else if (successCount > 0) {
            message = `Import berhasil! ${successCount} data absensi ${jenisPenilaian} berhasil disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport.';
        }

        if (nisDuplikat.length > 0) {
            const duplikatInfo = nisDuplikat.map(d => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`).join(', ');
            warnings.unshift({ row: 0, message: `DITEMUKAN ${nisDuplikat.length} NIS DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.` });
            message += `\n\nPERHATIAN: ${nisDuplikat.length} NIS duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        if (nisnDuplikat.length > 0) {
            const duplikatInfo = nisnDuplikat.map(d => `Baris ${d.row} (NISN: ${d.nisn}, ${d.nama})`).join(', ');
            warnings.unshift({ row: 0, message: `DITEMUKAN ${nisnDuplikat.length} NISN DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.` });
            message += `\n\nPERHATIAN: ${nisnDuplikat.length} NISN duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        message += `\nINFO: Pastikan setiap siswa memiliki NIS dan NISN yang unik di file Excel.`;

        res.json({
            success: success,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_records_saved: totalRecordsSaved,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings : null,
                periode: jenisPenilaian,
                nis_duplikat_count: nisDuplikat.length,
                nis_duplikat_detail: nisDuplikat,
                nisn_duplikat_count: nisnDuplikat.length,
                nisn_duplikat_detail: nisnDuplikat,
                pesan_penting: nisDuplikat.length > 0 || nisnDuplikat.length > 0 ? `${nisDuplikat.length + nisnDuplikat.length} duplikasi ditemukan. Hanya data pertama yang diproses.` : null
            }
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Gagal mengimport absensi: ' + err.message });
    } finally {
        connection.release();
    }
};