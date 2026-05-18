/**
 * Nama File: adminController.js
 * Fungsi: Mengelola seluruh operasi CRUD dan logika bisnis untuk admin,
 *         termasuk pengelolaan data sekolah, guru, siswa, kelas, mapel,
 *         ekstrakurikuler, tahun ajaran, pembelajaran, dan arsip rapor.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const XLSX = require('xlsx');
const userModel = require('../models/userModel');
const guruModel = require('../models/guruModel');
const sekolahModel = require('../models/sekolahModel');
const tahunAjaranModel = require('../models/tahunAjaranModel');
const siswaModel = require('../models/siswaModel');
const kelasModel = require('../models/kelasModel');
const mapelModel = require('../models/mapelModel');
const ekstrakurikulerModel = require('../models/ekstrakurikulerModel');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const bcrypt = require('bcrypt');

// ============== ADMIN ==============
const getAdmin = async (req, res) => {
  try {
    const rows = await userModel.getAdminList();
    const adminList = rows.map(row => {
      let tanggal_lahir = '';
      if (row.tanggal_lahir) {
        if (row.tanggal_lahir instanceof Date) {
          const d = row.tanggal_lahir;
          tanggal_lahir = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof row.tanggal_lahir === 'string') {
          tanggal_lahir = row.tanggal_lahir.split('T')[0];
        }
      }
      return {
        id: row.id,
        nama: row.nama,
        email: row.email,
        statusAdmin: row.statusAdmin,
        niy: row.niy || '',
        nuptk: row.nuptk || '',
        tempat_lahir: row.tempat_lahir || '',
        tanggal_lahir: tanggal_lahir,
        jenis_kelamin: row.jenis_kelamin || '',
        alamat: row.alamat || '',
        no_telepon: row.no_telepon || '',
        profileImage: row.foto_path || null,
      };
    });
    res.json({ success: true, data: adminList });
  } catch (err) {
    console.error('Error get admin:', err);
    res.status(500).json({ message: 'Gagal mengambil data admin' });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await userModel.findById(id);
    if (!admin)
      return res.status(404).json({ message: 'Admin tidak ditemukan' });
    const [guruRows] = await db.execute(
      'SELECT niy, nuptk, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_telepon, foto_path FROM guru WHERE user_id = ?',
      [id]
    );
    const guru = guruRows[0] || {};
    res.json({
      success: true,
      data: {
        id: admin.id_user,
        nama: admin.nama_lengkap,
        email: admin.email_sekolah,
        statusAdmin: admin.status === 'aktif' ? 'AKTIF' : 'NONAKTIF',
        niy: guru.niy || '',
        nuptk: guru.nuptk || '',
        jenis_kelamin: guru.jenis_kelamin || '',
        alamat: guru.alamat || '',
        no_telepon: guru.no_telepon || '',
        tempat_lahir: guru.tempat_lahir || '',
        tanggal_lahir: guru.tanggal_lahir || null,
        profileImage: guru.foto_path || null,
      },
    });
  } catch (err) {
    console.error('Error get admin by ID:', err);
    res.status(500).json({ message: 'Gagal mengambil detail admin' });
  }
};

const tambahAdmin = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const id_user = await userModel.createAdmin(req.body, connection);
    await connection.commit();
    res
      .status(201)
      .json({ message: 'Admin berhasil ditambahkan', id: id_user });
  } catch (err) {
    await connection.rollback();
    console.error('Error tambah admin:', err.message);
    res.status(500).json({ message: 'Gagal menambah admin' });
  } finally {
    connection.release();
  }
};

const editAdmin = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    await userModel.updateAdmin(id, req.body, connection);
    await connection.commit();
    res.json({ message: 'Data admin berhasil diperbarui' });
  } catch (err) {
    await connection.rollback();
    console.error('Error edit admin:', err.message);
    res.status(500).json({ message: 'Gagal memperbarui data admin' });
  } finally {
    connection.release();
  }
};

const gantiPasswordAdmin = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // Dari middleware authenticate (JWT)

  // Validasi input
  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: 'Kata sandi lama dan baru wajib diisi' });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: 'Kata sandi baru minimal 8 karakter' });
  }

  try {
    // 1. Ambil user dari database
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // 2. Verifikasi password lama
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Kata sandi lama salah' });
    }

    // 3. Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password di database
    const success = await userModel.updatePassword(userId, hashedPassword);
    if (!success) {
      return res.status(500).json({ message: 'Gagal memperbarui password' });
    }

    return res.json({ message: 'Kata sandi berhasil diubah' });
  } catch (err) {
    console.error('Error ganti password admin:', err);
    return res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat mengganti kata sandi' });
  }
};

// ============== GURU ==============
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
      WHERE ur.role IN ('guru kelas', 'guru bidang studi')
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
  if (!email_sekolah || !nama_lengkap) {
    return res.status(400).json({ message: 'Email dan nama wajib diisi' });
  }
  if (!Array.isArray(roles)) {
    return res.status(400).json({ message: 'Roles harus berupa array' });
  }
  const normalizedRoles = roles
    .map(role => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
    .filter(Boolean);
  const allowedRoles = ['guru kelas', 'guru bidang studi'];
  const validRoles = normalizedRoles.filter(role =>
    allowedRoles.includes(role)
  );
  if (validRoles.length === 0) {
    return res
      .status(400)
      .json({ message: 'Pilih minimal satu hak akses yang valid' });
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
    res.status(500).json({ message: 'Gagal memperbarui data guru' });
  }
};

const importGuru = async (req, res) => {
  const connection = await db.getConnection();
  try {
    if (!req.file)
      return res.status(400).json({ message: 'File Excel diperlukan' });
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (data.length === 0) throw new Error('File Excel kosong');
    const requiredFields = ['email_sekolah', 'nama_lengkap'];
    const firstRow = data[0];
    for (const field of requiredFields) {
      if (!(field in firstRow))
        throw new Error(`Kolom wajib "${field}" tidak ditemukan`);
    }
    await connection.beginTransaction();
    for (const row of data) {
      if (!row.email_sekolah || !row.nama_lengkap)
        throw new Error(`Data tidak lengkap`);
      let tanggal_lahir = row.tanggal_lahir || '';
      if (typeof tanggal_lahir === 'number') {
        const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
          tanggal_lahir = null;
        }
      } else if (typeof tanggal_lahir === 'string') {
        tanggal_lahir = tanggal_lahir.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) tanggal_lahir = null;
      } else {
        tanggal_lahir = null;
      }
      const roles = row.roles
        ? row.roles
            .toString()
            .split(',')
            .map(r => r.trim())
        : ['guru kelas'];
      const validRoles = roles.filter(r =>
        ['guru kelas', 'guru bidang studi'].includes(r)
      );
      const password = row.password || 'sekolah123!';
      const userData = {
        email_sekolah: row.email_sekolah,
        password,
        nama_lengkap: row.nama_lengkap,
      };
      const guruData = {
        niy: row.niy || null,
        nuptk: row.nuptk || null,
        tempat_lahir: row.tempat_lahir || null,
        tanggal_lahir,
        jenis_kelamin: row.jenis_kelamin || 'Laki-laki',
        alamat: row.alamat || null,
        no_telepon: row.no_telepon || null,
      };
      await guruModel.createGuru(userData, guruData, validRoles, connection);
    }
    await connection.commit();
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Import data guru berhasil', total: data.length });
  } catch (err) {
    await connection.rollback();
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Import guru error:', err);
    res
      .status(500)
      .json({ message: err.message || 'Gagal mengimport data guru' });
  } finally {
    connection.release();
  }
};

// ============== SEKOLAH ==============
const getSekolah = async (req, res) => {
  try {
    const sekolah = await sekolahModel.getSekolah();
    if (!sekolah)
      return res.status(404).json({ message: 'Data sekolah belum diatur' });
    res.json({ success: true, data: sekolah });
  } catch (err) {
    console.error('Error get sekolah:', err);
    res.status(500).json({ message: 'Gagal mengambil data sekolah' });
  }
};

const editSekolah = async (req, res) => {
  try {
    const {
      nama_sekolah,
      npsn,
      nss,
      alamat,
      kode_pos,
      telepon,
      email,
      website,
      kepala_sekolah,
      niy_kelapa_sekolah,
    } = req.body;
    const data = {};
    if (nama_sekolah !== undefined) data.nama_sekolah = nama_sekolah;
    if (npsn !== undefined) data.npsn = npsn;
    if (nss !== undefined) data.nss = nss;
    if (alamat !== undefined) data.alamat = alamat;
    if (kode_pos !== undefined) data.kode_pos = kode_pos;
    if (telepon !== undefined) data.telepon = telepon;
    if (email !== undefined) data.email = email;
    if (website !== undefined) data.website = website;
    if (kepala_sekolah !== undefined) data.kepala_sekolah = kepala_sekolah;
    if (niy_kelapa_sekolah !== undefined)
      data.niy_kepala_sekolah = niy_kelapa_sekolah;
    await sekolahModel.updateSekolah(data);
    res.json({ message: 'Data sekolah berhasil diperbarui' });
  } catch (err) {
    console.error('Error update sekolah:', err);
    res.status(500).json({ message: 'Gagal memperbarui data sekolah' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'File logo diperlukan' });
    const logoPath = `/uploads/${req.file.filename}`;
    const [rows] = await db.execute('SELECT id FROM sekolah WHERE id = 1');
    if (rows.length > 0) {
      await db.execute('UPDATE sekolah SET logo_path = ? WHERE id = 1', [
        logoPath,
      ]);
    } else {
      await db.execute(
        `
                INSERT INTO sekolah (id, nama_sekolah, npsn, nss, alamat, kode_pos, telepon, email, website, kepala_sekolah, niy_kepala_sekolah, logo_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        [
          1,
          'SDIT Ulil Albab',
          '0000000000',
          '00000000',
          'Alamat Sekolah',
          '00000',
          '0000000000',
          'info@sekolah.sch.id',
          'https://sekolah.sch.id',
          'Kepala Sekolah',
          '0000000000000000',
          logoPath,
        ]
      );
    }
    res.json({ message: 'Logo berhasil diupdate', logoPath });
  } catch (err) {
    console.error('Error upload logo:', err);
    res.status(500).json({ message: 'Gagal mengupload logo' });
  }
};

// ============== SISWA ==============
const getSiswa = async (req, res) => {
  try {
    const { tahun_ajaran_id } = req.query;
    if (!tahun_ajaran_id) {
      return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
    }
    const siswaList = await siswaModel.getSiswaByTahunAjaran(tahun_ajaran_id);
    res.json({ success: true, data: siswaList });
  } catch (err) {
    console.error('Error get siswa:', err);
    res.status(500).json({ message: 'Gagal mengambil data siswa' });
  }
};

const getSiswaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [activeTA] = await db.execute(`
            SELECT id_tahun_ajaran 
            FROM tahun_ajaran 
            WHERE status = 'aktif' 
            LIMIT 1
        `);
    const taId = activeTA[0]?.id_tahun_ajaran;
    const siswa = await siswaModel.getSiswaById(id, taId);
    if (!siswa)
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    res.json({ success: true, data: siswa });
  } catch (err) {
    console.error('Error get siswa by ID:', err);
    res.status(500).json({ message: 'Gagal mengambil detail siswa' });
  }
};

const tambahSiswa = async (req, res) => {
  try {
    const {
      nis,
      nisn,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      kelas_id,
      tahun_ajaran_id,
    } = req.body;
    if (tahun_ajaran_id != req.tahunAjaranAktifId) {
      return res.status(403).json({
        message: 'Operasi hanya diperbolehkan di tahun ajaran aktif.',
      });
    }
    const parsedKelasId = Number(kelas_id);
    if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
      return res.status(400).json({ message: 'kelas_id tidak valid' });
    }
    const siswaId = await siswaModel.createSiswa(
      {
        nis,
        nisn,
        nama_lengkap,
        tempat_lahir: tempat_lahir || null,
        tanggal_lahir: tanggal_lahir || null,
        jenis_kelamin,
        alamat: alamat || null,
        kelas_id: parsedKelasId,
        status: 'aktif',
      },
      tahun_ajaran_id
    );
    res
      .status(201)
      .json({
        success: true,
        message: 'Data siswa berhasil ditambahkan',
        id: siswaId,
      });
  } catch (err) {
    console.error('Error tambah siswa:', err);
    res.status(500).json({ message: 'Gagal menambah data siswa' });
  }
};

const editSiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nis,
      nisn,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      kelas_id,
      status,
    } = req.body;
    const tahunAjaranId = req.tahunAjaranAktifId;
    if (!tahunAjaranId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const [siswaRows] = await db.execute(
      `
            SELECT sk.tahun_ajaran_id 
            FROM siswa s
            JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE s.id_siswa = ? AND sk.tahun_ajaran_id = ?
        `,
      [id, tahunAjaranId]
    );
    if (siswaRows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Siswa tidak ditemukan di tahun ajaran aktif' });
    }
    const parsedKelasId = Number(kelas_id);
    if (isNaN(parsedKelasId) || parsedKelasId <= 0) {
      return res.status(400).json({ message: 'kelas_id tidak valid' });
    }
    const updated = await siswaModel.updateSiswa(
      id,
      {
        nis,
        nisn,
        nama_lengkap,
        tempat_lahir: tempat_lahir || null,
        tanggal_lahir: tanggal_lahir || null,
        jenis_kelamin,
        alamat: alamat || null,
        kelas_id: parsedKelasId,
        status: status || 'aktif',
      },
      tahunAjaranId
    );
    if (!updated) {
      return res.status(404).json({ message: 'Gagal memperbarui data siswa' });
    }
    res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
  } catch (err) {
    console.error('Error edit siswa:', err);
    res.status(500).json({ message: 'Gagal memperbarui data siswa' });
  }
};

const importSiswa = async (req, res) => {
  const connection = await db.getConnection();
  try {
    if (!req.file)
      return res.status(400).json({ message: 'File Excel diperlukan' });
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (data.length === 0) throw new Error('File Excel kosong');
    const tahunAjaranId = req.tahunAjaranAktifId;
    if (!tahunAjaranId) {
      throw new Error('Tidak ada tahun ajaran aktif');
    }
    await connection.beginTransaction();
    for (const row of data) {
      if (!row.nis || !row.nisn || !row.nama_lengkap || !row.kelas_id) {
        throw new Error(
          'Kolom wajib (nis, nisn, nama_lengkap, kelas_id) tidak lengkap'
        );
      }
      let tanggal_lahir = row.tanggal_lahir || null;
      if (typeof tanggal_lahir === 'number') {
        const date = new Date((tanggal_lahir - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          tanggal_lahir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
          tanggal_lahir = null;
        }
      } else if (typeof tanggal_lahir === 'string') {
        tanggal_lahir = tanggal_lahir.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal_lahir)) tanggal_lahir = null;
      }
      const [kelasRows] = await connection.execute(
        'SELECT id_kelas FROM kelas WHERE nama_kelas = ?',
        [String(row.kelas_id).trim()]
      );
      if (kelasRows.length === 0) {
        throw new Error(`Kelas "${row.kelas_id}" tidak ditemukan`);
      }
      const kelasId = kelasRows[0].id_kelas;
      await siswaModel.createSiswa(
        {
          nis: row.nis,
          nisn: row.nisn,
          nama_lengkap: row.nama_lengkap,
          tempat_lahir: row.tempat_lahir || null,
          tanggal_lahir,
          jenis_kelamin: row.jenis_kelamin || 'Laki-laki',
          alamat: row.alamat || null,
          kelas_id: kelasId,
          status: 'aktif',
        },
        tahunAjaranId,
        connection
      );
    }
    await connection.commit();
    fs.unlinkSync(req.file.path);
    res.json({ message: 'Import data siswa berhasil', total: data.length });
  } catch (err) {
    await connection.rollback();
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Import siswa error:', err);
    res
      .status(500)
      .json({ message: err.message || 'Gagal mengimport data siswa' });
  } finally {
    connection.release();
  }
};

// ============== TAHUN AJARAN ==============
const getTahunAjaran = async (req, res) => {
  try {
    const data = await tahunAjaranModel.getAllTahunAjaran();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error get tahun ajaran:', err);
    res.status(500).json({ message: 'Gagal mengambil data tahun ajaran' });
  }
};

const tambahTahunAjaran = async (req, res) => {
  try {
    const {
      tahun1,
      tahun2,
      semester,
      tanggal_pembagian_pts,
      tanggal_pembagian_pas,
    } = req.body;
    
    if (!tahun1 || !tahun2 || !semester) {
      return res.status(400).json({ message: 'Tahun dan semester wajib diisi' });
    }

    if (!/^\d+$/.test(tahun1) || !/^\d+$/.test(tahun2)) {
      return res.status(400).json({ message: 'Tahun ajaran harus berupa angka' });
    }
    
    const tahun_ajaran = `${tahun1}/${tahun2}`;
    
    const success = await tahunAjaranModel.createTahunAjaran({
      tahun_ajaran,
      semester,
      tanggal_pembagian_pts,
      tanggal_pembagian_pas,
    });
    
    if (!success) {
      return res.status(500).json({ message: 'Gagal membuat tahun ajaran baru' });
    }
    
    res.status(201).json({ message: 'Tahun ajaran berhasil ditambahkan' });
    
  } catch (err) {
    console.error('Error tambah tahun ajaran:', err);
    
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(400).json({ 
        message: `Tahun ajaran ${req.body.tahun1}/${req.body.tahun2} semester ${req.body.semester} sudah ada. Silakan input tahun dan semester yang berbeda.` 
      });
    }
    
    res.status(500).json({ 
      message: 'Gagal menambah tahun ajaran',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const updateTahunAjaran = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tahun1,
      tahun2,
      semester,
      tanggal_pembagian_pts,
      tanggal_pembagian_pas,
    } = req.body;
    if (!tahun1 || !tahun2 || !semester) {
      return res
        .status(400)
        .json({ message: 'Tahun dan semester wajib diisi' });
    }
    const tahun_ajaran = `${tahun1}/${tahun2}`;
    const success = await tahunAjaranModel.updateTahunAjaranById(id, {
      tahun_ajaran,
      semester,
      tanggal_pembagian_pts,
      tanggal_pembagian_pas,
    });
    if (!success)
      return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });
    res.json({ message: 'Data tahun ajaran berhasil diperbarui' });
  } catch (err) {
    console.error('Error update tahun ajaran:', err);
    res.status(500).json({ message: 'Gagal memperbarui data tahun ajaran' });
  }
};

// ============== KELAS ==============
const getKelas = async (req, res) => {
  try {
    const { tahun_ajaran_id } = req.query;
    if (!tahun_ajaran_id) {
      return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
    }
    const [rows] = await db.execute(
      `
    SELECT 
        k.id_kelas AS id,
        k.nama_kelas,
        k.fase,
        COALESCE(wk.nama_lengkap, '-') AS wali_kelas,
        wk.user_id AS wali_kelas_id,
        COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa
    FROM kelas k
    LEFT JOIN (
        SELECT 
            gk.kelas_id,
            u.nama_lengkap,
            gk.user_id
        FROM guru_kelas gk
        JOIN user u ON gk.user_id = u.id_user
        WHERE gk.tahun_ajaran_id = ?
    ) wk ON k.id_kelas = wk.kelas_id
    LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.tahun_ajaran_id = ?
    WHERE k.tahun_ajaran_id = ?  
    GROUP BY k.id_kelas, k.nama_kelas, k.fase, wk.nama_lengkap, wk.user_id
    ORDER BY k.nama_kelas ASC
`,
      [tahun_ajaran_id, tahun_ajaran_id, tahun_ajaran_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get kelas:', err);
    res.status(500).json({ message: 'Gagal mengambil data kelas' });
  }
};

const getKelasById = async (req, res) => {
  try {
    const { id } = req.params;
    const kelas = await kelasModel.getById(id);
    if (!kelas)
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    res.json({ success: true, data: kelas });
  } catch (err) {
    console.error('Error get kelas by ID:', err);
    res.status(500).json({ message: 'Gagal mengambil detail kelas' });
  }
};

const getKelasForDropdown = async (req, res) => {
  try {
    const taId = req.tahunAjaranAktifId; // ← Dari middleware cekTahunAjaranAktif
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }

    const [rows] = await db.execute(
      `
            SELECT 
                id_kelas AS id,
                nama_kelas AS nama,
                fase
            FROM kelas
            WHERE tahun_ajaran_id = ?
            ORDER BY nama_kelas ASC
        `,
      [taId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get kelas for dropdown:', err);
    res.status(500).json({ message: 'Gagal mengambil daftar kelas' });
  }
};

const tambahKelas = async (req, res) => {
  const { nama_kelas, fase } = req.body;
  const tahun_ajaran_id = req.tahunAjaranAktifId; // ← Dari middleware

  if (!nama_kelas || !fase || !tahun_ajaran_id) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  // Cek duplikat HANYA di tahun ajaran aktif
  const existing = await kelasModel.getByTahunAjaran(tahun_ajaran_id);
  const isDuplicate = existing.some(k => k.nama_kelas === nama_kelas);
  if (isDuplicate) {
    return res
      .status(400)
      .json({ message: `Kelas "${nama_kelas}" sudah ada di tahun ajaran ini` });
  }

  const id = await kelasModel.create({ nama_kelas, fase, tahun_ajaran_id });
  res.status(201).json({ message: 'Kelas berhasil ditambahkan', id });
};

const editKelas = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kelas, fase } = req.body;
    const tahun_ajaran_id = req.tahunAjaranAktifId; // ← Ambil dari middleware

    if (!nama_kelas || !fase || !tahun_ajaran_id) {
      return res
        .status(400)
        .json({ message: 'Nama kelas, fase, dan tahun ajaran wajib diisi' });
    }

    const existingKelas = await kelasModel.getById(id);
    if (!existingKelas)
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });

    // ✅ Cek duplikat HANYA di tahun ajaran aktif, kecuali diri sendiri
    const allKelas = await kelasModel.getByTahunAjaran(tahun_ajaran_id);
    const isDuplicate = allKelas.some(
      k => k.nama_kelas === nama_kelas && k.id_kelas !== Number(id)
    );
    if (isDuplicate) {
      return res
        .status(400)
        .json({
          message: `Nama kelas "${nama_kelas}" sudah digunakan di tahun ajaran ini`,
        });
    }

    // ✅ Update dengan tahun_ajaran_id (meski tidak berubah, tetap kirim)
    const success = await kelasModel.update(id, {
      nama_kelas,
      fase,
      tahun_ajaran_id,
    });
    if (!success)
      return res.status(404).json({ message: 'Gagal memperbarui kelas' });

    res.json({ message: 'Data kelas berhasil diperbarui' });
  } catch (err) {
    console.error('Error edit kelas:', err);
    res.status(500).json({ message: 'Gagal memperbarui data kelas' });
  }
};

const hapusKelas = async (req, res) => {
  try {
    const { id } = req.params;
    const taId = req.tahunAjaranAktifId;

    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }

    // Cek apakah kelas benar-benar milik tahun ajaran aktif
    const [kelasRows] = await db.execute(
      'SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?',
      [id, taId]
    );
    if (kelasRows.length === 0) {
      return res
        .status(404)
        .json({
          message: 'Kelas tidak ditemukan atau bukan milik tahun ajaran aktif',
        });
    }

    // Cek apakah masih digunakan
    const [cekDep] = await db.execute(
      `
            SELECT 
                (SELECT COUNT(*) FROM siswa_kelas WHERE kelas_id = ?) AS siswa_count,
                (SELECT COUNT(*) FROM guru_kelas WHERE kelas_id = ?) AS guru_count,
                (SELECT COUNT(*) FROM absensi WHERE kelas_id = ?) AS absensi_count,
                (SELECT COUNT(*) FROM nilai WHERE kelas_id = ?) AS nilai_count
        `,
      [id, id, id, id]
    );

    const dep = cekDep[0];
    const total =
      dep.siswa_count + dep.guru_count + dep.absensi_count + dep.nilai_count;

    if (total > 0) {
      return res.status(400).json({
        message:
          'Kelas tidak bisa dihapus karena masih digunakan di data siswa, guru, atau nilai.',
      });
    }

    // Hapus kelas
    const [result] = await db.execute('DELETE FROM kelas WHERE id_kelas = ?', [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gagal menghapus kelas' });
    }

    res.json({ message: 'Kelas berhasil dihapus' });
  } catch (err) {
    console.error('Error hapus kelas:', err);
    res.status(500).json({ message: 'Gagal menghapus kelas' });
  }
};

// ============== GURU KELAS ==============
const getWaliKelas = async (req, res) => {
  try {
    const { id } = req.params;
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const [rows] = await db.execute(
      `
            SELECT 
                u.id_user AS user_id,
                u.nama_lengkap AS nama
            FROM guru_kelas gk
            JOIN user u ON gk.user_id = u.id_user
            WHERE gk.kelas_id = ? AND gk.tahun_ajaran_id = ?
        `,
      [id, taId]
    );
    const waliKelas = rows.length > 0 ? rows[0] : null;
    res.json({ success: true, data: waliKelas });
  } catch (err) {
    console.error('Error get wali kelas:', err);
    res.status(500).json({ message: 'Gagal mengambil data wali kelas' });
  }
};

const setWaliKelas = async (req, res) => {
  const { user_id } = req.body;
  const { id } = req.params;
  if (!user_id || typeof user_id !== 'number' || user_id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'user_id harus angka positif',
    });
  }
  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'ID kelas tidak valid',
    });
  }
  const taId = req.tahunAjaranAktifId;
  if (!taId) {
    return res
      .status(400)
      .json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
  }
  try {
    const [kelasResult] = await db.execute(
      'SELECT id_kelas FROM kelas WHERE id_kelas = ?',
      [id]
    );
    if (kelasResult.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Kelas tidak ditemukan' });
    }
    const [guruResult] = await db.execute(
      `
            SELECT u.id_user 
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE u.id_user = ? AND ur.role = 'guru kelas' AND u.status = 'aktif'
        `,
      [user_id]
    );
    if (guruResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guru tidak ditemukan atau bukan guru kelas aktif',
      });
    }
    const updateQuery = `
            INSERT INTO guru_kelas (user_id, kelas_id, tahun_ajaran_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE user_id = ?
        `;
    await db.execute(updateQuery, [user_id, id, taId, user_id]);
    res.json({
      success: true,
      message: 'Wali kelas berhasil ditetapkan',
    });
  } catch (err) {
    console.error('Error set wali kelas:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal menetapkan wali kelas' });
  }
};

const getGuruKelasList = async (req, res) => {
  try {
    const [rows] = await db.execute(`
            SELECT 
                u.id_user AS user_id,
                u.nama_lengkap AS nama
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE u.status = 'aktif'
              AND ur.role = 'guru kelas'
            ORDER BY u.nama_lengkap ASC
        `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get guru kelas list:', err);
    res.status(500).json({ message: 'Gagal mengambil daftar guru kelas' });
  }
};

// ============== MATA PELAJARAN ==============
const getMataPelajaran = async (req, res) => {
  try {
    const { tahun_ajaran_id } = req.query;
    if (!tahun_ajaran_id || isNaN(Number(tahun_ajaran_id))) {
      return res
        .status(400)
        .json({ message: 'tahun_ajaran_id wajib diisi dan harus angka' });
    }
    const rows = await mapelModel.getAllByTahunAjaran(Number(tahun_ajaran_id));
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get mata pelajaran:', err);
    res.status(500).json({ message: 'Gagal mengambil data mata pelajaran' });
  }
};

const getMataPelajaranById = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (isNaN(idNum)) {
      return res.status(400).json({ message: 'ID tidak valid' });
    }
    const rows = await mapelModel.getById(idNum);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Mata pelajaran tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error get mata pelajaran by ID:', err);
    res.status(500).json({ message: 'Gagal mengambil detail mata pelajaran' });
  }
};

const tambahMataPelajaran = async (req, res) => {
  try {
    const {
      kode_mapel,
      nama_mapel,
      jenis,
      kurikulum,
      tahun_ajaran_id,
      urutan_rapor,
    } = req.body;
    if (
      !kode_mapel ||
      !nama_mapel ||
      !jenis ||
      !kurikulum ||
      !tahun_ajaran_id
    ) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    const allowedJenis = ['wajib', 'pilihan'];
    if (!allowedJenis.includes(jenis)) {
      return res.status(400).json({ message: 'Jenis tidak valid' });
    }
    const taId = Number(tahun_ajaran_id);
    if (isNaN(taId)) {
      return res.status(400).json({ message: 'tahun_ajaran_id harus angka' });
    }
    const taValid = await mapelModel.isTahunAjaranValid(taId);
    if (!taValid) {
      return res.status(400).json({ message: 'Tahun ajaran tidak valid' });
    }
    const isDuplicate = await mapelModel.isKodeMapelExist(
      kode_mapel.trim().toUpperCase(),
      taId
    );
    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: 'Kode mapel sudah digunakan di tahun ajaran ini' });
    }
    // Jika urutan_rapor TIDAK dikirim (atau null), hitung otomatis
    let finalUrutanRapor = null;
    if (urutan_rapor == null || urutan_rapor === '') {
      const maxUrutan = await db.execute(
        `SELECT MAX(urutan_rapor) AS max FROM mata_pelajaran WHERE tahun_ajaran_id = ? AND jenis = ?`,
        [taId, jenis]
      );
      finalUrutanRapor = (maxUrutan[0][0]?.max || 0) + 1;
    } else {
      finalUrutanRapor = Number(urutan_rapor);
    }

    const result = await mapelModel.create({
      kode_mapel: kode_mapel.trim().toUpperCase(),
      nama_mapel: nama_mapel.trim(),
      jenis,
      kurikulum: kurikulum.trim(),
      tahun_ajaran_id: taId,
      urutan_rapor: finalUrutanRapor,
    });
    res.status(201).json({
      message: 'Mata pelajaran berhasil ditambahkan',
      id: result.insertId,
    });
  } catch (err) {
    console.error('Error tambah mata pelajaran:', err);
    res.status(500).json({ message: 'Gagal menambah mata pelajaran' });
  }
};

const editMataPelajaran = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (isNaN(idNum)) {
      return res.status(400).json({ message: 'ID tidak valid' });
    }
    const { kode_mapel, nama_mapel, jenis, kurikulum, urutan_rapor } = req.body;
    const trimmedKodeMapel = (kode_mapel || '').toString().trim();
    const trimmedNamaMapel = (nama_mapel || '').toString().trim();
    const trimmedJenis = (jenis || '').toString().trim();
    const trimmedKurikulum = (kurikulum || '').toString().trim();
    if (
      !trimmedKodeMapel ||
      !trimmedNamaMapel ||
      !trimmedJenis ||
      !trimmedKurikulum
    ) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    const allowedJenis = ['wajib', 'pilihan'];
    if (!allowedJenis.includes(trimmedJenis)) {
      return res
        .status(400)
        .json({ message: 'Jenis tidak valid. Harus "wajib" atau "pilihan".' });
    }
    const [oldMapel] = await db.execute(
      'SELECT tahun_ajaran_id FROM mata_pelajaran WHERE id_mata_pelajaran = ?',
      [idNum]
    );
    if (oldMapel.length === 0) {
      return res
        .status(404)
        .json({ message: 'Mata pelajaran tidak ditemukan' });
    }
    const taId = oldMapel[0].tahun_ajaran_id;
    const isDuplicate = await mapelModel.isKodeMapelExist(
      trimmedKodeMapel.toUpperCase(),
      taId,
      idNum
    );
    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: 'Kode mapel sudah digunakan di tahun ajaran ini' });
    }
    let finalUrutanRapor = null;
    if (
      urutan_rapor !== undefined &&
      urutan_rapor !== '' &&
      urutan_rapor !== null
    ) {
      finalUrutanRapor = Number(urutan_rapor);
    }
    const result = await mapelModel.update(idNum, {
      kode_mapel: trimmedKodeMapel.toUpperCase(),
      nama_mapel: trimmedNamaMapel,
      jenis: trimmedJenis,
      kurikulum: trimmedKurikulum,
      urutan_rapor: finalUrutanRapor,
      tahun_ajaran_id: taId,
    });
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: 'Mata pelajaran tidak ditemukan' });
    }
    res.json({ message: 'Data mata pelajaran berhasil diperbarui' });
  } catch (err) {
    console.error('Error edit mata pelajaran:', err);
    res.status(500).json({ message: 'Gagal memperbarui data mata pelajaran' });
  }
};

const hapusMataPelajaran = async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = Number(id);
    if (isNaN(idNum)) {
      return res.status(400).json({ message: 'ID tidak valid' });
    }
    const [nilaiRows] = await db.execute(
      'SELECT id_nilai_rapor FROM nilai_rapor WHERE mapel_id = ? LIMIT 1',
      [idNum]
    );
    if (nilaiRows.length > 0) {
      return res
        .status(400)
        .json({
          message:
            'Tidak bisa dihapus: mata pelajaran ini sudah digunakan di data nilai',
        });
    }
    const result = await mapelModel.delete(idNum);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: 'Mata pelajaran tidak ditemukan' });
    }
    res.json({ message: 'Mata pelajaran berhasil dihapus' });
  } catch (err) {
    console.error('Error hapus mata pelajaran:', err);
    res.status(500).json({ message: 'Gagal menghapus mata pelajaran' });
  }
};

// ============== PEMBELAJARAN ==============
const getPembelajaran = async (req, res) => {
  try {
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const [rows] = await db.execute(
      `
            SELECT p.*, k.nama_kelas, mp.nama_mapel, mp.jenis AS jenis_mapel, u.nama_lengkap AS nama_guru
            FROM pembelajaran p
            JOIN kelas k ON p.kelas_id = k.id_kelas
            JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id_mata_pelajaran
            JOIN user u ON p.user_id = u.id_user
            WHERE p.tahun_ajaran_id = ?
            ORDER BY k.nama_kelas, mp.nama_mapel
        `,
      [taId]
    );
    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('Error get pembelajaran:', err);
    res
      .status(500)
      .json({ message: 'Gagal mengambil data penugasan mengajar' });
  }
};

const getDropdownPembelajaran = async (req, res) => {
  try {
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }

    // ✅ GUNAKAN DISTINCT UNTUK HILANGKAN DUPLIKAT NAMA GURU
    const [guru] = await db.execute(`
            SELECT DISTINCT
                u.id_user AS id,
                u.nama_lengkap AS nama
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE u.status = 'aktif'
              AND ur.role IN ('guru kelas', 'guru bidang studi')
            ORDER BY u.nama_lengkap ASC
        `);

    const [kelas] = await db.execute(
      `
            SELECT 
                id_kelas AS id,
                nama_kelas AS nama
            FROM kelas
            WHERE tahun_ajaran_id = ?
            ORDER BY nama_kelas ASC
        `,
      [taId]
    );

    const [mata_pelajaran] = await db.execute(
      `
            SELECT 
                id_mata_pelajaran AS id,
                nama_mapel AS nama
            FROM mata_pelajaran
            WHERE tahun_ajaran_id = ?
            ORDER BY nama_mapel ASC
        `,
      [taId]
    );

    const [taRows] = await db.execute(`
            SELECT id_tahun_ajaran AS id, tahun_ajaran, semester
            FROM tahun_ajaran
            WHERE status = 'aktif'
        `);

    res.json({
      success: true,
      data: {
        guru,
        kelas,
        mata_pelajaran,
        tahun_ajaran_aktif: taRows[0] || null,
      },
    });
  } catch (err) {
    console.error('Error get dropdown pembelajaran:', err);
    res.status(500).json({ message: 'Gagal mengambil data dropdown' });
  }
};

const tambahPembelajaran = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { kelas_id, mata_pelajaran_id, user_id } = req.body;
    const taId = req.tahunAjaranAktifId;
    if (!kelas_id || !mata_pelajaran_id || !user_id || !taId) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    // ✅ Validasi kelas
    const [kelasCheck] = await connection.execute(
      `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
      [kelas_id, taId]
    );
    if (kelasCheck.length === 0) {
      return res
        .status(400)
        .json({
          message: 'Kelas tidak valid atau bukan milik tahun ajaran aktif',
        });
    }
    // ✅ Validasi mapel
    const [mapelCheck] = await connection.execute(
      `SELECT id_mata_pelajaran FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?`,
      [mata_pelajaran_id, taId]
    );
    if (mapelCheck.length === 0) {
      return res
        .status(400)
        .json({
          message:
            'Mata pelajaran tidak valid atau bukan milik tahun ajaran aktif',
        });
    }
    // ✅ Validasi guru
    const [guruCheck] = await connection.execute(
      `SELECT id_user FROM user WHERE id_user = ?`,
      [user_id]
    );
    if (guruCheck.length === 0) {
      return res.status(400).json({ message: 'Guru tidak valid' });
    }
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO pembelajaran (tahun_ajaran_id, kelas_id, mata_pelajaran_id, user_id) VALUES (?, ?, ?, ?)`,
      [taId, kelas_id, mata_pelajaran_id, user_id]
    );
    await connection.commit();
    res.status(201).json({
      message: 'Penugasan mengajar berhasil ditambahkan',
      id: result.insertId,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error tambah pembelajaran:', err);
    res.status(500).json({ message: 'Gagal menambah penugasan mengajar' });
  } finally {
    connection.release();
  }
};

const editPembelajaran = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { kelas_id, mata_pelajaran_id, user_id } = req.body;
    const taId = req.tahunAjaranAktifId;
    if (!kelas_id || !mata_pelajaran_id || !user_id || !taId) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    const [existing] = await connection.execute(
      `SELECT id FROM pembelajaran WHERE id = ? AND tahun_ajaran_id = ?`,
      [id, taId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Penugasan tidak ditemukan' });
    }
    const [kelasCheck] = await connection.execute(
      `SELECT id_kelas FROM kelas WHERE id_kelas = ? AND tahun_ajaran_id = ?`,
      [kelas_id, taId]
    );
    if (kelasCheck.length === 0)
      return res.status(400).json({ message: 'Kelas tidak valid' });
    const [mapelCheck] = await connection.execute(
      `SELECT id_mata_pelajaran FROM mata_pelajaran WHERE id_mata_pelajaran = ? AND tahun_ajaran_id = ?`,
      [mata_pelajaran_id, taId]
    );
    if (mapelCheck.length === 0)
      return res.status(400).json({ message: 'Mata pelajaran tidak valid' });
    const [guruCheck] = await connection.execute(
      `SELECT id_user FROM user WHERE id_user = ?`,
      [user_id]
    );
    if (guruCheck.length === 0)
      return res.status(400).json({ message: 'Guru tidak valid' });
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE pembelajaran SET kelas_id = ?, mata_pelajaran_id = ?, user_id = ? WHERE id = ?`,
      [kelas_id, mata_pelajaran_id, user_id, id]
    );
    await connection.commit();
    res.json({ message: 'Penugasan mengajar berhasil diperbarui' });
  } catch (err) {
    await connection.rollback();
    console.error('Error edit pembelajaran:', err);
    res.status(500).json({ message: 'Gagal memperbarui penugasan mengajar' });
  } finally {
    connection.release();
  }
};

const hapusPembelajaran = async (req, res) => {
  try {
    const { id } = req.params;
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const [result] = await db.execute(
      `DELETE FROM pembelajaran WHERE id = ? AND tahun_ajaran_id = ?`,
      [id, taId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Penugasan tidak ditemukan' });
    }
    res.json({ message: 'Penugasan mengajar berhasil dihapus' });
  } catch (err) {
    console.error('Error hapus pembelajaran:', err);
    res.status(500).json({ message: 'Gagal menghapus penugasan mengajar' });
  }
};

// ============== EKSTRAKURIKULER ==============
const getEkskul = async (req, res) => {
  try {
    const { tahun_ajaran_id } = req.query;
    if (!tahun_ajaran_id) {
      return res.status(400).json({ message: 'Tahun ajaran wajib dipilih' });
    }
    const ekskulList =
      await ekstrakurikulerModel.getAllByTahunAjaran(tahun_ajaran_id);
    res.json({ success: true, data: ekskulList });
  } catch (err) {
    console.error('Error get ekstrakurikuler:', err);
    res.status(500).json({ message: 'Gagal mengambil data ekstrakurikuler' });
  }
};

const tambahEkskul = async (req, res) => {
  try {
    const { nama_ekskul, nama_pembina, keterangan } = req.body;
    const tahun_ajaran_id = req.tahunAjaranAktifId;
    if (!tahun_ajaran_id) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    if (!nama_ekskul) {
      return res
        .status(400)
        .json({ message: 'Nama ekstrakurikuler wajib diisi' });
    }
    const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
      nama_ekskul,
      tahun_ajaran_id
    );
    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: `Ekstrakurikuler "${nama_ekskul}" sudah ada` });
    }
    const ekskulId = await ekstrakurikulerModel.create({
      nama_ekskul,
      nama_pembina: nama_pembina || null,
      keterangan: keterangan || null,
      tahun_ajaran_id,
    });
    res
      .status(201)
      .json({ message: 'Ekstrakurikuler berhasil ditambahkan', id: ekskulId });
  } catch (err) {
    console.error('Error tambah ekstrakurikuler:', err);
    res
      .status(500)
      .json({ message: err.message || 'Gagal menambah ekstrakurikuler' });
  }
};

const editEkskul = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_ekskul, nama_pembina, keterangan } = req.body;
    const tahun_ajaran_id = req.tahunAjaranAktifId;
    if (!tahun_ajaran_id) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    if (!nama_ekskul) {
      return res
        .status(400)
        .json({ message: 'Nama ekstrakurikuler wajib diisi' });
    }
    const ekskulLama = await ekstrakurikulerModel.getById(id);
    if (!ekskulLama || ekskulLama.tahun_ajaran_id !== tahun_ajaran_id) {
      return res
        .status(404)
        .json({ message: 'Ekstrakurikuler tidak ditemukan' });
    }
    const isDuplicate = await ekstrakurikulerModel.isNamaEkskulExist(
      nama_ekskul,
      tahun_ajaran_id,
      id
    );
    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: `Nama "${nama_ekskul}" sudah digunakan` });
    }
    const success = await ekstrakurikulerModel.update(id, {
      nama_ekskul,
      nama_pembina: nama_pembina || null,
      keterangan: keterangan || null,
      tahun_ajaran_id,
    });
    if (!success) {
      return res
        .status(400)
        .json({ message: 'Gagal memperbarui data ekstrakurikuler' });
    }
    res.json({ message: 'Data ekstrakurikuler berhasil diperbarui' });
  } catch (err) {
    console.error('Error edit ekstrakurikuler:', err);
    res
      .status(500)
      .json({ message: err.message || 'Gagal memperbarui ekstrakurikuler' });
  }
};

const hapusEkskul = async (req, res) => {
  try {
    const { id } = req.params;
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const ekskul = await ekstrakurikulerModel.getById(id);
    if (!ekskul || ekskul.tahun_ajaran_id !== taId) {
      return res
        .status(404)
        .json({ message: 'Ekstrakurikuler tidak ditemukan' });
    }
    const success = await ekstrakurikulerModel.deleteById(id);
    if (!success) {
      return res
        .status(400)
        .json({ message: 'Gagal menghapus ekstrakurikuler' });
    }
    res.json({ message: 'Ekstrakurikuler berhasil dihapus' });
  } catch (err) {
    console.error('Error hapus ekstrakurikuler:', err);
    res.status(500).json({ message: 'Gagal menghapus ekstrakurikuler' });
  }
};

const getPesertaByEkskul = async (req, res) => {
  try {
    const { id } = req.params;
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const peserta = await ekstrakurikulerModel.getPesertaByEkskul(id, taId);
    res.json({ success: true, data: peserta });
  } catch (err) {
    console.error('Error get peserta by ekskul:', err);
    res
      .status(500)
      .json({ message: 'Gagal mengambil daftar peserta ekstrakurikuler' });
  }
};

const getEkskulBySiswa = async (req, res) => {
  try {
    const { siswaId } = req.params;
    const taId = req.tahunAjaranAktifId;
    if (!taId) {
      return res.status(400).json({ message: 'Tidak ada tahun ajaran aktif' });
    }
    const ekskulList = await ekstrakurikulerModel.getEkskulSiswa(siswaId, taId);
    res.json({ success: true, data: ekskulList });
  } catch (err) {
    console.error('Error get ekskul by siswa:', err);
    res
      .status(500)
      .json({ message: 'Gagal mengambil data ekstrakurikuler siswa' });
  }
};

// ============== DASHBOARD STATISTICS ==============
const getDashboardStats = async (req, res) => {
  try {
    const taId = req.tahunAjaranAktifId; // Ambil dari middleware

    if (!taId || typeof taId !== 'number') {
      return res
        .status(500)
        .json({ message: 'Tidak ada tahun ajaran aktif yang valid' });
    }

    // Count Guru
    const [guruRows] = await db.execute(`
            SELECT COUNT(DISTINCT u.id_user) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role IN ('guru kelas', 'guru bidang studi')
              AND u.status = 'aktif'
        `);

    // Count Siswa
    const [siswaRows] = await db.execute(
      `
            SELECT COUNT(*) AS total
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.tahun_ajaran_id = ?
        `,
      [taId]
    );

    // Count Admin
    const [adminRows] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM user u
            INNER JOIN user_role ur ON u.id_user = ur.id_user
            WHERE ur.role = 'admin'
              AND u.status = 'aktif'
        `);

    // Count Ekstrakurikuler
    const [ekskulRows] = await db.execute(
      `
            SELECT COUNT(*) AS total
            FROM ekstrakurikuler
            WHERE tahun_ajaran_id = ?
        `,
      [taId]
    );

    // Count Kelas
    const [kelasRows] = await db.execute(
      `
            SELECT COUNT(*) AS total
            FROM kelas
            WHERE tahun_ajaran_id = ?
        `,
      [taId]
    );

    // Count Mata Pelajaran
    const [mapelRows] = await db.execute(
      `
            SELECT COUNT(*) AS total
            FROM mata_pelajaran
            WHERE tahun_ajaran_id = ?
        `,
      [taId]
    );

    res.json({
      success: true,
      data: {
        guru: Number(guruRows[0].total) || 0,
        siswa: Number(siswaRows[0].total) || 0,
        admin: Number(adminRows[0].total) || 0,
        ekstrakurikuler: Number(ekskulRows[0].total) || 0,
        kelas: Number(kelasRows[0].total) || 0,
        mata_pelajaran: Number(mapelRows[0].total) || 0,
      },
    });
  } catch (err) {
    console.error('Error get dashboard stats:', err);
    res.status(500).json({ message: 'Gagal memuat statistik dashboard' });
  }
};

const uploadFotoProfil = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File foto diperlukan' });
    }

    const userId = req.user.id; // Dari JWT middleware
    const fotoPath = `/uploads/${req.file.filename}`;

    // Simpan path ke database
    const success = await guruModel.updateFoto(userId, fotoPath);

    if (!success) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    // Perbarui localStorage di frontend nanti
    res.json({
      success: true,
      message: 'Foto profil berhasil diupload',
      fotoPath,
    });
  } catch (err) {
    console.error('Error upload foto profil:', err);
    res.status(500).json({ message: 'Gagal mengupload foto profil' });
  }
};

// Rapor
const getTahunAjaranAll = async (req, res) => {
  try {
    const rows = await tahunAjaranModel.getAllTahunAjaran();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ Error get semua tahun ajaran:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal memuat tahun ajaran' });
  }
};

const getKelasByTahunAjaran = async (req, res) => {
  try {
    const { tahun_ajaran_id } = req.query;
    if (!tahun_ajaran_id) {
      return res
        .status(400)
        .json({ success: false, message: 'tahun_ajaran_id wajib diisi' });
    }

    // Cek apakah tahun ajaran ada di database
    const [taRows] = await db.execute(
      `
      SELECT id_tahun_ajaran, tahun_ajaran, semester
      FROM tahun_ajaran
      WHERE id_tahun_ajaran = ?
    `,
      [tahun_ajaran_id]
    );

    if (taRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tahun ajaran dengan ID ${tahun_ajaran_id} tidak ditemukan`,
      });
    }

    // Ambil kelas berdasarkan tahun ajaran
    const [rows] = await db.execute(
      `
      SELECT id_kelas, nama_kelas
      FROM kelas
      WHERE tahun_ajaran_id = ?
      ORDER BY nama_kelas
    `,
      [tahun_ajaran_id]
    );

    // Jika tidak ada kelas, kirim pesan yang jelas
    if (rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: `Tidak ada kelas untuk tahun ajaran ${taRows[0].tahun_ajaran}`,
      });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get kelas by tahun ajaran:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal memuat daftar kelas' });
  }
};

const getDaftarSiswaUntukRapor = async (req, res) => {
  try {
    const tahunAjaranId = req.tahunAjaranId;
    const kelasId = req.kelasId;

    const [siswaRows] = await db.execute(
      `
            SELECT 
                s.id_siswa,
                s.nama_lengkap AS nama,
                s.nis,
                s.nisn
            FROM siswa s
            INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
            WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
            ORDER BY s.nama_lengkap
        `,
      [kelasId, tahunAjaranId]
    );

    res.json({
      success: true,
      data: siswaRows,
    });
  } catch (err) {
    console.error('Error getDaftarSiswaUntukRapor:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data siswa',
    });
  }
};

const aturStatusPenilaian = async (req, res) => {
  try {
    const { jenis, status, tahun_ajaran_id } = req.body;

    // Validasi input
    if (!['PTS', 'PAS'].includes(jenis)) {
      return res
        .status(400)
        .json({ success: false, message: 'Jenis harus PTS atau PAS' });
    }
    if (!['aktif', 'nonaktif', 'selesai'].includes(status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Status harus aktif, nonaktif, atau selesai',
        });
    }
    if (!tahun_ajaran_id || tahun_ajaran_id <= 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Tahun ajaran ID wajib diisi' });
    }

    // Tentukan nama kolom berdasarkan jenis
    let statusField;
    if (jenis === 'PTS') {
      statusField = 'status_pts';
    } else if (jenis === 'PAS') {
      statusField = 'status_pas';
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Jenis penilaian tidak valid' });
    }

    // ❗ JANGAN PAKAI ?? — gunakan string literal yang sudah divalidasi
    const query = `
            UPDATE tahun_ajaran
            SET ${statusField} = ?
            WHERE id_tahun_ajaran = ?
        `;

    await db.execute(query, [status, tahun_ajaran_id]);

    res.json({
      success: true,
      message: `Status ${jenis} berhasil diubah menjadi "${status}"`,
    });
  } catch (error) {
    console.error('❌ Error atur status penilaian:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status penilaian',
    });
  }
};

// Helper: Ambil data rapor lengkap untuk arsip
const ambilDataRaporLengkap = async (siswaId, taId, semester) => {
  const data = {};

  // ===  Data Akademik ===
  const [nilaiRaporRows] = await db.execute(
    `
    SELECT
      mp.kode_mapel,
      mp.nama_mapel,
      nr.nilai_rapor,
      nr.deskripsi
    FROM nilai_rapor nr
    JOIN mata_pelajaran mp ON nr.mapel_id = mp.id_mata_pelajaran
    WHERE nr.siswa_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ?
  `,
    [siswaId, taId, semester]
  );

  data.akademik = nilaiRaporRows.map(row => ({
    kode_mapel: row.kode_mapel,
    nama_mapel: row.nama_mapel,
    nilai: row.nilai_rapor,
    deskripsi: row.deskripsi,
  }));

  // ===  Data Kokurikuler ===
  const [kokurRows] = await db.execute(
    `
    SELECT
      nilai_mutabaah, nilai_bpi, nilai_literasi, nilai_proyek,
      (SELECT judul FROM judul_proyek_per_tahun_ajaran jpt WHERE jpt.id_judul_proyek = nk.id_judul_proyek) AS nama_judul_proyek
    FROM nilai_kokurikuler nk
    WHERE id_siswa = ? AND id_tahun_ajaran = ? AND semester = ?
  `,
    [siswaId, taId, semester]
  );

  data.kokurikuler = kokurRows[0] || {
    nilai_mutabaah: null,
    nilai_bpi: null,
    nilai_literasi: null,
    nilai_proyek: null,
    nama_judul_proyek: null,
  };

  // ===  Data Absensi ===
  const [absensiRows] = await db.execute(
    `
    SELECT sakit, izin, alpha
    FROM absensi
    WHERE siswa_id = ? AND tahun_ajaran_id = ?
  `,
    [siswaId, taId]
  );

  data.absensi = absensiRows[0] || { sakit: 0, izin: 0, alpha: 0 };

  // ===  Data Ekstrakurikuler ===
  const [ekskulRows] = await db.execute(
    `
    SELECT e.nama_ekskul, pe.deskripsi
    FROM peserta_ekstrakurikuler pe
    JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul
    WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?
  `,
    [siswaId, taId]
  );

  data.ekskul = ekskulRows.map(row => ({
    nama: row.nama_ekskul,
    deskripsi: row.deskripsi,
  }));

  // ===  Catatan Wali Kelas ===
  const [catatanRows] = await db.execute(
    `
    SELECT catatan_wali_kelas, naik_tingkat
    FROM catatan_wali_kelas
    WHERE siswa_id = ? AND tahun_ajaran_id = ? AND semester = ?
  `,
    [siswaId, taId, semester]
  );

  data.catatan_wali_kelas = catatanRows[0]?.catatan_wali_kelas || '';
  data.naik_tingkat = catatanRows[0]?.naik_tingkat || null;

  return data;
};

const arsipkanRapor = async (req, res) => {
  try {
    const { jenis, semester, tahun_ajaran_id } = req.body;
    if (!['PTS', 'PAS'].includes(jenis)) {
      return res
        .status(400)
        .json({ success: false, message: 'Jenis harus PTS atau PAS' });
    }
    if (!['Ganjil', 'Genap'].includes(semester)) {
      return res
        .status(400)
        .json({ success: false, message: 'Semester harus Ganjil atau Genap' });
    }

    const taId = tahun_ajaran_id || req.tahunAjaranAktifId;
    if (!taId) {
      return res
        .status(400)
        .json({ success: false, message: 'Tahun ajaran tidak valid' });
    }

    // 1. Ambil semua siswa di semua kelas untuk tahun ajaran ini
    const [siswaList] = await db.execute(
      `
            SELECT sk.siswa_id, sk.kelas_id FROM siswa_kelas sk
            WHERE sk.tahun_ajaran_id = ?
        `,
      [taId]
    );

    if (siswaList.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: 'Tidak ada siswa di tahun ajaran ini',
        });
    }

    // 2. Ambil semua data rapor lengkap dan simpan ke arsip
    for (const siswa of siswaList) {
      const dataRapor = await ambilDataRaporLengkap(
        siswa.siswa_id,
        taId,
        semester
      );

      await db.execute(
        `
            INSERT INTO arsip_rapor (
            id_siswa, id_tahun_ajaran, semester, jenis, data_rapor
            ) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            data_rapor = VALUES(data_rapor),
            created_at = NOW()
        `,
        [siswa.siswa_id, taId, semester, jenis, JSON.stringify(dataRapor)]
      );
    }

    const field = jenis === 'PTS' ? 'status_pts' : 'status_pas';

    if (!['status_pts', 'status_pas'].includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Field status tidak valid',
      });
    }

    // Bangun query secara dinamis
    const query = `
            UPDATE tahun_ajaran
            SET ${field} = 'selesai'
            WHERE id_tahun_ajaran = ?
        `;

    await db.execute(query, [taId]);

    res.json({
      success: true,
      message: `Rapor ${jenis} untuk semester ${semester} berhasil diarsipkan dan dikunci.`,
      total_siswa: siswaList.length,
    });
  } catch (err) {
    console.error('Error arsipkanRapor:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal mengarsipkan rapor' });
  }
};

module.exports = {
  // Admin
  getAdmin,
  getAdminById,
  tambahAdmin,
  editAdmin,
  gantiPasswordAdmin,
  // Guru
  getGuru,
  getGuruById,
  tambahGuru,
  editGuru,
  importGuru,
  // Sekolah
  getSekolah,
  editSekolah,
  uploadLogo,
  // Siswa
  getSiswa,
  getSiswaById,
  tambahSiswa,
  editSiswa,
  importSiswa,
  //  Tahun Ajaran
  getTahunAjaran,
  tambahTahunAjaran,
  updateTahunAjaran,
  // Kelas
  getKelas,
  getKelasById,
  tambahKelas,
  editKelas,
  getKelasForDropdown,
  hapusKelas,
  getWaliKelas,
  setWaliKelas,
  getGuruKelasList,
  // Mata Pelajaran
  getMataPelajaran,
  getMataPelajaranById,
  tambahMataPelajaran,
  editMataPelajaran,
  hapusMataPelajaran,
  // Pembelajaran
  getPembelajaran,
  getDropdownPembelajaran,
  tambahPembelajaran,
  editPembelajaran,
  hapusPembelajaran,
  // Ekskul
  getEkskul,
  tambahEkskul,
  editEkskul,
  hapusEkskul,
  getPesertaByEkskul,
  getEkskulBySiswa,
  // Profil
  getDashboardStats,
  uploadFotoProfil,
  // Arsip Rapor
  getTahunAjaranAll,
  getKelasByTahunAjaran,
  getDaftarSiswaUntukRapor,
  arsipkanRapor,
  ambilDataRaporLengkap,
  aturStatusPenilaian,
};
