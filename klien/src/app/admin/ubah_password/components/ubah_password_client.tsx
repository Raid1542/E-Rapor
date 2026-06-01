/**
 * Nama File: ubah_password_page.tsx
 * Fungsi: Halaman ubah kata sandi dengan UI referensi gambar.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Fix: Field dipindah keluar komponen utama agar tidak re-mount tiap render (input tidak lari)
 *      Border focus orange diperbaiki, warning notice warna merah
 */

"use client";

import React, { useState, useMemo } from 'react';
import {
  Lock, Eye, EyeOff, ShieldCheck, X,
  CheckCircle2, AlertCircle, WifiOff, CircleCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── TYPES ──────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; onClose?: () => void; }

// ─── GLOBAL STYLES ──────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes up-fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes up-scaleIn { from{opacity:0;transform:scale(0.93) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes up-pulse   { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
    @keyframes up-shake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
    .up-fadeIn  { animation: up-fadeIn  0.2s ease }
    .up-scaleIn { animation: up-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) }
    .up-pulse   { animation: up-pulse   0.6s ease 0.15s }
    .up-shake   { animation: up-shake   0.35s ease }
    input[type="password"]::-ms-reveal,
    input[type="password"]::-ms-clear,
    input[type="password"]::-webkit-credentials-auto-fill-button { display:none !important }

    .pw-field-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      border-radius: 12px;
      border: 2px solid #e5e7eb;
      padding: 0 16px;
      background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .pw-field-wrap:focus-within {
      border-color: #f5870a !important;
      box-shadow: 0 0 0 3px rgba(245,135,10,0.15);
    }
    .pw-field-wrap.has-error {
      border-color: #f87171 !important;
    }
    .pw-field-wrap.has-error:focus-within {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
    }
  `}</style>
);

// ─── NOTIF MODAL ────────────────────────────────────────────────────────────

const MODAL_CFG: Record<ModalType, { iconBg:string; ring:string; icon:React.ReactNode; btn:string }> = {
  success: { iconBg:'bg-green-50',  ring:'ring-green-100',  icon:<CheckCircle2 size={40} className="text-green-500"/>,  btn:'bg-green-500 hover:bg-green-600' },
  error:   { iconBg:'bg-red-50',    ring:'ring-red-100',    icon:<AlertCircle  size={40} className="text-red-500"/>,    btn:'bg-red-500   hover:bg-red-600' },
  warning: { iconBg:'bg-orange-50', ring:'ring-orange-100', icon:<AlertCircle  size={40} className="text-orange-500"/>, btn:'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg:'bg-slate-100', ring:'ring-slate-200',  icon:<WifiOff      size={40} className="text-slate-500"/>,  btn:'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_CFG[modal.type];
  const handleClose = () => { modal.onClose?.(); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 up-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 up-scaleIn">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} up-pulse`}>
          {s.icon}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        <button onClick={handleClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
          OK, Mengerti
        </button>
      </div>
    </div>
  );
};

// ─── STRENGTH LOGIC ─────────────────────────────────────────────────────────

const getStrength = (pw: string) => {
  if (!pw) return { level: 0, label: '', color: '', textColor: '' };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (pw.length >= 12)          score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Lemah',      color: 'bg-red-400',    textColor: 'text-red-500' };
  if (score <= 2) return { level: 2, label: 'Sedang',     color: 'bg-yellow-400', textColor: 'text-yellow-600' };
  if (score <= 3) return { level: 3, label: 'Kuat',       color: 'bg-orange-400', textColor: 'text-orange-500' };
  return             { level: 4, label: 'Sangat Kuat', color: 'bg-green-500',  textColor: 'text-green-600' };
};

// ─── CHECK ITEM ─────────────────────────────────────────────────────────────

