'use client';

import { useState, useEffect } from 'react';
import { isTokenExpired, getToken } from '@/lib/auth';
import SessionExpiredModal from '@/components/sessionExpiredModal';

export function useSession() {
    const [showSessionExpired, setShowSessionExpired] = useState(false);

    useEffect(() => {
        // Check token setiap 30 detik
        const checkInterval = setInterval(() => {
            const token = getToken();

            if (!token) {
                setShowSessionExpired(true);
            } else if (isTokenExpired(token)) {
                setShowSessionExpired(true);
            }
        }, 30000);

        // Check saat window mendapat focus
        const handleFocus = () => {
            const token = getToken();
            if (token && isTokenExpired(token)) {
                setShowSessionExpired(true);
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(checkInterval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
    };

    return {
        showSessionExpired,
        setShowSessionExpired,
        handleLogout,

    };
}