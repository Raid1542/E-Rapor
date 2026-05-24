/**
 * Nama File: Header.tsx
 * Fungsi: Komponen header untuk halaman admin.
 *         Menampilkan judul halaman dan dropdown profil pengguna dengan foto,
 *         nama, role, serta opsi menu Profil, Ubah Kata Sandi, dan Logout.
 *         Mendukung deteksi klik di luar dropdown untuk menutupnya secara otomatis.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan Sidebar
 */

'use client';

import { LogOut, ChevronDown, User, Lock } from 'lucide-react';
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

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  // ── Close on outside click ────────────────────────────────────────────────
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
  const handleLogout = () => {
    setDropdownOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    router.push('/login');
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

  // ── Avatar component (reused in button + dropdown) ────────────────────────
  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const dim = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    const text = size === 'md' ? 'text-sm' : 'text-xs';
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`}
        style={{
          background: 'rgba(255,255,255,0.35)',
          border: '2px solid rgba(255,255,255,0.7)',
        }}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt="Foto Profil"
            className="w-full h-full object-cover"
            onError={() => setProfileImage(null)}
          />
        ) : (
          <span className={`text-white font-bold ${text}`}>
            {getInitials(user.nama_lengkap)}
          </span>
        )}
      </div>
    );
  };

  return (
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
          {/* Garis aksen kiri */}
          <div
            className="w-1 h-7 rounded-full"
            style={{ background: 'rgba(255,255,255,0.5)' }}
          />
          <h1 className="text-lg font-bold text-white tracking-tight">
            Dashboard Admin
          </h1>
        </div>

        {/* ── Kanan: profil ── */}
        <div className="flex items-center gap-2">

          {/* ── Profil button + dropdown ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all duration-150"
              style={{
                background: dropdownOpen
                  ? 'rgba(255,255,255,0.45)'
                  : 'rgba(255,255,255,0.30)',
                border: '1.5px solid rgba(255,255,255,0.6)',
              }}
              onMouseEnter={(e) => {
                if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.40)';
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.30)';
              }}
            >
              <Avatar size="sm" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight drop-shadow-sm">
                  {user.nama_lengkap}
                </p>
                <p className="text-[10px] text-white/90 leading-tight capitalize font-medium">
                  {user.role}
                </p>
              </div>
              <ChevronDown
                className="w-3.5 h-3.5 text-white transition-transform duration-200"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* ── Dropdown panel ── */}
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{
                  border: '1px solid #fde0c8',
                  boxShadow: '0 8px 32px rgba(180,70,10,0.18)',
                }}
              >
                {/* Info user */}
                <div
                  className="p-4"
                  style={{
                    background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{
                        background: 'rgba(255,255,255,0.22)',
                        border: '2px solid rgba(255,255,255,0.4)',
                      }}
                    >
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Foto Profil"
                          className="w-full h-full object-cover"
                          onError={() => setProfileImage(null)}
                        />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {getInitials(user.nama_lengkap)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate leading-tight">
                        {user.nama_lengkap}
                      </p>
                      <p className="text-[11px] text-white/65 truncate mt-0.5">
                        {user.email_sekolah}
                      </p>
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
                  <button
                    onClick={handleProfile}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: '#7a3a0a' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff0e5';
                      e.currentTarget.style.color = '#c95b08';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#7a3a0a';
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fff0e5' }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: '#e8690a' }} />
                    </div>
                    Profil Saya
                  </button>

                  <button
                    onClick={handleUbahPassword}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: '#7a3a0a' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff0e5';
                      e.currentTarget.style.color = '#c95b08';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#7a3a0a';
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fff0e5' }}
                    >
                      <Lock className="w-3.5 h-3.5" style={{ color: '#e8690a' }} />
                    </div>
                    Ubah Kata Sandi
                  </button>

                  <div className="my-1.5 border-t" style={{ borderColor: '#fde0c8' }} />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: '#dc2626' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fef2f2' }}
                    >
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
  );
}