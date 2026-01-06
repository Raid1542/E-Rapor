/**
 * Nama File: guruBidangStudiController.js
 * Fungsi: Mengelola seluruh operasi yang hanya boleh diakses oleh guru bidang studi,
 *         termasuk profil, dashboard, pengaturan penilaian (bobot & kategori),
 *         dan manajemen nilai siswa berdasarkan mata pelajaran.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Middleware untuk memastikan hanya pengguna dengan role 'guru bidang studi' yang dapat mengakses endpoint.
 */
exports.ensureGuruBidangStudi = (req, res, next) => {
  if (req.user.role !== 'guru bidang studi') {
    return res
      .status(403)
      .json({ message: 'Akses ditolak: hanya untuk guru bidang studi' });
  }
  next();
};

/**
 * Mengambil data profil guru bidang studi yang sedang login.
 */
exports.getProfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const [userRows] = await db.execute(
      `SELECT id_user, nama_lengkap, email_sekolah FROM user WHERE id_user = ?`,
      [userId]
    );
    const [guruRows] = await db.execute(
      `SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, foto_path FROM guru WHERE user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = {
      id: userRows[0].id_user,
      role: 'guru bidang studi',
      nama_lengkap: userRows[0].nama_lengkap,
      email_sekolah: userRows[0].email_sekolah,
      niy: guruRows[0]?.niy || null,
      nuptk: guruRows[0]?.nuptk || null,
      jenis_kelamin: guruRows[0]?.jenis_kelamin || null,
      no_telepon: guruRows[0]?.no_telepon || null,
      alamat: guruRows[0]?.alamat || null,
      profileImage: guruRows[0]?.foto_path || null,
    };

    res.json({ user });
  } catch (err) {
    console.error('Error get profil:', err);
    res.status(500).json({ message: 'Gagal mengambil profil' });
  }
};

/**
 * Memperbarui data profil guru bidang studi.
 */
exports.editProfil = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: 'Request body tidak valid' });
    }

    const {
      nama_lengkap,
      email_sekolah,
      niy,
      nuptk,
      jenis_kelamin,
      no_telepon,
      alamat,
    } = req.body;

    if (!nama_lengkap || !email_sekolah) {
      return res.status(400).json({ message: 'Nama dan email wajib diisi' });
    }

    const userId = req.user.id;

    await db.execute(
      `UPDATE user SET nama_lengkap = ?, email_sekolah = ? WHERE id_user = ?`,
      [nama_lengkap, email_sekolah, userId]
    );

    await db.execute(
      `UPDATE guru SET niy = ?, nuptk = ?, jenis_kelamin = ?, no_telepon = ?, alamat = ? WHERE user_id = ?`,
      [niy, nuptk, jenis_kelamin, no_telepon, alamat, userId]
    );

    const [userRows] = await db.execute(
      `SELECT id_user, nama_lengkap, email_sekolah FROM user WHERE id_user = ?`,
      [userId]
    );
    const [guruRows] = await db.execute(
      `SELECT niy, nuptk, jenis_kelamin, no_telepon, alamat, foto_path FROM guru WHERE user_id = ?`,
      [userId]
    );

    const user = {
      id: userRows[0].id_user,
      role: 'guru bidang studi',
      nama_lengkap: userRows[0].nama_lengkap,
      email_sekolah: userRows[0].email_sekolah,
      niy: guruRows[0].niy,
      nuptk: guruRows[0].nuptk,
      jenis_kelamin: guruRows[0].jenis_kelamin,
      no_telepon: guruRows[0].no_telepon,
      alamat: guruRows[0].alamat,
      profileImage: guruRows[0].foto_path,
    };

    res.json({ message: 'Profil berhasil diperbarui', user });
  } catch (err) {
    console.error('Error edit profil:', err);
    res.status(500).json({ message: 'Gagal memperbarui profil' });
  }
};

/**
 * Mengganti password akun guru bidang studi.
 */
exports.gantiPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password lama & baru wajib, min. 8 karakter' });
    }

    const [rows] = await db.execute(
      'SELECT password FROM user WHERE id_user = ?',
      [userId]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: 'User tidak ditemukan' });

    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch)
      return res.status(400).json({ message: 'Kata sandi lama salah' });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE user SET password = ? WHERE id_user = ?', [
      newHashedPassword,
      userId,
    ]);

    res.json({ message: 'Kata sandi berhasil diubah' });
  } catch (err) {
    console.error('Error ganti password:', err);
    res.status(500).json({ message: 'Gagal mengubah kata sandi' });
  }
};

/**
 * Mengupload foto profil guru bidang studi.
 */
exports.uploadFotoProfil = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File foto diperlukan' });
    }

    const userId = req.user.id;
    const fotoPath = `uploads/${req.file.filename}`;

    await db.execute('UPDATE guru SET foto_path = ? WHERE user_id = ?', [
      fotoPath,
      userId,
    ]);

    const [userRows] = await db.execute(
      `SELECT id_user, nama_lengkap, email_sekolah FROM user WHERE id_user = ?`,
      [userId]
    );
    const [guruRows] = await db.execute(
      `SELECT foto_path FROM guru WHERE user_id = ?`,
      [userId]
    );

    const user = {
      id: userRows[0].id_user,
      role: 'guru bidang studi',
      nama_lengkap: userRows[0].nama_lengkap,
      email_sekolah: userRows[0].email_sekolah,
      profileImage: guruRows[0].foto_path,
    };

    res.json({ message: 'Foto profil berhasil diupload', user });
  } catch (err) {
    console.error('Error upload foto:', err);
    res.status(500).json({ message: 'Gagal mengupload foto' });
  }
};

/**
 * Mengambil data dashboard untuk guru bidang studi (tahun ajaran aktif + mata pelajaran yang diajar).
 */
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    const [taRows] = await db.execute(
      `SELECT id_tahun_ajaran, tahun_ajaran, semester 
       FROM tahun_ajaran 
       WHERE status = 'aktif' 
       LIMIT 1`
    );

    if (taRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tahun ajaran aktif tidak ditemukan.',
      });
    }

    const { id_tahun_ajaran, tahun_ajaran, semester } = taRows[0];

    const [mapelRows] = await db.execute(
      `
      SELECT 
        mp.nama_mapel AS nama,
        COUNT(DISTINCT p.kelas_id) AS total_kelas,
        COUNT(sk.siswa_id) AS total_siswa
      FROM pembelajaran p
      INNER JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id_mata_pelajaran
      LEFT JOIN siswa_kelas sk 
        ON p.kelas_id = sk.kelas_id 
        AND sk.tahun_ajaran_id = ?
      WHERE p.user_id = ? 
        AND p.tahun_ajaran_id = ?
        AND mp.jenis = 'pilihan'
      GROUP BY mp.id_mata_pelajaran, mp.nama_mapel
      ORDER BY mp.nama_mapel
    `,
      [id_tahun_ajaran, userId, id_tahun_ajaran]
    );

    if (mapelRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Guru belum ditugaskan mengajar mata pelajaran apapun di tahun ajaran ini.',
      });
    }

    const mataPelajaranList = mapelRows.map(row => ({
      nama: row.nama,
      total_kelas: Number(row.total_kelas),
      total_siswa: Number(row.total_siswa),
    }));

    res.json({
      success: true,
      data: {
        tahun_ajaran,
        semester,
        mata_pelajaran_list: mataPelajaranList,
      },
    });
  } catch (err) {
    console.error('Error di getDashboardData:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data dashboard.',
    });
  }
};

/**
 * Mengambil daftar mata pelajaran yang diajar oleh guru bidang studi di tahun ajaran aktif.
 */
exports.getDaftarMapel = async (req, res) => {
  try {
    const userId = req.user.id;

    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res
        .status(400)
        .json({ message: 'Tahun ajaran aktif tidak ditemukan' });
    }
    const taId = taRows[0].id_tahun_ajaran;

    const [rows] = await db.execute(
      `
      SELECT 
        mp.id_mata_pelajaran AS mata_pelajaran_id,
        mp.nama_mapel,
        mp.jenis
      FROM pembelajaran p
      JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id_mata_pelajaran
      WHERE p.user_id = ?
        AND p.tahun_ajaran_id = ?
      ORDER BY mp.jenis, mp.nama_mapel
    `,
      [userId, taId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error getDaftarMapel:', err);
    res.status(500).json({ message: 'Gagal mengambil daftar mata pelajaran' });
  }
};

/**
 * Mengambil daftar komponen penilaian (UH, PTS, PAS, dll).
 */
exports.getKomponenPenilaian = async (req, res) => {
  try {
    const [komponen] = await db.execute(`
      SELECT id_komponen, nama_komponen, urutan
      FROM komponen_penilaian
      ORDER BY urutan ASC
    `);
    res.json({ success: true, data: komponen });
  } catch (err) {
    console.error('Error get komponen:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil komponen' });
  }
};

/**
 * Mengambil konfigurasi bobot penilaian untuk suatu mata pelajaran.
 */
exports.getBobotPenilaian = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user.id;

    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran, status_pts, status_pas
      FROM tahun_ajaran 
      WHERE status = 'aktif' 
      LIMIT 1
    `);
    if (taRows.length === 0) {
      return res
        .status(500)
        .json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
    }
    const taId = taRows[0].id_tahun_ajaran;
    const status_pts = taRows[0].status_pts;
    const status_pas = taRows[0].status_pas;

    const [valid] = await db.execute(
      `
      SELECT 1 
      FROM pembelajaran 
      WHERE user_id = ? 
        AND mata_pelajaran_id = ? 
        AND tahun_ajaran_id = ?
    `,
      [userId, mapelId, taId]
    );

    if (valid.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak mengajar mata pelajaran ini',
      });
    }

    // Ambil komponen penilaian
    const [komponenList] = await db.execute(`
      SELECT id_komponen, nama_komponen, urutan
      FROM komponen_penilaian
      ORDER BY urutan ASC
    `);

    const ptsKomponen = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));

    // Jika periode PTS aktif → kirim bobot PTS = 100%, lainnya 0
    if (status_pts === 'aktif') {
      const result = komponenList.map(k => ({
        komponen_id: k.id_komponen,
        bobot: k.id_komponen === ptsKomponen?.id_komponen ? 100 : 0,
        locked: true, // Tambahkan flag locked untuk frontend (opsional)
      }));
      return res.json({ success: true, data: result, is_locked: true });
    }

    // Jika bukan periode PTS, ambil bobot dari database seperti biasa
    const [bobot] = await db.execute(
      `
      SELECT komponen_id, bobot
      FROM konfigurasi_mapel_komponen
      WHERE mapel_id = ? AND is_active = 1
      `,
      [mapelId]
    );

    const bobotMap = {};
    bobot.forEach(b => {
      bobotMap[b.komponen_id] = parseFloat(b.bobot) || 0;
    });

    const result = komponenList.map(k => ({
      komponen_id: k.id_komponen,
      bobot: bobotMap[k.id_komponen] || 0,
    }));

    res.json({ success: true, data: result, is_locked: false });
  } catch (err) {
    console.error('Error get bobot:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil bobot' });
  }
};

