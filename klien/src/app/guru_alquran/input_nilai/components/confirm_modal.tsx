'use client';
import { ShieldAlert } from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isSaving: boolean;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, isSaving }: ConfirmModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 fade-in" onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 scale-in" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0"><ShieldAlert size={24} className="text-orange-500" /></div>
                    <h3 className="text-base font-bold text-gray-900">{title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                    <button onClick={onConfirm} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: BRAND_GRADIENT, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }}>
                        {isSaving ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</> : 'Ya, Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
}