"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ChevronRight, Users, Book, TrendingUp,
    Calendar, CheckCircle2, AlertCircle, AlertTriangle, X,
    MapPin, Check, X as XIcon,
    BookOpen, Settings, Target, School, ArrowUpRight,
    ClipboardList, Award, FileText, Lock, CalendarDays,
    Clock, Hourglass
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ Deploy-ready: URL API diambil dari environment variable, fallback ke localhost saat dev
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ==========================================================================
   INTERFACES (tidak diubah)
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

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
}

interface Jadwal {
    pts: string | null;
    pas: string | null;
}

interface ProgressLainnya {
    absensi: { sudah: number; total: number; persentase: number; };
    kokurikuler: { sudah: number; total: number; persentase: number; subtitle?: string; };
    catatan_wali_kelas: { sudah: number; total: number; persentase: number; };
    ekskul: { sudah: number; total: number; persentase: number; tersedia: boolean; };
}

interface SummaryItem {
    type: 'missing' | 'gap';
    title: string;
    message: string;
}

interface KonfigurasiDetail {
    kokurikuler: { lengkap: boolean; missing: string[]; gaps: Array<{ aspek: string; gaps: string[] }>; };
    akademik: { lengkap: boolean; missing: string[]; gaps: Array<{ mapel: string; gaps: string[] }>; };
    deskripsi_rata_rata: { lengkap: boolean; missing: string[]; gaps: string[]; };
    bobot: { lengkap: boolean; missing: string[]; };
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
    progress_lainnya?: ProgressLainnya;
}

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan Dashboard Admin / Data Guru / Data Siswa
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const THEME = {
    statCards: [
        { iconBg: '#e8690a' },
        { iconBg: '#c95b08' },
        { iconBg: '#e07b1a' },
        { iconBg: '#d4700f' },
    ],
    primary: ACCENT_DARK,
    primaryMid: ACCENT,
    semantic: { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
};

type StatusType = 'aktif' | 'nonaktif' | 'selesai';
const STATUS_CFG: Record<StatusType, { bg: string; color: string; border: string; dot: string; label: string }> = {
    aktif:    { bg: '#e6f9f0', color: '#0d6e48', border: '#6dd4c4', dot: '#10b981', label: 'Aktif'        },
    selesai:  { bg: '#fff7e6', color: '#8b4513', border: '#ffc080', dot: '#f59e0b', label: 'Selesai'      },
    nonaktif: { bg: '#f5f5f5', color: '#666666', border: '#d0d0d0', dot: '#9ca3af', label: 'Belum Aktif'  },
};

/* ==========================================================================
   GLOBAL STYLES — identik dengan Dashboard Admin (anim-in, grow-bar, pulse-dot,
   stat-card, section-card, item-hover, btn-action)
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
        @keyframes pulseDot {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.35; }
        }

        .anim-in { animation: fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.10s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.20s; }
        .d5 { animation-delay: 0.25s; }
        .d6 { animation-delay: 0.30s; }

        .grow-bar { transform-origin: left; animation: growBar 0.8s cubic-bezier(0.4,0,0.2,1) forwards; }
        .pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }

        .stat-card {
            position: relative;
            overflow: hidden;
            transition: box-shadow 0.22s ease, transform 0.22s ease;
        }
        .stat-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.07) !important;
            transform: translateY(-2px);
        }
        .stat-card:hover .s-icon  { transform: scale(1.08); }
        .s-icon  { position: relative; z-index: 1; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .s-value { position: relative; z-index: 1; display: inline-block; }

        .section-card { transition: box-shadow 0.2s ease; }
        .section-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important; }

        .item-hover {
            transition: background 0.15s ease, box-shadow 0.15s ease;
            cursor: pointer;
        }
        .item-hover:hover { background: #fff8f2 !important; }

        .btn-action {
            transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease;
        }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #f0953a;
            border-radius: 10px;
        }

        button:focus-visible {
            outline: 2.5px solid #f5a623;
            outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .grow-bar, .pulse-dot, .stat-card, .section-card, .item-hover, .btn-action {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

/* ==========================================================================
   SISTEM TOMBOL & KOMPONEN BERSAMA — identik dengan Dashboard Admin
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

const CardHeader = ({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) => (
    <div
        className="flex items-center justify-between gap-3 px-6 py-4"
        style={{ background: BRAND_GRADIENT, borderRadius: '14px 14px 0 0' }}
    >
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

const StatusBadge = ({ status }: { status: StatusType }) => {
    const c = STATUS_CFG[status];
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'aktif' ? 'pulse-dot' : ''}`} style={{ background: c.dot }} />
            {c.label}
        </span>
    );
};

const Spinner = () => (
    <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin" />
    </div>
);

/* ==========================================================================
   PROGRESS CARD (Kelengkapan Rapor) — versi flat, konsisten dengan
   kartu "Kelengkapan Rapor per Kelas" di Dashboard Admin
   ========================================================================== */

const ProgressCard = ({
    title, icon, sudah, total, persentase, color, subtitle, link
}: {
    title: string; icon: React.ReactNode; sudah: number; total: number;
    persentase: number; color: string; subtitle?: string; link?: string;
}) => {
    const router = useRouter();
    const isComplete = persentase === 100;

    return (
        <div
            className="item-hover p-4 rounded-xl"
            style={{ background: '#fafafa', border: '1px solid #ececec' }}
            onClick={() => link && router.push(link)}
        >
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color }}
                >
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{title}</p>
                    {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
                </div>
                {isComplete && <CheckCircle2 size={16} style={{ color: THEME.semantic.success }} className="flex-shrink-0" />}
            </div>

            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{sudah}/{total} siswa</span>
                <span className="text-sm font-bold" style={{ color: ACCENT_DARK }}>{persentase}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                    className="grow-bar h-full rounded-full"
                    style={{ width: `${persentase}%`, background: isComplete ? THEME.semantic.success : BRAND_GRADIENT }}
                />
            </div>
        </div>
    );
};