/**
 * Memperbarui konfigurasi bobot penilaian untuk suatu mata pelajaran.
 */
exports.updateBobotPenilaian = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const bobotList = req.body;
    const userId = req.user.id;

    // Cek status periode aktif
    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran, status_pts
      FROM tahun_ajaran 
      WHERE status = 'aktif' 
      LIMIT 1
    `);
    if (taRows.length === 0) {
      return res
        .status(500)
        .json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
    }
    const taId = taRows[0].id_tahun_ajaran;
    const status_pts = taRows[0].status_pts;

    // 🔒 BLOKIR EDIT JIKA PERIODE PTS AKTIF
    if (status_pts === 'aktif') {
      return res.status(403).json({
        success: false,
        message: 'Bobot penilaian tidak dapat diubah saat periode PTS aktif. Nilai rapor otomatis = nilai PTS.',
      });
    }

    // Validasi total bobot = 100%
    const total = bobotList.reduce(
      (sum, b) => sum + (parseFloat(b.bobot) || 0),
      0
    );
    if (Math.abs(total - 100) > 0.1) {
      return res
        .status(400)
        .json({ success: false, message: 'Total bobot harus 100%' });
    }

    // Validasi akses
    const [valid] = await db.execute(
      `
      SELECT 1 
      FROM pembelajaran 
      WHERE user_id = ? AND mata_pelajaran_id = ? AND tahun_ajaran_id = ?
      `,
      [userId, mapelId, taId]
    );
    if (valid.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Simpan bobot
    await db.execute(
      `
      DELETE FROM konfigurasi_mapel_komponen 
      WHERE mapel_id = ?
      `,
      [mapelId]
    );

    for (const b of bobotList) {
      await db.execute(
        `
        INSERT INTO konfigurasi_mapel_komponen (mapel_id, komponen_id, bobot, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, NOW(), NOW())
        `,
        [mapelId, b.komponen_id, parseFloat(b.bobot) || 0]
      );
    }

    await recomputeAllNilaiRapor(mapelId, userId);

    res.json({ success: true, message: 'Bobot penilaian berhasil disimpan' });
  } catch (err) {
    console.error('Error update bobot:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan bobot' });
  }
};

// Helper: Hitung ulang semua nilai rapor untuk suatu mata pelajaran setelah bobot diubah
const recomputeAllNilaiRapor = async (mapelId, userId) => {
  // Ambil tahun ajaran aktif
  const [taRows] = await db.execute(`
    SELECT id_tahun_ajaran, semester, status_pts, status_pas
    FROM tahun_ajaran
    WHERE status = 'aktif'
    LIMIT 1
  `);
  if (taRows.length === 0) {
    throw new Error('Tahun ajaran aktif tidak ditemukan');
  }
  const { id_tahun_ajaran: tahun_ajaran_id, semester } = taRows[0];

  // Tentukan jenis penilaian aktif
  let jenisAktif = 'PAS';
  if (taRows[0].status_pts === 'aktif') {
    jenisAktif = 'PTS';
  } else if (taRows[0].status_pas === 'aktif') {
    jenisAktif = 'PAS';
  }

  // Ambil semua siswa yang belajar mapel ini di tahun ajaran aktif
  const [siswaRows] = await db.execute(`
  SELECT sk.siswa_id, sk.kelas_id
  FROM siswa_kelas sk
  WHERE sk.tahun_ajaran_id = ?
    AND sk.kelas_id IN (
      SELECT DISTINCT p.kelas_id
      FROM pembelajaran p
      WHERE p.mata_pelajaran_id = ?
        AND p.tahun_ajaran_id = ?
    )
  `, [tahun_ajaran_id, mapelId, tahun_ajaran_id]);

  if (siswaRows.length === 0) {
    console.log(`Tidak ada siswa untuk mapel ${mapelId}.`);
    return;
  }

  // Ambil komponen dan bobot
  const [komponenRows] = await db.execute(`
    SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
  `);
  const [bobotRows] = await db.execute(
    `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ?`,
    [mapelId]
  );
  const bobotMap = new Map(bobotRows.map(b => [b.komponen_id, parseFloat(b.bobot) || 0]));
  const uhKomponenIds = komponenRows.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => k.id_komponen);
  const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
  const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

  // Proses setiap siswa
  for (const row of siswaRows) {
    const siswaId = row.siswa_id;
    const kelas_id = row.kelas_id;

    // Ambil nilai detail
    const [nilaiDetailRows] = await db.execute(
      `SELECT komponen_id, nilai 
       FROM nilai_detail 
       WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
      [siswaId, mapelId, tahun_ajaran_id]
    );
    const nilaiFromDB = {};
    nilaiDetailRows.forEach(r => {
      if (r.nilai != null) nilaiFromDB[r.komponen_id] = Math.floor(parseFloat(r.nilai));
    });

    // Hitung nilai rapor
    let nilaiRapor = 0;
    if (jenisAktif === 'PTS') {
      // PTS: nilai rapor = nilai PTS
      nilaiRapor = ptsKomponen ? nilaiFromDB[ptsKomponen.id_komponen] || 0 : 0;
    } else {
      // PAS: ambil nilai PTS final dari nilai_rapor periode PTS
      let nilaiPTSFinal = 0;
      if (ptsKomponen) {
        const [ptsRow] = await db.execute(
          `SELECT nilai_rapor FROM nilai_rapor
           WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?
             AND semester = ? AND jenis_penilaian = 'PTS'`,
          [siswaId, mapelId, tahun_ajaran_id, semester]
        );
        nilaiPTSFinal = ptsRow.length > 0 ? ptsRow[0].nilai_rapor : 0;
      }

      const nilaiUH = uhKomponenIds.map(id => nilaiFromDB[id]).filter(v => v != null && !isNaN(v));
      const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
      const nilaiPAS = pasKomponen ? nilaiFromDB[pasKomponen.id_komponen] || 0 : 0;

      const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
      const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
      const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;
      const totalBobot = totalBobotUH + bobotPTS + bobotPAS;

      if (totalBobot > 0) {
        nilaiRapor = (rataUH * totalBobotUH + nilaiPTSFinal * bobotPTS + nilaiPAS * bobotPAS) / totalBobot;
      } else {
        nilaiRapor = (rataUH + nilaiPTSFinal + nilaiPAS) / 3;
      }
    }

    nilaiRapor = Math.floor(nilaiRapor);

    // Ambil deskripsi
    const [kategoriRows] = await db.execute(
      `SELECT min_nilai, max_nilai, deskripsi
       FROM konfigurasi_nilai_rapor
       WHERE (mapel_id = ? OR mapel_id IS NULL)
       ORDER BY min_nilai DESC`,
      [mapelId]
    );
    let deskripsi = 'Belum ada deskripsi';
    for (const k of kategoriRows) {
      if (nilaiRapor >= k.min_nilai && nilaiRapor <= k.max_nilai) {
        deskripsi = k.deskripsi;
        break;
      }
    }

    // SIMPAN DENGAN kelas_id YANG BENAR
    await db.execute(
      `INSERT INTO nilai_rapor (
        siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian,
        nilai_rapor, deskripsi, created_by_user_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nilai_rapor = VALUES(nilai_rapor),
        deskripsi = VALUES(deskripsi),
        updated_at = NOW()`,
      [siswaId, mapelId, kelas_id, tahun_ajaran_id, semester, jenisAktif, nilaiRapor, deskripsi, userId]
    );
  }

  console.log(`Berhasil menghitung ulang nilai rapor untuk ${siswaRows.length} siswa di mapel ${mapelId}`);
};

