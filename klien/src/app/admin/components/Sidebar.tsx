/**
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk panel admin.
 *         Menampilkan menu utama dan submenu berdasarkan hak akses pengguna,
 *         serta menampilkan logo dan nama sekolah yang diambil dari API.
 *         Mendukung mode collapsed/expanded dan menyimpan state dropdown terbuka.
 *         Terdapat section "Saya" dengan menu Profil.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan dengan gradasi
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
    pengguna: false,
    administrasi: false,
  });

  const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
  const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');

  // ── Fetch data sekolah (logo + nama) ──────────────────────────────────────
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
          if (data.logo_path) setLogoUrl(`http://localhost:5000${data.logo_path}?t=${Date.now()}`);
          if (data.nama_sekolah) setSchoolName(data.nama_sekolah);
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

  // ── Submenu data ───────────────────────────────────────────────────────────
  const penggunaSubmenu = [
    { name: 'Data Guru',                         url: '/admin/data_guru' },
    { name: 'Data Admin',                        url: '/admin/data_admin' },
    { name: 'Data Pembina Ekstrakurikuler',      url: '/admin/data_pembina_ekstrakurikuler' },
  ];

  const administrasiSubmenu = [
    { name: 'Data Sekolah',        url: '/admin/data_sekolah' },
    { name: 'Data Kelas',          url: '/admin/data_kelas' },
    { name: 'Data Siswa',          url: '/admin/data_siswa' },
    { name: 'Data Mata Pelajaran', url: '/admin/data_mata_pelajaran' },
    { name: 'Data Pembelajaran',   url: '/admin/data_pembelajaran' },
    { name: 'Ekstrakurikuler',     url: '/admin/ekstrakurikuler' },
  ];

  // ── Active state ───────────────────────────────────────────────────────────
  const isDashboardActive     = pathname === '/admin/dashboard';
  const isTahunAjaranActive   = pathname === '/admin/data_tahun_ajaran';
  const isRaporActive         = pathname === '/admin/arsip_rapor';
  const isBackupRestoreActive = pathname === '/admin/backup_restore';
  const isProfilActive        = pathname === '/admin/profil';
  const isPenggunaActive      = penggunaSubmenu.some((item) => item.url === pathname);
  const isAdministrasiActive  = administrasiSubmenu.some((item) => item.url === pathname);

  useEffect(() => {
    if (isPenggunaActive)     setOpenDropdowns((prev) => ({ ...prev, pengguna: true }));
    if (isAdministrasiActive) setOpenDropdowns((prev) => ({ ...prev, administrasi: true }));
  }, [isPenggunaActive, isAdministrasiActive]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) setOpenDropdowns({ pengguna: false, administrasi: false });
  };

  const toggleDropdown = (menu: string) => {
    if (!isExpanded) setIsExpanded(true);
    setOpenDropdowns((prev) => ({
      pengguna:     menu === 'pengguna'     ? !prev.pengguna     : false,
      administrasi: menu === 'administrasi' ? !prev.administrasi : false,
    }));
  };

  const handleNavigation = (url: string) => {
    setOpenDropdowns({
      pengguna:     penggunaSubmenu.some((item) => item.url === url),
      administrasi: administrasiSubmenu.some((item) => item.url === url),
    });
    router.push(url);
  };

  // ── Reusable nav item styles ───────────────────────────────────────────────
  const navBase =
    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition-all duration-150 text-sm font-medium border-l-[3px]';
  const navActive =
    'bg-white/20 text-white border-l-white backdrop-blur-sm';
  const navInactive =
    'text-white/75 hover:bg-white/10 hover:text-white border-l-transparent';

  const subItemBase =
    'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150';
  const subItemActive  = 'bg-white/25 text-white';
  const subItemInactive = 'text-white/70 hover:bg-white/10 hover:text-white';

  return (
    <div
      className={`flex flex-col h-screen transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
      style={{
        background: 'linear-gradient(175deg, #9a3a08 0%, #c95b08 40%, #e8690a 75%, #f5870a 100%)',
      }}
    >
      {/* ── Header: Logo + Nama Sekolah ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo — ukuran diperbesar */}
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

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">

        {/* Dashboard */}
        <button
          onClick={() => handleNavigation('/admin/dashboard')}
          className={`${navBase} ${isDashboardActive ? navActive : navInactive}`}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span>Dashboard</span>}
        </button>

        {/* ── MASTER DATA label ── */}
        {isExpanded && (
          <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-4 pt-4 pb-2">
            Master Data
          </p>
        )}
        {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

        {/* Tahun Ajaran */}
        <button
          onClick={() => handleNavigation('/admin/data_tahun_ajaran')}
          className={`${navBase} ${isTahunAjaranActive ? navActive : navInactive}`}
        >
          <Calendar className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span>Tahun Ajaran</span>}
        </button>

        {/* Pengguna (dropdown) */}
        <div className="mb-1">
          <button
            onClick={() => toggleDropdown('pengguna')}
            className={`${navBase} mb-0 ${isPenggunaActive ? navActive : navInactive} justify-between`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span>Pengguna</span>}
            </div>
            {isExpanded && (
              openDropdowns.pengguna
                ? <ChevronDown className="w-4 h-4 opacity-70" />
                : <ChevronRight className="w-4 h-4 opacity-70" />
            )}
          </button>
          {isExpanded && openDropdowns.pengguna && (
            <div
              className="ml-4 mt-1 pl-3 py-1 space-y-0.5"
              style={{ borderLeft: '2px solid rgba(255,255,255,0.25)' }}
            >
              {penggunaSubmenu.map((item, idx) => (
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

        {/* Administrasi (dropdown) — sekarang termasuk Ekstrakurikuler */}
        <div className="mb-1">
          <button
            onClick={() => toggleDropdown('administrasi')}
            className={`${navBase} mb-0 ${isAdministrasiActive ? navActive : navInactive} justify-between`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span>Administrasi</span>}
            </div>
            {isExpanded && (
              openDropdowns.administrasi
                ? <ChevronDown className="w-4 h-4 opacity-70" />
                : <ChevronRight className="w-4 h-4 opacity-70" />
            )}
          </button>
          {isExpanded && openDropdowns.administrasi && (
            <div
              className="ml-4 mt-1 pl-3 py-1 space-y-0.5"
              style={{ borderLeft: '2px solid rgba(255,255,255,0.25)' }}
            >
              {administrasiSubmenu.map((item, idx) => (
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

        {/* Arsip Rapor */}
        <button
          onClick={() => handleNavigation('/admin/arsip_rapor')}
          className={`${navBase} ${isRaporActive ? navActive : navInactive}`}
        >
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span>Arsip Rapor</span>}
        </button>

        {/* Backup & Restore */}
        <button
          onClick={() => handleNavigation('/admin/backup_restore')}
          className={`${navBase} ${isBackupRestoreActive ? navActive : navInactive}`}
        >
          <Database className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span>Backup &amp; Restore</span>}
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
          onClick={() => handleNavigation('/admin/profil')}
          className={`${navBase} ${isProfilActive ? navActive : navInactive}`}
        >
          <UserCircle className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span>Profil</span>}
        </button>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {isExpanded ? (
          <div className="flex items-center gap-3">
            {/* Avatar inisial */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {user.nama_lengkap?.charAt(0)?.toUpperCase() ?? 'A'}
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
            {user.nama_lengkap?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
        )}
      </div>
    </div>
  );
}