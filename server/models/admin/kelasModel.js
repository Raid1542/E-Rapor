/**
 * Nama File: kelasModel.js
 * Fungsi: Model untuk mengelola data kelas, termasuk validasi fase,
 *         pencegahan duplikasi nama kelas per tahun ajaran, dan CRUD kelas.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2-25
 */

const db = require('../../config/db');

// Daftar fase yang valid sesuai ENUM di database
const VALID_FASE = ['A', 'B', 'C'];

const kelasModel = {
  // Mengambil semua kelas (opsional: filter berdasarkan tahun ajaran)
  async getAll(tahun_ajaran_id = null) {
    if (tahun_ajaran_id) {
      const [rows] = await db.execute(
        'SELECT * FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC',
        [tahun_ajaran_id]
      );
      return rows;
    }
    const [rows] = await db.execute(
      'SELECT * FROM kelas ORDER BY nama_kelas ASC'
    );
    return rows;
  },

  // Mengambil data kelas berdasarkan ID
  async getById(id) {
    const [rows] = await db.execute('SELECT * FROM kelas WHERE id_kelas = ?', [id]);
    return rows[0] || null;
  },

  async getByIdWithDetails(id, tahunAjaranId) {
    // ✅ TAMBAHAN: Ambil id_tahun_ajaran_induk dari tahunAjaranId
    const [taInfo] = await db.execute(
      `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
      [tahunAjaranId]
    );

    if (taInfo.length === 0) {
      return null;
    }

    const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

    // ✅ DIPERBAIKI: Gunakan id_tahun_ajaran_induk untuk siswa_kelas
    const [rows] = await db.execute(
      `
        SELECT 
            k.id_kelas AS id,
            k.nama_kelas,
            k.fase,
            k.tahun_ajaran_id,             
            COALESCE(wk.nama_lengkap, '-') AS wali_kelas,
            wk.user_id AS wali_kelas_id,
            COUNT(DISTINCT sk.siswa_id) AS jumlah_siswa,
            ta.status AS status_tahun_ajaran  
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
        LEFT JOIN siswa_kelas sk ON k.id_kelas = sk.kelas_id AND sk.id_tahun_ajaran_induk = ?
        LEFT JOIN tahun_ajaran ta ON k.tahun_ajaran_id = ta.id_tahun_ajaran
        WHERE k.id_kelas = ? 
        AND k.tahun_ajaran_id = ?
        GROUP BY k.id_kelas, k.nama_kelas, k.fase, k.tahun_ajaran_id, wk.nama_lengkap, wk.user_id, ta.status
        `,
      [tahunAjaranId, idTahunAjaranInduk, id, tahunAjaranId]
    );
    return rows[0] || null;
  },

  // Menambahkan kelas baru
  async create(data) {
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
      throw new Error(`Kelas dengan nama "${nama_kelas}" sudah ada di tahun ajaran ini`);
    }

    const [result] = await db.execute(
      'INSERT INTO kelas (nama_kelas, fase, tahun_ajaran_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [nama_kelas.trim(), fase, tahun_ajaran_id]
    );
    return result.insertId;
  },

  // Memperbarui data kelas
  async update(id, data) {
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
  },

  // Mengambil semua kelas berdasarkan tahun ajaran
  async getByTahunAjaran(tahun_ajaran_id) {
    if (!tahun_ajaran_id) {
      throw new Error('tahun_ajaran_id wajib diisi');
    }
    const [rows] = await db.execute(
      'SELECT * FROM kelas WHERE tahun_ajaran_id = ? ORDER BY nama_kelas ASC',
      [tahun_ajaran_id]
    );
    return rows;
  },
};

module.exports = kelasModel;