/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk seluruh halaman di rute guru kelas
 *         Menyediakan struktur dasar seperti navbar, sidebar, dan konten dinamis
 *         Dilengkapi dengan AuthGuard untuk proteksi route berdasarkan role
 *         Dilengkapi dengan NavigationGuard untuk konfirmasi saat tekan back button
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: 28 Juni 2026 - Tambah AuthGuard untuk proteksi route
 * Update: 10 Juli 2026 - Tambah NavigationGuard untuk konfirmasi back button
 */

import type { Metadata } from 'next';
import GuruKelasLayout from './components/Layout';
import AuthGuard from '@/components/AuthGuard';
import NavigationGuard from '@/components/NavigationGuard';

// Konfigurasi metadata untuk SEO dan title halaman
export const metadata: Metadata = {
    title: {
        template: 'Guru Kelas - %s',
        default: 'Guru Kelas',
    },
    description: 'Kelola Data Siswa Berdasarkan Kelas',
};

// Komponen layout utama untuk rute guru kelas
// Struktur: AuthGuard → NavigationGuard → GuruKelasLayout → children
export default function GuruKelasRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['guru_kelas']}>
            <NavigationGuard>
                <GuruKelasLayout>
                    {children}
                </GuruKelasLayout>
            </NavigationGuard>
        </AuthGuard>
    );
}