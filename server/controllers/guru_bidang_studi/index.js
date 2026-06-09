/**
 * Nama File: index.js
 * Fungsi: Main controller yang meng-export semua fungsi guru bidang studi
 *         Menggunakan spread operator untuk menggabungkan semua sub-controller
 */

module.exports = {
    // Profil (profil, password, foto)
    ...require('./profilController'),

    // Dashboard
    ...require('./dashboardController'),

    // Penilaian - Bobot
    ...require('./penilaianBobotController'),

    // Penilaian - Kategori
    ...require('./penilaianKategoriController'),

    // Penilaian - Nilai (input nilai siswa)
    ...require('./penilaianNilaiController'),

    // Data Pendukung (mapel, kelas, komponen, TA)
    ...require('./dataPendukungController'),
};