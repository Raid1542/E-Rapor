/*
 * Nama File: mockAturPenilaian.ts
 * Fungsi: Data dummy + helper penyimpanan lokal (localStorage) untuk halaman
 *         Atur Penilaian Guru Al-Qur'an (FR-47). Dipakai karena backend modul
 *         ini masih dinonaktifkan (frontend-first). Saat API siap, seluruh
 *         fungsi get/save di bawah tinggal diganti dengan fetch.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

export interface KomponenPenilaian { 
    id_komponen: number; 
    nama_komponen: string; 
    urutan: number; 
}

export interface KategoriAkademik { 
    id: number; 
    min_nilai: number; 
    max_nilai: number; 
    deskripsi: string; 
}

export interface BobotItem { 
    komponen_id: number; 
    bobot: number; 
}

/* Periode demo: PAS aktif -> bobot dapat diedit manual (validasi 100% bisa didemokan). */
export const MOCK_PERIOD = {
    status_pts: 'nonaktif' as const,
    status_pas: 'aktif' as const,
    jenis: 'PAS' as const,
};

/* ✅ KOMPONEN SESUAI REALITAS SDIT ULIL ALBAB (UH 1-5, PTS, PAS) */
export const mockKomponenPenilaian: KomponenPenilaian[] = [
    { id_komponen: 1, nama_komponen: 'UH 1', urutan: 1 },
    { id_komponen: 2, nama_komponen: 'UH 2', urutan: 2 },
    { id_komponen: 3, nama_komponen: 'UH 3', urutan: 3 },
    { id_komponen: 4, nama_komponen: 'UH 4', urutan: 4 },
    { id_komponen: 5, nama_komponen: 'UH 5', urutan: 5 },
    { id_komponen: 6, nama_komponen: 'PTS', urutan: 6 },
    { id_komponen: 7, nama_komponen: 'PAS', urutan: 7 },
];

export const mockKategoriDefault: KategoriAkademik[] = [
    { id: 1, min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik' },
    { id: 2, min_nilai: 80, max_nilai: 89, deskripsi: 'Baik' },
    { id: 3, min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup' },
    { id: 4, min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang' },
    { id: 5, min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan' },
];

const keyBobot = (m: number, k: string) => `alquran_bobot_${m}_${k}`;
const keyKat = (m: number, k: string) => `alquran_kategori_${m}_${k}`;

export const getBobot = (m: number, k: string): BobotItem[] => {
    if (typeof window === 'undefined') return mockKomponenPenilaian.map(c => ({ komponen_id: c.id_komponen, bobot: 0 }));
    const s = localStorage.getItem(keyBobot(m, k));
    if (s) { try { return JSON.parse(s); } catch { /* ignore */ } }
    return mockKomponenPenilaian.map(c => ({ komponen_id: c.id_komponen, bobot: 0 }));
};

export const saveBobot = (m: number, k: string, list: BobotItem[]) => {
    if (typeof window !== 'undefined') localStorage.setItem(keyBobot(m, k), JSON.stringify(list));
};

export const getKategori = (m: number, k: string): KategoriAkademik[] => {
    if (typeof window === 'undefined') return [];
    const s = localStorage.getItem(keyKat(m, k));
    if (s) { try { return JSON.parse(s); } catch { /* ignore */ } }
    return [];
};

export const saveKategori = (m: number, k: string, list: KategoriAkademik[]) => {
    if (typeof window !== 'undefined') localStorage.setItem(keyKat(m, k), JSON.stringify(list));
};

/* Hitung cakupan range 0-100 dari daftar kategori */
export const computeCoverage = (list: KategoriAkademik[]) => {
    const covered = new Set<number>();
    const sorted = [...list].sort((a, b) => a.min_nilai - b.min_nilai);
    let prevMax = -1;
    const gaps: Array<{ aspek: string; gap: string }> = [];
    
    sorted.forEach(k => {
        if (k.min_nilai > prevMax + 1) {
            gaps.push({ aspek: 'Akademik', gap: `${prevMax + 1}–${k.min_nilai - 1}` });
        }
        for (let i = Math.floor(k.min_nilai); i <= Math.floor(k.max_nilai); i++) {
            covered.add(i);
        }
        prevMax = Math.max(prevMax, Math.floor(k.max_nilai));
    });
    
    if (prevMax < 100) {
        gaps.push({ aspek: 'Akademik', gap: `${prevMax + 1}–100` });
    }
    
    return { covered: gaps.length === 0, gaps };
};