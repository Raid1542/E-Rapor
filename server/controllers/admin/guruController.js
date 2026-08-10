/**
 * Nama File: guruController.js
 * Fungsi: Controller CRUD guru + import Excel.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const ExcelJS = require('exceljs');
const guruModel = require('../../models/admin/guruModel');
const db = require('../../config/db');
const fs = require('fs');

/**
 * Ubah path relatif menjadi URL absolut agar bisa dibaca frontend.
 */
const getFullPhotoUrl = (fotoPath) => {
    if (!fotoPath) return null;
    if (fotoPath.startsWith('http')) return fotoPath;
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    if (fotoPath.startsWith('/uploads/')) {
        return `${baseUrl}${fotoPath}`;
    }
    return `${baseUrl}/uploads/${fotoPath.replace(/^\/+/, '')}`;
};

/**
 * Ambil daftar semua guru dengan data profil dan role.
 */
exports.getGuru = async (req, res) => {
    try {
        const [rows] = await db.execute(`
        SELECT u.id_user, u.nama_lengkap, u.email_sekolah, u.status,
                g.niy, g.nuptk, g.tempat_lahir, g.tanggal_lahir, g.jenis_kelamin,
                g.alamat, g.no_telepon, g.foto_path, GROUP_CONCAT(ur.role) AS roles
        FROM user u
        INNER JOIN guru g ON u.id_user = g.user_id
        INNER JOIN user_role ur ON u.id_user = ur.id_user
        WHERE ur.role IN ('guru_kelas', 'guru_bidang_studi')
        GROUP BY u.id_user 
        ORDER BY u.nama_lengkap ASC
    `);

        const guruList = rows.map(row => ({
            ...row,
            roles: row.roles ? row.roles.split(',') : [],
            profileImage: getFullPhotoUrl(row.foto_path)
        }));

        res.json({ success: true, data: guruList });
    } catch (err) {
        console.error('Error getGuru:', err);
        res.status(500).json({ message: 'Gagal mengambil data guru' });
    }
};

/**
 * Ambil detail guru berdasarkan ID.
 */
exports.getGuruById = async (req, res) => {
    try {
        const { id } = req.params;
        const guru = await guruModel.getGuruById(id);

        if (!guru) {
            return res.status(404).json({ message: 'Guru tidak ditemukan' });
        }

        res.json({
            success: true,
            data: {
                ...guru,
                profileImage: getFullPhotoUrl(guru.foto_path || guru.profileImage)
            }
        });
    } catch (err) {
    console.error('Error getGuruById:', err);
    res.status(500).json({ message: 'Gagal mengambil detail guru' });
    }
};

/**
 * Tambah guru baru dengan data profil dan role.
 */
