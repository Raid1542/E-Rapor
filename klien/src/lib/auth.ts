/**
 * Nama File: auth.ts
 * Fungsi: Utility functions untuk autentikasi JWT (logout, cek token, decode payload)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// Logout: clear localStorage + redirect ke /login
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
};

// Cek apakah user terautentikasi (token ada di localStorage)
export const isAuthenticated = (): boolean => !!localStorage.getItem('token');

// Ambil token JWT dari localStorage
export const getToken = (): string | null => localStorage.getItem('token');

// Cek apakah token JWT sudah expired (decode payload + compare exp timestamp)
export const isTokenExpired = (token: string): boolean => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now; // Cek tepat waktu tanpa buffer
        }
        return false;
    } catch (error) {
        console.error('Error decoding token:', error);
        return false;
    }
};

// Ambil waktu expired token sebagai Date object
export const getTokenExpiryTime = (token: string): Date | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload.exp) return new Date(payload.exp * 1000);
        return null;
    } catch (error) {
        return null;
    }
};

// Hitung sisa waktu token dalam detik
export const getTokenRemainingTime = (token: string): number => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp - now;
        }
        return 0;
    } catch (error) {
        return 0;
    }
};