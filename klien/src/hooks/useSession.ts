/**
 * Nama File: useSession.ts
 * Fungsi: Custom hook untuk monitoring token JWT (multiple trigger) + handler logout
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { isTokenExpired, getToken } from '@/lib/auth';

// Hook: monitoring token JWT (interval 60s, focus, visibility, storage, custom event)
export function useSession() {
    const [showSessionExpired, setShowSessionExpired] = useState(false);

    // Validasi token JWT (existence & expiration)
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
        checkToken(); // Cek initial

        // Interval check setiap 60 detik
        const checkInterval = setInterval(() => checkToken(), 60000);

        // Handlers: focus, visibility, storage sync, custom event
        const handleFocus = () => checkToken();
        const handleVisibilityChange = () => { if (!document.hidden) checkToken(); };
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && !e.newValue) setShowSessionExpired(true);
        };
        const handleSessionExpired = () => setShowSessionExpired(true);

        // Register event listeners
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('sessionExpired', handleSessionExpired);

        // Cleanup: unregister semua event listeners
        return () => {
            clearInterval(checkInterval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [checkToken]);

    // Handler logout: clear localStorage + redirect ke login
    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
    }, []);

    return { showSessionExpired, setShowSessionExpired, handleLogout, checkToken };
}