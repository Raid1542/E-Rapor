/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk seluruh halaman admin
 *         Menyediakan struktur kerangka aplikasi seperti sidebar, header, dan konten
 *         Dilengkapi dengan AuthGuard untuk proteksi route berdasarkan role
 *         Dilengkapi dengan NavigationGuard untuk konfirmasi saat tekan back button
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: 28 Juni 2026 - Tambah AuthGuard untuk proteksi route
 * Update: 10 Juli 2026 - Tambah NavigationGuard untuk konfirmasi back button
 */

import type { Metadata } from 'next';
import '../globals.css';
import Layout from '@/app/admin/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import NavigationGuard from '@/components/NavigationGuard';

// Konfigurasi metadata untuk SEO dan title halaman admin
export const metadata: Metadata = {
    title: {
        template: 'Admin - %s',
        default: 'Admin',
    },
    description: 'Panel administrasi sistem E-Rapor SDIT Ulil Albab',
};

// Komponen layout utama untuk rute admin
// Struktur: AuthGuard → NavigationGuard → Layout → children
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard allowedRoles={['admin']}>
            <NavigationGuard>
                <Layout>
                    {children}
                </Layout>
            </NavigationGuard>
        </AuthGuard>
    );
}