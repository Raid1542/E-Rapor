/**
 * Nama File: siswaModel.js
 * Fungsi: Model untuk mengelola data siswa
 */

const db = require('../../config/db');

const siswaModel = {
  async getSiswaByTahunAjaran(tahunAjaranId) {
    // Ambil id_tahun_ajaran_induk dari tahunAjaranId
    const [taInfo] = await db.execute(
        `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
        [tahunAjaranId]
    );

    if (taInfo.length === 0) {
        return [];
    }

    const idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;

    const [rows] = await db.execute(
      `
        SELECT 
            s.id_siswa AS id,
            s.nama_lengkap AS nama,
            s.nis,
            s.nisn,
            s.tempat_lahir,
            s.tanggal_lahir,
            s.jenis_kelamin,
            s.alamat,
            k.nama_kelas AS kelas,
            k.fase,
            s.status
        FROM siswa s
        INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
        INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
        WHERE sk.id_tahun_ajaran_induk = ?
        ORDER BY s.nama_lengkap ASC
      `,
      [idTahunAjaranInduk]
    );
    return rows;
  },

  async getSiswaById(id, tahunAjaranId = null) {
    let idTahunAjaranInduk = null;
    
    if (tahunAjaranId) {
        const [taInfo] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran WHERE id_tahun_ajaran = ?`,
            [tahunAjaranId]
        );
        if (taInfo.length > 0) {
            idTahunAjaranInduk = taInfo[0].id_tahun_ajaran_induk;
        }
    }

    let query = `
      SELECT 
          s.id_siswa AS id,
          s.nama_lengkap AS nama,
          s.nis,
          s.nisn,
          s.tempat_lahir,
          s.tanggal_lahir,
          s.jenis_kelamin,
          s.alamat,
          k.nama_kelas AS kelas,
          k.fase,
          s.status,
          sk.kelas_id,
          sk.id_tahun_ajaran_induk
      FROM siswa s
      INNER JOIN siswa_kelas sk ON s.id_siswa = sk.siswa_id
      INNER JOIN kelas k ON sk.kelas_id = k.id_kelas
    `;
    const params = [id];

    if (idTahunAjaranInduk) {
      query += ` WHERE s.id_siswa = ? AND sk.id_tahun_ajaran_induk = ?`;
      params.push(idTahunAjaranInduk);
    } else {
      query += ` WHERE s.id_siswa = ?`;
    }

    const [rows] = await db.execute(query, params);
    return rows[0] || null;
  },

  async createSiswa(siswaData, idTahunAjaranInduk, connection = null) {
    const useConn = connection || db;
    const {
      nis,
      nisn,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      status = 'aktif',
    } = siswaData;

    const [result] = await useConn.execute(
      `
        INSERT INTO siswa (
            nis, nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
            jenis_kelamin, alamat, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nis,
        nisn,
        nama_lengkap,
        tempat_lahir || null,
        tanggal_lahir || null,
        jenis_kelamin,
        alamat || null,
        status,
      ]
    );

    const siswaId = result.insertId;

    await useConn.execute(
      `
        INSERT INTO siswa_kelas (siswa_id, kelas_id, id_tahun_ajaran_induk)
        VALUES (?, ?, ?)
      `,
      [siswaId, siswaData.kelas_id, idTahunAjaranInduk]
    );

    return siswaId;
  },

  async updateSiswa(id, siswaData, idTahunAjaranInduk, connection = null) {
    const useConn = connection || db;
    const {
      nis,
      nisn,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      status = 'aktif',
    } = siswaData;

    await useConn.execute(
      `
        UPDATE siswa SET
            nis = ?,
            nisn = ?,
            nama_lengkap = ?,
            tempat_lahir = ?,
            tanggal_lahir = ?,
            jenis_kelamin = ?,
            alamat = ?,
            status = ?
        WHERE id_siswa = ?
      `,
      [
        nis,
        nisn,
        nama_lengkap,
        tempat_lahir || null,
        tanggal_lahir || null,
        jenis_kelamin,
        alamat || null,
        status,
        id,
      ]
    );

    const [existing] = await useConn.execute(
      `SELECT 1 FROM siswa_kelas WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?`,
      [id, idTahunAjaranInduk]
    );

    if (existing.length > 0) {
      await useConn.execute(
        `UPDATE siswa_kelas SET kelas_id = ? WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?`,
        [siswaData.kelas_id, id, idTahunAjaranInduk]
      );
    } else {
      await useConn.execute(
        `INSERT INTO siswa_kelas (siswa_id, kelas_id, id_tahun_ajaran_induk) VALUES (?, ?, ?)`,
        [id, siswaData.kelas_id, idTahunAjaranInduk]
      );
    }

    return true;
  },

  async deleteSiswa(id, idTahunAjaranInduk = null) {
    if (idTahunAjaranInduk) {
        await db.execute(
            'DELETE FROM siswa_kelas WHERE siswa_id = ? AND id_tahun_ajaran_induk = ?',
            [id, idTahunAjaranInduk]
        );
    } else {
        await db.execute('DELETE FROM siswa_kelas WHERE siswa_id = ?', [id]);
    }
    const [result] = await db.execute('DELETE FROM siswa WHERE id_siswa = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = siswaModel;