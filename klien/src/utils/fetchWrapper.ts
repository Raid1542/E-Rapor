/**
 * File: fetchWrapper.ts
 * ✅ UPDATED: Handle 401 dengan aman, hindari double logout
 */

import { getToken } from '@/lib/auth';

interface FetchOptions extends RequestInit {
    skipAuthCheck?: boolean;
}

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
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        // ✅ Hanya trigger logout jika server merespon 401
        if (response.status === 401 && !skipAuthCheck) {
            const data = await response.json().catch(() => ({}));
            
            // Cek apakah pesan dari server memang tentang expired
            if (data.code === 'TOKEN_EXPIRED' || data.message?.toLowerCase().includes('expired')) {
                console.log('🔒 [fetchWrapper] Token expired from server');
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                
                // Trigger event agar useSession menampilkan modal
                window.dispatchEvent(new CustomEvent('sessionExpired'));
                
                // Redirect ke login
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