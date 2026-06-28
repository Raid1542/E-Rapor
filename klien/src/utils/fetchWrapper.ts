/**
 * Nama File: fetchWrapper.ts
 * Fungsi: Wrapper untuk fetch API dengan auto-attach JWT token dan handling 401 unauthorized.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

import { getToken } from '@/lib/auth';

// ═════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═════════════════════════════════════════════════════════════════════════════

interface FetchOptions extends RequestInit {
    skipAuthCheck?: boolean; // Skip 401 handling untuk endpoint publik
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Fetch dengan auto Authorization header dan handling token expired.
 * Trigger event 'sessionExpired' saat server return 401 + TOKEN_EXPIRED.
 */
export async function fetchWithAuth(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { skipAuthCheck = false, ...fetchOptions } = options;
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
    };

    try {
        const response = await fetch(url, { ...fetchOptions, headers });

        // Handle 401 - token expired
        if (response.status === 401 && !skipAuthCheck) {
            const data = await response.json().catch(() => ({}));
            
            if (data.code === 'TOKEN_EXPIRED' || data.message?.toLowerCase().includes('expired')) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.dispatchEvent(new CustomEvent('sessionExpired'));
                window.location.href = '/login';
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

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/** GET request dengan auth */
export const getWithAuth = (url: string) =>
    fetchWithAuth(url, { method: 'GET' });

/** POST request dengan auth + JSON body */
export const postWithAuth = (url: string, data: any) =>
    fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });

/** PUT request dengan auth + JSON body */
export const putWithAuth = (url: string, data: any) =>
    fetchWithAuth(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

/** DELETE request dengan auth */
export const deleteWithAuth = (url: string) =>
    fetchWithAuth(url, { method: 'DELETE' });