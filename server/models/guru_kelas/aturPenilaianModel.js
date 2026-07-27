/**
 * Nama File: aturPenilaianModel.js
 * Fungsi: Model konfigurasi penilaian (kategori akademik/kokurikuler, bobot, deskripsi rata-rata).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

const db = require('../../config/db');

/**
 * Ambil tahun ajaran aktif.
 */
exports.getTahunAjaranAktif = async () => {
    try {
        const [rows] = await db.execute(`
        SELECT ta.id_tahun_ajaran, ta.id_tahun_ajaran_induk, ta.semester, ta.status_pts, ta.status_pas
        FROM tahun_ajaran ta 
        WHERE ta.status = 'aktif' 
        LIMIT 1
    `);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        throw new Error('Gagal mengambil tahun ajaran aktif');
    }
};

/**
 * Ambil daftar aspek kokurikuler.
 */
exports.getAspekKokurikuler = async () => {
    try {
        const [aspek] = await db.execute(
            'SELECT id_aspek_kokurikuler, kode, nama FROM aspek_kokurikuler ORDER BY urutan ASC'
        );
        return aspek;
    } catch (err) {
        throw new Error('Gagal mengambil daftar aspek kokurikuler');
    }
};

/**
 * Ambil daftar komponen penilaian.
 */
exports.getKomponenPenilaian = async () => {
    try {
        const [komponen] = await db.execute(
            'SELECT id_komponen, nama_komponen, urutan FROM komponen_penilaian ORDER BY urutan ASC'
        );
        return komponen;
    } catch (err) {
        throw new Error('Gagal mengambil daftar komponen penilaian');
    }
};

exports.getKomponenPenilaianList = exports.getKomponenPenilaian;

/**
 * Cek apakah guru mengajar mata pelajaran di kelas tertentu.
 */
exports.cekGuruMengajarMapelDiKelas = async (userId, mapelId, kelasId, tahunAjaranId) => {
    try {
        const [valid] = await db.execute(
            'SELECT 1 FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ?',
            [userId, mapelId, kelasId, tahunAjaranId]
        );
        return valid.length > 0;
    } catch (err) {
        throw new Error('Gagal mengecek akses guru mengajar mata pelajaran');
    }
};

/**
 * Cek overlap kategori akademik.
 */
exports.cekOverlapAkademik = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, jenis = 'PTS', excludeId = null) => {
    try {
        let query = 'SELECT id_config, min_nilai, max_nilai, deskripsi FROM konfigurasi_nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ? AND is_active = 1 AND (? <= max_nilai AND ? >= min_nilai)';
        const params = [tahunAjaranId, kelasId, jenis, minNilai, maxNilai];

        if (mapelId === null) {
            query += ' AND mapel_id IS NULL';
        } else {
            query += ' AND mapel_id = ?';
            params.push(mapelId);
        }

        if (excludeId) {
            query += ' AND id_config != ?';
            params.push(excludeId);
        }

        const [overlaps] = await db.execute(query, params);
        return overlaps;
    } catch (err) {
        throw new Error('Gagal mengecek overlap kategori akademik');
    }
};

/**
 * Cek overlap kategori kokurikuler.
 */
exports.cekOverlapKokurikuler = async (idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, jenis = 'PTS', excludeId = null) => {
    try {
        let query = 'SELECT id_kategori_grade_kokurikuler, rentang_min, rentang_max, grade, deskripsi FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? AND (? <= rentang_max AND ? >= rentang_min)';
        const params = [idAspek, tahunAjaranId, semester, kelasId, jenis, minNilai, maxNilai];

        if (excludeId) {
            query += ' AND id_kategori_grade_kokurikuler != ?';
            params.push(excludeId);
        }

        const [overlaps] = await db.execute(query, params);
        return overlaps;
    } catch (err) {
        throw new Error('Gagal mengecek overlap kategori kokurikuler');
    }
};

/**
 * Cek duplikasi grade.
 */