/**
 * Mengambil daftar kategori nilai akademik untuk suatu mata pelajaran.
 */
exports.getKategoriAkademik = async (req, res) => {
  try {
    const { mapel_id } = req.query;
    if (!mapel_id) {
      return res
        .status(400)
        .json({ success: false, message: 'Parameter mapel_id wajib diisi' });
    }

    const mapelIdNum = parseInt(mapel_id, 10);
    if (isNaN(mapelIdNum) || mapelIdNum <= 0) {
      return res
        .status(400)
        .json({ success: false, message: 'mapel_id tidak valid' });
    }

    const [kategori] = await db.execute(
      `
      SELECT 
        id_config AS id, 
        min_nilai, 
        max_nilai, 
        deskripsi, 
        urutan
      FROM konfigurasi_nilai_rapor
      WHERE mapel_id = ?
      ORDER BY urutan ASC
    `,
      [mapelIdNum]
    );

    res.json({ success: true, data: kategori });
  } catch (err) {
    console.error('Error get kategori akademik:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil kategori akademik' });
  }
};

/**
 * Menambahkan kategori nilai akademik baru untuk suatu mata pelajaran dan tahun ajaran aktif.
 */
exports.createKategoriAkademik = async (req, res) => {
  try {
    const { min_nilai, max_nilai, deskripsi, mapel_id } = req.body;

    if (min_nilai > max_nilai || min_nilai < 0 || max_nilai > 100) {
      return res
        .status(400)
        .json({ success: false, message: 'Range nilai tidak valid' });
    }

    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Tahun ajaran aktif belum diatur' });
    }
    const tahun_ajaran_id = taRows[0].id_tahun_ajaran;

    const [result] = await db.execute(
      `
      INSERT INTO konfigurasi_nilai_rapor (
        mapel_id, 
        tahun_ajaran_id, 
        min_nilai, 
        max_nilai, 
        deskripsi, 
        urutan
      )
      VALUES (?, ?, ?, ?, ?, 
        (SELECT IFNULL(MAX(urutan), 0) + 1 
         FROM (SELECT urutan 
               FROM konfigurasi_nilai_rapor 
               WHERE mapel_id = ? AND tahun_ajaran_id = ?) AS tmp)
      )
    `,
      [
        mapel_id,
        tahun_ajaran_id,
        min_nilai,
        max_nilai,
        deskripsi,
        mapel_id,
        tahun_ajaran_id,
      ]
    );

    res.json({
      success: true,
      message: 'Kategori berhasil ditambahkan',
      id: result.insertId,
    });
  } catch (err) {
    console.error('Error create kategori:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal menambah kategori' });
  }
};

