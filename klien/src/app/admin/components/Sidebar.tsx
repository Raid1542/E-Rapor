/*
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk panel admin dengan animasi playful.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 10 Juli 2026
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Home,
    FileText,
    ChevronDown,
    Calendar,
    UserCircle,
    Database,
    X,
    Settings,
    Lock,
    AlertCircle,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

/* Interface: Informasi tahun ajaran aktif */
interface TahunAjaranAktif {
    tahun_ajaran: string;
    semester: string;
}

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

        /* Wadah ikon: badge bulat/kotak lembut, beda tampilan saat aktif vs tidak */
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
        .sb-icon-wrap.sb-icon-disabled {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.35);
        }
        .sb-nav-item:hover:not(:disabled) .sb-icon-wrap.sb-icon-inactive {
            background: rgba(255, 255, 255, 0.18);
        }

        .sb-sub-item {
            position: relative;
            transition: all 0.2s ease;
        }
        .sb-sub-item:hover {
            transform: translateX(0.25rem);
        }

        /* Titik penanda timeline pada submenu */
        .sb-dot {
            width: 0.375rem;
            height: 0.375rem;
            border-radius: 50%;
            flex-shrink: 0;
            margin-right: 0.5625rem;
            transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .sb-dot-active {
            background: #e8690a;
            box-shadow: 0 0 0 0.1875rem rgba(232, 105, 10, 0.15);
            transform: scale(1.15);
        }
        .sb-dot-inactive {
            background: rgba(255, 255, 255, 0.4);
        }
        .sb-sub-item:hover .sb-dot-inactive {
            background: rgba(255, 255, 255, 0.75);
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

/* Komponen Utama: Sidebar navigasi */
export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [openDropdowns, setOpenDropdowns] = useState({
        masterData: false,
        akademik: false,
    });

    const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
    const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');
    const [taAktif, setTaAktif] = useState<TahunAjaranAktif | null>(null);
    const [taLoading, setTaLoading] = useState<boolean>(true);

    /* Ambil data sekolah (logo dan nama) dari API */
    const fetchSchoolData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const res = await fetch(`${API_BASE_URL}/api/admin/sekolah`, {
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
            console.warn('Gagal fetch data sekolah, pakai default.', error);
        }
    };

    /* Ambil informasi tahun ajaran aktif dari API */
    const fetchTahunAjaranAktif = async () => {
        try {
            setTaLoading(true);
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
                    setTaAktif({
                        tahun_ajaran: aktif.tahun_ajaran || aktif.tahun_ajaran_induk || '-',
                        semester: aktif.semester || '-',
                    });
                } else {
                    setTaAktif(null);
                }
            }
        } catch (error) {
            console.error('Gagal fetch TA aktif:', error);
        } finally {
            setTaLoading(false);
        }
    };

    // Setup event listeners untuk update data secara real-time
    useEffect(() => {
        fetchSchoolData();
        fetchTahunAjaranAktif();

        const handleLogoUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            const logoPath = customEvent.detail?.logoPath;
            if (logoPath) {
                setLogoUrl(`${API_BASE_URL}${logoPath}?t=${Date.now()}`);
            } else {
                fetchSchoolData();
            }
        };

        const handleTAUpdate = () => fetchTahunAjaranAktif();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'tahunAjaranUpdated' || e.key === 'semesterUpdated') {
                fetchTahunAjaranAktif();
            }
        };

        window.addEventListener('logoUpdated', handleLogoUpdate);
        window.addEventListener('schoolUpdated', fetchSchoolData);
        window.addEventListener('tahunAjaranUpdated', handleTAUpdate);
        window.addEventListener('semesterUpdated', handleTAUpdate);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('logoUpdated', handleLogoUpdate);
            window.removeEventListener('schoolUpdated', fetchSchoolData);
            window.removeEventListener('tahunAjaranUpdated', handleTAUpdate);
            window.removeEventListener('semesterUpdated', handleTAUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Konstanta submenu navigasi
    const masterDataSubmenu = [
        { name: 'Data Sekolah', url: '/admin/data_sekolah' },
        { name: 'Data Admin', url: '/admin/data_admin' },
        { name: 'Data Guru', url: '/admin/data_guru' },
        { name: 'Data Siswa', url: '/admin/data_siswa' },
        { name: 'Data Pembina Ekstrakurikuler', url: '/admin/data_pembina_ekstrakurikuler' },
    ];

    const akademikSubmenu = [
        { name: 'Data Kelas', url: '/admin/data_kelas_siswa' },
        { name: 'Data Mata Pelajaran', url: '/admin/data_mata_pelajaran' },
        { name: 'Data Pembelajaran', url: '/admin/data_pembelajaran' },
        { name: 'Data Ekstrakurikuler', url: '/admin/ekstrakurikuler' },
        { name: 'Arsip Rapor', url: '/admin/arsip_rapor' },
    ];

    // State aktif berdasarkan pathname saat ini
    const isDashboardActive = pathname === '/admin/dashboard';
    const isTahunAjaranActive = pathname === '/admin/data_tahun_ajaran';
    const isBackupRestoreActive = pathname === '/admin/backup_restore';
    const isProfilActive = pathname === '/admin/profil';
    const isMasterDataActive = masterDataSubmenu.some((item) => item.url === pathname);
    const isAkademikActive = akademikSubmenu.some((item) => item.url === pathname);

    // Redirect otomatis jika user mencoba akses halaman Akademik tanpa TA aktif
    useEffect(() => {
        if (!taLoading && !taAktif && isAkademikActive) {
            setTimeout(() => {
                alert('⚠️ Tahun Ajaran aktif belum diatur!\n\nAnda akan diarahkan ke halaman Tahun Ajaran untuk mengaktifkan TA terlebih dahulu.');
                router.push('/admin/data_tahun_ajaran');
            }, 500);
        }
    }, [taLoading, taAktif, isAkademikActive, router]);

    // Buka dropdown secara otomatis jika sedang berada di halaman submenu tersebut
    useEffect(() => {
        if (isMasterDataActive) {
            setOpenDropdowns((prev) => ({ ...prev, masterData: true }));
        }
        if (isAkademikActive && taAktif) {
            setOpenDropdowns((prev) => ({ ...prev, akademik: true }));
        }
    }, [isMasterDataActive, isAkademikActive, taAktif]);

    /* Handler: Toggle ekspansi sidebar */
    const toggleSidebar = () => {
        setIsExpanded(!isExpanded);
        if (isExpanded) {
            setOpenDropdowns({ masterData: false, akademik: false });
        }
    };

    /* Handler: Toggle dropdown menu */
    const toggleDropdown = (menu: string) => {
        if (!isExpanded) {
            setIsExpanded(true);
        }

        if (menu === 'akademik' && !taAktif) {
            alert('⚠️ Tahun Ajaran aktif belum diatur!\n\nSilakan aktifkan Tahun Ajaran terlebih dahulu di menu "Tahun Ajaran".');
            router.push('/admin/data_tahun_ajaran');
            return;
        }

        setOpenDropdowns((prev) => ({
            masterData: menu === 'masterData' ? !prev.masterData : false,
            akademik: menu === 'akademik' ? !prev.akademik : false,
        }));
    };

    /* Handler: Navigasi ke URL tertentu */
    const handleNavigation = (url: string) => {
        setOpenDropdowns({
            masterData: masterDataSubmenu.some((item) => item.url === url),
            akademik: akademikSubmenu.some((item) => item.url === url),
        });
        router.push(url);
    };

    /* Handler: Klik menu akademik dengan validasi TA */
    const handleAkademikClick = (url: string) => {
        if (!taAktif) {
            alert('⚠️ Tahun Ajaran aktif belum diatur!\n\nSilakan aktifkan Tahun Ajaran terlebih dahulu di menu "Tahun Ajaran".');
            router.push('/admin/data_tahun_ajaran');
            return;
        }
        handleNavigation(url);
    };

    // Konstanta style untuk item navigasi
    const navBase = 'sb-nav-item w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-sm font-medium';
    const navActive = 'sb-active bg-white text-orange-600 shadow-sm font-semibold';
    const navInactive = 'text-white hover:bg-white/10 hover:text-white';
    const navDisabled = 'text-white/40 cursor-not-allowed opacity-60';

    const subItemBase = 'sb-sub-item w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center mb-1';
    const subItemActive = 'bg-white text-orange-600 font-semibold shadow-sm';
    const subItemInactive = 'text-white hover:bg-white/10 hover:text-white';

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
                                style={{ background: 'rgba(255,255,255,0.18)', boxShadow: '0 0 0 0.1875rem rgba(255,255,255,0.08)' }}
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
                        style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 0 0.1875rem rgba(255,255,255,0.08)' }}
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

                {/* Menu Dashboard */}
                <button
                    onClick={() => handleNavigation('/admin/dashboard')}
                    className={`${navBase} ${isExpanded ? 'justify-start' : 'justify-center'} ${isDashboardActive ? navActive : navInactive}`}
                    title={!isExpanded ? 'Dashboard' : ''}
                >
                    <span className={`sb-icon-wrap ${isDashboardActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <Home className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Dashboard</span>}
                </button>

                {/* Label Master Data */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Master Data
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Menu Tahun Ajaran */}
                <button
                    onClick={() => handleNavigation('/admin/data_tahun_ajaran')}
                    className={`${navBase} ${isExpanded ? 'justify-start' : 'justify-center'} ${isTahunAjaranActive ? navActive : navInactive}`}
                    title={!isExpanded ? 'Tahun Ajaran' : ''}
                >
                    <span className={`sb-icon-wrap ${isTahunAjaranActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <Calendar className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Tahun Ajaran</span>}
                </button>

                {/* Dropdown Master Data */}
                <div className="mb-1">
                    <button
                        onClick={() => toggleDropdown('masterData')}
                        className={`${navBase} mb-0 ${isExpanded ? 'justify-start' : 'justify-center'} ${isMasterDataActive ? navActive : navInactive}`}
                        title={!isExpanded ? 'Data Master' : ''}
                    >
                        <span className={`sb-icon-wrap ${isMasterDataActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                            <Database className="w-5 h-5" />
                        </span>
                        {isExpanded && (
                            <>
                                <span>Data Master</span>
                                <ChevronDown
                                    className={`w-4 h-4 opacity-70 sb-chevron ml-auto ${openDropdowns.masterData ? 'sb-chevron-open' : ''}`}
                                />
                            </>
                        )}
                    </button>
                    {isExpanded && openDropdowns.masterData && (
                        <div
                            className="sb-slideDown ml-4 mt-1.5 pl-3.5 py-1.5"
                            style={{ borderLeft: '0.125rem solid rgba(255,255,255,0.2)' }}
                        >
                            {masterDataSubmenu.map((item, idx) => {
                                const active = item.url === pathname;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleNavigation(item.url)}
                                        className={`${subItemBase} ${active ? subItemActive : subItemInactive}`}
                                        style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                        <span className={`sb-dot ${active ? 'sb-dot-active' : 'sb-dot-inactive'}`} />
                                        <span>{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Label Akademik dengan Badge TA Aktif */}
                {isExpanded && (
                    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
                        <p className="sb-fadeIn text-[10px] font-bold tracking-widest text-white/60 uppercase whitespace-nowrap">
                            Akademik
                        </p>
                        {taLoading ? (
                            <div className="w-16 h-5 rounded-full bg-white/20 animate-pulse" />
                        ) : taAktif ? (
                            <span
                                className="sb-badgePulse px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 whitespace-nowrap"
                                style={{
                                    background: 'rgba(255,255,255,0.22)',
                                    color: '#fff',
                                    border: '0.0625rem solid rgba(255,255,255,0.32)'
                                }}
                                title={`${taAktif.tahun_ajaran} - Semester ${taAktif.semester}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#4ade80' }} />
                                {taAktif.tahun_ajaran.split('/')[0]?.slice(-2)}/{taAktif.tahun_ajaran.split('/')[1]?.slice(-2)} {taAktif.semester === 'Ganjil' ? 'Gjl' : 'Gnp'}
                            </span>
                        ) : (
                            <span
                                className="px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 animate-pulse whitespace-nowrap"
                                style={{
                                    background: 'rgba(239,68,68,0.35)',
                                    color: '#fff',
                                    border: '0.0625rem solid rgba(239,68,68,0.55)'
                                }}
                                title="Belum ada Tahun Ajaran aktif"
                            >
                                <AlertCircle className="w-3 h-3" />
                                Nonaktif
                            </span>
                        )}
                    </div>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Dropdown Akademik */}
                <div className="mb-1">
                    <button
                        onClick={() => toggleDropdown('akademik')}
                        className={`${navBase} mb-0 ${isExpanded ? 'justify-start' : 'justify-center'} ${!taAktif ? navDisabled : isAkademikActive ? navActive : navInactive}`}
                        title={!isExpanded ? (!taAktif ? 'Aktifkan TA terlebih dahulu' : 'Operasional') : ''}
                    >
                        <span className={`sb-icon-wrap ${!taAktif ? 'sb-icon-disabled' : isAkademikActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                            {!taAktif ? (
                                <Lock className="w-5 h-5" />
                            ) : (
                                <FileText className="w-5 h-5" />
                            )}
                        </span>
                        {isExpanded && (
                            <>
                                <span>Operasional</span>
                                {taAktif && (
                                    <ChevronDown
                                        className={`w-4 h-4 opacity-70 sb-chevron ml-auto ${openDropdowns.akademik ? 'sb-chevron-open' : ''}`}
                                    />
                                )}
                            </>
                        )}
                    </button>

                    {/* Submenu Akademik */}
                    {isExpanded && openDropdowns.akademik && taAktif && (
                        <div
                            className="sb-slideDown ml-4 mt-1.5 pl-3.5 py-1.5"
                            style={{ borderLeft: '0.125rem solid rgba(255,255,255,0.2)' }}
                        >
                            {akademikSubmenu.map((item, idx) => {
                                const active = item.url === pathname;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAkademikClick(item.url)}
                                        className={`${subItemBase} ${active ? subItemActive : subItemInactive}`}
                                        style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                        <span className={`sb-dot ${active ? 'sb-dot-active' : 'sb-dot-inactive'}`} />
                                        <span>{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Pesan peringatan jika TA belum aktif */}
                    {isExpanded && !taAktif && !taLoading && (
                        <div
                            className="sb-fadeIn ml-4 mt-2 px-3 py-2.5 rounded-lg text-[10px] text-white/85"
                            style={{ background: 'rgba(239,68,68,0.16)', border: '0.0625rem solid rgba(239,68,68,0.32)' }}
                        >
                            <p className="font-semibold mb-1 flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                TA Belum Aktif
                            </p>
                            <p className="leading-relaxed">
                                Aktifkan Tahun Ajaran di menu <strong>Tahun Ajaran</strong> untuk mengakses fitur Akademik.
                            </p>
                        </div>
                    )}
                </div>

                {/* Label Sistem */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Sistem
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Menu Backup & Restore */}
                <button
                    onClick={() => handleNavigation('/admin/backup_restore')}
                    className={`${navBase} ${isExpanded ? 'justify-start' : 'justify-center'} ${isBackupRestoreActive ? navActive : navInactive}`}
                    title={!isExpanded ? 'Backup & Restore' : ''}
                >
                    <span className={`sb-icon-wrap ${isBackupRestoreActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <Settings className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Backup &amp; Restore</span>}
                </button>

                {/* Label Saya */}
                {isExpanded && (
                    <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
                        Saya
                    </p>
                )}
                {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

                {/* Menu Profil */}
                <button
                    onClick={() => handleNavigation('/admin/profil')}
                    className={`${navBase} ${isExpanded ? 'justify-start' : 'justify-center'} ${isProfilActive ? navActive : navInactive}`}
                    title={!isExpanded ? 'Profil' : ''}
                >
                    <span className={`sb-icon-wrap ${isProfilActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                        <UserCircle className="w-5 h-5" />
                    </span>
                    {isExpanded && <span>Profil</span>}
                </button>
            </div>
        </div>
    );
}