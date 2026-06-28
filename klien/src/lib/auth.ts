/**
 * Nama File: auth.ts
 * Fungsi: Utility functions untuk autentikasi dan manajemen token JWT.
 *         Menyediakan fungsi untuk validasi token, cek expiration, logout,
 *         dan ekstraksi informasi dari JWT payload.
 *         Digunakan oleh AuthGuard, useSession, dan fetchWrapper.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. LOGOUT FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Logout user dari aplikasi.
 * Membersihkan token dan data user dari localStorage, lalu redirect ke halaman login.
 */
export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. AUTHENTICATION CHECK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Cek apakah user terautentikasi (token ada di localStorage).
 * 
 * @returns boolean - true jika token ada, false jika tidak
 */
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('token');
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. TOKEN RETRIEVAL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil token JWT dari localStorage.
 * 
 * @returns string | null - Token JWT atau null jika tidak ada
 */
export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. TOKEN EXPIRATION CHECK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Cek apakah token JWT sudah expired.
 * Decode payload JWT dan bandingkan timestamp exp dengan waktu sekarang.
 * 
 * Catatan: Cek dilakukan tepat waktu tanpa buffer (update 28 Juni 2026)
 * 
 * @param token - Token JWT string
 * @returns boolean - true jika token expired atau tidak ada field exp, false jika masih valid
 */
export const isTokenExpired = (token: string): boolean => {
    try {
        // Decode JWT payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        // Cek field exp (expiration timestamp)
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            // Cek tepat waktu tanpa buffer
            return payload.exp < now;
        }

        // Jika tidak ada field exp, anggap tidak expired
        return false;
    } catch (error) {
        console.error('Error decoding token:', error);
        // Return false jika error (jangan trigger logout)
        return false;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. TOKEN EXPIRY TIME
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ambil waktu expired token sebagai Date object.
 * Berguna untuk menampilkan countdown atau informasi waktu expired.
 * 
 * @param token - Token JWT string
 * @returns Date | null - Date object waktu expired atau null jika error
 */
export const getTokenExpiryTime = (token: string): Date | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        if (payload.exp) {
            // Convert timestamp (seconds) ke milliseconds
            return new Date(payload.exp * 1000);
        }

        return null;
    } catch (error) {
        return null;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. TOKEN REMAINING TIME
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Hitung sisa waktu token dalam detik.
 * Berguna untuk countdown timer atau warning sebelum expired.
 * 
 * @param token - Token JWT string
 * @returns number - Sisa waktu dalam detik (bisa negatif jika sudah expired)
 */
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