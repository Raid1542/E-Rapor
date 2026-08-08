/*
 * Nama File: Header.tsx
 * Fungsi: Komponen header untuk layout guru kelas dengan indikator tahun ajaran.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { LogOut, ChevronDown, User, Lock, X, FileText, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

/* Interface: Data pengguna untuk localStorage dan komponen header */
interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
    class?: string;
    profileImage?: string;
}

/* Interface: Informasi tahun ajaran aktif */
interface TahunAjaranInfo {
    tahun_ajaran: string;
    semester: string;
    status_pts: 'nonaktif' | 'aktif' | 'selesai';
    status_pas: 'nonaktif' | 'aktif' | 'selesai';
}

/* Interface: Props untuk komponen Header */
interface HeaderProps {
    user: UserData;
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
        @keyframes gk-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gk-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(0.625rem); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes gk-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes gk-shimmer { 0% { background-position: -12.5rem 0; } 100% { background-position: 12.5rem 0; } }
        
        .gk-fadeIn { animation: gk-fadeIn 0.2s ease; }
        .gk-scaleIn { animation: gk-scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .gk-pulse { animation: gk-pulse 0.6s ease 0.15s; }
        .gk-shimmer { 
            background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 100%);
            background-size: 200% 100%;
            animation: gk-shimmer 1.5s infinite;
        }

