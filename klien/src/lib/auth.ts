/**
 * File: auth.ts
 * ✅ UPDATED: Hapus buffer 30 detik, cek expired tepat waktu
 */

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
};

export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('token');
};

export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

// ✅ Cek expired TEPAT waktu (tanpa buffer)
export const isTokenExpired = (token: string): boolean => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            // ✅ HAPUS buffer, cek tepat waktu
            return payload.exp < now;
        }

        return false;
    } catch (error) {
        console.error('Error decoding token:', error);
        // ✅ Return false jika error (jangan trigger logout)
        return false;
    }
};

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