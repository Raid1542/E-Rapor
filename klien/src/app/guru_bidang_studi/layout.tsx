/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk halaman guru bidang studi.
 *         Menyediakan struktur dasar dengan metadata dinamis dan wrapper komponen layout klien.
 *         ✅ UPDATED: Tambah AuthGuard untuk proteksi route
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

import type { Metadata } from "next";
import GuruBidangStudiLayout from './components/Layout';
import AuthGuard from '@/components/AuthGuard'; // ✅ TAMBAH BARIS INI

export const metadata: Metadata = {
    title: {
        template: "Guru Bidang Studi - %s",
        default: "Guru Bidang Studi",
    },
    description: "Input Nilai Siswa Berdasarkan mapel yang Diajarkan",
};

export default function GuruBidangStudiRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // ✅ WRAP DENGAN AUTHGUARD
        <AuthGuard allowedRoles={['guru_bidang_studi']}>
            <GuruBidangStudiLayout>
                {children}
            </GuruBidangStudiLayout>
        </AuthGuard>
    );
}