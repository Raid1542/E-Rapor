'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, LogOut } from 'lucide-react';

interface SessionExpiredModalProps {
    onConfirm: () => void;
}

export default function SessionExpiredModal({ onConfirm }: SessionExpiredModalProps) {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onConfirm();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onConfirm]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-6 animate-[scaleIn_0.3s_ease]">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                    <AlertCircle size={48} className="text-red-500" />
                </div>

                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Sesi Login Telah Berakhir
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Untuk keamanan akun Anda, sesi login telah otomatis berakhir.
                        <br /><br />
                        <span className="font-semibold text-red-600">
                            Anda akan diarahkan ke halaman login dalam {countdown} detik...
                        </span>
                    </p>
                </div>

                <button
                    onClick={onConfirm}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    }}
                >
                    <LogOut size={18} />
                    Login Ulang Sekarang
                </button>
            </div>

            <style jsx global>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
        </div>
    );
}