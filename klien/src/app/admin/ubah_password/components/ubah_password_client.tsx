"use client";

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Success Modal ────────────────────────────────────────────────────────────
const SuccessModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        />
        {/* Card */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-scaleIn">
            {/* Close */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={18} />
            </button>

            {/* Animated check */}
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center ring-8 ring-green-100 animate-pulse-once">
                <CheckCircle2 size={44} className="text-green-500" />
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Kata Sandi Diperbarui!</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                    Kata sandi Anda berhasil diubah.<br />
                    Anda akan diarahkan ke halaman login.
                </p>
            </div>

            <button
                onClick={onClose}
                className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all duration-150 shadow-lg shadow-green-200"
            >
                OK, Mengerti
            </button>
        </div>
    </div>
);

// ─── Password strength indicator ─────────────────────────────────────────────
const getStrength = (pw: string) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: 'Lemah', color: 'bg-red-400' };
    if (score <= 2) return { level: 2, label: 'Sedang', color: 'bg-yellow-400' };
    if (score <= 3) return { level: 3, label: 'Kuat', color: 'bg-orange-400' };
    return { level: 4, label: 'Sangat Kuat', color: 'bg-green-500' };
};

// ─── Field ────────────────────────────────────────────────────────────────────
interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    show: boolean;
    onToggle: () => void;
    error?: string;
    hint?: React.ReactNode;
}

