"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ChevronRight, Users, Award, Book,
    TrendingUp, BookOpen, Settings,
    ArrowRight, Sparkles, Target, AlertTriangle,
    CheckCircle2, AlertCircle, CalendarDays, LogOut, X,
    GraduationCap, ClipboardList, ArrowUpRight, UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface UserData {
    id: string;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
}

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface KelasInfo {
    kelas: string;
    jumlah_siswa: number;
    tahun_ajaran: string;
    semester: string;
}

interface NilaiProgress {
    mata_pelajaran: string;
    kode_mapel: string;
    sudah_dinilai: number;
    belum_dinilai: number;
    total_siswa: number;
    jenis: 'wajib' | 'pilihan';
}

interface DashboardData {
    status_pts: 'aktif' | 'nonaktif' | 'selesai';
    status_pas: 'aktif' | 'nonaktif' | 'selesai';
    kelas_info: KelasInfo;
    progress_list: NilaiProgress[];
    total_mapel: number;
    total_siswa: number;
    overall_progress: number;
}

/* ==========================================================================
   THEME - SAMA DENGAN ADMIN DASHBOARD
   ========================================================================== */
const THEME = {
    statCards: [
        { iconBg: '#e8690a', cardBg: '#fff5ee', cardBorder: '#fdd9b5', label: 'Total Siswa',    path: '/guru_kelas/data_siswa' },
        { iconBg: '#c95b08', cardBg: '#fff2ea', cardBorder: '#fcc9a0', label: 'Kelas',          path: '/guru_kelas/data_siswa' },
        { iconBg: '#e07b1a', cardBg: '#fff6f0', cardBorder: '#fdd4b0', label: 'Mata Pelajaran', path: '/guru_kelas/input_nilai' },
        { iconBg: '#d4700f', cardBg: '#fff4ec', cardBorder: '#fccaa5', label: 'Progress',       path: '/guru_kelas/input_nilai' },
    ],
    primary:     '#c95b08',
    primaryMid:  '#e8690a',
    chartColors: ['#c95b08', '#e8690a', '#f0953a', '#f5a947', '#ffc080'],
    semantic: { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
};

/* STATUS badge - SAMA DENGAN ADMIN */
type StatusType = 'aktif' | 'nonaktif' | 'selesai';
const STATUS_CFG: Record<StatusType, { bg: string; color: string; border: string; dot: string; label: string }> = {
    aktif:    { bg: '#e6f9f0', color: '#0d6e48', border: '#6dd4c4', dot: '#10b981', label: 'Aktif' },
    selesai:  { bg: '#fff7e6', color: '#8b4513', border: '#ffc080', dot: '#f59e0b', label: 'Selesai' },
    nonaktif: { bg: '#f5f5f5', color: '#666666', border: '#d0d0d0', dot: '#9ca3af', label: 'Belum Aktif' },
};

// ─── GLOBAL STYLES - SAMA DENGAN ADMIN ────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes growBar {
            from { transform: scaleX(0); }
            to   { transform: scaleX(1); }
        }
        @keyframes pulseDot {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.35; }
        }
        @keyframes db-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes db-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes db-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

        .anim-in { animation: fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.10s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.20s; }
        .d5 { animation-delay: 0.25s; }
        .d6 { animation-delay: 0.30s; }

        .grow-bar { transform-origin: left; animation: growBar 0.8s cubic-bezier(0.4,0,0.2,1) forwards; }
        .pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }

        .db-fadeIn  { animation: db-fadeIn  0.2s ease; }
        .db-scaleIn { animation: db-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .db-pulse   { animation: db-pulse   0.6s ease 0.15s; }

        /* STAT CARD */
        .stat-card {
            transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                        box-shadow 0.28s ease;
            cursor: pointer;
        }
        .stat-card:hover {
            transform: translateY(-5px) scale(1.025);
            box-shadow: 0 14px 32px rgba(180,70,10,0.18) !important;
        }
        .stat-card:hover .s-icon  { transform: scale(1.18) rotate(-6deg); }
        .stat-card:hover .s-arrow { opacity: 1; transform: translate(2px,-2px); }
        .stat-card:hover .s-value { transform: scale(1.06); transform-origin: left; }
        .stat-card:active { transform: translateY(-2px) scale(0.99); }

        .s-icon  { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .s-arrow { opacity: 0.45; transition: opacity 0.2s ease, transform 0.2s ease; }
        .s-value { transition: transform 0.2s ease; display: inline-block; }

        /* SECTION CARD */
        .section-card {
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1),
                        box-shadow 0.25s ease;
        }
        .section-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 28px rgba(180,70,10,0.13) !important;
        }

        /* ITEM HOVER */
        .item-hover {
            transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
                        background 0.18s ease, box-shadow 0.18s ease;
            cursor: pointer;
        }
        .item-hover:hover {
            transform: translateY(-2px);
            background: #fff0e5 !important;
            box-shadow: 0 4px 14px rgba(180,70,10,0.12);
        }

        /* BUTTON */
        .btn-primary {
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .btn-primary:hover  { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(180,70,10,0.28); }
        .btn-primary:active { transform: translateY(0); }
    `}</style>
);

/* ==========================================================================
   SUB-COMPONENTS - SAMA DENGAN ADMIN
   ========================================================================== */

const CardHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div
        className="flex items-center gap-3 px-6 py-4"
        style={{
            background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 60%, #f5870a 100%)',
            borderBottom: '1px solid #fde0c8',
            borderRadius: '14px 14px 0 0',
        }}
    >
        <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.22)' }}
        >
            {icon}
        </div>
        <div>
            <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
            <p className="text-[11px] text-white/70">{subtitle}</p>
        </div>
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

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <AlertTriangle size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <AlertCircle size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 db-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 db-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} db-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function GuruKelasDashboard() {
    const { showSessionExpired, handleLogout } = useSession();
    const router = useRouter();

    const [user, setUser] = useState<UserData | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNotAssigned, setIsNotAssigned] = useState(false);
    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [periodModalShown, setPeriodModalShown] = useState(false);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const stats = useMemo(() => {
        if (!dashboard) return { totalMapel: 0, selesai: 0, belumMulai: 0, sedangBerjalan: 0, overallPct: 0, filled: 0, empty: 0 };
        
        const totalMapel = dashboard.progress_list.length;
        const selesai = dashboard.progress_list.filter(p => p.belum_dinilai === 0 && p.total_siswa > 0).length;
        const belumMulai = dashboard.progress_list.filter(p => p.sudah_dinilai === 0).length;
        const sedangBerjalan = totalMapel - selesai - belumMulai;
        const overallPct = dashboard.overall_progress;

        const CIRC = 87.96;
        const filled = (overallPct / 100) * CIRC;
        const empty = CIRC - filled;

        return { totalMapel, selesai, belumMulai, sedangBerjalan, overallPct, filled, empty };
    }, [dashboard]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) { router.push('/login'); return; }

        try {
            const parsedUser: UserData = JSON.parse(userData);
            if (parsedUser.role !== 'guru_kelas') { router.push('/login'); return; }
            setUser(parsedUser);

            const fetchDashboard = async () => {
                try {
                    const headers = { Authorization: `Bearer ${token}` };
                    
                    const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', { headers });
                    const taData = await taRes.json().catch(() => ({ data: {} }));
                    
                    const kelasRes = await fetch('http://localhost:5000/api/guru-kelas/kelas', { headers });
                    
                    if (kelasRes.status === 404) {
                        setIsNotAssigned(true);
                        setLoading(false);
                        return;
                    }
                    
                    const kelasData = await kelasRes.json();
                    
                    const progressRes = await fetch('http://localhost:5000/api/guru-kelas/progress-penilaian', { headers });
                    const progressData = await progressRes.json().catch(() => ({ data: [] }));

                    let kelasInfo: KelasInfo;
                    if (kelasData.success && kelasData.data) {
                        kelasInfo = {
                            kelas: kelasData.data.nama_kelas,
                            jumlah_siswa: kelasData.data.jumlah_siswa,
                            tahun_ajaran: kelasData.data.tahun_ajaran || taData.data?.tahun_ajaran || '2024/2025',
                            semester: kelasData.data.semester || taData.data?.semester || 'Ganjil'
                        };
                    } else if (Array.isArray(kelasData) && kelasData.length > 0) {
                        kelasInfo = {
                            kelas: kelasData[0].nama_kelas || kelasData[0].kelas,
                            jumlah_siswa: kelasData[0].jumlah_siswa || 0,
                            tahun_ajaran: kelasData[0].tahun_ajaran || taData.data?.tahun_ajaran || '2024/2025',
                            semester: kelasData[0].semester || taData.data?.semester || 'Ganjil'
                        };
                    } else {
                        setIsNotAssigned(true);
                        setLoading(false);
                        return;
                    }

                    const progressList: NilaiProgress[] = Array.isArray(progressData.data) ? progressData.data : [];
                    const totalSiswa = kelasInfo.jumlah_siswa;
                    const totalMapel = progressList.length;
                    
                    const totalPenilaianDibutuhkan = totalSiswa * totalMapel;
                    const totalPenilaianAda = progressList.reduce((sum, p) => sum + p.sudah_dinilai, 0);
                    const overallProgress = totalPenilaianDibutuhkan > 0 
                        ? Math.round((totalPenilaianAda / totalPenilaianDibutuhkan) * 100) 
                        : 0;

                    setDashboard({
                        status_pts: taData.data?.status_pts || 'nonaktif',
                        status_pas: taData.data?.status_pas || 'nonaktif',
                        kelas_info: kelasInfo,
                        progress_list: progressList,
                        total_mapel: totalMapel,
                        total_siswa: totalSiswa,
                        overall_progress: overallProgress
                    });

                } catch (err) {
                    console.error('❌ Error fetching data:', err);
                    showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal memuat data dashboard.' });
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
            <div className="flex items-center justify-center min-h-screen bg-white">
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
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center bg-white">
                <GlobalStyles />
                {modal && <NotifModal modal={modal} onClose={closeModal} />}
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 db-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 db-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 db-pulse">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Anda belum ditugaskan sebagai guru kelas di tahun ajaran ini.
                                <br />
                                Silakan hubungi Administrator untuk penugasan kelas.
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                boxShadow: '0 3px 12px rgba(232,105,10,0.3)'
                            }}
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || !dashboard) return null;

    const isPeriodNotActive = dashboard.status_pts !== 'aktif' && dashboard.status_pas !== 'aktif';
    const isPeriodLocked = dashboard.status_pts === 'selesai' && dashboard.status_pas === 'selesai';

    const statValues = [dashboard.total_siswa, dashboard.kelas_info.kelas, dashboard.total_mapel, `${dashboard.overall_progress}%`];
    const statIcons = [
        <Users className="w-5 h-5 text-white" />,
        <GraduationCap className="w-5 h-5 text-white" />,
        <BookOpen className="w-5 h-5 text-white" />,
        <Target className="w-5 h-5 text-white" />,
    ];

    const statusItems = [
        { label: 'Selesai', value: stats.selesai, bg: '#e6f9f0', color: '#0d6e48', border: '#6dd4c4', Icon: CheckCircle2 },
        { label: 'Sedang berjalan', value: stats.sedangBerjalan, bg: '#fff7e6', color: '#8b4513', border: '#ffc080', Icon: CalendarDays },
        { label: 'Belum dimulai', value: stats.belumMulai, bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', Icon: AlertCircle },
    ];

    return (
        <div className="flex-1 min-h-screen p-8 bg-white">
            <GlobalStyles />

            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ── HEADER: teks polos, tanpa card ── */}
            <div className="mb-8 anim-in d1">
                <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill="#c95b08"/>
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c95b08' }}>
                        Dashboard Guru Kelas
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Selamat Datang, {user.nama_lengkap || 'Guru'} 👋
                </h1>
                <p className="text-sm text-gray-400">
                    Kelas {dashboard.kelas_info.kelas} • {dashboard.kelas_info.tahun_ajaran} - {dashboard.kelas_info.semester}
                </p>
                <div className="mt-5 h-px" style={{ background: 'linear-gradient(to right, #fde0c8, transparent)' }} />
            </div>

            {/* ── 4 STAT CARDS: soft pastel ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {THEME.statCards.map((card, i) => (
                    <div
                        key={card.label}
                        className={`stat-card rounded-2xl p-5 anim-in d${i + 1}`}
                        style={{
                            background: card.cardBg,
                            border: `1.5px solid ${card.cardBorder}`,
                            boxShadow: '0 2px 8px rgba(180,70,10,0.07)',
                        }}
                        onClick={() => router.push(card.path)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="s-icon w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: card.iconBg }}
                            >
                                {statIcons[i]}
                            </div>
                            <ArrowUpRight className="s-arrow w-4 h-4" style={{ color: card.iconBg }} />
                        </div>
                        <p className="s-value text-3xl font-bold text-gray-900 mb-1">{statValues[i]}</p>
                        <p className="text-sm font-semibold" style={{ color: card.iconBg }}>{card.label}</p>
                    </div>
                ))}
            </div>

            {/* ── PROGRESS PENILAIAN + PERIODE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Progress Penilaian per Mapel */}
                <div
                    className="section-card lg:col-span-2 rounded-2xl overflow-hidden anim-in d2"
                    style={{ border: '1.5px solid #fde0c8', boxShadow: '0 2px 12px rgba(180,70,10,0.08)' }}
                >
                    <CardHeader
                        icon={<TrendingUp className="w-5 h-5 text-white" />}
                        title="Progress Penilaian per Mata Pelajaran"
                        subtitle="Status input nilai siswa"
                    />
                    <div className="p-6 bg-white">
                        {dashboard.progress_list.length === 0 ? (
                            <div className="text-center py-12">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ background: '#fff5ee' }}
                                >
                                    <ClipboardList className="w-10 h-10" style={{ color: '#e8690a' }} />
                                </div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">
                                    Belum Ada Mata Pelajaran
                                </p>
                                <p className="text-xs text-gray-400 mb-6">
                                    Hubungi administrator untuk penugasan mata pelajaran
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: 'Total Mapel', value: dashboard.total_mapel, icon: <BookOpen className="w-5 h-5" style={{ color: THEME.primary }} /> },
                                        { label: 'Total Siswa', value: dashboard.total_siswa, icon: <Users className="w-5 h-5" style={{ color: THEME.primaryMid }} /> },
                                        { label: 'Progress', value: `${dashboard.overall_progress}%`, icon: <Target className="w-5 h-5" style={{ color: '#f5870a' }} /> },
                                    ].map(s => (
                                        <div
                                            key={s.label}
                                            className="rounded-xl p-4 text-center"
                                            style={{ background: '#fff5ee', border: '1px solid #fde0c8' }}
                                        >
                                            <div className="flex justify-center mb-2">{s.icon}</div>
                                            <p className="text-2xl font-bold mb-1" style={{ color: THEME.primary }}>{s.value}</p>
                                            <p className="text-xs font-semibold text-gray-500">{s.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Mapel list */}
                                <div className="space-y-3">
                                    {dashboard.progress_list.map((mapel, idx) => {
                                        const percentage = mapel.total_siswa > 0
                                            ? Math.round((mapel.sudah_dinilai / mapel.total_siswa) * 100)
                                            : 0;
                                        const isComplete = percentage === 100;
                                        const isHighProgress = percentage >= 60;

                                        return (
                                            <div
                                                key={mapel.kode_mapel}
                                                className="item-hover p-4 rounded-xl"
                                                style={{ background: '#fafafa', border: '1px solid #f0e0d0' }}
                                                onClick={() => router.push('/guru_kelas/input_nilai')}
                                            >
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                            style={{ background: isComplete ? THEME.semantic.success : THEME.chartColors[idx % THEME.chartColors.length] }}
                                                        >
                                                            {isComplete ? <CheckCircle2 size={18} /> : mapel.kode_mapel.slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{mapel.mata_pelajaran}</p>
                                                            <p className="text-[10px] text-gray-400">
                                                                {mapel.sudah_dinilai}/{mapel.total_siswa} siswa dinilai
                                                                {mapel.jenis === 'pilihan' && ' • Pilihan'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                            style={{
                                                                background: isComplete ? '#e6f9f0' : isHighProgress ? '#fff7e6' : '#fee2e2',
                                                                color: isComplete ? '#0d6e48' : isHighProgress ? '#8b4513' : '#991b1b',
                                                            }}
                                                        >
                                                            {percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 rounded-full flex overflow-hidden bg-gray-100">
                                                    <div
                                                        className="grow-bar"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            background: isComplete
                                                                ? THEME.semantic.success
                                                                : `linear-gradient(90deg, ${THEME.primary}, ${THEME.primaryMid})`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => router.push('/guru_kelas/input_nilai')}
                                    className="btn-primary w-full mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                                    style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a)', boxShadow: '0 3px 12px rgba(180,70,10,0.22)' }}
                                >
                                    Input Nilai <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Periode Penilaian */}
                <div
                    className="section-card rounded-2xl overflow-hidden anim-in d3"
                    style={{ border: '1.5px solid #fde0c8', boxShadow: '0 2px 12px rgba(180,70,10,0.08)' }}
                >
                    <CardHeader
                        icon={<CalendarDays className="w-5 h-5 text-white" />}
                        title="Periode Penilaian"
                        subtitle="Status periode aktif"
                    />
                    <div className="p-5 bg-white space-y-3">
                        {/* PTS */}
                        <div
                            className="item-hover p-4 rounded-xl"
                            style={{ background: '#fafafa', border: '1px solid #f0e0d0' }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm text-gray-800">PTS</span>
                                <StatusBadge status={dashboard.status_pts} />
                            </div>
                            <p className="text-xs text-gray-400">Penilaian Tengah Semester</p>
                        </div>
                        {/* PAS */}
                        <div
                            className="item-hover p-4 rounded-xl"
                            style={{ background: '#fafafa', border: '1px solid #f0e0d0' }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm text-gray-800">PAS</span>
                                <StatusBadge status={dashboard.status_pas} />
                            </div>
                            <p className="text-xs text-gray-400">Penilaian Akhir Semester</p>
                        </div>

                        {/* Ringkasan */}
                        <div className="pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                            <p className="text-xs font-bold text-gray-600 mb-3">Ringkasan Penilaian</p>
                            <div className="flex flex-col gap-2">
                                {statusItems.map((s) => (
                                    <div
                                        key={s.label}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                                    >
                                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: s.color }}>
                                            <s.Icon size={14} />
                                            {s.label}
                                        </div>
                                        <span className="text-sm font-bold" style={{ color: s.color }}>
                                            {s.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/guru_kelas/input_nilai')}
                            className="btn-primary w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a)', boxShadow: '0 3px 12px rgba(180,70,10,0.22)' }}
                        >
                            Lihat Detail <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Period Modal */}
            {showPeriodModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 db-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowPeriodModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 db-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={24} className="text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {isPeriodLocked ? '🔒 Periode Penilaian Selesai' : '⏳ Periode Penilaian Belum Aktif'}
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <p>
                                {isPeriodLocked
                                    ? 'Baik PTS maupun PAS telah selesai. Data nilai sudah dikunci dan tidak dapat diubah.'
                                    : 'Baik PTS maupun PAS belum dibuka oleh admin. Anda dapat melihat data dashboard, tetapi belum dapat menginput nilai siswa.'}
                            </p>
                            {isPeriodNotActive && (
                                <p className="text-xs" style={{ color: '#c95b08' }}>
                                    💡 <strong>Tip:</strong> Silakan hubungi Administrator untuk membuka periode penilaian.
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => setShowPeriodModal(false)}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                            style={{
                                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                boxShadow: '0 3px 10px rgba(232,105,10,0.3)'
                            }}
                        >
                            Ok
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}