/*
 * Nama File: Header.tsx
 * Fungsi: Komponen header untuk layout admin dengan indikator tahun ajaran.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { LogOut, ChevronDown, User, Lock, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

/* Interface: Data pengguna untuk localStorage dan komponen header */
interface UserData {
  id: number;
  nama_lengkap: string;
  email_sekolah: string;
  role: string;
  profileImage?: string;
}

/* Interface: Informasi tahun ajaran aktif */
interface TahunAjaranInfo {
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

/* Konstanta: URL dasar API */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* Fungsi: Mengambil inisial dari nama lengkap */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || '')
    .join('');
};

/* Komponen: Menyuntikkan animasi global untuk header */
const GlobalStyles = () => (
  <style jsx global>{`
        @keyframes hd-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hd-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(0.625rem); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes hd-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes hd-shimmer { 0% { background-position: -12.5rem 0; } 100% { background-position: 12.5rem 0; } }
        
        .hd-fadeIn { animation: hd-fadeIn 0.2s ease; }
        .hd-scaleIn { animation: hd-scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .hd-pulse { animation: hd-pulse 0.6s ease 0.15s; }
        .hd-shimmer { 
            background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 100%);
            background-size: 200% 100%;
            animation: hd-shimmer 1.5s infinite;
        }

        .hd-bar-shimmer {
            position: absolute;
            top: -50%;
            left: -60%;
            width: 32%;
            height: 200%;
            background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
            transform: rotate(9deg);
            animation: hd-bar-shimmer-sweep 6s ease-in-out infinite;
            pointer-events: none;
            mix-blend-mode: soft-light;
        }
        @keyframes hd-bar-shimmer-sweep {
            0% { left: -60%; }
            45% { left: 130%; }
            100% { left: 130%; }
        }
        @media (prefers-reduced-motion: reduce) {
            .hd-bar-shimmer { animation: none; display: none; }
        }
    `}</style>
);

/* Komponen: Modal konfirmasi logout */
const ConfirmLogoutModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 hd-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div
      className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 hd-scaleIn"
      style={{ border: '0.0625rem solid #fde0c8' }}
    >
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size="1.125rem" />
      </button>

      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 hd-pulse">
        <LogOut size="2rem" style={{ color: '#e8690a' }} />
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Logout</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">
          Apakah Anda yakin ingin keluar dari sistem?
          <br />
          Sesi Anda akan diakhiri.
        </p>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fff0e5')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg, #e8690a, #f5a623)',
            boxShadow: '0 0.1875rem 0.75rem rgba(232,105,10,0.3)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #c95b08, #e8690a)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #e8690a, #f5a623)')}
        >
          Ya
        </button>
      </div>
    </div>
  </div>
);

