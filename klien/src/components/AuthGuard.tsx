'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('currentUser');

        console.log('=== AuthGuard ===');
        console.log('Token:', token ? 'EXISTS' : 'MISSING');
        console.log('Allowed:', allowedRoles);

        if (!token) {
            console.log('❌ No token, redirect to login');
            router.replace(`/login?redirect=${window.location.pathname}`);
            setIsLoading(false);
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const user = userStr ? JSON.parse(userStr) : null;
            const userRole = user?.role || payload.role;
            
            console.log('User role:', userRole);

            if (allowedRoles && allowedRoles.length > 0) {
                if (!allowedRoles.includes(userRole)) {
                    console.log('❌ Role mismatch, redirecting to correct dashboard');
                    
                    if (userRole === 'admin') router.replace('/admin/dashboard');
                    else if (userRole === 'guru_kelas') router.replace('/guru_kelas/dashboard');
                    else if (userRole === 'guru_bidang_studi') router.replace('/guru_bidang_studi/dashboard');
                    else router.replace('/login');
                    
                    setIsLoading(false);
                    return;
                }
            }

            console.log('✅ Authorized!');
            setIsAuthorized(true);
            setIsLoading(false);

        } catch (error) {
            console.error('❌ Error:', error);
            localStorage.clear();
            router.replace(`/login?redirect=${window.location.pathname}`);
            setIsLoading(false);
        }
    }, [router]); // ✅ Hanya router, tanpa allowedRoles

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

    if (!isAuthorized) return null;

    return <>{children}</>;
}