const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <CircleCheck size={16} className={`flex-shrink-0 transition-colors duration-200 ${ok ? 'text-green-500' : 'text-gray-300'}`} />
    <span className={`text-sm transition-colors duration-200 ${ok ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
  </div>
);

// ─── PASSWORD FIELD — didefinisikan di LUAR komponen utama agar tidak re-mount ──

interface FieldProps {
  label: string;
  id: string;
  name: string;
  value: string;
  showPw: boolean;
  placeholder: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}

const PasswordField = ({ label, id, name, value, showPw, placeholder, error, onChange, onToggle }: FieldProps) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold mb-2" style={{ color: '#5a2d0c' }}>
      {label} <span className="text-red-500">*</span>
    </label>
    <div className={`pw-field-wrap${error ? ' has-error' : ''}`}>
      <Lock size={16} className="flex-shrink-0" style={{ color: '#c95b08' }} />
      <input
        id={id}
        type={showPw ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        className="flex-1 py-3 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        aria-label={showPw ? 'Sembunyikan' : 'Tampilkan'}
        className="flex-shrink-0"
        style={{ color: '#c95b08' }}
      >
        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
    {error && (
      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 up-shake">
        <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

const UbahPasswordPage = () => {
  const router = useRouter();

  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ old: false, newPw: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = getStrength(form.newPassword);

  const checks = useMemo(() => ({
    minLen:    form.newPassword.length >= 8,
    hasUpper:  /[A-Z]/.test(form.newPassword),
    hasNumber: /[0-9]/.test(form.newPassword),
    hasSymbol: /[^A-Za-z0-9]/.test(form.newPassword),
    confirmed: form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword,
  }), [form.newPassword, form.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.oldPassword)                              errs.oldPassword     = 'Kata sandi lama wajib diisi';
    if (!form.newPassword)                              errs.newPassword     = 'Kata sandi baru wajib diisi';
    else if (form.newPassword.length < 8)              errs.newPassword     = 'Minimal 8 karakter';
    if (!form.confirmPassword)                          errs.confirmPassword = 'Konfirmasi wajib diisi';
    else if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Kata sandi tidak cocok';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai sebelum melanjutkan.' });
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login ulang.' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/admin/ganti-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      const result = await res.json();
      if (res.ok) {
        setModal({
          type: 'success',
          title: 'Kata Sandi Diperbarui!',
          message: 'Kata sandi berhasil diubah.\nAnda akan diarahkan ke halaman login.',
          onClose: () => {
            setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            router.push('/login');
          },
        });
      } else {
        setErrors({ oldPassword: result.message || 'Gagal mengubah kata sandi' });
        setModal({ type: 'error', title: 'Gagal Mengubah', message: result.message || 'Kata sandi lama salah atau terjadi kesalahan server.' });
      }
    } catch {
      setModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    } finally {
      setIsLoading(false);
    }
  };

  const showChecklist = form.newPassword.length > 0 || form.confirmPassword.length > 0;

  return (
    <>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={() => setModal(null)} />}

      <div className="flex-1 min-h-screen p-6 md:p-10" style={{ background: '#fdf6f0' }}>

        {/* Subtitle */}
        <p className="text-sm mb-5" style={{ color: '#c95b08' }}>
          Perbarui kata sandi akun Anda secara berkala untuk keamanan
        </p>

        {/* Tips banner */}
        <div className="mb-6 rounded-xl flex items-start gap-3 px-4 py-3.5 max-w-2xl mx-auto"
          style={{ background: '#fff', border: '1px solid #fde0c8' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#fff3e8' }}>
            <ShieldCheck size={18} style={{ color: '#e8690a' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#5a2d0c' }}>Tips Keamanan Kata Sandi</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#a05a2c' }}>
              Gunakan kombinasi huruf besar, kecil, angka, dan karakter khusus. Jangan gunakan informasi
              pribadi seperti nama atau tanggal lahir. Ganti secara berkala setiap 3 bulan.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden"
          style={{ border: '1px solid #fde0c8', boxShadow: '0 2px 20px rgba(200,80,10,0.08)' }}>

          {/* Card header */}
          <div className="px-6 py-4 flex items-center gap-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="absolute -bottom-6 right-20 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Lock size={20} className="text-white" />
            </div>
            <div className="relative z-10">
              <p className="text-base font-bold text-white">Formulir Ubah Kata Sandi</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Isi semua kolom di bawah ini</p>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            <PasswordField
              id="oldPassword"
              label="Kata Sandi Lama"
              name="oldPassword"
              value={form.oldPassword}
              showPw={show.old}
              placeholder="Masukkan kata sandi lama"
              error={errors.oldPassword}
              onChange={handleChange}
              onToggle={() => setShow(p => ({ ...p, old: !p.old }))}
            />

            <PasswordField
              id="newPassword"
              label="Kata Sandi Baru"
              name="newPassword"
              value={form.newPassword}
              showPw={show.newPw}
              placeholder="Minimal 8 karakter"
              error={errors.newPassword}
              onChange={handleChange}
              onToggle={() => setShow(p => ({ ...p, newPw: !p.newPw }))}
            />

            {/* Strength bar */}
            {form.newPassword && (
              <div className="-mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Kekuatan kata sandi</span>
                  <span className={`text-xs font-bold ${strength.textColor}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                    style={{ width: `${(strength.level / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <PasswordField
              id="confirmPassword"
              label="Konfirmasi Kata Sandi Baru"
              name="confirmPassword"
              value={form.confirmPassword}
              showPw={show.confirm}
              placeholder="Ulangi kata sandi baru"
              error={errors.confirmPassword}
              onChange={handleChange}
              onToggle={() => setShow(p => ({ ...p, confirm: !p.confirm }))}
            />

            {/* Checklist validasi */}
            {showChecklist && (
              <div className="rounded-xl px-5 py-4 space-y-2"
                style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <CheckItem ok={checks.minLen}    label="Minimal 8 karakter" />
                <CheckItem ok={checks.hasUpper}  label="Mengandung huruf kapital" />
                <CheckItem ok={checks.hasNumber} label="Mengandung angka" />
                <CheckItem ok={checks.hasSymbol} label="Mengandung karakter khusus" />
                <CheckItem ok={checks.confirmed} label="Konfirmasi cocok" />
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 pt-2"
              style={{ borderTop: '1px solid #fde0c8' }}>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ border: '2px solid #e5e7eb', color: '#374151', background: '#fff' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#c95b08';
                  (e.currentTarget as HTMLButtonElement).style.color = '#c95b08';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                  (e.currentTarget as HTMLButtonElement).style.color = '#374151';
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
              >
                {isLoading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</>
                  : <><ShieldCheck size={15} />Simpan Kata Sandi</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* Warning notice — MERAH sesuai gambar */}
        <div className="max-w-2xl mx-auto mt-4 rounded-xl px-4 py-3.5 flex items-start gap-3"
          style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs leading-relaxed" style={{ color: '#7f1d1d' }}>
            <span className="font-bold text-red-600">Perhatian:</span>{' '}
            Setelah kata sandi berhasil diubah, Anda akan otomatis keluar dari sistem dan diminta
            untuk login kembali menggunakan kata sandi baru.
          </p>
        </div>

      </div>
    </>
  );
};

export default UbahPasswordPage;