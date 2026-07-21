/**
 * Nama File: index.js
 * Fungsi: Export semua controller admin.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

module.exports = {
    // User Management
    ...require('./adminController'),
    ...require('./guruController'),
    ...require('./pembinaEkskulController'),

    // School Data
    ...require('./sekolahController'),
    ...require('./siswaController'),
    ...require('./siswaPerKelasController'),

    // Academic Structure
    ...require('./tahunAjaranController'),
    ...require('./kelasController'),
    ...require('./guruKelasController'),
    ...require('./mapelController'),
    ...require('./pembelajaranController'),

    // Extracurricular
    ...require('./ekstrakurikulerController'),

    // Reporting & Analytics
    ...require('./dashboardController'),
    ...require('./raporController'),

    // System Management
    ...require('./backupController')
};