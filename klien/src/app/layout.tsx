/**
 * Nama File: layout.tsx
 * Fungsi: Root layout utama aplikasi E-Rapor (parent untuk semua rute)
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

import type { Metadata } from "next";
import "./globals.css";

// ═════════════════════════════════════════════════════════════════════════════
// METADATA GLOBAL
// ═════════════════════════════════════════════════════════════════════════════

// Metadata default untuk seluruh aplikasi (bisa di-override oleh layout anak)
export const metadata: Metadata = {
    title: "E-Rapor",
    description: "Sistem Informasi Akademik SDIT Ulil Albab",
    icons: {
        icon: "/favicon.ico",
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

// Komponen layout root (HTML5 + bahasa Indonesia + globals.css)
// Hierarki: RootLayout → AdminLayout/GuruKelasLayout/GuruBidangStudiLayout
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
