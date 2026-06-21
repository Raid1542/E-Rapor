'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Users, DoorOpen, Calendar, BookOpen,
    ClipboardList, CheckCircle2, Clock, AlertCircle,
    ChevronRight, GraduationCap, PieChart,
    Award, X, WifiOff, ShieldAlert
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

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .dg-fadeIn  { animation: dg-fadeIn  0.2s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.15s; }
    `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

const ProgressBar = ({ value, total }: { value: number; total: number }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const isDone = value === total && total > 0;
    const isNone = value === 0;
    const color = isDone ? '#15803d' : isNone ? '#dc2626' : '#e8690a';

    return (
        <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-[6px] rounded-full overflow-hidden bg-orange-100">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="text-[11px] text-gray-500 tabular-nums min-w-[40px] text-right font-semibold">
                {value}/{total}
            </span>
        </div>
    );
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const StatusBadge = ({ done, total }: { done: number; total: number }) => {
    const isDone = done === total && total > 0;
    const isNone = done === 0;

    const config = isDone
        ? { label: 'Selesai', bg: '#dcfce7', color: '#15803d', border: '#86efac', Icon: CheckCircle2 }
        : isNone
        ? { label: 'Belum', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', Icon: AlertCircle }
        : { label: 'Proses', bg: '#fff7ed', color: '#c2410c', border: '#fdba74', Icon: Clock };

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap"
            style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
        >
            <config.Icon size={12} />
            {config.label}
        </span>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function GuruKelasDashboard() {
    const { showSessionExpired, handleLogout } = useSession();
    const router = useRouter();

    const [user, setUser] = useState<UserData | null>(null);
    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [progress, setProgress] = useState<NilaiProgress[]>([]);
    const [loading, setLoading] = useState(true);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = (cfg: ModalConfig) => setModal(cfg);
    const closeModal = () => setModal(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) { router.push('/login'); return; }

        try {
            const parsedUser: UserData = JSON.parse(userData);
            if (parsedUser.role !== 'guru kelas') { router.push('/login'); return; }
            setUser(parsedUser);

            const fetchAll = async () => {
                try {
                    const resKelas = await fetch('http://localhost:5000/api/guru-kelas/kelas', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const dataKelas = await resKelas.json();
                    if (Array.isArray(dataKelas) && dataKelas.length > 0) setKelasInfo(dataKelas[0]);

                    const resProgress = await fetch('http://localhost:5000/api/guru-kelas/progress-penilaian', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const dataProgress = await resProgress.json();
                    if (Array.isArray(dataProgress.data)) setProgress(dataProgress.data);
                } catch (err) {
                    console.error('Gagal memuat data dashboard:', err);
                    showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal memuat data dashboard.' });
                } finally {
                    setLoading(false);
                }
            };

            fetchAll();
        } catch (e) {
            console.error('Error parsing user:', e);
            router.push('/login');
        }
    }, [router]);

    // ── Loading ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    // ── Empty state ────────────────────────────────────────────────────────────

    if (!user || !kelasInfo) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ditugaskan</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini.
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
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Derived stats ──────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const totalMapel = progress.length;
        const selesai = progress.filter(p => p.belum_dinilai === 0 && p.total_siswa > 0).length;
        const belumMulai = progress.filter(p => p.sudah_dinilai === 0).length;
        const sedangBerjalan = totalMapel - selesai - belumMulai;
        const overallPct = totalMapel > 0 ? Math.round((selesai / totalMapel) * 100) : 0;

        const CIRC = 87.96;
        const filled = (overallPct / 100) * CIRC;
        const empty = CIRC - filled;

        return { totalMapel, selesai, belumMulai, sedangBerjalan, overallPct, filled, empty };
    }, [progress]);

    // ── Stat cards config ──────────────────────────────────────────────────────

    const statCards = [
        {
            label: 'Total Siswa',
            value: kelasInfo.jumlah_siswa,
            icon: <Users size={18} />,
            path: '/guru_kelas/data_siswa',
            linkLabel: 'Lihat data siswa',
            activeNow: false,
        },
        {
            label: 'Kelas',
            value: kelasInfo.kelas,
            icon: <DoorOpen size={18} />,
            path: '/guru_kelas/data_siswa',
            linkLabel: 'Lihat detail',
            activeNow: false,
        },
        {
            label: 'Tahun Ajaran',
            value: kelasInfo.tahun_ajaran,
            icon: <Calendar size={18} />,
            path: null,
            linkLabel: null,
            activeNow: true,
        },
        {
            label: 'Mata Pelajaran',
            value: stats.totalMapel,
            icon: <BookOpen size={18} />,
            path: '/guru_kelas/input_nilai',
            linkLabel: 'Input nilai',
            activeNow: false,
        },
    ];

    const statusItems = [
        { label: 'Selesai', value: stats.selesai, bg: '#dcfce7', color: '#15803d', border: '#86efac', Icon: CheckCircle2 },
        { label: 'Sedang berjalan', value: stats.sedangBerjalan, bg: '#fff7ed', color: '#c2410c', border: '#fdba74', Icon: Clock },
        { label: 'Belum dimulai', value: stats.belumMulai, bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', Icon: AlertCircle },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ── Banner ── */}
            <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '1px solid #fde0c8', boxShadow: '0 4px 20px rgba(200,80,10,0.12)' }}>
                <div className="relative px-7 py-7 overflow-hidden" style={HEADER_GRAD}>
                    <GraduationCap
                        className="absolute -right-4 -bottom-5 w-44 h-44 opacity-10 -rotate-6"
                        style={{ color: '#fff' }}
                        strokeWidth={0.8}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <span className="inline-flex items-center gap-1.5 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
                                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                <Award size={12} />
                                Panel Wali Kelas
                            </span>
                            <h2 className="text-white text-[22px] font-bold mb-1.5">
                                Selamat Datang, {user.nama_lengkap || 'Guru'} 👋
                            </h2>
                            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.90)' }}>
                                Kelola siswa dan penilaian kelas{' '}
                                <strong className="text-white font-bold">{kelasInfo.kelas}</strong>
                                {' '}— T.A {kelasInfo.tahun_ajaran} Semester {kelasInfo.semester}
                            </p>
                        </div>

                        <div className="relative z-10 flex-shrink-0">
                            <div className="rounded-2xl px-6 py-4 text-center"
                                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                                <div className="text-3xl font-bold text-white leading-none">{stats.overallPct}%</div>
                                <div className="text-[11px] mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                    Penilaian selesai
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className="bg-white rounded-2xl p-5 flex flex-col transition-all duration-200 hover:shadow-lg cursor-pointer"
                        style={CARD_STYLE}
                        onClick={() => card.path && router.push(card.path)}
                    >
                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                            style={{ background: '#fff7ed', color: '#c2410c' }}>
                            {card.icon}
                        </div>

                        {/* Value */}
                        <div className="font-bold text-gray-900 mb-1 truncate"
                            style={{ fontSize: typeof card.value === 'string' && card.value.length > 5 ? '18px' : '26px' }}>
                            {card.value}
                        </div>

                        {/* Label */}
                        <div className="text-[12px] text-gray-500 mb-4 font-medium">{card.label}</div>

                        {/* Footer */}
                        <div className="border-t pt-3 mt-auto" style={{ borderColor: '#fde0c8' }}>
                            {card.activeNow ? (
                                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-green-600">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    Aktif sekarang
                                </span>
                            ) : card.path && card.linkLabel ? (
                                <span className="flex items-center gap-0.5 text-[12px] font-bold transition-all"
                                    style={{ color: '#c2410c' }}>
                                    {card.linkLabel}
                                    <ChevronRight size={13} />
                                </span>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Bottom section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Ringkasan */}
                <div className="bg-white rounded-2xl p-6 transition-all duration-200 hover:shadow-lg" style={CARD_STYLE}>
                    <div className="flex items-center gap-2.5 pb-4 mb-5 border-b" style={{ borderColor: '#fde0c8' }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fff7ed' }}>
                            <PieChart size={18} style={{ color: '#c2410c' }} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Ringkasan Penilaian</p>
                            <p className="text-xs text-gray-500">
                                Semester {kelasInfo.semester} · {kelasInfo.tahun_ajaran}
                            </p>
                        </div>
                    </div>

                    {/* Ring */}
                    <div className="flex flex-col items-center py-4 pb-6">
                        <div className="relative w-36 h-36">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="14"
                                    fill="none" stroke="#fed7aa" strokeWidth="3.5" />
                                <circle cx="18" cy="18" r="14"
                                    fill="none"
                                    stroke="#e8690a"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeDasharray={`${stats.filled} ${stats.empty}`}
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-900 leading-none">{stats.overallPct}%</span>
                                <span className="text-[11px] text-gray-500 mt-1.5 font-medium">selesai</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3 font-medium">
                            <span className="font-bold" style={{ color: '#c2410c' }}>{stats.selesai}</span>
                            {' '}dari <span className="font-bold">{stats.totalMapel}</span> mata pelajaran
                        </p>
                    </div>

                    {/* Status list */}
                    <div className="flex flex-col gap-2.5">
                        {statusItems.map((s) => (
                            <div
                                key={s.label}
                                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
                                style={{ background: s.bg, border: `1px solid ${s.border}` }}
                            >
                                <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: s.color }}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                        style={{ background: `${s.color}15` }}>
                                        <s.Icon size={14} />
                                    </div>
                                    {s.label}
                                </div>
                                <span className="text-base font-bold tabular-nums" style={{ color: s.color }}>
                                    {s.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabel progress */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 transition-all duration-200 hover:shadow-lg" style={CARD_STYLE}>
                    <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: '#fde0c8' }}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fff7ed' }}>
                                <ClipboardList size={18} style={{ color: '#c2410c' }} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Progress Per Mata Pelajaran</p>
                                <p className="text-xs text-gray-500">Status pengisian nilai siswa</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/guru_kelas/input_nilai')}
                            className={btnPrimary.base}
                            style={btnPrimary.style}
                            onMouseEnter={btnPrimary.hover}
                            onMouseLeave={btnPrimary.leave}
                        >
                            Input Nilai <ChevronRight size={12} />
                        </button>
                    </div>

                    {progress.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#fff7ed' }}>
                                <ClipboardList size={32} style={{ color: '#c2410c' }} />
                            </div>
                            <p className="text-sm font-bold text-gray-700">Belum Ada Data Penilaian</p>
                            <p className="text-xs text-gray-500 text-center max-w-xs">
                                Data progress akan muncul setelah mata pelajaran tersedia untuk penilaian.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden sm:grid grid-cols-[1fr_200px_110px] gap-3 px-3 pb-3 border-b mb-2" style={{ borderColor: '#fde0c8' }}>
                                {['Mata Pelajaran', 'Progress', 'Status'].map((h, i) => (
                                    <span
                                        key={h}
                                        className="text-[11px] font-bold uppercase tracking-wider text-gray-500"
                                        style={{ textAlign: i === 2 ? 'right' : 'left' }}
                                    >
                                        {h}
                                    </span>
                                ))}
                            </div>

                            <div className="max-h-[360px] overflow-y-auto">
                                {progress.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[1fr_200px_110px] sm:items-center sm:gap-3 py-3.5 px-3 rounded-xl transition-all duration-200 hover:bg-orange-50/50"
                                        style={{ borderBottom: i !== progress.length - 1 ? '1px solid #fde0c8' : 'none' }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
                                                style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fde0c8' }}>
                                                {item.kode_mapel}
                                            </span>
                                            <span className="text-[13px] font-semibold text-gray-800 truncate">
                                                {item.mata_pelajaran}
                                            </span>
                                            {item.jenis === 'pilihan' && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 flex-shrink-0">
                                                    PILIHAN
                                                </span>
                                            )}
                                        </div>

                                        <ProgressBar value={item.sudah_dinilai} total={item.total_siswa} />

                                        <div className="flex justify-start sm:justify-end">
                                            <StatusBadge done={item.sudah_dinilai} total={item.total_siswa} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}