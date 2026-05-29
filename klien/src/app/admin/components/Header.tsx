/**
 * Nama File: Header.tsx
 * Fungsi: Komponen header untuk halaman admin.
 *         Menampilkan judul halaman dan dropdown profil pengguna dengan foto,
 *         nama, role, serta opsi menu Profil, Ubah Kata Sandi, dan Logout.
 *         Mendukung deteksi klik di luar dropdown untuk menutupnya secara otomatis.
 *         Update: Konfirmasi logout sebelum keluar.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan Sidebar
 */

'use client';

import { LogOut, ChevronDown, User, Lock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface UserData {
  id: number;
  nama_lengkap: string;
  email_sekolah: string;
  role: string;
  profileImage?: string;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || '')
    .join('');
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes hd-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes hd-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes hd-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .hd-fadeIn  { animation: hd-fadeIn  0.2s ease; }
    .hd-scaleIn { animation: hd-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .hd-pulse   { animation: hd-pulse   0.6s ease 0.15s; }
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
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 hd-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 hd-scaleIn"
      style={{ border: '1px solid #fde0c8' }}>

      {/* Tombol X tutup */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={18} />
      </button>

      {/* Ikon */}
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 hd-pulse">
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

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load user data ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const userData: UserData = JSON.parse(storedUser);
          setUser(userData);
          if (userData.profileImage) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            setProfileImage(baseUrl + userData.profileImage);
          } else {
            setProfileImage(null);
          }
        } else {
          setUser(null);
          setProfileImage(null);
        }
      } catch (e) {
        console.error('Gagal memuat data user:', e);
        setUser(null);
        setProfileImage(null);
      }
    };

    loadUserData();

    const fallbackInterval = setInterval(() => {
      const stored = localStorage.getItem('currentUser');
      if (stored && !user) loadUserData();
    }, 500);

    window.addEventListener('userDataUpdated', loadUserData);
    window.addEventListener('profileImageUpdated', loadUserData);

    return () => {
      window.removeEventListener('userDataUpdated', loadUserData);
      window.removeEventListener('profileImageUpdated', loadUserData);
      clearInterval(fallbackInterval);
    };
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
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

  /** Klik tombol Logout → tutup dropdown, tampilkan modal konfirmasi */
  const handleLogoutClick = () => {
    setDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  /** User konfirmasi → benar-benar logout */
  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    router.push('/login');
  };

  /** User batal → tutup modal saja */
  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    router.push('/admin/profil');
  };

  const handleUbahPassword = () => {
    setDropdownOpen(false);
    router.push('/admin/ubah_password');
  };

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <header className="bg-white border-b" style={{ borderColor: '#fde0c8' }}>
        <div className="px-6 py-3 flex justify-between items-center">
          <div className="h-6 w-48 rounded-lg bg-orange-100 animate-pulse" />
          <div className="h-10 w-44 rounded-xl bg-orange-100 animate-pulse" />
        </div>
      </header>
    );
  }

  // ── Avatar ────────────────────────────────────────────────────────────────
  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const dim  = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
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

      {/* Modal konfirmasi logout */}
      {showLogoutConfirm && (
        <ConfirmLogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
        />
      )}

      <header
        className="border-b"
        style={{
          background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <div className="px-6 py-3 flex justify-between items-center">

          {/* ── Judul halaman ── */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
            <h1 className="text-lg font-bold text-white tracking-tight">Dashboard Admin</h1>
          </div>

          {/* ── Kanan: profil ── */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>

              {/* Tombol profil */}
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
                  <p className="text-[10px] text-white/90 leading-tight capitalize font-medium">{user.role}</p>
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
                  <div className="p-4" style={{ background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.4)' }}
                      >
                        {profileImage ? (
                          <img src={profileImage} alt="Foto Profil" className="w-full h-full object-cover"
                            onError={() => setProfileImage(null)} />
                        ) : (
                          <span className="text-white text-sm font-bold">{getInitials(user.nama_lengkap)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-white truncate leading-tight">{user.nama_lengkap}</p>
                        <p className="text-[11px] text-white/65 truncate mt-0.5">{user.email_sekolah}</p>
                        <span
                          className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide"
                          style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                        >
                          {user.role}
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
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fff0e5' }}>
                        <User className="w-3.5 h-3.5" style={{ color: '#e8690a' }} />
                      </div>
                      Profil Saya
                    </button>

                    {/* Ubah Password */}
                    <button
                      onClick={handleUbahPassword}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                      style={{ color: '#7a3a0a' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff0e5'; e.currentTarget.style.color = '#c95b08'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a3a0a'; }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fff0e5' }}>
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
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef2f2' }}>
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}