'use client';

import { useEffect, useState } from 'react';
import {
    Users, DoorOpen, Calendar, BookOpen,
    ClipboardList, CheckCircle2, Clock, AlertCircle,
    ChevronRight, GraduationCap, PieChart,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

// ─── DESIGN TOKEN ─────────────────────────────────────────────────────────────

const ORANGE = '#E8570A';

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

const ProgressBar = ({ value, total }: { value: number; total: number }) => {
    const pct    = total > 0 ? Math.round((value / total) * 100) : 0;
    const isDone = value === total && total > 0;
    const isNone = value === 0;
    const color  = isDone ? '#15803d' : isNone ? '#dc2626' : '#b45309';

    return (
        <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-[5px] rounded-full overflow-hidden bg-gray-100">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="text-[11px] text-gray-400 tabular-nums min-w-[36px] text-right">
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
        ? { label: 'Selesai', bg: '#ecfdf3', color: '#15803d', Icon: CheckCircle2 }
        : isNone
        ? { label: 'Belum',   bg: '#fef2f2', color: '#b91c1c', Icon: AlertCircle  }
        : { label: 'Proses',  bg: '#fff7ed', color: '#c2410c', Icon: Clock        };

    return (
        <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: config.bg, color: config.color }}
        >
            <config.Icon size={11} />
            {config.label}
        </span>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function GuruKelasDashboard() {
    const [user,      setUser]      = useState<UserData | null>(null);
    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [progress,  setProgress]  = useState<NilaiProgress[]>([]);
    const [loading,   setLoading]   = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token    = localStorage.getItem('token');
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
            <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-gray-50">
                <div
                    className="w-8 h-8 rounded-full border-[3px] border-gray-200 animate-spin"
                    style={{ borderTopColor: ORANGE }}
                />
                <p className="text-sm text-gray-400">Memuat data...</p>
            </div>
        );
    }

    // ── Empty state ────────────────────────────────────────────────────────────

    if (!user || !kelasInfo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-gray-50 text-center p-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#fff3ec' }}>
                    <ClipboardList className="w-6 h-6" style={{ color: ORANGE }} />
                </div>
                <p className="text-sm font-semibold text-gray-800">Belum Ditugaskan</p>
                <p className="text-xs text-gray-400 max-w-xs">
                    Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini.
                </p>
            </div>
        );
    }

    // ── Derived stats ──────────────────────────────────────────────────────────

    const totalMapel     = progress.length;
    const selesai        = progress.filter(p => p.belum_dinilai === 0 && p.total_siswa > 0).length;
    const belumMulai     = progress.filter(p => p.sudah_dinilai === 0).length;
    const sedangBerjalan = totalMapel - selesai - belumMulai;
    const overallPct     = totalMapel > 0 ? Math.round((selesai / totalMapel) * 100) : 0;

    const CIRC  = 87.96;
    const filled = (overallPct / 100) * CIRC;
    const empty  = CIRC - filled;

    // ── Stat cards config ──────────────────────────────────────────────────────

    const statCards = [
        {
            label:     'Total Siswa',
            value:     kelasInfo.jumlah_siswa,
            icon:      <Users size={18} />,
            path:      '/guru_kelas/data_siswa',
            linkLabel: 'Lihat data siswa',
            activeNow: false,
        },
        {
            label:     'Kelas',
            value:     kelasInfo.kelas,
            icon:      <DoorOpen size={18} />,
            path:      '/guru_kelas/data_siswa',
            linkLabel: 'Lihat detail',
            activeNow: false,
        },
        {
            label:     'Tahun Ajaran',
            value:     kelasInfo.tahun_ajaran,
            icon:      <Calendar size={18} />,
            path:      null,
            linkLabel: null,
            activeNow: true,
        },
        {
            label:     'Mata Pelajaran',
            value:     totalMapel,
            icon:      <BookOpen size={18} />,
            path:      '/guru_kelas/input_nilai',
            linkLabel: 'Input nilai',
            activeNow: false,
        },
    ];

    const statusItems = [
        { label: 'Selesai',         value: selesai,        bg: '#ecfdf3', color: '#15803d', Icon: CheckCircle2 },
        { label: 'Sedang berjalan', value: sedangBerjalan, bg: '#fff7ed', color: '#c2410c', Icon: Clock        },
        { label: 'Belum dimulai',   value: belumMulai,     bg: '#fef2f2', color: '#b91c1c', Icon: AlertCircle  },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen bg-gray-50 p-5 lg:p-7">
            <div className="max-w-[1400px] mx-auto flex flex-col gap-5">

                {/* ── Banner ── */}
                <div
                    className="rounded-2xl px-7 py-7 relative overflow-hidden flex items-center justify-between"
                    style={{ background: ORANGE }}
                >
                    <GraduationCap
                        className="absolute -right-4 -bottom-5 w-44 h-44 opacity-[0.10] -rotate-6"
                        style={{ color: '#fff' }}
                        strokeWidth={0.8}
                    />

                    <div className="relative z-10">
                        <span
                            className="inline-flex items-center gap-1.5 text-white text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2.5"
                            style={{ background: 'rgba(255,255,255,0.18)' }}
                        >
                            Panel Wali Kelas
                        </span>
                        <h2 className="text-white text-[22px] font-medium mb-1.5">
                            Selamat Datang, {user.nama_lengkap || 'Guru'} 👋
                        </h2>
                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)' }}>
                            Kelola siswa dan penilaian kelas{' '}
                            <strong className="text-white font-semibold">{kelasInfo.kelas}</strong>
                            {' '}— T.A {kelasInfo.tahun_ajaran} Semester {kelasInfo.semester}
                        </p>
                    </div>

                    <div className="relative z-10 flex-shrink-0">
                        <div
                            className="rounded-2xl px-5 py-3.5 text-center"
                            style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.25)' }}
                        >
                            <div className="text-[28px] font-medium text-white leading-none">{overallPct}%</div>
                            <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                Penilaian selesai
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {statCards.map((card) => (
                        <div
                            key={card.label}
                            className="group bg-white border border-gray-100 rounded-2xl p-5 flex flex-col transition-all duration-200 hover:border-orange-200 hover:shadow-[0_4px_20px_rgba(232,87,10,0.12)]"
                        >
                            {/* Icon */}
                            <div
                                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-3.5 transition-colors duration-200 group-hover:bg-orange-100"
                                style={{ background: '#fff3ec', color: ORANGE }}
                            >
                                {card.icon}
                            </div>

                            {/* Value */}
                            <div
                                className="font-medium text-gray-900 mb-0.5 truncate"
                                style={{ fontSize: typeof card.value === 'string' && card.value.length > 5 ? '18px' : '26px' }}
                            >
                                {card.value}
                            </div>

                            {/* Label */}
                            <div className="text-[12px] text-gray-400 mb-3.5">{card.label}</div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 pt-3 mt-auto">
                                {card.activeNow ? (
                                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                        Aktif sekarang
                                    </span>
                                ) : card.path && card.linkLabel ? (
                                    <button
                                        onClick={() => router.push(card.path!)}
                                        className="flex items-center gap-0.5 text-[12px] font-semibold transition-colors duration-150"
                                        style={{ color: ORANGE }}
                                    >
                                        {card.linkLabel}
                                        <ChevronRight size={13} />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Bottom section ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">

                    {/* Ringkasan */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 transition-all duration-200 hover:border-orange-200 hover:shadow-[0_4px_20px_rgba(232,87,10,0.12)]">
                        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-100">
                            <PieChart size={16} style={{ color: ORANGE }} />
                            <div>
                                <p className="text-sm font-medium text-gray-800">Ringkasan Penilaian</p>
                                <p className="text-xs text-gray-400">
                                    Semester {kelasInfo.semester} · {kelasInfo.tahun_ajaran}
                                </p>
                            </div>
                        </div>

                        {/* Ring */}
                        <div className="flex flex-col items-center py-3 pb-5">
                            <div className="relative w-[130px] h-[130px]">
                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                    <circle cx="18" cy="18" r="14"
                                        fill="none" stroke="#f3f4f6" strokeWidth="3.2" />
                                    <circle cx="18" cy="18" r="14"
                                        fill="none"
                                        stroke={ORANGE}
                                        strokeWidth="3.2"
                                        strokeLinecap="round"
                                        strokeDasharray={`${filled} ${empty}`}
                                        style={{ transition: 'stroke-dasharray 1s ease' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[24px] font-medium text-gray-900 leading-none">{overallPct}%</span>
                                    <span className="text-[11px] text-gray-400 mt-1">selesai</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2.5">
                                {selesai} dari {totalMapel} mata pelajaran
                            </p>
                        </div>

                        {/* Status list */}
                        <div className="flex flex-col gap-2">
                            {statusItems.map((s) => (
                                <div
                                    key={s.label}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                    style={{ background: s.bg }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: s.color }}>
                                        <s.Icon size={14} />
                                        {s.label}
                                    </div>
                                    <span className="text-sm font-medium tabular-nums" style={{ color: s.color }}>
                                        {s.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabel progress */}
                    <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 transition-all duration-200 hover:border-orange-200 hover:shadow-[0_4px_20px_rgba(232,87,10,0.12)]">
                        <div className="flex items-center justify-between pb-4 mb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={16} style={{ color: ORANGE }} />
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Progress Per Mata Pelajaran</p>
                                    <p className="text-xs text-gray-400">Status pengisian nilai siswa</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/guru_kelas/input_nilai')}
                                className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-85"
                                style={{ background: ORANGE }}
                            >
                                Input Nilai <ChevronRight size={12} />
                            </button>
                        </div>

                        {progress.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-2">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ background: '#fff3ec' }}>
                                    <ClipboardList className="w-6 h-6" style={{ color: ORANGE }} />
                                </div>
                                <p className="text-sm font-medium text-gray-600">Belum Ada Data Penilaian</p>
                                <p className="text-xs text-gray-400">Data progress akan muncul setelah tersedia.</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden sm:grid grid-cols-[1fr_200px_100px] gap-3 px-2 pb-2.5 border-b border-gray-100 mb-1">
                                    {['Mata Pelajaran', 'Progress', 'Status'].map((h, i) => (
                                        <span
                                            key={h}
                                            className="text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                                            style={{ textAlign: i === 2 ? 'right' : 'left' }}
                                        >
                                            {h}
                                        </span>
                                    ))}
                                </div>

                                <div className="max-h-[320px] overflow-y-auto -mx-1 px-1">
                                    {progress.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_200px_100px] sm:items-center sm:gap-3 py-3 px-2 rounded-xl transition-colors hover:bg-orange-50/60"
                                            style={{ borderBottom: i !== progress.length - 1 ? '0.5px solid #f1f3f5' : 'none' }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">
                                                    {item.kode_mapel}
                                                </span>
                                                <span className="text-[13px] font-medium text-gray-800 truncate">
                                                    {item.mata_pelajaran}
                                                </span>
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
        </div>
    );
}