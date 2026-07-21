/**
 * Nama File: pembelajaranModel.js
 * Fungsi: Model CRUD pembelajaran (penugasan guru ke mata pelajaran dan kelas).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

const pembelajaranModel = {
  /**
   * Ambil semua data pembelajaran per tahun ajaran.
   */
  async getAllByTahunAjaran(tahunAjaranId) {
    try {
      const [rows] = await db.execute(`
        SELECT p.id, p.tahun_ajaran_id, p.kelas_id, p.mapel_id, p.user_id,
               k.nama_kelas, mp.nama_mapel, mp.kode_mapel, mp.jenis AS jenis_mapel, u.nama_lengkap AS nama_guru
        FROM pembelajaran p
        JOIN kelas k ON p.kelas_id = k.id_kelas
        JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
        JOIN user u ON p.user_id = u.id_user
        WHERE p.tahun_ajaran_id = ?
        ORDER BY k.nama_kelas, mp.jenis ASC, mp.urutan_rapor ASC, mp.nama_mapel ASC
      `, [tahunAjaranId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data pembelajaran per tahun ajaran');
    }
  },

  /**
   * Ambil data pembelajaran berdasarkan ID kelas.
   */
  async getByKelasId(kelasId, tahunAjaranId = null) {
    try {
      let sql = `
        SELECT p.id, p.tahun_ajaran_id, p.kelas_id, p.mapel_id, p.user_id,
               mp.nama_mapel, mp.kode_mapel, mp.jenis AS jenis_mapel, u.id_user, u.nama_lengkap AS nama_guru
        FROM pembelajaran p
        JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
        JOIN user u ON p.user_id = u.id_user
        WHERE p.kelas_id = ?
      `;
      const params = [kelasId];

      if (tahunAjaranId) {
        sql += ' AND p.tahun_ajaran_id = ?';
        params.push(tahunAjaranId);
      }

      sql += ' ORDER BY mp.jenis ASC, mp.urutan_rapor ASC, mp.nama_mapel ASC';
      const [rows] = await db.execute(sql, params);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil data pembelajaran berdasarkan kelas');
    }
  },

  /**
   * Ambil data pembelajaran berdasarkan kelas, dipisahkan antara wajib dan pilihan.
   */
  async getByKelasIdSeparated(kelasId, tahunAjaranId = null) {
    try {
      const semuaData = await this.getByKelasId(kelasId, tahunAjaranId);
      return {
        mapel_wajib: semuaData.filter(p => p.jenis_mapel === 'wajib'),
        mapel_pilihan: semuaData.filter(p => p.jenis_mapel === 'pilihan')
      };
    } catch (err) {
      throw new Error('Gagal memisahkan data pembelajaran wajib dan pilihan');
    }
  },

  /**
   * Ambil detail pembelajaran berdasarkan ID.
   */
  async getById(id) {
    try {
      const [rows] = await db.execute(`
        SELECT p.id, p.tahun_ajaran_id, p.kelas_id, p.mapel_id, p.user_id,
               k.nama_kelas, mp.nama_mapel, mp.kode_mapel, mp.jenis AS jenis_mapel, u.nama_lengkap AS nama_guru
        FROM pembelajaran p
        JOIN kelas k ON p.kelas_id = k.id_kelas
        JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
        JOIN user u ON p.user_id = u.id_user
        WHERE p.id = ?
      `, [id]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil detail pembelajaran');
    }
  },

  /**
   * Tambah data pembelajaran baru.
   */
  async create(data, connection = db) {
    try {
      const { tahun_ajaran_id, kelas_id, mapel_id, user_id } = data;
      const [result] = await connection.execute(
        `INSERT INTO pembelajaran (tahun_ajaran_id, kelas_id, mapel_id, user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [tahun_ajaran_id, kelas_id, mapel_id, user_id]
      );
      return result.insertId;
    } catch (err) {
      throw new Error('Gagal membuat data pembelajaran');
    }
  },

  /**
   * Update data pembelajaran.
   */
  async update(id, data, connection = db) {
    try {
      const { kelas_id, mapel_id, user_id } = data;
      const [result] = await connection.execute(
        `UPDATE pembelajaran SET kelas_id = ?, mapel_id = ?, user_id = ?, updated_at = NOW() WHERE id = ?`,
        [kelas_id, mapel_id, user_id, id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Gagal mengupdate data pembelajaran');
    }
  },

  /**
   * Hapus data pembelajaran berdasarkan ID.
   */
  async deleteById(id, connection = db) {
    try {
      const [result] = await connection.execute(
        'DELETE FROM pembelajaran WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      throw new Error('Gagal menghapus data pembelajaran');
    }
  },

  /**
   * Cek apakah data pembelajaran duplikat.
   */
  async isDuplicate(userId, kelasId, mapelId, tahunAjaranId, excludeId = null) {
    try {
      let sql = 'SELECT id FROM pembelajaran WHERE user_id = ? AND kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?';
      const params = [userId, kelasId, mapelId, tahunAjaranId];

      if (excludeId != null) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await db.execute(sql, params);
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal mengecek duplikasi pembelajaran');
    }
  },

  /**
   * Ambil guru pengampu mata pelajaran di kelas tertentu.
   */
  async getGuruPengampuMapelDiKelas(mapelId, kelasId, tahunAjaranId, excludeUserId = null) {
    try {
      let sql = 'SELECT u.id_user, u.nama_lengkap FROM pembelajaran p JOIN user u ON p.user_id = u.id_user WHERE p.mapel_id = ? AND p.kelas_id = ? AND p.tahun_ajaran_id = ?';
      const params = [mapelId, kelasId, tahunAjaranId];

      if (excludeUserId != null) {
        sql += ' AND p.user_id != ?';
        params.push(excludeUserId);
      }

      const [rows] = await db.execute(sql, params);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil data guru pengampu mata pelajaran');
    }
  },

  /**
   * Ambil data wali kelas.
   */
  async getWaliKelas(kelasId, semesterId) {
    try {
      const [rows] = await db.execute(`
        SELECT u.id_user, u.nama_lengkap
        FROM guru_kelas gk
        JOIN user u ON gk.user_id = u.id_user
        JOIN tahun_ajaran ta ON gk.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE gk.kelas_id = ? AND ta.id_tahun_ajaran_induk = (
          SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?
        )
        ORDER BY gk.id_guru_kelas DESC LIMIT 1
      `, [kelasId, semesterId]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil data wali kelas');
    }
  },

  /**
   * Cek apakah user adalah wali kelas.
   */
  async isWaliKelas(userId, kelasId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        'SELECT 1 FROM guru_kelas WHERE user_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
        [userId, kelasId, tahunAjaranId]
      );
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal mengecek status wali kelas');
    }
  },

  /**
   * Cek apakah mata pelajaran sudah memiliki nilai rapor.
   */
  async hasNilaiRapor(mapelId, kelasId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) AS jumlah FROM nilai_rapor WHERE mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
        [mapelId, kelasId, tahunAjaranId]
      );
      return rows[0].jumlah;
    } catch (err) {
      throw new Error('Gagal mengecek keberadaan nilai rapor');
    }
  },

  /**
   * Ambil daftar guru kelas yang aktif.
   */
  async getGuruKelasAktif() {
    try {
      const [rows] = await db.execute(`
        SELECT u.id_user AS id, u.nama_lengkap AS nama
        FROM user u
        INNER JOIN user_role ur ON u.id_user = ur.id_user
        WHERE u.status = 'aktif' AND ur.role = 'guru_kelas'
        ORDER BY u.nama_lengkap ASC
      `);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar guru kelas aktif');
    }
  },

  /**
   * Ambil daftar guru bidang studi yang aktif.
   */
  async getGuruBidangStudiAktif() {
    try {
      const [rows] = await db.execute(`
        SELECT u.id_user AS id, u.nama_lengkap AS nama
        FROM user u
        INNER JOIN user_role ur ON u.id_user = ur.id_user
        WHERE u.status = 'aktif' AND ur.role = 'guru_bidang_studi'
        ORDER BY u.nama_lengkap ASC
      `);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar guru bidang studi aktif');
    }
  },

  /**
   * Ambil semua guru yang aktif (kelas dan bidang studi).
   */
  async getGuruAktif() {
    try {
      const [rows] = await db.execute(`
        SELECT u.id_user AS id, u.nama_lengkap AS nama
        FROM user u
        INNER JOIN user_role ur ON u.id_user = ur.id_user
        WHERE u.status = 'aktif' AND ur.role IN ('guru_kelas', 'guru_bidang_studi')
        ORDER BY u.nama_lengkap ASC
      `);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar guru aktif');
    }
  },

  /**
   * Ambil daftar kelas per tahun ajaran induk.
   */
  async getKelasByTahunAjaran(idInduk) {
    try {
      const [rows] = await db.execute(
        'SELECT id_kelas AS id, nama_kelas AS nama FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC',
        [idInduk]
      );
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar kelas per tahun ajaran');
    }
  },

  /**
   * Ambil daftar mata pelajaran per tahun ajaran.
   */
  async getMapelByTahunAjaran(tahunAjaranId) {
    try {
      const [rows] = await db.execute(`
        SELECT id_mata_pelajaran AS id, nama_mapel AS nama, jenis, kode_mapel
        FROM mata_pelajaran 
        WHERE tahun_ajaran_id = ?
        ORDER BY jenis ASC, urutan_rapor ASC, nama_mapel ASC
      `, [tahunAjaranId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil daftar mata pelajaran per tahun ajaran');
    }
  },

  /**
   * Ambil informasi detail kelas.
   */
  async getKelasInfo(kelasId) {
    try {
      const [rows] = await db.execute(`
        SELECT k.id_kelas, k.nama_kelas, k.tahun_ajaran_id AS semester_id,
               tai.tahun_ajaran, tai.semester, tai.status AS status_ta, tai.id_tahun_ajaran_induk
        FROM kelas k
        JOIN tahun_ajaran tai ON k.tahun_ajaran_id = tai.id_tahun_ajaran
        WHERE k.id_kelas = ?
      `, [kelasId]);
      return rows[0] || null;
    } catch (err) {
      throw new Error('Gagal mengambil informasi kelas');
    }
  },

  /**
   * Cek apakah mata pelajaran duplikat di kelas yang sama.
   */
  async isMapelDuplicateInKelas(kelasId, mapelId, tahunAjaranId, excludeId = null) {
    try {
      let sql = 'SELECT id FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?';
      const params = [kelasId, mapelId, tahunAjaranId];

      if (excludeId != null) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const [rows] = await db.execute(sql, params);
      return rows.length > 0;
    } catch (err) {
      throw new Error('Gagal mengecek duplikasi mata pelajaran di kelas');
    }
  },

  /**
   * Ambil mata pelajaran wajib yang belum ditugaskan.
   */
  async getMapelWajibBelumDitugaskan(kelasId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(`
        SELECT mp.id_mata_pelajaran AS id, mp.nama_mapel, mp.kode_mapel, mp.urutan_rapor
        FROM mata_pelajaran mp
        WHERE mp.tahun_ajaran_id = ? AND mp.jenis = 'wajib'
        AND NOT EXISTS (
          SELECT 1 FROM pembelajaran p 
          WHERE p.mapel_id = mp.id_mata_pelajaran AND p.kelas_id = ? AND p.tahun_ajaran_id = ?
        )
        ORDER BY mp.urutan_rapor ASC, mp.nama_mapel ASC
      `, [tahunAjaranId, kelasId, tahunAjaranId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil mata pelajaran wajib yang belum ditugaskan');
    }
  },

  /**
   * Ambil mata pelajaran pilihan yang belum ditugaskan.
   */
  async getMapelPilihanBelumDitugaskan(kelasId, tahunAjaranId) {
    try {
      const [rows] = await db.execute(`
        SELECT mp.id_mata_pelajaran AS id, mp.nama_mapel, mp.kode_mapel
        FROM mata_pelajaran mp
        WHERE mp.tahun_ajaran_id = ? AND mp.jenis = 'pilihan'
        AND NOT EXISTS (
          SELECT 1 FROM pembelajaran p 
          WHERE p.mapel_id = mp.id_mata_pelajaran AND p.kelas_id = ? AND p.tahun_ajaran_id = ?
        )
        ORDER BY mp.nama_mapel ASC
      `, [tahunAjaranId, kelasId, tahunAjaranId]);
      return rows;
    } catch (err) {
      throw new Error('Gagal mengambil mata pelajaran pilihan yang belum ditugaskan');
    }
  },

  /**
   * Bulk insert mata pelajaran wajib.
   */
  async bulkInsertMapelWajib(kelasId, mapelIds, guruKelasId, tahunAjaranId, connection) {
    try {
      const inserted = [];
      for (const mapelId of mapelIds) {
        const [cek] = await connection.execute(
          'SELECT id FROM pembelajaran WHERE kelas_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?',
          [kelasId, mapelId, tahunAjaranId]
        );

        if (cek.length === 0) {
          await connection.execute(
            `INSERT INTO pembelajaran (kelas_id, mapel_id, user_id, tahun_ajaran_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [kelasId, mapelId, guruKelasId, tahunAjaranId]
          );
          inserted.push(mapelId);
        }
      }
      return inserted;
    } catch (err) {
      throw new Error('Gagal melakukan bulk insert mata pelajaran wajib');
    }
  }
};

module.exports = pembelajaranModel;