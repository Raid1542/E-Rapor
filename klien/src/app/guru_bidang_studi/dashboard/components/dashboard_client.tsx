/**
 * Nama File: dashboard_client.tsx (GURU BIDANG STUDI)
 * UPDATE: Menyamakan tampilan (warna, kartu, tombol, animasi) dengan dashboard
 *         Admin (BRAND_GRADIENT, PAGE_BG, CARD_STYLE, card-flat/section-card/
 *         item-hover/btn-action, anim-in) agar seluruh aplikasi konsisten.
 *         Hanya lapisan UI yang diubah — semua logika, fetch, dan state tetap
 *         sama persis seperti sebelumnya (status konfigurasi + validasi range gap,
 *         tombol "Atur Sekarang", dsb).
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ChevronRight, Users, Book, TrendingUp,
    Calendar, CheckCircle2, AlertCircle, AlertTriangle,
    MapPin, Check, X as XIcon,
    BookOpen, Settings, Target, School, Star, X,
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ==========================================================================
   INTERFACES
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface KonfigurasiStatus {
    bobot: boolean;
    kategori: boolean;
    lengkap: boolean;
}

interface KomponenDetail {
    nama_komponen: string;
    nilai: number | null;
    status: 'sudah' | 'belum';
}

interface NilaiRaporItem {
    id_siswa: number;
    nama: string;
    nis: string;
    kelas_id: number;
    nama_kelas: string;
    nilai_rapor: number | null;
    deskripsi: string | null;
    jumlah_komponen_terisi: number;
    total_komponen: number;
    status: string;
    komponen_detail?: KomponenDetail[];
}

interface MapelItem {
    id: number;
    nama: string;
    total_kelas: number;
    total_siswa: number;
    sudah_dinilai: number;
    belum_dinilai: number;
    nilai_rapor_list: NilaiRaporItem[];
    konfigurasi: KonfigurasiStatus;
}

interface Jadwal {
    pts: string | null;
    pas: string | null;
}

interface SummaryItem {
    type: 'missing' | 'gap';
    title: string;
    message: string;
}

interface KonfigurasiDetail {
    akademik: { lengkap: boolean; missing: string[]; gaps: Array<{ mapel: string; gaps: string[] }> };
    bobot: { lengkap: boolean; missing: string[] };
    summary: SummaryItem[];
}

interface DashboardData {
    tahun_ajaran: string;
    semester: string;
    status_pts: 'aktif' | 'nonaktif' | 'selesai';
    status_pas: 'aktif' | 'nonaktif' | 'selesai';
    jenis_penilaian_aktif: 'PTS' | 'PAS' | null;
    jadwal: Jadwal;
    total_kelas: number;
    total_siswa: number;
    total_mapel: number;
    total_penilaian_dibutuhkan: number;
    total_penilaian_ada: number;
    overall_progress: number;
    mata_pelajaran_list: MapelItem[];
    total_komponen: number;
    konfigurasi_lengkap?: boolean;
    konfigurasi_detail?: KonfigurasiDetail;
}

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan dashboard Admin / Data Guru / dst.
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const STAT_ICON_COLORS = ['#e8690a', '#c95b08', '#e07b1a', '#d4700f'];

type StatusType = 'aktif' | 'nonaktif' | 'selesai';
const STATUS_CFG: Record<StatusType, { bg: string; color: string; border: string; dot: string; label: string }> = {
    aktif: { bg: '#e6f9f0', color: '#0d6e48', border: '#6dd4c4', dot: '#10b981', label: 'Aktif' },
    selesai: { bg: '#fff7e6', color: '#8b4513', border: '#ffc080', dot: '#f59e0b', label: 'Selesai' },
    nonaktif: { bg: '#f5f5f5', color: '#666666', border: '#d0d0d0', dot: '#9ca3af', label: 'Menunggu' },
};

/* ==========================================================================
   GLOBAL STYLES — identik dengan dashboard Admin
   ========================================================================== */

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes growBar {
            from { transform: scaleX(0); }
            to   { transform: scaleX(1); }
        }
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        .anim-in { animation: fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.10s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.20s; }
        .d5 { animation-delay: 0.25s; }
        .d6 { animation-delay: 0.30s; }

        .grow-bar { transform-origin: left; animation: growBar 0.8s cubic-bezier(0.4,0,0.2,1) forwards; }

        .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }

        /* ── STAT CARD — hover tenang, konsisten dengan dashboard Admin ── */
        .stat-card {
            position: relative;
            overflow: hidden;
            transition: box-shadow 0.22s ease, transform 0.22s ease;
        }
        .stat-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.07) !important;
            transform: translateY(-2px);
        }
        .stat-card:hover .s-icon { transform: scale(1.08); }
        .s-icon { position: relative; z-index: 1; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }

        .section-card { transition: box-shadow 0.2s ease; }
        .section-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important; }

        .item-hover { transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
        .item-hover:hover { background: #fff8f2 !important; }

        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        button:focus-visible { outline: 2.5px solid #f5a623; outline-offset: 2px; }

        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #fbbf78; border-radius: 10px; }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .grow-bar, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .stat-card, .section-card, .item-hover, .btn-action {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

/* ==========================================================================
   SISTEM TOMBOL AKSI — identik dengan dashboard Admin / halaman CRUD lain
   ========================================================================== */

const PrimaryButton = ({
    onClick, children, fullWidth = false,
}: { onClick?: () => void; children: React.ReactNode; fullWidth?: boolean }) => (
    <button
        onClick={onClick}
        className={`btn-action inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap ${fullWidth ? 'w-full' : ''}`}
        style={{ background: BRAND_GRADIENT, border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' }}
    >
        {children}
    </button>
);

const FilterChip = ({
    active, onClick, children, activeBg,
}: { active: boolean; onClick: () => void; children: React.ReactNode; activeBg?: string }) => (
    <button
        onClick={onClick}
        className="btn-action px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all"
        style={active
            ? { background: activeBg || BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}` }
            : { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #e5e7eb' }}
    >
        {children}
    </button>
);

/** Stripe header untuk tiap section card — sama seperti dashboard Admin */
const CardHeader = ({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ background: BRAND_GRADIENT, borderRadius: '14px 14px 0 0' }}>
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.22)' }}>
                {icon}
            </div>
            <div className="min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight truncate">{title}</h3>
                <p className="text-[11px] text-white/70 truncate">{subtitle}</p>
            </div>
        </div>
        {action}
    </div>
);

/* ==========================================================================
   REUSABLE COMPONENTS
   ========================================================================== */

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`section-card card-flat bg-white rounded-2xl ${className}`} style={CARD_STYLE}>
        {children}
    </div>
);

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DashboardClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isNotAssigned, setIsNotAssigned] = useState(false);
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [periodModalShown, setPeriodModalShown] = useState(false);

    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) {
            window.location.href = '/login';
            return;
        }

        try {
            const parsedUser: UserData = JSON.parse(userData);
            if (parsedUser.role !== 'guru_bidang_studi') {
                router.push('/login');
                return;
            }
            setUser(parsedUser);

            const fetchDashboard = async () => {
                try {
                    // ✅ PERUBAHAN 2: URL sekarang pakai API_BASE_URL
                    const res = await fetch(`${API_BASE_URL}/api/guru-bidang-studi/dashboard`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('currentUser');
                        router.push('/login');
                        return;
                    }

                    if (res.status === 403) {
                        const errData = await res.json().catch(() => ({}));
                        if (errData.code === 'NOT_ASSIGNED') {
                            setIsNotAssigned(true);
                            setLoading(false);
                            return;
                        }
                    }

                    if (res.ok) {
                        const result = await res.json();
                        if (result.success && result.data) {
                            setDashboard(result.data);
                            if (result.data.total_mapel === 0) {
                                setIsNotAssigned(true);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error koneksi:', err);
                    showModal({
                        type: 'network',
                        title: 'Koneksi Gagal',
                        message: 'Tidak dapat terhubung ke server.'
                    });
                } finally {
                    setLoading(false);
                }
            };

            fetchDashboard();
        } catch (e) {
            console.error('Error parsing user:', e);
            router.push('/login');
        }
    }, [router, showModal]);

    useEffect(() => {
        if (loading || isNotAssigned || !dashboard) return;

        const isPeriodNotActive = dashboard.status_pts !== 'aktif' && dashboard.status_pas !== 'aktif';
        const isPeriodLocked = dashboard.status_pts === 'selesai' && dashboard.status_pas === 'selesai';

        if ((isPeriodNotActive || isPeriodLocked) && !periodModalShown) {
            setShowPeriodModal(true);
            setPeriodModalShown(true);
        }
    }, [dashboard, loading, isNotAssigned, periodModalShown]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto" />
                    <p className="mt-4 text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-3 sm:p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {modal && <NotifModal modal={modal} onClose={closeModal} />}
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 flex flex-col items-center gap-4 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
                            <AlertCircle size={36} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-1.5">Akses Ditolak</h3>
                            <p className="text-sm text-gray-500">Anda belum ditugaskan mengajar mata pelajaran.</p>
                        </div>
                        <button onClick={handleLogout} className="btn-action w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || !dashboard) return null;

    const userName = user.nama || user.name || user.nama_lengkap || 'Guru';
    const isPeriodNotActive = dashboard.status_pts !== 'aktif' && dashboard.status_pas !== 'aktif';
    const isPeriodLocked = dashboard.status_pts === 'selesai' && dashboard.status_pas === 'selesai';

    const statValues = [dashboard.total_mapel, dashboard.total_kelas, dashboard.total_siswa, `${dashboard.overall_progress}%`];
    const statLabels = ['Mata Pelajaran', 'Total Kelas', 'Total Siswa', 'Progress Penilaian'];
    const statDescs = [
        'Total mapel yang Anda ajar',
        'Kelas yang Anda ajar',
        `${dashboard.total_penilaian_ada} sudah dinilai`,
        `${dashboard.total_penilaian_ada} dari ${dashboard.total_penilaian_dibutuhkan} penilaian`,
    ];
    const statIcons = [
        <Book className="w-5 h-5 text-white" />,
        <School className="w-5 h-5 text-white" />,
        <Users className="w-5 h-5 text-white" />,
        <Target className="w-5 h-5 text-white" />,
    ];

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6 md:p-8" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* HEADER — teks polos, konsisten dengan dashboard Admin */}
            <div className="mb-6 sm:mb-8 anim-in d1">
                <div className="flex items-center gap-2 mb-2">
                    <Star className="w-3.5 h-3.5" style={{ color: ACCENT_DARK }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT_DARK }}>
                        Dashboard Guru Bidang Studi
                    </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    Selamat datang, {userName} 👋
                </h1>
                <p className="text-sm text-gray-400">
                    Kelola penilaian siswa dengan mudah dan efisien
                </p>
                <div className="mt-5 h-px bg-gray-200" />
            </div>

            {/* STATISTICS CARDS — kartu putih netral, identitas warna di kotak ikon */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 sm:mb-8">
                {statLabels.map((label, index) => (
                    <div
                        key={label}
                        className={`stat-card card-flat bg-white rounded-2xl p-5 anim-in d${index + 1}`}
                        style={CARD_STYLE}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="s-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: STAT_ICON_COLORS[index] }}>
                                {statIcons[index]}
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-1">{statValues[index]}</p>
                        <p className="text-sm font-bold mb-2" style={{ color: STAT_ICON_COLORS[index] }}>{label}</p>
                        <p className="text-xs text-gray-400">{statDescs[index]}</p>
                    </div>
                ))}
            </div>

            {/* PROGRESS PER MAPEL */}
            <div className="anim-in d2 mb-6 sm:mb-8">
                <Card className="overflow-hidden">
                    <CardHeader
                        icon={<TrendingUp className="w-5 h-5 text-white" />}
                        title="Progress Penilaian per Mata Pelajaran"
                        subtitle={dashboard.jenis_penilaian_aktif
                            ? `Periode ${dashboard.jenis_penilaian_aktif} • ${dashboard.total_komponen} komponen`
                            : 'Status input nilai siswa'}
                        action={
                            <button
                                onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                                className="btn-action inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap transition-all flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.2)' }}
                            >
                                <span className="hidden sm:inline">Input Nilai</span> <ChevronRight className="w-4 h-4" />
                            </button>
                        }
                    />

                    <div className="p-4 sm:p-6 bg-white">
                        {dashboard.mata_pelajaran_list.length === 0 ? (
                            <div className="text-center py-14">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fff5eb' }}>
                                    <BookOpen className="w-8 h-8" style={{ color: ACCENT }} />
                                </div>
                                <p className="text-base font-bold mb-1 text-gray-800">Belum ada mata pelajaran</p>
                                <p className="text-sm text-gray-400">Hubungi administrator untuk penugasan</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dashboard.mata_pelajaran_list.map((mapel) => (
                                    <MapelCard key={mapel.id} mapel={mapel} jenisAktif={dashboard.jenis_penilaian_aktif} />
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* BOTTOM SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 sm:mb-8">
                {/* Jadwal */}
                <Card>
                    <CardHeader
                        icon={<Calendar size={17} className="text-white" />}
                        title="Jadwal Penting"
                        subtitle="Status periode penilaian"
                    />
                    <div className="p-5 bg-white space-y-3">
                        <JadwalItem label="PTS" status={dashboard.status_pts} tanggal={dashboard.jadwal.pts} />
                        <JadwalItem label="PAS" status={dashboard.status_pas} tanggal={dashboard.jadwal.pas} />
                    </div>
                </Card>

                {/* Status Konfigurasi */}
                <Card>
                    <CardHeader
                        icon={<Settings size={17} className="text-white" />}
                        title="Status Konfigurasi"
                        subtitle="Kelengkapan bobot & kategori"
                    />
                    <div className="p-5 bg-white">
                        {dashboard.konfigurasi_lengkap ? (
                            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#e6f9f0', border: '1.5px solid #6dd4c4' }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white flex-shrink-0">
                                    <CheckCircle2 size={20} style={{ color: '#0d6e48' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: '#0d6e48' }}>Semua Konfigurasi Sudah Lengkap</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#0d6e48' }}>Semua pengaturan penilaian sudah siap digunakan</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
                                {dashboard.konfigurasi_detail?.summary.map((item, index) => (
                                    <div key={index} className="p-4 rounded-xl item-hover" style={{
                                        background: item.type === 'gap' ? '#fff7ed' : '#fef2f2',
                                        border: item.type === 'gap' ? '1.5px solid #fdba74' : '1.5px solid #fca5a5'
                                    }}>
                                        <div className="flex items-start gap-3">
                                            {item.type === 'gap' ? (
                                                <AlertTriangle size={17} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XIcon size={17} className="text-red-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold mb-1 ${item.type === 'gap' ? 'text-amber-800' : 'text-red-800'}`}>
                                                    {item.type === 'gap' ? 'Range Belum Lengkap' : 'Belum Diatur'}
                                                </p>
                                                <p className="text-xs font-semibold mb-1" style={{ color: item.type === 'gap' ? '#92400e' : '#991b1b' }}>
                                                    {item.title}
                                                </p>
                                                <p className={`text-xs ${item.type === 'gap' ? 'text-amber-700' : 'text-red-700'} break-words`}>
                                                    {item.message}
                                                </p>
                                                <button
                                                    onClick={() => router.push('/guru_bidang_studi/atur_penilaian')}
                                                    className="btn-action mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                                                    style={{ background: BRAND_GRADIENT }}
                                                >
                                                    Atur Sekarang <ChevronRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* MODAL PERIODE */}
            {showPeriodModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPeriodModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-13 h-13 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52 }}>
                                <AlertCircle size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                {isPeriodLocked ? 'Periode Selesai' : 'Periode Belum Aktif'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            {isPeriodLocked
                                ? 'Baik PTS maupun PAS telah selesai. Data nilai sudah dikunci dan tidak dapat diubah.'
                                : 'Baik PTS maupun PAS belum dibuka oleh admin. Anda dapat melihat data dashboard, tetapi belum dapat menginput nilai siswa.'}
                        </p>
                        <button
                            onClick={() => setShowPeriodModal(false)}
                            className="btn-action w-full py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}
                        >
                            OK, Mengerti
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ==========================================================================
   HELPER COMPONENTS
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <AlertCircle size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <AlertCircle size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <X size={18} />
                </button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
                    {s.icon}
                </div>
                <div className="text-center w-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

const JadwalItem = ({ label, status, tanggal }: { label: string; status: string; tanggal: string | null }) => {
    const c = STATUS_CFG[(status as StatusType) || 'nonaktif'];

    return (
        <div className="item-hover flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: status === 'aktif' ? BRAND_GRADIENT : '#e5e7eb' }}>
                    <AlertCircle size={18} className={status === 'aktif' ? 'text-white' : 'text-gray-400'} />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800 mb-0.5">{label}</p>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                        {c.label}
                    </span>
                </div>
            </div>
            <span className="text-sm font-bold px-3 py-1.5 rounded-lg bg-white" style={{ color: ACCENT_DARK, border: '1px solid #ececec' }}>
                {tanggal || '-'}
            </span>
        </div>
    );
};

const MapelCard = ({ mapel, jenisAktif }: { mapel: MapelItem; jenisAktif: string | null }) => {
    const [showDetail, setShowDetail] = useState(false);
    const [filterKelas, setFilterKelas] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete'>('incomplete');

    const percentage = mapel.total_siswa > 0 ? Math.round((mapel.sudah_dinilai / mapel.total_siswa) * 100) : 0;
    const isComplete = percentage === 100;

    const kelasList = useMemo(() => Array.from(new Set(mapel.nilai_rapor_list.map(s => s.nama_kelas))).sort(), [mapel.nilai_rapor_list]);

    const filteredSiswa = useMemo(() => {
        return mapel.nilai_rapor_list
            .filter(s => {
                if (filterKelas !== 'all' && s.nama_kelas !== filterKelas) return false;
                if (filterStatus === 'incomplete' && s.jumlah_komponen_terisi === s.total_komponen) return false;
                return true;
            })
            .sort((a, b) => {
                if (a.jumlah_komponen_terisi === a.total_komponen && b.jumlah_komponen_terisi < b.total_komponen) return 1;
                if (a.jumlah_komponen_terisi < a.total_komponen && b.jumlah_komponen_terisi === b.total_komponen) return -1;
                return a.nama_kelas.localeCompare(b.nama_kelas);
            });
    }, [mapel.nilai_rapor_list, filterKelas, filterStatus]);

    const groupedByKelas = useMemo(() => {
        return filteredSiswa.reduce((acc, siswa) => {
            if (!acc[siswa.nama_kelas]) acc[siswa.nama_kelas] = [];
            acc[siswa.nama_kelas].push(siswa);
            return acc;
        }, {} as Record<string, typeof filteredSiswa>);
    }, [filteredSiswa]);

    const incompleteCount = mapel.nilai_rapor_list.filter(s => s.jumlah_komponen_terisi < s.total_komponen).length;

    return (
        <div className="item-hover rounded-2xl p-4 sm:p-5 transition-all" style={{ border: `1.5px solid ${isComplete ? '#86efac' : '#ececec'}`, background: isComplete ? '#f0fdf4' : '#fff' }}>
            <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: isComplete ? '#16a34a' : BRAND_GRADIENT }}>
                        {isComplete ? <CheckCircle2 size={19} /> : <BookOpen size={19} />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold mb-1 text-gray-900 truncate">{mapel.nama}</p>
                        <p className="text-xs sm:text-sm text-gray-400">{mapel.total_kelas} kelas • {mapel.total_siswa} siswa</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className={`text-2xl sm:text-3xl font-bold ${isComplete ? 'text-green-600' : ''}`} style={!isComplete ? { color: ACCENT_DARK } : undefined}>{percentage}%</p>
                    <p className="text-xs text-gray-400">{isComplete ? 'Selesai' : 'Berjalan'}</p>
                </div>
            </div>

            <div className="h-2.5 rounded-full overflow-hidden mb-4 bg-orange-50">
                <div className="grow-bar h-full rounded-full" style={{ width: `${percentage}%`, background: isComplete ? '#16a34a' : BRAND_GRADIENT }} />
            </div>

            <button
                onClick={() => setShowDetail(!showDetail)}
                className="btn-action w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all"
                style={{
                    background: isComplete ? '#e6f9f0' : '#fff7e6',
                    color: isComplete ? '#0d6e48' : '#8b4513',
                    border: `1.5px solid ${isComplete ? '#6dd4c4' : '#ffc080'}`
                }}
            >
                <span className="text-center sm:text-left">
                    {isComplete ? 'Semua siswa sudah lengkap' : `${incompleteCount} siswa belum lengkap`}
                </span>
                <span className="flex-shrink-0">
                    {showDetail ? 'Sembunyikan Detail' : 'Lihat Detail'}
                </span>
            </button>

            {showDetail && (
                <div className="mt-5 pt-5 border-t" style={{ borderColor: '#ececec' }}>
                    {/* Filter Kelas */}
                    <div className="mb-4">
                        <p className="text-xs font-bold mb-2 text-gray-500">Filter Kelas:</p>
                        <div className="flex gap-2 flex-wrap">
                            <FilterChip active={filterKelas === 'all'} onClick={() => setFilterKelas('all')}>Semua Kelas</FilterChip>
                            {kelasList.map(k => (
                                <FilterChip key={k} active={filterKelas === k} onClick={() => setFilterKelas(k)}>{k}</FilterChip>
                            ))}
                        </div>
                    </div>

                    {/* Filter Status */}
                    <div className="mb-5">
                        <p className="text-xs font-bold mb-2 text-gray-500">Filter Status:</p>
                        <div className="flex gap-2">
                            <div className="flex-1"><FilterChip active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}><span className="w-full block text-center">Semua Siswa</span></FilterChip></div>
                            <div className="flex-1"><FilterChip active={filterStatus === 'incomplete'} onClick={() => setFilterStatus('incomplete')} activeBg="#ef4444"><span className="w-full block text-center">Belum Lengkap ({incompleteCount})</span></FilterChip></div>
                        </div>
                    </div>

                    {/* Daftar Siswa */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                        {Object.entries(groupedByKelas).map(([kelasName, siswaList]) => (
                            <div key={kelasName}>
                                <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ background: '#fff5eb', border: '1.5px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} style={{ color: ACCENT_DARK }} />
                                        <p className="text-sm font-bold" style={{ color: ACCENT_DARK }}>Kelas {kelasName}</p>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white" style={{ color: ACCENT_DARK }}>{siswaList.filter(s => s.jumlah_komponen_terisi < s.total_komponen).length} belum lengkap</span>
                                </div>
                                <div className="space-y-3 ml-1 sm:ml-3">
                                    {siswaList.map(siswa => (
                                        <div key={siswa.id_siswa} className="p-4 rounded-xl" style={{ background: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#f0fdf4' : '#fff', border: `1.5px solid ${siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#86efac' : '#fca5a5'}` }}>
                                            <div className="flex items-start justify-between mb-3 gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm sm:text-base font-bold mb-0.5 text-gray-900 truncate">{siswa.nama}</p>
                                                    <p className="text-xs text-gray-400">NIS: {siswa.nis}</p>
                                                </div>
                                                {siswa.jumlah_komponen_terisi === siswa.total_komponen ? (
                                                    <span className="text-[11px] font-bold text-green-700 px-2.5 py-1 rounded-lg bg-green-100 flex-shrink-0">LENGKAP</span>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-red-700 px-2.5 py-1 rounded-lg bg-red-100 flex-shrink-0">BELUM</span>
                                                )}
                                            </div>

                                            {jenisAktif === 'PAS' && siswa.komponen_detail && siswa.komponen_detail.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    {siswa.komponen_detail.map((komp, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 text-xs sm:text-sm">
                                                            {komp.status === 'sudah' ? <Check size={13} className="text-green-600 flex-shrink-0" /> : <XIcon size={13} className="text-red-600 flex-shrink-0" />}
                                                            <span className={`font-medium truncate ${komp.status === 'sudah' ? 'text-gray-700' : 'text-gray-500'}`}>{komp.nama_komponen}:</span>
                                                            <span className={`font-bold ${komp.status === 'sudah' ? 'text-green-700' : 'text-red-600'}`}>{komp.nilai ?? '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mb-3">
                                                    <div className="h-2 rounded-full overflow-hidden bg-gray-200">
                                                        <div className="h-full rounded-full" style={{
                                                            width: `${(siswa.jumlah_komponen_terisi / siswa.total_komponen) * 100}%`,
                                                            background: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#16a34a' : '#ef4444'
                                                        }} />
                                                    </div>
                                                    <p className="text-xs mt-1 text-gray-400">
                                                        {jenisAktif === 'PTS'
                                                            ? `${siswa.jumlah_komponen_terisi > 0 ? 'Sudah' : 'Belum'} input PTS`
                                                            : `${siswa.jumlah_komponen_terisi}/${siswa.total_komponen} komponen terisi`
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                            {siswa.nilai_rapor !== null && (
                                                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#ececec' }}>
                                                    <span className="text-xs sm:text-sm font-bold text-gray-500">Nilai Rapor:</span>
                                                    <span className="text-xl sm:text-2xl font-bold text-green-700">{siswa.nilai_rapor}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};