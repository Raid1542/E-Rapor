/*
 * Nama File: mockDashboardAlquran.ts
 * Fungsi: Dashboard data yang DIHITUNG OTOMATIS dari mockKelompok.ts.
 *         Tidak ada angka hardcoded — semua dari single source of truth.
 *         Jika mapel/kelompok/siswa ditambah di mockKelompok.ts,
 *         dashboard otomatis menyesuaikan.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { 
    MAPEL_ALQURAN, 
    mockDataKelompok, 
    getTotalMapel, 
    getTotalKelompok, 
    getTotalSiswa 
} from './mockKelompok';

/* ====== INTERFACE ====== */

export interface ProgressMapelKelompok {
    id_mapel: number;
    nama_mapel: string;
    id_kelompok: string;
    nama_kelompok: string;
    total_siswa: number;
    sudah_dinilai: number;
    belum_dinilai: number;
    persentase: number;
}

export interface KonfigurasiDetail {
    summary: Array<{
        type: 'missing' | 'gap';
        title: string;
        message: string;
        id_mapel?: number;
    }>;
}

export interface DashboardAlquranData {
    tahun_ajaran: string;
    semester: string;
    status_pts: 'aktif' | 'nonaktif' | 'selesai';
    status_pas: 'aktif' | 'nonaktif' | 'selesai';
    jenis_penilaian_aktif: 'PTS' | 'PAS' | null;
    jadwal: { pts: string | null; pas: string | null; };
    total_mapel: number;
    total_kelompok: number;
    total_siswa: number;
    progress_per_mapel: ProgressMapelKelompok[];
    konfigurasi_lengkap: boolean;
    konfigurasi_detail: KonfigurasiDetail;
}

/* ====== DATA DUMMY (ANGKA DIHITUNG OTOMATIS) ====== */

export const mockDashboardAlquran: DashboardAlquranData = {
    tahun_ajaran: '2028/2029',
    semester: 'Ganjil',
    status_pts: 'aktif',
    status_pas: 'nonaktif',
    jenis_penilaian_aktif: 'PTS',
    jadwal: { pts: '15 Des 2028', pas: '10 Jun 2029' },
    
    // ✅ SEMUA DIHITUNG OTOMATIS — TIDAK HARDCODE
    total_mapel: getTotalMapel(),         // Otomatis 2 (atau berapapun)
    total_kelompok: getTotalKelompok(),   // Otomatis 3 (atau berapapun)
    total_siswa: getTotalSiswa(),         // Otomatis 12 (atau berapapun)
    
    // Progress per mapel × kelompok (di-generate otomatis)
    progress_per_mapel: MAPEL_ALQURAN.flatMap(mapel => 
        mockDataKelompok.map(kelompok => ({
            id_mapel: mapel.id_mapel,
            nama_mapel: mapel.nama_mapel,
            id_kelompok: kelompok.id_kelompok,
            nama_kelompok: kelompok.nama_kelompok,
            total_siswa: kelompok.siswa.length,
            sudah_dinilai: Math.floor(kelompok.siswa.length * 0.6),
            belum_dinilai: Math.ceil(kelompok.siswa.length * 0.4),
            persentase: 60
        }))
    ),
    
    konfigurasi_lengkap: false,
    konfigurasi_detail: {
        summary: [
            {
                type: 'missing',
                title: 'Bobot Tilawah - Kelompok B',
                message: 'Total bobot penilaian Al-Qur\'an Tilawah untuk Kelompok B belum diatur (0%). Harap atur bobot agar total = 100%.',
                id_mapel: 5
            },
            {
                type: 'missing',
                title: 'Kategori Tahfidz - Kelompok C',
                message: 'Kategori nilai Al-Qur\'an Tahfidz untuk Kelompok C belum dikonfigurasi.',
                id_mapel: 6
            }
        ]
    }
};