/**
 * Nama File: ekstrakurikulerModel.js
 * Fungsi: Model untuk mengelola data ekstrakurikuler dan keanggotaannya
 */

const db = require('../../config/db');

const ekstrakurikulerModel = {

  // Mengambil semua ekskul berdasarkan tahun ajaran (JOIN dengan pembina)
async getAllByTahunAjaran(tahun_ajaran_id) {
  const [rows] = await db.execute(
    `SELECT 
        e.id_ekskul,
        e.nama_ekskul,
        e.pembina_id,
        p.nama_lengkap AS nama_pembina,
        e.keterangan,
        e.tahun_ajaran_id,
        COUNT(pe.siswa_id) AS jumlah_siswa
    FROM ekstrakurikuler e
    LEFT JOIN pembina_ekstrakurikuler p 
        ON e.pembina_id = p.id_pembina_ekstrakurikuler
    LEFT JOIN peserta_ekstrakurikuler pe 
        ON e.id_ekskul = pe.ekskul_id 
        AND pe.tahun_ajaran_id = ?
    WHERE e.tahun_ajaran_id = ?
    GROUP BY e.id_ekskul
    ORDER BY e.nama_ekskul ASC`,
    [tahun_ajaran_id, tahun_ajaran_id]
  );
  return rows;
},

  // Menambahkan ekskul baru
  async create(data) {
    const { nama_ekskul, pembina_id, keterangan, tahun_ajaran_id } = data;
    const [result] = await db.execute(
      `INSERT INTO ekstrakurikuler 
        (nama_ekskul, pembina_id, keterangan, tahun_ajaran_id, created_at, updated_at) 
        VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        nama_ekskul.trim(),
        pembina_id || null,
        keterangan || null,
        tahun_ajaran_id,
      ]
    );
    return result.insertId;
  },

  // Memperbarui data ekskul
  async update(id, data) {
    const { nama_ekskul, pembina_id, keterangan, tahun_ajaran_id } = data;
    const [result] = await db.execute(
      `UPDATE ekstrakurikuler 
        SET nama_ekskul = ?, 
            pembina_id = ?, 
            keterangan = ?, 
            tahun_ajaran_id = ?, 
            updated_at = NOW() 
        WHERE id_ekskul = ?`,
      [
        nama_ekskul.trim(),
        pembina_id || null,
        keterangan || null,
        tahun_ajaran_id,
        id,
      ]
    );
    return result.affectedRows > 0;
  },

  // Menghapus ekskul (hanya jika tidak punya anggota)
  async deleteById(id) {
    const [peserta] = await db.execute(
      'SELECT id_peserta_ekskul FROM peserta_ekstrakurikuler WHERE ekskul_id = ? LIMIT 1',
      [id]
    );
    if (peserta.length > 0) {
      throw new Error('Ekstrakurikuler tidak bisa dihapus karena masih memiliki anggota.');
    }

    const [result] = await db.execute(
      'DELETE FROM ekstrakurikuler WHERE id_ekskul = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Mengambil detail ekskul berdasarkan ID
  async getById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM ekstrakurikuler WHERE id_ekskul = ?',
      [id]
    );
    return rows[0] || null;
  },

  // Cek duplikasi nama ekskul
  async isNamaEkskulExist(nama_ekskul, tahun_ajaran_id, excludeId = null) {
    let query = 'SELECT id_ekskul FROM ekstrakurikuler WHERE LOWER(nama_ekskul) = LOWER(?) AND tahun_ajaran_id = ?';
    const params = [nama_ekskul.trim(), tahun_ajaran_id];

    if (excludeId) {
      query += ' AND id_ekskul != ?';
      params.push(excludeId);
    }

    const [rows] = await db.execute(query, params);
    return rows.length > 0;
  },


  // Mendapatkan daftar pembina aktif untuk dropdown
  async getAllPembinaAktif() {
    const [rows] = await db.execute(
      `SELECT 
          id_pembina_ekstrakurikuler AS id, 
          nama_lengkap AS nama 
        FROM pembina_ekstrakurikuler 
        WHERE status = 'aktif' 
        ORDER BY nama_lengkap ASC`
    );
    return rows;
  },

  // Mendapatkan daftar ekskul aktif untuk dropdown
  async getDaftarEkskulAktif(tahun_ajaran_id) {
    const [rows] = await db.execute(
      'SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ? ORDER BY nama_ekskul',
      [tahun_ajaran_id]
    );
    return rows;
  },



  // Mengambil daftar peserta ekskul (untuk fitur "Lihat Siswa")
  async getPesertaByEkskul(ekskulId, tahunAjaranId) {
    const [rows] = await db.execute(
      `SELECT 
        s.id_siswa,
        s.nis,
        s.nisn,
        s.nama_lengkap AS nama,
        k.nama_kelas,
        k.id_kelas
        FROM peserta_ekstrakurikuler pe
        JOIN siswa s ON pe.siswa_id = s.id_siswa
        LEFT JOIN siswa_kelas sk 
        ON s.id_siswa = sk.siswa_id 
        AND sk.id_tahun_ajaran_induk = ?
    LEFT JOIN kelas k ON sk.kelas_id = k.id_kelas
    WHERE pe.ekskul_id = ? AND pe.tahun_ajaran_id = ?
    ORDER BY k.nama_kelas ASC, s.nama_lengkap ASC`,
      [tahunAjaranId, ekskulId, tahunAjaranId]
    );
    return rows;
  },

  // Mendapatkan ekskul yang diikuti siswa
  async getEkskulSiswa(siswaId, tahunAjaranId) {
    const [rows] = await db.execute(
      `SELECT 
          e.id_ekskul,
          e.nama_ekskul,
          COALESCE(pe.deskripsi, e.keterangan, 'Belum diisi') AS deskripsi
      FROM peserta_ekstrakurikuler pe
      JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul
      WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
      [siswaId, tahunAjaranId]
    );
    return rows;
  },

  // Menyimpan keanggotaan ekskul siswa
  async savePesertaEkskul(siswaId, tahunAjaranId, ekskulList) {
    await db.execute(
      'DELETE FROM peserta_ekstrakurikuler WHERE siswa_id = ? AND tahun_ajaran_id = ?',
      [siswaId, tahunAjaranId]
    );

    if (ekskulList.length === 0) return;

    const insertData = ekskulList.map(item => [
      siswaId,
      item.ekskul_id,
      tahunAjaranId,
      item.deskripsi || null,
    ]);

    await db.query(
      'INSERT INTO peserta_ekstrakurikuler (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi) VALUES ?',
      [insertData]
    );
  },



  async getGuruKelasAktif(userId) {
    const [rows] = await db.execute(
      `SELECT 
          gk.kelas_id, 
          ta.id_tahun_ajaran, 
          ta.tahun_ajaran,
          k.nama_kelas
      FROM guru_kelas gk
      JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
      JOIN kelas k ON gk.kelas_id = k.id_kelas
      WHERE gk.user_id = ? AND ta.status = 'aktif'
      LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async getSiswaInKelas(kelasId, tahunAjaranId) {
    const [rows] = await db.execute(
      `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn
      FROM siswa s
      JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
      WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ?
      ORDER BY s.nama_lengkap`,
      [kelasId, tahunAjaranId]
    );
    return rows;
  },

  async isSiswaInKelas(siswaId, kelasId, tahunAjaranId) {
    const [rows] = await db.execute(
      'SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
      [siswaId, kelasId, tahunAjaranId]
    );
    return rows.length > 0;
  },
};

module.exports = ekstrakurikulerModel;