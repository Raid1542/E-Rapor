/**
 * Nama File: index.js
 * Fungsi: Main controller yang meng-export semua controller admin.
 *         Menggunakan spread operator untuk menggabungkan semua sub-controller
 *         ke dalam satu objek yang dapat diakses oleh routes.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN CONTROLLERS EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    // ── User Management ─────────────────────────────────────────────────────
    ...require('./adminController'),      // CRUD admin
    ...require('./guruController'),       // CRUD guru + import Excel
    ...require('./pembinaEkskulController'), // CRUD pembina ekskul

    // ── School Data ─────────────────────────────────────────────────────────
    ...require('./sekolahController'),    // Data sekolah + logo
    ...require('./siswaController'),      // CRUD siswa master
    ...require('./siswaPerKelasController'), // Siswa per kelas

    // ── Academic Structure ──────────────────────────────────────────────────
    ...require('./tahunAjaranController'), // Tahun ajaran & semester
    ...require('./kelasController'),      // CRUD kelas
    ...require('./guruKelasController'),  // Wali kelas
    ...require('./mapelController'),      // Mata pelajaran
    ...require('./pembelajaranController'), // Pembelajaran (mapel + kelas)

    // ── Extracurricular ─────────────────────────────────────────────────────
    ...require('./ekstrakurikulerController'), // CRUD ekskul + peserta

    // ── Reporting & Analytics ───────────────────────────────────────────────
    ...require('./dashboardController'),  // Dashboard stats + upload foto
    ...require('./raporController'),      // Generate rapor PDF

    // ── System Management ───────────────────────────────────────────────────
    ...require('./backupController'),     // Backup & restore database
};