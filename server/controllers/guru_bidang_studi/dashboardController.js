/**
 * Nama File: dashboardController.js
 * Fungsi: Controller dashboard guru bidang studi (statistik, progress, warnings)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

const db = require('../../config/db');

// GET: Ambil data dashboard guru bidang studi dengan statistik lengkap
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // Step 1: Ambil Tahun Ajaran Aktif
        const [taRows] = await db.execute(`
            SELECT id_tahun_ajaran, id_tahun_ajaran_induk, tahun_ajaran, semester,
                   status_pts, status_pas, tanggal_pembagian_pts, tanggal_pembagian_pas
            FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1
        `);
        if (taRows.length === 0) return res.status(404).json({ success: false, message: 'Tahun ajaran aktif tidak ditemukan.', code: 'NO_ACTIVE_YEAR' });

        const ta = taRows[0];
        const semesterId = ta.id_tahun_ajaran;
        const indukId = ta.id_tahun_ajaran_induk;

        // Step 2: Tentukan Jenis Penilaian Aktif
        let jenis_penilaian_aktif = null;
        if (ta.status_pts === 'aktif') jenis_penilaian_aktif = 'PTS';
        else if (ta.status_pas === 'aktif') jenis_penilaian_aktif = 'PAS';

        // Step 3: Hitung Total Kelas & Siswa Unik
        const [kelasUnikResult] = await db.execute(
            'SELECT COUNT(DISTINCT kelas_id) AS total FROM pembelajaran WHERE user_id = ? AND tahun_ajaran_id = ?',
            [userId, semesterId]
        );
        const totalKelasUnik = kelasUnikResult[0]?.total || 0;

        const [siswaUnikResult] = await db.execute(`
            SELECT COUNT(DISTINCT sk.siswa_id) AS total FROM siswa_kelas sk
            WHERE sk.kelas_id IN (SELECT DISTINCT kelas_id FROM pembelajaran WHERE user_id = ? AND tahun_ajaran_id = ?)
            AND sk.id_tahun_ajaran_induk = ?
        `, [userId, semesterId, indukId]);
        const totalSiswaUnik = siswaUnikResult[0]?.total || 0;

        // Step 4: Ambil Mata Pelajaran yang Diajar (Hanya Jenis Pilihan)
        const [mapelDasar] = await db.execute(`
            SELECT mp.id_mata_pelajaran, mp.nama_mapel, mp.jenis, COUNT(DISTINCT p.kelas_id) AS total_kelas_per_mapel
            FROM pembelajaran p
            JOIN mata_pelajaran mp ON p.mapel_id = mp.id_mata_pelajaran
            WHERE p.user_id = ? AND p.tahun_ajaran_id = ? AND mp.jenis = 'pilihan'
            GROUP BY mp.id_mata_pelajaran, mp.nama_mapel, mp.jenis
            ORDER BY mp.nama_mapel
        `, [userId, semesterId]);

        if (mapelDasar.length === 0) return res.status(403).json({ success: false, message: 'Anda belum ditugaskan mengajar mapel apapun.', code: 'NOT_ASSIGNED' });

        // Step 5: Hitung Progress per Mapel + Cek Konfigurasi
        const mataPelajaranList = [];
        let totalPenilaianAda = 0;

        for (const mapel of mapelDasar) {
            // Hitung siswa yang sudah dinilai
            const [dinilaiResult] = await db.execute(`
                SELECT COUNT(DISTINCT nr.siswa_id) AS total FROM nilai_rapor nr
                WHERE nr.mapel_id = ? AND nr.tahun_ajaran_id = ? AND nr.semester = ? AND nr.jenis_penilaian = ?
                AND nr.nilai_rapor IS NOT NULL
                AND nr.siswa_id IN (
                    SELECT sk.siswa_id FROM siswa_kelas sk
                    WHERE sk.kelas_id IN (SELECT kelas_id FROM pembelajaran WHERE user_id = ? AND mapel_id = ? AND tahun_ajaran_id = ?)
                    AND sk.id_tahun_ajaran_induk = ?
                )
            `, [mapel.id_mata_pelajaran, semesterId, ta.semester, jenis_penilaian_aktif || 'PTS', userId, mapel.id_mata_pelajaran, semesterId, indukId]);

            const sudahDinilai = dinilaiResult[0]?.total || 0;
            totalPenilaianAda += sudahDinilai;

            // Cek konfigurasi bobot
            let bobotTerconfig = false;
            if (jenis_penilaian_aktif === 'PTS') {
                bobotTerconfig = true;
            } else {
                const [bobotResult] = await db.execute(
                    'SELECT COUNT(*) AS total FROM konfigurasi_mapel_komponen WHERE mapel_id = ? AND is_active = 1 AND bobot > 0',
                    [mapel.id_mata_pelajaran]
                );
                bobotTerconfig = (bobotResult[0]?.total || 0) > 0;
            }

            // Cek konfigurasi kategori
            const [kategoriResult] = await db.execute(
                'SELECT COUNT(*) AS total FROM konfigurasi_nilai_rapor WHERE mapel_id = ? AND tahun_ajaran_id = ?',
                [mapel.id_mata_pelajaran, semesterId]
            );
            const kategoriTerconfig = (kategoriResult[0]?.total || 0) > 0;

            mataPelajaranList.push({
                id: mapel.id_mata_pelajaran, nama: mapel.nama_mapel,
                total_kelas: mapel.total_kelas_per_mapel, total_siswa: totalSiswaUnik,
                sudah_dinilai: sudahDinilai, belum_dinilai: totalSiswaUnik - sudahDinilai,
                konfigurasi: { bobot: bobotTerconfig, kategori: kategoriTerconfig, lengkap: bobotTerconfig && kategoriTerconfig }
            });
        }

        // Step 6: Hitung Progress Overall
        const totalPenilaianDibutuhkan = totalSiswaUnik * mapelDasar.length;
        const overallProgress = totalPenilaianDibutuhkan > 0 ? Math.round((totalPenilaianAda / totalPenilaianDibutuhkan) * 100) : 0;

        // Step 7: Format Jadwal
        const jadwal = {
            pts: ta.tanggal_pembagian_pts ? new Date(ta.tanggal_pembagian_pts).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
            pas: ta.tanggal_pembagian_pas ? new Date(ta.tanggal_pembagian_pas).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null
        };

        // Step 8: Hitung Peringatan Konfigurasi
        const warnings = mataPelajaranList.filter(m => !m.konfigurasi.lengkap).map(m => {
            const masalah = [];
            if (jenis_penilaian_aktif !== 'PTS' && !m.konfigurasi.bobot) masalah.push('bobot belum diatur');
            if (!m.konfigurasi.kategori) masalah.push('kategori nilai belum lengkap');
            return { mapel: m.nama, masalah: masalah.join(' dan ') };
        }).filter(w => w.masalah !== '');

        // Step 9: Return Response
        res.json({
            success: true,
            data: {
                tahun_ajaran: ta.tahun_ajaran, semester: ta.semester,
                status_pts: ta.status_pts || 'nonaktif', status_pas: ta.status_pas || 'nonaktif',
                jenis_penilaian_aktif, jadwal,
                total_kelas: totalKelasUnik, total_siswa: totalSiswaUnik, total_mapel: mapelDasar.length,
                total_penilaian_dibutuhkan: totalPenilaianDibutuhkan, total_penilaian_ada: totalPenilaianAda,
                overall_progress: overallProgress, mata_pelajaran_list: mataPelajaranList, warnings
            }
        });
    } catch (err) {
        console.error('Error getDashboardData:', err);
        res.status(500).json({ success: false, message: 'Gagal memuat data dashboard: ' + err.message });
    }
};