/**
 * Memperbarui kategori nilai akademik berdasarkan ID.
 */
exports.updateKategoriAkademik = async (req, res) => {
  try {
    const { id } = req.params;
    let { min_nilai, max_nilai, deskripsi, urutan } = req.body;

    min_nilai = Math.floor(parseFloat(min_nilai));
    max_nilai = Math.floor(parseFloat(max_nilai));
    urutan = parseInt(urutan) || 0;

    if (min_nilai < 0 || max_nilai > 100 || min_nilai > max_nilai) {
      return res
        .status(400)
        .json({ success: false, message: 'Rentang nilai tidak valid' });
    }

    const [result] = await db.execute(
      `
      UPDATE konfigurasi_nilai_rapor 
      SET 
        min_nilai = ?,
        max_nilai = ?,
        deskripsi = ?,
        urutan = ?
      WHERE id_config = ?
    `,
      [min_nilai, max_nilai, deskripsi, urutan, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Kategori tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Kategori akademik berhasil diperbarui',
    });
  } catch (err) {
    console.error('Error updateKategoriAkademik:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal memperbarui kategori' });
  }
};

/**
 * Menghapus kategori nilai akademik berdasarkan ID.
 */
exports.deleteKategoriAkademik = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute(
      `
      DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ?
    `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Kategori tidak ditemukan' });
    }

    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (err) {
    console.error('Error delete kategori:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal menghapus kategori' });
  }
};

