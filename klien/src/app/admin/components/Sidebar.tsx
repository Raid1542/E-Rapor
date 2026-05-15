/**
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk panel admin.
 *         Menampilkan menu utama dan submenu berdasarkan hak akses pengguna,
 *         serta menampilkan logo dan nama sekolah yang diambil dari API.
 *         Mendukung mode collapsed/expanded dan menyimpan state dropdown terbuka.
 *         Terdapat section "Saya" dengan menu Profil.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  FileText,
  BookOpen,
  Award,
  Menu,
  ChevronDown,
  ChevronRight,
  Calendar,
  UserCircle,
  Database,
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
    pengguna: false,
    administrasi: false,
  });

  const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
  const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');

  // Fetch data sekolah (logo + nama)
  const fetchSchoolData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/admin/sekolah', {
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
      console.warn('Gagal fetch data sekolah, pakai default.', err);
    }
  };

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

    const handleSchoolUpdate = () => fetchSchoolData();

    window.addEventListener('logoUpdated', handleLogoUpdate);
    window.addEventListener('schoolUpdated', handleSchoolUpdate);

    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
      window.removeEventListener('schoolUpdated', handleSchoolUpdate);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      setOpenDropdowns({ pengguna: false, administrasi: false });
    }
  };

  const toggleDropdown = (menu: string) => {
    if (!isExpanded) setIsExpanded(true);
    setOpenDropdowns((prev) => ({
      pengguna: menu === 'pengguna' ? !prev.pengguna : false,
      administrasi: menu === 'administrasi' ? !prev.administrasi : false,
    }));
  };

  // Navigasi + otomatis tutup semua dropdown kecuali yang relevan
  const handleNavigation = (url: string) => {
    const isPenggunaUrl     = penggunaSubmenu.some((item) => item.url === url);
    const isAdministrasiUrl = administrasiSubmenu.some((item) => item.url === url);
    setOpenDropdowns({
      pengguna: isPenggunaUrl,
      administrasi: isAdministrasiUrl,
    });
    router.push(url);
  };

  // Submenu
  const penggunaSubmenu = [
    { name: 'Data Guru', url: '/admin/data_guru' },
    { name: 'Data Admin', url: '/admin/data_admin' },
    { name: 'Data Pembina Ekstrakurikuler', url: '/admin/data_pembina_ekstrakurikuler' },
  ];

  const administrasiSubmenu = [
    { name: 'Data Sekolah', url: '/admin/data_sekolah' },
    { name: 'Data Kelas', url: '/admin/data_kelas' },
    { name: 'Data Siswa', url: '/admin/data_siswa' },
    { name: 'Data Mata Pelajaran', url: '/admin/data_mata_pelajaran' },
    { name: 'Data Pembelajaran', url: '/admin/data_pembelajaran' },
  ];

  // Active state
  const isDashboardActive     = pathname === '/admin/dashboard';
  const isTahunAjaranActive   = pathname === '/admin/data_tahun_ajaran';
  const isEkskulActive        = pathname === '/admin/ekstrakurikuler';
  const isRaporActive         = pathname === '/admin/arsip_rapor';
  const isBackupRestoreActive = pathname === '/admin/backup_restore';
  const isProfilActive        = pathname === '/admin/profil';
  const isPenggunaActive      = penggunaSubmenu.some((item) => item.url === pathname);
  const isAdministrasiActive  = administrasiSubmenu.some((item) => item.url === pathname);

  // Buka dropdown otomatis sesuai halaman aktif saat pertama load
  useEffect(() => {
    if (isPenggunaActive)     setOpenDropdowns((prev) => ({ ...prev, pengguna: true }));
    if (isAdministrasiActive) setOpenDropdowns((prev) => ({ ...prev, administrasi: true }));
  }, [isPenggunaActive, isAdministrasiActive]);

  return (
    <div
      className={`flex flex-col h-screen bg-white shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* ── Header: Logo + Nama Sekolah ── */}
      <div className="flex items-center justify-between p-4 border-b">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-3">
              {/* Logo — bentuk asli, img biasa tanpa ring */}
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

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Dashboard */}
        <button
          onClick={() => handleNavigation('/admin/dashboard')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
            isDashboardActive
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Dashboard</span>}
        </button>

        {/* ── MASTER DATA ── */}
        {isExpanded && (
          <h3 className="text-xs font-semibold text-gray-500 mb-3 px-3 mt-4">MASTER DATA</h3>
        )}

        {/* Tahun Ajaran */}
        <button
          onClick={() => handleNavigation('/admin/data_tahun_ajaran')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
            isTahunAjaranActive
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <Calendar className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Tahun Ajaran</span>}
        </button>

        {/* Pengguna (dropdown) */}
        <div className="mb-2">
          <button
            onClick={() => toggleDropdown('pengguna')}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
              isPenggunaActive
                ? 'bg-orange-500 text-white'
                : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="font-medium">Pengguna</span>}
            </div>
            {isExpanded && (
              openDropdowns.pengguna
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && openDropdowns.pengguna && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-orange-200 pl-3">
              {penggunaSubmenu.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleNavigation(item.url)}
                  className={`w-full text-left p-2 pl-3 rounded-lg text-sm transition-colors ${
                    item.url === pathname
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

        {/* Administrasi (dropdown) */}
        <div className="mb-2">
          <button
            onClick={() => toggleDropdown('administrasi')}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
              isAdministrasiActive
                ? 'bg-orange-500 text-white'
                : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="font-medium">Administrasi</span>}
            </div>
            {isExpanded && (
              openDropdowns.administrasi
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && openDropdowns.administrasi && (
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-orange-200 pl-3">
              {administrasiSubmenu.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleNavigation(item.url)}
                  className={`w-full text-left p-2 pl-3 rounded-lg text-sm transition-colors ${
                    item.url === pathname
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

        {/* Ekstrakurikuler */}
        <button
          onClick={() => handleNavigation('/admin/ekstrakurikuler')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
            isEkskulActive
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <Award className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Ekstrakurikuler</span>}
        </button>

        {/* Arsip Rapor */}
        <button
          onClick={() => handleNavigation('/admin/arsip_rapor')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
            isRaporActive
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Arsip Rapor</span>}
        </button>

        {/* Backup & Restore */}
        <button
          onClick={() => handleNavigation('/admin/backup_restore')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
            isBackupRestoreActive
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <Database className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Backup &amp; Restore</span>}
        </button>

        {/* ── SAYA ── */}
        {isExpanded && (
          <h3 className="text-xs font-semibold text-gray-500 mb-3 px-3 mt-4">SAYA</h3>
        )}

        {/* Profil */}
        <button
          onClick={() => handleNavigation('/admin/profil')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
            isProfilActive
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-500'
          }`}
        >
          <UserCircle className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="font-medium">Profil</span>}
        </button>

      </div>

      {/* ── Footer ── */}
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