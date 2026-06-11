/**
 * Nama File: index.js
 * Fungsi: Menggabungkan semua controller guru kelas
 */

const profilController = require('./profilController');
const kelasController = require('./kelasController');
const absensiController = require('./absensiController');
const catatanWaliController = require('./catatanWaliController');
const ekskulController = require('./ekskulController');
const kokurikulerController = require('./kokurikulerController');
const nilaiAkademikController = require('./nilaiAkademikController');
const konfigurasiController = require('./konfigurasiController');
const rekapanController = require('./rekapanController');
const raporController = require('./raporController');
const tahunAjaranController = require('./tahunAjaranController');
const dashboardController = require('./dashboardController'); 
const aturPenilaianController = require('./aturPenilaianController');

module.exports = {
    // Dashboard
    ...dashboardController,

    // Profil
    ...profilController,

    // Kelas & Siswa
    ...kelasController,

    // Absensi
    ...absensiController,

    // Catatan Wali Kelas
    ...catatanWaliController,

    // Ekstrakurikuler
    ...ekskulController,

    // Kokurikuler
    ...kokurikulerController,

    // Nilai Akademik
    ...nilaiAkademikController,

    // Konfigurasi Penilaian
    ...konfigurasiController,

    // Rekapan
    ...rekapanController,

    // Rapor
    ...raporController,

    // Tahun Ajaran
    ...tahunAjaranController,

    // Atur Penilaian
    ...aturPenilaianController,
};