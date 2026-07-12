'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, X } from 'lucide-react';

const LOGIN_PATH = '/login';
const STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'currentUser',
    NAVIGATION_HISTORY: 'navigationHistory',
};

interface NavigationGuardProps {
    children: React.ReactNode;
}

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
        .gk-fadeIn { animation: gk-fadeIn 0.2s ease; }
        .gk-scaleIn { animation: gk-scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .gk-pulse { animation: gk-pulse 0.6s ease 0.15s; }
    `}</style>
);

export default function NavigationGuard({ children }: NavigationGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const navigationHistoryRef = useRef<string[]>([]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Track navigation history
    useEffect(() => {
        if (pathname && isClient) {
            // Simpan history di sessionStorage
            const history = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.NAVIGATION_HISTORY) || '[]');
            history.push(pathname);
            // Simpan hanya 10 history terakhir
            if (history.length > 10) history.shift();
            sessionStorage.setItem(STORAGE_KEYS.NAVIGATION_HISTORY, JSON.stringify(history));
            navigationHistoryRef.current = history;
        }
    }, [pathname, isClient]);

    // ✅ DIHAPUS: Event listener beforeunload yang menyebabkan popup browser
    // Sekarang hanya menggunakan custom modal untuk konfirmasi logout

    // Handle back button - hanya tampilkan jika akan ke login
    useEffect(() => {
        if (!isClient) return;

        const handlePopState = () => {
            const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
            
            // Jika user masih login
            if (token) {
                // Cek history navigasi
                const history = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.NAVIGATION_HISTORY) || '[]');
                
                // Jika history hanya 1 item (langsung ke halaman ini dari login)
                // atau halaman sebelumnya adalah login
                const isFromLogin = history.length === 1 || 
                                   history[history.length - 2] === LOGIN_PATH ||
                                   history[history.length - 2]?.includes('/login');
                
                if (isFromLogin) {
                    setShowConfirm(true);
                    // Push state untuk mencegah back keluar
                    window.history.pushState(null, '', window.location.pathname);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isClient]);

    const handleConfirmLeave = () => {
        setShowConfirm(false);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        sessionStorage.clear();
        window.location.href = LOGIN_PATH;
    };

    const handleCancelLeave = () => {
        setShowConfirm(false);
    };

    if (!isClient) return null;

    return (
        <>
            <GlobalStyles />
            {children}

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
                        <button
                            onClick={handleCancelLeave}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 gk-pulse">
                            <LogOut size={32} style={{ color: '#e8690a' }} />
                        </div>

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