/**
 * Nama File: ekskulController.js
 * Fungsi: CRUD ekstrakurikuler siswa (max 3 ekskul per siswa)
 * UPDATE: Fix bug query guru_kelas yang salah pakai tahunAjaranIndukId
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET EKSKUL SISWA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/ekskul
 * Ambil ekskul semua siswa di kelas + master ekskul untuk dropdown
 */
exports.getEkskulSiswa = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;
        const { semester } = req.penilaianContext || {};
        const pasStatus = req.tahunAjaranAktif?.status_pas || 'nonaktif';

        if (!tahunAjaranIndukId || !semesterId || !semester) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        // ✅ PERBAIKAN: Ambil kelas guru dengan JOIN ke tahun_ajaran
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas 
                FROM guru_kelas gk 
                INNER JOIN kelas k ON gk.kelas_id = k.id_kelas 
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, tahunAjaranIndukId]  // ✅ Pakai tahunAjaranIndukId dengan JOIN
        );

        if (guruKelasRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini',
                code: 'NOT_ASSIGNED'  // ✅ Tambah code agar frontend bisa handle
            });
        }
        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Ambil siswa + ekskul per siswa
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn 
                FROM siswa s JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id 
                WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ?
                ORDER BY s.nama_lengkap`,
            [kelas_id, tahunAjaranIndukId]
        );

        const data = [];
        for (const siswa of siswaRows) {
            const [ekskulRows] = await db.execute(
                `SELECT e.id_ekskul, e.nama_ekskul, pe.deskripsi 
                    FROM peserta_ekstrakurikuler pe JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul 
                    WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
                [siswa.id_siswa, semesterId]
            );

            data.push({
                id: siswa.id_siswa,
                nama: siswa.nama,
                nis: siswa.nis,
                nisn: siswa.nisn,
                ekskul: ekskulRows.map(e => ({ id: e.id_ekskul, nama: e.nama_ekskul, deskripsi: e.deskripsi })),
                jumlah_ekskul: ekskulRows.length,
            });
        }

        // Master ekskul untuk dropdown
        const [daftar_ekskul] = await db.execute(
            `SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ?`,
            [semesterId]
        );

        res.json({ success: true, data, daftar_ekskul, kelas: nama_kelas, semester, pasStatus });
    } catch (err) {
        console.error('Error getEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data ekskul' });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. UPDATE EKSKUL SISWA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/guru-kelas/ekskul/:siswaId
 * Update ekskul siswa (max 3, tidak boleh duplikat, deskripsi wajib)
 */
exports.updateEkskulSiswa = async (req, res) => {
    try {
        const { siswaId } = req.params;
        const { ekskulList } = req.body;

        // Validasi array max 3
        if (!Array.isArray(ekskulList) || ekskulList.length > 3) {
            return res.status(400).json({ success: false, message: 'Maksimal 3 ekskul' });
        }

        // Validasi duplikat
        const ekskulIds = ekskulList.map(e => parseInt(e.ekskul_id)).filter(id => id > 0);
        if (new Set(ekskulIds).size !== ekskulIds.length) {
            return res.status(400).json({ success: false, message: 'Ekskul tidak boleh duplikat' });
        }

        // Validasi deskripsi
        for (let i = 0; i < ekskulList.length; i++) {
            const item = ekskulList[i];
            if (!item.ekskul_id || item.ekskul_id <= 0) {
                return res.status(400).json({ success: false, message: `Ekskul ke-${i + 1} harus dipilih` });
            }
            if (!item.deskripsi?.trim()) {
                return res.status(400).json({ success: false, message: `Deskripsi ekskul ke-${i + 1} wajib diisi` });
            }
        }

        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        // ✅ PERBAIKAN: Ambil kelas guru dengan JOIN ke tahun_ajaran
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id 
                FROM guru_kelas gk
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda belum ditugaskan sebagai wali kelas',
                code: 'NOT_ASSIGNED'
            });
        }
        const { kelas_id } = guruKelasRows[0];

        // Validasi siswa di kelas
        const [valid] = await db.execute(
            `SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND id_tahun_ajaran_induk = ?`,
            [siswaId, kelas_id, tahunAjaranIndukId]
        );

        if (valid.length === 0) {
            return res.status(403).json({ success: false, message: 'Siswa tidak di kelas Anda' });
        }

        // Hapus ekskul lama yang tidak dipilih
        if (ekskulIds.length > 0) {
            const placeholders = ekskulIds.map(() => '?').join(',');
            await db.execute(
                `DELETE FROM peserta_ekstrakurikuler 
                    WHERE siswa_id = ? AND tahun_ajaran_id = ? AND ekskul_id NOT IN (${placeholders})`,
                [siswaId, semesterId, ...ekskulIds]
            );
        } else {
            await db.execute(
                `DELETE FROM peserta_ekstrakurikuler WHERE siswa_id = ? AND tahun_ajaran_id = ?`,
                [siswaId, semesterId]
            );
        }

        // Insert/Update ekskul yang dipilih
        for (const ekskul of ekskulList) {
            const ekskulId = parseInt(ekskul.ekskul_id);
            const deskripsi = ekskul.deskripsi?.trim() || '';
            if (ekskulId <= 0) continue;

            await db.execute(
                `INSERT INTO peserta_ekstrakurikuler (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE deskripsi = VALUES(deskripsi), updated_at = CURRENT_TIMESTAMP`,
                [siswaId, ekskulId, semesterId, deskripsi]
            );
        }

        res.json({ success: true, message: 'Ekskul berhasil diperbarui' });
    } catch (err) {
        console.error('Error updateEkskulSiswa:', err);
        res.status(500).json({ success: false, message: 'Gagal update ekskul: ' + err.message });
    }
};

