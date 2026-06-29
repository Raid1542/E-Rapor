/**
 * Nama File: index.js
 * Fungsi: Export semua controller guru kelas
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// ═════════════════════════════════════════════════════════════════════════════
// GURU KELAS CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
    ...require('./profilController'),           // Profil, password, foto
    ...require('./kelasController'),            // Data kelas & siswa
    ...require('./absensiController'),          // Absensi PTS/PAS
    ...require('./catatanWaliController'),      // Catatan wali kelas
    ...require('./ekskulController'),           // Ekstrakurikuler
    ...require('./kokurikulerController'),      // Nilai kokurikuler
    ...require('./nilaiAkademikController'),    // Nilai akademik
    ...require('./aturPenilaianController'),    // Konfigurasi penilaian
    ...require('./batchPenilaianController'),   // Batch save kategori
    ...require('./rekapanController'),          // Rekapan & ekspor
    ...require('./raporController'),            // Generate rapor
    ...require('./tahunAjaranController'),      // Tahun ajaran
};