exports.cekDuplikasiGrade = async (idAspek, tahunAjaranId, semester, kelasId, grade, jenis = 'PTS', excludeId = null) => {
    try {
        let query = 'SELECT id_kategori_grade_kokurikuler, grade, rentang_min, rentang_max FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? AND grade = ?';
        const params = [idAspek, tahunAjaranId, semester, kelasId, jenis, grade];

        if (excludeId) {
            query += ' AND id_kategori_grade_kokurikuler != ?';
            params.push(excludeId);
        }

        const [duplikat] = await db.execute(query, params);
        return duplikat;
    } catch (err) {
        throw new Error('Gagal mengecek duplikasi grade');
    }
};

/**
 * Cek coverage nilai 0-100 untuk kategori akademik.
 */
exports.cekCoverage0to100 = async (mapelId, tahunAjaranId, kelasId, jenis = 'PTS') => {
    try {
        let query = 'SELECT min_nilai, max_nilai FROM konfigurasi_nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ?';
        const params = [tahunAjaranId, kelasId, jenis];

        if (mapelId === null) {
            query += ' AND mapel_id IS NULL';
        } else {
            query += ' AND mapel_id = ?';
            params.push(mapelId);
        }

        query += ' ORDER BY min_nilai ASC';
        const [kategoriRows] = await db.execute(query, params);

        const gaps = [];

        if (kategoriRows.length === 0) {
            gaps.push('0-100');
            return { covered: false, gaps };
        }

        if (kategoriRows[0].min_nilai > 0) {
            gaps.push(`0-${kategoriRows[0].min_nilai - 1}`);
        }

        for (let i = 0; i < kategoriRows.length - 1; i++) {
            const currentMax = kategoriRows[i].max_nilai;
            const nextMin = kategoriRows[i + 1].min_nilai;
            if (nextMin > currentMax + 1) {
                gaps.push(`${currentMax + 1}-${nextMin - 1}`);
            }
        }

        const lastMax = kategoriRows[kategoriRows.length - 1].max_nilai;
        if (lastMax < 100) {
            gaps.push(`${lastMax + 1}-100`);
        }

        if (gaps.length > 0) {
            return { covered: false, gaps };
        }

        return { covered: true };
    } catch (err) {
        throw new Error('Gagal mengecek coverage nilai 0-100');
    }
};

/**
 * Cek apakah kategori dipakai.
 */
exports.cekKategoriDipakai = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, jenis = 'PTS') => {
    try {
        if (mapelId === null) {
            return { total: 0 };
        }

        const [rows] = await db.execute(
            'SELECT COUNT(*) as total FROM nilai_rapor WHERE tahun_ajaran_id = ? AND kelas_id = ? AND nilai_rapor BETWEEN ? AND ? AND mapel_id = ? AND jenis_penilaian = ?',
            [tahunAjaranId, kelasId, minNilai, maxNilai, mapelId, jenis]
        );
        return rows[0];
    } catch (err) {
        throw new Error('Gagal mengecek kategori yang dipakai');
    }
};

/**
 * Cek komponen penilaian valid.
 */
exports.cekKomponenValid = async (komponenIds) => {
    try {
        if (!Array.isArray(komponenIds) || komponenIds.length === 0) {
            return false;
        }

        const placeholders = komponenIds.map(() => '?').join(',');
        const [rows] = await db.execute(
            `SELECT id_komponen FROM komponen_penilaian WHERE id_komponen IN (${placeholders})`,
            komponenIds
        );
        return rows.length === komponenIds.length;
    } catch (err) {
        throw new Error('Gagal mengecek validitas komponen penilaian');
    }
};

/**
 * Ambil kategori akademik.
 */
exports.getKategoriAkademik = async (mapelId, tahunAjaranId, kelasId, jenis = 'PTS') => {
    try {
        const [kategori] = await db.execute(
            'SELECT id_config AS id, min_nilai, max_nilai, deskripsi, urutan FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ? AND kelas_id = ? AND jenis_penilaian = ? ORDER BY urutan ASC, min_nilai ASC',
            [mapelId, tahunAjaranId, kelasId, jenis]
        );
        return kategori;
    } catch (err) {
        throw new Error('Gagal mengambil kategori akademik');
    }
};