const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: HELPER - Hitung Kesamaan String (Levenshtein Distance)
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
// 🆕 BARU: DOWNLOAD TEMPLATE IMPORT EKSKUL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/guru-kelas/ekskul/import-template
 * Download template Excel untuk import ekskul siswa
 * 
 * Struktur Excel:
 * - Kolom: No, NIS, NISN, Nama Siswa, Ekskul 1, Deskripsi 1, Ekskul 2, Deskripsi 2, Ekskul 3, Deskripsi 3
 * - Dropdown untuk nama ekskul
 * - Data ekskul yang sudah ada terisi otomatis
 */
exports.downloadTemplateEkskul = async (req, res) => {
    try {
        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        // Ambil kelas guru dengan JOIN ke tahun_ajaran
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id, k.nama_kelas 
                FROM guru_kelas gk 
                INNER JOIN kelas k ON gk.kelas_id = k.id_kelas 
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda belum ditugaskan sebagai wali kelas',
                code: 'NOT_ASSIGNED'
            });
        }

        const { kelas_id, nama_kelas } = guruKelasRows[0];

        // Ambil daftar ekskul untuk dropdown
        const [daftarEkskul] = await db.execute(
            `SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ?`,
            [semesterId]
        );

        // Ambil siswa aktif di kelas
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap
                FROM siswa s
                INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
                WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'
                ORDER BY s.nama_lengkap ASC`,
            [kelas_id, tahunAjaranIndukId]
        );

        // Ambil ekskul yang sudah ada untuk setiap siswa
        const [existingEkskulRows] = await db.execute(
            `SELECT pe.siswa_id, pe.ekskul_id, pe.deskripsi, e.nama_ekskul
                FROM peserta_ekstrakurikuler pe
                INNER JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul
                WHERE pe.siswa_id IN (${siswaRows.map(s => s.id_siswa).join(',')})
                AND pe.tahun_ajaran_id = ?
                ORDER BY pe.siswa_id, pe.ekskul_id`,
            [semesterId]
        );

        // Group ekskul by siswa
        const ekskulBySiswa = {};
        existingEkskulRows.forEach(row => {
            if (!ekskulBySiswa[row.siswa_id]) {
                ekskulBySiswa[row.siswa_id] = [];
            }
            ekskulBySiswa[row.siswa_id].push({
                ekskul_id: row.ekskul_id,
                nama_ekskul: row.nama_ekskul,
                deskripsi: row.deskripsi
            });
        });

        // ═════════════════════════════════════════════════════════════════
        // BUILD EXCEL WORKBOOK
        // ═════════════════════════════════════════════════════════════════
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'E-Rapor SDIT Ulil Albab Batam';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Ekstrakurikuler');

        // Row 1: Title
        worksheet.mergeCells('A1:J1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'TEMPLATE IMPORT EKSTRAKURIKULER SISWA';
        titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8690A' } };
        worksheet.getRow(1).height = 30;

        // Row 2: Info
        worksheet.mergeCells('A2:J2');
        const infoCell = worksheet.getCell('A2');
        infoCell.value = `Kelas: ${nama_kelas} | Maksimal 3 ekskul per siswa | Setiap ekskul wajib memiliki deskripsi`;
        infoCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
        infoCell.alignment = { vertical: 'middle', horizontal: 'center' };
        infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5E6' } };
        worksheet.getRow(2).height = 22;

        // Row 3: Headers
        const headerRow = worksheet.getRow(3);
        headerRow.height = 28;

        const headers = [
            'No', 'NIS', 'NISN', 'Nama Siswa',
            'Ekskul 1', 'Deskripsi 1',
            'Ekskul 2', 'Deskripsi 2',
            'Ekskul 3', 'Deskripsi 3'
        ];

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
            dataRow.height = 60;

            const isEvenRow = index % 2 === 0;
            const existingEkskul = ekskulBySiswa[siswa.id_siswa] || [];

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

            // Kolom ekskul dan deskripsi (3 pasang)
            for (let i = 0; i < 3; i++) {
                const ekskulCol = 5 + (i * 2);
                const deskripsiCol = 6 + (i * 2);

                // Kolom Ekskul (dropdown)
                const ekskulCell = dataRow.getCell(ekskulCol);
                if (existingEkskul[i]) {
                    ekskulCell.value = existingEkskul[i].nama_ekskul;
                } else {
                    ekskulCell.value = '';
                }

                // Dropdown untuk ekskul
                if (daftarEkskul.length > 0) {
                    const ekskulNames = daftarEkskul.map(e => e.nama_ekskul);
                    ekskulCell.dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: ['"' + ekskulNames.join(',') + '"'],
                        showErrorMessage: true,
                        errorTitle: 'Ekskul Tidak Valid',
                        error: 'Pilih ekskul dari daftar yang tersedia'
                    };
                }

                ekskulCell.alignment = { vertical: 'middle', horizontal: 'center' };
                ekskulCell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
                ekskulCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' }
                };

                // Kolom Deskripsi
                const deskripsiCell = dataRow.getCell(deskripsiCol);
                if (existingEkskul[i]) {
                    deskripsiCell.value = existingEkskul[i].deskripsi || '';
                } else {
                    deskripsiCell.value = '';
                }

                deskripsiCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                deskripsiCell.border = {
                    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
                deskripsiCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEvenRow ? 'FFFFF5E6' : 'FFFFFFFF' }
                };
            }
        });

        // Pesan Jika Tidak Ada Siswa
        if (siswaRows.length === 0) {
            worksheet.mergeCells('A4:J4');
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
            { width: 20 },  // Ekskul 1
            { width: 30 },  // Deskripsi 1
            { width: 20 },  // Ekskul 2
            { width: 30 },  // Deskripsi 2
            { width: 20 },  // Ekskul 3
            { width: 30 }   // Deskripsi 3
        ];

        // Freeze Header Row
        worksheet.views = [{ state: 'frozen', ySplit: 3 }];

        // Generate & Send
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Template_Ekskul_${nama_kelas.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);

    } catch (err) {
        console.error('Error downloadTemplateEkskul:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat template: ' + err.message
        });
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 🆕 BARU: IMPORT EKSTRAKURIKULER DARI EXCEL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/guru-kelas/ekskul/import
 * Upload file Excel dan import ekskul siswa
 * 
 * Validasi:
 * - Siswa harus terdaftar di kelas
 * - NISN harus cocok
 * - Nama harus cocok (similarity check)
 * - Maksimal 3 ekskul per siswa
 * - Setiap ekskul wajib memiliki deskripsi
 * - Tidak boleh duplikasi ekskul yang sama
 * - Ekskul harus ada di daftar ekskul
 */
exports.importEkskulExcel = async (req, res) => {
    const connection = await db.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File Excel wajib diupload' });
        }

        const userId = req.user.id;
        const tahunAjaranIndukId = req.idTahunAjaranInduk;
        const semesterId = req.idSemesterAktif;

        if (!tahunAjaranIndukId || !semesterId) {
            return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
        }

        // Ambil kelas guru dengan JOIN ke tahun_ajaran
        const [guruKelasRows] = await db.execute(
            `SELECT gk.kelas_id 
                FROM guru_kelas gk
                INNER JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
                WHERE gk.user_id = ? AND ta.id_tahun_ajaran_induk = ?
                LIMIT 1`,
            [userId, tahunAjaranIndukId]
        );

        if (guruKelasRows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Anda belum ditugaskan sebagai wali kelas',
                code: 'NOT_ASSIGNED'
            });
        }

        const { kelas_id } = guruKelasRows[0];

        // Ambil daftar ekskul untuk validasi
        const [daftarEkskul] = await db.execute(
            `SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ?`,
            [semesterId]
        );

        const ekskulMapByName = {};
        daftarEkskul.forEach(e => {
            ekskulMapByName[e.nama_ekskul.toLowerCase()] = e.id_ekskul;
        });

        // Baca File Excel
        const xlsxWorkbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = xlsxWorkbook.SheetNames[0];
        const xlsxWorksheet = xlsxWorkbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(xlsxWorksheet, { header: 1, defval: '' });

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
        const requiredColumns = ['NIS', 'Nama Siswa'];
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

        // Cari kolom ekskul dan deskripsi
        const idxEkskul1 = headers.findIndex(h => h.toLowerCase().includes('ekskul') && h.includes('1'));
        const idxDeskripsi1 = headers.findIndex(h => h.toLowerCase().includes('deskripsi') && h.includes('1'));
        const idxEkskul2 = headers.findIndex(h => h.toLowerCase().includes('ekskul') && h.includes('2'));
        const idxDeskripsi2 = headers.findIndex(h => h.toLowerCase().includes('deskripsi') && h.includes('2'));
        const idxEkskul3 = headers.findIndex(h => h.toLowerCase().includes('ekskul') && h.includes('3'));
        const idxDeskripsi3 = headers.findIndex(h => h.toLowerCase().includes('deskripsi') && h.includes('3'));

        // Ambil Data Siswa dari Database
        const [siswaRows] = await db.execute(
            `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap, s.status
                FROM siswa s
                INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
                WHERE sk.kelas_id = ? AND sk.id_tahun_ajaran_induk = ? AND s.status = 'aktif'`,
            [kelas_id, tahunAjaranIndukId]
        );

        const siswaMapByNIS = {};
        siswaRows.forEach(s => {
            if (s.nis) siswaMapByNIS[String(s.nis).trim()] = s;
        });

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

            // Validasi Nama
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

            // Proses 3 ekskul
            const ekskulList = [];
            const ekskulIds = new Set(); // Untuk cek duplikasi

            for (let j = 0; j < 3; j++) {
                const idxEkskul = j === 0 ? idxEkskul1 : j === 1 ? idxEkskul2 : idxEkskul3;
                const idxDeskripsi = j === 0 ? idxDeskripsi1 : j === 1 ? idxDeskripsi2 : idxDeskripsi3;

                if (idxEkskul < 0) continue;

                const namaEkskul = String(row[idxEkskul] || '').trim();
                if (!namaEkskul) continue;

                // Validasi ekskul ada di daftar
                const ekskulId = ekskulMapByName[namaEkskul.toLowerCase()];
                if (!ekskulId) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: Ekskul "${namaEkskul}" tidak ditemukan di daftar ekskul`
                    });
                    continue;
                }

                // Validasi tidak duplikat
                if (ekskulIds.has(ekskulId)) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: Duplikasi ekskul "${namaEkskul}"`
                    });
                    continue;
                }

                // Validasi deskripsi wajib
                const deskripsi = idxDeskripsi >= 0 ? String(row[idxDeskripsi] || '').trim() : '';
                if (!deskripsi) {
                    errors.push({
                        row: i + 1,
                        message: `Baris ${i + 1}: Deskripsi untuk ekskul "${namaEkskul}" wajib diisi`
                    });
                    continue;
                }

                ekskulIds.add(ekskulId);
                ekskulList.push({
                    ekskul_id: ekskulId,
                    deskripsi: deskripsi
                });
            }

            // Validasi maksimal 3 ekskul
            if (ekskulList.length > 3) {
                errors.push({
                    row: i + 1,
                    message: `Baris ${i + 1}: Maksimal 3 ekskul per siswa`
                });
                skippedCount++;
                continue;
            }

            // Hapus ekskul lama
            await connection.execute(
                `DELETE FROM peserta_ekstrakurikuler WHERE siswa_id = ? AND tahun_ajaran_id = ?`,
                [siswa.id_siswa, semesterId]
            );

            // Insert ekskul baru
            for (const ekskul of ekskulList) {
                await connection.execute(
                    `INSERT INTO peserta_ekstrakurikuler (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi)
                        VALUES (?, ?, ?, ?)`,
                    [siswa.id_siswa, ekskul.ekskul_id, semesterId, ekskul.deskripsi]
                );
            }

            successCount++;
        }

        await connection.commit();

        // Build Response
        let message = '';
        if (successCount > 0) {
            message = `Import berhasil! ${successCount} data ekskul berhasil disimpan.`;
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
                warnings: warnings.length > 0 ? warnings.slice(0, 10) : null
            }
        });

    } catch (err) {
        await connection.rollback();
        console.error('Error importEkskulExcel:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimport ekskul: ' + err.message
        });
    } finally {
        connection.release();
    }
};