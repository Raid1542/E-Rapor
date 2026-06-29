/**
 * Nama File: dashboard_client.tsx
 * FINAL FIX: Hapus periode section & perbaiki stat cards
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ChevronRight, Users, Book, TrendingUp,
    Calendar, CheckCircle2, AlertCircle,
    MapPin, Check, X as XIcon,
    BookOpen, Settings, Target, FileText
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
    },
    gradients: {
        primary: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
        secondary: 'linear-gradient(135deg, #e8690a 0%, #f5870a 100%)',
        tertiary: 'linear-gradient(135deg, #f5870a 0%, #f5a623 100%)',
        accent: 'linear-gradient(135deg, #f5a623 0%, #f97316 100%)',
    },
    shadows: {
        sm: '0 1px 3px rgba(124, 68, 9, 0.06)',
        md: '0 6px 20px rgba(124, 68, 9, 0.10)',
        lg: '0 12px 32px rgba(124, 68, 9, 0.14)',
    },
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
        .animate-fade-in-up {
            animation: fadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
        .delay-1 { animation-delay: 0.06s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.18s; }
        .delay-4 { animation-delay: 0.24s; }
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
        aktif: { ...THEME.colors.status.aktif, label: 'Aktif' },
        selesai: { ...THEME.colors.status.selesai, label: 'Selesai' },
        nonaktif: { ...THEME.colors.status.nonaktif, label: 'Belum Aktif' },
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

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{ border: `1px solid ${THEME.colors.border}`, boxShadow: THEME.shadows.sm }}
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
                    <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto" />
                    <p className="mt-4 text-sm font-medium" style={{ color: THEME.colors.primary }}>Memuat dashboard...</p>
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
            <div className="mb-6 animate-fade-in-up">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: THEME.colors.primary, letterSpacing: '0.08em' }}>
                    Dashboard Guru Bidang Studi
                </p>
                <h1 className="text-[26px] font-bold tracking-tight" style={{ color: THEME.colors.text.primary }}>
                    Selamat datang, {userName} 👋
                </h1>
                <p className="text-sm mt-1" style={{ color: THEME.colors.text.muted }}>
                    Kelola penilaian siswa dengan mudah
                </p>
            </div>

            {/* STATISTICS CARDS - Non-clickable, just info */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Mata Pelajaran', value: dashboard.total_mapel, icon: <Book className="w-5 h-5" />, gradient: THEME.gradients.primary, desc: 'Total mapel diajar' },
                    { label: 'Total Kelas', value: dashboard.total_kelas, icon: <Users className="w-5 h-5" />, gradient: THEME.gradients.secondary, desc: 'Kelas yang diajar' },
                    { label: 'Total Siswa', value: dashboard.total_siswa, icon: <Users className="w-5 h-5" />, gradient: THEME.gradients.tertiary, desc: `${dashboard.total_penilaian_ada} sudah dinilai` },
                    { label: 'Progress', value: `${dashboard.overall_progress}%`, icon: <Target className="w-5 h-5" />, gradient: THEME.gradients.accent, desc: `${dashboard.total_penilaian_ada} dari ${dashboard.total_penilaian_dibutuhkan}` },
                ].map((stat, index) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-2xl p-5 animate-fade-in-up"
                        style={{ 
                            border: `1px solid ${THEME.colors.border}`, 
                            boxShadow: THEME.shadows.sm,
                            animationDelay: `${index * 0.06}s`
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: stat.gradient }}>
                                {stat.icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-[26px] font-bold leading-none" style={{ color: THEME.colors.text.primary }}>{stat.value}</p>
                                <p className="text-xs font-medium mt-0.5" style={{ color: THEME.colors.text.secondary }}>{stat.label}</p>
                            </div>
                        </div>
                        <p className="text-[10px]" style={{ color: THEME.colors.text.muted }}>{stat.desc}</p>
                    </div>
                ))}
            </div>

            {/* PROGRESS PER MAPEL */}
            <div className="animate-fade-in-up delay-2">
                <Card className="overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between" style={{ background: THEME.gradients.primary }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Progress Penilaian per Mata Pelajaran</h3>
                                <p className="text-xs text-white/70 mt-0.5">
                                    {dashboard.jenis_penilaian_aktif 
                                        ? `Periode ${dashboard.jenis_penilaian_aktif} • ${dashboard.total_komponen} komponen`
                                        : 'Status input nilai'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:bg-white/25"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                        >
                            Input Nilai <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-5">
                        {dashboard.mata_pelajaran_list.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#fff0e5' }}>
                                    <BookOpen className="w-7 h-7" style={{ color: THEME.colors.secondary }} />
                                </div>
                                <p className="text-sm font-semibold" style={{ color: THEME.colors.text.primary }}>Belum ada mata pelajaran</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                {/* Jadwal */}
                <Card>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `1px solid ${THEME.colors.border}` }}>
                            <Calendar size={16} style={{ color: THEME.colors.secondary }} />
                            <p className="text-sm font-bold" style={{ color: THEME.colors.text.primary }}>Jadwal Penting</p>
                        </div>
                        <div className="space-y-3">
                            <JadwalItem label="PTS" status={dashboard.status_pts} tanggal={dashboard.jadwal.pts} />
                            <JadwalItem label="PAS" status={dashboard.status_pas} tanggal={dashboard.jadwal.pas} />
                        </div>
                    </div>
                </Card>

                {/* Konfigurasi */}
                <Card>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `1px solid ${THEME.colors.border}` }}>
                            <Settings size={16} style={{ color: THEME.colors.secondary }} />
                            <p className="text-sm font-bold" style={{ color: THEME.colors.text.primary }}>Status Konfigurasi</p>
                        </div>
                        {dashboard.warnings.length === 0 ? (
                            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#eaf7ef', border: '2px solid #b6e8c8' }}>
                                <CheckCircle2 size={20} className="text-green-600" />
                                <div>
                                    <p className="text-sm font-bold text-green-700">Semua Mapel Sudah Dikonfigurasi</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {dashboard.warnings.map((w, i) => (
                                    <div key={i} className="p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                        <p className="text-xs font-bold text-red-700">{w.mapel}</p>
                                        <p className="text-[11px] text-red-600 mt-0.5">{w.masalah}</p>
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
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                                <AlertCircle size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                {isPeriodLocked ? '🔒 Periode Selesai' : '⏳ Periode Belum Aktif'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            {isPeriodLocked ? 'Data sudah dikunci.' : 'Periode penilaian belum dibuka.'}
                        </p>
                        <button onClick={() => setShowPeriodModal(false)} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: THEME.gradients.primary }}>
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
        aktif: { bg: '#fff0e5', border: '#fde0c8' },
        selesai: { bg: '#f9fafb', border: '#e5e7eb' },
        nonaktif: { bg: '#fef3c7', border: '#fcd34d' },
    };
    const c = statusConfig[status] || statusConfig.nonaktif;

    return (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: c.bg, border: `2px solid ${c.border}` }}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: status === 'aktif' ? THEME.gradients.primary : '#e5e7eb' }}>
                    <AlertCircle size={18} className={status === 'aktif' ? 'text-white' : 'text-gray-400'} />
                </div>
                <div>
                    <p className="text-sm font-bold" style={{ color: THEME.colors.text.primary }}>{label}</p>
                    <p className="text-xs" style={{ color: THEME.colors.text.muted }}>
                        {status === 'aktif' ? '● Aktif' : status === 'selesai' ? '🔒 Selesai' : '⏳ Menunggu'}
                    </p>
                </div>
            </div>
            <span className="text-sm font-semibold" style={{ color: THEME.colors.primary }}>{tanggal || '-'}</span>
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
        <div className="border rounded-xl p-4" style={{ borderColor: isComplete ? '#86efac' : THEME.colors.border }}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: isComplete ? THEME.gradients.tertiary : THEME.gradients.primary }}>
                        {isComplete ? <CheckCircle2 size={18} /> : <BookOpen size={18} />}
                    </div>
                    <div>
                        <p className="text-sm font-bold" style={{ color: THEME.colors.text.primary }}>{mapel.nama}</p>
                        <p className="text-xs" style={{ color: THEME.colors.text.muted }}>{mapel.total_kelas} kelas • {mapel.total_siswa} siswa</p>
                    </div>
                </div>
                <p className={`text-2xl font-bold ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>{percentage}%</p>
            </div>

            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: '#fde0c8' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: isComplete ? '#16a34a' : THEME.gradients.primary }} />
            </div>

            <button
                onClick={() => setShowDetail(!showDetail)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: isComplete ? '#dcfce7' : '#fef9c3', color: isComplete ? '#15803d' : '#92400e' }}
            >
                <span>{isComplete ? '✓ Semua lengkap' : `⚠️ ${incompleteCount} siswa belum lengkap`}</span>
                <span>{showDetail ? 'Sembunyikan' : 'Lihat Detail'} {showDetail ? '▲' : '▼'}</span>
            </button>

            {showDetail && (
                <div className="mt-4 pt-4 border-t" style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setFilterKelas('all')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${filterKelas === 'all' ? 'text-white' : 'bg-gray-100'}`} style={filterKelas === 'all' ? { background: THEME.colors.primary } : {}}>
                            Semua Kelas
                        </button>
                        {kelasList.map(k => (
                            <button key={k} onClick={() => setFilterKelas(k)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${filterKelas === k ? 'text-white' : 'bg-gray-100'}`} style={filterKelas === k ? { background: THEME.colors.primary } : {}}>
                                {k}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setFilterStatus('all')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === 'all' ? 'text-white' : 'bg-gray-100'}`} style={filterStatus === 'all' ? { background: THEME.colors.primary } : {}}>
                            Semua
                        </button>
                        <button onClick={() => setFilterStatus('incomplete')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === 'incomplete' ? 'text-white' : 'bg-gray-100'}`} style={filterStatus === 'incomplete' ? { background: '#ef4444' } : {}}>
                            Belum ({incompleteCount})
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
                        {Object.entries(groupedByKelas).map(([kelasName, siswaList]) => (
                            <div key={kelasName}>
                                <div className="flex items-center justify-between mb-2 p-2 rounded-lg" style={{ background: '#fff0e5', border: `1px solid #fed7aa` }}>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-orange-600" />
                                        <p className="text-xs font-bold text-orange-800">Kelas {kelasName}</p>
                                    </div>
                                    <span className="text-[10px] text-orange-600">{siswaList.filter(s => s.jumlah_komponen_terisi < s.total_komponen).length} belum</span>
                                </div>
                                <div className="space-y-2 ml-2">
                                    {siswaList.map(siswa => (
                                        <div key={siswa.id_siswa} className="p-3 rounded-lg text-xs" style={{ background: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#f0fdf4' : '#fef2f2', border: `1px solid ${siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#bbf7d0' : '#fecaca'}` }}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: THEME.colors.text.primary }}>{siswa.nama}</p>
                                                    <p className="text-[10px]" style={{ color: THEME.colors.text.muted }}>NIS: {siswa.nis}</p>
                                                </div>
                                                {siswa.jumlah_komponen_terisi === siswa.total_komponen ? (
                                                    <span className="text-[10px] font-bold text-green-700">LENGKAP</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-red-700">BELUM</span>
                                                )}
                                            </div>
                                            
                                            {siswa.komponen_detail && siswa.komponen_detail.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-1 mb-2">
                                                    {siswa.komponen_detail.map((komp, idx) => (
                                                        <div key={idx} className="flex items-center gap-1 text-[10px]">
                                                            {komp.status === 'sudah' ? <Check size={10} className="text-green-600" /> : <XIcon size={10} className="text-red-600" />}
                                                            <span className={komp.status === 'sudah' ? 'text-gray-700' : 'text-gray-500'}>{komp.nama_komponen}:</span>
                                                            <span className={`font-bold ${komp.status === 'sudah' ? 'text-green-700' : 'text-red-600'}`}>{komp.nilai ?? '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mb-2">
                                                    <div className="h-1.5 rounded-full overflow-hidden bg-gray-200">
                                                        <div className="h-full rounded-full" style={{ width: `${(siswa.jumlah_komponen_terisi / siswa.total_komponen) * 100}%`, background: siswa.jumlah_komponen_terisi === siswa.total_komponen ? '#16a34a' : '#ef4444' }} />
                                                    </div>
                                                    <p className="text-[10px] mt-1" style={{ color: THEME.colors.text.muted }}>{siswa.jumlah_komponen_terisi}/{siswa.total_komponen} komponen</p>
                                                </div>
                                            )}
                                            
                                            {siswa.nilai_rapor !== null && (
                                                <div className="flex items-center justify-between pt-2 border-t" style={{ borderTop: `1px solid ${THEME.colors.border}` }}>
                                                    <span className="text-[10px]" style={{ color: THEME.colors.text.secondary }}>Rapor:</span>
                                                    <span className="text-lg font-bold text-green-700">{siswa.nilai_rapor}</span>
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