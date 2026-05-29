/**
 * Nama File: Header.tsx
 * Fungsi: Menampilkan header halaman guru kelas yang mencakup judul dashboard,
 *         nama kelas yang diajar, serta dropdown profil pengguna.
 *         Dropdown menampilkan foto profil, nama, email, peran, dan opsi
 *         navigasi ke Profil atau Logout dengan konfirmasi.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Konsisten dengan tema oranye elegan Header Admin
 */

'use client';

import { LogOut, User, ChevronDown, X, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface UserData {
  id: number;
  nama_lengkap: string;
  email_sekolah: string;
  role: string;
  class?: string;
  profileImage?: string;
}

interface HeaderProps {
  user: UserData;
}

const getInitials = (name: string): string =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes gk-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes gk-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes gk-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .gk-fadeIn  { animation: gk-fadeIn  0.2s ease; }
    .gk-scaleIn { animation: gk-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .gk-pulse   { animation: gk-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── CONFIRM LOGOUT MODAL ─────────────────────────────────────────────────────

const ConfirmLogoutModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 gk-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div
      className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 gk-scaleIn"
      style={{ border: '1px solid #fde0c8' }}
    >
      {/* Tombol X */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={18} />
      </button>

      {/* Ikon */}
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 gk-pulse">
        <LogOut size={32} style={{ color: '#e8690a' }} />
      </div>

      {/* Teks */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Logout</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">
          Apakah Anda yakin ingin keluar dari sistem?<br />
          Sesi Anda akan diakhiri.
        </p>
      </div>

      {/* Tombol aksi */}
      <div className="flex gap-3 w-full">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg,#e8690a,#f5a623)',
            boxShadow: '0 3px 12px rgba(232,105,10,0.3)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
        >
          Ya, Keluar
        </button>
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [profileImage,       setProfileImage]       = useState<string | null>(null);
  const [dropdownOpen,       setDropdownOpen]       = useState(false);
  const [showLogoutConfirm,  setShowLogoutConfirm]  = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Muat foto profil ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadProfileImage = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData.profileImage) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const imgUrl = userData.profileImage.startsWith('/')
              ? `${baseUrl}${userData.profileImage}`
              : `${baseUrl}/${userData.profileImage}`;
            setProfileImage(imgUrl);
          } else {
            setProfileImage(null);
          }
        }
      } catch (e) {
        console.error('Gagal memuat foto profil:', e);
        setProfileImage(null);
      }
    };

    loadProfileImage();
    window.addEventListener('userDataUpdated', loadProfileImage);
    return () => window.removeEventListener('userDataUpdated', loadProfileImage);
  }, []);

  // ── Tutup dropdown saat klik di luar ─────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogoutClick   = () => { setDropdownOpen(false); setShowLogoutConfirm(true); };
  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    router.push('/login');
  };
  const handleLogoutCancel  = () => setShowLogoutConfirm(false);
  const handleProfile       = () => { setDropdownOpen(false); router.push('/guru_kelas/profil'); };

  // ── Avatar ────────────────────────────────────────────────────────────────
  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const dim  = size === 'md' ? 'w-11 h-11' : 'w-8 h-8';
    const text = size === 'md' ? 'text-sm'   : 'text-xs';
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`}
        style={{ background: 'rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.7)' }}
      >
        {profileImage ? (
          <img src={profileImage} alt="Foto Profil" className="w-full h-full object-cover"
            onError={() => setProfileImage(null)} />
        ) : (
          <span className={`text-white font-bold ${text}`}>{getInitials(user.nama_lengkap)}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <GlobalStyles />

      {showLogoutConfirm && (
        <ConfirmLogoutModal onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />
      )}

      <header
        className="border-b"
        style={{
          background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <div className="px-6 py-3 flex justify-between items-center">

          {/* ── Judul + kelas ── */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                Dashboard Wali Kelas
              </h1>
              {user.class && (
                <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Kelas {user.class}
                </p>
              )}
            </div>
          </div>

          {/* ── Profil dropdown ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all duration-150"
              style={{
                background: dropdownOpen ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.30)',
                border: '1.5px solid rgba(255,255,255,0.6)',
              }}
              onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.40)'; }}
              onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.30)'; }}
            >
              <Avatar size="sm" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight drop-shadow-sm">{user.nama_lengkap}</p>
                <p className="text-[10px] text-white/90 leading-tight font-medium">Wali Kelas</p>
              </div>
              <ChevronDown
                className="w-3.5 h-3.5 text-white transition-transform duration-200"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{ border: '1px solid #fde0c8', boxShadow: '0 8px 32px rgba(180,70,10,0.18)' }}
              >
                {/* Info user */}
                <div
                  className="p-4"
                  style={{ background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate leading-tight">{user.nama_lengkap}</p>
                      <p className="text-[11px] text-white/65 truncate mt-0.5">{user.email_sekolah}</p>
                      <span
                        className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                        style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                      >
                        Wali Kelas{user.class ? ` – Kelas ${user.class}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-2">
                  {/* Profil */}
                  <button
                    onClick={handleProfile}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: '#7a3a0a' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fff0e5'; e.currentTarget.style.color = '#c95b08'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a3a0a'; }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fff0e5' }}>
                      <User className="w-3.5 h-3.5" style={{ color: '#e8690a' }} />
                    </div>
                    Profil Saya
                  </button>

                  {/* Ubah Kata Sandi */}
                  <button
                    onClick={() => { setDropdownOpen(false); router.push('/guru_kelas/ubah_password'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: '#7a3a0a' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fff0e5'; e.currentTarget.style.color = '#c95b08'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a3a0a'; }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fff0e5' }}>
                      <Lock className="w-3.5 h-3.5" style={{ color: '#e8690a' }} />
                    </div>
                    Ubah Kata Sandi
                  </button>

                  <div className="my-1.5 border-t" style={{ borderColor: '#fde0c8' }} />

                  {/* Logout */}
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: '#dc2626' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fef2f2' }}>
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}