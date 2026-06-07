'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Lock, Eye, EyeOff, X,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; onConfirm?: () => void; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes in-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes in-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes in-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes in-slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes in-shake   { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
        .in-fadeIn   { animation: in-fadeIn  0.2s ease; }
        .in-scaleIn  { animation: in-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .in-pulse    { animation: in-pulse   0.6s ease 0.15s; }
        .in-slideUp  { animation: in-slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .in-shake    { animation: in-shake   0.35s ease; }

        /* Sembunyikan ikon reveal bawaan browser */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear,
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-strong-password-auto-fill-button { display: none !important; }
        input[type="text"]::-ms-reveal,
        input[type="text"]::-ms-clear { display: none !important; }
    `}</style>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const inputBase = [
    "w-full border-2 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800",
    "outline-none transition-all bg-orange-50/40 placeholder:text-gray-400",
].join(' ');
const inputNormal = `${inputBase} border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20`;
const inputError = `${inputBase} border-red-400 focus:border-red-500`;

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_META: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const m = MODAL_META[modal.type];
    const handleOk = () => { onClose(); modal.onConfirm?.(); };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 in-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 in-scaleIn"
                style={{ border: '1px solid #fde0c8' }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${m.iconBg} flex items-center justify-center ring-8 ${m.ring} in-pulse`}>{m.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={handleOk} className={`w-full ${m.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────

function getStrength(pw: string): { score: number; level: number; label: string; color: string; barColor: string } {
    if (!pw) return { score: 0, level: 0, label: '', color: '', barColor: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, level: 1, label: 'Lemah', color: 'text-red-500', barColor: 'bg-red-400' };
    if (score <= 2) return { score, level: 2, label: 'Sedang', color: 'text-yellow-500', barColor: 'bg-yellow-400' };
    if (score <= 3) return { score, level: 3, label: 'Kuat', color: 'text-orange-500', barColor: 'bg-orange-400' };
    return { score, level: 4, label: 'Sangat Kuat', color: 'text-green-500', barColor: 'bg-green-500' };
}

// ─── PASSWORD INPUT ───────────────────────────────────────────────────────────

interface PasswordInputProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    show: boolean;
    onToggle: () => void;
    error?: string;
    hint?: React.ReactNode;
}

const PasswordInput = ({
    label, name, value, onChange, placeholder, required,
    show, onToggle, error, hint,
}: PasswordInputProps) => (
    <div className="flex flex-col gap-1.5">
        <label className={labelCls} style={labelColor}>
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="relative flex items-center">
            <input
                type={show ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                autoComplete="off"
                className={error ? inputError : inputNormal}
                style={{ WebkitAppearance: 'none' }}
            />
            <button
                type="button"
                onClick={onToggle}
                tabIndex={-1}
                aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-4 transition-colors"
                style={{ color: '#c95b08' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e8690a')}
                onMouseLeave={e => (e.currentTarget.style.color = '#c95b08')}
            >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
        {error && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 in-shake">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                {error}
            </p>
        )}
        {hint && !error && hint}
    </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const UbahPasswordClient = () => {
    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const [form, setForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [show, setShow] = useState({ old: false, new: false, confirm: false });
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const strength = getStrength(form.newPassword);

    const toggle = (field: 'old' | 'new' | 'confirm') =>
        setShow(prev => ({ ...prev, [field]: !prev[field] }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // ── Validasi ───────────────────────────────────────────────────────────────

    const validate = (): Record<string, string> => {
        const { oldPassword, newPassword, confirmPassword } = form;
        const errs: Record<string, string> = {};
        if (!oldPassword) errs.oldPassword = 'Kata sandi lama wajib diisi.';
        if (!newPassword) errs.newPassword = 'Kata sandi baru wajib diisi.';
        else if (newPassword.length < 8) errs.newPassword = 'Minimal 8 karakter.';
        else if (newPassword === oldPassword) errs.newPassword = 'Tidak boleh sama dengan kata sandi lama.';
        if (!confirmPassword) errs.confirmPassword = 'Konfirmasi wajib diisi.';
        else if (newPassword !== confirmPassword) errs.confirmPassword = 'Kata sandi tidak cocok.';
        return errs;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            showModal({ type: 'warning', title: 'Periksa Kembali', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login terlebih dahulu.' });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/admin/ganti-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
            });
            const result = await res.json();

            if (res.ok) {
                showModal({
                    type: 'success',
                    title: 'Kata Sandi Diubah!',
                    message: 'Kata sandi berhasil diperbarui.\nAnda akan diarahkan ke halaman login.',
                    onConfirm: () => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('currentUser');
                        router.push('/login');
                    },
                });
                setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setErrors({ oldPassword: result.message || 'Gagal mengubah kata sandi.' });
                showModal({ type: 'error', title: 'Gagal Mengubah', message: result.message || 'Kata sandi lama yang Anda masukkan salah atau terjadi kesalahan pada server.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server. Periksa koneksi Anda.' });
        } finally {
            setSaving(false);
        }
    };

    // ── Rules checklist — DISAMAKAN dengan admin (CheckCircle2 + warna hijau/abu) ──

    const rules = [
        { label: 'Minimal 8 karakter', ok: form.newPassword.length >= 8 },
        { label: 'Mengandung huruf kapital', ok: /[A-Z]/.test(form.newPassword) },
        { label: 'Mengandung angka', ok: /[0-9]/.test(form.newPassword) },
        { label: 'Mengandung karakter khusus', ok: /[^A-Za-z0-9]/.test(form.newPassword) },
        { label: 'Konfirmasi cocok', ok: form.confirmPassword !== '' && form.newPassword === form.confirmPassword },
    ];

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 p-6 min-h-screen flex flex-col items-center justify-center" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* ── [BARU] Subtitle di atas — sama seperti admin ─────────────── */}
            <p className="text-sm mb-5 w-full max-w-2xl in-slideUp" style={{ color: '#c95b08' }}>
                Perbarui kata sandi akun Anda secara berkala untuk keamanan
            </p>

            {/* ── [DIUBAH] Banner tips keamanan — style sama persis dengan admin ── */}
            <div className="mb-6 w-full max-w-2xl rounded-xl flex items-start gap-3 px-4 py-3.5 in-slideUp"
                style={{ background: '#fff', border: '1px solid #fde0c8' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#fff3e8' }}>
                    <ShieldCheck size={18} style={{ color: '#e8690a' }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: '#5a2d0c' }}>Tips Keamanan Kata Sandi</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#a05a2c' }}>
                        Gunakan kombinasi huruf besar, kecil, angka, dan karakter khusus. Jangan gunakan informasi pribadi seperti nama atau tanggal lahir. Ganti secara berkala setiap 3 bulan.
                    </p>
                </div>
            </div>

            {/* ── Form card ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl in-slideUp"
                style={{ ...CARD_STYLE, animationDelay: '0.05s' }}>

                {/* Card header — konsisten dengan tampilan admin */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 relative overflow-hidden" style={HEADER_GRAD}>
                    {/* Decorative circles */}
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <div className="absolute -bottom-6 right-16 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />

                    {/* Kiri: ikon + judul */}
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <ShieldCheck size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Ubah Kata Sandi</h2>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                Setelah berhasil, Anda akan otomatis logout
                            </p>
                        </div>
                    </div>

                    {/* Kanan: tombol X kembali */}
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                        title="Batal & kembali"
                    >
                        <X size={16} className="text-white" />
                    </button>
                </div>

                {/* Form body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Kata sandi lama */}
                    <PasswordInput
                        label="Kata Sandi Lama"
                        name="oldPassword"
                        value={form.oldPassword}
                        onChange={handleChange}
                        placeholder="Masukkan kata sandi saat ini"
                        required
                        show={show.old}
                        onToggle={() => toggle('old')}
                        error={errors.oldPassword}
                    />

                    {/* Divider */}
                    <div className="border-t" style={{ borderColor: '#fde0c8' }} />

                    {/* Kata sandi baru + strength bar — DISAMAKAN dengan admin (4 segmen) */}
                    <PasswordInput
                        label="Kata Sandi Baru"
                        name="newPassword"
                        value={form.newPassword}
                        onChange={handleChange}
                        placeholder="Minimal 8 karakter"
                        required
                        show={show.new}
                        onToggle={() => toggle('new')}
                        error={errors.newPassword}
                        hint={
                            form.newPassword ? (
                                <div className="mt-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-gray-500">Kekuatan kata sandi</span>
                                        <span className={`text-xs font-bold ${strength.color}`}>{strength.label}</span>
                                    </div>
                                    {/* 4-segmen bar — sama persis dengan admin */}
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.barColor : 'bg-gray-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        }
                    />

                    {/* Konfirmasi kata sandi baru */}
                    <PasswordInput
                        label="Konfirmasi Kata Sandi Baru"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Ulangi kata sandi baru"
                        required
                        show={show.confirm}
                        onToggle={() => toggle('confirm')}
                        error={errors.confirmPassword}
                    />

                    {/* [DIUBAH] Checklist rules — DISAMAKAN dengan admin (CheckCircle2, warna hijau/abu) */}
                    {(form.newPassword || form.confirmPassword) && (
                        <div className="rounded-xl px-5 py-4 space-y-2"
                            style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                            {rules.map((r, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2
                                        size={16}
                                        className={`flex-shrink-0 transition-colors duration-200 ${r.ok ? 'text-green-500' : 'text-gray-300'}`}
                                    />
                                    <span className={`text-sm transition-colors duration-200 ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                                        {r.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer actions */}
                    <div className="flex items-center justify-end pt-2"
                        style={{ borderTop: '1px solid #fde0c8' }}>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                boxShadow: '0 3px 12px rgba(232,105,10,0.3)',
                            }}
                            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Lock size={15} />
                                    Simpan Kata Sandi
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Catatan peringatan ──────────────────────────────────────── */}
            <div className="mt-5 w-full max-w-2xl rounded-2xl p-4 flex items-start gap-3 in-slideUp"
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', animationDelay: '0.1s' }}>
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-red-600">
                    <strong>Perhatian:</strong> Setelah kata sandi berhasil diubah, Anda akan otomatis keluar dari sistem dan diminta untuk login kembali menggunakan kata sandi baru.
                </p>
            </div>
        </div>
    );
};

export default UbahPasswordClient;