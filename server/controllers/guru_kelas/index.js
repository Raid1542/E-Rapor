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
const aturPenilaianController = require('./aturPenilaianController');
const batchPenilaianController = require('./batchPenilaianController');
const rekapanController = require('./rekapanController');
const raporController = require('./raporController');
const tahunAjaranController = require('./tahunAjaranController');

module.exports = {
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

    // Atur Penilaian
    ...aturPenilaianController,

    // Batch Penilaian
    ...batchPenilaianController,

    // Rekapan
    ...rekapanController,

    // Rapor
    ...raporController,

    // Tahun Ajaran
    ...tahunAjaranController,
};