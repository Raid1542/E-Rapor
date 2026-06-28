const XLSX = require('xlsx');
const guruModel = require('../../models/admin/guruModel');
const db = require('../../config/db');
const fs = require('fs');

const getGuru = async (req, res) => {
    try {
        const [rows] = await db.execute(`
        SELECT 
            u.id_user,
            u.nama_lengkap,
            u.email_sekolah,
            u.status,
            g.niy,
            g.nuptk,
            g.tempat_lahir,
            g.tanggal_lahir,
            g.jenis_kelamin,
            g.alamat,
            g.no_telepon,
            g.foto_path,
            GROUP_CONCAT(ur.role) AS roles
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
            profileImage: row.foto_path || null,
        }));

        res.json({ success: true, data: guruList });
    } catch (err) {
        console.error('Error get guru:', err);
        res.status(500).json({ message: 'Gagal mengambil data guru' });
    }
};

const getGuruById = async (req, res) => {
    try {
        const { id } = req.params;
        const guru = await guruModel.getGuruById(id);
        if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });
        res.json({ success: true, data: guru });
    } catch (err) {
        console.error('Error get guru by ID:', err);
        res.status(500).json({ message: 'Gagal mengambil detail guru' });
    }
};

const tambahGuru = async (req, res) => {
    const {
        nama_lengkap,
        email_sekolah,
        roles = [],
        niy,
        nuptk,
        tempat_lahir,
        tanggal_lahir,
        jenis_kelamin,
        alamat,
        no_telepon,
    } = req.body;

    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });


    if (!Array.isArray(roles)) {
        return res.status(400).json({ message: 'Roles harus berupa array' });
    }
    const normalizedRoles = roles
        .map(role => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
        .filter(Boolean);
    const allowedRoles = ['guru_kelas', 'guru_bidang_studi'];
    const validRoles = normalizedRoles.filter(role => allowedRoles.includes(role));

    if (validRoles.length === 0) {
        return res.status(400).json({ message: 'Pilih minimal satu hak akses yang valid' });
    }

    try {
        const DEFAULT_PASSWORD = process.env.DEFAULT_GURU_PASSWORD || 'sekolah123';
        const userData = {
            email_sekolah,
            password: DEFAULT_PASSWORD,
            nama_lengkap,
            status: 'aktif',
        };
        const guruData = {
            niy,
            nuptk,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            alamat,
            no_telepon,
        };

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
            return res.status(400).json({
                message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.`
            });
        }

        res.status(500).json({ message: 'Gagal menambah guru' });
    }
};

const editGuru = async (req, res) => {
    const { id } = req.params;
    const {
        email_sekolah,
        nama_lengkap,
        status,
        niy,
        nuptk,
        tempat_lahir,
        tanggal_lahir,
        jenis_kelamin,
        alamat,
        no_telepon,
        roles,
        password,
    } = req.body;

    if (!nama_lengkap) return res.status(400).json({ message: 'Nama lengkap wajib diisi' });
    if (!email_sekolah) return res.status(400).json({ message: 'Email sekolah wajib diisi' });
    if (!tempat_lahir) return res.status(400).json({ message: 'Tempat lahir wajib diisi' });
    if (!tanggal_lahir) return res.status(400).json({ message: 'Tanggal lahir wajib diisi' });
    if (!jenis_kelamin) return res.status(400).json({ message: 'Jenis kelamin wajib dipilih' });


    if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: 'Role wajib dipilih minimal satu' });
    }
    const normalizedRoles = roles
        .map(role => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
        .filter(Boolean);
    const allowedRoles = ['guru_kelas', 'guru_bidang_studi'];
    const validRoles = normalizedRoles.filter(role => allowedRoles.includes(role));

    if (validRoles.length === 0) {
        return res.status(400).json({ message: 'Pilih role yang valid (guru kelas / guru bidang studi)' });
    }

    try {
        const userData = { email_sekolah, nama_lengkap, password, status };
        const guruData = {
            niy,
            nuptk,
            tempat_lahir,
            tanggal_lahir,
            jenis_kelamin,
            alamat,
            no_telepon,
        };

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
            return res.status(400).json({
                message: `${duplicateField} sudah terdaftar. Silakan gunakan data yang berbeda.`
            });
        }

        res.status(500).json({ message: 'Gagal memperbarui data guru' });
    }
};