/**
 * Buat kategori akademik baru.
 */
exports.createKategoriAkademik = async (mapelId, tahunAjaranId, kelasId, minNilai, maxNilai, deskripsi, jenis = 'PTS') => {
    try {
        const [maxUrutan] = await db.execute(
            'SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND kelas_id = ? AND tahun_ajaran_id = ? AND jenis_penilaian = ?',
            [mapelId, kelasId, tahunAjaranId, jenis]
        );
        const urutan = maxUrutan[0].next_urutan;

        const [result] = await db.execute(
            'INSERT INTO konfigurasi_nilai_rapor (mapel_id, kelas_id, tahun_ajaran_id, jenis_penilaian, min_nilai, max_nilai, deskripsi, urutan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [mapelId, kelasId, tahunAjaranId, jenis, minNilai, maxNilai, deskripsi, urutan]
        );
        return result.insertId;
    } catch (err) {
        throw new Error('Gagal membuat kategori akademik');
    }
};

/**
 * Perbarui kategori akademik.
 */
exports.updateKategoriAkademik = async (id, minNilai, maxNilai, deskripsi) => {
    try {
        await db.execute(
            'UPDATE konfigurasi_nilai_rapor SET min_nilai = ?, max_nilai = ?, deskripsi = ?, updated_at = NOW() WHERE id_config = ?',
            [minNilai, maxNilai, deskripsi, id]
        );
    } catch (err) {
        throw new Error('Gagal memperbarui kategori akademik');
    }
};

/**
 * Ambil kategori akademik berdasarkan ID dan kelas.
 */
exports.getKategoriByIdAndKelas = async (id, kelasId) => {
    try {
        const [existing] = await db.execute(
            'SELECT id_config, mapel_id, kelas_id, min_nilai, max_nilai, deskripsi, jenis_penilaian FROM konfigurasi_nilai_rapor WHERE id_config = ? AND kelas_id = ?',
            [id, kelasId]
        );
        return existing.length > 0 ? existing[0] : null;
    } catch (err) {
        throw new Error('Gagal mengambil kategori akademik berdasarkan ID');
    }
};

/**
 * Hapus kategori akademik.
 */
exports.deleteKategoriAkademik = async (id, kelasId) => {
    try {
        await db.execute(
            'DELETE FROM konfigurasi_nilai_rapor WHERE id_config = ? AND kelas_id = ?',
            [id, kelasId]
        );
    } catch (err) {
        throw new Error('Gagal menghapus kategori akademik');
    }
};

/**
 * Ambil kategori kokurikuler.
 */
exports.getKategoriKokurikuler = async (tahunAjaranId, semester, kelasId, jenis = 'PTS') => {
    try {
        const [kategori] = await db.execute(`
      SELECT id_kategori_grade_kokurikuler AS id, id_aspek_kokurikuler, rentang_min AS min_nilai, rentang_max AS max_nilai, grade, deskripsi, urutan
      FROM kategori_grade_kokurikuler
      WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ?
      ORDER BY id_aspek_kokurikuler, urutan ASC, rentang_min ASC
    `, [tahunAjaranId, semester, kelasId, jenis]);
        return kategori;
    } catch (err) {
        throw new Error('Gagal mengambil kategori kokurikuler');
    }
};

/**
 * Buat kategori kokurikuler baru.
 */
