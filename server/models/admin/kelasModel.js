/**
 * Nama File: kelasModel.js
 * Fungsi: Model CRUD kelas (validasi fase, cek duplikasi, detail wali & siswa).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

// Konstanta fase valid
const VALID_FASE = ['A', 'B', 'C'];

const kelasModel = {
  /**
   * Ambil semua kelas (opsional dengan filter tahun ajaran).
   */
  async getAll(tahunAjaranId = null) {
    try {
      if (tahunAjaranId) {
        const [rows] = await db.execute(
          'SELECT * FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC',
          [tahunAjaranId]
        );
        return rows;
      }

      const [rows] = await db.execute(
        'SELECT * FROM kelas ORDER BY nama_kelas ASC'
      );
      return rows;
    } catch (err) {
      console.error('DB Error kelasModel.getAll:', err.message);
      if (err.sql) console.error('SQL:', err.sql);
      throw new Error('Gagal mengambil data kelas');
    }
  },

  /**
   * Ambil detail kelas berdasarkan ID.
   */
  async getById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM kelas WHERE id_kelas = ?',
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('DB Error kelasModel.getById:', err.message);
      if (err.sql) console.error('SQL:', err.sql);
      throw new Error('Gagal mengambil detail kelas');
    }
  },

  /**
   * Ambil kelas dengan detail lengkap:
   * - Data kelas
   * - Wali kelas
   * - Jumlah siswa
   * - Status dan label tahun ajaran
   */
  async getByIdWithDetails(id, tahunAjaranIdInduk) {
    try {
      if (!id) {
        throw new Error('id_kelas wajib diisi');
      }

      if (!tahunAjaranIdInduk) {
        throw new Error('tahunAjaranIdInduk wajib diisi');
      }

      const [rows] = await db.execute(
        `
        SELECT
          k.id_kelas,
          k.nama_kelas,
          k.fase,
          k.tahun_ajaran_id,

          COALESCE(u.nama_lengkap, '-') AS wali_kelas,
          wali.user_id AS wali_kelas_id,

          COALESCE(jumlah.total_siswa, 0) AS jumlah_siswa,

          ta_info.status AS status_tahun_ajaran,
          ta_info.tahun_ajaran AS tahun_ajaran

        FROM kelas k

        LEFT JOIN (
          SELECT
            gk.kelas_id,
            MAX(gk.user_id) AS user_id
          FROM guru_kelas gk
          INNER JOIN tahun_ajaran ta_gk
            ON gk.tahun_ajaran_id = ta_gk.id_tahun_ajaran
          WHERE ta_gk.id_tahun_ajaran_induk = ?
          GROUP BY gk.kelas_id
        ) wali
          ON k.id_kelas = wali.kelas_id

        LEFT JOIN user u
          ON wali.user_id = u.id_user

        LEFT JOIN (
          SELECT
            kelas_id,
            COUNT(DISTINCT siswa_id) AS total_siswa
          FROM siswa_kelas
          WHERE id_tahun_ajaran_induk = ?
          GROUP BY kelas_id
        ) jumlah
          ON k.id_kelas = jumlah.kelas_id

        LEFT JOIN (
          SELECT
            id_tahun_ajaran_induk,
            MAX(status) AS status,
            MAX(tahun_ajaran) AS tahun_ajaran
          FROM tahun_ajaran
          GROUP BY id_tahun_ajaran_induk
        ) ta_info
          ON k.tahun_ajaran_id = ta_info.id_tahun_ajaran_induk

        WHERE k.id_kelas = ?
        LIMIT 1
        `,
        [tahunAjaranIdInduk, tahunAjaranIdInduk, id]
      );

      return rows[0] || null;
    } catch (err) {
      console.error('DB Error kelasModel.getByIdWithDetails:', err.message);
      if (err.sql) console.error('SQL:', err.sql);
      throw new Error('Gagal mengambil detail lengkap kelas');
    }
  },

  /**
   * Tambah kelas baru dengan validasi fase dan cek duplikasi.
   */
  async create(data) {
    try {
      const { nama_kelas, fase, tahun_ajaran_id } = data;

      if (!nama_kelas || !fase || !tahun_ajaran_id) {
        throw new Error('Nama kelas, fase, dan tahun_ajaran_id wajib diisi');
      }

      if (!VALID_FASE.includes(fase)) {
        throw new Error(`Fase tidak valid. Pilih dari: ${VALID_FASE.join(', ')}`);
      }

      const [existing] = await db.execute(
        'SELECT id_kelas FROM kelas WHERE LOWER(nama_kelas) = LOWER(?) AND tahun_ajaran_id = ?',
        [nama_kelas.trim(), tahun_ajaran_id]
      );

      if (existing.length > 0) {
        throw new Error(`Kelas "${nama_kelas}" sudah ada di tahun ajaran ini`);
      }

      const [result] = await db.execute(
        'INSERT INTO kelas (nama_kelas, fase, tahun_ajaran_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [nama_kelas.trim(), fase, tahun_ajaran_id]
      );

      return result.insertId;
    } catch (err) {
      console.error('DB Error kelasModel.create:', err.message);
      if (err.sql) console.error('SQL:', err.sql);
      throw err;
    }
  },

  /**
   * Update data kelas dengan validasi fase dan cek duplikasi.
   */
  async update(id, data) {
    try {
      const { nama_kelas, fase, tahun_ajaran_id } = data;

      if (!nama_kelas || !fase || !tahun_ajaran_id) {
        throw new Error('Nama kelas, fase, dan tahun_ajaran_id wajib diisi');
      }

      if (!VALID_FASE.includes(fase)) {
        throw new Error(`Fase tidak valid. Pilih dari: ${VALID_FASE.join(', ')}`);
      }

      const [existing] = await db.execute(
        'SELECT id_kelas FROM kelas WHERE LOWER(nama_kelas) = LOWER(?) AND tahun_ajaran_id = ? AND id_kelas != ?',
        [nama_kelas.trim(), tahun_ajaran_id, id]
      );

      if (existing.length > 0) {
        throw new Error(`Nama kelas "${nama_kelas}" sudah digunakan di tahun ajaran ini`);
      }

      const [result] = await db.execute(
        'UPDATE kelas SET nama_kelas = ?, fase = ?, tahun_ajaran_id = ?, updated_at = NOW() WHERE id_kelas = ?',
        [nama_kelas.trim(), fase, tahun_ajaran_id, id]
      );

      return result.affectedRows > 0;
    } catch (err) {
      console.error('DB Error kelasModel.update:', err.message);
      if (err.sql) console.error('SQL:', err.sql);
      throw err;
    }
  },

  /**
   * Ambil semua kelas berdasarkan tahun ajaran tertentu.
   */
  async getByTahunAjaran(tahunAjaranId) {
    try {
      if (!tahunAjaranId) {
        throw new Error('tahun_ajaran_id wajib diisi');
      }

      const [rows] = await db.execute(
        'SELECT * FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC',
        [tahunAjaranId]
      );

      return rows;
    } catch (err) {
      console.error('DB Error kelasModel.getByTahunAjaran:', err.message);
      if (err.sql) console.error('SQL:', err.sql);
      throw new Error('Gagal mengambil data kelas per tahun ajaran');
    }
  }
};

module.exports = kelasModel;