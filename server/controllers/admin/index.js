module.exports = {
    // Admin
    ...require('./adminController'),

    // Guru
    ...require('./guruController'),

    // Pembina Ekstrakurikuler
    ...require('./pembinaEkskulController'),

    // Sekolah
    ...require('./sekolahController'),

    // Siswa
    ...require('./siswaController'),

    // Siswa Per Kelas
    ...require('./siswaPerKelasController'),

    // Tahun Ajaran
    ...require('./tahunAjaranController'),

    // Kelas
    ...require('./kelasController'),

    // Guru Kelas
    ...require('./guruKelasController'),

    // Mapel
    ...require('./mapelController'),

    // Pembelajaran
    ...require('./pembelajaranController'),

    // Ekstrakurikuler
    ...require('./ekstrakurikulerController'),

    // Dashboard
    ...require('./dashboardController'),

    // Rapor
    ...require('./raporController'),

    // Backup & Restore
    ...require('./backupController'),

};