const ProgressCardLocked = ({
    title, icon, message
}: {
    title: string; icon: React.ReactNode; message: string;
}) => (
    <div className="p-4 rounded-xl opacity-70" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
        <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#d1d5db' }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-500">{title}</p>
            </div>
            <Lock size={16} className="text-gray-400 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#fff7e6', border: '1px solid #ffc080' }}>
            <Lock size={12} style={{ color: ACCENT_DARK }} className="flex-shrink-0" />
            <p className="text-xs font-medium" style={{ color: '#8b4513' }}>{message}</p>
        </div>
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

            if (parsedUser.role !== 'guru_kelas') {
                router.push('/login');
                return;
            }
            setUser(parsedUser);

            const fetchDashboard = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/guru-kelas/dashboard`, {
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
                            // Guru kelas yang sudah ditugaskan di tabel guru_kelas
                            // harus tetap bisa akses dashboard meskipun total_mapel = 0
                            // (belum ada pembelajaran yang di-assign)
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
                    <p className="mt-4 text-sm font-semibold" style={{ color: THEME.primary }}>Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {modal && <NotifModal modal={modal} onClose={closeModal} />}
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 anim-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4" style={CARD_STYLE}>
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-500">Anda belum ditugaskan sebagai guru kelas.</p>
                        </div>
                        <PrimaryButton fullWidth onClick={handleLogout}>Logout</PrimaryButton>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || !dashboard) return null;

    const userName = user.nama_lengkap || user.nama || user.name || 'Guru';
    const isPeriodNotActive = dashboard.status_pts !== 'aktif' && dashboard.status_pas !== 'aktif';
    const isPeriodLocked = dashboard.status_pts === 'selesai' && dashboard.status_pas === 'selesai';

    const statValues = [
        { value: dashboard.total_mapel, label: 'Mata Pelajaran', desc: 'Total mapel yang diajar', icon: <Book className="w-5 h-5 text-white" /> },
        { value: dashboard.total_kelas, label: 'Total Kelas', desc: 'Kelas yang Anda ajar', icon: <School className="w-5 h-5 text-white" /> },
        { value: dashboard.total_siswa, label: 'Total Siswa', desc: `${dashboard.total_penilaian_ada} sudah dinilai`, icon: <Users className="w-5 h-5 text-white" /> },
        { value: `${dashboard.overall_progress}%`, label: 'Progress Penilaian', desc: `${dashboard.total_penilaian_ada} dari ${dashboard.total_penilaian_dibutuhkan} penilaian`, icon: <Target className="w-5 h-5 text-white" /> },
    ];

    return (
        <div className="flex-1 min-h-screen p-8" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* HEADER — identik dengan header Dashboard Admin */}
            <div className="mb-8 anim-in d1">
                <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill={ACCENT_DARK} />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT_DARK }}>
                        Dashboard Guru Kelas
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Selamat datang, {userName} 👋
                </h1>
                <p className="text-sm text-gray-400">
                    Kelola penilaian siswa kelas Anda dengan mudah dan efisien
                </p>
                <div className="mt-5 h-px bg-gray-200" />
            </div>

            {/* STATISTICS CARDS — sama persis dengan pola stat-card Dashboard Admin */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {statValues.map((stat, index) => {
                    const cardStyle = THEME.statCards[index] || THEME.statCards[0];
                    return (
                        <div
                            key={stat.label}
                            className={`stat-card card-flat bg-white rounded-2xl p-5 anim-in d${index + 1}`}
                            style={CARD_STYLE}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="s-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: cardStyle.iconBg }}>
                                    {stat.icon}
                                </div>
                                <ArrowUpRight className="w-4 h-4 opacity-40" style={{ color: cardStyle.iconBg }} />
                            </div>
                            <p className="s-value text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                            <p className="text-sm font-bold mb-1" style={{ color: cardStyle.iconBg }}>{stat.label}</p>
                            <p className="text-xs text-gray-400">{stat.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* PROGRESS PER MAPEL */}
            <div
                className="section-card card-flat bg-white rounded-2xl overflow-hidden mb-6 anim-in d2"
                style={CARD_STYLE}
            >
                <CardHeader
                    icon={<TrendingUp className="w-5 h-5 text-white" />}
                    title="Progress Penilaian per Mata Pelajaran"
                    subtitle={
                        dashboard.jenis_penilaian_aktif
                            ? `Periode ${dashboard.jenis_penilaian_aktif} • ${dashboard.total_komponen} komponen`
                            : 'Status input nilai siswa'
                    }
                    action={
                        <button
                            onClick={() => router.push('/guru_kelas/input_nilai')}
                            className="btn-action inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white whitespace-nowrap flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            Input Nilai <ChevronRight className="w-4 h-4" />
                        </button>
                    }
                />

                <div className="p-6 bg-white">
                    {dashboard.mata_pelajaran_list.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                <BookOpen className="w-8 h-8" style={{ color: ACCENT }} />
                            </div>
                            <p className="text-base font-bold text-gray-700 mb-1">Belum ada mata pelajaran</p>
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
            </div>

            {/* PROGRESS KELENGKAPAN RAPOR */}
            {dashboard.progress_lainnya && dashboard.jenis_penilaian_aktif && (
                <div
                    className="section-card card-flat bg-white rounded-2xl overflow-hidden mb-6 anim-in d3"
                    style={CARD_STYLE}
                >
                    <CardHeader
                        icon={<ClipboardList className="w-5 h-5 text-white" />}
                        title="Progress Kelengkapan Rapor"
                        subtitle={`Status kelengkapan data rapor siswa • Periode ${dashboard.jenis_penilaian_aktif}`}
                    />

                    <div className="p-6 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ProgressCard
                                title="Absensi"
                                icon={<CalendarDays className="w-5 h-5 text-white" />}
                                sudah={dashboard.progress_lainnya.absensi.sudah}
                                total={dashboard.progress_lainnya.absensi.total}
                                persentase={dashboard.progress_lainnya.absensi.persentase}
                                color={THEME.statCards[0].iconBg}
                                link="/guru_kelas/absensi_siswa"
                            />

                            <ProgressCard
                                title="Kokurikuler"
                                icon={<Award className="w-5 h-5 text-white" />}
                                sudah={dashboard.progress_lainnya.kokurikuler.sudah}
                                total={dashboard.progress_lainnya.kokurikuler.total}
                                persentase={dashboard.progress_lainnya.kokurikuler.persentase}
                                color={THEME.statCards[1].iconBg}
                                subtitle={dashboard.progress_lainnya.kokurikuler.subtitle}
                                link="/guru_kelas/kokurikuler"
                            />

                            <ProgressCard
                                title="Catatan Wali Kelas"
                                icon={<FileText className="w-5 h-5 text-white" />}
                                sudah={dashboard.progress_lainnya.catatan_wali_kelas.sudah}
                                total={dashboard.progress_lainnya.catatan_wali_kelas.total}
                                persentase={dashboard.progress_lainnya.catatan_wali_kelas.persentase}
                                color={THEME.statCards[2].iconBg}
                                link="/guru_kelas/catatan_wali_kelas"
                            />

                            {dashboard.progress_lainnya.ekskul.tersedia ? (
                                <ProgressCard
                                    title="Ekstrakurikuler"
                                    icon={<Users className="w-5 h-5 text-white" />}
                                    sudah={dashboard.progress_lainnya.ekskul.sudah}
                                    total={dashboard.progress_lainnya.ekskul.total}
                                    persentase={dashboard.progress_lainnya.ekskul.persentase}
                                    color={THEME.statCards[3].iconBg}
                                    link="/guru_kelas/ekstrakurikuler"
                                />
                            ) : (
                                <ProgressCardLocked
                                    title="Ekstrakurikuler"
                                    icon={<Users className="w-5 h-5 text-white" />}
                                    message="Hanya tersedia saat PAS aktif"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Jadwal Penting */}
                <div
                    className="section-card card-flat bg-white rounded-2xl overflow-hidden anim-in d4"
                    style={CARD_STYLE}
                >
                    <CardHeader
                        icon={<Calendar className="w-5 h-5 text-white" />}
                        title="Jadwal Penting"
                        subtitle="Status periode penilaian"
                    />
                    <div className="p-5 bg-white space-y-3">
                        <div
                            className="item-hover p-4 rounded-xl"
                            style={{ background: '#fafafa', border: '1px solid #ececec' }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: dashboard.status_pts === 'aktif' ? BRAND_GRADIENT : '#d1d5db' }}
                                    >
                                        <Clock size={18} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 mb-0.5">PTS</p>
                                        <p className="text-[11px] text-gray-400">Penilaian Tengah Semester</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <StatusBadge status={dashboard.status_pts} />
                                    <p className="text-xs font-bold mt-1.5" style={{ color: ACCENT_DARK }}>{dashboard.jadwal.pts || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div
                            className="item-hover p-4 rounded-xl"
                            style={{ background: '#fafafa', border: '1px solid #ececec' }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: dashboard.status_pas === 'aktif' ? BRAND_GRADIENT :
                                                        dashboard.status_pas === 'selesai' ? '#f0953a' : '#d1d5db'
                                        }}
                                    >
                                        {dashboard.status_pas === 'selesai'
                                            ? <CheckCircle2 size={18} className="text-white" />
                                            : <Hourglass size={18} className="text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 mb-0.5">PAS</p>
                                        <p className="text-[11px] text-gray-400">Penilaian Akhir Semester</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <StatusBadge status={dashboard.status_pas} />
                                    <p className="text-xs font-bold mt-1.5" style={{ color: ACCENT_DARK }}>{dashboard.jadwal.pas || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Konfigurasi */}
                <div
                    className="section-card card-flat bg-white rounded-2xl overflow-hidden anim-in d5"
                    style={CARD_STYLE}
                >
                    <CardHeader
                        icon={<Settings className="w-5 h-5 text-white" />}
                        title="Status Konfigurasi"
                        subtitle="Kelengkapan bobot & kategori"
                    />
                    <div className="p-5 bg-white">
                        {dashboard.konfigurasi_lengkap ? (
                            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#e6f9f0', border: '1px solid #6dd4c4' }}>
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
                                    <div
                                        key={index}
                                        className="p-4 rounded-xl"
                                        style={{
                                            background: item.type === 'gap' ? '#fff7e6' : '#fef2f2',
                                            border: item.type === 'gap' ? '1px solid #ffc080' : '1px solid #fca5a5'
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {item.type === 'gap' ? (
                                                <AlertTriangle size={16} style={{ color: '#f59e0b' }} className="flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <X size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold mb-1" style={{ color: item.type === 'gap' ? '#8b4513' : '#991b1b' }}>
                                                    {item.type === 'gap' ? 'Range Belum Lengkap' : 'Belum Diatur'}
                                                </p>
                                                <p className="text-xs font-semibold mb-1" style={{ color: item.type === 'gap' ? '#92400e' : '#991b1b' }}>
                                                    {item.title}
                                                </p>
                                                <p className="text-xs break-words" style={{ color: item.type === 'gap' ? '#92400e' : '#b91c1c' }}>
                                                    {item.message}
                                                </p>
                                                <button
                                                    onClick={() => router.push('/guru_kelas/atur_penilaian')}
                                                    className="btn-action mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
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
                </div>
            </div>

            {/* MODAL PERIODE */}
            {showPeriodModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 anim-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPeriodModal(false)} />
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-8" style={CARD_STYLE}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fff7e6' }}>
                                <AlertCircle size={28} style={{ color: ACCENT_DARK }} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {isPeriodLocked ? 'Periode Selesai' : 'Periode Belum Aktif'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            {isPeriodLocked
                                ? 'Baik PTS maupun PAS telah selesai. Data nilai sudah dikunci dan tidak dapat diubah.'
                                : 'Baik PTS maupun PAS belum dibuka oleh admin. Anda dapat melihat data dashboard, tetapi belum dapat menginput nilai siswa.'}
                        </p>
                        <PrimaryButton fullWidth onClick={() => setShowPeriodModal(false)}>
                            OK, Mengerti
                        </PrimaryButton>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ==========================================================================
   HELPER COMPONENTS
   ========================================================================== */

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const styles: any = {
        success: { bg: 'bg-green-50', text: 'text-green-500', btn: 'bg-green-500' },
        error: { bg: 'bg-red-50', text: 'text-red-500', btn: 'bg-red-500' },
        warning: { bg: 'bg-orange-50', text: 'text-orange-500', btn: 'bg-orange-500' },
        network: { bg: 'bg-slate-100', text: 'text-slate-500', btn: 'bg-slate-600' },
    };
    const s = styles[modal.type];

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 anim-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4" style={CARD_STYLE}>
                <div className={`w-16 h-16 rounded-full ${s.bg} flex items-center justify-center ring-8 ring-white`}>
                    <AlertCircle size={40} className={s.text} />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-semibold py-3 rounded-xl`}>OK, Mengerti</button>
            </div>
        </div>
    );
};

