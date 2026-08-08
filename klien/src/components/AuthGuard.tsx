/*
 * Nama File: AuthGuard.tsx
 * Fungsi: Route guard untuk proteksi rute berdasarkan autentikasi (JWT) dan otorisasi (role)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

/* Komponen penjaga rute: memvalidasi token JWT dan role pengguna */
export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Validasi token JWT dan role user, redirect jika tidak terotorisasi
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('currentUser');

        // Langkah 1: Cek keberadaan token
        if (!token) {
            router.replace(`/?redirect=${window.location.pathname}`);
            setIsLoading(false);
            return;
        }

        try {
            // Langkah 2: Decode payload JWT
            const payload = JSON.parse(atob(token.split('.')[1]));
            const user = userStr ? JSON.parse(userStr) : null;
            const userRole = user?.role || payload.role;

            // Langkah 3: Validasi role terhadap allowedRoles
            if (allowedRoles && allowedRoles.length > 0) {
                if (!allowedRoles.includes(userRole)) {
                    // Redirect ke dashboard yang sesuai dengan role user
                    if (userRole === 'admin') {
                        router.replace('/admin/dashboard');
                    } else if (userRole === 'guru_kelas') {
                        router.replace('/guru_kelas/dashboard');
                    } else if (userRole === 'guru_bidang_studi') {
                        router.replace('/guru_bidang_studi/dashboard');
                    } else {
                        router.replace('/');
                    }
                    
                    setIsLoading(false);
                    return;
                }
            }

            // Langkah 4: User terautentikasi dan terotorisasi
            setIsAuthorized(true);
            setIsLoading(false);

        } catch (error) {
            // Penanganan error: Token tidak valid atau kadaluarsa
            console.error('Auth error:', error);
            localStorage.clear();
            router.replace(`/?redirect=${window.location.pathname}`);
            setIsLoading(false);
        }
    }, [router]);

    // Tampilan state loading
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Memeriksa sesi...</p>
                </div>
            </div>
        );
    }

    // Tampilan state tidak terotorisasi
    if (!isAuthorized) return null;

    // Tampilan state terotorisasi (render children)
    return <>{children}</>;
}