/**
 * Mengambil daftar kelas yang diajar oleh guru bidang studi di tahun ajaran aktif.
 */
exports.getDaftarKelas = async (req, res) => {
  try {
    const userId = req.user.id;

    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Tidak ada tahun ajaran aktif' });
    }
    const taId = taRows[0].id_tahun_ajaran;

    const [kelasRows] = await db.execute(
      `
      SELECT DISTINCT k.id_kelas, k.nama_kelas
      FROM pembelajaran p
      JOIN kelas k ON p.kelas_id = k.id_kelas
      WHERE p.user_id = ? AND p.tahun_ajaran_id = ?
      ORDER BY k.nama_kelas
    `,
      [userId, taId]
    );

    res.json({
      success: true,
      data: kelasRows.map(row => ({
        kelas_id: row.id_kelas,
        nama_kelas: row.nama_kelas,
      })),
    });
  } catch (err) {
    console.error('Error getDaftarKelas:', err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil daftar kelas' });
  }
};

/**
 * Mengambil nilai siswa berdasarkan mata pelajaran dan kelas.
 */
exports.getNilaiByMapelAndKelas = async (req, res) => {
  try {
    const { mapelId, kelasId } = req.params;
    const userId = req.user.id;

    if (!mapelId || !kelasId) {
      return res.status(400).json({
        success: false,
        message: 'ID mata pelajaran dan kelas wajib diisi',
      });
    }

    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran, semester, status_pts, status_pas
      FROM tahun_ajaran
      WHERE status = 'aktif'
      LIMIT 1
    `);
    if (taRows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Tahun ajaran aktif tidak ditemukan',
      });
    }
    const {
      id_tahun_ajaran: tahun_ajaran_id,
      semester,
      status_pts,
      status_pas,
    } = taRows[0];

    let jenis_penilaian_aktif = 'PAS';
    if (status_pts === 'aktif') {
      jenis_penilaian_aktif = 'PTS';
    } else if (status_pas === 'aktif') {
      jenis_penilaian_aktif = 'PAS';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Periode penilaian tidak aktif. Tidak dapat mengambil data nilai.',
      });
    }

    const [valid] = await db.execute(
      `SELECT 1 FROM pembelajaran 
       WHERE user_id = ? AND mata_pelajaran_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?`,
      [userId, mapelId, kelasId, tahun_ajaran_id]
    );
    if (valid.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak mengajar mata pelajaran ini di kelas ini',
      });
    }

    const [namaKelasRow] = await db.execute(
      `SELECT nama_kelas FROM kelas WHERE id_kelas = ?`,
      [kelasId]
    );
    const kelasNama = namaKelasRow[0]?.nama_kelas || 'Kelas Tidak Diketahui';

    const [siswaRows] = await db.execute(
      `SELECT s.id_siswa AS id, s.nis, s.nisn, s.nama_lengkap AS nama
       FROM siswa s
       JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
       WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
       ORDER BY s.nama_lengkap`,
      [kelasId, tahun_ajaran_id]
    );

    const [komponenRows] = await db.execute(`
      SELECT id_komponen, nama_komponen 
      FROM komponen_penilaian 
      ORDER BY urutan
    `);

    const [bobotRows] = await db.execute(
      `SELECT komponen_id, bobot 
       FROM konfigurasi_mapel_komponen 
       WHERE mapel_id = ?`,
      [mapelId]
    );

    const [configRows] = await db.execute(
      `SELECT min_nilai, max_nilai, deskripsi 
       FROM konfigurasi_nilai_rapor 
       WHERE mapel_id = ?
       ORDER BY min_nilai DESC`,
      [mapelId]
    );

    const [nilaiRaporRows] = await db.execute(
      `SELECT siswa_id, nilai_rapor, deskripsi, jenis_penilaian
       FROM nilai_rapor
       WHERE mapel_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?`,
      [mapelId, tahun_ajaran_id, semester, jenis_penilaian_aktif]
    );

    const nilaiRaporMap = new Map();
    nilaiRaporRows.forEach(row => {
      nilaiRaporMap.set(row.siswa_id, {
        nilai_rapor: row.nilai_rapor,
        deskripsi: row.deskripsi,
      });
    });

    const bobotMap = new Map();
    bobotRows.forEach(b => bobotMap.set(b.komponen_id, parseFloat(b.bobot) || 0));

    const uhKomponenIds = komponenRows
      .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
      .map(k => k.id_komponen);
    const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

    const siswaList = [];
    for (const s of siswaRows) {
      const [nilaiDetailRows] = await db.execute(
        `SELECT komponen_id, nilai 
         FROM nilai_detail 
         WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
        [s.id, mapelId, tahun_ajaran_id]
      );

      const nilaiMap = {};
      nilaiDetailRows.forEach(n => (nilaiMap[n.komponen_id] = n.nilai));

      // Jika nilai rapor sudah disimpan, gunakan data itu
      if (nilaiRaporMap.has(s.id)) {
        const dataRapor = nilaiRaporMap.get(s.id);
        const nilaiRecord = {};
        komponenRows.forEach(k => {
          nilaiRecord[k.id_komponen] = nilaiMap[k.id_komponen] ?? null;
        });

        siswaList.push({
          id: s.id,
          nama: s.nama,
          nis: s.nis,
          nisn: s.nisn,
          nilai_rapor: dataRapor.nilai_rapor,
          deskripsi: dataRapor.deskripsi,
          nilai: nilaiRecord,
        });
      } else {
        // Jika belum disimpan, hitung preview nilai rapor
        const nilaiUH = uhKomponenIds
          .map(id => nilaiMap[id])
          .filter(v => v != null);
        const rataUH =
          nilaiUH.length > 0
            ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length
            : 0;
        const totalBobotUH = uhKomponenIds.reduce(
          (sum, id) => sum + (bobotMap.get(id) || 0),
          0
        );
        const nilaiPTS = ptsKomponen ? nilaiMap[ptsKomponen.id_komponen] || 0 : 0;
        const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
        const nilaiPAS = pasKomponen ? nilaiMap[pasKomponen.id_komponen] || 0 : 0;
        const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;

        const totalBobot = totalBobotUH + bobotPTS + bobotPAS;
        let nilaiRapor = 0;
        let deskripsi = 'Belum ada deskripsi';

        // Cek apakah bobot pernah diatur (ada entri di konfigurasi_mapel_komponen)
        const hasBobotConfig = bobotRows.length > 0;

        if (hasBobotConfig && totalBobot > 0) {
          nilaiRapor = (
            (rataUH * totalBobotUH) +
            (nilaiPTS * bobotPTS) +
            (nilaiPAS * bobotPAS)
          ) / totalBobot;
        } else {
          // Jika bobot belum diatur atau total bobot = 0, nilai rapor = 0
          nilaiRapor = 0;
        }

        const nilaiRaporBulat = Math.floor(nilaiRapor);

        for (const config of configRows) {
          if (
            nilaiRaporBulat >= config.min_nilai &&
            nilaiRaporBulat <= config.max_nilai
          ) {
            deskripsi = config.deskripsi;
            break;
          }
        }

        const nilaiRecord = {};
        komponenRows.forEach(k => {
          nilaiRecord[k.id_komponen] = nilaiMap[k.id_komponen] ?? null;
        });

        siswaList.push({
          id: s.id,
          nama: s.nama,
          nis: s.nis,
          nisn: s.nisn,
          nilai_rapor: nilaiRaporBulat,
          deskripsi: deskripsi,
          nilai: nilaiRecord,
        });
      }
    }

    res.json({
      success: true,
      siswaList,
      komponen: komponenRows,
      kelas: kelasNama,
      jenis_penilaian_aktif,
    });
  } catch (err) {
    console.error('Error getNilaiByMapelAndKelas:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data nilai' });
  }
};

