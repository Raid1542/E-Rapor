/**
 * Nama File: index.js
 * Fungsi: Main controller yang meng-export semua controller guru bidang studi.
 *         Menggunakan spread operator untuk menggabungkan semua sub-controller
 *         ke dalam satu objek yang dapat diakses oleh routes.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// ═════════════════════════════════════════════════════════════════════════════
// GURU BIDANG STUDI CONTROLLERS EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    // ── User Management ─────────────────────────────────────────────────────
    ...require('./profilPasswordController'),      // Profil, password, foto

    // ── Dashboard & Analytics ───────────────────────────────────────────────
    ...require('./dashboardController'),           // Statistik & progress

    // ── Academic Assessment ─────────────────────────────────────────────────
    ...require('./penilaianBobotController'),      // Konfigurasi bobot
    ...require('./penilaianKategoriController'),   // Konfigurasi kategori
    ...require('./penilaianNilaiController'),      // Input nilai siswa

    // ── Supporting Data ─────────────────────────────────────────────────────
    ...require('./dataPendukungController'),       // Mapel, kelas, komponen, TA
};