import { logout, isTokenExpired, getToken } from '@/lib/auth';

interface FetchOptions extends RequestInit {
    skipAuthCheck?: boolean;
}

export async function fetchWithAuth(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { skipAuthCheck = false, ...fetchOptions } = options;
    const token = getToken();

    if (!token && !url.includes('/auth/') && !skipAuthCheck) {
        logout();
        throw new Error('No authentication token');
    }

    if (token && isTokenExpired(token) && !skipAuthCheck) {
        logout();
        throw new Error('Token expired');
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
    };

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        if (response.status === 401 && !skipAuthCheck) {
            const data = await response.json().catch(() => ({}));

            // Check jika error code adalah TOKEN_EXPIRED
            if (data.code === 'TOKEN_EXPIRED') {
                logout();
                throw new Error('Session expired');
            }
        }

        return response;
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.error('Network error - server tidak dapat dijangkau');
        }
        throw error;
    }
}

// Helper functions
export const getWithAuth = (url: string) =>
    fetchWithAuth(url, { method: 'GET' });

export const postWithAuth = (url: string, data: any) =>
    fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const putWithAuth = (url: string, data: any) =>
    fetchWithAuth(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteWithAuth = (url: string) =>
    fetchWithAuth(url, { method: 'DELETE' });