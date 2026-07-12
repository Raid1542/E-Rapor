/**
 * Nama File: index.js
 * Fungsi: Export semua controller guru kelas
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

// ═════════════════════════════════════════════════════════════════════════════
// GURU KELAS CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    ...require('./profilController'),
    ...require('./dashboardController'),
    ...require('./kelasController'),
    ...require('./absensiController'),
    ...require('./catatanWaliController'),
    ...require('./ekskulController'),
    ...require('./kokurikulerController'),
    ...require('./nilaiAkademikController'),
    ...require('./aturPenilaianController'),
    ...require('./batchPenilaianController'),
    ...require('./rekapanController'),
    ...require('./raporController'),
    ...require('./tahunAjaranController'),
};