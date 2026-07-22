/*
 * Nama File: useNavigationGuard.ts
 * Fungsi: Hook untuk mencegah navigasi keluar tanpa konfirmasi
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useEffect } from 'react';

/* Hook untuk mencegah navigasi keluar tanpa konfirmasi saat ada perubahan belum disimpan */
export const useNavigationGuard = (isDirty: boolean = false) => {
    useEffect(() => {
        // Handler untuk event beforeunload browser
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup event listener saat komponen unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);
};