const PasswordField = ({ label, name, value, onChange, placeholder, show, onToggle, error, hint }: FieldProps) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">
            {label} <span className="text-red-500">*</span>
        </label>
        <div className={`relative flex items-center rounded-xl border-2 transition-all duration-200 bg-white ${
            error
                ? 'border-red-400 focus-within:border-red-500'
                : 'border-slate-200 focus-within:border-orange-400 focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.10)]'
        }`}>
            <input
                type={show ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required
                autoComplete="off"
                // ::-ms-reveal  = Edge native eye
                // ::-webkit-credentials-auto-fill-button = Chrome autofill
                className="w-full bg-white px-4 py-3.5 pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none rounded-xl [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                style={{ WebkitAppearance: 'none' }}
            />
            {/* Single custom eye toggle */}
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-4 text-slate-400 hover:text-orange-500 transition-colors"
                tabIndex={-1}
                aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
        {error && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 animate-shake">
                <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                {error}
            </p>
        )}
        {hint && !error && hint}
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const UbahPasswordPage = () => {
    const router = useRouter();

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [show, setShow] = useState({ old: false, new: false, confirm: false });
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const strength = getStrength(passwordData.newPassword);

    const toggle = (field: 'old' | 'new' | 'confirm') =>
        setShow(prev => ({ ...prev, [field]: !prev[field] }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const { oldPassword, newPassword, confirmPassword } = passwordData;
        const errs: Record<string, string> = {};
        if (!oldPassword) errs.oldPassword = 'Kata sandi lama wajib diisi';
        if (!newPassword) errs.newPassword = 'Kata sandi baru wajib diisi';
        else if (newPassword.length < 8) errs.newPassword = 'Minimal 8 karakter';
        if (!confirmPassword) errs.confirmPassword = 'Konfirmasi wajib diisi';
        else if (newPassword !== confirmPassword) errs.confirmPassword = 'Kata sandi tidak cocok';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            setErrors({ oldPassword: 'Sesi login tidak valid. Silakan login ulang.' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/admin/admin/ganti-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: passwordData.oldPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const result = await response.json();
            if (response.ok) {
                setShowModal(true);
            } else {
                setErrors({ oldPassword: result.message || 'Gagal mengubah kata sandi' });
            }
        } catch {
            setErrors({ oldPassword: 'Gagal terhubung ke server' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
        }
        router.push('/login');
    };

    return (
        <>
            {showModal && <SuccessModal onClose={handleModalClose} />}

            <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6 pt-10">
                <div className="w-full max-w-2xl">
                    {/* Page title */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ubah Kata Sandi</h1>
                        <p className="text-slate-500 mt-1 text-sm">Pastikan kata sandi baru Anda kuat dan mudah diingat</p>
                    </div>

                    {/* Card — same style as dashboard stat cards */}
                    <div
                        className="rounded-2xl shadow-lg overflow-hidden"
                        style={{
                            background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                            border: '1px solid rgba(251,146,60,0.2)',
                        }}
                    >
                        {/* Card header — orange gradient like Welcome card on dashboard */}
                        <div
                            className="px-8 py-6 flex items-center gap-4 relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)' }}
                        >
                            {/* Decorative circles */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.4)' }} />
                            <div className="absolute -bottom-6 right-10 w-36 h-36 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.4)' }} />

                            <div className="relative z-10 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                                <ShieldCheck size={24} className="text-white" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-white font-bold text-lg leading-tight">Keamanan Akun</h2>
                                <p className="text-orange-100 text-xs mt-0.5">Setelah berhasil, Anda akan otomatis logout</p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">

                            <PasswordField
                                label="Kata Sandi Lama"
                                name="oldPassword"
                                value={passwordData.oldPassword}
                                onChange={handleChange}
                                placeholder="Masukkan kata sandi lama"
                                show={show.old}
                                onToggle={() => toggle('old')}
                                error={errors.oldPassword}
                            />

                            <div className="space-y-2">
                                <PasswordField
                                    label="Kata Sandi Baru"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handleChange}
                                    placeholder="Minimal 8 karakter"
                                    show={show.new}
                                    onToggle={() => toggle('new')}
                                    error={errors.newPassword}
                                    hint={
                                        passwordData.newPassword ? (
                                            <div className="mt-1">
                                                {/* Strength bar */}
                                                <div className="flex gap-1 mb-1">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div
                                                            key={i}
                                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                                i <= strength.level ? strength.color : 'bg-slate-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className={`text-xs font-medium ${
                                                    strength.level <= 1 ? 'text-red-500' :
                                                    strength.level === 2 ? 'text-yellow-500' :
                                                    strength.level === 3 ? 'text-orange-500' : 'text-green-500'
                                                }`}>
                                                    Kekuatan: {strength.label}
                                                </p>
                                            </div>
                                        ) : null
                                    }
                                />
                            </div>

                            <PasswordField
                                label="Konfirmasi Kata Sandi Baru"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Ulangi kata sandi baru"
                                show={show.confirm}
                                onToggle={() => toggle('confirm')}
                                error={errors.confirmPassword}
                            />

                            {/* Tips box */}
                            <div className="rounded-xl px-4 py-3 text-xs space-y-1" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
                                <p className="font-semibold mb-1" style={{ color: '#9a3412' }}>Tips kata sandi kuat:</p>
                                <ul className="space-y-0.5 list-none">
                                    {[
                                        'Minimal 8 karakter',
                                        'Kombinasi huruf besar & kecil',
                                        'Tambahkan angka atau simbol',
                                        'Jangan gunakan kata yang mudah ditebak',
                                    ].map(tip => (
                                        <li key={tip} className="flex items-center gap-1.5" style={{ color: '#c2410c' }}>
                                            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(251,146,60,0.2)' }}>
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                                >
                                    ← Kembali
                                </button>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all duration-150 hover:-translate-y-0.5"
                                    style={{
                                        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                                        boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                                    }}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
                </div>
            </div>

            <style jsx global>{`
                /* Kill browser-native password reveal icons */
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear,
                input[type="password"]::-webkit-credentials-auto-fill-button,
                input[type="password"]::-webkit-strong-password-auto-fill-button {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    width: 0 !important;
                }
                /* Also cover text type when toggled */
                input[type="text"]::-ms-reveal,
                input[type="text"]::-ms-clear {
                    display: none !important;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.92) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-4px); }
                    40%, 80% { transform: translateX(4px); }
                }
                @keyframes pulse-once {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                    100% { transform: scale(1); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease; }
                .animate-scaleIn { animation: scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
                .animate-shake { animation: shake 0.35s ease; }
                .animate-pulse-once { animation: pulse-once 0.6s ease 0.2s; }
            `}</style>
        </>
    );
};

export default UbahPasswordPage;