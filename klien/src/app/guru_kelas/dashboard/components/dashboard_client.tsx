'use client';

import { useEffect, useState } from 'react';
import {
    Users, User, Calendar, BookOpen,
    ClipboardList, CheckCircle2, Clock, AlertCircle,
    ChevronRight, TrendingUp,
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

// ─── CARD WRAPPER ─────────────────────────────────────────────────────────────

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{ border: '1px solid #f97316', boxShadow: '0 2px 16px rgba(200,80,10,0.15)' }}
    >
        {children}
    </div>
);

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

const ProgressBar = ({ value, total }: { value: number; total: number }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const color = pct === 100 ? '#16a34a' : pct >= 60 ? '#e8690a' : '#dc2626';
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#fde0c8' }}>
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : 'linear-gradient(90deg,#c95b08,#f5a623)' }}
                />
            </div>
            <span className="text-xs font-bold w-10 text-right" style={{ color }}>
                {pct}%
            </span>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function GuruKelasDashboard() {
    const [user,      setUser]      = useState<UserData | null>(null);
    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [progress,  setProgress]  = useState<NilaiProgress[]>([]);
    const [loading,   setLoading]   = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        const token    = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) { router.push('/login'); return; }

        try {
            const parsedUser: UserData = JSON.parse(userData);
            if (parsedUser.role !== 'guru kelas') {
                router.push('/login');
                return;
            }
            setUser(parsedUser);

            const fetchAll = async () => {
                try {
                    // Kelas info
                    const resKelas = await fetch('http://localhost:5000/api/guru-kelas/kelas', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (resKelas.ok) {
                        const data = await resKelas.json();
                        if (Array.isArray(data) && data.length > 0) setKelasInfo(data[0]);
                    }

                    // Progress penilaian
                    const resProgress = await fetch('http://localhost:5000/api/guru-kelas/progress-penilaian', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (resProgress.ok) {
                        const dataP = await resProgress.json();
                        if (Array.isArray(dataP.data)) setProgress(dataP.data);
                    }
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

    // ── Loading state ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4"
                style={{ background: '#fdf6f0' }}>
                <div className="w-12 h-12 rounded-full border-4 animate-spin"
                    style={{ borderColor: '#fde0c8', borderTopColor: '#e8690a' }} />
                <p className="text-sm font-semibold" style={{ color: '#c95b08' }}>Memuat data...</p>
            </div>
        );
    }

    // ── Empty / belum ditugaskan ───────────────────────────────────────────────

    if (!user || !kelasInfo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6"
                style={{ background: '#fdf6f0' }}>
                <div className="text-5xl">📋</div>
                <p className="text-base font-semibold text-gray-700">Belum Ditugaskan</p>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                    Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini.
                </p>
            </div>
        );
    }

    // ── Derived stats ─────────────────────────────────────────────────────────

    const totalMapel      = progress.length;
    const selesai         = progress.filter(p => p.belum_dinilai === 0 && p.total_siswa > 0).length;
    const belumMulai      = progress.filter(p => p.sudah_dinilai === 0).length;
    const sedangBerjalan  = totalMapel - selesai - belumMulai;
    const overallPct      = totalMapel > 0 ? Math.round((selesai / totalMapel) * 100) : 0;

    const statCards = [
        {
            label: 'Total Siswa',
            value: kelasInfo.jumlah_siswa,
            sub:   'Siswa di kelas Anda',
            icon:  <Users className="w-5 h-5" />,
            path:  '/guru_kelas/data_siswa',
        },
        {
            label: 'Kelas',
            value: kelasInfo.kelas,
            sub:   'Kelas yang Anda ampu',
            icon:  <User className="w-5 h-5" />,
            path:  '/guru_kelas/data_siswa',
        },
        {
            label: 'Tahun Ajaran',
            value: kelasInfo.tahun_ajaran,
            sub:   kelasInfo.semester,
            icon:  <Calendar className="w-5 h-5" />,
            path:  null,
        },
        {
            label: 'Mata Pelajaran',
            value: totalMapel,
            sub:   'Perlu dinilai',
            icon:  <BookOpen className="w-5 h-5" />,
            path:  '/guru_kelas/input_nilai',
        },
    ];

    const progressStats = [
        { label: 'Selesai',          value: selesai,        color: '#16a34a', bg: '#eaf7ef', icon: <CheckCircle2 size={16} /> },
        { label: 'Sedang Berjalan',  value: sedangBerjalan, color: '#e8690a', bg: '#fff0e5', icon: <Clock        size={16} /> },
        { label: 'Belum Dimulai',    value: belumMulai,     color: '#dc2626', bg: '#fef2f2', icon: <AlertCircle  size={16} /> },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: '#ffffff' }}>

            {/* ── Welcome card ── */}
            <div
                className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #9a3a08 0%, #c95b08 40%, #e8690a 75%, #f5870a 100%)',
                    boxShadow: '0 4px 20px rgba(200,80,10,0.25)',
                }}
            >
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="absolute -bottom-10 right-16 w-56 h-56 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)' }} />
                <div className="relative z-10">
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
                        Panel Wali Kelas
                    </p>
                    <h2 className="text-2xl font-bold mb-1.5">
                        Selamat Datang, {user.nama_lengkap || 'Guru'}! 👋
                    </h2>
                    <p className="text-white/70 text-sm">
                        Kelola siswa dan penilaian kelas <strong className="text-white">{kelasInfo.kelas}</strong> dari dashboard ini.
                    </p>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <Card key={card.label}>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, #c95b08, #e8690a)',
                                        boxShadow: '0 3px 10px rgba(232,105,10,0.3)',
                                    }}
                                >
                                    {card.icon}
                                </div>
                                <span className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                                    {card.value}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-0.5">{card.label}</p>
                            <p className="text-xs text-gray-400 mb-3">{card.sub}</p>
                            {card.path && (
                                <div className="pt-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                    <button
                                        onClick={() => router.push(card.path!)}
                                        className="flex items-center gap-1 text-xs font-semibold transition-colors group"
                                        style={{ color: '#e8690a' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#c95b08')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#e8690a')}
                                    >
                                        Lihat detail
                                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Bottom section: Progress Penilaian ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Ringkasan Progress — kiri */}
                <Card>
                    <div className="p-5 flex flex-col h-full">
                        <div className="pb-4 mb-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                            <div className="flex items-center gap-2 mb-0.5">
                                <TrendingUp size={16} style={{ color: '#e8690a' }} />
                                <p className="text-sm font-bold text-gray-800">Ringkasan Penilaian</p>
                            </div>
                            <p className="text-xs" style={{ color: '#c95b08' }}>
                                Semester {kelasInfo.semester} · {kelasInfo.tahun_ajaran}
                            </p>
                        </div>

                        {/* Donut-style progress ring */}
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="relative w-32 h-32">
                                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                    <circle cx="18" cy="18" r="15.9"
                                        fill="none" stroke="#fde0c8" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9"
                                        fill="none"
                                        stroke="url(#ringGrad)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray={`${overallPct} ${100 - overallPct}`}
                                        strokeDashoffset="0"
                                        style={{ transition: 'stroke-dasharray 1s ease' }}
                                    />
                                    <defs>
                                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#c95b08" />
                                            <stop offset="100%" stopColor="#f5a623" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold" style={{ color: '#c95b08' }}>{overallPct}%</span>
                                    <span className="text-xs text-gray-400">selesai</span>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mt-3">
                                {selesai} dari {totalMapel} mata pelajaran
                            </p>
                        </div>

                        {/* Mini stats */}
                        <div className="space-y-2 mt-2">
                            {progressStats.map(s => (
                                <div key={s.label}
                                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                                    style={{ background: s.bg }}>
                                    <div className="flex items-center gap-2" style={{ color: s.color }}>
                                        {s.icon}
                                        <span className="text-xs font-semibold">{s.label}</span>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color: s.color }}>
                                        {s.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Tabel progress per mapel — kanan */}
                <Card className="lg:col-span-2">
                    <div className="p-5">
                        <div className="flex items-center justify-between pb-4 mb-2"
                            style={{ borderBottom: '1px solid #fde0c8' }}>
                            <div className="flex items-center gap-2">
                                <ClipboardList size={16} style={{ color: '#e8690a' }} />
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Progress Per Mata Pelajaran</p>
                                    <p className="text-xs" style={{ color: '#c95b08' }}>
                                        Status pengisian nilai siswa
                                    </p>
                                </div>
                            </div>
                            {/* FIX: route diubah ke /guru_kelas/input_nilai */}
                            <button
                                onClick={() => router.push('/guru_kelas/input_nilai')}
                                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                                style={{ color: '#e8690a' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#c95b08')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#e8690a')}
                            >
                                Input Nilai <ChevronRight size={14} />
                            </button>
                        </div>

                        {progress.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <div className="text-4xl">📝</div>
                                <p className="text-sm font-semibold text-gray-600">Belum Ada Data Penilaian</p>
                                <p className="text-xs text-gray-400">
                                    Data progress penilaian akan muncul setelah tersedia.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                                {progress.map((item, i) => {
                                    const pct = item.total_siswa > 0
                                        ? Math.round((item.sudah_dinilai / item.total_siswa) * 100)
                                        : 0;
                                    const isDone      = item.belum_dinilai === 0 && item.total_siswa > 0;
                                    const notStarted  = item.sudah_dinilai === 0;

                                    return (
                                        <div
                                            key={i}
                                            className="rounded-xl p-3 transition-all"
                                            style={{
                                                // FIX: background sebelumnya pakai arrow function yang tidak valid
                                                background: isDone ? '#eaf7ef' : '#fffaf6',
                                                border: `1px solid ${isDone ? '#b6e8c8' : '#fde0c8'}`,
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {/* Badge kode */}
                                                    <span
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                                                        style={{
                                                            background: isDone ? '#d4f0de' : '#fff0e5',
                                                            color:      isDone ? '#1a7a3a' : '#c95b08',
                                                        }}
                                                    >
                                                        {item.kode_mapel}
                                                    </span>
                                                    <span className="text-xs font-semibold text-gray-800 truncate">
                                                        {item.mata_pelajaran}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    {/* Status badge */}
                                                    {isDone ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{ background: '#eaf7ef', color: '#1a7a3a' }}>
                                                            <CheckCircle2 size={10} /> Selesai
                                                        </span>
                                                    ) : notStarted ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{ background: '#fef2f2', color: '#dc2626' }}>
                                                            <AlertCircle size={10} /> Belum
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{ background: '#fff0e5', color: '#e8690a' }}>
                                                            <Clock size={10} /> Proses
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {item.sudah_dinilai}/{item.total_siswa}
                                                    </span>
                                                </div>
                                            </div>
                                            <ProgressBar value={item.sudah_dinilai} total={item.total_siswa} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
}