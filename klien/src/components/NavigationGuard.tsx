'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, X } from 'lucide-react';

// Konstanta untuk path login
const LOGIN_PATH = '/login';

// Konstanta untuk storage keys
const STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'currentUser',
};

interface NavigationGuardProps {
    children: React.ReactNode;
}

/**
 * Nama File: NavigationGuard.tsx
 * Fungsi: Intercept back button di Next.js App Router
 *         Menampilkan konfirmasi sebelum navigasi keluar
 *         Mencegah user logout accidental saat tekan back button
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 * Update: 10 Juli 2026 - Samakan style dengan Header.tsx (animasi gk-*)
 */

// Global styles untuk animasi (sama dengan Header.tsx)
const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes gk-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes gk-scaleIn {
      from { opacity: 0; transform: scale(0.93) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes gk-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    .gk-fadeIn {
      animation: gk-fadeIn 0.2s ease;
    }
    .gk-scaleIn {
      animation: gk-scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .gk-pulse {
      animation: gk-pulse 0.6s ease 0.15s;
    }
  `}</style>
);

export default function NavigationGuard({ children }: NavigationGuardProps) {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // Pastikan komponen sudah mounted di client
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Intercept back button menggunakan popstate event
    useEffect(() => {
        if (!isClient) return;

        try {
            // Push state awal untuk mencegah back button langsung keluar
            window.history.pushState(null, '', window.location.pathname);

            // Handler untuk popstate event
            const handlePopState = () => {
                setShowConfirm(true);
                // Push state baru agar back button tidak langsung keluar
                window.history.pushState(null, '', window.location.pathname);
            };

            window.addEventListener('popstate', handlePopState);

            // Cleanup event listener
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        } catch (err) {
            console.error('Error setting up navigation guard:', err);
        }
    }, [isClient]);

    // Handle konfirmasi keluar - logout dan redirect ke login
    const handleConfirmLeave = () => {
        try {
            setShowConfirm(false);
            // Clear semua data login
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            sessionStorage.clear();
            // Hard redirect ke login
            window.location.href = LOGIN_PATH;
        } catch (err) {
            console.error('Error during logout:', err);
            // Fallback: tetap redirect ke login
            window.location.href = LOGIN_PATH;
        }
    };

    // Handle batal keluar - tutup modal
    const handleCancelLeave = () => {
        setShowConfirm(false);
    };

    // Tampilkan loading saat masih di server
    if (!isClient) {
        return null;
    }

    return (
        <>
            <GlobalStyles />
            {children}

            {/* Modal Konfirmasi Logout - Sama persis dengan Header.tsx */}
            {showConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 gk-fadeIn">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleCancelLeave}
                    />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 gk-scaleIn"
                        style={{ border: '1px solid #fde0c8' }}
                    >
                        {/* Button close */}
                        <button
                            onClick={handleCancelLeave}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        {/* Icon logout dengan animasi pulse */}
                        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 gk-pulse">
                            <LogOut size={32} style={{ color: '#e8690a' }} />
                        </div>

                        {/* Title dan message */}
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                Konfirmasi Logout
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed mt-2">
                                Apakah Anda yakin ingin keluar dari sistem?
                                <br />
                                Sesi Anda akan diakhiri.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleCancelLeave}
                                className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
                                style={{
                                    borderColor: '#fde0c8',
                                    color: '#7a3a0a',
                                    background: '#fff',
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = '#fff0e5')
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = '#fff')
                                }
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmLeave}
                                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all"
                                style={{
                                    background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                    boxShadow: '0 3px 12px rgba(232,105,10,0.3)',
                                }}
                                onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                    'linear-gradient(135deg,#c95b08,#e8690a)')
                                }
                                onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                    'linear-gradient(135deg,#e8690a,#f5a623)')
                                }
                            >
                                Ya
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}