/**
 * Nama File: SessionExpiredModal.tsx
 * Fungsi: Modal notifikasi sesi login berakhir (token expired) + tombol login ulang
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 1 Oktober 2025
 */

'use client';

import { useEffect, useState } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';

// Interface: Props untuk SessionExpiredModal
interface SessionExpiredModalProps {
    onConfirm: () => void;
}

// Komponen Modal: Notifikasi sesi berakhir dengan animasi smooth + auto-focus tombol
export default function SessionExpiredModal({ onConfirm }: SessionExpiredModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Effect: Trigger animasi masuk setelah mount (delay 50ms)
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Effect: Auto-focus tombol login untuk UX (user bisa tekan Enter)
    useEffect(() => {
        const btn = document.querySelector('[data-session-btn]') as HTMLButtonElement;
        btn?.focus();
    }, []);

    // Render: Modal overlay dengan backdrop blur + animasi scale
    return (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-opacity duration-200"
            style={{ opacity: isVisible ? 1 : 0 }}
        >
            {/* Backdrop dengan blur effect */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal Container */}
            <div 
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-6 transition-all duration-300"
                style={{ 
                    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
                    opacity: isVisible ? 1 : 0
                }}
            >
                {/* Icon dengan animasi pulse */}
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                    <div className="relative w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                        <ShieldAlert size={48} className="text-red-500" />
                    </div>
                </div>

                {/* Text Content */}
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

                {/* Action Button (gradient red) */}
                <button
                    data-session-btn
                    onClick={onConfirm}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:shadow-lg active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                    }}
                >
                    <LogOut size={18} />
                    Login Ulang Sekarang
                </button>
            </div>
        </div>
    );
}