exports.createKategoriKokurikuler = async (idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, grade, deskripsi, jenis = 'PTS') => {
    try {
        const [maxUrutan] = await db.execute(
            'SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND kelas_id = ? AND tahun_ajaran_id = ? AND semester = ? AND jenis_penilaian = ?',
            [idAspek, kelasId, tahunAjaranId, semester, jenis]
        );
        const urutan = maxUrutan[0].next_urutan;

        const [result] = await db.execute(
            'INSERT INTO kategori_grade_kokurikuler (id_aspek_kokurikuler, tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, grade, deskripsi, urutan, jenis_penilaian) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [idAspek, tahunAjaranId, semester, kelasId, minNilai, maxNilai, grade, deskripsi, urutan, jenis]
        );
        return result.insertId;
    } catch (err) {
        throw new Error('Gagal membuat kategori kokurikuler');
    }
};

/**
 * Perbarui kategori kokurikuler.
 */
exports.updateKategoriKokurikuler = async (id, minNilai, maxNilai, grade, deskripsi) => {
    try {
        await db.execute(
            'UPDATE kategori_grade_kokurikuler SET rentang_min = ?, rentang_max = ?, grade = ?, deskripsi = ?, updated_at = NOW() WHERE id_kategori_grade_kokurikuler = ?',
            [minNilai, maxNilai, grade, deskripsi, id]
        );
    } catch (err) {
        throw new Error('Gagal memperbarui kategori kokurikuler');
    }
};

/**
 * Ambil kategori kokurikuler berdasarkan ID dan kelas.
 */
exports.getKategoriKokurikulerByIdAndKelas = async (id, kelasId) => {
    try {
        const [existing] = await db.execute(
            'SELECT id_kategori_grade_kokurikuler, id_aspek_kokurikuler, kelas_id, rentang_min, rentang_max, grade, deskripsi, jenis_penilaian FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?',
            [id, kelasId]
        );
        return existing.length > 0 ? existing[0] : null;
    } catch (err) {
        throw new Error('Gagal mengambil kategori kokurikuler berdasarkan ID');
    }
};

/**
 * Hapus kategori kokurikuler.
 */
exports.deleteKategoriKokurikuler = async (id, kelasId) => {
    try {
        await db.execute(
            'DELETE FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?',
            [id, kelasId]
        );
    } catch (err) {
        throw new Error('Gagal menghapus kategori kokurikuler');
    }
};

/**
 * Ambil bobot akademik berdasarkan mata pelajaran.
 */
exports.getBobotByMapel = async (mapelId, kelasId, jenis = 'PTS') => {
    try {
        const [bobot] = await db.execute(
            'SELECT komponen_id, bobot FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND kelas_id = ? AND jenis_penilaian = ? AND is_active = 1',
            [mapelId, kelasId, jenis]
        );
        return bobot;
    } catch (err) {
        throw new Error('Gagal mengambil bobot akademik');
    }
};

/**
 * Simpan bobot penilaian.
 */
exports.saveBobot = async (mapelId, kelasId, tahunAjaranId, bobotList, jenis = 'PTS') => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            'DELETE FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND kelas_id = ? AND jenis_penilaian = ?',
            [mapelId, kelasId, jenis]
        );

        for (const b of bobotList) {
            await connection.execute(
                'INSERT INTO konfigurasi_mapel_komponen (mapel_id, kelas_id, tahun_ajaran_id, komponen_id, bobot, is_active, jenis_penilaian, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())',
                [mapelId, kelasId, tahunAjaranId, b.komponen_id, parseFloat(b.bobot), jenis]
            );
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw new Error('Gagal menyimpan bobot penilaian');
    } finally {
        connection.release();
    }
};

/**
 * Cek coverage nilai kokurikuler.
 */
