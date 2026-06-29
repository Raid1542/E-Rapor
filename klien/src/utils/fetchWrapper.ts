/**
 * Nama File: fetchWrapper.ts
 * Fungsi: Wrapper fetch API dengan auto-attach JWT token + handling 401 unauthorized
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

import { getToken } from '@/lib/auth';

// Interface: FetchOptions extends RequestInit + skipAuthCheck flag
interface FetchOptions extends RequestInit {
    skipAuthCheck?: boolean;
}

// Fetch dengan auto Authorization header + handling 401 (trigger sessionExpired event)
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

// Helper: GET request dengan auth
export const getWithAuth = (url: string) => fetchWithAuth(url, { method: 'GET' });

// Helper: POST request dengan auth + JSON body
export const postWithAuth = (url: string, data: any) =>
    fetchWithAuth(url, { method: 'POST', body: JSON.stringify(data) });

// Helper: PUT request dengan auth + JSON body
export const putWithAuth = (url: string, data: any) =>
    fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(data) });

// Helper: DELETE request dengan auth
export const deleteWithAuth = (url: string) => fetchWithAuth(url, { method: 'DELETE' });