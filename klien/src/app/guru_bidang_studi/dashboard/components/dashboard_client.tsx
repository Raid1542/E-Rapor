/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard guru bidang studi,
 *         mencakup data profil, tahun ajaran aktif, dan ringkasan mata pelajaran yang diampu.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 dan Syahrul Ramadhan - NIM: 3312301093
 * Tanggal: 15 September 2025
 */

"use client";

import { useEffect, useState } from 'react';
import {
    Book, Calendar, Users, BookOpen,
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

interface MapelItem {
    nama: string;
    total_kelas: number;
    total_siswa: number;
    sudah_dinilai: number;
    belum_dinilai: number;
}

interface DashboardData {
    tahun_ajaran: string;
    semester: string;
    jenis_penilaian_aktif: 'PTS' | 'PAS' | null;
    mata_pelajaran_list: MapelItem[];
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
                    style={{
                        width: `${pct}%`,
                        background: pct === 100 ? '#16a34a' : 'linear-gradient(90deg,#c95b08,#f5a623)',
                    }}
                />
            </div>
            <span className="text-xs font-bold w-10 text-right" style={{ color }}>
                {pct}%
            </span>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DashboardClient() {
    const [user,      setUser]      = useState<UserData | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading,   setLoading]   = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        const token    = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) { router.push('/login'); return; }

        try {
            const parsedUser: UserData = JSON.parse(userData);

            if (parsedUser.role !== 'guru bidang studi') {
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
                        alert('Sesi Anda telah berakhir. Silakan login kembali.');
                        router.push('/login');
                        return;
                    }

                    if (res.ok) {
                        const result = await res.json();
                        if (result.success && result.data) {
                            setDashboard(result.data);
                        } else {
                            console.error('Respons API tidak valid:', result);
                        }
                    } else {
                        console.error('Gagal memuat dashboard. Status:', res.status);
                    }
                } catch (err) {
                    console.error('Error koneksi:', err);
                    alert('Gagal terhubung ke server.');
                } finally {
                    setLoading(false);
                }
            };

            fetchDashboard();
        } catch (e) {
            console.error('Error parsing user:', e);
            alert('Data login tidak valid. Silakan login ulang.');
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
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

    if (!user || !dashboard || dashboard.mata_pelajaran_list.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6"
                style={{ background: '#fdf6f0' }}>
                <div className="text-5xl">📚</div>
                <p className="text-base font-semibold text-gray-700">Belum Ditugaskan</p>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                    Anda belum ditugaskan mengajar mata pelajaran apapun di tahun ajaran ini.
                </p>
            </div>
        );
    }

    // ── Derived stats ─────────────────────────────────────────────────────────

    const list           = dashboard.mata_pelajaran_list;
    const totalMapel     = list.length;
    const totalSiswa     = list.reduce((s, m) => s + m.total_siswa, 0);
    const totalKelas     = list.reduce((s, m) => s + m.total_kelas, 0);

    // Progress: sebuah mapel dianggap "selesai" jika semua siswa sudah dinilai
    const selesai        = list.filter(m => m.belum_dinilai === 0 && m.total_siswa > 0).length;
    const belumMulai     = list.filter(m => m.sudah_dinilai === 0).length;
    const sedangBerjalan = totalMapel - selesai - belumMulai;
    const overallPct     = totalMapel > 0 ? Math.round((selesai / totalMapel) * 100) : 0;

    const statCards = [
        {
            label: 'Tahun Ajaran',
            value: dashboard.tahun_ajaran,
            sub:   dashboard.semester,
            icon:  <Calendar className="w-5 h-5" />,
            path:  null,
        },
        {
            label: 'Mata Pelajaran',
            value: totalMapel,
            sub:   'Mata pelajaran diampu',
            icon:  <BookOpen className="w-5 h-5" />,
            path:  '/guru_bidang_studi/input_nilai',
        },
        {
            label: 'Total Kelas',
            value: totalKelas,
            sub:   'Kelas yang diajar',
            icon:  <Book className="w-5 h-5" />,
            path:  '/guru_bidang_studi/input_nilai',
        },
        {
            label: 'Total Siswa',
            value: totalSiswa,
            sub:   'Siswa yang diajar',
            icon:  <Users className="w-5 h-5" />,
            path:  '/guru_bidang_studi/input_nilai',
        },
    ];

    const progressStats = [
        { label: 'Selesai',         value: selesai,        color: '#16a34a', bg: '#eaf7ef', icon: <CheckCircle2 size={16} /> },
        { label: 'Sedang Berjalan', value: sedangBerjalan, color: '#e8690a', bg: '#fff0e5', icon: <Clock        size={16} /> },
        { label: 'Belum Dimulai',   value: belumMulai,     color: '#dc2626', bg: '#fef2f2', icon: <AlertCircle  size={16} /> },
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
                        Panel Guru Bidang Studi
                    </p>
                    <h2 className="text-2xl font-bold mb-1.5">
                        Selamat Datang, {user.nama_lengkap || 'Guru'}! 👋
                    </h2>
                    <p className="text-white/70 text-sm">
                        {dashboard.jenis_penilaian_aktif
                            ? <>Periode <strong className="text-white">{dashboard.jenis_penilaian_aktif}</strong> sedang aktif. Silakan input nilai siswa.</>
                            : 'Silakan input nilai siswa berdasarkan mata pelajaran yang Anda ampu.'}
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
                                {dashboard.semester} · {dashboard.tahun_ajaran}
                                {dashboard.jenis_penilaian_aktif && (
                                    <span
                                        className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a)', color: 'white' }}
                                    >
                                        {dashboard.jenis_penilaian_aktif} Aktif
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Donut progress ring */}
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
                            <button
                                onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                                style={{ color: '#e8690a' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#c95b08')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#e8690a')}
                            >
                                Input Nilai <ChevronRight size={14} />
                            </button>
                        </div>

                        {list.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <div className="text-4xl">📝</div>
                                <p className="text-sm font-semibold text-gray-600">Belum Ada Data Penilaian</p>
                                <p className="text-xs text-gray-400">
                                    Data progress penilaian akan muncul setelah tersedia.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                                {list.map((item, i) => {
                                    const isDone     = item.belum_dinilai === 0 && item.total_siswa > 0;
                                    const notStarted = item.sudah_dinilai === 0;

                                    return (
                                        <div
                                            key={i}
                                            className="rounded-xl p-3 transition-all"
                                            style={{
                                                background: isDone ? '#eaf7ef' : '#fffaf6',
                                                border: `1px solid ${isDone ? '#b6e8c8' : '#fde0c8'}`,
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {/* Badge total kelas */}
                                                    <span
                                                        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                                                        style={{
                                                            background: isDone ? '#d4f0de' : '#fff0e5',
                                                            color:      isDone ? '#1a7a3a' : '#c95b08',
                                                        }}
                                                    >
                                                        {item.total_kelas} Kelas
                                                    </span>
                                                    <span className="text-xs font-semibold text-gray-800 truncate">
                                                        {item.nama}
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