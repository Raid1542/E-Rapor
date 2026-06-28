/**
 * Nama File: useSession.ts
 * Fungsi: Custom React hook untuk manajemen sesi user dan validasi token JWT.
 *         Melakukan monitoring token secara real-time melalui multiple trigger:
 *         interval timer, window focus, visibility change, storage sync, dan custom event.
 *         Menyediakan state dan handler untuk menampilkan modal sesi berakhir serta logout.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { isTokenExpired, getToken } from '@/lib/auth';

// ═════════════════════════════════════════════════════════════════════════════
// USE SESSION HOOK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Custom hook untuk manajemen sesi user dan validasi token.
 * 
 * Fitur:
 *   - Validasi token JWT (existence & expiration)
 *   - Auto-check setiap 60 detik via interval timer
 *   - Check saat window mendapat focus
 *   - Check saat tab menjadi visible (visibility change)
 *   - Sync antar tab browser via storage event
 *   - Listen custom event 'sessionExpired' dari fetchWrapper
 *   - Handler logout dengan clear localStorage
 * 
 * Alur Kerja:
 *   1. Saat hook dipanggil, cek token di localStorage
 *   2. Jika tidak ada atau expired → set showSessionExpired = true
 *   3. Setup multiple event listeners untuk monitoring
 *   4. Return state dan handler untuk komponen consumer
 * 
 * Penggunaan:
 *   const { showSessionExpired, handleLogout, checkToken } = useSession();
 *   
 *   return (
 *     <>
 *       {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
 *       <PageContent />
 *     </>
 *   );
 * 
 * @returns Object dengan properti:
 *   - showSessionExpired: boolean - State untuk menampilkan modal sesi berakhir
 *   - setShowSessionExpired: function - Setter untuk state showSessionExpired
 *   - handleLogout: function - Handler untuk logout (clear storage + redirect)
 *   - checkToken: function - Function untuk manual check token validity
 */
export function useSession() {
    const [showSessionExpired, setShowSessionExpired] = useState(false);

    // ── Token Validation Function ────────────────────────────────────────────

    /**
     * Validasi token JWT: cek keberadaan dan expiration.
     * Dipanggil oleh multiple trigger (interval, focus, visibility, dll).
     * 
     * @returns boolean - true jika token valid, false jika tidak ada atau expired
     */
    const checkToken = useCallback(() => {
        const token = getToken();
        
        // Cek keberadaan token
        if (!token) {
            setShowSessionExpired(true);
            return false;
        }
        
        // Cek expiration token
        if (isTokenExpired(token)) {
            setShowSessionExpired(true);
            return false;
        }
        
        return true;
    }, []);

    // ── Event Listeners Setup ────────────────────────────────────────────────

    useEffect(() => {
        // Cek initial saat komponen mount
        checkToken();

        // Interval check setiap 60 detik
        const checkInterval = setInterval(() => {
            checkToken();
        }, 60000);

        // Handler: Window focus
        const handleFocus = () => checkToken();

        // Handler: Tab visibility change
        const handleVisibilityChange = () => {
            if (!document.hidden) checkToken();
        };

        // Handler: Storage sync antar tab
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && !e.newValue) {
                setShowSessionExpired(true);
            }
        };

        // Handler: Custom event dari fetchWrapper
        const handleSessionExpired = () => {
            setShowSessionExpired(true);
        };

        // Register event listeners
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('sessionExpired', handleSessionExpired);

        // Cleanup: Unregister semua event listeners
        return () => {
            clearInterval(checkInterval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [checkToken]);

    // ── Logout Handler ───────────────────────────────────────────────────────

    /**
     * Handler untuk logout user.
     * Membersihkan localStorage dan redirect ke halaman login.
     */
    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
    }, []);

    // ── Return Hook Value ────────────────────────────────────────────────────

    return {
        showSessionExpired,
        setShowSessionExpired,
        handleLogout,
        checkToken,
    };
}