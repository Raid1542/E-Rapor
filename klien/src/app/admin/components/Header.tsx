/**
 * Nama File: Header.tsx
 * Update: Static title dengan indikator Tahun Ajaran Aktif
 */

'use client';

import { LogOut, ChevronDown, User, Lock, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface UserData {
  id: number;
  nama_lengkap: string;
  email_sekolah: string;
  role: string;
  profileImage?: string;
}

interface TahunAjaranInfo {
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
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
    @keyframes hd-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .hd-fadeIn  { animation: hd-fadeIn  0.2s ease; }
    .hd-scaleIn { animation: hd-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .hd-pulse   { animation: hd-pulse   0.6s ease 0.15s; }
    .hd-shimmer { 
      background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 100%);
      background-size: 200% 100%;
      animation: hd-shimmer 1.5s infinite;
    }
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

      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 hd-pulse">
        <LogOut size={32} style={{ color: '#e8690a' }} />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Logout</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">
          Apakah Anda yakin ingin keluar dari sistem?<br />
          Sesi Anda akan diakhiri.
        </p>
      </div>

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

  const [tahunAjaranInfo, setTahunAjaranInfo] = useState<TahunAjaranInfo | null>(null);
  const [taLoading, setTaLoading] = useState(true);

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

  // ── Load Tahun Ajaran Aktif ─────────────────────────────────────────────
  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setTaLoading(false);
          return;
        }

        const res = await fetch('http://localhost:5000/api/admin/semester-list', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.data)) {
          const aktif = data.data.find((s: any) => s.is_aktif);
          if (aktif) {
            setTahunAjaranInfo({
              tahun_ajaran: aktif.tahun_ajaran || aktif.tahun_ajaran_induk || '-',
              semester: aktif.semester || '-',
              is_aktif: true
            });
          } else {
            setTahunAjaranInfo(null);
          }
        }
      } catch (err) {
        console.error('Gagal memuat tahun ajaran:', err);
      } finally {
        setTaLoading(false);
      }
    };

    fetchTahunAjaran();

    const interval = setInterval(fetchTahunAjaran, 5 * 60 * 1000);
    const handleRefresh = () => fetchTahunAjaran();
    window.addEventListener('tahunAjaranUpdated', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tahunAjaranUpdated', handleRefresh);
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

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    router.push('/login');
  };

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

  const handleTahunAjaranClick = () => {
    router.push('/admin/data_tahun_ajaran');
  };

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <header className="border-b" style={{ borderColor: '#fde0c8' }}>
        <div className="px-6 py-3 flex justify-between items-center"
          style={{ background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-64 rounded-xl hd-shimmer" />
          </div>
          <div className="h-10 w-44 rounded-xl hd-shimmer" />
        </div>
      </header>
    );
  }

  // Build static header title
  const headerTitle = tahunAjaranInfo 
    ? `E-Rapor SDIT Ulil Albab | ${tahunAjaranInfo.tahun_ajaran} - ${tahunAjaranInfo.semester}`
    : 'E-Rapor SDIT Ulil Albab';

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

      {showLogoutConfirm && (
        <ConfirmLogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
        />
      )}

      <header
        className="border-b sticky top-0 z-40"
        style={{
          background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">

          {/* ── KIRI: Static Title + Indikator TA ── */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight truncate">
              {headerTitle}
            </h1>

            {/* Indikator jika belum ada TA aktif */}
            {!taLoading && !tahunAjaranInfo && (
              <button
                onClick={handleTahunAjaranClick}
                className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all animate-pulse"
                style={{ 
                  background: 'rgba(239,68,68,0.3)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  color: '#fff'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.3)')}
                title="Klik untuk mengatur Tahun Ajaran"
              >
                <AlertCircle className="w-3 h-3" />
                Belum Ada TA Aktif
              </button>
            )}
          </div>

          {/* ── KANAN: Profil Dropdown ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
                  <p className="text-xs font-bold text-white leading-tight drop-shadow-sm max-w-[120px] truncate">
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

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden hd-scaleIn"
                  style={{ border: '1px solid #fde0c8', boxShadow: '0 8px 32px rgba(180,70,10,0.18)' }}
                >
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

                  <div className="p-2">
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

                    <button
                      onClick={handleLogoutClick}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                      style={{ color: '#dc2626' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className=" rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef2f2' }}>
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