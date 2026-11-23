/*
 * Nama File: mockNilaiAlquran.ts
 * Fungsi: Helper penyimpanan nilai (localStorage) + kalkulasi rapor &
 *         cek status konfigurasi untuk modul Input Nilai Guru Al-Qur'an (FR-48).
 *         Menggantikan endpoint API /nilai guru-bidang-studi (frontend-first).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { mockDataKelompok } from './mockKelompok';
import {
    mockKomponenPenilaian, getBobot, getKategori, computeCoverage,
    KategoriAkademik, BobotItem,
} from './mockAturPenilaian';

// ✅ 100% snake_case untuk key objek nilai
export interface NilaiSiswa { 
    [komponen_id: number]: number | null 
}

export interface KategoriStatus {
    configured: boolean;
    bobot: { total: number; status: 'lengkap' | 'belum_100' | 'error' };
    kategori: { covered: boolean; celah: string[] };
    message: string;
}

const keyNilai = (m: number, k: string, s: number) => `alquran_nilai_${m}_${k}_${s}`;

export const getNilaiSiswa = (m: number, k: string, s: number): NilaiSiswa => {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(keyNilai(m, k, s));
    if (raw) { try { return JSON.parse(raw); } catch { return {}; } }
    return {};
};

export const saveNilaiSiswa = (m: number, k: string, s: number, val: NilaiSiswa) => {
    if (typeof window !== 'undefined') localStorage.setItem(keyNilai(m, k, s), JSON.stringify(val));
};

export const cekStatusKonfigurasi = (m: number, k: string): KategoriStatus => {
    const bobotList = getBobot(m, k);
    const total = Math.round(bobotList.reduce((s, b) => s + b.bobot, 0) * 100) / 100;
    const bobotStatus: KategoriStatus['bobot']['status'] =
        total > 100 ? 'error' : Math.abs(total - 100) < 0.01 ? 'lengkap' : 'belum_100';

    const kategoriList = getKategori(m, k);
    const cov = kategoriList.length ? computeCoverage(kategoriList) : { covered: false, gaps: [] };
    const celah = cov.gaps.map(g => g.gap);

    const configured = bobotStatus === 'lengkap' && cov.covered;
    let message = '';
    if (!configured) {
        const parts: string[] = [];
        if (bobotStatus !== 'lengkap') parts.push(`Bobot total ${total}% (harus 100%)`);
        if (!cov.covered) parts.push(`Rentang kategori belum mencakup 0-100`);
        message = parts.join(' • ');
    }
    return { configured, bobot: { total, status: bobotStatus }, kategori: { covered: cov.covered, celah }, message };
};

export const hitungRapor = (
    nilaiMap: NilaiSiswa, bobotList: BobotItem[], kategoriList: KategoriAkademik[],
): { nilai: number | null; deskripsi: string | null } => {
    const bobotMap = new Map(bobotList.map(b => [b.komponen_id, b.bobot]));
    const wajib = mockKomponenPenilaian.filter(c => (bobotMap.get(c.id_komponen) || 0) > 0);
    const terisi = wajib.filter(c => nilaiMap[c.id_komponen] !== null && nilaiMap[c.id_komponen] !== undefined);
    if (wajib.length === 0 || terisi.length < wajib.length) return { nilai: null, deskripsi: null };

    const sumBobot = wajib.reduce((s, c) => s + (bobotMap.get(c.id_komponen) || 0), 0);
    const sum = wajib.reduce((s, c) => s + (nilaiMap[c.id_komponen] as number) * (bobotMap.get(c.id_komponen) || 0), 0);
    const nilai = Math.round((sum / sumBobot) * 100) / 100;

    const nilaiBulat = Math.round(nilai);
    const kat = kategoriList.find(k => nilaiBulat >= k.min_nilai && nilaiBulat <= k.max_nilai);
    return { nilai, deskripsi: kat ? kat.deskripsi : null };
};

export const buildSiswaList = (m: number, k: string) => {
    const kelompok = mockDataKelompok.find(g => g.id_kelompok === k);
    if (!kelompok) return [];
    const bobotList = getBobot(m, k);
    const kategoriList = getKategori(m, k);
    return kelompok.siswa.map(s => {
        const nilai = getNilaiSiswa(m, k, s.id_siswa);
        const rapor = hitungRapor(nilai, bobotList, kategoriList);
        return {
            // ✅ 100% snake_case agar konsisten dengan interface SiswaKelompok
            id_siswa: s.id_siswa,
            nama_lengkap: s.nama_lengkap,
            nis: s.nis,
            nisn: s.nisn,
            kelas_asal: s.kelas_asal,
            nilai_rapor: rapor.nilai,
            deskripsi: rapor.deskripsi,
            nilai,
        };
    });
};