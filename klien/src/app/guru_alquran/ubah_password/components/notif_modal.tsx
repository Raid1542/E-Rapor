'use client';
import { CheckCircle2, AlertCircle, ShieldAlert, WifiOff, X } from 'lucide-react';

type ModalType = 'success' | 'error' | 'warning' | 'network';
export interface ModalConfig { type: ModalType; title: string; message: string; onConfirm?: () => void; }

const MODAL_META: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

export default function NotifModal({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) {
    const m = MODAL_META[modal.type];
    const handleOk = () => { onClose(); modal.onConfirm?.(); };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 in-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 in-scaleIn" style={{ border: '1px solid #fde0c8' }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${m.iconBg} flex items-center justify-center ring-8 ${m.ring} in-pulse`}>{m.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={handleOk} className={`w-full ${m.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
            </div>
        </div>
    );
}