exports.tambahGuru = async (req, res) => {
    const { nama_lengkap, email_sekolah, roles = [], niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon } = req.body;

    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });

    if (!Array.isArray(roles)) {
        return res.status(400).json({ message: 'Roles harus berupa array' });
    }

    const normalizedRoles = roles.map(role => (typeof role === 'string' ? role.trim().toLowerCase() : '')).filter(Boolean);
    const allowedRoles = ['guru_kelas', 'guru_bidang_studi'];
    const validRoles = normalizedRoles.filter(role => allowedRoles.includes(role));

    if (validRoles.length === 0) {
        return res.status(400).json({ message: 'Pilih minimal satu hak akses yang valid' });
    }

    try {
        const DEFAULT_PASSWORD = process.env.DEFAULT_GURU_PASSWORD || 'sekolah123';
        const userData = { email_sekolah, password: DEFAULT_PASSWORD, nama_lengkap, status: 'aktif' };
        const guruData = { niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon };

        const userId = await guruModel.createGuru(userData, guruData, validRoles);
        res.status(201).json({ message: 'Guru berhasil ditambahkan', id: userId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let duplicateField = 'Data';
            if (err.sqlMessage) {
                if (err.sqlMessage.includes('email_sekolah')) duplicateField = 'Email';
                else if (err.sqlMessage.includes('niy')) duplicateField = 'NIY';
                else if (err.sqlMessage.includes('nuptk')) duplicateField = 'NUPTK';
            }
            return res.status(400).json({ message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.` });
        }
        console.error('Error tambahGuru:', err);
        res.status(500).json({ message: 'Gagal menambah guru' });
    }
};

/**
 * Update data guru berdasarkan ID.
 */
exports.editGuru = async (req, res) => {
    const { id } = req.params;
    const { email_sekolah, nama_lengkap, status, niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, roles, password } = req.body;

    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });

    if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: 'Role wajib dipilih minimal satu' });
    }

    const normalizedRoles = roles.map(role => (typeof role === 'string' ? role.trim().toLowerCase() : '')).filter(Boolean);
    const allowedRoles = ['guru_kelas', 'guru_bidang_studi'];
    const validRoles = normalizedRoles.filter(role => allowedRoles.includes(role));

    if (validRoles.length === 0) {
        return res.status(400).json({ message: 'Pilih role yang valid (guru kelas / guru bidang studi)' });
    }

    try {
        const userData = { email_sekolah, nama_lengkap, password, status };
        const guruData = { niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon };

        await guruModel.updateGuru(id, userData, guruData, validRoles);
        res.json({ message: 'Data guru berhasil diperbarui' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let duplicateField = 'Data';
            if (err.sqlMessage) {
                if (err.sqlMessage.includes('email_sekolah')) duplicateField = 'Email';
                else if (err.sqlMessage.includes('niy')) duplicateField = 'NIY';
                else if (err.sqlMessage.includes('nuptk')) duplicateField = 'NUPTK';
            }
            return res.status(400).json({ message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.` });
        }
        console.error('Error editGuru:', err);
        res.status(500).json({ message: 'Gagal memperbarui data guru' });
    }
};

/**
 * Import data guru dari file Excel
 */
