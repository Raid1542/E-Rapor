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

// Decode JWT untuk check expiration
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
        return true;
    }
};

// Get waktu expired dalam format readable
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