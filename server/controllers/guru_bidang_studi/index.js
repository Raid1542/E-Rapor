/**
 * Nama File: index.js
 * Fungsi: Export semua controller guru bidang studi
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 */

module.exports = {
    ...require('./profilPasswordController'),      // Profil, password, foto
    ...require('./dashboardController'),           // Statistik & progress
    ...require('./penilaianBobotController'),      // Konfigurasi bobot
    ...require('./penilaianKategoriController'),   // Konfigurasi kategori
    ...require('./penilaianNilaiController'),      // Input nilai siswa
    ...require('./dataPendukungController'),       // Mapel, kelas, komponen, TA
};