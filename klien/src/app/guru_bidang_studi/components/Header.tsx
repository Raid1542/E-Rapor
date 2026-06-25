'use client';

import { LogOut, ChevronDown, User, Lock, X, FileText, AlertCircle } from 'lucide-react';
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
    status_pts: 'nonaktif' | 'aktif' | 'selesai';
    status_pas: 'nonaktif' | 'aktif' | 'selesai';
}

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .slice(0, 2)
        .map(word => word[0]?.toUpperCase() || '')
        .join('');
};

// ✅ BARU: Helper untuk format role: "guru_bidang_studi" → "GURU BIDANG STUDI"
const formatRole = (role: string): string => {
    if (!role) return '';
    return role
        .replace(/_/g, ' ')  // Ganti underscore dengan spasi
        .toUpperCase();       // Kapital semua
};

// ─── GLOBAL STYLES ─────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes gbs-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gbs-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes gbs-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes gbs-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .gbs-fadeIn  { animation: gbs-fadeIn  0.2s ease; }
        .gbs-scaleIn { animation: gbs-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .gbs-pulse   { animation: gbs-pulse   0.6s ease 0.15s; }
        .gbs-shimmer { 
            background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 100%);
            background-size: 200% 100%;
            animation: gbs-shimmer 1.5s infinite;
        }
    `}</style>
);

// ─── STATUS BADGE (untuk PTS/PAS Aktif atau Selesai) ────────────────────────

const StatusBadge = ({ jenis, status }: { jenis: string; status: string }) => {
    const isActive = status === 'aktif';
    const isSelesai = status === 'selesai';

    if (isActive) {
        return (
            <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap"
                style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: '#c95b08',
                    border: '1.5px solid rgba(201,91,8,0.3)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
            >
                <FileText size={11} />
                <span className="hidden sm:inline">{jenis} (Aktif)</span>
                <span className="sm:hidden">{jenis}</span>
            </span>
        );
    }

    if (isSelesai) {
        return (
            <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap"
                style={{
                    background: 'rgba(255,255,255,0.4)',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.3)',
                }}
            >
                <FileText size={11} />
                <span className="hidden sm:inline">{jenis} (Selesai)</span>
                <span className="sm:hidden">{jenis}</span>
            </span>
        );
    }

    return null;
};

// ─── BADGE "JENIS PENILAIAN BELUM AKTIF" ────────────────────────────────────

const JenisPenilaianBelumAktif = () => (
    <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap"
        style={{
            background: 'rgba(253, 230, 138, 0.95)',
            color: '#92400e',
            border: '1.5px solid rgba(252, 211, 77, 0.5)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
    >
        <AlertCircle size={11} />
        <span className="hidden sm:inline">Jenis Penilaian Belum Aktif</span>
        <span className="sm:hidden">Belum Aktif</span>
    </span>
);

// ─── CONFIRM LOGOUT MODAL ───────────────────────────────────────────────────

const ConfirmLogoutModal = ({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 gbs-fadeIn">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 gbs-scaleIn"
            style={{ border: '1px solid #fde0c8' }}
        >
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 gbs-pulse">
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

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [tahunAjaranInfo, setTahunAjaranInfo] = useState<TahunAjaranInfo | null>(null);
    const [taLoading, setTaLoading] = useState(true);

    // ── Load user data ──────────────────────────────────────────────────────
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

                const res = await fetch('http://localhost:5000/api/guru-bidang-studi/tahun-ajaran/aktif', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = await res.json();

                if (res.ok && data.success && data.data) {
                    const taData = data.data;

                    setTahunAjaranInfo({
                        tahun_ajaran: taData.tahun_ajaran || taData.tahun_ajaran_induk || '-',
                        semester: taData.semester || '-',
                        status_pts: taData.status_pts || 'nonaktif',
                        status_pas: taData.status_pas || 'nonaktif'
                    });
                } else {
                    console.warn('Tidak ada TA aktif atau response tidak valid:', data);
                    setTahunAjaranInfo(null);
                }
            } catch (err) {
                console.error('Error fetch tahun ajaran:', err);
                setTahunAjaranInfo(null);
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

    // ── Tutup dropdown saat klik di luar ───────────────────────────────────
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────
    const handleLogoutClick = () => { setDropdownOpen(false); setShowLogoutConfirm(true); };
    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        router.push('/login');
    };
    const handleLogoutCancel = () => setShowLogoutConfirm(false);
    const handleProfile = () => { setDropdownOpen(false); router.push('/guru_bidang_studi/profil'); };
    const handleUbahPassword = () => { setDropdownOpen(false); router.push('/guru_bidang_studi/ubah_password'); };

    // ✅ LOGIKA: Tentukan jenis penilaian yang ditampilkan
    const getActiveJenisPenilaian = (): { jenis: string; status: string } | null => {
        if (!tahunAjaranInfo) return null;

        if (tahunAjaranInfo.status_pts === 'aktif') {
            return { jenis: 'PTS', status: 'aktif' };
        }
        if (tahunAjaranInfo.status_pas === 'aktif') {
            return { jenis: 'PAS', status: 'aktif' };
        }
        if (tahunAjaranInfo.status_pts === 'selesai') {
            return { jenis: 'PTS', status: 'selesai' };
        }
        if (tahunAjaranInfo.status_pas === 'selesai') {
            return { jenis: 'PAS', status: 'selesai' };
        }

        return null;
    };

    const activeJenisInfo = getActiveJenisPenilaian();

    const isJenisPenilaianBelumAktif = tahunAjaranInfo 
        && tahunAjaranInfo.status_pts === 'nonaktif' 
        && tahunAjaranInfo.status_pas === 'nonaktif';

    // ── Skeleton ───────────────────────────────────────────────────────────
    if (!user) {
        return (
            <header className="border-b" style={{ borderColor: '#fde0c8' }}>
                <div className="px-6 py-3 flex justify-between items-center">
                    <div className="h-6 w-64 rounded-lg gbs-shimmer" />
                    <div className="h-10 w-44 rounded-xl gbs-shimmer" />
                </div>
            </header>
        );
    }

    // ── Avatar ─────────────────────────────────────────────────────────────
    const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
        const dim = size === 'md' ? 'w-11 h-11' : 'w-8 h-8';
        const text = size === 'md' ? 'text-sm' : 'text-xs';
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

    // ✅ Helper untuk render badge status penilaian
    const renderPenilaianBadge = () => {
        if (activeJenisInfo) {
            return <StatusBadge jenis={activeJenisInfo.jenis} status={activeJenisInfo.status} />;
        }
        if (isJenisPenilaianBelumAktif) {
            return <JenisPenilaianBelumAktif />;
        }
        return null;
    };

    return (
        <>
            <GlobalStyles />

            {showLogoutConfirm && (
                <ConfirmLogoutModal onConfirm={handleLogoutConfirm} onCancel={handleLogoutCancel} />
            )}

            <header
                className="border-b sticky top-0 z-40"
                style={{
                    background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
                    borderColor: 'rgba(255,255,255,0.15)',
                }}
            >
                <div className="px-4 sm:px-6 py-3">
                    {/* ── BARIS 1: Title + Info (Desktop: Inline) ── */}
                    <div className="flex items-center justify-between gap-4">

                        {/* KIRI: Title + Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex-shrink-0">
                                E-Rapor SDIT Ulil Albab
                            </h1>

                            <div className="hidden lg:flex items-center gap-2 lg:gap-3 ml-2 lg:ml-4">
                                {tahunAjaranInfo && (
                                    <>
                                        <span className="text-xs lg:text-sm font-semibold text-white whitespace-nowrap">
                                            {tahunAjaranInfo.tahun_ajaran} - {tahunAjaranInfo.semester}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>•</span>
                                        {renderPenilaianBadge()}
                                    </>
                                )}
                                {taLoading && (
                                    <span className="text-xs text-white/70">Memuat...</span>
                                )}
                            </div>
                        </div>

                        {/* KANAN: Profil dropdown */}
                        <div className="relative flex-shrink-0" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(v => !v)}
                                className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1.5 rounded-xl transition-all duration-150"
                                style={{
                                    background: dropdownOpen ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.30)',
                                    border: '1.5px solid rgba(255,255,255,0.6)',
                                }}
                                onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.40)'; }}
                                onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.30)'; }}
                            >
                                <Avatar size="sm" />
                                <div className="text-left hidden md:block">
                                    <p className="text-xs font-bold text-white leading-tight drop-shadow-sm max-w-[120px] truncate">{user.nama_lengkap}</p>
                                    {/* ✅ FIXED: Gunakan formatRole */}
                                    <p className="text-[10px] text-white/90 leading-tight font-medium">{formatRole(user.role)}</p>
                                </div>
                                <ChevronDown
                                    className="w-3.5 h-3.5 text-white transition-transform duration-200 hidden md:block"
                                    style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                />
                            </button>

                            {/* Dropdown panel */}
                            {dropdownOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden gbs-scaleIn"
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
                                                {/* ✅ FIXED: Gunakan formatRole */}
                                                <span
                                                    className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full tracking-wide"
                                                    style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                                                >
                                                    {formatRole(user.role)}
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

                    {/* ── BARIS 2: Info (Mobile: Pindah ke bawah) ── */}
                    <div className="lg:hidden flex items-center gap-2 mt-2">
                        {tahunAjaranInfo && (
                            <>
                                <span className="text-xs font-semibold text-white whitespace-nowrap">
                                    {tahunAjaranInfo.tahun_ajaran} - {tahunAjaranInfo.semester}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>•</span>
                                {renderPenilaianBadge()}
                            </>
                        )}
                        {taLoading && (
                            <span className="text-xs text-white/70">Memuat...</span>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}