/**
 * Nama File: aturPenilaianController.js
 * Fungsi: Controller untuk mengelola konfigurasi penilaian oleh guru kelas,
 *         mencakup kategori akademik, kokurikuler, rata-rata, bobot, aspek, dan komponen.
 * Lokasi: controllers/guru_kelas/aturPenilaianController.js
 */

const db = require('../../config/db');
const konfigurasiNilaiRaporModel     = require('../../models/konfigurasiNilaiRaporModel');
const konfigurasiNilaiKokurikulerModel = require('../../models/konfigurasiNilaiKokurikuler');
const bobotPenilaianModel            = require('../../models/bobotPenilaianModel');
const komponenPenilaianModel         = require('../../models/komponenPenilaianModel');

// ─── HELPER ───────────────────────────────────────────────────────────────────

const isMapelWajibGuruKelas = async (userId, mapelId, tahunAjaranIndukId) => {
  const [rows] = await db.execute(`
    SELECT mp.id_mata_pelajaran
    FROM mata_pelajaran mp
    JOIN pembelajaran p ON mp.id_mata_pelajaran = p.mata_pelajaran_id
    JOIN guru_kelas gk ON p.kelas_id = gk.kelas_id
    WHERE mp.id_mata_pelajaran = ?
      AND gk.user_id = ?
      AND mp.jenis = 'wajib'
      AND gk.tahun_ajaran_id = ?
  `, [mapelId, userId, tahunAjaranIndukId]);
  return rows.length > 0;
};

// ─── ASPEK KOKURIKULER ────────────────────────────────────────────────────────

exports.getAspekKokurikuler = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler ORDER BY urutan ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error getAspekKokurikuler:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar aspek' });
  }
};

// ─── KOMPONEN PENILAIAN ───────────────────────────────────────────────────────

exports.getKomponenPenilaian = async (req, res) => {
  try {
    const komponen = await komponenPenilaianModel.getAllKomponen();
    res.json({ success: true, data: komponen });
  } catch (err) {
    console.error('Error getKomponenPenilaian:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar komponen' });
  }
};

// ─── KATEGORI NILAI AKADEMIK ──────────────────────────────────────────────────

exports.getKategoriNilaiAkademik = async (req, res) => {
  try {
    const { mapel_id } = req.query;
    const mapelId    = mapel_id ? Number(mapel_id) : null;
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const data = await konfigurasiNilaiRaporModel.getAllKategori(mapelId, false, semesterId);
    res.json({
      success: true,
      data: data.map(item => ({
        ...item,
        min_nilai: Math.floor(item.min_nilai),
        max_nilai: Math.floor(item.max_nilai),
      })),
    });
  } catch (err) {
    console.error('Error getKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil konfigurasi nilai akademik' });
  }
};

