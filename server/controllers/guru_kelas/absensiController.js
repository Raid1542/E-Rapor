/**
 * Nama File: absensiController.js
 * Fungsi: Controller absensi siswa guru kelas (PTS/PAS) + IMPORT EXCEL
 */
const absensiModel = require('../../models/guru_kelas/absensiModel');
const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER - Hitung Kesamaan String (Levenshtein Distance)
// ═════════════════════════════════════════════════════════════════════════════

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
    return 1 - (matrix[len1][len2] / maxLen);
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET ABSENSI SISWA
// ═════════════════════════════════════════════════════════════════════════════

exports.getAbsensiSiswa = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jenis, semester } = req.penilaianContext || {};
        
        if (!userId) return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
        
        const infoKelas = req.infoKelasWali;
        if (!infoKelas || !infoKelas.kelas_id) {
            return res.status(404).json({ success: false, message: 'Data kelas tidak ditemukan. Silakan hubungi admin.' });
        }
        
        const kelasId = infoKelas.kelas_id;
        const namaKelas = infoKelas.nama_kelas;
        const tahunAjaranId = req.idSemesterAktif;
        
        if (!tahunAjaranId || !kelasId) {
            return res.status(500).json({ success: false, message: 'Data tahun ajaran atau kelas tidak valid' });
        }
        
        const absensiList = await absensiModel.getAbsensiByKelas(kelasId, tahunAjaranId);
        
        const formattedData = absensiList.map(row => {
            if (jenis === 'PTS') {
                return {
                    id_siswa: row.id_siswa, nama: row.nama_lengkap, nis: row.nis || '', nisn: row.nisn || '',
                    sakit: row.sakit_pts, izin: row.izin_pts, alpha: row.alpha_pts,
                    sudah_diinput: row.sudah_diinput === 1
                };
            } else {
                return {
                    id_siswa: row.id_siswa, nama: row.nama_lengkap, nis: row.nis || '', nisn: row.nisn || '',
                    sakit: row.sakit_total, izin: row.izin_total, alpha: row.alpha_total,
                    sudah_diinput: row.sudah_diinput === 1,
                    pts_sakit: row.sakit_pts, pts_izin: row.izin_pts, pts_alpha: row.alpha_pts
                };
            }
        });
        
        res.json({
            success: true,
            data: {
                kelas_id: kelasId, kelas: namaKelas, jenis_penilaian: jenis, semester,
                absensi: formattedData, total: formattedData.length
            }
        });
    } catch (err) {
        console.error('Error getAbsensiSiswa:', err);
        res.status(500).json({
            success: false, message: 'Gagal mengambil data absensi',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPSERT ABSENSI
// ═════════════════════════════════════════════════════════════════════════════

exports.upsertAbsensi = async (req, res) => {
    try {
        const userId = req.user?.id;
        const jenis = req.body.jenis?.toUpperCase() || req.penilaianContext?.jenis;
        const { siswa_id, sakit, izin, alpha } = req.body;
        
        if (!userId) return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
        if (!jenis || !['PTS', 'PAS'].includes(jenis)) {
            return res.status(400).json({ success: false, message: 'Jenis harus PTS atau PAS' });
        }
        if (!siswa_id) return res.status(400).json({ success: false, message: 'ID siswa wajib diisi' });
        
        const nilaiSakit = parseInt(sakit) || 0;
        const nilaiIzin = parseInt(izin) || 0;
        const nilaiAlpha = parseInt(alpha) || 0;
        
        if (nilaiSakit < 0 || nilaiIzin < 0 || nilaiAlpha < 0) {
            return res.status(400).json({ success: false, message: 'Nilai absensi tidak boleh negatif' });
        }
        
        const MAX_ABSEN = 90;
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
                    return res.status(400).json({ success: false, message: `Total sakit (${nilaiSakit}) tidak boleh kurang dari PTS (${ptsData.sakit_pts})` });
                }
                if (nilaiIzin < ptsData.izin_pts) {
                    return res.status(400).json({ success: false, message: `Total izin (${nilaiIzin}) tidak boleh kurang dari PTS (${ptsData.izin_pts})` });
                }
                if (nilaiAlpha < ptsData.alpha_pts) {
                    return res.status(400).json({ success: false, message: `Total alpha (${nilaiAlpha}) tidak boleh kurang dari PTS (${ptsData.alpha_pts})` });
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
        console.error('Error upsertAbsensi:', err);
        res.status(500).json({
            success: false, message: 'Gagal menyimpan absensi',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 3. DOWNLOAD TEMPLATE IMPORT ABSENSI
// ═════════════════════════════════════════════════════════════════════════════

exports.downloadTemplateAbsensi = async (req, res) => {
    try {
        const userId = req.user.id;
        const { jenis } = req.query;
        
        if (!jenis || !['PTS', 'PAS'].includes(jenis.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Parameter jenis (PTS/PAS) wajib diisi' });
        }
        
        const jenisPenilaian = jenis.toUpperCase();
        
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const semester = taRows[0].semester;
        
        const [kelasRow] = await db.execute(
            'SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        
        const kelasId = kelasRow[0].kelas_id;
        
        const [namaKelasRow] = await db.execute(
            'SELECT nama_kelas FROM kelas WHERE id_kelas = ?',
            [kelasId]
        );
        
        const namaKelas = namaKelasRow[0]?.nama_kelas || 'Kelas';
        
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
             ORDER BY s.nama_lengkap ASC`,
            [kelasId, indukId]
        );
        
        let existingAbsensi = {};
        const [absensiRows] = await db.execute(
            `SELECT siswa_id, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total 
             FROM absensi 
             WHERE kelas_id = ? AND id_tahun_ajaran = ?`,
            [kelasId, semesterId]
        );
        
        absensiRows.forEach(row => {
            existingAbsensi[row.siswa_id] = {
                sakit_pts: row.sakit_pts || 0,
                izin_pts: row.izin_pts || 0,
                alpha_pts: row.alpha_pts || 0,
                sakit_total: row.sakit_total || 0,
                izin_total: row.izin_total || 0,
                alpha_total: row.alpha_total || 0
            };
        });
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Template Absensi');
        
        // ✅ PERUBAHAN: Header langsung di Row 1 (tanpa title dan info)
        const headerRow = worksheet.getRow(1);
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
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: colIdx < 4 ? 'FF34495E' : 'FFE8690A' } 
            };
        });
        
        // ✅ PERUBAHAN: Data siswa mulai dari Row 2 (bukan Row 4)
        siswaRows.forEach((siswa, index) => {
            const rowNum = 2 + index; // Dimulai dari row 2
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 22;
            
            const isEvenRow = index % 2 === 0;
            const existingData = existingAbsensi[siswa.id_siswa] || { 
                sakit_pts: 0, izin_pts: 0, alpha_pts: 0,
                sakit_total: 0, izin_total: 0, alpha_total: 0 
            };
            
            const identitasData = [
                index + 1,
                siswa.nis || '',
                siswa.nisn || '',
                siswa.nama_lengkap || ''
            ];
            
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
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' }
                };
                cell.protection = { locked: true };
            });
            
            const nilaiDefault = jenisPenilaian === 'PTS' 
                ? [existingData.sakit_pts, existingData.izin_pts, existingData.alpha_pts]
                : [existingData.sakit_total, existingData.izin_total, existingData.alpha_total];
            
            ['sakit', 'izin', 'alpha'].forEach((field, fieldIdx) => {
                const colIdx = 5 + fieldIdx;
                const cell = dataRow.getCell(colIdx);
                const nilai = nilaiDefault[fieldIdx] || 0;
                
                cell.value = nilai;
                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' }
                };
                
                cell.dataValidation = {
                    type: 'whole',
                    operator: 'between',
                    formulae: [0, 90],
                    showErrorMessage: true,
                    errorTitle: 'Nilai Tidak Valid',
                    error: 'Nilai absensi harus berupa angka antara 0 sampai 90',
                    showInputMessage: true,
                    promptTitle: 'Input Absensi',
                    prompt: 'Masukkan jumlah hari (0-90)'
                };
            });
        });
        
        // ✅ PERUBAHAN: Merge dari A2:G2 (bukan A4:G4)
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A2:G2');
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        }
        
        worksheet.columns = [
            { width: 6 },
            { width: 15 },
            { width: 15 },
            { width: 30 },
            { width: 10 },
            { width: 10 },
            { width: 10 }
        ];
        
        // ✅ PERUBAHAN: Freeze dari ySplit: 1 (bukan ySplit: 3)
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Absensi_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_${jenisPenilaian}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
        
    } catch (err) {
        console.error('Error downloadTemplateAbsensi:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 4. IMPORT ABSENSI DARI EXCEL
// ═════════════════════════════════════════════════════════════════════════════

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
        
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, semester FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        
        const [kelasRow] = await db.execute(
            'SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        
        const kelasId = kelasRow[0].kelas_id;
        
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (data.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'File Excel tidak valid. Minimal harus ada header dan 1 baris data.'
            });
        }
        
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i].map(c => String(c).trim().toLowerCase());
            if (row.includes('nis') && row.some(c => c.includes('nama'))) {
                headerRowIndex = i;
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".'
            });
        }
        
        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;
        
        const requiredColumns = ['NIS', 'Nama Siswa', 'Sakit', 'Izin', 'Alpha'];
        const missingColumns = requiredColumns.filter(col =>
            !headers.some(h => h.toLowerCase() === col.toLowerCase())
        );
        
        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`
            });
        }
        
        const findColIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');
        const idxSakit = findColIndex('Sakit');
        const idxIzin = findColIndex('Izin');
        const idxAlpha = findColIndex('Alpha');
        
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
            `SELECT siswa_id, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total
             FROM absensi
             WHERE kelas_id = ? AND id_tahun_ajaran = ?`,
            [kelasId, semesterId]
        );
        
        const existingAbsensiMap = {};
        existingAbsensiRows.forEach(row => {
            existingAbsensiMap[row.siswa_id] = {
                sakit_pts: row.sakit_pts || 0,
                izin_pts: row.izin_pts || 0,
                alpha_pts: row.alpha_pts || 0,
                sakit_total: row.sakit_total || 0,
                izin_total: row.izin_total || 0,
                alpha_total: row.alpha_total || 0
            };
        });
        
        await connection.beginTransaction();
        
        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        let totalRecordsSaved = 0;
        
        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            const nis = String(row[idxNIS] || '').trim();
            const namaSiswa = String(row[idxNama] || '').trim();
            
            if (!nis) {
                if (namaSiswa) {
                    warnings.push({ row: i + 1, message: `Baris ${i + 1}: NIS kosong untuk "${namaSiswa}"` });
                }
                skippedCount++;
                continue;
            }
            
            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini`
                });
                skippedCount++;
                continue;
            }
            
            const siswaId = siswa.id_siswa;
            
            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"`
                    });
                    skippedCount++;
                    continue;
                }
            }
            
            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < 0.7) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"`
                        });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.`
                        });
                    }
                }
            }
            
            const sakit = parseInt(String(row[idxSakit] || '0').trim()) || 0;
            const izin = parseInt(String(row[idxIzin] || '0').trim()) || 0;
            const alpha = parseInt(String(row[idxAlpha] || '0').trim()) || 0;
            
            if (sakit < 0 || izin < 0 || alpha < 0) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Nilai absensi tidak boleh negatif`
                });
                skippedCount++;
                continue;
            }
            
            if (sakit > 90 || izin > 90 || alpha > 90) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Nilai absensi tidak boleh lebih dari 90 hari`
                });
                skippedCount++;
                continue;
            }
            
            const totalHari = sakit + izin + alpha;
            if (totalHari > 90) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Total absensi (${totalHari} hari) tidak boleh lebih dari 90 hari`
                });
                skippedCount++;
                continue;
            }
            
            if (jenisPenilaian === 'PAS') {
                const existingData = existingAbsensiMap[siswaId];
                if (existingData) {
                    if (sakit < existingData.sakit_pts) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Total sakit (${sakit}) tidak boleh kurang dari PTS (${existingData.sakit_pts})`
                        });
                        skippedCount++;
                        continue;
                    }
                    if (izin < existingData.izin_pts) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Total izin (${izin}) tidak boleh kurang dari PTS (${existingData.izin_pts})`
                        });
                        skippedCount++;
                        continue;
                    }
                    if (alpha < existingData.alpha_pts) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Total alpha (${alpha}) tidak boleh kurang dari PTS (${existingData.alpha_pts})`
                        });
                        skippedCount++;
                        continue;
                    }
                }
            }
            
            if (jenisPenilaian === 'PTS') {
                await connection.execute(
                    `INSERT INTO absensi 
                     (siswa_id, kelas_id, id_tahun_ajaran, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     sakit_pts = VALUES(sakit_pts),
                     izin_pts = VALUES(izin_pts),
                     alpha_pts = VALUES(alpha_pts),
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
                    `INSERT INTO absensi 
                     (siswa_id, kelas_id, id_tahun_ajaran, sakit_pts, izin_pts, alpha_pts, sakit_total, izin_total, alpha_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     sakit_total = VALUES(sakit_total),
                     izin_total = VALUES(izin_total),
                     alpha_total = VALUES(alpha_total),
                     updated_at = NOW()`,
                    [siswaId, kelasId, semesterId, ptsSakit, ptsIzin, ptsAlpha, sakit, izin, alpha]
                );
            }
            
            successCount++;
            totalRecordsSaved++;
        }
        
        await connection.commit();
        
        let message = '';
        if (successCount > 0) {
            message = `Import berhasil! ${successCount} data absensi ${jenisPenilaian} berhasil disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport.';
        }
        
        if (errors.length > 0) {
            message += `\n\n⚠️ Ada ${errors.length} error yang perlu diperbaiki.`;
        }
        
        res.json({
            success: true,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                total_records_saved: totalRecordsSaved,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings.slice(0, 10) : null,
                periode: jenisPenilaian
            }
        });
        
    } catch (err) {
        await connection.rollback();
        console.error('Error importAbsensiExcel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport absensi: ' + err.message
        });
    } finally {
        connection.release();
    }
};