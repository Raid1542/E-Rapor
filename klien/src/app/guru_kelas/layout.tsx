/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk seluruh halaman di rute guru kelas.
 *         Menyediakan struktur dasar seperti navbar, sidebar, dan konten dinamis.
 *         Dilengkapi dengan AuthGuard untuk proteksi route berdasarkan role.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: 28 Juni 2026 - Tambah AuthGuard untuk proteksi route
 */

import type { Metadata } from "next";
import GuruKelasLayout from './components/Layout';
import AuthGuard from '@/components/AuthGuard';

// ═════════════════════════════════════════════════════════════════════════════
// METADATA HALAMAN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Konfigurasi metadata untuk SEO dan title halaman.
 * Menggunakan template pattern untuk konsistensi title di seluruh halaman.
 */
export const metadata: Metadata = {
    title: {
        template: "Guru Kelas - %s",
        default: "Guru Kelas",
    },
    description: "Kelola Data Siswa Berdasarkan Kelas",
};

// ═════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Komponen layout utama untuk rute guru kelas.
 * 
 * Struktur:
 *   AuthGuard (proteksi role) 
 *     └─ GuruKelasLayout (navbar + sidebar)
 *         └─ children (konten halaman dinamis)
 * 
 * @param children - Konten halaman yang akan dirender
 * @returns Layout terproteksi dengan struktur konsisten
 */
export default function GuruKelasRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['guru_kelas']}>
            <GuruKelasLayout>
                {children}
            </GuruKelasLayout>
        </AuthGuard>
    );
}