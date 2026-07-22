/*
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk guru bidang studi dengan UI yang disesuaikan.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Home,
    Edit,
    Settings,
    UserCircle,
    X,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

/* Konstanta: URL dasar API */
const API_BASE_URL = 'http://localhost:5000';

/* Komponen: Menyuntikkan animasi global untuk sidebar */
const SidebarStyles = () => (
    <style jsx global>{`
        @keyframes sb-slideDown {
            from {
                opacity: 0;
                transform: translateY(-0.5rem);
                max-height: 0;
            }
            to {
                opacity: 1;
                transform: translateY(0);
                max-height: 31.25rem;
            }
        }
        @keyframes sb-fadeIn {
            from { opacity: 0; transform: translateX(-0.25rem); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sb-badgePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .sb-slideDown { animation: sb-slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .sb-fadeIn { animation: sb-fadeIn 0.25s ease-out; }
        .sb-badgePulse { animation: sb-badgePulse 2s ease-in-out infinite; }

        .sb-nav-item {
            position: relative;
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sb-nav-item:hover:not(:disabled) {
            transform: translateX(0.1875rem);
        }

        /* Aksen bar kecil di sisi kiri item yang aktif */
        .sb-nav-item.sb-active::before {
            content: '';
            position: absolute;
            left: -0.75rem;
            top: 50%;
            transform: translateY(-50%);
            width: 0.25rem;
            height: 1.375rem;
            border-radius: 0 0.25rem 0.25rem 0;
            background: #fff;
            box-shadow: 0 0 0.5rem rgba(255, 255, 255, 0.6);
        }

        /* Wadah ikon: badge bulat/kotak lembut */
        .sb-icon-wrap {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background 0.22s ease, box-shadow 0.22s ease;
        }
        .sb-icon-wrap.sb-icon-active {
            background: linear-gradient(135deg, #c95b08, #f5870a);
            box-shadow: 0 0.1875rem 0.625rem rgba(180, 70, 10, 0.28);
            color: #fff;
        }
        .sb-icon-wrap.sb-icon-inactive {
            background: rgba(255, 255, 255, 0.10);
            color: rgba(255, 255, 255, 0.9);
        }
        .sb-nav-item:hover:not(:disabled) .sb-icon-wrap.sb-icon-inactive {
            background: rgba(255, 255, 255, 0.18);
        }

        .sb-chevron {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sb-chevron-open {
            transform: rotate(180deg);
        }

        /* Label seksi dengan garis pemisah tipis */
        .sb-section-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .sb-section-label::after {
            content: '';
            flex: 1;
            height: 0.0625rem;
            background: linear-gradient(to right, rgba(255, 255, 255, 0.18), transparent);
        }

        .sb-scrollbar-none::-webkit-scrollbar { display: none; }
        .sb-scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
);

/* Komponen Utama: Sidebar navigasi untuk Guru Bidang Studi */
export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
    const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');

    /* Ambil data sekolah (logo dan nama) dari API */
    const fetchSchoolData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const res = await fetch(`${API_BASE_URL}/api/sekolah`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (res.ok) {
                const { data } = await res.json();
                if (data) {
                    if (data.logo_path) {
                        setLogoUrl(`${API_BASE_URL}${data.logo_path}?t=${Date.now()}`);
                    }
                    if (data.nama_sekolah) {
                        setSchoolName(data.nama_sekolah);
                    }
                }
            }
        } catch (error) {
            console.warn('Gagal fetch data sekolah di sidebar guru bidang studi', error);
        }
    };

    // Setup event listeners untuk update data secara real-time
    useEffect(() => {
        fetchSchoolData();
        
        const handleLogoUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const logoPath = customEvent.detail?.logoPath;
            if (logoPath) {
                setLogoUrl(`${API_BASE_URL}${logoPath}?t=${Date.now()}`);
            } else {
                fetchSchoolData();
            }
        };

        window.addEventListener('logoUpdated', handleLogoUpdate);
        window.addEventListener('schoolUpdated', fetchSchoolData);

        return () => {
            window.removeEventListener('logoUpdated', handleLogoUpdate);
            window.removeEventListener('schoolUpdated', fetchSchoolData);
        };
    }, []);

    /* Handler: Toggle ekspansi sidebar */
    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    /* Handler: Navigasi ke URL tertentu */
    const handleNavigation = (url: string) => {
        router.push(url);
    };

    // Konstanta style untuk item navigasi
    const navBase = 'sb-nav-item w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-sm font-medium';
    const navActive = 'sb-active bg-white text-orange-600 shadow-sm font-semibold';
    const navInactive = 'text-white hover:bg-white/15 hover:text-white';

    // Data menu navigasi
    const menuItems = [
        { name: 'Dashboard', url: '/guru_bidang_studi/dashboard', icon: Home },
        { name: 'Atur Penilaian', url: '/guru_bidang_studi/atur_penilaian', icon: Settings },
        { name: 'Input Nilai', url: '/guru_bidang_studi/input_nilai', icon: Edit },
        { name: 'Profil', url: '/guru_bidang_studi/profil', icon: UserCircle },
    ];

    return (
        <div
            className={`flex flex-col h-screen transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}
            style={{
                background: 'linear-gradient(175deg, #9a3a08 0%, #c95b08 40%, #e8690a 75%, #f5870a 100%)',
            }}
        >
            <SidebarStyles />

            {/* Header Sidebar: Logo + Nama Sekolah */}
            <div
                className="flex items-center justify-between px-3 py-4"
                style={{ borderBottom: '0.0625rem solid rgba(255,255,255,0.15)' }}
            >
                {isExpanded ? (
                    <>
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110 hover:rotate-6"
                                style={{ 
                                    background: 'rgba(255,255,255,0.18)', 
                                    boxShadow: '0 0 0 0.1875rem rgba(255,255,255,0.08)' 
                                }}
                            >
                                <img
                                    src={logoUrl}
                                    alt="Logo Sekolah"
                                    className="w-10 h-10 object-contain"
                                    onError={() => setLogoUrl('/images/LogoUA.jpg')}
                                />
                            </div>
                            <div className="min-w-0 sb-fadeIn">
                                <h2 className="text-sm font-bold text-white leading-tight truncate">{schoolName}</h2>
                                <p className="text-[11px] text-white/60 leading-tight tracking-wide uppercase mt-0.5">E-Rapor</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleSidebar}
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:rotate-90"
                            style={{ background: 'rgba(255,255,255,0.12)' }}
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={toggleSidebar}
                        className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-110"
                        style={{ 
                            background: 'rgba(255,255,255,0.15)', 
                            boxShadow: '0 0 0 0.1875rem rgba(255,255,255,0.08)' 
                        }}
                    >
                        <img
                            src={logoUrl}
                            alt="Logo Sekolah"
                            className="w-10 h-10 object-contain"
                            onError={() => setLogoUrl('/images/LogoUA.jpg')}
                        />
                    </button>
                )}
            </div>

            {/* Area Navigasi */}
            <div className="flex-1 overflow-y-auto px-2 py-4 sb-scrollbar-none">
                {/* Dashboard */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/dashboard')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/dashboard' ? navActive : navInactive}`}
                >
                    <span className={`sb-icon-wrap ${pathname === '/guru_bidang_studi/dashboard' ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <Home className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Dashboard</span>}
                </button>

                {/* Label Menu Utama */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Menu Utama
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Atur Penilaian */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/atur_penilaian')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/atur_penilaian' ? navActive : navInactive}`}
                >
                    <span className={`sb-icon-wrap ${pathname === '/guru_bidang_studi/atur_penilaian' ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <Settings className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Atur Penilaian</span>}
                </button>

                {/* Input Nilai */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/input_nilai')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/input_nilai' ? navActive : navInactive}`}
                >
                    <span className={`sb-icon-wrap ${pathname === '/guru_bidang_studi/input_nilai' ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <Edit className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Input Nilai</span>}
                </button>

                {/* Label Saya */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Saya
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Profil */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/profil')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/profil' ? navActive : navInactive}`}
                >
                    <span className={`sb-icon-wrap ${pathname === '/guru_bidang_studi/profil' ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <UserCircle className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Profil</span>}
                </button>
            </div>
        </div>
    );
}