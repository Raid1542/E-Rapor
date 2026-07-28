/*
 * Nama File: Layout.tsx
 * Fungsi: Layout utama halaman admin yang menyusun struktur halaman dengan Sidebar, Header, dan Footer.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

/* Interface: Data pengguna untuk localStorage dan komponen header */
interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
}

/* Komponen utama layout admin */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<UserData | null>(null);

    // Muat data pengguna dari localStorage saat komponen dimuat
    useEffect(() => {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Gagal memuat data pengguna:', error);
            setUser(null);
        }
    }, []);

    // Tampilkan loading state jika data pengguna belum tersedia
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading...
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />

            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>

                <Footer />
            </div>
        </div>
    );
}