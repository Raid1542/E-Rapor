const db = require('../config/db');

class SalinDariTahunSebelumnyaService {

  /**
   * Dapatkan ID tahun ajaran sebelumnya
   */
  static async getIdTahunAjaranSebelumnya(idTahunAjaranSaatIni) {
    const [result] = await db.query(
      `SELECT id_tahun_ajaran FROM tahun_ajaran 
       WHERE id_tahun_ajaran < ? 
       ORDER BY id_tahun_ajaran DESC 
       LIMIT 1`,
      [idTahunAjaranSaatIni]
    );
    
    return result.length > 0 ? result[0].id_tahun_ajaran : null;
  }

  /**
   * Dapatkan semester dari tahun ajaran
   */
  static async getSemesterDariTA(idTahunAjaran) {
    const [result] = await db.query(
      `SELECT semester FROM tahun_ajaran WHERE id_tahun_ajaran = ? LIMIT 1`,
      [idTahunAjaran]
    );
    return result.length > 0 ? result[0].semester : null;
  }

  /**
   * Copy kategori kokurikuler dari TA sebelumnya (PER KELAS)
   * Tabel: kategori_grade_kokurikuler
   */
  static async salinKokurikuler(idTahunAjaranSaatIni, semesterAktif, idKelas) {
    const connection = await db.getConnection();
    
    try {
      await connection.query('START TRANSACTION');
      
      const idTahunSebelumnya = await this.getIdTahunAjaranSebelumnya(idTahunAjaranSaatIni);
      
      if (!idTahunSebelumnya) {
        throw new Error('Tidak ada tahun ajaran sebelumnya untuk dicopy');
      }

      // Ambil semester dari TA sebelumnya (untuk query yang tepat)
      const semesterSebelumnya = await this.getSemesterDariTA(idTahunSebelumnya);
      
      // Ambil data dari TA sebelumnya untuk kelas ini
      const [dataExisting] = await connection.query(
        `SELECT id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi, urutan
         FROM kategori_grade_kokurikuler 
         WHERE tahun_ajaran_id = ? 
           AND semester = ? 
           AND kelas_id = ?`,
        [idTahunSebelumnya, semesterSebelumnya, idKelas]
      );
      
      if (dataExisting.length === 0) {
        throw new Error('Tidak ada data kokurikuler di tahun ajaran sebelumnya untuk kelas ini');
      }
      
      // Hapus data lama di TA aktif untuk kelas ini
      await connection.query(
        `DELETE FROM kategori_grade_kokurikuler 
         WHERE tahun_ajaran_id = ? 
           AND semester = ? 
           AND kelas_id = ?`,
        [idTahunAjaranSaatIni, semesterAktif, idKelas]
      );
      
      // Insert data baru
      const nilaiInsert = dataExisting.map(d => [
        idTahunAjaranSaatIni,
        semesterAktif,
        idKelas,
        d.id_aspek_kokurikuler,
        d.rentang_min,
        d.rentang_max,
        d.grade,
        d.deskripsi,
        d.urutan
      ]);
      
      await connection.query(
        `INSERT INTO kategori_grade_kokurikuler 
         (tahun_ajaran_id, semester, kelas_id, id_aspek_kokurikuler, rentang_min, rentang_max, grade, deskripsi, urutan)
         VALUES ?`,
        [nilaiInsert]
      );
      
      await connection.query('COMMIT');
      
      return {
        success: true,
        message: `Berhasil copy ${dataExisting.length} kategori kokurikuler dari TA sebelumnya`,
        jumlah: dataExisting.length
      };
      
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Copy kategori akademik dari TA sebelumnya (PER KELAS + PER MAPEL)
   * Tabel: konfigurasi_nilai_rapor
   */
  static async salinAkademik(idTahunAjaranSaatIni, idMapel, idKelas) {
    const connection = await db.getConnection();
    
    try {
      await connection.query('START TRANSACTION');
      
      const idTahunSebelumnya = await this.getIdTahunAjaranSebelumnya(idTahunAjaranSaatIni);
      
      if (!idTahunSebelumnya) {
        throw new Error('Tidak ada tahun ajaran sebelumnya');
      }
      
      // Ambil data dari TA sebelumnya
      const [dataExisting] = await connection.query(
        `SELECT mapel_id, min_nilai, max_nilai, deskripsi, urutan
         FROM konfigurasi_nilai_rapor 
         WHERE tahun_ajaran_id = ? 
           AND mapel_id = ? 
           AND kelas_id = ?`,
        [idTahunSebelumnya, idMapel, idKelas]
      );
      
      if (dataExisting.length === 0) {
        throw new Error('Tidak ada data akademik untuk mapel ini di TA sebelumnya untuk kelas ini');
      }
      
      // Hapus data lama
      await connection.query(
        `DELETE FROM konfigurasi_nilai_rapor 
         WHERE tahun_ajaran_id = ? 
           AND mapel_id = ? 
           AND kelas_id = ?`,
        [idTahunAjaranSaatIni, idMapel, idKelas]
      );
      
      // Insert data baru
      const nilaiInsert = dataExisting.map(d => [
        idTahunAjaranSaatIni,
        idMapel,
        idKelas,
        d.min_nilai,
        d.max_nilai,
        d.deskripsi,
        d.urutan
      ]);
      
      await connection.query(
        `INSERT INTO konfigurasi_nilai_rapor 
         (tahun_ajaran_id, mapel_id, kelas_id, min_nilai, max_nilai, deskripsi, urutan)
         VALUES ?`,
        [nilaiInsert]
      );
      
      await connection.query('COMMIT');
      
      return {
        success: true,
        message: `Berhasil copy ${dataExisting.length} kategori akademik`,
        jumlah: dataExisting.length
      };
      
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Copy bobot akademik dari TA sebelumnya (PER KELAS + PER MAPEL)
   * Tabel: konfigurasi_mapel_komponen
   */
  static async salinBobot(idTahunAjaranSaatIni, idMapel, idKelas) {
    const connection = await db.getConnection();
    
    try {
      await connection.query('START TRANSACTION');
      
      const idTahunSebelumnya = await this.getIdTahunAjaranSebelumnya(idTahunAjaranSaatIni);
      
      if (!idTahunSebelumnya) {
        throw new Error('Tidak ada tahun ajaran sebelumnya');
      }
      
      // Ambil data bobot dari TA sebelumnya
      const [dataExisting] = await connection.query(
        `SELECT komponen_id, bobot
         FROM konfigurasi_mapel_komponen 
         WHERE tahun_ajaran_id = ? 
           AND mapel_id = ? 
           AND kelas_id = ?
           AND is_active = 1`,
        [idTahunSebelumnya, idMapel, idKelas]
      );
      
      if (dataExisting.length === 0) {
        throw new Error('Tidak ada data bobot untuk mapel ini di TA sebelumnya untuk kelas ini');
      }
      
      // Hapus data lama
      await connection.query(
        `DELETE FROM konfigurasi_mapel_komponen 
         WHERE tahun_ajaran_id = ? 
           AND mapel_id = ? 
           AND kelas_id = ?`,
        [idTahunAjaranSaatIni, idMapel, idKelas]
      );
      
      // Insert data baru
      const nilaiInsert = dataExisting.map(d => [
        idTahunAjaranSaatIni,
        idMapel,
        idKelas,
        d.komponen_id,
        d.bobot
      ]);
      
      await connection.query(
        `INSERT INTO konfigurasi_mapel_komponen 
         (tahun_ajaran_id, mapel_id, kelas_id, komponen_id, bobot, is_active, created_at, updated_at)
         VALUES ?, 1, NOW(), NOW()`,
        [nilaiInsert]
      );
      
      // Perbaiki: insert dengan is_active = 1 per baris
      // Kita perlu hapus dan insert ulang dengan cara yang benar
      await connection.query(
        `DELETE FROM konfigurasi_mapel_komponen 
         WHERE tahun_ajaran_id = ? 
           AND mapel_id = ? 
           AND kelas_id = ?`,
        [idTahunAjaranSaatIni, idMapel, idKelas]
      );
      
      for (const d of dataExisting) {
        await connection.query(
          `INSERT INTO konfigurasi_mapel_komponen 
           (tahun_ajaran_id, mapel_id, kelas_id, komponen_id, bobot, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [idTahunAjaranSaatIni, idMapel, idKelas, d.komponen_id, d.bobot]
        );
      }
      
      await connection.query('COMMIT');
      
      return {
        success: true,
        message: `Berhasil copy ${dataExisting.length} bobot komponen`,
        jumlah: dataExisting.length
      };
      
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = SalinDariTahunSebelumnyaService;