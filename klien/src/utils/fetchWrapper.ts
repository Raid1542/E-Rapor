/*
 * Nama File: fetchWrapper.ts
 * Fungsi: Wrapper fetch API dengan auto-attach JWT token dan handling 401 unauthorized
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

import { getToken } from '@/lib/auth';

/* Interface: Opsi fetch yang memperluas RequestInit dengan flag skipAuthCheck */
export interface FetchOptions extends RequestInit {
    skipAuthCheck?: boolean;
}

/* 
 * Fungsi: Melakukan request fetch dengan otomatis menambahkan header Authorization 
 * dan menangani respons 401 (token expired) dengan memicu event sessionExpired.
 */
export async function fetchWithAuth(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { skipAuthCheck = false, ...fetchOptions } = options;
    const token = getToken();

    // Susun header dengan Content-Type default dan token JWT jika tersedia
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
    };

    try {
        const response = await fetch(url, { ...fetchOptions, headers });

        // Tangani respons 401 Unauthorized (token kadaluarsa)
        if (response.status === 401 && !skipAuthCheck) {
            const data = await response.json().catch(() => ({}));
            
            // Cek apakah error disebabkan oleh token yang expired
            if (data.code === 'TOKEN_EXPIRED' || data.message?.toLowerCase().includes('expired')) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                
                // Memicu event global untuk memberi tahu komponen lain bahwa sesi telah berakhir
                window.dispatchEvent(new CustomEvent('sessionExpired'));
                window.location.href = '/login';
            }
        }

        return response;
    } catch (error) {
        // Tangani error jaringan (misalnya server tidak dapat dijangkau)
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            console.error('Network error: server tidak dapat dijangkau');
        }
        throw error;
    }
}

/* Helper: Melakukan request GET dengan autentikasi */
export const getWithAuth = (url: string, options?: FetchOptions) => 
    fetchWithAuth(url, { method: 'GET', ...options });

/* Helper: Melakukan request POST dengan autentikasi dan body JSON */
export const postWithAuth = (url: string, data: any, options?: FetchOptions) =>
    fetchWithAuth(url, { method: 'POST', body: JSON.stringify(data), ...options });

/* Helper: Melakukan request PUT dengan autentikasi dan body JSON */
export const putWithAuth = (url: string, data: any, options?: FetchOptions) =>
    fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(data), ...options });

/* Helper: Melakukan request DELETE dengan autentikasi */
export const deleteWithAuth = (url: string, options?: FetchOptions) => 
    fetchWithAuth(url, { method: 'DELETE', ...options });