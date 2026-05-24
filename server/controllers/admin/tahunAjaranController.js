/**
 * Nama File: tahunAjaranController.js
 * Fungsi: Controller untuk mengelola tahun ajaran (2 tabel: induk + semester)
 *         Mendukung tampilan 1 baris UI (Ganjil & Genap digabung)
 */

const tahunAjaranModel = require('../../models/tahunAjaranModel');
const db = require('../../config/db');

const getTahunAjaran = async (req, res) => {
    try {
        const data = await tahunAjaranModel.getAllTahunAjaran();

        // Format response agar sesuai dengan kolom tabel di frontend
        const formattedData = data.map(row => ({
            id_induk: row.id_tahun_ajaran_induk,
            tahun_ajaran: row.tahun_ajaran,

            // Tanggal PTS/PAS Ganjil
            pts_ganjil: row.pts_ganjil,
            pas_ganjil: row.pas_ganjil,

            // Tanggal PTS/PAS Genap
            pts_genap: row.pts_genap,
            pas_genap: row.pas_genap,

            // Status & Semester Aktif
            status: row.status_ganjil === 'aktif' ? 'AKTIF' : 'NONAKTIF',
            semester_aktif: row.semester_aktif,

            // ID Detail untuk keperluan edit (opsional)
            id_detail_ganjil: row.id_ganjil,
            id_detail_genap: row.id_genap,

            created_at: row.created_at
        }));

        res.json({
            success: true,
            data: formattedData,
            total: formattedData.length
        });

    } catch (err) {
        console.error('Error get tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data tahun ajaran'
        });
    }
};

const tambahTahunAjaran = async (req, res) => {
    try {
        const {
            tahun1,
            tahun2,
            pts_ganjil,
            pas_ganjil,
            pts_genap,
            pas_genap
        } = req.body;

        // Validasi input wajib
        if (!tahun1 || !tahun2) {
            return res.status(400).json({
                success: false,
                message: 'Tahun ajaran wajib diisi (contoh: 2024/2025)'
            });
        }

        const tahun_ajaran = `${tahun1}/${tahun2}`;

        // Cek duplikasi: apakah tahun ajaran sudah ada?
        const existing = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran_induk WHERE tahun_ajaran = ?`,
            [tahun_ajaran]
        );

        if (existing[0].length > 0) {
            return res.status(400).json({
                success: false,
                message: `Tahun ajaran ${tahun_ajaran} sudah ada! Tidak perlu duplikat.`
            });
        }

        // Create via model (transaction: induk + ganjil + genap)
        const id_induk = await tahunAjaranModel.createTahunAjaran({
            tahun_ajaran,
            pts_ganjil: pts_ganjil || null,
            pas_ganjil: pas_ganjil || null,
            pts_genap: pts_genap || null,
            pas_genap: pas_genap || null
        });

        res.status(201).json({
            success: true,
            message: `Tahun ajaran ${tahun_ajaran} berhasil ditambahkan (Ganjil & Genap)`,
            id_induk
        });

    } catch (err) {
        console.error('Error tambah tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah tahun ajaran'
        });
    }
};

const updateTahunAjaran = async (req, res) => {
    try {
        const { id_induk } = req.params; // ← Perhatikan: pakai id_induk, bukan id!
        const { pts_ganjil, pas_ganjil, pts_genap, pas_genap } = req.body;

        // Validasi: minimal ada 1 field yang diupdate
        if (!pts_ganjil && !pas_ganjil && !pts_genap && !pas_genap) {
            return res.status(400).json({
                success: false,
                message: 'Minimal satu tanggal PTS/PAS harus diisi untuk diupdate'
            });
        }

        // Update via model (transaction: update ganjil/genap sesuai field yang dikirim)
        const success = await tahunAjaranModel.updateTahunAjaran(id_induk, {
            pts_ganjil,
            pas_ganjil,
            pts_genap,
            pas_genap
        });

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Data tahun ajaran berhasil diperbarui'
        });

    } catch (err) {
        console.error('Error update tahun ajaran:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data tahun ajaran'
        });
    }
};

const gantiSemester = async (req, res) => {
    try {
        const { id_induk } = req.params;
        const { semester_baru } = req.body; // 'Ganjil' atau 'Genap'

        // Validasi input
        if (!['Ganjil', 'Genap'].includes(semester_baru)) {
            return res.status(400).json({
                success: false,
                message: 'Semester harus Ganjil atau Genap'
            });
        }

        // Cek apakah tahun ajaran induk ada
        const [cekInduk] = await db.execute(
            `SELECT id_tahun_ajaran_induk FROM tahun_ajaran_induk WHERE id_tahun_ajaran_induk = ?`,
            [id_induk]
        );

        if (cekInduk.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tahun ajaran tidak ditemukan'
            });
        }

        // Ganti semester via model (transaction: nonaktifkan semua → aktifkan yang dipilih)
        await tahunAjaranModel.gantiSemesterAktif(id_induk, semester_baru);

        res.json({
            success: true,
            message: `Semester aktif berhasil diganti ke ${semester_baru}. Data siswa/kelas/guru tetap sama!`,
            semester_aktif: semester_baru
        });

    } catch (err) {
        console.error('Error ganti semester:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengganti semester aktif'
        });
    }
};

module.exports = {
    getTahunAjaran,
    tambahTahunAjaran,
    updateTahunAjaran,
    gantiSemester
};