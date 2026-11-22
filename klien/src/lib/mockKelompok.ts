/*
 * Nama File: mockKelompok.ts
 * Fungsi: Single source of truth untuk data Guru Al-Qur'an.
 *         Struktur fleksibel: Kelompok berisi siswa yang SAMA,
 *         diajari N mapel (Tilawah & Tahfidz). Jumlah mapel bisa
 *         bertambah di masa depan tanpa ubah kode.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

/* ====== INTERFACE ====== */

export interface SiswaKelompok {
    id_siswa: number;
    nis: string;
    nisn: string;
    nama_lengkap: string;
    kelas_asal: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenis_kelamin: string;
    fase: string;
}

export interface KelompokAlQuran {
    id_kelompok: string;
    nama_kelompok: string;
    status_penguncian: { pts: boolean; pas: boolean; };
    siswa: SiswaKelompok[];
}

export interface MapelAlQuran {
    id_mapel: number;
    kode_mapel: string;
    nama_mapel: string;
}

/* ====== DATA MAPEL (FLEKSIBEL: tambah/hapus di sini, UI otomatis ikut) ====== */

export const MAPEL_ALQURAN: MapelAlQuran[] = [
    { id_mapel: 5, kode_mapel: "QUR_TIL", nama_mapel: "Al-Qur'an Tilawah" },
    { id_mapel: 6, kode_mapel: "QUR_TAH", nama_mapel: "Al-Qur'an Tahfidz" }
    // Tahun depan bisa tambah: { id_mapel: 7, kode_mapel: "QUR_AKH", nama_mapel: "Akhlak" }
];

/* ====== DATA KELOMPOK (Siswa SAMA untuk semua mapel) ====== */

export const mockDataKelompok: KelompokAlQuran[] = [
    {
        id_kelompok: "A",
        nama_kelompok: "Kelompok A",
        status_penguncian: { pts: true, pas: false },
        siswa: [
            { id_siswa: 101, nis: "2023001", nisn: "0012345678", nama_lengkap: "Ahmad Fauzi", kelas_asal: "5A", tempat_lahir: "Batam", tanggal_lahir: "2013-04-12", jenis_kelamin: "L", fase: "C" },
            { id_siswa: 102, nis: "2023002", nisn: "0012345679", nama_lengkap: "Budi Santoso", kelas_asal: "5B", tempat_lahir: "Majalengka", tanggal_lahir: "2013-07-25", jenis_kelamin: "L", fase: "C" },
            { id_siswa: 103, nis: "2023003", nisn: "0012345680", nama_lengkap: "Citra Kirana", kelas_asal: "6A", tempat_lahir: "Batam", tanggal_lahir: "2012-09-01", jenis_kelamin: "P", fase: "C" },
            { id_siswa: 104, nis: "2023004", nisn: "0012345681", nama_lengkap: "Dewi Lestari", kelas_asal: "4A", tempat_lahir: "Jakarta", tanggal_lahir: "2014-01-15", jenis_kelamin: "P", fase: "B" }
        ]
    },
    {
        id_kelompok: "B",
        nama_kelompok: "Kelompok B",
        status_penguncian: { pts: true, pas: true },
        siswa: [
            { id_siswa: 105, nis: "2023005", nisn: "0012345682", nama_lengkap: "Eko Prasetyo", kelas_asal: "5A", tempat_lahir: "Batam", tanggal_lahir: "2013-11-30", jenis_kelamin: "L", fase: "C" },
            { id_siswa: 106, nis: "2023006", nisn: "0012345683", nama_lengkap: "Fitri Handayani", kelas_asal: "6B", tempat_lahir: "Bandung", tanggal_lahir: "2012-06-18", jenis_kelamin: "P", fase: "C" },
            { id_siswa: 107, nis: "2023007", nisn: "0012345684", nama_lengkap: "Gilang Ramadhan", kelas_asal: "5B", tempat_lahir: "Batam", tanggal_lahir: "2013-03-08", jenis_kelamin: "L", fase: "C" }
        ]
    },
    {
        id_kelompok: "C",
        nama_kelompok: "Kelompok C",
        status_penguncian: { pts: false, pas: false },
        siswa: [
            { id_siswa: 108, nis: "2023008", nisn: "0012345685", nama_lengkap: "Hana Safitri", kelas_asal: "6A", tempat_lahir: "Batam", tanggal_lahir: "2012-08-22", jenis_kelamin: "P", fase: "C" },
            { id_siswa: 109, nis: "2023009", nisn: "0012345686", nama_lengkap: "Irfan Maulana", kelas_asal: "5A", tempat_lahir: "Surabaya", tanggal_lahir: "2013-05-10", jenis_kelamin: "L", fase: "C" },
            { id_siswa: 110, nis: "2023010", nisn: "0012345687", nama_lengkap: "Jasmine Putri", kelas_asal: "4A", tempat_lahir: "Batam", tanggal_lahir: "2014-02-14", jenis_kelamin: "P", fase: "B" },
            { id_siswa: 111, nis: "2023011", nisn: "0012345688", nama_lengkap: "Kamal Hakim", kelas_asal: "6B", tempat_lahir: "Medan", tanggal_lahir: "2012-12-03", jenis_kelamin: "L", fase: "C" },
            { id_siswa: 112, nis: "2023012", nisn: "0012345689", nama_lengkap: "Laila Nuraini", kelas_asal: "5B", tempat_lahir: "Batam", tanggal_lahir: "2013-10-19", jenis_kelamin: "P", fase: "C" }
        ]
    }
];

/* ====== HELPER: Hitung otomatis dari data (TIDAK HARDCODE) ====== */

export const getTotalMapel = (): number => MAPEL_ALQURAN.length;

export const getTotalKelompok = (): number => mockDataKelompok.length;

export const getTotalSiswa = (): number => 
    mockDataKelompok.reduce((sum, k) => sum + k.siswa.length, 0);

/* Validasi: maksimal 15 siswa per kelompok (aturan sekolah) */
export const MAX_SISWA_PER_KELOMPOK = 15;

export const isKelompokValid = (kelompok: KelompokAlQuran): boolean => 
    kelompok.siswa.length <= MAX_SISWA_PER_KELOMPOK;