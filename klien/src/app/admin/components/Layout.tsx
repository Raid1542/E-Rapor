/**
 * Nama File: Layout.tsx
 * Fungsi: Layout utama halaman admin yang menyusun struktur halaman
 *         dengan Sidebar di kiri, Header di atas, dan Footer di bawah konten utama.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: Tambah Footer
 */

'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer'; 

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
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />  {/* ← Tanpa props, Header baca sendiri dari localStorage */}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}