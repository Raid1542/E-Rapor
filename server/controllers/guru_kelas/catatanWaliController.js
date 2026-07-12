/**
 * Nama File: catatanWaliController.js
 * Fungsi: Controller catatan wali kelas per siswa (sanitasi XSS, validasi naik tingkat)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// Hitung kesamaan string (Levenshtein Distance)
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
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLen;
};

// Sanitasi input untuk mencegah XSS
const sanitizeInput = (text) => {
    if (!text) return '';
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET CATATAN WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

// Ambil catatan wali kelas untuk semua siswa di kelas guru
exports.getCatatanWaliKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas 
        FROM guru_kelas gk 
        JOIN kelas k ON gk.kelas_id = k.id_kelas 
        WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?`,
            [userId, semesterId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }
        const { kelas_id, nama_kelas } = guruKelasRows[0];

        const [data] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn, s.jenis_kelamin,
                COALESCE(c.catatan_wali_kelas, '') AS catatan_wali_kelas, c.naik_tingkat
        FROM siswa s
        JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        LEFT JOIN catatan_wali_kelas c ON s.id_siswa = c.siswa_id 
            AND c.tahun_ajaran_id = ? AND c.semester = ? AND c.jenis_penilaian = ?
        WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
        ORDER BY s.nama_lengkap`,
            [semesterId, semester, jenis_penilaian, kelas_id, tahunAjaranIndukId]
        );

        res.json({ success: true, data, kelas: nama_kelas, semester, jenis_penilaian });
    } catch (err) {
        console.error('Error getCatatanWaliKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data catatan' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPDATE CATATAN WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

// Simpan atau update catatan wali kelas untuk siswa tertentu
exports.updateCatatanWaliKelas = async (req, res) => {
    try {
        const siswa_id = parseInt(req.params.siswa_id);
        const { catatan_wali_kelas, naik_tingkat } = req.body;
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: reqJenis } = req.penilaianContext || {};
        const { status_pts, status_pas } = req.tahunAjaranAktif || {};

        if (isNaN(siswa_id) || siswa_id <= 0) {
            return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
        }
        if (!tahunAjaranIndukId || !semesterId || !semester || !reqJenis) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }
        if (!['PTS', 'PAS'].includes(reqJenis)) {
            return res.status(400).json({ success: false, message: 'Jenis penilaian harus PTS atau PAS' });
        }

        const trimmedCatatan = catatan_wali_kelas?.trim() || '';
        if (!trimmedCatatan) {
            return res.status(400).json({ success: false, message: 'Catatan wali kelas wajib diisi' });
        }
        if (trimmedCatatan.length < 20) {
            return res.status(400).json({ success: false, message: `Catatan minimal 20 karakter (saat ini ${trimmedCatatan.length})` });
        }
        const sanitizedCatatan = sanitizeInput(trimmedCatatan);

        if ((reqJenis === 'PTS' && status_pts !== 'aktif') || (reqJenis === 'PAS' && status_pas !== 'aktif')) {
            return res.status(403).json({ success: false, message: `Rapor ${reqJenis} sudah dikunci. Catatan tidak dapat diubah.` });
        }

        const [guruKelasRows] = await db.execute('SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?', [
            userId,
            semesterId,
        ]);
        if (guruKelasRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        }
        const { kelas_id } = guruKelasRows[0];

        const [validSiswa] = await db.execute(
            'SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?',
            [siswa_id, kelas_id, tahunAjaranIndukId]
        );
        if (validSiswa.length === 0) {
            return res.status(403).json({ success: false, message: 'Siswa tidak terdaftar di kelas Anda' });
        }

        let naikTingkatValue = null;
        if (reqJenis === 'PAS' && semester === 'Genap') {
            if (naik_tingkat !== 'ya' && naik_tingkat !== 'tidak') {
                return res.status(400).json({ success: false, message: 'Keputusan naik tingkat wajib diisi (ya/tidak) untuk PAS Genap.' });
            }
            naikTingkatValue = naik_tingkat;
        }

        await db.execute(
            `INSERT INTO catatan_wali_kelas (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, catatan_wali_kelas, naik_tingkat)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            catatan_wali_kelas = VALUES(catatan_wali_kelas), 
            naik_tingkat = VALUES(naik_tingkat), 
            updated_at = NOW()`,
            [siswa_id, kelas_id, semesterId, semester, reqJenis, sanitizedCatatan, naikTingkatValue]
        );

        res.json({ success: true, message: `Catatan wali kelas (${reqJenis} ${semester}) berhasil diperbarui` });
    } catch (err) {
        console.error('Error updateCatatanWaliKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui catatan wali kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. DOWNLOAD TEMPLATE IMPORT CATATAN WALI
// ═════════════════════════════════════════════════════════════════════════════

// Generate template Excel untuk import catatan wali kelas
exports.downloadTemplateCatatanWali = async (req, res) => {
    try {
        const userId = req.user.id;
        const { jenis, semester } = req.query;

        if (!jenis || !['PTS', 'PAS'].includes(jenis.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Parameter jenis (PTS/PAS) wajib diisi' });
        }

        if (!semester || !['Ganjil', 'Genap'].includes(semester)) {
            return res.status(400).json({ success: false, message: 'Parameter semester (Ganjil/Genap) wajib diisi' });
        }

        const jenisPenilaian = jenis.toUpperCase();
        const semesterName = semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();

        const [taRows] = await db.execute("SELECT id_tahun_ajaran, id_tahun_ajaran_induk FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1");

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

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Catatan Wali Kelas');

        // Header di row 1
        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;

        const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', 'Catatan Wali Kelas', 'Naik Tingkat (Khusus PAS Genap)'];
        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colIdx < 4 ? 'FF34495E' : 'FFE8690A' },
            };
        });

        // Data siswa mulai dari row 2
        siswaRows.forEach((siswa, index) => {
            const rowNum = 2 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 60;

            const isEvenRow = index % 2 === 0;

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
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFE8F4FD' : 'FFFFFFFF' },
                };
                cell.protection = { locked: true };
            });

            // Kolom catatan
            const catatanCell = dataRow.getCell(5);
            catatanCell.value = '-';
            catatanCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF999999' } };
            catatanCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            catatanCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            };
            catatanCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' },
            };

            // Kolom naik tingkat
            const naikTingkatCell = dataRow.getCell(6);
            if (jenisPenilaian === 'PAS' && semesterName === 'Genap') {
                naikTingkatCell.value = '';
                naikTingkatCell.dataValidation = {
                    type: 'list',
                    allowBlank: false,
                    formulae: ['"ya,tidak"'],
                    showErrorMessage: true,
                    errorTitle: 'Pilihan Tidak Valid',
                    error: 'Pilih "ya" atau "tidak"',
                };
            } else {
                naikTingkatCell.value = '-';
                naikTingkatCell.font = { italic: true, color: { argb: 'FF999999' } };
            }
            naikTingkatCell.alignment = { vertical: 'middle', horizontal: 'center' };
            naikTingkatCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            };
            naikTingkatCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' },
            };
        });

        // Empty state
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A2:F2');
            const emptyCell = worksheet.getCell('A2');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        }

        worksheet.columns = [{ width: 6 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 60 }, { width: 20 }];

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Catatan_Wali_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_${jenisPenilaian}_${semesterName}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        console.error('Error downloadTemplateCatatanWali:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message,
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. IMPORT CATATAN WALI DARI EXCEL
// ═════════════════════════════════════════════════════════════════════════════

// Import catatan wali kelas dari Excel dengan validasi
exports.importCatatanWaliExcel = async (req, res) => {
    const connection = await db.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diupload' });
        }

        const userId = req.user.id;
        const { jenis, semester } = req.query;

        if (!jenis || !['PTS', 'PAS'].includes(jenis.toUpperCase())) {
            return res.status(400).json({ success: false, message: 'Parameter jenis (PTS/PAS) wajib diisi' });
        }

        if (!semester || !['Ganjil', 'Genap'].includes(semester)) {
            return res.status(400).json({ success: false, message: 'Parameter semester (Ganjil/Genap) wajib diisi' });
        }

        const jenisPenilaian = jenis.toUpperCase();
        const semesterName = semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();

        const [taRows] = await db.execute(
            "SELECT id_tahun_ajaran, id_tahun_ajaran_induk, status_pts, status_pas FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1"
        );

        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }

        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const { status_pts, status_pas } = taRows[0];

        if ((jenisPenilaian === 'PTS' && status_pts !== 'aktif') || (jenisPenilaian === 'PAS' && status_pas !== 'aktif')) {
            return res.status(403).json({
                success: false,
                message: `Periode ${jenisPenilaian} sudah dikunci atau belum dibuka. Import tidak dapat dilakukan.`,
            });
        }

        const [kelasRow] = await db.execute('SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?', [userId, semesterId]);

        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }

        const kelasId = kelasRow[0].kelas_id;

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (data.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'File Excel tidak valid. Minimal harus ada header dan 1 baris data.',
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
                message: 'Header tidak ditemukan. Pastikan ada kolom "NIS" dan "Nama Siswa".',
            });
        }

        const headers = data[headerRowIndex].map(h => String(h).trim());
        const dataStartIndex = headerRowIndex + 1;

        const requiredColumns = ['NIS', 'Nama Siswa', 'Catatan Wali Kelas'];
        const missingColumns = requiredColumns.filter(col => !headers.some(h => h.toLowerCase() === col.toLowerCase()));

        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`,
            });
        }

        const findColIndex = name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
        const idxNIS = findColIndex('NIS');
        const idxNISN = findColIndex('NISN');
        const idxNama = findColIndex('Nama Siswa');
        const idxCatatan = findColIndex('Catatan Wali Kelas');
        const idxNaikTingkat = findColIndex('Naik Tingkat');

        // Validasi file tidak kosong
        let adaBarisDataValid = false;
        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (row && row.length > 0 && row.some(cell => String(cell).trim() !== '')) {
                adaBarisDataValid = true;
                break;
            }
        }

        if (!adaBarisDataValid) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel kosong - tidak ada data sama sekali.\n\n` +
                    `File hanya berisi header tanpa baris data siswa.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Pastikan ada baris data siswa\n` +
                    `3. Isi catatan wali kelas (minimal 20 karakter)\n` +
                    `4. Upload kembali file yang sudah diisi`,
                data: {
                    total_baris: 0,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: 0,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel kosong. Tidak ada baris data siswa.' }],
                    periode: `${jenisPenilaian} ${semesterName}`,
                },
            });
        }

        // Validasi data siswa ada
        let adaDataSiswa = false;
        let barisDenganDataSiswa = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const nis = String(row[idxNIS] || '').trim();
            const nama = String(row[idxNama] || '').trim();

            if (nis || nama) {
                adaDataSiswa = true;
                barisDenganDataSiswa++;
            }
        }

        if (!adaDataSiswa) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel tidak valid - tidak ada data siswa.\n\n` +
                    `File berisi baris kosong tanpa data NIS atau Nama Siswa.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Pastikan kolom NIS dan Nama Siswa terisi\n` +
                    `3. Isi catatan wali kelas (minimal 20 karakter)\n` +
                    `4. Upload kembali file yang sudah diisi`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel tidak berisi data siswa. Kolom NIS dan Nama kosong.' }],
                    periode: `${jenisPenilaian} ${semesterName}`,
                },
            });
        }

        // Validasi file memiliki catatan
        let adaCatatanDiFile = false;
        let barisDenganCatatan = 0;

        for (let i = dataStartIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const catatanStr = String(row[idxCatatan] || '').trim();

            if (catatanStr && catatanStr !== '-' && catatanStr.length > 0) {
                adaCatatanDiFile = true;
                barisDenganCatatan++;
            }
        }

        if (!adaCatatanDiFile) {
            return res.status(400).json({
                success: false,
                message:
                    `File Excel tidak valid - tidak ada catatan yang diisi.\n\n` +
                    `File hanya berisi data identitas siswa tanpa catatan wali kelas.\n\n` +
                    `Solusi:\n` +
                    `1. Download ulang template Excel\n` +
                    `2. Isi kolom catatan wali kelas dengan minimal 20 karakter\n` +
                    (jenisPenilaian === 'PAS' && semesterName === 'Genap' ? '3. Isi kolom naik tingkat (ya/tidak)\n' : '') +
                    `4. Upload kembali file yang sudah diisi\n\n` +
                    `Periode aktif: ${jenisPenilaian} ${semesterName}`,
                data: {
                    total_baris: data.length - dataStartIndex,
                    berhasil: 0,
                    gagal: 0,
                    dilewati: data.length - dataStartIndex,
                    errors: null,
                    warnings: [{ row: 0, message: 'File Excel tidak berisi catatan. Hanya data identitas siswa yang terdeteksi.' }],
                    periode: `${jenisPenilaian} ${semesterName}`,
                },
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

        await connection.beginTransaction();

        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;

        const nisDiproses = new Set();
        const nisDuplikat = [];

        const nisnDiproses = new Set();
        const nisnDuplikat = [];

        if (jenisPenilaian !== 'PAS' || semesterName !== 'Genap') {
            warnings.push({
                row: 0,
                message: 'Kolom "Naik Tingkat" diabaikan karena hanya berlaku untuk PAS Semester Genap.',
            });
        }

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

            // Cek duplikasi NIS
            if (nisDiproses.has(nis)) {
                nisDuplikat.push({ row: i + 1, nis, nama: namaSiswa });
                warnings.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: NIS "${nis}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.`,
                });
                skippedCount++;
                continue;
            }
            nisDiproses.add(nis);

            // Cek duplikasi NISN
            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                if (nisnExcel) {
                    if (nisnDiproses.has(nisnExcel)) {
                        nisnDuplikat.push({ row: i + 1, nisn: nisnExcel, nama: namaSiswa });
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: NISN "${nisnExcel}" (${namaSiswa}) DUPLIKAT - Data ini diabaikan. Hanya data pertama yang diproses.`,
                        });
                        skippedCount++;
                        continue;
                    }
                    nisnDiproses.add(nisnExcel);
                }
            }

            const siswa = siswaMapByNIS[nis];
            if (!siswa) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Siswa dengan NIS "${nis}" tidak ditemukan di kelas ini`,
                });
                skippedCount++;
                continue;
            }

            const siswaId = siswa.id_siswa;

            // Validasi NISN
            if (idxNISN >= 0) {
                const nisnExcel = String(row[idxNISN] || '').trim();
                const nisnDB = String(siswa.nisn || '').trim();
                if (nisnExcel && nisnDB && nisnExcel !== nisnDB) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: NISN tidak cocok. Excel: "${nisnExcel}", DB: "${nisnDB}"`,
                    });
                    skippedCount++;
                    continue;
                }
            }

            // Validasi nama
            if (idxNama >= 0) {
                const namaExcel = String(row[idxNama] || '').trim().toLowerCase();
                const namaDB = String(siswa.nama_lengkap || '').trim().toLowerCase();
                if (namaExcel && namaDB && namaExcel !== namaDB) {
                    const similarity = calculateSimilarity(namaExcel, namaDB);
                    if (similarity < 0.7) {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama tidak cocok. Excel: "${row[idxNama]}", DB: "${siswa.nama_lengkap}"`,
                        });
                        skippedCount++;
                        continue;
                    } else {
                        warnings.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Nama sedikit berbeda (typo). Data tetap diimport.`,
                        });
                    }
                }
            }

            const catatan = String(row[idxCatatan] || '').trim();

            if (!catatan || catatan === '-') {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Catatan wali kelas kosong untuk "${siswa.nama_lengkap}"`,
                });
                skippedCount++;
                continue;
            }

            if (catatan.length < 20) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Catatan minimal 20 karakter (saat ini ${catatan.length} karakter)`,
                });
                skippedCount++;
                continue;
            }

            const sanitizedCatatan = sanitizeInput(catatan);

            let naikTingkatValue = null;
            if (jenisPenilaian === 'PAS' && semesterName === 'Genap') {
                if (idxNaikTingkat >= 0) {
                    const naikTingkat = String(row[idxNaikTingkat] || '').trim().toLowerCase();
                    if (naikTingkat === 'ya' || naikTingkat === 'tidak') {
                        naikTingkatValue = naikTingkat;
                    } else {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Naik tingkat harus "ya" atau "tidak" (diterima: "${naikTingkat}")`,
                        });
                        skippedCount++;
                        continue;
                    }
                } else {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: Kolom "Naik Tingkat" wajib diisi untuk PAS Genap`,
                    });
                    skippedCount++;
                    continue;
                }
            }

            await connection.execute(
                `INSERT INTO catatan_wali_kelas 
            (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, catatan_wali_kelas, naik_tingkat)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            catatan_wali_kelas = VALUES(catatan_wali_kelas),
            naik_tingkat = VALUES(naik_tingkat),
            updated_at = NOW()`,
                [siswaId, kelasId, semesterId, semesterName, jenisPenilaian, sanitizedCatatan, naikTingkatValue]
            );

            successCount++;
        }

        await connection.commit();

        let message = '';
        let success = true;

        if (errors.length > 0) {
            success = false;
            if (successCount > 0) {
                message = `Import sebagian berhasil: ${successCount} catatan wali kelas ${jenisPenilaian} disimpan, tetapi ada ${errors.length} error yang perlu diperbaiki.`;
            } else {
                message = `Import gagal: ${errors.length} error ditemukan. Tidak ada data yang disimpan.`;
            }
        } else if (successCount > 0) {
            message = `Import berhasil! ${successCount} catatan wali kelas ${jenisPenilaian} berhasil disimpan.`;
        } else {
            message = 'Tidak ada data yang berhasil diimport.';
        }

        if (nisDuplikat.length > 0) {
            const duplikatInfo = nisDuplikat.map(d => `Baris ${d.row} (NIS: ${d.nis}, ${d.nama})`).join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisDuplikat.length} NIS DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });
            message += `\n\nPERHATIAN: ${nisDuplikat.length} NIS duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        if (nisnDuplikat.length > 0) {
            const duplikatInfo = nisnDuplikat.map(d => `Baris ${d.row} (NISN: ${d.nisn}, ${d.nama})`).join(', ');
            warnings.unshift({
                row: 0,
                message: `DITEMUKAN ${nisnDuplikat.length} NISN DUPLIKAT: ${duplikatInfo}. Hanya data pertama yang diproses, duplikat diabaikan.`,
            });
            message += `\n\nPERHATIAN: ${nisnDuplikat.length} NISN duplikat ditemukan dan diabaikan. Hanya data pertama yang diproses.`;
        }

        message += `\nINFO: Pastikan setiap siswa memiliki NIS dan NISN yang unik di file Excel.`;

        if (jenisPenilaian !== 'PAS' || semesterName !== 'Genap') {
            message += `\n\nINFO: Kolom "Naik Tingkat" diabaikan karena hanya berlaku untuk PAS Semester Genap.`;
        }

        res.json({
            success: success,
            message: message,
            data: {
                total_baris: data.length - dataStartIndex,
                berhasil: successCount,
                gagal: errors.length,
                dilewati: skippedCount,
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings : null,
                periode: `${jenisPenilaian} ${semesterName}`,
                nis_duplikat_count: nisDuplikat.length,
                nis_duplikat_detail: nisDuplikat,
                nisn_duplikat_count: nisnDuplikat.length,
                nisn_duplikat_detail: nisnDuplikat,
                baris_dengan_catatan: barisDenganCatatan,
                baris_dengan_data_siswa: barisDenganDataSiswa,
                pesan_penting:
                    nisDuplikat.length > 0 || nisnDuplikat.length > 0
                        ? `${nisDuplikat.length + nisnDuplikat.length} duplikasi ditemukan. Hanya data pertama yang diproses.`
                        : null,
            },
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error importCatatanWaliExcel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport catatan wali kelas: ' + err.message,
        });
    } finally {
        connection.release();
    }
};