/**
 * Menyimpan nilai untuk satu komponen penilaian.
 */
exports.simpanNilai = async (req, res) => {
  try {
    const { siswa_id, mapel_id, komponen_id, nilai } = req.body;
    const user_id = req.user.id;

    if (!siswa_id || !mapel_id || !komponen_id || nilai === undefined) {
      return res
        .status(400)
        .json({ success: false, message: 'Semua field wajib diisi' });
    }
    if (nilai < 0 || nilai > 100) {
      return res
        .status(400)
        .json({ success: false, message: 'Nilai harus antara 0 dan 100' });
    }

    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res
        .status(500)
        .json({
          success: false,
          message: 'Tahun ajaran aktif tidak ditemukan',
        });
    }
    const taId = taRows[0].id_tahun_ajaran;

    const [valid] = await db.execute(
      `
      SELECT 1 FROM pembelajaran 
      WHERE user_id = ? AND mata_pelajaran_id = ? AND kelas_id IN (
        SELECT kelas_id FROM siswa_kelas 
        WHERE siswa_id = ? AND tahun_ajaran_id = ?
      ) AND tahun_ajaran_id = ?
    `,
      [user_id, mapel_id, siswa_id, taId, taId]
    );

    if (valid.length === 0) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await db.execute(
      `
      INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        nilai = VALUES(nilai),
        updated_at = NOW()
    `,
      [siswa_id, mapel_id, komponen_id, nilai, taId]
    );

    res.json({ success: true, message: 'Nilai berhasil disimpan' });
  } catch (err) {
    console.error('Error simpanNilai:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
  }
};

