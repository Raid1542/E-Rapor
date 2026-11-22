'use client';
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';
import NotifModal, { ModalConfig } from './notif_modal';
import PasswordInput from './password_input';
import PasswordStrength from './password_strength';

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes in-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes in-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes in-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes in-slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes in-shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
        .in-fadeIn { animation: in-fadeIn 0.2s ease; } .in-scaleIn { animation: in-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .in-pulse { animation: in-pulse 0.6s ease 0.15s; } .in-shake { animation: in-shake 0.35s ease; }
        .anim-in { animation: in-slideUp 0.5s ease forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; } .d2 { animation-delay: 0.1s; } .d3 { animation-delay: 0.15s; } .d4 { animation-delay: 0.2s; }
        input[type="password"]::-ms-reveal, input[type="password"]::-webkit-credentials-auto-fill-button { display: none !important; }
    `}</style>
);

export default function UbahPasswordClient() {
    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [show, setShow] = useState({ old: false, new: false, confirm: false });
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);
    const toggle = (field: 'old' | 'new' | 'confirm') => setShow(prev => ({ ...prev, [field]: !prev[field] }));
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.oldPassword) errs.oldPassword = 'Kata sandi lama wajib diisi.';
        if (!form.newPassword) errs.newPassword = 'Kata sandi baru wajib diisi.';
        else if (form.newPassword.length < 8) errs.newPassword = 'Minimal 8 karakter.';
        else if (form.newPassword === form.oldPassword) errs.newPassword = 'Tidak boleh sama dengan kata sandi lama.';
        if (!form.confirmPassword) errs.confirmPassword = 'Konfirmasi wajib diisi.';
        else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Kata sandi tidak cocok.';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            showModal({ type: 'warning', title: 'Periksa Kembali', message: 'Harap perbaiki kolom yang ditandai merah.' });
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login terlebih dahulu.' }); return; }

        setSaving(true);
        try {
            // ✅ ENDPOINT DISESUAIKAN UNTUK GURU AL-QUR'AN
            const res = await fetch(`${API_URL}/api/guru_alquran/ganti-password`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
            });
            const result = await res.json();
            if (res.ok) {
                showModal({ type: 'success', title: 'Kata Sandi Diubah!', message: 'Berhasil diperbarui. Anda akan diarahkan ke halaman login.', onConfirm: () => { localStorage.clear(); router.push('/login'); } });
                setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setErrors({ oldPassword: result.message || 'Gagal mengubah kata sandi.' });
                showModal({ type: 'error', title: 'Gagal Mengubah', message: result.message || 'Kata sandi lama salah.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server.' });
        } finally { setSaving(false); }
    };

    return (
        <div className="flex-1 p-6 min-h-screen flex flex-col items-center justify-center" style={{ background: '#ffffff' }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <p className="text-sm mb-5 w-full max-w-2xl anim-in d1" style={{ color: '#c95b08' }}>Perbarui kata sandi akun Anda secara berkala untuk keamanan</p>

            <div className="mb-6 w-full max-w-2xl rounded-xl flex items-start gap-3 px-4 py-3.5 anim-in d2" style={{ background: '#fff', border: '1px solid #fde0c8' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fff3e8' }}><ShieldCheck size={18} style={{ color: '#e8690a' }} /></div>
                <div><p className="text-sm font-bold" style={{ color: '#5a2d0c' }}>Tips Keamanan</p><p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#a05a2c' }}>Gunakan kombinasi huruf besar, kecil, angka, dan karakter khusus. Ganti secara berkala setiap 3 bulan.</p></div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl anim-in d3" style={{ border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' }}>
                <div className="flex items-center justify-between gap-4 px-6 py-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' }}>
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}><ShieldCheck size={22} className="text-white" /></div>
                        <div><h2 className="text-base font-bold text-white">Ubah Kata Sandi</h2><p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>Setelah berhasil, Anda akan otomatis logout</p></div>
                    </div>
                    <button type="button" onClick={() => router.back()} className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all" style={{ background: 'rgba(255,255,255,0.2)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')} title="Batal"><X size={16} className="text-white" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <PasswordInput label="Kata Sandi Lama" name="oldPassword" value={form.oldPassword} onChange={handleChange} placeholder="Masukkan kata sandi saat ini" required show={show.old} onToggle={() => toggle('old')} error={errors.oldPassword} />
                    <div className="border-t" style={{ borderColor: '#fde0c8' }} />
                    <PasswordInput label="Kata Sandi Baru" name="newPassword" value={form.newPassword} onChange={handleChange} placeholder="Minimal 8 karakter" required show={show.new} onToggle={() => toggle('new')} error={errors.newPassword} hint={<PasswordStrength newPassword={form.newPassword} confirmPassword={form.confirmPassword} />} />
                    <PasswordInput label="Konfirmasi Kata Sandi Baru" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Ulangi kata sandi baru" required show={show.confirm} onToggle={() => toggle('confirm')} error={errors.confirmPassword} />

                    <div className="flex items-center justify-end pt-2" style={{ borderTop: '1px solid #fde0c8' }}>
                        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }} onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}>
                            {saving ? (<><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Menyimpan...</>) : (<><Lock size={15} /> Simpan Kata Sandi</>)}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-5 w-full max-w-2xl rounded-2xl p-4 flex items-start gap-3 anim-in d4" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-red-600"><strong>Perhatian:</strong> Setelah kata sandi berhasil diubah, Anda akan otomatis keluar dari sistem dan diminta untuk login kembali.</p>
            </div>
        </div>
    );
}