exports.cekCoverageKokurikuler = async (tahunAjaranId, semester, kelasId, jenis = 'PTS') => {
    try {
        const [aspekRows] = await db.execute(
            'SELECT id_aspek_kokurikuler, nama FROM aspek_kokurikuler ORDER BY urutan ASC'
        );

        const result = { covered: true, gaps: [] };

        for (const aspek of aspekRows) {
            const [kategoriRows] = await db.execute(
                'SELECT rentang_min, rentang_max FROM kategori_grade_kokurikuler WHERE id_aspek_kokurikuler = ? AND tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND jenis_penilaian = ? ORDER BY rentang_min ASC',
                [aspek.id_aspek_kokurikuler, tahunAjaranId, semester, kelasId, jenis]
            );

            if (kategoriRows.length === 0) {
                result.covered = false;
                result.gaps.push({ aspek: aspek.nama, gap: '0-100 (belum ada kategori)' });
                continue;
            }

            if (kategoriRows[0].rentang_min > 0) {
                result.covered = false;
                result.gaps.push({ aspek: aspek.nama, gap: `0-${kategoriRows[0].rentang_min - 1}` });
            }

            for (let i = 0; i < kategoriRows.length - 1; i++) {
                const currentMax = kategoriRows[i].rentang_max;
                const nextMin = kategoriRows[i + 1].rentang_min;
                if (nextMin > currentMax + 1) {
                    result.covered = false;
                    result.gaps.push({ aspek: aspek.nama, gap: `${currentMax + 1}-${nextMin - 1}` });
                }
            }

            const lastMax = kategoriRows[kategoriRows.length - 1].rentang_max;
            if (lastMax < 100) {
                result.covered = false;
                result.gaps.push({ aspek: aspek.nama, gap: `${lastMax + 1}-100` });
            }
        }

        return result;
    } catch (err) {
        throw new Error('Gagal mengecek coverage nilai kokurikuler');
    }
};

/**
 * Cek apakah kategori kokurikuler dipakai.
 */
exports.cekKategoriKokurikulerDipakai = async (idKategori, kelasId) => {
    try {
        const [kategoriRows] = await db.execute(
            'SELECT id_aspek_kokurikuler, rentang_min, rentang_max, jenis_penilaian FROM kategori_grade_kokurikuler WHERE id_kategori_grade_kokurikuler = ? AND kelas_id = ?',
            [idKategori, kelasId]
        );

        if (kategoriRows.length === 0) {
            return { total: 0, exists: false };
        }

        const { id_aspek_kokurikuler, rentang_min, rentang_max, jenis_penilaian } = kategoriRows[0];

        const [rows] = await db.execute(
            `SELECT COUNT(*) as total FROM nilai_kokurikuler 
       WHERE id_kelas = ? AND id_aspek_kokurikuler = ? AND jenis_penilaian = ? AND nilai BETWEEN ? AND ?`,
            [kelasId, id_aspek_kokurikuler, jenis_penilaian, rentang_min, rentang_max]
        );

        return { total: rows[0].total, exists: true };
    } catch (err) {
        throw new Error('Gagal mengecek kategori kokurikuler yang dipakai');
    }
};

/**
 * Cek kategori kokurikuler dipakai berdasarkan range.
 */
exports.cekKategoriKokurikulerDipakaiByRange = async (idAspek, kelasId, rentangMin, rentangMax, jenisPenilaian = 'PTS') => {
    if (!idAspek || !kelasId) {
        return { total: 0, exists: false, error: 'Parameter tidak lengkap' };
    }

    try {
        const [rows] = await db.execute(
            `SELECT COUNT(*) as total FROM nilai_kokurikuler 
       WHERE id_kelas = ? AND id_aspek_kokurikuler = ? AND jenis_penilaian = ? AND nilai BETWEEN ? AND ?`,
            [kelasId, idAspek, jenisPenilaian, rentangMin, rentangMax]
        );

        return { total: rows[0].total, exists: true };
    } catch (err) {
        return { total: 0, exists: false, error: err.message };
    }
};

/**
 * Ambil judul proyek kokurikuler berdasarkan kelas.
 */
