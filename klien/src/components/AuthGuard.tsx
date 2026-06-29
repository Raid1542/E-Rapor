/**
 * Nama File: AuthGuard.tsx
 * Fungsi: Route guard untuk proteksi route berdasarkan autentikasi (JWT) & otorisasi (role)
 * Pembuat: Raid Aqil Athallah - NIM: 
 * Tanggal: 1 Oktober 2025
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Komponen AuthGuard: proteksi route berdasarkan token JWT + role (redirect ke login/dashboard jika tidak authorized)
export default function AuthGuard({ 
    children, 
    allowedRoles 
}: { 
    children: React.ReactNode;
    allowedRoles?: string[];
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Effect: Validasi token JWT & role user (redirect jika tidak authorized)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('currentUser');

        console.log('=== AuthGuard ===');
        console.log('Token:', token ? 'EXISTS' : 'MISSING');
        console.log('Allowed:', allowedRoles);

        // Step 1: Cek keberadaan token
        if (!token) {
            console.log('No token, redirect to login');
            router.replace(`/login?redirect=${window.location.pathname}`);
            setIsLoading(false);
            return;
        }

        try {
            // Step 2: Decode JWT payload
            const payload = JSON.parse(atob(token.split('.')[1]));
            const user = userStr ? JSON.parse(userStr) : null;
            const userRole = user?.role || payload.role;
            
            console.log('User role:', userRole);

            // Step 3: Validasi role terhadap allowedRoles
            if (allowedRoles && allowedRoles.length > 0) {
                if (!allowedRoles.includes(userRole)) {
                    console.log('Role mismatch, redirecting to correct dashboard');
                    
                    // Redirect ke dashboard yang sesuai dengan role user
                    if (userRole === 'admin') router.replace('/admin/dashboard');
                    else if (userRole === 'guru_kelas') router.replace('/guru_kelas/dashboard');
                    else if (userRole === 'guru_bidang_studi') router.replace('/guru_bidang_studi/dashboard');
                    else router.replace('/login');
                    
                    setIsLoading(false);
                    return;
                }
            }

            // Step 4: User terautentikasi dan terotorisasi
            console.log('Authorized!');
            setIsAuthorized(true);
            setIsLoading(false);

        } catch (error) {
            // Error handling: Token invalid/expired
            console.error('Error:', error);
            localStorage.clear();
            router.replace(`/login?redirect=${window.location.pathname}`);
            setIsLoading(false);
        }
    }, [router]);

    // Render: Loading state (spinner)
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

    // Render: Unauthorized state
    if (!isAuthorized) return null;

    // Render: Authorized state (render children)
    return <>{children}</>;
}