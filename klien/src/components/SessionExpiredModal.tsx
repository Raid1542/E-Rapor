/*
 * Nama File: SessionExpiredModal.tsx
 * Fungsi: Modal notifikasi sesi login berakhir (token expired) dengan tombol login ulang
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useEffect, useState } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';

interface SessionExpiredModalProps {
    onConfirm: () => void;
}

/* Komponen modal notifikasi sesi berakhir dengan animasi smooth */
export default function SessionExpiredModal({ onConfirm }: SessionExpiredModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Trigger animasi masuk setelah komponen dimuat
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Auto-focus tombol login untuk meningkatkan UX (user bisa tekan Enter)
    useEffect(() => {
        const btn = document.querySelector('[data-session-btn]') as HTMLButtonElement;
        btn?.focus();
    }, []);

    return (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-opacity duration-200"
            style={{ opacity: isVisible ? 1 : 0 }}
        >
            {/* Backdrop dengan efek blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Kontainer Modal */}
            <div 
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-6 transition-all duration-300"
                style={{ 
                    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(0.625rem)',
                    opacity: isVisible ? 1 : 0
                }}
            >
                {/* Ikon dengan animasi pulse */}
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                    <div className="relative w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                        <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                </div>

                {/* Konten Teks */}
                <div className="text-center space-y-3">
                    <h3 className="text-xl font-bold text-gray-900">
                        Sesi Login Telah Berakhir
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Untuk keamanan akun Anda, sesi login telah otomatis berakhir karena token sudah kadaluarsa.
                    </p>
                    <p className="text-sm font-semibold text-red-600">
                        Silakan login kembali untuk melanjutkan.
                    </p>
                </div>

                {/* Tombol Aksi */}
                <button
                    data-session-btn
                    onClick={onConfirm}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:shadow-lg active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                        boxShadow: '0 0.25rem 0.75rem rgba(220, 38, 38, 0.3)'
                    }}
                >
                    <LogOut className="w-4 h-4" />
                    Login Ulang Sekarang
                </button>
            </div>
        </div>
    );
}