exports.importGuru = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File Excel diperlukan' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'File Excel kosong atau tidak ada data' });
        }

        // Ambil header dinamis
        const headers = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = String(cell.value || '').toLowerCase().trim();
        });

        const colMap = {};
        headers.forEach((header, idx) => {
            if (header) colMap[header] = idx;
        });

        const requiredColumns = ['email_sekolah', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'roles'];
        const missingColumns = requiredColumns.filter(col => !(col in colMap));

        if (missingColumns.length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: `Format tidak valid: Kolom "${missingColumns.join(', ')}" tidak ditemukan di template`
            });
        }

        await connection.beginTransaction();
        const skipped = [];
        let processedCount = 0;

        const roleMapping = {
            'guru kelas': 'guru_kelas', 'guru_kelas': 'guru_kelas', 'gurukelas': 'guru_kelas',
            'guru bidang studi': 'guru_bidang_studi', 'guru_bidang_studi': 'guru_bidang_studi',
            'gurubidangstudi': 'guru_bidang_studi', 'guru mapel': 'guru_bidang_studi', 'guru_mapel': 'guru_bidang_studi'
        };

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const rowNum = i;
            const getCellVal = (colName) => colName in colMap ? row.getCell(colMap[colName] + 1)?.value : null;

            const rowData = {
                email_sekolah: getCellVal('email_sekolah'),
                nama_lengkap: getCellVal('nama_lengkap'),
                tempat_lahir: getCellVal('tempat_lahir'),
                tanggal_lahir: getCellVal('tanggal_lahir'),
                jenis_kelamin: getCellVal('jenis_kelamin'),
                roles: getCellVal('roles'),
                niy: getCellVal('niy'),
                nuptk: getCellVal('nuptk'),
                alamat: getCellVal('alamat'),
                no_telepon: getCellVal('no_telepon'),
                password: getCellVal('password')
            };

            try {
                if (!rowData.email_sekolah || !rowData.nama_lengkap || !rowData.tempat_lahir || !rowData.tanggal_lahir || !rowData.jenis_kelamin) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap || '-', reason: 'Data tidak lengkap (nama, email, tempat lahir, tanggal lahir, jenis kelamin wajib diisi)' });
                    continue;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(String(rowData.email_sekolah))) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: `Format email "${rowData.email_sekolah}" tidak valid` });
                    continue;
                }

                let tanggal_lahir = rowData.tanggal_lahir;
                if (tanggal_lahir instanceof Date) {
                    tanggal_lahir = `${tanggal_lahir.getFullYear()}-${String(tanggal_lahir.getMonth() + 1).padStart(2, '0')}-${String(tanggal_lahir.getDate()).padStart(2, '0')}`;
                } else if (typeof tanggal_lahir === 'number') {
                    const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
                    if (!isNaN(date.getTime())) {
                        tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    } else {
                        skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: 'Format tanggal lahir tidak valid' });
                        continue;
                    }
                } else if (typeof tanggal_lahir === 'string') {
                    tanggal_lahir = tanggal_lahir.trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                        skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: 'Format tanggal lahir harus YYYY-MM-DD' });
                        continue;
                    }
                } else {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: 'Tanggal lahir wajib diisi' });
                    continue;
                }

                if (!['Laki-laki', 'Perempuan'].includes(rowData.jenis_kelamin)) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: `Jenis kelamin harus "Laki-laki" atau "Perempuan", ditemukan: "${rowData.jenis_kelamin}"` });
                    continue;
                }

                const roles = rowData.roles ? String(rowData.roles).split(',').map(r => r.trim().toLowerCase()) : [];
                const validRoles = roles.map(r => roleMapping[r]).filter(Boolean);

                if (validRoles.length === 0) {
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason: `Role tidak valid: "${rowData.roles}". Gunakan "guru kelas" atau "guru bidang studi"` });
                    continue;
                }

                const [existingEmail] = await connection.execute('SELECT id_user FROM user WHERE email_sekolah = ?', [String(rowData.email_sekolah).trim()]);
                const [existingNiy] = rowData.niy ? await connection.execute('SELECT id_guru FROM guru WHERE niy = ?', [String(rowData.niy).trim()]) : [[]];
                const [existingNuptk] = rowData.nuptk ? await connection.execute('SELECT id_guru FROM guru WHERE nuptk = ?', [String(rowData.nuptk).trim()]) : [[]];

                if (existingEmail.length > 0 || existingNiy.length > 0 || existingNuptk.length > 0) {
                    let reason = 'Data duplikat';
                    if (existingEmail.length > 0) reason = 'Email sudah terdaftar';
                    else if (existingNiy.length > 0) reason = 'NIY sudah terdaftar';
                    else if (existingNuptk.length > 0) reason = 'NUPTK sudah terdaftar';
                    skipped.push({ row: rowNum, nama: rowData.nama_lengkap, reason });
                    continue;
                }

                const password = rowData.password || 'sekolah123';
                const userData = { email_sekolah: String(rowData.email_sekolah).trim(), password, nama_lengkap: String(rowData.nama_lengkap).trim() };
                const guruData = {
                    niy: rowData.niy ? String(rowData.niy).trim() : null,
                    nuptk: rowData.nuptk ? String(rowData.nuptk).trim() : null,
                    tempat_lahir: String(rowData.tempat_lahir).trim(),
                    tanggal_lahir,
                    jenis_kelamin: rowData.jenis_kelamin,
                    alamat: rowData.alamat ? String(rowData.alamat).trim() : null,
                    no_telepon: rowData.no_telepon ? String(rowData.no_telepon).trim() : null
                };

                await guruModel.createGuru(userData, guruData, validRoles, connection);
                processedCount++;

            } catch (rowErr) {
                skipped.push({ row: rowNum, nama: rowData.nama_lengkap || '-', reason: rowErr.message || 'Gagal memproses data' });
            }
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: skipped.length > 0 ? `Import selesai: ${processedCount} berhasil, ${skipped.length} dilewati` : `Import berhasil: ${processedCount} data guru ditambahkan`,
            total: processedCount,
            skipped
        });

    } catch (err) {
        await connection.rollback();
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Error importGuru:', err);
        res.status(500).json({ success: false, message: 'Gagal mengimport data guru' });
    } finally {
        connection.release();
    }
};