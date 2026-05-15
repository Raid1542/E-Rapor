/**
 * Nama File: Layout.tsx
 * Fungsi: Menyusun tata letak halaman utama untuk guru kelas.
 *         Menggabungkan Sidebar di kiri, Header di atas, dan konten utama di tengah.
 *         Mengambil data pengguna dari localStorage dan meneruskannya ke komponen
 *         Sidebar dan Header sebagai props. Menampilkan indikator loading
 *         saat data pengguna belum tersedia.
 * Pembuat: Frima Rizky lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
    class?: string;
}

export default function GuruKelasLayout({
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
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar user={user} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header user={user} />
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}