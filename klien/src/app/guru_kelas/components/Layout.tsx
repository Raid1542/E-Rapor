/*
 * Nama File: Layout.tsx
 * Fungsi: Layout utama halaman guru kelas dengan Sidebar, Header, dan Footer.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

/* Interface: Data pengguna untuk komponen layout */
interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
}

/* Komponen utama layout guru kelas */
export default function GuruKelasLayout({
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
            <div
                className="flex flex-col items-center justify-center min-h-screen gap-4"
                style={{ background: '#fdf6f0' }}
            >
                <div
                    className="w-12 h-12 rounded-full border-4 animate-spin"
                    style={{ borderColor: '#fde0c8', borderTopColor: '#e8690a' }}
                />
                <p className="text-sm font-semibold" style={{ color: '#c95b08' }}>
                    Memuat data...
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-screen" style={{ background: '#fdf6f0' }}>
            <Sidebar user={user} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header user={user} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}