exports.createKategoriNilaiAkademik = async (req, res) => {
  try {
    const { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;
    if (min_nilai == null || max_nilai == null || !deskripsi) {
      return res.status(400).json({ success: false, message: 'Field min_nilai, max_nilai, dan deskripsi wajib diisi' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai >= max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const newKategori = await konfigurasiNilaiRaporModel.createKategori({
      mapel_id:       mapel_id ? parseInt(mapel_id, 10) : null,
      tahun_ajaran_id: semesterId,
      min_nilai:      parseFloat(min_nilai),
      max_nilai:      parseFloat(max_nilai),
      deskripsi,
      urutan:         urutan != null ? parseInt(urutan) : 0,
    });
    res.status(201).json({ success: true, message: 'Kategori nilai akademik berhasil ditambahkan', data: newKategori });
  } catch (err) {
    console.error('Error createKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah konfigurasi nilai akademik' });
  }
};

exports.updateKategoriNilaiAkademik = async (req, res) => {
  try {
    const { id } = req.params;
    const { min_nilai, max_nilai, deskripsi, urutan, mapel_id } = req.body;
    if (min_nilai == null || max_nilai == null || !deskripsi) {
      return res.status(400).json({ success: false, message: 'Field min_nilai, max_nilai, dan deskripsi wajib diisi' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai >= max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const updated = await konfigurasiNilaiRaporModel.updateKategori(id, {
      mapel_id:       mapel_id ? parseInt(mapel_id, 10) : null,
      tahun_ajaran_id: semesterId,
      min_nilai:      parseFloat(min_nilai),
      max_nilai:      parseFloat(max_nilai),
      deskripsi,
      urutan:         urutan != null ? parseInt(urutan) : 0,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Konfigurasi akademik tidak ditemukan' });
    }
    res.json({ success: true, message: 'Kategori nilai akademik berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui konfigurasi nilai akademik' });
  }
};

exports.deleteKategoriNilaiAkademik = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await konfigurasiNilaiRaporModel.deleteKategori(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Kategori nilai akademik berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteKategoriNilaiAkademik:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus konfigurasi nilai akademik' });
  }
};

// ─── KATEGORI RATA-RATA ───────────────────────────────────────────────────────

exports.getKategoriRataRata = async (req, res) => {
  try {
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const data = await konfigurasiNilaiRaporModel.getAllKategori(null, true, semesterId);
    res.json({
      success: true,
      data: data.map(item => ({
        ...item,
        min_nilai: Math.floor(item.min_nilai),
        max_nilai: Math.floor(item.max_nilai),
      })),
    });
  } catch (err) {
    console.error('Error getKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil kategori rata-rata' });
  }
};

exports.createKategoriRataRata = async (req, res) => {
  try {
    const { min_nilai, max_nilai, deskripsi, urutan } = req.body;
    if (min_nilai == null || max_nilai == null || !deskripsi) {
      return res.status(400).json({ success: false, message: 'Field wajib diisi' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai >= max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const newKategori = await konfigurasiNilaiRaporModel.createKategori({
      mapel_id:       null,
      tahun_ajaran_id: semesterId,
      min_nilai:      parseFloat(min_nilai),
      max_nilai:      parseFloat(max_nilai),
      deskripsi,
      urutan:         urutan != null ? parseInt(urutan) : 0,
    });
    res.status(201).json({ success: true, message: 'Kategori rata-rata berhasil ditambahkan', data: newKategori });
  } catch (err) {
    console.error('Error createKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah kategori rata-rata' });
  }
};

exports.updateKategoriRataRata = async (req, res) => {
  try {
    const { id } = req.params;
    const { min_nilai, max_nilai, deskripsi, urutan } = req.body;
    if (min_nilai == null || max_nilai == null || !deskripsi) {
      return res.status(400).json({ success: false, message: 'Field wajib diisi' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai >= max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const updated = await konfigurasiNilaiRaporModel.updateKategori(id, {
      mapel_id:       null,
      tahun_ajaran_id: semesterId,
      min_nilai:      parseFloat(min_nilai),
      max_nilai:      parseFloat(max_nilai),
      deskripsi,
      urutan:         urutan != null ? parseInt(urutan) : 0,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Konfigurasi rata-rata berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui konfigurasi rata-rata' });
  }
};

exports.deleteKategoriRataRata = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await konfigurasiNilaiRaporModel.deleteKategori(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Konfigurasi rata-rata berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteKategoriRataRata:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus konfigurasi rata-rata' });
  }
};

// ─── KATEGORI NILAI KOKURIKULER ───────────────────────────────────────────────

exports.getKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const data = await konfigurasiNilaiKokurikulerModel.getAllKategori(semesterId);
    res.json({
      success: true,
      data: data.map(item => ({
        ...item,
        min_nilai: Math.floor(item.min_nilai),
        max_nilai: Math.floor(item.max_nilai),
      })),
    });
  } catch (err) {
    console.error('Error getKategoriNilaiKokurikuler:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil konfigurasi nilai kokurikuler' });
  }
};

exports.createKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const { min_nilai, max_nilai, grade, deskripsi, urutan, id_aspek_kokurikuler } = req.body;
    if (min_nilai == null || max_nilai == null || !grade || !deskripsi || !id_aspek_kokurikuler) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi, termasuk aspek kokurikuler' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai >= max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const newKategori = await konfigurasiNilaiKokurikulerModel.createKategori({
      id_aspek_kokurikuler: parseInt(id_aspek_kokurikuler),
      tahun_ajaran_id:      semesterId,
      min_nilai:            Math.floor(min_nilai),
      max_nilai:            Math.floor(max_nilai),
      grade:                grade.trim().toUpperCase(),
      deskripsi,
      urutan:               urutan != null ? parseInt(urutan) : 0,
    });
    res.status(201).json({ success: true, message: 'Kategori nilai kokurikuler berhasil ditambahkan', data: newKategori });
  } catch (err) {
    console.error('Error createKategoriNilaiKokurikuler:', err);
    res.status(500).json({ success: false, message: 'Gagal menambah konfigurasi nilai kokurikuler' });
  }
};

exports.updateKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const { id } = req.params;
    const { min_nilai, max_nilai, grade, deskripsi, urutan, id_aspek_kokurikuler } = req.body;
    if (min_nilai == null || max_nilai == null || !grade || !deskripsi || !id_aspek_kokurikuler) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi, termasuk aspek kokurikuler' });
    }
    if (min_nilai < 0 || max_nilai > 100 || min_nilai >= max_nilai) {
      return res.status(400).json({ success: false, message: 'Rentang nilai tidak valid' });
    }
    const semesterId = req.idSemesterAktif;
    if (!semesterId) {
      return res.status(400).json({ success: false, message: 'ID Semester tidak ditemukan' });
    }
    const updated = await konfigurasiNilaiKokurikulerModel.updateKategori(id, {
      id_aspek_kokurikuler: parseInt(id_aspek_kokurikuler),
      tahun_ajaran_id:      semesterId,
      min_nilai:            parseFloat(min_nilai),
      max_nilai:            parseFloat(max_nilai),
      grade:                grade.trim().toUpperCase(),
      deskripsi,
      urutan:               urutan != null ? parseInt(urutan) : 0,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Konfigurasi kokurikuler tidak ditemukan' });
    }
    res.json({ success: true, message: 'Kategori nilai kokurikuler berhasil diperbarui' });
  } catch (err) {
    console.error('Error updateKategoriNilaiKokurikuler:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui konfigurasi nilai kokurikuler' });
  }
};

exports.deleteKategoriNilaiKokurikuler = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await konfigurasiNilaiKokurikulerModel.deleteKategori(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Konfigurasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Kategori nilai kokurikuler berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteKategoriNilaiKokurikuler:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus konfigurasi nilai kokurikuler' });
  }
};

