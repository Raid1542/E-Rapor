/**
 * Nama File: kelasModel.js
 * Fungsi: Model CRUD kelas (validasi fase, cek duplikasi, detail wali & siswa)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

const db = require('../../config/db');

const VALID_FASE = ['A', 'B', 'C'];

const kelasModel = {
  /** Ambil semua kelas (opsional filter tahun ajaran) */
  async getAll(tahun_ajaran_id = null) {
    if (tahun_ajaran_id) {
      const [rows] = await db.execute('SELECT * FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC', [tahun_ajaran_id]);
      return rows;
    }
    const [rows] = await db.execute('SELECT * FROM kelas ORDER BY nama_kelas ASC');
    return rows;
  },

  /** Ambil kelas by ID */
  async getById(id) {
    const [rows] = await db.execute('SELECT * FROM kelas WHERE id_kelas = ?', [id]);
    return rows[0] || null;
  },

  /** Ambil kelas dengan detail (wali, jumlah siswa, status TA) */
  async getByIdWithDetails(id, tahunAjaranIdInduk) {
    const [rows] = await db.execute(`
        SELECT 
            k.id_kelas,
            k.nama_kelas,
            k.fase,
            k.tahun_ajaran_id,
            COALESCE(u.nama_lengkap, '-') AS wali_kelas,
            COALESCE(gk.user_id, NULL) AS wali_kelas_id,
            COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa,
            ta.status AS status_tahun_ajaran,
            ta.tahun_ajaran
        FROM kelas k
        LEFT JOIN guru_kelas gk ON k.id_kelas = gk.kelas_id 
            AND gk.tahun_ajaran_id IN (
                SELECT id_tahun_ajaran 
                FROM tahun_ajaran 
                WHERE id_tahun_ajaran_induk = ?
            )
        LEFT JOIN user u ON gk.user_id = u.id_user
        LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id 
            AND sk.id_tahun_ajaran_induk = ?
        LEFT JOIN tahun_ajaran ta ON k.tahun_ajaran_id = ta.id_tahun_ajaran_induk
        WHERE k.id_kelas = ?
        GROUP BY k.id_kelas, k.nama_kelas, k.fase, k.tahun_ajaran_id, 
                 u.nama_lengkap, gk.user_id, ta.status, ta.tahun_ajaran
    `, [tahunAjaranIdInduk, tahunAjaranIdInduk, id]);

    return rows[0] || null;
  },

  /** Tambah kelas baru (validasi fase & duplikasi) */
  async create(data) {
    const { nama_kelas, fase, tahun_ajaran_id } = data;
    if (!nama_kelas || !fase || !tahun_ajaran_id) {
      throw new Error('Nama kelas, fase, dan tahun_ajaran_id wajib diisi');
    }
    if (!VALID_FASE.includes(fase)) {
      throw new Error(`Fase tidak valid. Pilih dari: ${VALID_FASE.join(', ')}`);
    }

    // ✅ FIXED: Cek duplikasi berdasarkan tahun_ajaran_induk
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
  },

  /** Update kelas */
  async update(id, data) {
    const { nama_kelas, fase, tahun_ajaran_id } = data;
    if (!nama_kelas || !fase || !tahun_ajaran_id) {
      throw new Error('Nama kelas, fase, dan tahun_ajaran_id wajib diisi');
    }
    if (!VALID_FASE.includes(fase)) {
      throw new Error(`Fase tidak valid. Pilih dari: ${VALID_FASE.join(', ')}`);
    }

    // ✅ FIXED: Cek duplikasi berdasarkan tahun_ajaran_induk
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
  },

  /** Ambil semua kelas per tahun ajaran */
  async getByTahunAjaran(tahun_ajaran_id) {
    if (!tahun_ajaran_id) throw new Error('tahun_ajaran_id wajib diisi');
    const [rows] = await db.execute('SELECT * FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC', [tahun_ajaran_id]);
    return rows;
  },
};

module.exports = kelasModel;