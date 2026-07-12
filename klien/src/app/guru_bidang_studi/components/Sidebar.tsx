/**
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk guru bidang studi.
 *         UI Template disesuaikan dengan sidebar admin
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

// ─── GLOBAL STYLES (Animasi Playful - SAMA DENGAN ADMIN) ────────────────────
const SidebarStyles = () => (
    <style jsx global>{`
        @keyframes sb_slideDown {
            from {
                opacity: 0;
                transform: translateY(-8px);
                max-height: 0;
            }
            to {
                opacity: 1;
                transform: translateY(0);
                max-height: 500px;
            }
        }
        @keyframes sb_fadeIn {
            from { opacity: 0; transform: translateX(-4px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sb_badgePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .sb-slideDown { animation: sb_slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .sb-fadeIn { animation: sb_fadeIn 0.25s ease-out; }
        .sb-badgePulse { animation: sb_badgePulse 2s ease-in-out infinite; }
        .sb-nav-item {
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sb-nav-item:hover:not(:disabled) {
            transform: translateX(3px);
        }
        .sb-chevron {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sb-chevron-open {
            transform: rotate(180deg);
        }
        .sb-scrollbar-none::-webkit-scrollbar { display: none; }
        .sb-scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
);

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(true);

    const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
    const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');

    const fetchSchoolData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('http://localhost:5000/api/sekolah', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const { data } = await res.json();
                if (data) {
                    if (data.logo_path) setLogoUrl(`http://localhost:5000${data.logo_path}?t=${Date.now()}`);
                    if (data.nama_sekolah) setSchoolName(data.nama_sekolah);
                }
            }
        } catch (err) {
            console.warn('Gagal fetch data sekolah di sidebar guru bidang studi', err);
        }
    };

    useEffect(() => {
        fetchSchoolData();
        
        const handleLogoUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const logoPath = customEvent.detail?.logoPath;
            if (logoPath) setLogoUrl(`http://localhost:5000${logoPath}?t=${Date.now()}`);
            else fetchSchoolData();
        };

        window.addEventListener('logoUpdated', handleLogoUpdate);
        window.addEventListener('schoolUpdated', fetchSchoolData);

        return () => {
            window.removeEventListener('logoUpdated', handleLogoUpdate);
            window.removeEventListener('schoolUpdated', fetchSchoolData);
        };
    }, []);

    const toggleSidebar = () => setIsExpanded(!isExpanded);
    const handleNavigation = (url: string) => router.push(url);

    // ── Reusable nav item styles (SAMA DENGAN ADMIN) ───────────────────────
    const navBase =
        'sb-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium';
    const navActive =
        'bg-white text-orange-600 shadow-sm font-semibold';
    const navInactive =
        'text-white hover:bg-white/15 hover:text-white';

    // ── Navigation Items ────────────────────────────────────────────────────
    const menuItems = [
        { name: 'Dashboard', url: '/guru_bidang_studi/dashboard', icon: Home },
        { name: 'Atur Penilaian', url: '/guru_bidang_studi/atur_penilaian', icon: Settings },
        { name: 'Input Nilai', url: '/guru_bidang_studi/input_nilai', icon: Edit },
        { name: 'Profil', url: '/guru_bidang_studi/profil', icon: UserCircle },
    ];

    return (
        <div
            className={`flex flex-col h-screen transition-all duration-300 ${isExpanded ? 'w-64' : 'w-[72px]'}`}
            style={{
                background: 'linear-gradient(175deg, #9a3a08 0%, #c95b08 40%, #e8690a 75%, #f5870a 100%)',
            }}
        >
            <SidebarStyles />

            {/* ── Header: Logo + Nama Sekolah (SAMA DENGAN ADMIN) ─────────── */}
            <div
                className="flex items-center justify-between px-4 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
            >
                {isExpanded ? (
                    <>
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110 hover:rotate-6"
                                style={{ background: 'rgba(255,255,255,0.18)' }}
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
                                <p className="text-xs text-white/60 leading-tight">E-Rapor</p>
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
                        style={{ background: 'rgba(255,255,255,0.15)' }}
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

            {/* ── Navigation (SAMA DENGAN ADMIN) ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-3 py-4 sb-scrollbar-none">

                {/* Dashboard */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/dashboard')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/dashboard' ? navActive : navInactive}`}
                >
                    <Home className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Dashboard</span>}
                </button>

                {/* ── MENU UTAMA label (SAMA DENGAN ADMIN) ── */}
                {isExpanded && (
                    <p className="sb-fadeIn text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Menu Utama
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Atur Penilaian */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/atur_penilaian')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/atur_penilaian' ? navActive : navInactive}`}
                >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Atur Penilaian</span>}
                </button>

                {/* Input Nilai */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/input_nilai')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/input_nilai' ? navActive : navInactive}`}
                >
                    <Edit className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Input Nilai</span>}
                </button>

                {/* ── SAYA label (SAMA DENGAN ADMIN) ── */}
                {isExpanded && (
                    <p className="sb-fadeIn text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Saya
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Profil */}
                <button
                    onClick={() => handleNavigation('/guru_bidang_studi/profil')}
                    className={`${navBase} ${pathname === '/guru_bidang_studi/profil' ? navActive : navInactive}`}
                >
                    <UserCircle className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Profil</span>}
                </button>
            </div>
        </div>
    );
}