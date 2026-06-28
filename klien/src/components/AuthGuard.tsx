/**
 * Nama File: AuthGuard.tsx
 * Fungsi: Komponen pelindung route (route guard) untuk aplikasi E-Rapor.
 *         Bertanggung jawab atas validasi autentikasi (token JWT) dan otorisasi (role-based access).
 *         Mengarahkan user ke halaman login jika tidak terautentikasi, atau ke dashboard yang sesuai
 *         jika role tidak sesuai dengan yang diizinkan.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ═════════════════════════════════════════════════════════════════════════════
// AUTHGUARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Komponen AuthGuard untuk proteksi route berdasarkan autentikasi dan otorisasi.
 * 
 * Alur Kerja:
 *   1. Cek keberadaan token di localStorage
 *   2. Jika tidak ada → redirect ke /login
 *   3. Decode JWT untuk mendapatkan role user
 *   4. Cek apakah role user termasuk dalam allowedRoles
 *   5. Jika tidak sesuai → redirect ke dashboard yang sesuai dengan role
 *   6. Jika sesuai → render children (konten halaman)
 * 
 * Fitur:
 *   - Token-based authentication (JWT)
 *   - Role-based access control (RBAC)
 *   - Auto-redirect ke login jika token tidak valid/expired
 *   - Smart redirect ke dashboard yang sesuai berdasarkan role
 *   - Loading state dengan spinner saat validasi
 *   - Preserve redirect URL untuk kembali ke halaman asal setelah login
 * 
 * Penggunaan:
 *   <AuthGuard allowedRoles={['admin']}>
 *     <AdminContent />
 *   </AuthGuard>
 * 
 * @param children - Konten halaman yang akan dilindungi
 * @param allowedRoles - Array role yang diizinkan mengakses halaman ini
 * @returns Loading spinner, null (jika tidak authorized), atau children
 */
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

    // ── Effect: Validasi Token & Role ────────────────────────────────────────

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('currentUser');

        console.log('=== AuthGuard ===');
        console.log('Token:', token ? 'EXISTS' : 'MISSING');
        console.log('Allowed:', allowedRoles);

        // ── Step 1: Cek keberadaan token ────────────────────────────────────
        if (!token) {
            console.log('No token, redirect to login');
            router.replace(`/login?redirect=${window.location.pathname}`);
            setIsLoading(false);
            return;
        }

        try {
            // ── Step 2: Decode JWT payload ──────────────────────────────────
            const payload = JSON.parse(atob(token.split('.')[1]));
            const user = userStr ? JSON.parse(userStr) : null;
            const userRole = user?.role || payload.role;
            
            console.log('User role:', userRole);

            // ── Step 3: Validasi role terhadap allowedRoles ─────────────────
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

            // ── Step 4: User terautentikasi dan terotorisasi ────────────────
            console.log('Authorized!');
            setIsAuthorized(true);
            setIsLoading(false);

        } catch (error) {
            // ── Error handling: Token invalid/expired ───────────────────────
            console.error('Error:', error);
            localStorage.clear();
            router.replace(`/login?redirect=${window.location.pathname}`);
            setIsLoading(false);
        }
    }, [router]);

    // ── Render: Loading State ────────────────────────────────────────────────

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

    // ── Render: Unauthorized State ───────────────────────────────────────────

    if (!isAuthorized) return null;

    // ── Render: Authorized State ─────────────────────────────────────────────

    return <>{children}</>;
}