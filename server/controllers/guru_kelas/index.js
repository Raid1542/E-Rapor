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
const rekapanController = require('./rekapanController');
const raporController = require('./raporController');
const tahunAjaranController = require('./tahunAjaranController');
const aturPenilaianController = require('../controllers/guru_kelas/aturPenilaianController');
const batchPenilaianController = require('../controllers/guru_kelas/batchPenilaianController');

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

    // Rekapan
    ...rekapanController,

    // Rapor
    ...raporController,

    // Tahun Ajaran
    ...tahunAjaranController,
    
    // Batch Penilaian
    ...batchPenilaianController,
};