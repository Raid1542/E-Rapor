/**
 * Nama File: ekstrakurikulerModel.js
 * Fungsi: Model untuk CRUD ekstrakurikuler dan keanggotaan.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

const ekstrakurikulerModel = {
  /**
   * Ambil semua ekstrakurikuler per tahun ajaran beserta jumlah siswa.
   */
  async getAllByTahunAjaran(tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          e.id_ekskul, e.nama_ekskul, e.pembina_id, p.nama_lengkap AS nama_pembina,
          e.keterangan, e.tahun_ajaran_id, COUNT(pe.siswa_id) AS jumlah_siswa
        FROM ekstrakurikuler e
        LEFT JOIN pembina_ekstrakurikuler p ON e.pembina_id = p.id_pembina_ekstrakurikuler
        LEFT JOIN peserta_ekstrakurikuler pe ON e.id_ekskul = pe.ekskul_id AND pe.tahun_ajaran_id = ?
        WHERE e.tahun_ajaran_id = ?
        GROUP BY e.id_ekskul
        ORDER BY e.nama_ekskul ASC`,
        [tahunAjaranId, tahunAjaranId]
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data ekstrakurikuler');
    }
  },

  /**
   * Tambah data ekstrakurikuler baru.
   */
  async create(data) {
    try {
      const { nama_ekskul, pembina_id, keterangan, tahun_ajaran_id } = data;
      const [result] = await db.execute(
        `INSERT INTO ekstrakurikuler (nama_ekskul, pembina_id, keterangan, tahun_ajaran_id, created_at, updated_at) 
          VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [nama_ekskul.trim(), pembina_id || null, keterangan || null, tahun_ajaran_id]
      );
      return result.insertId;
    } catch (err) {
      throw new Error('Gagal membuat data ekstrakurikuler');
    }
  },

  /**
   * Update data ekstrakurikuler.
   */
  async update(id, data) {
    try {
      const { nama_ekskul, pembina_id, keterangan, tahun_ajaran_id } = data;
      const [result] = await db.execute(
        `UPDATE ekstrakurikuler SET nama_ekskul = ?, pembina_id = ?, keterangan = ?, 
          tahun_ajaran_id = ?, updated_at = NOW() WHERE id_ekskul = ?`,
        [nama_ekskul.trim(), pembina_id || null, keterangan || null, tahun_ajaran_id, id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Gagal mengupdate data ekstrakurikuler');
    }
  },

  /**
   * Hapus data ekstrakurikuler (hanya jika tidak memiliki anggota).
   */
  async deleteById(id) {
    try {
      const [peserta] = await db.execute(
        'SELECT id_peserta_ekskul FROM peserta_ekstrakurikuler WHERE ekskul_id = ? LIMIT 1',
        [id]
      );
      
      if (peserta.length > 0) {
        throw new Error('Ekstrakurikuler masih memiliki anggota');
      }

      const [result] = await db.execute('DELETE FROM ekstrakurikuler WHERE id_ekskul = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Ambil detail ekstrakurikuler berdasarkan ID.
   */
  async getById(id) {
    try {
      const [rows] = await db.execute('SELECT * FROM ekstrakurikuler WHERE id_ekskul = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil detail ekstrakurikuler');
    }
  },

  /**
   * Cek apakah nama ekstrakurikuler sudah ada (duplikasi).
   */
  async isNamaEkskulExist(namaEkskul, tahunAjaranId, excludeId = null) {
    try {
      let query = 'SELECT id_ekskul FROM ekstrakurikuler WHERE LOWER(nama_ekskul) = LOWER(?) AND tahun_ajaran_id = ?';
      const params = [namaEkskul.trim(), tahunAjaranId];
      
      if (excludeId) {
        query += ' AND id_ekskul != ?';
        params.push(excludeId);
      }

      const [rows] = await db.execute(query, params);
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal mengecek duplikasi nama ekstrakurikuler');
    }
  },

  /**
   * Ambil daftar pembina aktif untuk kebutuhan dropdown.
   */
  async getAllPembinaAktif() {
    try {
      const [rows] = await db.execute(
        `SELECT id_pembina_ekstrakurikuler AS id, nama_lengkap AS nama 
          FROM pembina_ekstrakurikuler 
          WHERE status = 'aktif' 
          ORDER BY nama_lengkap ASC`
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar pembina aktif');
    }
  },

  /**
   * Ambil daftar ekstrakurikuler aktif untuk kebutuhan dropdown.
   */
  async getDaftarEkskulAktif(tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        'SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE tahun_ajaran_id = ? ORDER BY nama_ekskul',
        [tahunAjaranId]
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar ekstrakurikuler aktif');
    }
  },

  /**
   * Ambil daftar peserta ekstrakurikuler tertentu.
   */
  async getPesertaByEkskul(ekskulId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        `SELECT s.id_siswa, s.nis, s.nisn, s.nama_lengkap AS nama, k.nama_kelas, k.id_kelas
          FROM peserta_ekstrakurikuler pe
          JOIN siswa s ON pe.siswa_id = s.id_siswa
          LEFT JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id AND sk.id_tahun_ajaran_induk = ?
          LEFT JOIN kelas k ON sk.kelas_id = k.id_kelas
          WHERE pe.ekskul_id = ? AND pe.tahun_ajaran_id = ?
          ORDER BY k.nama_kelas ASC, s.nama_lengkap ASC`,
        [tahunAjaranId, ekskulId, tahunAjaranId]
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data peserta ekstrakurikuler');
    }
  },

  /**
   * Ambil daftar ekstrakurikuler yang diikuti oleh siswa tertentu.
   */
  async getEkskulSiswa(siswaId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        `SELECT e.id_ekskul, e.nama_ekskul, COALESCE(pe.deskripsi, e.keterangan, 'Belum diisi') AS deskripsi
          FROM peserta_ekstrakurikuler pe
          JOIN ekstrakurikuler e ON pe.ekskul_id = e.id_ekskul
          WHERE pe.siswa_id = ? AND pe.tahun_ajaran_id = ?`,
        [siswaId, tahunAjaranId]
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data ekstrakurikuler siswa');
    }
  },

  /**
   * Simpan atau update keanggotaan ekstrakurikuler siswa.
   */
  async savePesertaEkskul(siswaId, tahunAjaranId, ekskulList) {
    try {
      await db.execute(
        'DELETE FROM peserta_ekstrakurikuler WHERE siswa_id = ? AND tahun_ajaran_id = ?', 
        [siswaId, tahunAjaranId]
      );
      
      if (ekskulList.length === 0) return;

      const insertData = ekskulList.map(item => [siswaId, item.ekskul_id, tahunAjaranId, item.deskripsi || null]);
      await db.query('INSERT INTO peserta_ekstrakurikuler (siswa_id, ekskul_id, tahun_ajaran_id, deskripsi) VALUES ?', [insertData]);
    } catch (err) {
      throw new Error('Gagal menyimpan data peserta ekstrakurikuler');
    }
  },

  /**
   * Ambil data kelas yang diampu oleh guru kelas aktif.
   */
  async getGuruKelasAktif(userId) {
    try {
      const [rows] = await db.execute(
        `SELECT gk.kelas_id, ta.id_tahun_ajaran, ta.tahun_ajaran, k.nama_kelas
          FROM guru_kelas gk
          JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
          JOIN kelas k ON gk.kelas_id = k.id_kelas
          WHERE gk.user_id = ? AND ta.status = 'aktif' 
          LIMIT 1`,
        [userId]
      );
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil data guru kelas aktif');
    }
  },

  /**
   * Ambil daftar siswa di kelas tertentu.
   */
  async getSiswaInKelas(kelasId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        `SELECT s.id_siswa, s.nama_lengkap AS nama, s.nis, s.nisn
          FROM siswa s 
          JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
          WHERE sk.kelas_id = ? AND sk.tahun_ajaran_id = ? 
          ORDER BY s.nama_lengkap`,
        [kelasId, tahunAjaranId]
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data siswa di kelas');
    }
  },

  /**
   * Cek apakah siswa terdaftar di kelas tertentu.
   */
  async isSiswaInKelas(siswaId, kelasId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        'SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
        [siswaId, kelasId, tahunAjaranId]
      );
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal mengecek status siswa di kelas');
    }
  },

  /**
   * Cek apakah pembina sudah ditugaskan di ekstrakurikuler lain.
   */
  async isPembinaAlreadyAssigned(pembinaId, semesterId, excludeEkskulId = null) {
    try {
      let query = 'SELECT id_ekskul, nama_ekskul FROM ekstrakurikuler WHERE pembina_id = ? AND tahun_ajaran_id = ?';
      const params = [pembinaId, semesterId];
      
      if (excludeEkskulId) {
        query += ' AND id_ekskul != ?';
        params.push(excludeEkskulId);
      }
      query += ' LIMIT 1';

      const [rows] = await db.execute(query, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      throw new Error('Gagal mengecek penugasan pembina');
    }
  }
};

module.exports = ekstrakurikulerModel;