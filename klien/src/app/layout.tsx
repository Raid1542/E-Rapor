/**
 * Nama File: layout.tsx
 * Fungsi: Root layout utama aplikasi E-Rapor (parent untuk semua rute)
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

import type { Metadata } from 'next';
import './globals.css';

// Metadata default untuk seluruh aplikasi
export const metadata: Metadata = {
    title: 'E-Rapor SDIT Ulil Albab',
    description: 'Sistem Informasi Akademik SDIT Ulil Albab Batam',
    icons: {
        icon: '/favicon.ico',
    },
};

// Root layout component
export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id">
            <body>
                {children}
            </body>
        </html>
    );
}