const MapelCard = ({ mapel, jenisAktif }: { mapel: MapelItem; jenisAktif: string | null }) => {
    const router = useRouter();
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
        <div className="item-hover rounded-2xl p-5" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: isComplete ? THEME.semantic.success : BRAND_GRADIENT }}
                    >
                        {isComplete ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-bold text-gray-800 truncate">{mapel.nama}</p>
                        <p className="text-xs text-gray-400">{mapel.total_kelas} kelas • {mapel.total_siswa} siswa</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold" style={{ color: isComplete ? THEME.semantic.success : ACCENT_DARK }}>{percentage}%</p>
                    <p className="text-[11px] text-gray-400">{isComplete ? 'Selesai' : 'Berjalan'}</p>
                </div>
            </div>

            <div className="h-2.5 rounded-full overflow-hidden mb-4 bg-gray-100">
                <div
                    className="grow-bar h-full rounded-full"
                    style={{ width: `${percentage}%`, background: isComplete ? THEME.semantic.success : BRAND_GRADIENT }}
                />
            </div>

            <button
                onClick={() => setShowDetail(!showDetail)}
                className="btn-action w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-bold"
                style={{
                    background: isComplete ? '#e6f9f0' : '#fff7e6',
                    color: isComplete ? '#0d6e48' : '#8b4513',
                    border: `1px solid ${isComplete ? '#6dd4c4' : '#ffc080'}`
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
                <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ececec' }}>
                    <div className="mb-4">
                        <p className="text-xs font-bold mb-2 text-gray-500">Filter Kelas:</p>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilterKelas('all')}
                                className={`btn-action px-4 py-2 rounded-lg text-xs font-bold ${filterKelas === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                                style={filterKelas === 'all' ? { background: BRAND_GRADIENT } : {}}
                            >
                                Semua Kelas
                            </button>
                            {kelasList.map(k => (
                                <button
                                    key={k}
                                    onClick={() => setFilterKelas(k)}
                                    className={`btn-action px-4 py-2 rounded-lg text-xs font-bold ${filterKelas === k ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                                    style={filterKelas === k ? { background: BRAND_GRADIENT } : {}}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-5">
                        <p className="text-xs font-bold mb-2 text-gray-500">Filter Status:</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`btn-action flex-1 px-4 py-2 rounded-lg text-xs font-bold ${filterStatus === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                                style={filterStatus === 'all' ? { background: BRAND_GRADIENT } : {}}
                            >
                                Semua Siswa
                            </button>
                            <button
                                onClick={() => setFilterStatus('incomplete')}
                                className={`btn-action flex-1 px-4 py-2 rounded-lg text-xs font-bold ${filterStatus === 'incomplete' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                                style={filterStatus === 'incomplete' ? { background: THEME.semantic.danger } : {}}
                            >
                                Belum Lengkap ({incompleteCount})
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
                        {Object.entries(groupedByKelas).map(([kelasName, siswaList]) => (
                            <div key={kelasName}>
                                <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ background: '#fff7e6', border: '1px solid #ffc080' }}>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} style={{ color: ACCENT_DARK }} />
                                        <p className="text-sm font-bold" style={{ color: '#8b4513' }}>Kelas {kelasName}</p>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white" style={{ color: ACCENT_DARK }}>
                                        {siswaList.filter(s => s.jumlah_komponen_terisi < s.total_komponen).length} belum lengkap
                                    </span>
                                </div>
                                <div className="space-y-3 ml-3">
                                    {siswaList.map(siswa => {
                                        const lengkap = siswa.jumlah_komponen_terisi === siswa.total_komponen;
                                        return (
                                            <div
                                                key={siswa.id_siswa}
                                                className="p-4 rounded-xl"
                                                style={{
                                                    background: lengkap ? '#f0fdf7' : '#ffffff',
                                                    border: `1px solid ${lengkap ? '#6dd4c4' : '#fca5a5'}`
                                                }}
                                            >
                                                <div className="flex items-start justify-between mb-3 gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 mb-0.5 truncate">{siswa.nama}</p>
                                                        <p className="text-xs text-gray-400">NIS: {siswa.nis}</p>
                                                    </div>
                                                    <span
                                                        className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                                                        style={{
                                                            background: lengkap ? '#e6f9f0' : '#fee2e2',
                                                            color: lengkap ? '#0d6e48' : '#991b1b'
                                                        }}
                                                    >
                                                        {lengkap ? 'LENGKAP' : 'BELUM'}
                                                    </span>
                                                </div>

                                                {jenisAktif === 'PAS' && siswa.komponen_detail && siswa.komponen_detail.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        {siswa.komponen_detail.map((komp, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                                {komp.status === 'sudah' ? <Check size={14} className="text-emerald-600" /> : <XIcon size={14} className="text-red-500" />}
                                                                <span className={`font-medium ${komp.status === 'sudah' ? 'text-gray-700' : 'text-gray-400'}`}>{komp.nama_komponen}:</span>
                                                                <span className={`font-bold text-base ${komp.status === 'sudah' ? 'text-emerald-700' : 'text-red-500'}`}>{komp.nilai ?? '-'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="mb-3">
                                                        <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                                                            <div className="h-full rounded-full" style={{
                                                                width: `${(siswa.jumlah_komponen_terisi / siswa.total_komponen) * 100}%`,
                                                                background: lengkap ? THEME.semantic.success : THEME.semantic.danger
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
                                                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #ececec' }}>
                                                        <span className="text-sm font-bold text-gray-500">Nilai Rapor:</span>
                                                        <span className="text-xl font-bold" style={{ color: '#0d6e48' }}>{siswa.nilai_rapor}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};