exports.getJudulProyekByKelas = async (kelasId, tahunAjaranId) => {
    try {
        const [rows] = await db.execute(
            'SELECT id_judul_proyek, id_tahun_ajaran, kelas_id, judul, deskripsi FROM judul_proyek_per_tahun_ajaran WHERE kelas_id = ? AND id_tahun_ajaran = ? LIMIT 1',
            [kelasId, tahunAjaranId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        throw new Error('Gagal mengambil judul proyek kokurikuler');
    }
};

/**
 * Simpan atau perbarui judul proyek kokurikuler.
 */
exports.saveJudulProyek = async (kelasId, tahunAjaranId, judul, deskripsi = null) => {
    try {
        const [existing] = await db.execute(
            'SELECT id_judul_proyek FROM judul_proyek_per_tahun_ajaran WHERE kelas_id = ? AND id_tahun_ajaran = ?',
            [kelasId, tahunAjaranId]
        );

        if (existing.length > 0) {
            await db.execute(
                'UPDATE judul_proyek_per_tahun_ajaran SET judul = ?, deskripsi = ?, updated_at = NOW() WHERE kelas_id = ? AND id_tahun_ajaran = ?',
                [judul, deskripsi, kelasId, tahunAjaranId]
            );
            return { id: existing[0].id_judul_proyek, action: 'updated' };
        } else {
            const [result] = await db.execute(
                'INSERT INTO judul_proyek_per_tahun_ajaran (id_tahun_ajaran, kelas_id, judul, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [tahunAjaranId, kelasId, judul, deskripsi]
            );
            return { id: result.insertId, action: 'created' };
        }
    } catch (err) {
        throw new Error('Gagal menyimpan judul proyek kokurikuler');
    }
};

/**
 * Ambil kategori deskripsi rata-rata.
 */
exports.getKategoriDeskripsiRataRata = async (tahunAjaranId, semester, kelasId) => {
    try {
        const [kategori] = await db.execute(
            'SELECT id_kategori AS id, rentang_min AS min_nilai, rentang_max AS max_nilai, deskripsi, urutan FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? ORDER BY urutan ASC, rentang_min DESC',
            [tahunAjaranId, semester, kelasId]
        );
        return kategori;
    } catch (err) {
        throw new Error('Gagal mengambil kategori deskripsi rata-rata');
    }
};

/**
 * Buat kategori deskripsi rata-rata baru.
 */
exports.createKategoriDeskripsiRataRata = async (tahunAjaranId, semester, kelasId, minNilai, maxNilai, deskripsi) => {
    try {
        const [maxUrutan] = await db.execute(
            'SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan FROM kategori_deskripsi_rata_rata WHERE kelas_id = ? AND tahun_ajaran_id = ? AND semester = ?',
            [kelasId, tahunAjaranId, semester]
        );
        const urutan = maxUrutan[0].next_urutan;

        const [result] = await db.execute(
            'INSERT INTO kategori_deskripsi_rata_rata (tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, deskripsi, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tahunAjaranId, semester, kelasId, minNilai, maxNilai, deskripsi, urutan]
        );
        return result.insertId;
    } catch (err) {
        throw new Error('Gagal membuat kategori deskripsi rata-rata');
    }
};

/**
 * Perbarui kategori deskripsi rata-rata.
 */
exports.updateKategoriDeskripsiRataRata = async (id, minNilai, maxNilai, deskripsi) => {
    try {
        await db.execute(
            'UPDATE kategori_deskripsi_rata_rata SET rentang_min = ?, rentang_max = ?, deskripsi = ?, updated_at = NOW() WHERE id_kategori = ?',
            [minNilai, maxNilai, deskripsi, id]
        );
    } catch (err) {
        throw new Error('Gagal memperbarui kategori deskripsi rata-rata');
    }
};

/**
 * Ambil kategori deskripsi rata-rata berdasarkan ID dan kelas.
 */
exports.getKategoriDeskripsiRataRataByIdAndKelas = async (id, kelasId) => {
    try {
        const [existing] = await db.execute(
            'SELECT id_kategori, kelas_id, rentang_min, rentang_max, deskripsi FROM kategori_deskripsi_rata_rata WHERE id_kategori = ? AND kelas_id = ?',
            [id, kelasId]
        );
        return existing.length > 0 ? existing[0] : null;
    } catch (err) {
        throw new Error('Gagal mengambil kategori deskripsi rata-rata berdasarkan ID');
    }
};

/**
 * Hapus kategori deskripsi rata-rata.
 */
exports.deleteKategoriDeskripsiRataRata = async (id, kelasId) => {
    try {
        await db.execute(
            'DELETE FROM kategori_deskripsi_rata_rata WHERE id_kategori = ? AND kelas_id = ?',
            [id, kelasId]
        );
    } catch (err) {
        throw new Error('Gagal menghapus kategori deskripsi rata-rata');
    }
};

/**
 * Cek overlap deskripsi rata-rata.
 */
exports.cekOverlapDeskripsiRataRata = async (tahunAjaranId, semester, kelasId, minNilai, maxNilai, excludeId = null) => {
    try {
        let query = 'SELECT id_kategori, rentang_min, rentang_max, deskripsi FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? AND (? <= rentang_max AND ? >= rentang_min)';
        const params = [tahunAjaranId, semester, kelasId, minNilai, maxNilai];

        if (excludeId) {
            query += ' AND id_kategori != ?';
            params.push(excludeId);
        }

        const [overlaps] = await db.execute(query, params);
        return overlaps;
    } catch (err) {
        throw new Error('Gagal mengecek overlap deskripsi rata-rata');
    }
};

/**
 * Cek coverage deskripsi rata-rata.
 */
exports.cekCoverageDeskripsiRataRata = async (tahunAjaranId, semester, kelasId) => {
    try {
        const [kategoriRows] = await db.execute(
            'SELECT rentang_min, rentang_max FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ? ORDER BY rentang_min ASC',
            [tahunAjaranId, semester, kelasId]
        );

        const gaps = [];

        if (kategoriRows.length === 0) {
            gaps.push('0.00-100.00');
            return { covered: false, gaps };
        }

        const firstMin = parseFloat(kategoriRows[0].rentang_min);
        if (firstMin > 0.01) {
            gaps.push(`0.00-${(firstMin - 0.01).toFixed(2)}`);
        }

        for (let i = 0; i < kategoriRows.length - 1; i++) {
            const currentMax = parseFloat(kategoriRows[i].rentang_max);
            const nextMin = parseFloat(kategoriRows[i + 1].rentang_min);

            const gapStart = (currentMax + 0.01).toFixed(2);
            const gapEnd = (nextMin - 0.01).toFixed(2);

            if (nextMin > currentMax + 0.01) {
                gaps.push(`${gapStart}-${gapEnd}`);
            }
        }

        const lastMax = parseFloat(kategoriRows[kategoriRows.length - 1].rentang_max);
        if (lastMax < 99.99) {
            gaps.push(`${(lastMax + 0.01).toFixed(2)}-100.00`);
        }

        if (gaps.length > 0) {
            return { covered: false, gaps };
        }

        return { covered: true };
    } catch (err) {
        throw new Error('Gagal mengecek coverage deskripsi rata-rata');
    }
};

/**
 * Simpan batch kategori deskripsi rata-rata.
 */
exports.saveBatchKategoriDeskripsiRataRata = async (tahunAjaranId, semester, kelasId, categories) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            'DELETE FROM kategori_deskripsi_rata_rata WHERE tahun_ajaran_id = ? AND semester = ? AND kelas_id = ?',
            [tahunAjaranId, semester, kelasId]
        );

        let urutan = 1;
        for (const cat of categories) {
            await connection.execute(
                `INSERT INTO kategori_deskripsi_rata_rata 
        (tahun_ajaran_id, semester, kelas_id, rentang_min, rentang_max, deskripsi, urutan)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    tahunAjaranId,
                    semester,
                    kelasId,
                    cat.min_nilai,
                    cat.max_nilai,
                    cat.deskripsi,
                    urutan++
                ]
            );
        }

        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw new Error('Gagal menyimpan batch kategori deskripsi rata-rata');
    } finally {
        connection.release();
    }
};