/*
 * Nama File: useSession.ts
 * Fungsi: Custom hook untuk monitoring token JWT dan handler logout
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { isTokenExpired, getToken } from '@/lib/auth';

/* Hook untuk monitoring status sesi pengguna secara real-time */
export function useSession() {
    const [showSessionExpired, setShowSessionExpired] = useState<boolean>(false);

    // Validasi keberadaan dan masa berlaku token JWT
    const checkToken = useCallback(() => {
        const token = getToken();
        if (!token) {
            setShowSessionExpired(true);
            return false;
        }
        if (isTokenExpired(token)) {
            setShowSessionExpired(true);
            return false;
        }
        return true;
    }, []);

    // Setup multiple event listeners untuk monitoring token
    useEffect(() => {
        checkToken(); // Cek initial saat komponen mount

        // Interval check setiap 60 detik
        const checkInterval = setInterval(() => checkToken(), 60000);

        // Handler untuk berbagai event window/document
        const handleFocus = () => checkToken();
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                checkToken();
            }
        };
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && !e.newValue) {
                setShowSessionExpired(true);
            }
        };
        const handleSessionExpired = () => setShowSessionExpired(true);

        // Register event listeners
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('sessionExpired', handleSessionExpired);

        // Cleanup: unregister semua event listeners saat unmount
        return () => {
            clearInterval(checkInterval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [checkToken]);

    // Handler logout: clear localStorage dan redirect ke halaman login
    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    }, []);

    return { showSessionExpired, setShowSessionExpired, handleLogout, checkToken };
}