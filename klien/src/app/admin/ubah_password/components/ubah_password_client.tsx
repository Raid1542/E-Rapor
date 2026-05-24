/**
 * Nama File: ubah_password_page.tsx
 * Fungsi: Halaman ubah kata sandi admin dengan tema oranye konsisten.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Konsisten dengan tema oranye elegan (DataGuruPage, DataKelasPage, dll)
 */

"use client";

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; onClose?: () => void; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes up-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes up-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes up-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    @keyframes up-shake   { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
    .up-fadeIn  { animation: up-fadeIn  0.2s ease; }
    .up-scaleIn { animation: up-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .up-pulse   { animation: up-pulse   0.6s ease 0.15s; }
    .up-shake   { animation: up-shake   0.35s ease; }

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

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const inputBase = [
  "w-full border-2 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800",
  "outline-none transition-all bg-orange-50/40 placeholder:text-gray-400",
].join(' ');
const inputNormal = `${inputBase} border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20`;
const inputError  = `${inputBase} border-red-400 focus:border-red-500`;

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
  error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <AlertCircle  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  const handleClose = () => { modal.onClose?.(); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 up-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 up-scaleIn">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} up-pulse`}>
          {s.icon}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        <button onClick={handleClose}
          className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
          OK, Mengerti
        </button>
      </div>
    </div>
  );
};

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────

const getStrength = (pw: string) => {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)             score++;
  if (pw.length >= 12)            score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;
  if (score <= 1) return { level: 1, label: 'Lemah',       color: 'bg-red-400' };
  if (score <= 2) return { level: 2, label: 'Sedang',      color: 'bg-yellow-400' };
  if (score <= 3) return { level: 3, label: 'Kuat',        color: 'bg-orange-400' };
  return             { level: 4, label: 'Sangat Kuat',  color: 'bg-green-500' };
};

// ─── PASSWORD FIELD ───────────────────────────────────────────────────────────

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
    <label className={labelCls} style={labelColor}>
      {label} <span className="text-red-500">*</span>
    </label>
    <div className="relative flex items-center">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
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
      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5 up-shake">
        <span className="inline-block w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
        {error}
      </p>
    )}
    {hint && !error && hint}
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const UbahPasswordPage = () => {
  const router = useRouter();

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [show,      setShow]      = useState({ old: false, new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [modal,     setModal]     = useState<ModalConfig | null>(null);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

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
    if (!oldPassword)                               errs.oldPassword     = 'Kata sandi lama wajib diisi';
    if (!newPassword)                               errs.newPassword     = 'Kata sandi baru wajib diisi';
    else if (newPassword.length < 8)               errs.newPassword     = 'Minimal 8 karakter';
    if (!confirmPassword)                           errs.confirmPassword = 'Konfirmasi wajib diisi';
    else if (newPassword !== confirmPassword)       errs.confirmPassword = 'Kata sandi tidak cocok';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setModal({
        type: 'warning',
        title: 'Form Belum Lengkap',
        message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.',
      });
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setErrors({ oldPassword: 'Sesi login tidak valid. Silakan login ulang.' });
      setModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi login tidak valid. Silakan login ulang.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/admin/ganti-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setModal({
          type: 'success',
          title: 'Kata Sandi Diperbarui!',
          message: 'Kata sandi Anda berhasil diubah.\nAnda akan diarahkan ke halaman login.',
          onClose: () => {
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('currentUser');
            }
            router.push('/login');
          },
        });
      } else {
        setErrors({ oldPassword: result.message || 'Gagal mengubah kata sandi' });
        setModal({
          type: 'error',
          title: 'Gagal Mengubah Kata Sandi',
          message: result.message || 'Kata sandi lama yang Anda masukkan salah atau terjadi kesalahan pada server.',
        });
      }
    } catch {
      setModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={() => setModal(null)} />}

      <div className="flex-1 min-h-screen p-6 flex flex-col items-center justify-center" style={PAGE_BG}>

        {/* Page header */}
        <div className="mb-6 w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900">Ubah Kata Sandi</h1>
          <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Pastikan kata sandi baru Anda kuat dan mudah diingat</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl" style={CARD_STYLE}>

          {/* Card header — konsisten dengan halaman lain */}
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
                <h2 className="text-base font-bold text-white">Keamanan Akun</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Setelah berhasil, Anda akan otomatis logout
                </p>
              </div>
            </div>

            {/* Kanan: tombol X keluar */}
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

            {/* Kata sandi baru + strength */}
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
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.level ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${
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

            {/* Konfirmasi */}
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

            {/* Tips box — warna konsisten dengan tema */}
            <div className="rounded-xl px-4 py-3.5 space-y-1.5"
              style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
              <p className="text-xs font-bold" style={{ color: '#7a3a0a' }}>Tips kata sandi kuat:</p>
              <ul className="space-y-1">
                {[
                  'Minimal 8 karakter',
                  'Kombinasi huruf besar & kecil',
                  'Tambahkan angka atau simbol',
                  'Jangan gunakan kata yang mudah ditebak',
                ].map(tip => (
                  <li key={tip} className="flex items-center gap-2 text-xs" style={{ color: '#c95b08' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#e8690a' }} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end pt-2"
              style={{ borderTop: '1px solid #fde0c8' }}>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                  boxShadow: '0 3px 12px rgba(232,105,10,0.3)',
                }}
                onMouseEnter={e => {
                  if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)';
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
    </>
  );
};

export default UbahPasswordPage;