        /* Kilau bergerak di sepanjang bar header orange */
        .gk-bar-shimmer {
            position: absolute;
            top: -50%;
            left: -60%;
            width: 32%;
            height: 200%;
            background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%);
            transform: rotate(9deg);
            animation: gk-bar-shimmer-sweep 6s ease-in-out infinite;
            pointer-events: none;
            mix-blend-mode: soft-light;
        }
        @keyframes gk-bar-shimmer-sweep {
            0% { left: -60%; }
            45% { left: 130%; }
            100% { left: 130%; }
        }
        @media (prefers-reduced-motion: reduce) {
            .gk-bar-shimmer { animation: none; display: none; }
        }
    `}</style>
);

/* Komponen: Badge status untuk PTS/PAS */
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
                    border: '0.094rem solid rgba(201,91,8,0.3)',
                    boxShadow: '0 0.125rem 0.5rem rgba(0,0,0,0.1)'
                }}
            >
                <FileText size="0.6875rem" />
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
                    border: '0.0625rem solid rgba(255,255,255,0.3)',
                }}
            >
                <FileText size="0.6875rem" />
                <span className="hidden sm:inline">{jenis} (Selesai)</span>
                <span className="sm:hidden">{jenis}</span>
            </span>
        );
    }

    return null;
};

/* Komponen: Badge peringatan jenis penilaian belum aktif */
const JenisPenilaianBelumAktif = () => (
    <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap"
        style={{
            background: 'rgba(253, 230, 138, 0.95)',
            color: '#92400e',
            border: '0.094rem solid rgba(252, 211, 77, 0.5)',
            boxShadow: '0 0.125rem 0.5rem rgba(0,0,0,0.08)'
        }}
    >
        <AlertCircle size="0.6875rem" />
        <span className="hidden sm:inline">Jenis Penilaian Belum Aktif</span>
        <span className="sm:hidden">Belum Aktif</span>
    </span>
);

/* Komponen: Modal konfirmasi logout */
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
            style={{ border: '0.0625rem solid #fde0c8' }}
        >
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size="1.125rem" />
            </button>

            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 gk-pulse">
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
                    style={{ 
                        borderColor: '#fde0c8', 
                        color: '#7a3a0a', 
                        background: '#fff' 
                    }}
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

/* Komponen Utama: Header untuk Guru Kelas */
export default function Header({ user: initialUser }: HeaderProps) {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(initialUser || null);
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

        // Panggil fungsi sekali saat komponen pertama kali dimuat
        loadUserData();

        // Event listener sudah cukup untuk menangani pembaruan data secara real-time
        window.addEventListener('userDataUpdated', loadUserData);
        window.addEventListener('profileImageUpdated', loadUserData);

        // Cleanup function saat komponen di-unmount
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

                const res = await fetch(`${API_BASE_URL}/api/guru-kelas/tahun-ajaran/aktif`, {
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
            } catch (error) {
                console.error('Error fetch tahun ajaran:', error);
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

    /* Handler: Buka modal konfirmasi logout */
    const handleLogoutClick = () => { 
        setDropdownOpen(false); 
        setShowLogoutConfirm(true); 
    };

    /* Handler: Konfirmasi logout dan hapus sesi */
    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        router.push('/');
    };

    /* Handler: Batalkan logout */
    const handleLogoutCancel = () => {
        setShowLogoutConfirm(false);
    };

    /* Handler: Navigasi ke halaman profil */
    const handleProfile = () => { 
        setDropdownOpen(false); 
        router.push('/guru_kelas/profil'); 
    };

    /* Handler: Navigasi ke halaman ubah password */
    const handleUbahPassword = () => { 
        setDropdownOpen(false); 
        router.push('/guru_kelas/ubah_password'); 
    };

    /* Fungsi: Mendapatkan informasi jenis penilaian yang sedang aktif */
    const getActiveJenisPenilaian = (): { jenis: string; status: string } | null => {
        if (!tahunAjaranInfo) return null;

        if (tahunAjaranInfo.status_pts === 'aktif') return { jenis: 'PTS', status: 'aktif' };
        if (tahunAjaranInfo.status_pas === 'aktif') return { jenis: 'PAS', status: 'aktif' };
        if (tahunAjaranInfo.status_pts === 'selesai') return { jenis: 'PTS', status: 'selesai' };
        if (tahunAjaranInfo.status_pas === 'selesai') return { jenis: 'PAS', status: 'selesai' };

        return null;
    };

    const activeJenisInfo = getActiveJenisPenilaian();

    const isJenisPenilaianBelumAktif = tahunAjaranInfo
        && tahunAjaranInfo.status_pts === 'nonaktif'
        && tahunAjaranInfo.status_pas === 'nonaktif';

    /* Tampilan skeleton loading saat data user belum tersedia */
    if (!user) {
        return (
            <header className="border-b" style={{ borderColor: '#fde0c8' }}>
                <div className="px-6 py-3 flex justify-between items-center">
                    <div className="h-6 w-64 rounded-lg gk-shimmer" />
                    <div className="h-10 w-44 rounded-xl gk-shimmer" />
                </div>
            </header>
        );
    }

    /* Komponen Avatar untuk menampilkan foto atau inisial */
    const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
        const dim = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
        const text = size === 'md' ? 'text-sm' : 'text-xs';
        
        return (
            <div
                className={`${dim} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0`}
                style={{ 
                    background: 'rgba(255,255,255,0.35)', 
                    border: '0.125rem solid rgba(255,255,255,0.7)' 
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
                    <span className={`text-white font-bold ${text}`}>{getInitials(user.nama_lengkap)}</span>
                )}
            </div>
        );
    };

    /* Fungsi: Merender badge penilaian berdasarkan status */
    const renderPenilaianBadge = () => {
        if (activeJenisInfo) {
            return <StatusBadge jenis={activeJenisInfo.jenis} status={activeJenisInfo.status} />;
        }
        if (isJenisPenilaianBelumAktif) {
            return <JenisPenilaianBelumAktif />;
        }
        return null;
    };

    // Format role untuk ditampilkan
    const roleText = user.class 
        ? `Guru Kelas – ${user.class}` 
        : 'Guru Kelas';

    const roleBadgeText = user.class 
        ? `GURU KELAS – ${user.class.toUpperCase()}` 
        : 'GURU KELAS';

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
                    borderColor: 'rgba(255,255,255,0.15)',
                    position: 'relative',
                }}
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
                    <div className="gk-bar-shimmer" />
                </div>

                <div className="relative z-10 px-4 sm:px-6 py-3">
                    {/* Baris 1: Title + Info (Desktop: Inline) */}
                    <div className="flex items-center justify-between gap-4">

                        {/* Kiri: Title + Info */}
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

                        {/* Kanan: Profil dropdown */}
                        <div className="relative flex-shrink-0" ref={dropdownRef}>
                            {/* Tombol Pemicu Dropdown */}
                            <button
                                onClick={() => setDropdownOpen((v) => !v)}
                                className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/10"
                            >
                                <Avatar size="md" />
                                <div className="text-left hidden md:block">
                                    <p className="text-sm font-semibold text-white leading-tight drop-shadow-sm max-w-[9.375rem] truncate">
                                        {user.nama_lengkap}
                                    </p>
                                    <p className="text-xs text-white/80 leading-tight font-medium">
                                        {roleText}
                                    </p>
                                </div>
                                <ChevronDown
                                    className="w-4 h-4 text-white/80 transition-transform duration-200 hidden md:block"
                                    style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                />
                            </button>

                            {/* Panel Dropdown */}
                            {dropdownOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl z-50 overflow-hidden gk-scaleIn"
                                    style={{ 
                                        border: '0.0625rem solid #fde0c8', 
                                        boxShadow: '0 0.5rem 2rem rgba(180,70,10,0.18)' 
                                    }}
                                >
                                    {/* Info user */}
                                    <div className="p-5" style={{ background: 'linear-gradient(135deg, #fce8d6 0%, #fdd4b8 60%, #fbc9a8 100%)' }}>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                                                style={{ 
                                                    background: 'rgba(255,255,255,0.6)', 
                                                    border: '0.125rem solid rgba(255,255,255,0.8)' 
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
                                                    style={{
                                                        background: 'rgba(255,255,255,0.7)',
                                                        color: '#c95b08',
                                                        maxWidth: '100%'
                                                    }}
                                                >
                                                    {roleBadgeText}
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
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fff0e5' }}>
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

                    {/* Baris 2: Info (Mobile: Pindah ke bawah) */}
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