/**
 * Nama File: layout.tsx
 * Fungsi: Layout root utama aplikasi E-Rapor SDIT Ulil Albab.
 *         Menyediakan struktur dasar HTML, metadata global, dan wrapper untuk semua halaman.
 *         Merupakan parent layout untuk semua rute (admin, guru kelas, guru bidang studi).
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

import type { Metadata } from "next";
import "./globals.css";

// ═════════════════════════════════════════════════════════════════════════════
// METADATA GLOBAL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Konfigurasi metadata default untuk seluruh aplikasi.
 * Metadata ini berlaku untuk semua halaman kecuali di-override oleh layout anak.
 * 
 * Properti:
 *   - title: Title default browser tab ("E-Rapor")
 *   - description: Deskripsi untuk SEO dan preview
 *   - icons: Favicon aplikasi yang ditampilkan di browser tab
 */
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

/**
 * Komponen layout root untuk seluruh aplikasi.
 * 
 * Struktur:
 *   <html lang="id">
 *     └─ <body>
 *         └─ children (konten halaman dinamis)
 * 
 * Fitur:
 *   - HTML5 doctype dengan bahasa Indonesia (lang="id")
 *   - Import globals.css untuk style global (font, tema, dark mode)
 *   - Metadata default untuk SEO
 *   - Parent layout untuk semua rute aplikasi
 * 
 * Hierarki Layout:
 *   RootLayout (file ini)
 *     ├─ AdminLayout (/admin/layout.tsx)
 *     ├─ GuruKelasLayout (/guru_kelas/layout.tsx)
 *     └─ GuruBidangStudiLayout (/guru_bidang_studi/layout.tsx)
 * 
 * Catatan:
 *   - File ini hanya dirender sekali saat aplikasi dimuat
 *   - Semua layout anak akan di-render sebagai children
 *   - Metadata di sini bisa di-override oleh layout anak
 * 
 * @param children - Konten halaman yang akan dirender
 * @returns Struktur HTML dasar dengan metadata global
 */
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