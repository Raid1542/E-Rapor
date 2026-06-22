'use client';

import { useState, useEffect, useCallback } from 'react';
import { isTokenExpired, getToken } from '@/lib/auth';

export function useSession() {
    const [showSessionExpired, setShowSessionExpired] = useState(false);

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

    useEffect(() => {
        // ✅ Cek saat mount
        checkToken();

        // ✅ Interval 60 DETIK (bukan 5 detik)
        const checkInterval = setInterval(() => {
            checkToken();
        }, 60000);

        // ✅ Cek saat window focus
        const handleFocus = () => checkToken();

        // ✅ Cek saat tab jadi visible
        const handleVisibilityChange = () => {
            if (!document.hidden) checkToken();
        };

        // ✅ Sync antar tab
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && !e.newValue) {
                setShowSessionExpired(true);
            }
        };

        // ✅ Listen event dari fetchWrapper
        const handleSessionExpired = () => {
            setShowSessionExpired(true);
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('sessionExpired', handleSessionExpired);

        return () => {
            clearInterval(checkInterval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [checkToken]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
    }, []);

    return {
        showSessionExpired,
        setShowSessionExpired,
        handleLogout,
        checkToken,
    };
}