/* Komponen Utama: Header untuk Admin */
export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [tahunAjaranInfo, setTahunAjaranInfo] = useState<TahunAjaranInfo | null>(null);
  const [taLoading, setTaLoading] = useState<boolean>(true);

  /* Muat data pengguna dari localStorage */
  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const userData: UserData = JSON.parse(storedUser);
          setUser(userData);
          if (userData.profileImage) {
            const imgUrl = userData.profileImage.startsWith('/')
              ? `${API_BASE_URL}${userData.profileImage}`
              : `${API_BASE_URL}/${userData.profileImage}`;
            setProfileImage(imgUrl);
          } else {
            setProfileImage(null);
          }
        } else {
          setUser(null);
          setProfileImage(null);
        }
      } catch (error) {
        console.error('Gagal memuat data user:', error);
        setUser(null);
        setProfileImage(null);
      }
    };

    loadUserData();
    window.addEventListener('userDataUpdated', loadUserData);
    window.addEventListener('profileImageUpdated', loadUserData);

    return () => {
      window.removeEventListener('userDataUpdated', loadUserData);
      window.removeEventListener('profileImageUpdated', loadUserData);
    };
  }, []);

  /* Muat informasi tahun ajaran aktif dari API */
  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setTaLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/admin/semester-list`, {
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
      } catch (error) {
        console.error('Gagal memuat tahun ajaran:', error);
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

  /* Tutup dropdown saat klik di luar area */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleLogoutCancel = () => setShowLogoutConfirm(false);
  const handleProfile = () => { setDropdownOpen(false); router.push('/admin/profil'); };
  const handleUbahPassword = () => { setDropdownOpen(false); router.push('/admin/ubah_password'); };
  const handleTahunAjaranClick = () => { router.push('/admin/data_tahun_ajaran'); };

  /* Tampilan skeleton loading */
  if (!user) {
    return (
      <header className="border-b" style={{ borderColor: '#fde0c8' }}>
        <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="h-6 w-48 sm:w-64 rounded-lg hd-shimmer" />
          <div className="h-10 w-32 sm:w-44 rounded-xl hd-shimmer" />
        </div>
      </header>
    );
  }

  const headerTitle = tahunAjaranInfo
    ? `E-Rapor SDIT Ulil Albab | ${tahunAjaranInfo.tahun_ajaran} - ${tahunAjaranInfo.semester}`
    : 'E-Rapor SDIT Ulil Albab';

  /* Komponen Avatar */
  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const dim = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    const text = size === 'md' ? 'text-sm' : 'text-xs';

    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`}
        style={{ background: 'rgba(255,255,255,0.35)', border: '0.125rem solid rgba(255,255,255,0.7)' }}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt="Foto Profil"
            className="w-full h-full object-cover"
            onError={() => setProfileImage(null)}
          />
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
        style={{ borderColor: 'rgba(255,255,255,0.15)', position: 'relative' }}
      >
        {/* Lapisan background orange + kilau bergerak */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
          <div className="hd-bar-shimmer" />
        </div>

        {/* Konten Header */}
        <div className="relative z-10 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* Kiri: Judul + Tahun Ajaran (Satu baris) */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {headerTitle}
              </h1>
            </div>

            {/* Kanan: Dropdown Profil */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/10"
              >
                <Avatar size="md" />

                {/* Nama & Role: Sembunyi di mobile, muncul di sm+ */}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-white leading-tight drop-shadow-sm max-w-[120px] lg:max-w-[150px] truncate">
                    {user.nama_lengkap}
                  </p>
                  <p className="text-xs text-white/80 leading-tight font-medium capitalize">
                    {user.role}
                  </p>
                </div>

                <ChevronDown
                  className="w-4 h-4 text-white/80 transition-transform duration-200 flex-shrink-0"
                  style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Panel Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden hd-scaleIn"
                  style={{
                    border: '0.0625rem solid #fde0c8',
                    boxShadow: '0 0.5rem 2rem rgba(180,70,10,0.18)'
                  }}
                >
                  <div className="p-5" style={{ background: 'linear-gradient(135deg, #fce8d6 0%, #fdd4b8 60%, #fbc9a8 100%)' }}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.6)', border: '0.125rem solid rgba(255,255,255,0.8)' }}
                      >
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Foto Profil"
                            className="w-full h-full object-cover"
                            onError={() => setProfileImage(null)}
                          />
                        ) : (
                          <span className="text-orange-700 text-base font-bold">
                            {getInitials(user.nama_lengkap)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base text-orange-900 truncate leading-tight">
                          {user.nama_lengkap}
                        </p>
                        <p className="text-sm text-orange-700/80 truncate mt-1">
                          {user.email_sekolah}
                        </p>
                        <span
                          className="inline-flex items-center justify-center mt-2 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide whitespace-nowrap"
                          style={{ background: 'rgba(255,255,255,0.7)', color: '#c95b08', maxWidth: '100%' }}
                        >
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={handleProfile}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                      style={{ color: '#7a3a0a' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fff0e5'; e.currentTarget.style.color = '#c95b08'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a3a0a'; }}
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
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fff0e5'; e.currentTarget.style.color = '#c95b08'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a3a0a'; }}
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
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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