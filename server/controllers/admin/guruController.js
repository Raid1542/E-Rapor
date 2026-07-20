/**
 * Nama File: guruController.js
 * Fungsi: Controller CRUD guru + import Excel
 * UPDATE: ✅ Import sekarang skip error per baris (tidak stop seluruh proses)
 *           ✅ Fix: Menambahkan helper URL absolut agar foto profil muncul di frontend
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const XLSX = require('xlsx');
const guruModel = require('../../models/admin/guruModel');
const db = require('../../config/db');
const fs = require('fs');

// ==========================================================================
// HELPER: Mengubah path relatif menjadi URL absolut agar bisa dibaca frontend
// ==========================================================================
const getFullPhotoUrl = (fotoPath) => {
    if (!fotoPath) return null;
    // Jika sudah URL lengkap (http/https), kembalikan apa adanya
    if (fotoPath.startsWith('http')) return fotoPath;
    // Jika path dimulai dengan '/uploads/', tambahkan base URL server backend
    if (fotoPath.startsWith('/uploads/')) {
        return `http://localhost:${process.env.PORT || 5000}${fotoPath}`;
    }
    // Jika hanya nama file atau path tanpa slash di awal, tambahkan base URL dan '/uploads/'
    return `http://localhost:${process.env.PORT || 5000}/uploads/${fotoPath.replace(/^\/+/, '')}`;
};

// GET: Ambil daftar semua guru dengan data profil dan role
const getGuru = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT u.id_user, u.nama_lengkap, u.email_sekolah, u.status,
                    g.niy, g.nuptk, g.tempat_lahir, g.tanggal_lahir, g.jenis_kelamin,
                    g.alamat, g.no_telepon, g.foto_path, GROUP_CONCAT(ur.role) AS roles
            FROM user u
            INNER JOIN guru g ON u.id_user = g.user_id
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role IN ('guru_kelas', 'guru_bidang_studi')
            GROUP BY u.id_user ORDER BY u.nama_lengkap ASC
        `);
        
        const guruList = rows.map(row => ({
            ...row, 
            roles: row.roles ? row.roles.split(',') : [], 
            // PERBAIKAN: Gunakan helper untuk mengubah path jadi URL lengkap
            profileImage: getFullPhotoUrl(row.foto_path) 
        }));
        
        res.json({ success: true, data: guruList });
    } catch (err) {
        console.error('Error get guru:', err);
        res.status(500).json({ message: 'Gagal mengambil data guru' });
    }
};

// GET: Ambil detail guru berdasarkan ID
const getGuruById = async (req, res) => {
    try {
        const { id } = req.params;
        const guru = await guruModel.getGuruById(id);
        if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });
        
        res.json({ 
            success: true, 
            data: {
                ...guru,
                // PERBAIKAN: Pastikan profileImage di detail juga URL lengkap
                profileImage: getFullPhotoUrl(guru.foto_path || guru.profileImage)
            } 
        });
    } catch (err) {
        console.error('Error get guru by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail guru' });
    }
};

// POST: Tambah guru baru dengan data profil dan role (password default: sekolah123)
const tambahGuru = async (req, res) => {
    const { nama_lengkap, email_sekolah, roles = [], niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon } = req.body;

    // Validasi input wajib
    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });

    // Validasi dan normalisasi roles
    if (!Array.isArray(roles)) return res.status(400).json({ message: 'Roles harus berupa array' });
    const normalizedRoles = roles.map(role => (typeof role === 'string' ? role.trim().toLowerCase() : '')).filter(Boolean);
    const allowedRoles = ['guru_kelas', 'guru_bidang_studi'];
    const validRoles = normalizedRoles.filter(role => allowedRoles.includes(role));
    if (validRoles.length === 0) return res.status(400).json({ message: 'Pilih minimal satu hak akses yang valid' });

    try {
        const DEFAULT_PASSWORD = process.env.DEFAULT_GURU_PASSWORD || 'sekolah123';
        const userData = { email_sekolah, password: DEFAULT_PASSWORD, nama_lengkap, status: 'aktif' };
        const guruData = { niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon };
        const userId = await guruModel.createGuru(userData, guruData, validRoles);
        res.status(201).json({ message: 'Guru berhasil ditambahkan', id: userId });
    } catch (err) {
        console.error('Error tambah guru:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let duplicateField = 'Data';
            if (err.sqlMessage) {
                if (err.sqlMessage.includes('email_sekolah')) duplicateField = 'Email';
                else if (err.sqlMessage.includes('niy')) duplicateField = 'NIY';
                else if (err.sqlMessage.includes('nuptk')) duplicateField = 'NUPTK';
            }
            return res.status(400).json({ message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.` });
        }
        res.status(500).json({ message: 'Gagal menambah guru' });
    }
};

// PUT: Update data guru berdasarkan ID
const editGuru = async (req, res) => {
    const { id } = req.params;
    const { email_sekolah, nama_lengkap, status, niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, roles, password } = req.body;

    // Validasi input wajib
    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });

    // Validasi roles
    if (!Array.isArray(roles) || roles.length === 0) return res.status(400).json({ message: 'Role wajib dipilih minimal satu' });
    const normalizedRoles = roles.map(role => (typeof role === 'string' ? role.trim().toLowerCase() : '')).filter(Boolean);
    const allowedRoles = ['guru_kelas', 'guru_bidang_studi'];
    const validRoles = normalizedRoles.filter(role => allowedRoles.includes(role));
    if (validRoles.length === 0) return res.status(400).json({ message: 'Pilih role yang valid (guru kelas / guru bidang studi)' });

    try {
        const userData = { email_sekolah, nama_lengkap, password, status };
        const guruData = { niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon };
        await guruModel.updateGuru(id, userData, guruData, roles);
        res.json({ message: 'Data guru berhasil diperbarui' });
    } catch (err) {
        console.error('Error edit guru:', err);
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let duplicateField = 'Data';
            if (err.sqlMessage) {
                if (err.sqlMessage.includes('email_sekolah')) duplicateField = 'Email';
                else if (err.sqlMessage.includes('niy')) duplicateField = 'NIY';
                else if (err.sqlMessage.includes('nuptk')) duplicateField = 'NUPTK';
            }
            return res.status(400).json({ message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.` });
        }
        res.status(500).json({ message: 'Gagal memperbarui data guru' });
    }
};

// ✅ PERBAIKAN: Import data guru dari file Excel - skip error per baris
const importGuru = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) return res.status(400).json({ message: 'File Excel diperlukan' });

        // Baca file Excel
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'File Excel kosong' });
        }

        // Validasi kolom wajib di baris pertama
        const requiredColumns = ['email_sekolah', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'roles'];
        const firstRow = data[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        if (missingColumns.length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                message: `Format tidak valid: Kolom "${missingColumns.join(', ')}" tidak ditemukan di template` 
            });
        }

        await connection.beginTransaction();
        const skipped = [];
        let processedCount = 0;
        
        // Role mapping untuk normalisasi
        const roleMapping = {
            'guru kelas': 'guru_kelas', 'guru_kelas': 'guru_kelas', 'gurukelas': 'guru_kelas',
            'guru bidang studi': 'guru_bidang_studi', 'guru_bidang_studi': 'guru_bidang_studi',
            'gurubidangstudi': 'guru_bidang_studi', 'guru mapel': 'guru_bidang_studi', 'guru_mapel': 'guru_bidang_studi',
        };

        // Proses setiap baris - skip jika ada error
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;

            try {
                // Validasi data lengkap
                if (!row.email_sekolah || !row.nama_lengkap || !row.tempat_lahir || !row.tanggal_lahir || !row.jenis_kelamin) {
                    skipped.push({
                        row: rowNum, 
                        nama: row.nama_lengkap || '-', 
                        reason: 'Data tidak lengkap (nama, email, tempat lahir, tanggal lahir, jenis kelamin wajib diisi)'
                    });
                    continue;
                }

                // Validasi format email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(row.email_sekolah)) {
                    skipped.push({
                        row: rowNum, 
                        nama: row.nama_lengkap, 
                        reason: `Format email "${row.email_sekolah}" tidak valid`
                    });
                    continue;
                }

                // Konversi tanggal lahir
                let tanggal_lahir = row.tanggal_lahir;
                if (typeof tanggal_lahir === 'number') {
                    const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
                    if (!isNaN(date.getTime())) {
                        tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    } else {
                        skipped.push({
                            row: rowNum, 
                            nama: row.nama_lengkap, 
                            reason: 'Format tanggal lahir tidak valid'
                        });
                        continue;
                    }
                } else if (typeof tanggal_lahir === 'string') {
                    tanggal_lahir = tanggal_lahir.trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                        skipped.push({
                            row: rowNum, 
                            nama: row.nama_lengkap, 
                            reason: 'Format tanggal lahir harus YYYY-MM-DD'
                        });
                        continue;
                    }
                } else {
                    skipped.push({
                        row: rowNum, 
                        nama: row.nama_lengkap, 
                        reason: 'Tanggal lahir wajib diisi'
                    });
                    continue;
                }

                // Validasi jenis kelamin
                if (!['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
                    skipped.push({
                        row: rowNum, 
                        nama: row.nama_lengkap, 
                        reason: `Jenis kelamin harus "Laki-laki" atau "Perempuan", ditemukan: "${row.jenis_kelamin}"`
                    });
                    continue;
                }

                // Parsing dan normalisasi role
                const roles = row.roles ? row.roles.toString().split(',').map(r => r.trim().toLowerCase()) : [];
                const validRoles = roles.map(r => roleMapping[r]).filter(Boolean);
                if (validRoles.length === 0) {
                    skipped.push({
                        row: rowNum, 
                        nama: row.nama_lengkap, 
                        reason: `Role tidak valid: "${row.roles}". Gunakan "guru kelas" atau "guru bidang studi"`
                    });
                    continue;
                }

                // Cek duplikasi
                const [existingEmail] = await connection.execute('SELECT id_user FROM user WHERE email_sekolah = ?', [row.email_sekolah]);
                const [existingNiy] = row.niy ? await connection.execute('SELECT id_guru FROM guru WHERE niy = ?', [row.niy]) : [[]];
                const [existingNuptk] = row.nuptk ? await connection.execute('SELECT id_guru FROM guru WHERE nuptk = ?', [row.nuptk]) : [[]];

                if (existingEmail.length > 0 || existingNiy.length > 0 || existingNuptk.length > 0) {
                    let reason = 'Data duplikat';
                    if (existingEmail.length > 0) reason = 'Email sudah terdaftar';
                    else if (existingNiy.length > 0) reason = 'NIY sudah terdaftar';
                    else if (existingNuptk.length > 0) reason = 'NUPTK sudah terdaftar';
                    
                    skipped.push({
                        row: rowNum, 
                        nama: row.nama_lengkap, 
                        reason: reason
                    });
                    continue;
                }

                // Insert data guru
                const password = row.password || 'sekolah123';
                const userData = { email_sekolah: row.email_sekolah, password, nama_lengkap: row.nama_lengkap };
                const guruData = {
                    niy: row.niy || null, nuptk: row.nuptk || null, tempat_lahir: row.tempat_lahir, tanggal_lahir,
                    jenis_kelamin: row.jenis_kelamin, alamat: row.alamat || null, no_telepon: row.no_telepon || null
                };
                await guruModel.createGuru(userData, guruData, validRoles, connection);
                processedCount++;

            } catch (rowErr) {
                // Tangani error tak terduga per baris
                skipped.push({
                    row: rowNum, 
                    nama: row.nama_lengkap || '-', 
                    reason: rowErr.message || 'Gagal memproses data'
                });
            }
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        // Response dengan info skipped
        res.json({
            success: true,
            message: skipped.length > 0 
                ? `Import selesai: ${processedCount} berhasil, ${skipped.length} dilewati` 
                : `Import berhasil: ${processedCount} data guru ditambahkan`,
            total: processedCount,
            skipped: skipped
        });

    } catch (err) {
        await connection.rollback();
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Import guru error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message || 'Gagal mengimport data guru' 
        });
    } finally {
        connection.release();
    }
};

module.exports = { getGuru, getGuruById, tambahGuru, editGuru, importGuru };