const importGuru = async (req, res) => {
    const connection = await db.getConnection();
    try {
        if (!req.file) return res.status(400).json({ message: 'File Excel diperlukan' });

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) throw new Error('File Excel kosong');

        const requiredColumns = ['email_sekolah', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'roles'];
        const firstRow = data[0];
        for (const col of requiredColumns) {
            if (!(col in firstRow)) {
                throw new Error(`Format tidak valid: Kolom "${col}" tidak ditemukan di template`);
            }
        }

        await connection.beginTransaction();

        const duplicates = [];
        
        // ✅ PERBAIKAN: Tambahkan role mapping
        const roleMapping = {
            'guru kelas': 'guru_kelas',
            'guru_kelas': 'guru_kelas',
            'gurukelas': 'guru_kelas',
            'guru bidang studi': 'guru_bidang_studi',
            'guru_bidang_studi': 'guru_bidang_studi',
            'gurubidangstudi': 'guru_bidang_studi',
            'guru mapel': 'guru_bidang_studi',
            'guru_mapel': 'guru_bidang_studi',
        };

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;

            if (!row.email_sekolah || !row.nama_lengkap || !row.tempat_lahir || !row.tanggal_lahir || !row.jenis_kelamin) {
                throw new Error(`Baris ${rowNum}: Data tidak lengkap. Field nama, email, tempat lahir, tanggal lahir, dan jenis kelamin wajib diisi`);
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email_sekolah)) {
                throw new Error(`Baris ${rowNum}: Format email "${row.email_sekolah}" tidak valid`);
            }

            let tanggal_lahir = row.tanggal_lahir;
            if (typeof tanggal_lahir === 'number') {
                const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) {
                    tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                } else {
                    throw new Error(`Baris ${rowNum}: Format tanggal lahir tidak valid`);
                }
            } else if (typeof tanggal_lahir === 'string') {
                tanggal_lahir = tanggal_lahir.trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) {
                    throw new Error(`Baris ${rowNum}: Format tanggal lahir harus YYYY-MM-DD`);
                }
            } else {
                throw new Error(`Baris ${rowNum}: Tanggal lahir wajib diisi`);
            }

            if (!['Laki-laki', 'Perempuan'].includes(row.jenis_kelamin)) {
                throw new Error(`Baris ${rowNum}: Jenis kelamin harus "Laki-laki" atau "Perempuan"`);
            }

            // ✅ PERBAIKAN: Parsing role dengan mapping
            const roles = row.roles ? row.roles.toString().split(',').map(r => r.trim().toLowerCase()) : [];
            const validRoles = roles.map(r => roleMapping[r]).filter(Boolean);
            
            if (validRoles.length === 0) {
                throw new Error(`Baris ${rowNum}: Role harus berisi "guru kelas" atau "guru bidang studi". Nilai yang Anda masukkan: "${row.roles}"`);
            }

            const [existingEmail] = await connection.execute('SELECT id_user FROM user WHERE email_sekolah = ?', [row.email_sekolah]);
            const [existingNiy] = row.niy ? await connection.execute('SELECT id_guru FROM guru WHERE niy = ?', [row.niy]) : [[]];
            const [existingNuptk] = row.nuptk ? await connection.execute('SELECT id_guru FROM guru WHERE nuptk = ?', [row.nuptk]) : [[]];

            if (existingEmail.length > 0 || existingNiy.length > 0 || existingNuptk.length > 0) {
                duplicates.push({
                    row: rowNum,
                    nama: row.nama_lengkap,
                    email: row.email_sekolah,
                    reason: existingEmail.length > 0 ? 'Email sudah terdaftar' :
                        existingNiy.length > 0 ? 'NIY sudah terdaftar' : 'NUPTK sudah terdaftar'
                });
                continue;
            }

            const password = row.password || 'sekolah123';
            const userData = {
                email_sekolah: row.email_sekolah,
                password,
                nama_lengkap: row.nama_lengkap,
            };
            const guruData = {
                niy: row.niy || null,
                nuptk: row.nuptk || null,
                tempat_lahir: row.tempat_lahir,
                tanggal_lahir,
                jenis_kelamin: row.jenis_kelamin,
                alamat: row.alamat || null,
                no_telepon: row.no_telepon || null,
            };

            await guruModel.createGuru(userData, guruData, validRoles, connection);
        }

        await connection.commit();
        fs.unlinkSync(req.file.path);

        if (duplicates.length > 0) {
            return res.status(200).json({
                message: `Import selesai: ${data.length - duplicates.length} data berhasil, ${duplicates.length} data dilewati (duplikat)`,
                success: data.length - duplicates.length,
                skipped: duplicates,
            });
        }

        res.json({ message: 'Import data guru berhasil', total: data.length });

    } catch (err) {
        await connection.rollback();
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Import guru error:', err);

        if (err.message && (err.message.includes('Format') || err.message.includes('Baris'))) {
            return res.status(400).json({ message: err.message });
        }

        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(400).json({ message: 'Import gagal: Data duplikat ditemukan (Email/NIY/NUPTK sudah terdaftar)' });
        }

        res.status(500).json({ message: err.message || 'Gagal mengimport data guru' });
    } finally {
        connection.release();
    }
};

module.exports = {
    getGuru,
    getGuruById,
    tambahGuru,
    editGuru,
    importGuru,
};