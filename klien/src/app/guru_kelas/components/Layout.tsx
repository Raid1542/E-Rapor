/**
 * Nama File: Layout.tsx
 * Fungsi: Layout utama halaman admin yang menyusun struktur halaman
 *         dengan Sidebar di kiri dan Header di atas konten utama.
 *         Mengambil data pengguna dari localStorage dan mengirimkannya
 *         ke komponen Sidebar dan Header sebagai props.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<UserData | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

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
            </div>
        </div>
    );
}