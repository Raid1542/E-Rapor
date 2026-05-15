/**
 * Nama File: Sidebar.tsx
 * Fungsi: Menyediakan navigasi sidebar untuk halaman guru kelas.
 *         Menampilkan menu utama seperti Dashboard, Kelola Data (dengan submenu),
 *         dan Rapor. Sidebar juga menampilkan logo dan nama sekolah yang diambil
 *         dari API backend. Mendukung mode collapsed/expanded dan mempertahankan
 *         state dropdown yang terbuka saat berpindah halaman.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Home,
    Users,
    FileText,
    BookOpen,
    Menu,
    ChevronRight,
    ChevronDown,
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

    //  State untuk logo dan nama sekolah
    const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
    const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');

    //  Fetch data sekolah
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

    //  Setup event listener
    useEffect(() => {
        console.log("🔄 Sidebar guru kelas: fetchSchoolData dipanggil");
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

    const toggleSidebar = () => setIsExpanded(!isExpanded);
    const toggleDropdown = (menu: string) => {
        if (!isExpanded) setIsExpanded(true);
        setOpenDropdowns((prev) => ({
            kelolaData: menu === 'kelolaData' ? !prev.kelolaData : false,
        }));
    };

    const handleNavigation = (url: string) => router.push(url);

    // Submenu
    const kelolaDataSubmenu = [
        { name: 'Data Siswa', url: '/guru_kelas/data_siswa' },
        { name: 'Atur Penilaian', url: '/guru_kelas/atur_penilaian' },
        { name: 'Input Nilai', url: '/guru_kelas/input_nilai' },
        { name: 'Rekapan Nilai', url: '/guru_kelas/rekapan_nilai' },
        { name: 'Absensi', url: '/guru_kelas/absensi_siswa' },
        { name: 'Kokurikuler', url: '/guru_kelas/kokurikuler' },
        { name: 'Ekstrakurikuler', url: '/guru_kelas/ekstrakurikuler' },
        { name: 'Catatan Wali Kelas', url: '/guru_kelas/catatan_wali_kelas' },
    ];

    

    // Active state
    const isDashboardActive = pathname === '/guru_kelas/dashboard';
    const isKelolaDataActive = kelolaDataSubmenu.some((item) => item.url === pathname);
    const isRaporActive = pathname === '/guru_kelas/rapor';

    useEffect(() => {
        if (isKelolaDataActive) setOpenDropdowns((prev) => ({ ...prev, kelolaData: true }));
    }, [isKelolaDataActive]);

    return (
        <div
            className={`flex flex-col h-screen bg-white shadow-lg transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'
                }`}
        >
            <div className="flex items-center justify-between p-4 border-b">
                {isExpanded ? (
                    <>
                        <div className="flex items-center gap-3">
                            <img
                                src={logoUrl}
                                alt="Logo Sekolah"
                                className="w-10 h-10 object-contain"
                                onError={() => setLogoUrl('/images/LogoUA.jpg')}
                            />
                            <div>
                                <h2 className="text-sm font-bold text-gray-900">{schoolName}</h2>
                                <p className="text-xs text-gray-500">E-Rapor</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                            <Menu className="w-5 h-5 text-orange-500" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-orange-50 rounded-lg transition-colors mx-auto"
                    >
                        <Menu className="w-6 h-6 text-orange-500" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <button
                    onClick={() => handleNavigation('/guru_kelas/dashboard')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${isDashboardActive
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
                        }`}
                >
                    <Home className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span className="font-medium">Dashboard</span>}
                </button>

                {isExpanded && (
                    <h3 className="text-xs font-semibold text-gray-500 mb-3 px-3 mt-4">MENU UTAMA</h3>
                )}

                <div className="mb-2">
                    <button
                        onClick={() => toggleDropdown('kelolaData')}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isKelolaDataActive
                                ? 'bg-orange-500 text-white'
                                : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 flex-shrink-0" />
                            {isExpanded && <span className="font-medium">Kelola Data</span>}
                        </div>
                        {isExpanded &&
                            (openDropdowns.kelolaData ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            ))}
                    </button>
                    {isExpanded && openDropdowns.kelolaData && (
                        <div className="ml-6 mt-1 space-y-1">
                            {kelolaDataSubmenu.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleNavigation(item.url)}
                                    className={`w-full text-left p-2 pl-4 rounded-lg text-sm transition-colors ${item.url === pathname
                                            ? 'bg-orange-400 text-white'
                                            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-500'
                                        }`}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
    onClick={() => handleNavigation('/guru_kelas/rapor')}
    className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${isRaporActive
        ? 'bg-orange-500 text-white'
        : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
    }`}
>
    <BookOpen className="w-5 h-5 flex-shrink-0" />
    {isExpanded && <span className="font-medium">Cetak Rapor</span>}
</button>
            </div>

            <div className="p-4 border-t">
                {isExpanded && (
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm text-gray-500">© 2025 E-Rapor</p>
                            <p className="text-sm text-gray-500">{schoolName}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}