/**
 * Menyimpan nilai untuk banyak komponen sekaligus dan menghitung nilai rapor otomatis.
 */
exports.simpanNilaiKomponenBanyak = async (req, res) => {
  try {
    const { mapelId, siswaId } = req.params;
    const { nilai } = req.body;
    const mapelIdNum = parseInt(mapelId, 10);
    const siswaIdNum = parseInt(siswaId, 10);
    if (isNaN(mapelIdNum) || isNaN(siswaIdNum)) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }
    const userId = req.user.id;
    const jenis_penilaian = req.jenis_penilaian;
    if (!jenis_penilaian) {
      return res.status(400).json({
        success: false,
        message: 'Periode penilaian tidak aktif'
      });
    }
    const [taRows] = await db.execute(`
      SELECT id_tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
    `);
    if (taRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tahun ajaran aktif tidak ditemukan',
      });
    }
    const tahun_ajaran_id = taRows[0].id_tahun_ajaran;

    // Simpan semua nilai ke nilai_detail
    for (const [komponenIdStr, nilaiSiswa] of Object.entries(nilai)) {
      const komponenId = parseInt(komponenIdStr, 10);
      let nilaiBulat = 0;
      if (nilaiSiswa != null && nilaiSiswa !== '' && !isNaN(nilaiSiswa)) {
        nilaiBulat = Math.floor(parseFloat(nilaiSiswa));
        if (nilaiBulat < 0) nilaiBulat = 0;
        if (nilaiBulat > 100) nilaiBulat = 100;
      }
      await db.execute(
        `INSERT INTO nilai_detail (siswa_id, mapel_id, komponen_id, nilai, tahun_ajaran_id, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nilai = VALUES(nilai),
           updated_at = NOW()`,
        [siswaIdNum, mapelIdNum, komponenId, nilaiBulat, tahun_ajaran_id, userId]
      );
    }

    // Ambil data komponen, bobot, dan nilai dari database
    const [nilaiRows] = await db.execute(
      `SELECT komponen_id, nilai FROM nilai_detail WHERE siswa_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?`,
      [siswaIdNum, mapelIdNum, tahun_ajaran_id]
    );
    const [komponenRows] = await db.execute(`
      SELECT id_komponen, nama_komponen FROM komponen_penilaian ORDER BY urutan
    `);
    const [bobotRows] = await db.execute(
      `SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ?`,
      [mapelIdNum]
    );

    const nilaiMap = new Map();
    nilaiRows.forEach(row => nilaiMap.set(row.komponen_id, row.nilai || 0));
    const bobotMap = new Map();
    bobotRows.forEach(row => bobotMap.set(row.komponen_id, parseFloat(row.bobot) || 0));

    const uhKomponenIds = komponenRows
      .filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen))
      .map(k => k.id_komponen);
    const ptsKomponen = komponenRows.find(k => /^PTS$/i.test(k.nama_komponen));
    const pasKomponen = komponenRows.find(k => /^PAS$/i.test(k.nama_komponen));

    const nilaiUH = uhKomponenIds.map(id => nilaiMap.get(id) || 0);
    const rataUH = nilaiUH.length > 0 ? nilaiUH.reduce((a, b) => a + b, 0) / nilaiUH.length : 0;
    const nilaiPTS = ptsKomponen ? nilaiMap.get(ptsKomponen.id_komponen) || 0 : 0;
    const nilaiPAS = pasKomponen ? nilaiMap.get(pasKomponen.id_komponen) || 0 : 0;

    const totalBobotUH = uhKomponenIds.reduce((sum, id) => sum + (bobotMap.get(id) || 0), 0);
    const bobotPTS = ptsKomponen ? bobotMap.get(ptsKomponen.id_komponen) || 0 : 0;
    const bobotPAS = pasKomponen ? bobotMap.get(pasKomponen.id_komponen) || 0 : 0;

    const totalBobot = totalBobotUH + bobotPTS + bobotPAS;
    let nilaiRapor = 0;

    // Cek apakah bobot pernah diatur
    const hasBobotConfig = bobotRows.length > 0;

    if (hasBobotConfig && totalBobot > 0) {
      const totalNilaiBobot =
        (rataUH * totalBobotUH) +
        (nilaiPTS * bobotPTS) +
        (nilaiPAS * bobotPAS);
      nilaiRapor = totalNilaiBobot / totalBobot;
    } else {
      // Jika bobot belum diatur atau total bobot = 0, nilai rapor = 0
      nilaiRapor = 0;
    }

    const nilaiRaporBulat = Math.floor(nilaiRapor);

    let deskripsi = 'Belum ada deskripsi';
    const [configRows] = await db.execute(
      `SELECT min_nilai, max_nilai, deskripsi 
       FROM konfigurasi_nilai_rapor 
       WHERE mapel_id = ? 
       ORDER BY min_nilai DESC`,
      [mapelIdNum]
    );
    for (const config of configRows) {
      if (nilaiRaporBulat >= config.min_nilai && nilaiRaporBulat <= config.max_nilai) {
        deskripsi = config.deskripsi;
        break;
      }
    }

    // Simpan ke nilai_rapor
    const [kelasRows] = await db.execute(
      `SELECT kelas_id FROM pembelajaran 
       WHERE mata_pelajaran_id = ? AND user_id = ? AND tahun_ajaran_id = ? LIMIT 1`,
      [mapelIdNum, userId, tahun_ajaran_id]
    );
    if (kelasRows.length === 0) {
      return res.status(500).json({ success: false, message: 'Kelas tidak ditemukan' });
    }
    const kelas_id = kelasRows[0].kelas_id;

    const [semesterRows] = await db.execute(
      `SELECT semester FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
      [tahun_ajaran_id]
    );
    const semester = semesterRows.length > 0
      ? (semesterRows[0].semester || '').trim().toLowerCase() === 'ganjil' ? 'Ganjil' : 'Genap'
      : 'Genap';

    await db.execute(
      `INSERT INTO nilai_rapor (
        siswa_id, mapel_id, kelas_id, tahun_ajaran_id, semester, jenis_penilaian,
        nilai_rapor, deskripsi, created_by_user_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nilai_rapor = VALUES(nilai_rapor),
        deskripsi = VALUES(deskripsi),
        updated_at = NOW()`,
      [
        siswaIdNum,
        mapelIdNum,
        kelas_id,
        tahun_ajaran_id,
        semester,
        jenis_penilaian,
        nilaiRaporBulat,
        deskripsi,
        userId,
      ]
    );

    res.json({
      success: true,
      message: `Nilai (${jenis_penilaian}) berhasil disimpan`,
      nilai_rapor: nilaiRaporBulat,
      deskripsi: deskripsi,
    });
  } catch (err) {
    console.error('Error simpanNilaiKomponenBanyak:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
  }
};

/**
 * Mengambil informasi tahun ajaran aktif (termasuk status PTS/PAS).
 */
exports.getTahunAjaranAktif = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        id_tahun_ajaran,
        tahun_ajaran,
        semester,
        status_pts,
        status_pas
      FROM tahun_ajaran
      WHERE status = 'aktif'
      LIMIT 1
    `);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tahun ajaran aktif belum diatur oleh admin.',
      });
    }
    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error('Error getTahunAjaranAktif:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil tahun ajaran aktif',
    });
  }
};
