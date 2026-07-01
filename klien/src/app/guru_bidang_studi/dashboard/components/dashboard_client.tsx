/**
 * Nama File: dashboard_client.tsx
 * FINAL FIX: Perbesar teks komponen, seragamkan warna icon, perbaiki icon
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ChevronRight, Users, Book, TrendingUp,
    Calendar, CheckCircle2, AlertCircle,
    MapPin, Check, X as XIcon,
    BookOpen, Settings, Target, School, Star
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

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

interface Warning {
    mapel: string;
    masalah: string;
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
    warnings: Warning[];
    total_komponen: number;
}

/* ==========================================================================
   DESIGN TOKENS - TEMA ORANYE
   ========================================================================== */

const THEME = {
    colors: {
        primary: '#ea580c',
        primaryDark: '#c2410c',
        primaryLight: '#fb923c',
        secondary: '#f97316',
        accent: '#fdba74',
        background: '#ffffff',
        surface: '#ffffff',
        border: '#fed7aa',
        text: {
            primary: '#1c0f07',
            secondary: '#7c2d12',
            muted: '#9a3412',
        },
        status: {
            aktif: { bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e' },
            selesai: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
            nonaktif: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
        },
    },
    // ✅ TAMBAHKAN INI - Soft pastel backgrounds seperti dashboard admin
    statCards: [
        { iconBg: '#e8690a', cardBg: '#fff5ee', cardBorder: '#fdd9b5' },
        { iconBg: '#c95b08', cardBg: '#fff2ea', cardBorder: '#fcc9a0' },
        { iconBg: '#e07b1a', cardBg: '#fff6f0', cardBorder: '#fdd4b0' },
        { iconBg: '#d4700f', cardBg: '#fff4ec', cardBorder: '#fccaa5' },
    ],
    gradients: {
        primary: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
        secondary: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
        light: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
    },
    shadows: {
        sm: '0 2px 8px rgba(234, 88, 12, 0.08)',
        md: '0 4px 16px rgba(234, 88, 12, 0.12)',
        lg: '0 8px 24px rgba(234, 88, 12, 0.16)',
    },
};

/* ==========================================================================
   GLOBAL STYLES
   ========================================================================== */

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #fdba74;
            border-radius: 10px;
        }
    `}</style>
);

/* ==========================================================================
   REUSABLE COMPONENTS
   ========================================================================== */

const StatusBadge = ({ status }: { status: 'aktif' | 'nonaktif' | 'selesai' }) => {
    const config = {
        aktif: { ...THEME.colors.status.aktif, label: 'Aktif' },
        selesai: { ...THEME.colors.status.selesai, label: 'Selesai' },
        nonaktif: { ...THEME.colors.status.nonaktif, label: 'Belum Aktif' },
    };
    const c = config[status];

    return (
        <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}
        >
            <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
            {c.label}
        </span>
    );
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{ border: `1.5px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.md }}
    >
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
                    const res = await fetch('http://localhost:5000/api/guru-bidang-studi/dashboard', {
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
            <div className="flex items-center justify-center min-h-screen" style={{ background: THEME.colors.background }}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto" />
                    <p className="mt-4 text-base font-semibold" style={{ color: THEME.colors.primary }}>Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={{ background: THEME.colors.background }}>
                <GlobalStyles />
                {modal && <NotifModal modal={modal} onClose={closeModal} />}
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600">Anda belum ditugaskan mengajar mata pelajaran.</p>
                        </div>
                        <button onClick={handleLogout} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: THEME.gradients.primary }}>
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

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: THEME.colors.background }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* WELCOME HEADER */}
            <div className="mb-8 animate-fade-in-up">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-2" style={{ color: THEME.colors.primary, letterSpacing: '0.1em' }}>
                    <Star className="w-5 h-5" style={{ color: THEME.colors.primary }} />
                    Dashboard Guru Bidang Studi
                </p>
                <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: THEME.colors.text.primary }}>
                    Selamat datang, {userName} 👋
                </h1>
                <p className="text-base" style={{ color: THEME.colors.text.muted }}>
                    Kelola penilaian siswa dengan mudah dan efisien
                </p>
            </div>

            {/* STATISTICS CARDS - SOFT PASTEL BACKGROUNDS (SEPERTI ADMIN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                    {
                        label: 'Mata Pelajaran',
                        value: dashboard.total_mapel,
                        icon: <Book className="w-6 h-6" />,
                        desc: 'Total mapel yang Anda ajar',
                    },
                    {
                        label: 'Total Kelas',
                        value: dashboard.total_kelas,
                        icon: <School className="w-6 h-6" />,
                        desc: 'Kelas yang Anda ajar',
                    },
                    {
                        label: 'Total Siswa',
                        value: dashboard.total_siswa,
                        icon: <Users className="w-6 h-6" />,
                        desc: `${dashboard.total_penilaian_ada} sudah dinilai`,
                    },
                    {
                        label: 'Progress Penilaian',
                        value: `${dashboard.overall_progress}%`,
                        icon: <Target className="w-6 h-6" />,
                        desc: `${dashboard.total_penilaian_ada} dari ${dashboard.total_penilaian_dibutuhkan} penilaian`,
                    },
                ].map((stat, index) => {
                    const cardStyle = THEME.statCards[index] || THEME.statCards[0];  // ✅ TAMBAHKAN INI
                    return (
                        <div
                            key={stat.label}
                            className="rounded-2xl p-6 animate-fade-in-up"  // ✅ HAPUS bg-white
                            style={{
                                background: cardStyle.cardBg,  // ✅ GUNAKAN cardBg
                                border: `1.5px solid ${cardStyle.cardBorder}`,  // ✅ GUNAKAN cardBorder
                                boxShadow: THEME.shadows.md,
                                animationDelay: `${index * 0.1}s`
                            }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                                    style={{
                                        background: cardStyle.iconBg,
                                        color: '#ffffff'
                                    }}
                                >
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="mb-3">
                                <p className="text-3xl font-bold mb-1" style={{ color: THEME.colors.text.primary }}>{stat.value}</p>
                                <p className="text-sm font-semibold" style={{ color: cardStyle.iconBg }}>{stat.label}</p>
                            </div>
                            <p className="text-xs" style={{ color: THEME.colors.text.muted }}>{stat.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* PROGRESS PER MAPEL */}
            <div className="animate-fade-in-up delay-2 mb-8">
                <Card className="overflow-hidden">
                    <div className="px-6 py-5 flex items-center justify-between" style={{ background: THEME.gradients.primary }}>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Progress Penilaian per Mata Pelajaran</h3>
                                <p className="text-sm text-white/80 mt-0.5">
                                    {dashboard.jenis_penilaian_aktif
                                        ? `Periode ${dashboard.jenis_penilaian_aktif} • ${dashboard.total_komponen} komponen`
                                        : 'Status input nilai siswa'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:bg-white/25 shadow-lg"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            Input Nilai <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6">
                        {dashboard.mata_pelajaran_list.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fff0e5' }}>
                                    <BookOpen className="w-8 h-8" style={{ color: THEME.colors.secondary }} />
                                </div>
                                <p className="text-lg font-bold mb-2" style={{ color: THEME.colors.text.primary }}>Belum ada mata pelajaran</p>
                                <p className="text-sm" style={{ color: THEME.colors.text.muted }}>Hubungi administrator untuk penugasan</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Jadwal */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: `2px solid ${THEME.colors.border}` }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff0e5' }}>
                                <Calendar size={20} style={{ color: THEME.colors.primary }} />
                            </div>
                            <div>
                                <p className="text-base font-bold" style={{ color: THEME.colors.text.primary }}>Jadwal Penting</p>
                                <p className="text-xs" style={{ color: THEME.colors.text.muted }}>Status periode penilaian</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <JadwalItem label="PTS" status={dashboard.status_pts} tanggal={dashboard.jadwal.pts} />
                            <JadwalItem label="PAS" status={dashboard.status_pas} tanggal={dashboard.jadwal.pas} />
                        </div>
                    </div>
                </Card>

                {/* Konfigurasi */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: `2px solid ${THEME.colors.border}` }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff0e5' }}>
                                <Settings size={20} style={{ color: THEME.colors.primary }} />
                            </div>
                            <div>
                                <p className="text-base font-bold" style={{ color: THEME.colors.text.primary }}>Status Konfigurasi</p>
                                <p className="text-xs" style={{ color: THEME.colors.text.muted }}>Kelengkapan bobot & kategori</p>
                            </div>
                        </div>
                        {dashboard.warnings.length === 0 ? (
                            <div className="flex items-center gap-4 p-5 rounded-xl" style={{ background: '#dcfce7', border: '2px solid #86efac' }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white">
                                    <CheckCircle2 size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-green-800">Semua Mapel Sudah Dikonfigurasi</p>
                                    <p className="text-xs text-green-700 mt-0.5">Bobot dan kategori nilai sudah lengkap</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dashboard.warnings.map((w, i) => (
                                    <div key={i} className="p-4 rounded-xl" style={{ background: '#fef2f2', border: '2px solid #fca5a5' }}>
                                        <p className="text-sm font-bold text-red-700 mb-1">{w.mapel}</p>
                                        <p className="text-xs text-red-600">{w.masalah}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* MODAL PERIODE */}
            {showPeriodModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPeriodModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                                <AlertCircle size={28} className="text-orange-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {isPeriodLocked ? '🔒 Periode Selesai' : '⏳ Periode Belum Aktif'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                            {isPeriodLocked
                                ? 'Baik PTS maupun PAS telah selesai. Data nilai sudah dikunci dan tidak dapat diubah.'
                                : 'Baik PTS maupun PAS belum dibuka oleh admin. Anda dapat melihat data dashboard, tetapi belum dapat menginput nilai siswa.'}
                        </p>
                        <button
                            onClick={() => setShowPeriodModal(false)}
                            className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg"
                            style={{ background: THEME.gradients.primary }}
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

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const styles: any = {
        success: { bg: 'bg-green-50', text: 'text-green-500', btn: 'bg-green-500' },
        error: { bg: 'bg-red-50', text: 'text-red-500', btn: 'bg-red-500' },
        warning: { bg: 'bg-orange-50', text: 'text-orange-500', btn: 'bg-orange-500' },
        network: { bg: 'bg-slate-100', text: 'text-slate-500', btn: 'bg-slate-600' },
    };
    const s = styles[modal.type];

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${s.bg} flex items-center justify-center ring-8 ring-white`}>
                    <AlertCircle size={40} className={s.text} />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl`}>OK, Mengerti</button>
            </div>
        </div>
    );
};

const JadwalItem = ({ label, status, tanggal }: { label: string; status: string; tanggal: string | null }) => {
    const statusConfig: any = {
        aktif: { bg: '#fff0e5', border: '#fed7aa' },
        selesai: { bg: '#f9fafb', border: '#e5e7eb' },
        nonaktif: { bg: '#fef3c7', border: '#fcd34d' },
    };
    const c = statusConfig[status] || statusConfig.nonaktif;

    return (
        <div className="flex items-center justify-between px-5 py-4 rounded-xl" style={{ background: c.bg, border: `2px solid ${c.border}` }}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: status === 'aktif' ? THEME.gradients.primary : '#e5e7eb' }}>
                    <AlertCircle size={20} className={status === 'aktif' ? 'text-white' : 'text-gray-400'} />
                </div>
                <div>
                    <p className="text-sm font-bold mb-0.5" style={{ color: THEME.colors.text.primary }}>{label}</p>
                    <p className="text-xs" style={{ color: THEME.colors.text.muted }}>
                        {status === 'aktif' ? '● Aktif' : status === 'selesai' ? '🔒 Selesai' : '⏳ Menunggu'}
                    </p>
                </div>
            </div>
            <span className="text-sm font-bold px-3 py-1.5 rounded-lg" style={{ color: THEME.colors.primary, background: '#fff' }}>
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
        <div className="border-2 rounded-2xl p-5 transition-all hover:shadow-lg" style={{ borderColor: isComplete ? '#86efac' : THEME.colors.border, background: isComplete ? '#f0fdf4' : '#fff' }}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: isComplete ? THEME.gradients.secondary : THEME.gradients.primary }}>
                        {isComplete ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                    </div>
                    <div>
                        <p className="text-base font-bold mb-1" style={{ color: THEME.colors.text.primary }}>{mapel.nama}</p>
                        <p className="text-sm" style={{ color: THEME.colors.text.muted }}>{mapel.total_kelas} kelas • {mapel.total_siswa} siswa</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-3xl font-bold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>{percentage}%</p>
                    <p className="text-xs" style={{ color: THEME.colors.text.muted }}>{isComplete ? 'Selesai' : 'Berjalan'}</p>
                </div>
            </div>

            <div className="h-3 rounded-full overflow-hidden mb-4" style={{ background: '#fde0c8' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: isComplete ? '#16a34a' : THEME.gradients.primary }} />
            </div>

            <button
                onClick={() => setShowDetail(!showDetail)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                    background: isComplete ? '#dcfce7' : '#fef9c3',
                    color: isComplete ? '#15803d' : '#92400e',
                    border: `1.5px solid ${isComplete ? '#86efac' : '#fcd34d'}`
                }}
            >
                <span>{isComplete ? '✓ Semua siswa sudah lengkap' : `⚠️ ${incompleteCount} siswa belum lengkap`}</span>
                <span>{showDetail ? 'Sembunyikan Detail ▲' : 'Lihat Detail ▼'}</span>
            </button>

            {showDetail && (
                <div className="mt-5 pt-5 border-t-2" style={{ borderTop: `2px solid ${THEME.colors.border}` }}>
                    {/* Filter Kelas */}
                    <div className="mb-4">
                        <p className="text-xs font-bold mb-2" style={{ color: THEME.colors.text.secondary }}>Filter Kelas:</p>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setFilterKelas('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterKelas === 'all' ? 'text-white' : 'bg-gray-100'}`} style={filterKelas === 'all' ? { background: THEME.colors.primary } : {}}>
                                Semua Kelas
                            </button>
                            {kelasList.map(k => (
                                <button key={k} onClick={() => setFilterKelas(k)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterKelas === k ? 'text-white' : 'bg-gray-100'}`} style={filterKelas === k ? { background: THEME.colors.primary } : {}}>
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filter Status */}
                    <div className="mb-5">
                        <p className="text-xs font-bold mb-2" style={{ color: THEME.colors.text.secondary }}>Filter Status:</p>
                        <div className="flex gap-2">
                            <button onClick={() => setFilterStatus('all')} className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'text-white' : 'bg-gray-100'}`} style={filterStatus === 'all' ? { background: THEME.colors.primary } : {}}>
                                Semua Siswa
                            </button>
                            <button onClick={() => setFilterStatus('incomplete')} className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'incomplete' ? 'text-white' : 'bg-gray-100'}`} style={filterStatus === 'incomplete' ? { background: '#ef4444' } : {}}>
                                Belum Lengkap ({incompleteCount})
                            </button>
                        </div>
                    </div>

                    {/* Daftar Siswa - KOMPONEN PENILAIAN DIPERBESAR */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
                        {Object.entries(groupedByKelas).map(([kelasName, siswaList]) => (
                            <div key={kelasName}>
                                <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ background: '#fff0e5', border: `2px solid #fed7aa` }}>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-orange-600" />
                                        <p className="text-sm font-bold text-orange-800">Kelas {kelasName}</p>
                                    </div>
                                    <span className="text-xs font-bold text-orange-600 px-2 py-1 rounded-lg bg-white">{siswaList.filter(s => s.jumlah_komponen_terisi < s.total_komponen).length} belum lengkap</span>
                                </div>
                                <div className="space-y-3 ml-3">
                                    {siswaList.map(siswa => (
                                        <div key={siswa.id_siswa} className="p-4 rounded-xl border-2" style={{ background: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#f0fdf4' : '#fef2f2', borderColor: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#86efac' : '#fca5a5' }}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-base font-bold mb-1" style={{ color: THEME.colors.text.primary }}>{siswa.nama}</p>
                                                    <p className="text-xs" style={{ color: THEME.colors.text.muted }}>NIS: {siswa.nis}</p>
                                                </div>
                                                {siswa.jumlah_komponen_terisi === siswa.total_komponen ? (
                                                    <span className="text-xs font-bold text-green-700 px-3 py-1.5 rounded-lg bg-green-100">LENGKAP ✓</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-red-700 px-3 py-1.5 rounded-lg bg-red-100">BELUM</span>
                                                )}
                                            </div>

                                            {/* KOMPONEN DETAIL - FONT DIPERBESAR */}
                                            {siswa.komponen_detail && siswa.komponen_detail.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    {siswa.komponen_detail.map((komp, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                                            {komp.status === 'sudah' ? <Check size={14} className="text-green-600" /> : <XIcon size={14} className="text-red-600" />}
                                                            <span className={`font-medium ${komp.status === 'sudah' ? 'text-gray-700' : 'text-gray-500'}`}>{komp.nama_komponen}:</span>
                                                            <span className={`font-bold text-base ${komp.status === 'sudah' ? 'text-green-700' : 'text-red-600'}`}>{komp.nilai ?? '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mb-3">
                                                    <div className="h-2 rounded-full overflow-hidden bg-gray-200">
                                                        <div className="h-full rounded-full" style={{ width: `${(siswa.jumlah_komponen_terisi / siswa.total_komponen) * 100}%`, background: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#16a34a' : '#ef4444' }} />
                                                    </div>
                                                    <p className="text-xs mt-1" style={{ color: THEME.colors.text.muted }}>{siswa.jumlah_komponen_terisi}/{siswa.total_komponen} komponen terisi</p>
                                                </div>
                                            )}

                                            {/* NILAI RAPOR - DIPERBESAR */}
                                            {siswa.nilai_rapor !== null && (
                                                <div className="flex items-center justify-between pt-3 border-t-2" style={{ borderTop: `2px solid ${THEME.colors.border}` }}>
                                                    <span className="text-sm font-bold" style={{ color: THEME.colors.text.secondary }}>Nilai Rapor:</span>
                                                    <span className="text-2xl font-bold text-green-700">{siswa.nilai_rapor}</span>
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