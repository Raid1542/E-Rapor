/**
 * Nama File: Sidebar.tsx
 * Fungsi: Menyediakan navigasi sidebar untuk halaman guru kelas.
 * Menampilkan menu utama seperti Dashboard, Kelola Data (dengan submenu),
 * Cetak Rapor, dan section "Saya" dengan menu Profil.
 * Sidebar juga menampilkan logo dan nama sekolah yang diambil
 * dari API backend. Mendukung mode collapsed/expanded dan mempertahankan
 * state dropdown yang terbuka saat berpindah halaman.
 * Tampilan disesuaikan dengan sidebar admin (tema oranye gradasi).
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Home,
    Users,
    BookOpen,
    Menu,
    ChevronRight,
    ChevronDown,
    UserCircle,
    X,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
    user: {
        id: number;
        nama_lengkap: string;
        email_sekolah: string;
        role: string;
    };
}

export default function Sidebar({ user }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(true);
    const [openDropdowns, setOpenDropdowns] = useState({
        kelolaData: false,
    });

    const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
    const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');

    // ── Variabel Desain Tailwind (Disamakan dengan Tema Admin) ─────────────────
    const navBase = "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-1";
    const navActive = "bg-white text-[#c95b08] shadow-md shadow-black/10 font-semibold";
    const navInactive = "text-white/80 hover:bg-white/10 hover:text-white";

    const subItemBase = "w-full text-left text-xs py-2 px-4 rounded-lg transition-all duration-200 block truncate";
    const subItemActive = "bg-white/15 text-white font-semibold";
    const subItemInactive = "text-white/70 hover:bg-white/10 hover:text-white";

    // ── Fetch data sekolah ─────────────────────────────────────────────────
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
                    if (data.logo_path) {
                        setLogoUrl(`http://localhost:5000${data.logo_path}?t=${Date.now()}`);
                    }
                    if (data.nama_sekolah) {
                        setSchoolName(data.nama_sekolah);
                    }
                }
            }
        } catch (err) {
            console.warn('Gagal fetch data sekolah di sidebar guru kelas', err);
        }
    };

    // ── Setup event listener ───────────────────────────────────────────────
    useEffect(() => {
        fetchSchoolData();

        const handleLogoUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const logoPath = customEvent.detail?.logoPath;
            if (logoPath) {
                setLogoUrl(`http://localhost:5000${logoPath}?t=${Date.now()}`);
            } else {
                fetchSchoolData();
            }
        };

        const handleSchoolUpdate = () => {
            fetchSchoolData();
        };

        window.addEventListener('logoUpdated', handleLogoUpdate);
        window.addEventListener('schoolUpdated', handleSchoolUpdate);

        return () => {
            window.removeEventListener('logoUpdated', handleLogoUpdate);
            window.removeEventListener('schoolUpdated', handleSchoolUpdate);
        };
    }, []);

    // ── Submenu ────────────────────────────────────────────────────────────
    const kelolaDataSubmenu = [
        { name: 'Data Siswa',          url: '/guru_kelas/data_siswa' },
        { name: 'Atur Penilaian',     url: '/guru_kelas/atur_penilaian' },
        { name: 'Input Nilai',        url: '/guru_kelas/input_nilai' },
        { name: 'Rekapan Nilai',      url: '/guru_kelas/rekapan_nilai' },
        { name: 'Absensi',            url: '/guru_kelas/absensi_siswa' },
        { name: 'Kokurikuler',        url: '/guru_kelas/kokurikuler' },
        { name: 'Ekstrakurikuler',    url: '/guru_kelas/ekstrakurikuler' },
        { name: 'Catatan Wali Kelas', url: '/guru_kelas/catatan_wali_kelas' },
    ];

    // ── Active state ───────────────────────────────────────────────────────
    const isDashboardActive  = pathname === '/guru_kelas/dashboard';
    const isKelolaDataActive = kelolaDataSubmenu.some((item) => item.url === pathname);
    const isRaporActive      = pathname === '/guru_kelas/rapor';
    const isProfilActive     = pathname === '/guru_kelas/profil';

    useEffect(() => {
        if (isKelolaDataActive) setOpenDropdowns((prev) => ({ ...prev, kelolaData: true }));
    }, [isKelolaDataActive]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
        if (isExpanded) setOpenDropdowns({ kelolaData: false });
    };

    const toggleDropdown = (menu: string) => {
        if (!isExpanded) setIsExpanded(true);
        setOpenDropdowns((prev) => ({
            kelolaData: menu === 'kelolaData' ? !prev.kelolaData : false,
        }));
    };

    const handleNavigation = (url: string) => router.push(url);

    return (
        <div
            className={`flex flex-col h-screen transition-all duration-300 ${
                isExpanded ? 'w-64' : 'w-[72px]'
            }`}
            style={{
                background: 'linear-gradient(175deg, #9a3a08 0%, #c95b08 40%, #e8690a 75%, #f5870a 100%)',
            }}
        >
            {/* ── Header: Logo + Nama Sekolah ─────────────────────────────── */}
            <div
                className="flex items-center justify-between px-4 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
            >
                {isExpanded ? (
                    <>
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.18)' }}
                            >
                                <img
                                    src={logoUrl}
                                    alt="Logo Sekolah"
                                    className="w-10 h-10 object-contain"
                                    onError={() => setLogoUrl('/images/LogoUA.jpg')}
                                />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-white leading-tight truncate">{schoolName}</h2>
                                <p className="text-xs text-white/60 leading-tight">E-Rapor</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleSidebar}
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ background: 'rgba(255,255,255,0.12)' }}
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={toggleSidebar}
                        className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-colors"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                        <Menu className="w-5 h-5 text-white" />
                    </button>
                )}
            </div>

            {/* ── Navigation ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">

                {/* Dashboard */}
                <button
                    onClick={() => handleNavigation('/guru_kelas/dashboard')}
                    className={`${navBase} ${isDashboardActive ? navActive : navInactive}`}
                >
                    <Home className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Dashboard</span>}
                </button>

                {/* ── MENU UTAMA label ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-4 pt-4 pb-2">
                        Menu Utama
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Kelola Data (dropdown) */}
                <div className="mb-1">
                    <button
                        onClick={() => toggleDropdown('kelolaData')}
                        className={`${navBase} mb-0 ${isKelolaDataActive ? navActive : navInactive} justify-between`}
                    >
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 flex-shrink-0" />
                            {isExpanded && <span>Kelola Data</span>}
                        </div>
                        {isExpanded && (
                            openDropdowns.kelolaData
                                ? <ChevronDown className="w-4 h-4 opacity-70" />
                                : <ChevronRight className="w-4 h-4 opacity-70" />
                        )}
                    </button>
                    {isExpanded && openDropdowns.kelolaData && (
                        <div
                            className="ml-4 mt-1 pl-3 py-1 space-y-0.5"
                            style={{ borderLeft: '2px solid rgba(255,255,255,0.25)' }}
                        >
                            {kelolaDataSubmenu.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleNavigation(item.url)}
                                    className={`${subItemBase} ${item.url === pathname ? subItemActive : subItemInactive}`}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cetak Rapor */}
                <button
                    onClick={() => handleNavigation('/guru_kelas/rapor')}
                    className={`${navBase} ${isRaporActive ? navActive : navInactive}`}
                >
                    <BookOpen className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Cetak Rapor</span>}
                </button>

                {/* ── SAYA label ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-4 pt-4 pb-2">
                        Saya
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Profil */}
                <button
                    onClick={() => handleNavigation('/guru_kelas/profil')}
                    className={`${navBase} ${isProfilActive ? navActive : navInactive}`}
                >
                    <UserCircle className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Profil</span>}
                </button>

            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div
                className="px-4 py-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
            >
                {isExpanded ? (
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            {user.nama_lengkap?.charAt(0)?.toUpperCase() ?? 'G'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight truncate">{user.nama_lengkap}</p>
                            <p className="text-[10px] text-white/55 leading-tight capitalize">{user.role}</p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mx-auto text-xs font-bold text-white"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                    >
                        {user.nama_lengkap?.charAt(0)?.toUpperCase() ?? 'G'}
                    </div>
                )}
            </div>
        </div>
    );
}