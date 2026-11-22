/*
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk seluruh halaman di rute guru-alquran
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 * Note: AuthGuard dinonaktifkan sementara untuk pengembangan UI
 */

import type { Metadata } from 'next';
import GuruAlquranLayout from './components/Layout';

export const metadata: Metadata = {
    title: {
        template: 'Guru Al-Qur\'an - %s',
        default: 'Guru Al-Qur\'an',
    },
    description: 'Modul Penilaian Al-Qur\'an Berbasis Konfigurasi Dinamis',
};

export default function GuruAlquranRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <GuruAlquranLayout>
            {children}
        </GuruAlquranLayout>
    );
}