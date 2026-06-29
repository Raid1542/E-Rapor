"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, School, Book,
    Plus, GraduationCap, TrendingUp,
    ArrowRight, Calendar, CheckCircle2,
    Clock, AlertCircle, FileCheck2,
    UserCheck, ToggleRight, Sparkles
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
    RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';

/* ==========================================================================
   INTERFACES
   ========================================================================== */

interface DashboardStats {
    guru: number;
    siswa: number;
    admin: number;
    ekstrakurikuler: number;
    kelas: number;
    mata_pelajaran: number;
    tahun_ajaran: string | null;
    semester: string | null;
    id_detail: number | null;
    status_pts?: 'aktif' | 'nonaktif' | 'selesai';
    status_pas?: 'aktif' | 'nonaktif' | 'selesai';
}

interface KelasWithSiswa {
    id_kelas: number;
    nama_kelas: string;
    jumlah_siswa: number;
}

/**
 * TODO (BACKEND): Progress input nilai oleh guru pada periode aktif.
 * Endpoint: GET /api/admin/dashboard/progress-guru
 * Sudah disediakan di dashboardController_TAMBAHAN.js — tinggal pasang.
 */
interface ProgressGuru {
    total_guru: number;
    sudah_input: number;
    belum_input: number;
}

/**
 * TODO (BACKEND): Status kelengkapan rapor per kelas pada periode aktif.
 * Endpoint: GET /api/admin/dashboard/kelengkapan-rapor
 * Sudah disediakan di dashboardController_TAMBAHAN.js — tinggal pasang.
 */
interface KelengkapanRapor {
    id_kelas: number;
    nama_kelas: string;
    total_siswa: number;
    rapor_lengkap: number;
    rapor_proses: number;
    rapor_kosong: number;
}

/* ==========================================================================
   DESIGN TOKENS
   ========================================================================== */