// ─── BOBOT PENILAIAN AKADEMIK ─────────────────────────────────────────────────

exports.getBobotAkademikByMapel = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user.id;
    const tahunAjaranIndukId = req.idTahunAjaranInduk;
    const semesterId         = req.idSemesterAktif;
    const { status_pts }     = req.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId) {
      return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
    }

    const isValid = await isMapelWajibGuruKelas(userId, mapelId, tahunAjaranIndukId);
    if (!isValid) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: hanya untuk mata pelajaran wajib yang Anda kelola' });
    }

    const isPeriodePTS = status_pts === 'aktif';
    const komponenList = await komponenPenilaianModel.getAllKomponen();
    const ptsKomponen  = komponenList.find(k => /^PTS$/i.test(k.nama_komponen));

    if (isPeriodePTS && ptsKomponen) {
      const result = komponenList.map(k => ({
        komponen_id: k.id_komponen,
        bobot:       k.id_komponen === ptsKomponen.id_komponen ? 100 : 0,
        is_active:   true,
      }));
      return res.json({ success: true, data: result, is_locked: true });
    }

    const bobot = await bobotPenilaianModel.getBobotByMapel(mapelId, semesterId);
    if (bobot.length === 0) {
      const defaultBobot = komponenList.map(k => ({ komponen_id: k.id_komponen, bobot: 0, is_active: true }));
      await bobotPenilaianModel.updateBobotByMapel(mapelId, defaultBobot, semesterId);
      const newBobot = await bobotPenilaianModel.getBobotByMapel(mapelId, semesterId);
      return res.json({ success: true, data: newBobot, is_locked: false });
    }

    res.json({ success: true, data: bobot, is_locked: false });
  } catch (err) {
    console.error('Error getBobotAkademikByMapel:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil bobot penilaian' });
  }
};

exports.updateBobotAkademikByMapel = async (req, res) => {
  try {
    const { mapelId } = req.params;
    const userId = req.user.id;
    const tahunAjaranIndukId = req.idTahunAjaranInduk;
    const semesterId         = req.idSemesterAktif;
    const { status_pts }     = req.penilaianContext || {};

    if (!tahunAjaranIndukId || !semesterId) {
      return res.status(400).json({ success: false, message: 'Data tahun ajaran tidak ditemukan' });
    }

    const isValid = await isMapelWajibGuruKelas(userId, mapelId, tahunAjaranIndukId);
    if (!isValid) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: hanya untuk mapel wajib Anda' });
    }

    if (status_pts === 'aktif') {
      return res.status(403).json({
        success: false,
        message: 'Bobot penilaian tidak dapat diubah saat periode PTS aktif.',
      });
    }

    const bobotList = req.body;
    if (!Array.isArray(bobotList)) {
      return res.status(400).json({ success: false, message: 'Data bobot harus berupa array' });
    }

    const total = bobotList.reduce((sum, b) => sum + (parseFloat(b.bobot) || 0), 0);
    if (Math.abs(total - 100) > 0.1) {
      return res.status(400).json({ success: false, message: 'Total bobot harus 100%' });
    }

    await bobotPenilaianModel.updateBobotByMapel(mapelId, bobotList, semesterId);

    res.json({ success: true, message: 'Bobot penilaian berhasil diperbarui.' });
  } catch (err) {
    console.error('Error updateBobotAkademikByMapel:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui bobot penilaian' });
  }
};