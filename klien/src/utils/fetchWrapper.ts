/*
 * Nama File: fetchWrapper.ts
 * Fungsi: Wrapper fetch API dengan auto-attach JWT token dan handling 401 unauthorized
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

import { getToken } from '@/lib/auth';

export interface FetchOptions extends RequestInit {
    skipAuthCheck?: boolean;
}

export async function fetchWithAuth(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { skipAuthCheck = false, ...fetchOptions } = options;
    const token = getToken();

    const isFormData = fetchOptions.body instanceof FormData;
    const headers: HeadersInit = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
    };

    try {
        const response = await fetch(url, { ...fetchOptions, headers });

        if (response.status === 401 && !skipAuthCheck) {
            const data = await response.json().catch(() => ({}));
            
            if (data.code === 'TOKEN_EXPIRED' || data.message?.toLowerCase().includes('expired')) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                
                window.dispatchEvent(new CustomEvent('sessionExpired'));
                window.location.href = '/';
            }
        }

        return response;
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.error('Network error: server tidak dapat dijangkau');
        }
        throw error;
    }
}

export const getWithAuth = (url: string, options?: FetchOptions) => 
    fetchWithAuth(url, { method: 'GET', ...options });

export const postWithAuth = (url: string, data: any, options?: FetchOptions) =>
    fetchWithAuth(url, { method: 'POST', body: JSON.stringify(data), ...options });

export const putWithAuth = (url: string, data: any, options?: FetchOptions) =>
    fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(data), ...options });

export const deleteWithAuth = (url: string, options?: FetchOptions) => 
    fetchWithAuth(url, { method: 'DELETE', ...options });