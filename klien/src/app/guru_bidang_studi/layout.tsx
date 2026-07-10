/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk halaman guru bidang studi
 *         Menyediakan struktur dasar dengan metadata dinamis dan wrapper komponen layout klien
 *         Dilengkapi dengan AuthGuard untuk proteksi route berdasarkan role
 *         Dilengkapi dengan NavigationGuard untuk konfirmasi saat tekan back button
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: 28 Juni 2026 - Tambah AuthGuard untuk proteksi route
 * Update: 10 Juli 2026 - Tambah NavigationGuard untuk konfirmasi back button
 */

import type { Metadata } from 'next';
import GuruBidangStudiLayout from './components/Layout';
import AuthGuard from '@/components/AuthGuard';
import NavigationGuard from '@/components/NavigationGuard';

// Konfigurasi metadata untuk SEO dan title halaman
export const metadata: Metadata = {
    title: {
        template: 'Guru Bidang Studi - %s',
        default: 'Guru Bidang Studi',
    },
    description: 'Input Nilai Siswa Berdasarkan mapel yang Diajarkan',
};

// Komponen layout utama untuk rute guru bidang studi
// Struktur: AuthGuard → NavigationGuard → GuruBidangStudiLayout → children
export default function GuruBidangStudiRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['guru_bidang_studi']}>
            <NavigationGuard>
                <GuruBidangStudiLayout>
                    {children}
                </GuruBidangStudiLayout>
            </NavigationGuard>
        </AuthGuard>
    );
}