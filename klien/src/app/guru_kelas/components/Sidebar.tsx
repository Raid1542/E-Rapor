/*
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk guru kelas.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
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

/* Interface: Props untuk komponen Sidebar */
interface SidebarProps {
    user: {
        id: number;
        nama_lengkap: string;
        email_sekolah: string;
        role: string;
    };
}

/* Komponen Utama: Sidebar navigasi untuk Guru Kelas */
export default function Sidebar({ user }: SidebarProps) {
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
            console.warn('Gagal fetch data sekolah di sidebar guru kelas:', error);
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

        const handleSchoolUpdate = () => fetchSchoolData();

        window.addEventListener('logoUpdated', handleLogoUpdate);
        window.addEventListener('schoolUpdated', handleSchoolUpdate);

        return () => {
            window.removeEventListener('logoUpdated', handleLogoUpdate);
            window.removeEventListener('schoolUpdated', handleSchoolUpdate);
        };
    }, []);

    // Konstanta data menu navigasi
    const menuUtama = [
        { name: 'Dashboard', url: '/guru_kelas/dashboard', icon: Home },
    ];

    const dataSiswa = [
        { name: 'Data Siswa', url: '/guru_kelas/data_siswa', icon: Users },
    ];

    const inputNilai = [
        { name: 'Atur Penilaian', url: '/guru_kelas/atur_penilaian', icon: Settings },
        { name: 'Input Nilai', url: '/guru_kelas/input_nilai', icon: ClipboardList },
        { name: 'Kokurikuler', url: '/guru_kelas/kokurikuler', icon: TrendingUp },
        { name: 'Absensi', url: '/guru_kelas/absensi_siswa', icon: FileText },
        { name: 'Catatan Wali Kelas', url: '/guru_kelas/catatan_wali_kelas', icon: MessageSquare },
    ];

    const kegiatan = [
        { name: 'Ekstrakurikuler', url: '/guru_kelas/ekstrakurikuler', icon: Award },
    ];

    const laporan = [
        { name: 'Rekapan Nilai', url: '/guru_kelas/rekapan_nilai', icon: BarChart3 },
        { name: 'Cetak Rapor', url: '/guru_kelas/rapor', icon: BookOpen },
    ];

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
    const navInactive = 'text-white hover:bg-white/10 hover:text-white';

    /* Fungsi: Merender item menu dengan ikon dan status aktif */
    const renderMenuItem = (item: any, isActive: boolean) => {
        const IconComponent = item.icon;
        return (
            <button
                key={item.url}
                onClick={() => handleNavigation(item.url)}
                className={`${navBase} ${isActive ? navActive : navInactive}`}
            >
                <span className={`sb-icon-wrap ${isActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                    <IconComponent className="w-5 h-5" />
                </span>
                {isExpanded && <span>{item.name}</span>}
            </button>
        );
    };

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

                {/* Menu Utama */}
                {menuUtama.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* Label Data Siswa */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Data Siswa
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {dataSiswa.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* Label Input Nilai */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Input Nilai
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {inputNilai.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* Label Kegiatan */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Kegiatan
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {kegiatan.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* Label Laporan */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Laporan
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {laporan.map((item) => renderMenuItem(item, pathname === item.url))}

                {/* Label Saya */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Saya
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Menu Profil */}
                <button
                    onClick={() => handleNavigation('/guru_kelas/profil')}
                    className={`${navBase} ${pathname === '/guru_kelas/profil' ? navActive : navInactive}`}
                >
                    <span className={`sb-icon-wrap ${pathname === '/guru_kelas/profil' ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <UserCircle className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Profil</span>}
                </button>
            </div>
        </div>
    );
}