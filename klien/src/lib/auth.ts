/*
 * Nama File: auth.ts
 * Fungsi: Utility functions untuk autentikasi JWT
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

/* Logout: clear localStorage dan redirect ke halaman login */
export const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
};

/* Cek apakah user terautentikasi berdasarkan keberadaan token */
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('token');
};

/* Ambil token JWT dari localStorage */
export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

/* Cek apakah token JWT sudah expired berdasarkan payload exp */
export const isTokenExpired = (token: string): boolean => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        }
        return false;
    } catch (error) {
        console.error('Error decoding token:', error);
        return true; // Anggap expired jika terjadi error decoding
    }
};

/* Ambil waktu expired token sebagai objek Date */
export const getTokenExpiryTime = (token: string): Date | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        if (payload.exp) {
            return new Date(payload.exp * 1000);
        }
        return null;
    } catch (error) {
        return null;
    }
};

/* Hitung sisa waktu token dalam detik */
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