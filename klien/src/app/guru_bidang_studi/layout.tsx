/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk halaman guru bidang studi.
 *         Menyediakan struktur dasar dengan metadata dinamis dan wrapper komponen layout klien.
 *         Dilengkapi dengan AuthGuard untuk proteksi route berdasarkan role.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: 28 Juni 2026 - Tambah AuthGuard untuk proteksi route
 */

import type { Metadata } from "next";
import GuruBidangStudiLayout from './components/Layout';
import AuthGuard from '@/components/AuthGuard';

// ═════════════════════════════════════════════════════════════════════════════
// METADATA HALAMAN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Konfigurasi metadata untuk SEO dan title halaman.
 * Menggunakan template pattern untuk konsistensi title di seluruh halaman.
 * 
 * Template: "Guru Bidang Studi - [Nama Halaman]"
 * Default: "Guru Bidang Studi"
 */
export const metadata: Metadata = {
    title: {
        template: "Guru Bidang Studi - %s",
        default: "Guru Bidang Studi",
    },
    description: "Input Nilai Siswa Berdasarkan mapel yang Diajarkan",
};

// ═════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Komponen layout utama untuk rute guru bidang studi.
 * 
 * Struktur:
 *   AuthGuard (proteksi role guru_bidang_studi)
 *     └─ GuruBidangStudiLayout (navbar + sidebar)
 *         └─ children (konten halaman dinamis)
 * 
 * Fitur:
 *   - Proteksi route: Hanya user dengan role 'guru_bidang_studi' yang bisa akses
 *   - Layout konsisten: Navbar dan sidebar di semua halaman
 *   - Metadata dinamis: Title halaman otomatis terupdate
 * 
 * @param children - Konten halaman yang akan dirender
 * @returns Layout terproteksi dengan struktur konsisten
 */
export default function GuruBidangStudiRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['guru_bidang_studi']}>
            <GuruBidangStudiLayout>
                {children}
            </GuruBidangStudiLayout>
        </AuthGuard>
    );
}