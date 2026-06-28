/**
 * Nama File: layout.tsx
 * Fungsi: Layout utama untuk seluruh halaman admin.
 *         Menyediakan struktur kerangka aplikasi seperti sidebar, header, dan konten.
 *         Menetapkan metadata default untuk semua halaman di dalam rute admin.
 *         Dilengkapi dengan AuthGuard untuk proteksi route berdasarkan role.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: 28 Juni 2026 - Tambah AuthGuard untuk proteksi route
 */

import type { Metadata } from "next";
import "../globals.css";
import Layout from "@/app/admin/components/Layout";
import AuthGuard from "@/components/AuthGuard";

// ═════════════════════════════════════════════════════════════════════════════
// METADATA HALAMAN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Konfigurasi metadata untuk SEO dan title halaman admin.
 * Menggunakan template pattern untuk konsistensi title di seluruh halaman.
 * 
 * Template: "Admin - [Nama Halaman]"
 * Default: "Admin"
 */
export const metadata: Metadata = {
    title: {
        template: "Admin - %s",
        default: "Admin",
    },
    description: "Panel administrasi sistem E-Rapor sekolah",
};

// ═════════════════════════════════════════════════════════════════════════════
// ROOT LAYOUT COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Komponen layout utama untuk rute admin.
 * 
 * Struktur:
 *   AuthGuard (proteksi role admin)
 *     └─ Layout (sidebar + header + konten)
 *         └─ children (konten halaman dinamis)
 * 
 * Fitur:
 *   - Proteksi route: Hanya user dengan role 'admin' yang bisa akses
 *   - Layout konsisten: Sidebar dan header di semua halaman admin
 *   - Metadata dinamis: Title halaman otomatis terupdate dengan template
 *   - Import globals.css: Style global berlaku di seluruh halaman admin
 * 
 * @param children - Konten halaman yang akan dirender
 * @returns Layout terproteksi dengan struktur konsisten
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard allowedRoles={['admin']}>
            <Layout>
                {children}
            </Layout>
        </AuthGuard>
    );
}