/**
 * Nama File: catatanWaliController.js
 * Fungsi: Controller catatan wali kelas per siswa (sanitasi XSS, validasi naik tingkat)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// Sanitasi input untuk mencegah XSS
const sanitizeInput = (text) => {
    if (!text) return '';
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
};

// GET: Ambil catatan wali kelas untuk semua siswa di kelas guru
exports.getCatatanWaliKelas = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: jenis_penilaian } = req.penilaianContext || {};

        // Validasi data dari middleware
        if (!tahunAjaranIndukId || !semesterId || !semester || !jenis_penilaian) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        }

        // Ambil kelas guru (pakai semesterId)
        const [guruKelasRows] = await db.execute(
            'SELECT gk.kelas_id, k.nama_kelas FROM guru_kelas gk JOIN kelas k ON gk.kelas_id = k.id_kelas WHERE gk.user_id = ? AND gk.tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        if (guruKelasRows.length === 0) return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Ambil semua siswa di kelas + LEFT JOIN catatan
        const [data] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn, s.jenis_kelamin,
                    COALESCE(c.catatan_wali_kelas, '') AS catatan_wali_kelas, c.naik_tingkat
             FROM siswa s
             JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             LEFT JOIN catatan_wali_kelas c ON s.id_siswa = c.siswa_id AND c.tahun_ajaran_id = ? AND c.semester = ? AND c.jenis_penilaian = ?
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

// PUT: Simpan/update catatan wali kelas untuk siswa tertentu (UPSERT)
exports.updateCatatanWaliKelas = async (req, res) => {
    try {
        const siswa_id = parseInt(req.params.siswa_id);
        const { catatan_wali_kelas, naik_tingkat } = req.body;
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester, jenis: reqJenis } = req.penilaianContext || {};
        const { status_pts, status_pas } = req.tahunAjaranAktif || {};

        // Validasi ID siswa & data middleware
        if (isNaN(siswa_id) || siswa_id <= 0) return res.status(400).json({ success: false, message: 'ID siswa tidak valid' });
        if (!tahunAjaranIndukId || !semesterId || !semester || !reqJenis) return res.status(400).json({ success: false, message: 'Data tahun ajaran atau semester tidak ditemukan' });
        if (!['PTS', 'PAS'].includes(reqJenis)) return res.status(400).json({ success: false, message: 'Jenis penilaian harus PTS atau PAS' });

        // Validasi catatan (wajib, min 20 karakter) & sanitasi XSS
        const trimmedCatatan = catatan_wali_kelas?.trim() || '';
        if (!trimmedCatatan) return res.status(400).json({ success: false, message: 'Catatan wali kelas wajib diisi' });
        if (trimmedCatatan.length < 20) return res.status(400).json({ success: false, message: `Catatan minimal 20 karakter (saat ini ${trimmedCatatan.length})` });
        const sanitizedCatatan = sanitizeInput(trimmedCatatan);

        // Cek apakah periode dikunci
        if ((reqJenis === 'PTS' && status_pts !== 'aktif') || (reqJenis === 'PAS' && status_pas !== 'aktif')) {
            return res.status(403).json({ success: false, message: `Rapor ${reqJenis} sudah dikunci. Catatan tidak dapat diubah.` });
        }

        // Ambil kelas guru & validasi siswa terdaftar
        const [guruKelasRows] = await db.execute('SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?', [userId, semesterId]);
        if (guruKelasRows.length === 0) return res.status(404).json({ success: false, message: 'Kelas aktif tidak ditemukan.' });
        const { kelas_id } = guruKelasRows[0];

        const [validSiswa] = await db.execute('SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?', [siswa_id, kelas_id, tahunAjaranIndukId]);
        if (validSiswa.length === 0) return res.status(403).json({ success: false, message: 'Siswa tidak terdaftar di kelas Anda' });

        // Validasi naik_tingkat (wajib untuk PAS Genap)
        let naikTingkatValue = null;
        if (reqJenis === 'PAS' && semester === 'Genap') {
            if (naik_tingkat !== 'ya' && naik_tingkat !== 'tidak') return res.status(400).json({ success: false, message: 'Keputusan naik tingkat wajib diisi (ya/tidak) untuk PAS Genap.' });
            naikTingkatValue = naik_tingkat;
        }

        // Insert atau Update (UPSERT)
        await db.execute(
            `INSERT INTO catatan_wali_kelas (siswa_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian, catatan_wali_kelas, naik_tingkat)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE catatan_wali_kelas = VALUES(catatan_wali_kelas), naik_tingkat = VALUES(naik_tingkat), updated_at = NOW()`,
            [siswa_id, kelas_id, semesterId, semester, reqJenis, sanitizedCatatan, naikTingkatValue]
        );

        res.json({ success: true, message: `Catatan wali kelas (${reqJenis} ${semester}) berhasil diperbarui` });
    } catch (err) {
        console.error('Error updateCatatanWaliKelas:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui catatan wali kelas' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: DOWNLOAD TEMPLATE IMPORT CATATAN WALI KELAS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/catatan-wali-kelas/import-template?jenis=PTS|PAS&semester=Ganjil|Genap
 * Download template Excel untuk import catatan wali kelas
 */
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
        
        // Ambil tahun ajaran aktif
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        
        // Ambil kelas guru
        const [kelasRow] = await db.execute(
            'SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        
        const kelasId = kelasRow[0].kelas_id;
        
        // Ambil nama kelas
        const [namaKelasRow] = await db.execute(
            'SELECT nama_kelas FROM kelas WHERE id_kelas = ?',
            [kelasId]
        );
        
        const namaKelas = namaKelasRow[0]?.nama_kelas || 'Kelas';
        
        // Ambil siswa aktif di kelas
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
             FROM siswa s
             INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
             WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
             ORDER BY s.nama_lengkap ASC`,
            [kelasId, indukId]
        );
        
        // Ambil catatan yang sudah ada
        const [existingCatatanRows] = await db.execute(
            `SELECT siswa_id, catatan_wali_kelas, naik_tingkat 
             FROM catatan_wali_kelas 
             WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
            [kelasId, semesterId, semesterName, jenisPenilaian]
        );
        
        const existingCatatanMap = {};
        existingCatatanRows.forEach(row => {
            existingCatatanMap[row.siswa_id] = {
                catatan: row.catatan_wali_kelas || '',
                naik_tingkat: row.naik_tingkat || null
            };
        });
        
        // Build Excel Workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();
        
        const worksheet = workbook.addWorksheet('Catatan Wali Kelas');
        
        // Row 1: Title
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `TEMPLATE IMPORT CATATAN WALI KELAS ${jenisPenilaian}`;
        titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8690A' } };
        worksheet.getRow(1).height = 30;
        
        // Row 2: Info
        worksheet.mergeCells('A2:E2');
        const infoCell = worksheet.getCell('A2');
        infoCell.value = `Kelas: ${namaKelas} | Semester: ${semesterName} | ${jenisPenilaian}`;
        infoCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
        infoCell.alignment = { vertical: 'middle', horizontal: 'center' };
        infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        worksheet.getRow(2).height = 22;
        
        // Row 3: Headers
        const headerRow = worksheet.getRow(3);
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
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            cell.fill = { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: colIdx < 4 ? 'FF34495E' : 'FFE8690A' } 
            };
        });
        
        // Row 4+: Data Siswa
        siswaRows.forEach((siswa, index) => {
            const rowNum = 4 + index;
            const dataRow = worksheet.getRow(rowNum);
            dataRow.height = 60; // Lebih tinggi untuk catatan
            
            const isEvenRow = index % 2 === 0;
            const existingData = existingCatatanMap[siswa.id_siswa] || { catatan: '', naik_tingkat: null };
            
            // Kolom identitas (read-only)
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
            
            // Kolom Catatan (editable)
            const catatanCell = dataRow.getCell(5);
            catatanCell.value = existingData.catatan;
            catatanCell.font = { name: 'Calibri', size: 11 };
            catatanCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            catatanCell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            catatanCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' }
            };
            
            // Kolom Naik Tingkat (hanya untuk PAS Genap)
            const naikTingkatCell = dataRow.getCell(6);
            if (jenisPenilaian === 'PAS' && semesterName === 'Genap') {
                naikTingkatCell.value = existingData.naik_tingkat || '';
                naikTingkatCell.dataValidation = {
                    type: 'list',
                    allowBlank: false,
                    formulae: ['"ya,tidak"'],
                    showErrorMessage: true,
                    errorTitle: 'Pilihan Tidak Valid',
                    error: 'Pilih "ya" atau "tidak"'
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
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            naikTingkatCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' }
            };
        });
        
        // Pesan Jika Tidak Ada Siswa
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A4:E4');
            const emptyCell = worksheet.getCell('A4');
            emptyCell.value = 'Belum ada siswa di kelas ini. Silakan hubungi Admin.';
            emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF666666' } };
            emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
            emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        }
        
        // Set Column Width
        worksheet.columns = [
            { width: 6 },   // No
            { width: 15 },  // NIS
            { width: 15 },  // NISN
            { width: 30 },  // Nama Siswa
            { width: 60 },  // Catatan (lebar)
            { width: 20 }   // Naik Tingkat
        ];
        
        // Freeze Header Row
        worksheet.views = [{ state: 'frozen', ySplit: 3 }];
        
        // Generate & Send
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Catatan_Wali_${namaKelas.replace(/[^a-z0-9]/gi, '_')}_${jenisPenilaian}_${semesterName}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
        
    } catch (err) {
        console.error('Error downloadTemplateCatatanWali:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: IMPORT CATATAN WALI KELAS DARI EXCEL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/guru-kelas/catatan-wali-kelas/import?jenis=PTS|PAS&semester=Ganjil|Genap
 * Upload file Excel dan import catatan wali kelas
 */
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
        
        // Ambil tahun ajaran aktif
        const [taRows] = await db.execute(
            'SELECT id_tahun_ajaran, id_tahun_ajaran_induk, status_pts, status_pas FROM tahun_ajaran WHERE status = \'aktif\' LIMIT 1'
        );
        
        if (taRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
        }
        
        const semesterId = taRows[0].id_tahun_ajaran;
        const indukId = taRows[0].id_tahun_ajaran_induk;
        const { status_pts, status_pas } = taRows[0];
        
        // Cek status periode
        if ((jenisPenilaian === 'PTS' && status_pts !== 'aktif') || 
            (jenisPenilaian === 'PAS' && status_pas !== 'aktif')) {
            return res.status(403).json({ 
                success: false, 
                message: `Periode ${jenisPenilaian} sudah dikunci atau belum dibuka. Import tidak dapat dilakukan.` 
            });
        }
        
        // Ambil kelas guru
        const [kelasRow] = await db.execute(
            'SELECT kelas_id FROM guru_kelas WHERE user_id = ? AND tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        
        if (kelasRow.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda tidak memiliki kelas aktif' });
        }
        
        const kelasId = kelasRow[0].kelas_id;
        
        // Baca File Excel
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
        
        // Cari Header Row
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
        
        // Validasi Kolom Wajib
        const requiredColumns = ['NIS', 'Nama Siswa', 'Catatan Wali Kelas'];
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
        const idxCatatan = findColIndex('Catatan Wali Kelas');
        const idxNaikTingkat = findColIndex('Naik Tingkat');
        
        // Ambil Data Siswa dari Database
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
        
        // Sanitasi input
        const sanitizeInput = (text) => {
            if (!text) return '';
            return String(text)
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        };
        
        // Proses Data per Baris
        await connection.beginTransaction();
        
        const errors = [];
        const warnings = [];
        let successCount = 0;
        let skippedCount = 0;
        
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
            
            // Validasi NISN
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
            
            // Validasi Catatan
            const catatan = String(row[idxCatatan] || '').trim();
            
            if (!catatan) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Catatan wali kelas kosong untuk "${siswa.nama_lengkap}"`
                });
                skippedCount++;
                continue;
            }
            
            if (catatan.length < 20) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Catatan minimal 20 karakter (saat ini ${catatan.length} karakter)`
                });
                skippedCount++;
                continue;
            }
            
            const sanitizedCatatan = sanitizeInput(catatan);
            
            // Validasi Naik Tingkat (khusus PAS Genap)
            let naikTingkatValue = null;
            if (jenisPenilaian === 'PAS' && semesterName === 'Genap') {
                if (idxNaikTingkat >= 0) {
                    const naikTingkat = String(row[idxNaikTingkat] || '').trim().toLowerCase();
                    if (naikTingkat === 'ya' || naikTingkat === 'tidak') {
                        naikTingkatValue = naikTingkat;
                    } else {
                        errors.push({
                            row: i + 1,
                            message: `Baris ${i + 1}: Naik tingkat harus "ya" atau "tidak" (diterima: "${naikTingkat}")`
                        });
                        skippedCount++;
                        continue;
                    }
                } else {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: Kolom "Naik Tingkat" wajib diisi untuk PAS Genap`
                    });
                    skippedCount++;
                    continue;
                }
            }
            
            // Simpan ke database (UPSERT)
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
        
        // Build Response
        let message = '';
        if (successCount > 0) {
            message = `Import berhasil! ${successCount} catatan wali kelas ${jenisPenilaian} berhasil disimpan.`;
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
                errors: errors.length > 0 ? errors.slice(0, 20) : null,
                warnings: warnings.length > 0 ? warnings.slice(0, 10) : null,
                periode: `${jenisPenilaian} ${semesterName}`
            }
        });
        
    } catch (err) {
        await connection.rollback();
        console.error('Error importCatatanWaliExcel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport catatan wali kelas: ' + err.message
        });
    } finally {
        connection.release();
    }
};