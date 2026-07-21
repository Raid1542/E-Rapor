/**
 * Nama File: index.js
 * Fungsi: Export semua controller guru bidang studi.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

module.exports = {
    ...require('./profilPasswordController'),
    ...require('./dashboardController'),
    ...require('./penilaianBobotController'),
    ...require('./penilaianKategoriController'),
    ...require('./penilaianNilaiController'),
    ...require('./dataPendukungController')
};