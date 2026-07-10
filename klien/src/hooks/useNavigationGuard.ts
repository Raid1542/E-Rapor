'use client';

import { useEffect } from 'react';

/**
 * Hook untuk mencegah navigasi keluar tanpa konfirmasi
 * Digunakan untuk mencegah user accidentally logout saat tekan back button
 */
export const useNavigationGuard = (isDirty: boolean = false) => {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);
};