const THEME = {
    colors: {
        primary: '#c95b08',
        secondary: '#e8690a',
        tertiary: '#f5870a',
        accent: '#f5a623',
        background: '#fdf6f0',
        surface: '#ffffff',
        border: '#fde0c8',
        text: {
            primary: '#15110d',
            secondary: '#5c5048',
            muted: '#a89a8c',
        },
        status: {
            aktif: { bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e' },
            selesai: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
            nonaktif: { bg: '#f3f0ed', text: '#766b62', border: '#e2d9d0', dot: '#a89a8c' },
        },
        semantic: {
            lengkap: '#1f9d55',
            proses: '#f0a907',
            kosong: '#e0563a',
        },
    },
    gradients: {
        primary: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
        secondary: 'linear-gradient(135deg, #e8690a 0%, #f5870a 100%)',
        tertiary: 'linear-gradient(135deg, #f5870a 0%, #f5a623 100%)',
        accent: 'linear-gradient(135deg, #f5a623 0%, #f97316 100%)',
        hero: 'linear-gradient(120deg, #b6500a 0%, #e8690a 45%, #f5a623 100%)',
    },
    shadows: {
        sm: '0 1px 3px rgba(124, 68, 9, 0.06)',
        md: '0 6px 20px rgba(124, 68, 9, 0.10)',
        lg: '0 12px 32px rgba(124, 68, 9, 0.14)',
    },
    chartColors: ['#c95b08', '#e8690a', '#f5870a', '#f5a623', '#f97316', '#fb923c'],
};

/* ==========================================================================
   GLOBAL STYLES
   ========================================================================== */

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes growBar {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        .delay-1 { animation-delay: 0.06s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.18s; }
        .delay-4 { animation-delay: 0.24s; }
        .delay-5 { animation-delay: 0.30s; }
        .delay-6 { animation-delay: 0.36s; }
        .grow-bar {
            transform-origin: left;
            animation: growBar 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stat-card {
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        }
        .stat-card:hover {
            transform: translateY(-3px);
        }
        .hero-toggle {
            transition: all 0.2s ease;
        }
        .hero-toggle:hover {
            transform: translateY(-1px);
        }
        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #f0c9a0;
            border-radius: 10px;
        }
    `}</style>
);

/* ==========================================================================
   REUSABLE COMPONENTS
   ========================================================================== */

const StatusBadge = ({ status }: { status: 'aktif' | 'nonaktif' | 'selesai' }) => {
    const config = {
        aktif: { ...THEME.colors.status.aktif, icon: <CheckCircle2 size={12} />, label: 'Aktif' },
        selesai: { ...THEME.colors.status.selesai, icon: <Clock size={12} />, label: 'Selesai' },
        nonaktif: { ...THEME.colors.status.nonaktif, icon: <AlertCircle size={12} />, label: 'Belum Aktif' },
    };
    const c = config[status];

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
            {c.label}
        </span>
    );
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DashboardClient() {
    /* --------------------------------------------------------------------
       STATE MANAGEMENT
    -------------------------------------------------------------------- */

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        guru: 0, siswa: 0, admin: 0, ekstrakurikuler: 0, kelas: 0,
        mata_pelajaran: 0, tahun_ajaran: null, semester: null, id_detail: null,
        status_pts: 'nonaktif', status_pas: 'nonaktif',
    });
    const [kelasList, setKelasList] = useState<KelasWithSiswa[]>([]);
    const [kelasLoading, setKelasLoading] = useState(false);

    // --- State untuk diagram tambahan, diisi lewat fetch ke API asli ---
    const [progressGuru, setProgressGuru] = useState<ProgressGuru>({
        total_guru: 0,
        sudah_input: 0,
        belum_input: 0,
    });
    const [progressGuruLoading, setProgressGuruLoading] = useState(true);
    const [kelengkapanRapor, setKelengkapanRapor] = useState<KelengkapanRapor[]>([]);
    const [kelengkapanLoading, setKelengkapanLoading] = useState(true);

    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();

    /* --------------------------------------------------------------------
       DATA FETCHING
    -------------------------------------------------------------------- */

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token) {
            window.location.href = '/login';
            return;
        }

        if (userData) {
            const parsedUser: UserData = JSON.parse(userData);
            if (parsedUser.role !== 'admin') {
                alert('Anda tidak memiliki akses ke halaman ini');
                window.location.href = '/login';
                return;
            }
            setUser(parsedUser);
        }

        const fetchDashboardData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await res.json();

                if (res.ok && result.success) {
                    setStats(result.data);
                    if (result.data.id_detail) {
                        fetchKelasData(result.data.id_detail, token);
                    }
                }
            } catch (err) {
                console.error('Gagal memuat data dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchKelasData = async (tahunAjaranId: number, token: string) => {
            setKelasLoading(true);
            try {
                const res = await fetch(
                    `http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${tahunAjaranId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();

                if (res.ok && data.success) {
                    const kelasData: KelasWithSiswa[] = [];

                    await Promise.all(
                        data.data.map(async (kelas: any) => {
                            const kelasId = kelas.id_kelas || kelas.id;
                            if (!kelasId) return;

                            try {
                                const resSiswa = await fetch(
                                    `http://localhost:5000/api/admin/kelas/${kelasId}/siswa`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const dataSiswa = await resSiswa.json();

                                if (dataSiswa.success) {
                                    kelasData.push({
                                        id_kelas: kelasId,
                                        nama_kelas: kelas.nama_kelas || kelas.nama,
                                        jumlah_siswa: dataSiswa.data.length,
                                    });
                                }
                            } catch (err) {
                                console.error(`Error fetching siswa for kelas ${kelasId}:`, err);
                            }
                        })
                    );

                    setKelasList(kelasData.sort((a, b) => b.jumlah_siswa - a.jumlah_siswa));
                }
            } catch (err) {
                console.error('Error fetch kelas:', err);
            } finally {
                setKelasLoading(false);
            }
        };

        const fetchProgressGuru = async () => {
            setProgressGuruLoading(true);
            try {
                const res = await fetch('http://localhost:5000/api/admin/dashboard/progress-guru', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await res.json();
                if (res.ok && result.success) setProgressGuru(result.data);
            } catch (err) {
                console.error('Gagal memuat progress guru:', err);
            } finally {
                setProgressGuruLoading(false);
            }
        };

        const fetchKelengkapanRapor = async () => {
            setKelengkapanLoading(true);
            try {
                const res = await fetch('http://localhost:5000/api/admin/dashboard/kelengkapan-rapor', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await res.json();
                if (res.ok && result.success) setKelengkapanRapor(result.data);
            } catch (err) {
                console.error('Gagal memuat kelengkapan rapor:', err);
            } finally {
                setKelengkapanLoading(false);
            }
        };

        fetchDashboardData();
        fetchProgressGuru();
        fetchKelengkapanRapor();
    }, []);

    /* --------------------------------------------------------------------
       LOADING STATE
    -------------------------------------------------------------------- */

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: THEME.colors.background }}>
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto" />
                    <p className="mt-4 text-sm font-medium" style={{ color: THEME.colors.primary }}>
                        Memuat dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    /* --------------------------------------------------------------------
       DATA PREPARATION
    -------------------------------------------------------------------- */

    const statCards = [
        { label: 'Total Siswa', value: stats.siswa, icon: <GraduationCap className="w-5 h-5" />, path: '/admin/data_siswa', gradient: THEME.gradients.primary },
        { label: 'Total Guru', value: stats.guru, icon: <Users className="w-5 h-5" />, path: '/admin/data_guru', gradient: THEME.gradients.secondary },
        { label: 'Total Kelas', value: stats.kelas, icon: <School className="w-5 h-5" />, path: '/admin/data_kelas_siswa', gradient: THEME.gradients.tertiary },
        { label: 'Mata Pelajaran', value: stats.mata_pelajaran, icon: <Book className="w-5 h-5" />, path: '/admin/data_mata_pelajaran', gradient: THEME.gradients.accent },
    ];

    const barData = kelasList.map((k) => ({ name: k.nama_kelas, siswa: k.jumlah_siswa, id_kelas: k.id_kelas }));

    const guruPersen = progressGuru.total_guru > 0
        ? Math.round((progressGuru.sudah_input / progressGuru.total_guru) * 100)
        : 0;
    const radialData = [{ name: 'progress', value: guruPersen, fill: THEME.colors.secondary }];

    const userName = user.nama || user.name || user.nama_lengkap || 'Admin';

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const total = stats.siswa || 1;
            const percentage = ((data.siswa / total) * 100).toFixed(1);

            return (
                <div className="rounded-xl shadow-lg p-3" style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: THEME.colors.primary }}>
                        Kelas {data.name}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold" style={{ color: THEME.colors.text.primary }}>{data.siswa}</span>
                        <span className="text-xs" style={{ color: THEME.colors.text.muted }}>siswa</span>
                    </div>
                    <div className="mt-1.5 pt-1.5 text-xs font-medium" style={{ borderTop: `1px solid ${THEME.colors.border}`, color: THEME.colors.secondary }}>
                        {percentage}% dari total
                    </div>
                </div>
            );
        }
        return null;
    };

    /* --------------------------------------------------------------------
       RENDER
    -------------------------------------------------------------------- */

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: THEME.colors.background }}>
            <GlobalStyles />
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ==============================================================
                SECTION 1: WELCOME HEADER
            ============================================================== */}
            <div className="mb-6 animate-fade-in-up">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: THEME.colors.primary, letterSpacing: '0.08em' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Dashboard Admin
                </p>
                <h1 className="text-[26px] font-bold tracking-tight" style={{ color: THEME.colors.text.primary }}>
                    Selamat datang, {userName} 👋
                </h1>
                <p className="text-sm mt-1" style={{ color: THEME.colors.text.muted }}>
                    Sistem Manajemen e-Rapor SDIT Ulil Albab Batam
                </p>
            </div>

            {/* ==============================================================
                SECTION 2: HERO — PERIODE PENILAIAN + PROGRESS GURU
                Digabung jadi satu panel agar admin langsung lihat
                "apa yang aktif" dan "apa yang masih perlu dikejar"
                tanpa harus melompat antar kartu.
            ============================================================== */}
            <div className="mb-6 animate-fade-in-up delay-1">
                <div
                    className="rounded-[28px] p-6 md:p-7 relative overflow-hidden"
                    style={{ background: THEME.gradients.hero, boxShadow: THEME.shadows.lg }}
                >
                    {/* Aksen lingkaran dekoratif tipis, bukan ornamen acak */}
                    <div
                        className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                    />
                    <div
                        className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full pointer-events-none"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                    />

                    <div className="relative flex flex-col lg:flex-row gap-6 lg:gap-10">
                        {/* --- Kiri: Status Periode --- */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar className="w-4 h-4 text-white/80" />
                                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                                    Periode Penilaian
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => router.push('/admin/arsip_rapor')}
                                    className="hero-toggle flex-1 text-left rounded-2xl p-4"
                                    style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-white">PTS</span>
                                        <StatusBadge status={stats.status_pts || 'nonaktif'} />
                                    </div>
                                    <p className="text-[11px] text-white/70">Penilaian Tengah Semester</p>
                                </button>

                                <button
                                    onClick={() => router.push('/admin/arsip_rapor')}
                                    className="hero-toggle flex-1 text-left rounded-2xl p-4"
                                    style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-white">PAS</span>
                                        <StatusBadge status={stats.status_pas || 'nonaktif'} />
                                    </div>
                                    <p className="text-[11px] text-white/70">Penilaian Akhir Semester</p>
                                </button>
                            </div>

                            <button
                                onClick={() => router.push('/admin/arsip_rapor')}
                                className="hero-toggle mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white"
                            >
                                <ToggleRight className="w-4 h-4" />
                                Kelola status periode
                            </button>
                        </div>

                        {/* --- Pemisah vertikal --- */}
                        <div className="hidden lg:block w-px self-stretch" style={{ background: 'rgba(255,255,255,0.22)' }} />

                        {/* --- Kanan: Progress Penilaian Siswa --- */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-4">
                                <UserCheck className="w-4 h-4 text-white/80" />
                                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                                    Progress Penilaian Siswa
                                </span>
                            </div>

                            {progressGuruLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    <span className="text-xs text-white/80">Memuat data...</span>
                                </div>
                            ) : progressGuru.total_guru === 0 ? (
                                <p className="text-sm text-white/80 leading-snug">
                                    Belum ada penugasan guru pada periode penilaian aktif saat ini.
                                </p>
                            ) : (
                            <div className="flex items-center gap-5">
                                <div className="relative w-[88px] h-[88px] flex-shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart
                                            innerRadius="72%"
                                            outerRadius="100%"
                                            data={radialData}
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                            <RadialBar
                                                background={{ fill: 'rgba(255,255,255,0.18)' }}
                                                dataKey="value"
                                                cornerRadius={20}
                                                fill="#ffffff"
                                            />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-lg font-bold text-white">{guruPersen}%</span>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <p className="text-sm text-white/90 leading-snug mb-2.5">
                                        <span className="font-bold">{progressGuru.sudah_input}</span> dari{' '}
                                        <span className="font-bold">{progressGuru.total_guru}</span> guru sudah
                                        menyelesaikan input nilai
                                    </p>
                                    {progressGuru.belum_input > 0 ? (
                                        <button
                                            onClick={() => router.push('/admin/data_guru')}
                                            className="hero-toggle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                                            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.26)' }}
                                        >
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            {progressGuru.belum_input} guru belum input
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Semua guru sudah input
                                        </span>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==============================================================
                SECTION 3: STATISTICS CARDS
            ============================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card, index) => (
                    <div
                        key={card.label}
                        className={`stat-card bg-white rounded-2xl p-5 cursor-pointer animate-fade-in-up delay-${index + 2}`}
                        style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}
                        onClick={() => router.push(card.path)}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: card.gradient }}>
                                {card.icon}
                            </div>
                            <ArrowRight className="w-4 h-4" style={{ color: THEME.colors.text.muted }} />
                        </div>
                        <p className="text-[26px] font-bold mb-0.5 leading-none" style={{ color: THEME.colors.text.primary }}>
                            {card.value}
                        </p>
                        <p className="text-sm font-medium" style={{ color: THEME.colors.text.secondary }}>
                            {card.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* ==============================================================
                SECTION 4: KELENGKAPAN RAPOR PER KELAS
            ============================================================== */}
            <div className="mb-6 animate-fade-in-up delay-5 bg-white rounded-2xl overflow-hidden" style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${THEME.colors.border}` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fff0e5' }}>
                            <FileCheck2 className="w-[18px] h-[18px]" style={{ color: THEME.colors.secondary }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: THEME.colors.text.primary }}>
                                Kelengkapan Rapor per Kelas
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: THEME.colors.text.muted }}>
                                Periode aktif berjalan
                            </p>
                        </div>
                    </div>
                    {/* Legenda warna status */}
                    <div className="hidden sm:flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5" style={{ color: THEME.colors.text.secondary }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: THEME.colors.semantic.lengkap }} /> Lengkap
                        </span>
                        <span className="flex items-center gap-1.5" style={{ color: THEME.colors.text.secondary }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: THEME.colors.semantic.proses }} /> Proses
                        </span>
                        <span className="flex items-center gap-1.5" style={{ color: THEME.colors.text.secondary }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: THEME.colors.semantic.kosong }} /> Belum
                        </span>
                    </div>
                </div>

                {kelengkapanLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                        <span className="ml-2.5 text-sm" style={{ color: THEME.colors.text.muted }}>Memuat data...</span>
                    </div>
                ) : kelengkapanRapor.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm font-semibold" style={{ color: THEME.colors.text.primary }}>
                            Belum ada data kelengkapan rapor
                        </p>
                        <p className="text-xs mt-1" style={{ color: THEME.colors.text.muted }}>
                            Data muncul setelah periode PTS/PAS diaktifkan dan guru mulai input nilai
                        </p>
                    </div>
                ) : (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                        {kelengkapanRapor.map((k) => {
                            const pLengkap = (k.rapor_lengkap / k.total_siswa) * 100;
                            const pProses = (k.rapor_proses / k.total_siswa) * 100;
                            const pKosong = (k.rapor_kosong / k.total_siswa) * 100;
                            const isDone = k.rapor_lengkap === k.total_siswa;

                            return (
                                <div
                                    key={k.id_kelas}
                                    className="cursor-pointer group"
                                    onClick={() => router.push(`/admin/data_kelas_siswa/${k.id_kelas}`)}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[13px] font-semibold" style={{ color: THEME.colors.text.primary }}>
                                            Kelas {k.nama_kelas}
                                        </span>
                                        <span className="text-[11px] font-medium" style={{ color: isDone ? THEME.colors.semantic.lengkap : THEME.colors.text.muted }}>
                                            {k.rapor_lengkap}/{k.total_siswa} selesai
                                        </span>
                                    </div>
                                    <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: '#f3ece4' }}>
                                        <div className="grow-bar h-full" style={{ width: `${pLengkap}%`, background: THEME.colors.semantic.lengkap }} />
                                        <div className="grow-bar h-full" style={{ width: `${pProses}%`, background: THEME.colors.semantic.proses }} />
                                        <div className="grow-bar h-full" style={{ width: `${pKosong}%`, background: THEME.colors.semantic.kosong }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ==============================================================
                SECTION 5: DISTRIBUSI SISWA PER KELAS (bar chart existing,
                dirapikan)
            ============================================================== */}
            <div className="animate-fade-in-up delay-6">
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}>
                    <div className="px-5 py-4 flex items-center justify-between" style={{ background: THEME.gradients.primary }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Distribusi Siswa per Kelas</h3>
                                <p className="text-xs text-white/70 mt-0.5">Visualisasi jumlah siswa</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/admin/data_kelas_siswa')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:bg-white/25"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                        >
                            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-5">
                        {kelasLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                                <span className="ml-2.5 text-sm" style={{ color: THEME.colors.text.muted }}>Memuat data...</span>
                            </div>
                        ) : kelasList.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#fff0e5' }}>
                                    <School className="w-7 h-7" style={{ color: THEME.colors.secondary }} />
                                </div>
                                <p className="text-sm font-semibold" style={{ color: THEME.colors.text.primary }}>Belum ada data kelas</p>
                                <p className="text-xs mb-4 mt-1" style={{ color: THEME.colors.text.muted }}>Buat kelas terlebih dahulu</p>
                                <button
                                    onClick={() => router.push('/admin/data_kelas_siswa')}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                                    style={{ background: THEME.gradients.secondary }}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Buat Kelas
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-2.5 mb-4">
                                    <div className="p-3 rounded-xl text-center" style={{ background: '#fff0e5', border: `1px solid ${THEME.colors.border}` }}>
                                        <p className="text-lg font-bold" style={{ color: THEME.colors.primary }}>{kelasList.length}</p>
                                        <p className="text-[10px] font-medium" style={{ color: THEME.colors.text.secondary }}>Total Kelas</p>
                                    </div>
                                    <div className="p-3 rounded-xl text-center" style={{ background: '#fff5eb', border: `1px solid ${THEME.colors.border}` }}>
                                        <p className="text-lg font-bold" style={{ color: THEME.colors.secondary }}>{stats.siswa}</p>
                                        <p className="text-[10px] font-medium" style={{ color: THEME.colors.text.secondary }}>Total Siswa</p>
                                    </div>
                                    <div className="p-3 rounded-xl text-center" style={{ background: '#fffaf0', border: `1px solid ${THEME.colors.border}` }}>
                                        <p className="text-lg font-bold" style={{ color: THEME.colors.tertiary }}>{Math.round(stats.siswa / kelasList.length)}</p>
                                        <p className="text-[10px] font-medium" style={{ color: THEME.colors.text.secondary }}>Rata-rata</p>
                                    </div>
                                </div>

                                <div className="mb-4 p-3 rounded-xl" style={{ background: '#fffaf6', border: `1px solid ${THEME.colors.border}` }}>
                                    <ResponsiveContainer width="100%" height={Math.max(220, kelasList.length * 45)}>
                                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={THEME.colors.border} horizontal={false} />
                                            <XAxis type="number" stroke={THEME.colors.primary} fontSize={10} fontWeight={600} />
                                            <YAxis type="category" dataKey="name" stroke={THEME.colors.primary} fontSize={11} fontWeight={600} width={60} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,105,10,0.05)' }} />
                                            <Bar dataKey="siswa" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={600} animationEasing="ease-out">
                                                {barData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={THEME.chartColors[index % THEME.chartColors.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="pt-3" style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                                    <p className="text-xs font-semibold mb-2.5" style={{ color: THEME.colors.primary }}>
                                        Detail Kelas ({kelasList.length})
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {kelasList.map((kelas, index) => {
                                            const percentage = stats.siswa > 0 ? ((kelas.jumlah_siswa / stats.siswa) * 100).toFixed(0) : '0';
                                            return (
                                                <div
                                                    key={kelas.id_kelas}
                                                    className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-sm"
                                                    style={{ background: '#fffaf6', border: `1px solid ${THEME.colors.border}` }}
                                                    onClick={() => router.push(`/admin/data_kelas_siswa/${kelas.id_kelas}`)}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                                            style={{ background: THEME.chartColors[index % THEME.chartColors.length] }}
                                                        >
                                                            {kelas.nama_kelas}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold truncate" style={{ color: THEME.colors.text.primary }}>
                                                                Kelas {kelas.nama_kelas}
                                                            </p>
                                                            <p className="text-[10px]" style={{ color: THEME.colors.text.muted }}>{percentage}% dari total</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-2">
                                                        <p className="text-base font-bold" style={{ color: THEME.colors.primary }}>{kelas.jumlah_siswa}</p>
                                                        <p className="text-[10px]" style={{ color: THEME.colors.text.muted }}>siswa</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}