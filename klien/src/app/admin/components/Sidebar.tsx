/**
 * Nama File: Sidebar.tsx
 * Fungsi: Komponen sidebar navigasi untuk panel admin.
 * Update: penyegaran visual (ikon aktif berbentuk badge, indikator submenu timeline,
 *         header & badge lebih rapi) — palet warna orange utama tidak diubah.
 */

'use client';

import React, { useState, useEffect } from 'react';
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

interface TahunAjaranAktif {
  tahun_ajaran: string;
  semester: string;
}

// ─── GLOBAL STYLES (Animasi Playful) ────────────────────────────────────────
const SidebarStyles = () => (
  <style jsx global>{`
    @keyframes sb-slideDown {
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
    @keyframes sb-fadeIn {
      from { opacity: 0; transform: translateX(-4px); }
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
      transform: translateX(3px);
    }

    /* Aksen bar kecil di sisi kiri item yang aktif */
    .sb-nav-item.sb-active::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 22px;
      border-radius: 0 4px 4px 0;
      background: #fff;
      box-shadow: 0 0 8px rgba(255,255,255,0.6);
    }

    /* Wadah ikon: badge bulat/kotak lembut, beda tampilan saat aktif vs tidak */
    .sb-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.22s ease, box-shadow 0.22s ease;
    }
    .sb-icon-wrap.sb-icon-active {
      background: linear-gradient(135deg, #c95b08, #f5870a);
      box-shadow: 0 3px 10px rgba(180,70,10,0.28);
      color: #fff;
    }
    .sb-icon-wrap.sb-icon-inactive {
      background: rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.9);
    }
    .sb-icon-wrap.sb-icon-disabled {
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.35);
    }
    .sb-nav-item:hover:not(:disabled) .sb-icon-wrap.sb-icon-inactive {
      background: rgba(255,255,255,0.18);
    }

    .sb-sub-item {
      position: relative;
      transition: all 0.2s ease;
    }
    .sb-sub-item:hover {
      transform: translateX(4px);
    }

    /* Titik penanda timeline pada submenu */
    .sb-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: 9px;
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }
    .sb-dot-active {
      background: #e8690a;
      box-shadow: 0 0 0 3px rgba(232,105,10,0.15);
      transform: scale(1.15);
    }
    .sb-dot-inactive {
      background: rgba(255,255,255,0.4);
    }
    .sb-sub-item:hover .sb-dot-inactive {
      background: rgba(255,255,255,0.75);
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
      gap: 8px;
    }
    .sb-section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, rgba(255,255,255,0.18), transparent);
    }

    .sb-scrollbar-none::-webkit-scrollbar { display: none; }
    .sb-scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState({
    masterData: false,
    akademik: false,
  });

  const [logoUrl, setLogoUrl] = useState<string>('/images/LogoUA.jpg');
  const [schoolName, setSchoolName] = useState<string>('SDIT Ulil Albab');
  const [taAktif, setTaAktif] = useState<TahunAjaranAktif | null>(null);
  const [taLoading, setTaLoading] = useState(true);

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

  // ── Fetch Tahun Ajaran Aktif ──────────────────────────────────────────────
  const fetchTahunAjaranAktif = async () => {
    try {
      setTaLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setTaLoading(false);
        return;
      }

      const res = await fetch('http://localhost:5000/api/admin/semester-list', {
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
    } catch (err) {
      console.error('Gagal fetch TA aktif:', err);
    } finally {
      setTaLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolData();
    fetchTahunAjaranAktif();

    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const logoPath = customEvent.detail?.logoPath;
      if (logoPath) setLogoUrl(`http://localhost:5000${logoPath}?t=${Date.now()}`);
      else fetchSchoolData();
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

  // ── Submenu data (TANPA ICON) ─────────────────────────────────────────────

  // MASTER DATA
  const masterDataSubmenu = [
    { name: 'Data Sekolah', url: '/admin/data_sekolah' },
    { name: 'Data Admin', url: '/admin/data_admin' },
    { name: 'Data Guru', url: '/admin/data_guru' },
    { name: 'Data Siswa', url: '/admin/data_siswa' },
    { name: 'Data Pembina Ekstrakurikuler', url: '/admin/data_pembina_ekstrakurikuler' },
  ];

  // AKADEMIK
  const akademikSubmenu = [
    { name: 'Data Kelas', url: '/admin/data_kelas_siswa' },
    { name: 'Data Mata Pelajaran', url: '/admin/data_mata_pelajaran' },
    { name: 'Data Pembelajaran', url: '/admin/data_pembelajaran' },
    { name: 'Data Ekstrakurikuler', url: '/admin/ekstrakurikuler' },
    { name: 'Arsip Rapor', url: '/admin/arsip_rapor' },
  ];

  // ── Active state ───────────────────────────────────────────────────────────
  const isDashboardActive = pathname === '/admin/dashboard';
  const isTahunAjaranActive = pathname === '/admin/data_tahun_ajaran';
  const isBackupRestoreActive = pathname === '/admin/backup_restore';
  const isProfilActive = pathname === '/admin/profil';
  const isMasterDataActive = masterDataSubmenu.some((item) => item.url === pathname);
  const isAkademikActive = akademikSubmenu.some((item) => item.url === pathname);

  // ── Auto redirect jika user langsung akses halaman Akademik tanpa TA aktif ──
  useEffect(() => {
    if (!taLoading && !taAktif && isAkademikActive) {
      setTimeout(() => {
        alert('⚠️ Tahun Ajaran aktif belum diatur!\n\nAnda akan diarahkan ke halaman Tahun Ajaran untuk mengaktifkan TA terlebih dahulu.');
        router.push('/admin/data_tahun_ajaran');
      }, 500);
    }
  }, [taLoading, taAktif, isAkademikActive, router]);

  useEffect(() => {
    if (isMasterDataActive) setOpenDropdowns((prev) => ({ ...prev, masterData: true }));
    if (isAkademikActive && taAktif) setOpenDropdowns((prev) => ({ ...prev, akademik: true }));
  }, [isMasterDataActive, isAkademikActive, taAktif]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) setOpenDropdowns({ masterData: false, akademik: false });
  };

  const toggleDropdown = (menu: string) => {
    if (!isExpanded) setIsExpanded(true);

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

  const handleNavigation = (url: string) => {
    setOpenDropdowns({
      masterData: masterDataSubmenu.some((item) => item.url === url),
      akademik: akademikSubmenu.some((item) => item.url === url),
    });
    router.push(url);
  };

  const handleAkademikClick = (url: string) => {
    if (!taAktif) {
      alert('⚠️ Tahun Ajaran aktif belum diatur!\n\nSilakan aktifkan Tahun Ajaran terlebih dahulu di menu "Tahun Ajaran".');
      router.push('/admin/data_tahun_ajaran');
      return;
    }
    handleNavigation(url);
  };

  // ── Reusable nav item styles ───────────────────────────────────────────────
  const navBase =
    'sb-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium';
  const navActive =
    'sb-active bg-white text-orange-600 shadow-sm font-semibold';
  const navInactive =
    'text-white hover:bg-white/10 hover:text-white';
  const navDisabled =
    'text-white/40 cursor-not-allowed opacity-60';

  const subItemBase =
    'sb-sub-item w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center mb-1';
  const subItemActive = 'bg-white text-orange-600 font-semibold shadow-sm';
  const subItemInactive = 'text-white hover:bg-white/10 hover:text-white';

  return (
    <div
      className={`flex flex-col h-screen transition-all duration-300 ${isExpanded ? 'w-64' : 'w-[72px]'}`}
      style={{
        background: 'linear-gradient(175deg, #9a3a08 0%, #c95b08 40%, #e8690a 75%, #f5870a 100%)',
      }}
    >
      <SidebarStyles />

      {/* ── Header: Logo + Nama Sekolah ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110 hover:rotate-6"
                style={{ background: 'rgba(255,255,255,0.18)', boxShadow: '0 0 0 3px rgba(255,255,255,0.08)' }}
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
            style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 0 3px rgba(255,255,255,0.08)' }}
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

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sb-scrollbar-none">

        {/* Dashboard */}
        <button
          onClick={() => handleNavigation('/admin/dashboard')}
          className={`${navBase} ${isDashboardActive ? navActive : navInactive}`}
        >
          <span className={`sb-icon-wrap ${isDashboardActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
            <Home className="w-[18px] h-[18px]" />
          </span>
          {isExpanded && <span>Dashboard</span>}
        </button>

        {/* ── MASTER DATA label ── */}
        {isExpanded && (
          <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
            Master Data
          </p>
        )}
        {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

        {/* Tahun Ajaran */}
        <button
          onClick={() => handleNavigation('/admin/data_tahun_ajaran')}
          className={`${navBase} ${isTahunAjaranActive ? navActive : navInactive}`}
        >
          <span className={`sb-icon-wrap ${isTahunAjaranActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
            <Calendar className="w-[18px] h-[18px]" />
          </span>
          {isExpanded && <span>Tahun Ajaran</span>}
        </button>

        {/* Master Data (dropdown) */}
        <div className="mb-1">
          <button
            onClick={() => toggleDropdown('masterData')}
            className={`${navBase} mb-0 ${isMasterDataActive ? navActive : navInactive} justify-between`}
          >
            <div className="flex items-center gap-3">
              <span className={`sb-icon-wrap ${isMasterDataActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                <Database className="w-[18px] h-[18px]" />
              </span>
              {isExpanded && <span>Data Master</span>}
            </div>
            {isExpanded && (
              <ChevronDown
                className={`w-4 h-4 opacity-70 sb-chevron ${openDropdowns.masterData ? 'sb-chevron-open' : ''}`}
              />
            )}
          </button>
          {isExpanded && openDropdowns.masterData && (
            <div
              className="sb-slideDown ml-4 mt-1.5 pl-3.5 py-1.5"
              style={{ borderLeft: '2px solid rgba(255,255,255,0.2)' }}
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

        {/* ── AKADEMIK label (dengan badge TA Aktif) ── */}
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
                  border: '1px solid rgba(255,255,255,0.32)'
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
                  border: '1px solid rgba(239,68,68,0.55)'
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

        {/* Akademik (dropdown) */}
        <div className="mb-1">
          <button
            onClick={() => toggleDropdown('akademik')}
            className={`${navBase} mb-0 justify-between ${!taAktif
              ? navDisabled
              : isAkademikActive
                ? navActive
                : navInactive
              }`}
            title={!taAktif ? 'Aktifkan Tahun Ajaran terlebih dahulu' : ''}
          >
            <div className="flex items-center gap-3">
              <span className={`sb-icon-wrap ${!taAktif ? 'sb-icon-disabled' : isAkademikActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
                {!taAktif ? (
                  <Lock className="w-[18px] h-[18px]" />
                ) : (
                  <FileText className="w-[18px] h-[18px]" />
                )}
              </span>
              {isExpanded && <span>Operasional</span>}
            </div>
            {isExpanded && taAktif && (
              <ChevronDown
                className={`w-4 h-4 opacity-70 sb-chevron ${openDropdowns.akademik ? 'sb-chevron-open' : ''}`}
              />
            )}
          </button>

          {/* Submenu Akademik */}
          {isExpanded && openDropdowns.akademik && taAktif && (
            <div
              className="sb-slideDown ml-4 mt-1.5 pl-3.5 py-1.5"
              style={{ borderLeft: '2px solid rgba(255,255,255,0.2)' }}
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

          {/* Pesan jika TA belum aktif */}
          {isExpanded && !taAktif && !taLoading && (
            <div
              className="sb-fadeIn ml-4 mt-2 px-3 py-2.5 rounded-lg text-[10px] text-white/85"
              style={{ background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.32)' }}
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

        {/* ── SISTEM label ── */}
        {isExpanded && (
          <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
            Sistem
          </p>
        )}
        {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

        {/* Backup & Restore */}
        <button
          onClick={() => handleNavigation('/admin/backup_restore')}
          className={`${navBase} ${isBackupRestoreActive ? navActive : navInactive}`}
        >
          <span className={`sb-icon-wrap ${isBackupRestoreActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
            <Settings className="w-[18px] h-[18px]" />
          </span>
          {isExpanded && <span>Backup &amp; Restore</span>}
        </button>

        {/* ── SAYA label ── */}
        {isExpanded && (
          <p className="sb-fadeIn sb-section-label text-[10px] font-bold tracking-widest text-white/60 uppercase px-4 pt-4 pb-2">
            Saya
          </p>
        )}
        {!isExpanded && <div className="my-3 mx-2 border-t border-white/10" />}

        {/* Profil */}
        <button
          onClick={() => handleNavigation('/admin/profil')}
          className={`${navBase} ${isProfilActive ? navActive : navInactive}`}
        >
          <span className={`sb-icon-wrap ${isProfilActive ? 'sb-icon-active' : 'sb-icon-inactive'}`}>
            <UserCircle className="w-[18px] h-[18px]" />
          </span>
          {isExpanded && <span>Profil</span>}
        </button>
      </div>
    </div>
  );
}