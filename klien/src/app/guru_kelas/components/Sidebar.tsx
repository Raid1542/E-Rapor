/**
 * Nama File: Sidebar.tsx
 * Fungsi: Menyediakan navigasi sidebar untuk halaman guru kelas.
 * Update: Struktur menu dengan kategori seperti sidebar admin
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Home,
    Users,
    BookOpen,
    UserCircle,
    X,
    ClipboardList,
    Award,
    FileText,
    Settings,
    TrendingUp,
    MessageSquare,
    BarChart3,
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
            console.warn('Gagal fetch data sekolah di sidebar guru kelas', err);
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

    const menuUtama = [
        { name: 'Dashboard', url: '/guru_kelas/dashboard', icon: <Home className="w-5 h-5" /> },
    ];

    const dataSiswa = [
        { name: 'Data Siswa', url: '/guru_kelas/data_siswa', icon: <Users className="w-4 h-4" /> },
    ];
    
    const inputNilai = [
        { name: 'Atur Penilaian', url: '/guru_kelas/atur_penilaian', icon: <Settings className="w-4 h-4" /> },
        { name: 'Input Nilai', url: '/guru_kelas/input_nilai', icon: <ClipboardList className="w-4 h-4" /> },
        { name: 'Kokurikuler', url: '/guru_kelas/kokurikuler', icon: <TrendingUp className="w-4 h-4" /> },
        { name: 'Absensi', url: '/guru_kelas/absensi_siswa', icon: <FileText className="w-4 h-4" /> },
        { name: 'Catatan Wali Kelas', url: '/guru_kelas/catatan_wali_kelas', icon: <MessageSquare className="w-4 h-4" /> },
    ];

    const kegiatan = [
        { name: 'Ekstrakurikuler', url: '/guru_kelas/ekstrakurikuler', icon: <Award className="w-4 h-4" /> },
    ];

    const laporan = [
        { name: 'Rekapan Nilai', url: '/guru_kelas/rekapan_nilai', icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Cetak Rapor', url: '/guru_kelas/rapor', icon: <BookOpen className="w-4 h-4" /> },
    ];

    const isProfilActive = pathname === '/guru_kelas/profil';

    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
    };

    const handleNavigation = (url: string) => {
        router.push(url);
    };

    const navBase = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all duration-150 text-sm font-medium';
    const navActive = 'bg-white text-orange-600 font-semibold shadow-sm';
    const navInactive = 'text-white hover:bg-white/15 hover:text-white';

    // Helper untuk render menu item
    const renderMenuItem = (item: any, isActive: boolean) => (
        <button
            key={item.url}
            onClick={() => handleNavigation(item.url)}
            className={`${navBase} ${isActive ? navActive : navInactive}`}
        >
            {item.icon}
            {isExpanded && <span>{item.name}</span>}
        </button>
    );

    return (
        <div
            className={`flex flex-col h-screen transition-all duration-300 ${isExpanded ? 'w-64' : 'w-[72px]'}`}
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
                        <img
                            src={logoUrl}
                            alt="Logo Sekolah"
                            className="w-10 h-10 object-contain"
                            onError={() => setLogoUrl('/images/LogoUA.jpg')}
                        />
                    </button>
                )}
            </div>

            {/* ── Navigation ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">

                {/* Menu Utama */}
                {menuUtama.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* ── DATA SISWA ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Data Siswa
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {dataSiswa.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* ── INPUT NILAI ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Input Nilai
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {inputNilai.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* ── KEGIATAN ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Kegiatan
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {kegiatan.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* ── LAPORAN ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Laporan
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {laporan.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* ── SAYA ── */}
                {isExpanded && (
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Saya
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                <button
                    onClick={() => handleNavigation('/guru_kelas/profil')}
                    className={`${navBase} ${isProfilActive ? navActive : navInactive}`}
                >
                    <UserCircle className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span>Profil</span>}
                </button>

            </div>
        </div>
    );
}