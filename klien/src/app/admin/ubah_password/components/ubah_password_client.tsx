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

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
// Disamakan dengan seluruh halaman admin lainnya.

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes fadeInUp   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dg-shake   { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
        .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }
        .dg-shake   { animation: dg-shake   0.35s ease; }
        .anim-in { animation: fadeInUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.02s; }
        .d2 { animation-delay: 0.06s; }
        .d3 { animation-delay: 0.10s; }
        .d4 { animation-delay: 0.14s; }

        .card-flat { transition: box-shadow 0.2s ease; }
        .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
            outline: 2.5px solid #f5a623;
            outline-offset: 2px;
        }

        /* Sembunyikan ikon reveal bawaan browser */
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear,
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-strong-password-auto-fill-button { display: none !important; }
        input[type="text"]::-ms-reveal,
        input[type="text"]::-ms-clear { display: none !important; }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .dg-shake, .btn-action, .card-flat {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

// Input lebih lega: border 2px, padding lebih besar, transisi focus ring halus
const inputBase = [
    "w-full border-2 rounded-xl px-3.5 py-3 pr-12 text-sm text-gray-800",
    "outline-none transition-all bg-white placeholder:text-gray-400",
].join(' ');
const inputNormal = `${inputBase} border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100`;
const inputError = `${inputBase} border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100`;

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── SISTEM TOMBOL AKSI ────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
};

const ActionButton = ({
    onClick, children, variant = 'neutral', disabled = false, fullWidth = false, type = 'button',
}: {
    onClick?: () => void; children: React.ReactNode; variant?: BtnVariant;
    disabled?: boolean; fullWidth?: boolean; type?: 'button' | 'submit';
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn-action inline-flex items-center justify-center gap-2 rounded-xl font-bold whitespace-nowrap px-6 py-2.5 text-sm ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={VARIANT_BASE[variant]}
    >
        {children}
    </button>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_META: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const m = MODAL_META[modal.type];
    const handleOk = () => { onClose(); modal.onConfirm?.(); };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <X size={18} />
                    </button>
                    <div className={`w-16 h-16 rounded-full ${m.iconBg} flex items-center justify-center ring-8 ${m.ring} dg-pulse`}>{m.icon}</div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    <button onClick={handleOk} className={`btn-action w-full ${m.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                        OK, Mengerti
                    </button>
                </div>
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
                className="absolute right-4 flex items-center transition-colors"
                style={{ color: ACCENT_DARK }}
                onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                onMouseLeave={e => (e.currentTarget.style.color = ACCENT_DARK)}
            >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
        {error && (
            <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-0.5 dg-shake">
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

    // ── Rules checklist ──

    const rules = [
        { label: 'Minimal 8 karakter', ok: form.newPassword.length >= 8 },
        { label: 'Mengandung huruf kapital', ok: /[A-Z]/.test(form.newPassword) },
        { label: 'Mengandung angka', ok: /[0-9]/.test(form.newPassword) },
        { label: 'Mengandung karakter khusus', ok: /[^A-Za-z0-9]/.test(form.newPassword) },
        { label: 'Konfirmasi cocok', ok: form.confirmPassword !== '' && form.newPassword === form.confirmPassword },
    ];

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 p-3 sm:p-6 min-h-screen flex flex-col items-center justify-center" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* Subtitle di atas */}
            <div className="w-full max-w-2xl mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ubah Kata Sandi</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">
                    Perbarui kata sandi akun Anda secara berkala untuk keamanan
                </p>
            </div>

            {/* Banner tips keamanan */}
            <div className="mb-4 sm:mb-5 w-full max-w-2xl rounded-2xl flex items-start gap-3 px-4 py-3.5 anim-in d2"
                style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#fff5eb' }}>
                    <ShieldCheck size={18} style={{ color: ACCENT }} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: '#5a2d0c' }}>Tips Keamanan Kata Sandi</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#a05a2c' }}>
                        Gunakan kombinasi huruf besar, kecil, angka, dan karakter khusus. Jangan gunakan informasi pribadi seperti nama atau tanggal lahir. Ganti secara berkala setiap 3 bulan.
                    </p>
                </div>
            </div>

            {/* Form card */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden w-full max-w-2xl anim-in d3"
                style={{ ...CARD_STYLE, marginBottom: '24px' }}>

                {/* Gradient bar tipis */}
                <div className="h-[4px]" style={{ background: BRAND_GRADIENT }} />

                {/* Card header */}
                <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 relative overflow-hidden" style={{ background: BRAND_GRADIENT }}>
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <div className="absolute -bottom-6 right-16 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />

                    <div className="flex items-center gap-3 relative z-10 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-bold text-white">Ubah Kata Sandi</h2>
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                Setelah berhasil, Anda akan otomatis logout
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="Batal & kembali"
                        className="btn-action relative z-10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                        title="Batal & kembali"
                    >
                        <X size={16} className="text-white" />
                    </button>
                </div>

                {/* Form body */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">

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

                    <div className="border-t" style={{ borderColor: '#f0f0f0' }} />

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
                                <div className="mt-1.5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-gray-400">Kekuatan kata sandi</span>
                                        <span className={`text-xs font-bold ${strength.color}`}>{strength.label}</span>
                                    </div>
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

                    {(form.newPassword || form.confirmPassword) && (
                        <div className="rounded-xl px-4 py-3.5 flex flex-col gap-2"
                            style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                            {rules.map((r, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2
                                        size={16}
                                        className={`flex-shrink-0 transition-colors duration-200 ${r.ok ? 'text-green-500' : 'text-gray-300'}`}
                                    />
                                    <span className={`text-[12.5px] transition-colors duration-200 ${r.ok ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                        {r.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer actions */}
                    <div className="flex items-center justify-end pt-4 border-t"
                        style={{ borderColor: '#f0e0d0' }}>
                        <ActionButton type="submit" variant="primary" disabled={saving}>
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
                        </ActionButton>
                    </div>
                </form>
            </div>

            {/* Catatan peringatan */}
            <div className="w-full max-w-2xl rounded-2xl p-4 flex items-start gap-3 anim-in d4"
                style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-red-600">
                    <strong>Perhatian:</strong> Setelah kata sandi berhasil diubah, Anda akan otomatis keluar dari sistem dan diminta untuk login kembali menggunakan kata sandi baru.
                </p>
            </div>
        </div>
    );
};

export default UbahPasswordClient;