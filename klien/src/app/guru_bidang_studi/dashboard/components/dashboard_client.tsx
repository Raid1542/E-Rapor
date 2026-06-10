/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Dashboard guru bidang studi - Template Admin Style
 * Tema: Oranye elegan, konsisten dengan dashboard admin
 */

"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, Book, Calendar, Award,
    CheckCircle2, AlertCircle, Clock, TrendingUp,
    Zap, AlertTriangle, CalendarDays, Settings,
    ClipboardList, BookOpen, GraduationCap, Target
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// Import Recharts
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface UserData {
    id: string;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
}

interface KonfigurasiStatus {
    bobot: boolean;
    kategori: boolean;
    lengkap: boolean;
}

interface MapelItem {
    id: number;
    nama: string;
    total_kelas: number;
    total_siswa: number;
    sudah_dinilai: number;
    belum_dinilai: number;
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

// Tambah 3 field baru
interface DashboardData {
    tahun_ajaran: string;
    semester: string;
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
}

// ─── CARD WRAPPER ─────────────────────────────────────────────────────────────

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{ border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' }}
    >
        {children}
    </div>
);

// ─── COLORS ──────────────────────────────────────────────────────────────────

const PIE_COLORS = [
    '#c95b08', '#e8690a', '#f5870a', '#f5a623', '#f97316',
    '#fb923c', '#fdba74', '#ea580c', '#dc2626', '#ef4444'
];

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
    const [user, setUser] = useState<UserData | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) {
            window.location.href = '/login';
            return;
        }

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
                        router.push('/login');
                        return;
                    }

                    if (res.ok) {
                        const result = await res.json();
                        if (result.success && result.data) {
                            setDashboard(result.data);
                        }
                    }
                } catch (err) {
                    console.error('Error koneksi:', err);
                } finally {
                    setLoading(false);
                }
            };

            fetchDashboard();
        } catch (e) {
            console.error('Error parsing user:', e);
            router.push('/login');
        }
    }, [router]);

    // ── Loading state ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: '#fdf6f0' }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
                    <p className="mt-4 text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    // ── Empty state ────────────────────────────────────────────────────────────

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

    const list = dashboard.mata_pelajaran_list;

    // Gunakan data dari backend
    const totalMapel = dashboard.total_mapel || list.length;
    const totalSiswa = dashboard.total_siswa || 0;
    const totalKelas = dashboard.total_kelas || 0;
    const totalPenilaianDibutuhkan = dashboard.total_penilaian_dibutuhkan || 0;
    const totalPenilaianAda = dashboard.total_penilaian_ada || 0;
    const overallProgress = dashboard.overall_progress || 0;

    // Untuk kompatibilitas dengan kode lama
    const totalSudahDinilai = totalPenilaianAda;

    const selesai = list.filter(m => m.belum_dinilai === 0 && m.total_siswa > 0).length;
    const belumMulai = list.filter(m => m.sudah_dinilai === 0).length;
    const sedangBerjalan = totalMapel - selesai - belumMulai;

    // ── Format semester display ───────────────────────────────────────────────
    const semesterDisplay = dashboard.semester === 'Ganjil' ? 'Ganjil' :
        dashboard.semester === 'Genap' ? 'Genap' : '-';


    const pieData = [
        {
            name: 'Sudah Dinilai',
            value: totalPenilaianAda,
            color: '#16a34a'
        },
        {
            name: 'Belum Dinilai',
            value: totalPenilaianDibutuhkan - totalPenilaianAda,
            color: '#fde0c8'
        }
    ];

    // ── Custom Tooltip ────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const mapel = list.find(m => m.id === data.id);
            if (!mapel) return null;

            const percentage = mapel.total_siswa > 0
                ? ((mapel.sudah_dinilai / mapel.total_siswa) * 100).toFixed(1)
                : 0;

            return (
                <div className="bg-white rounded-xl shadow-xl p-3" style={{ border: '2px solid #fde0c8' }}>
                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{data.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold" style={{ color: '#c95b08' }}>
                            {mapel.sudah_dinilai}/{mapel.total_siswa}
                        </span>
                        <span className="text-xs text-gray-500">siswa ({percentage}%)</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        {mapel.total_kelas} kelas
                    </div>
                </div>
            );
        }
        return null;
    };

    // Stat cards dengan progress yang benar
    const statCards = [
        {
            label: 'Mata Pelajaran',
            value: totalMapel,
            icon: <BookOpen className="w-5 h-5" />,
            path: '/guru_bidang_studi/input_nilai',
            sub: 'Mata pelajaran diampu',
        },
        {
            label: 'Total Kelas',
            value: totalKelas,
            icon: <Book className="w-5 h-5" />,
            path: '/guru_bidang_studi/input_nilai',
            sub: 'Kelas yang diajar',
        },
        {
            label: 'Total Siswa',
            value: totalSiswa,
            icon: <Users className="w-5 h-5" />,
            path: '/guru_bidang_studi/input_nilai',
            sub: `${totalSudahDinilai} penilaian sudah diinput`,
        },
        {
            label: 'Progress',
            value: `${overallProgress}%`,  // ← GUNAKAN overallProgress
            icon: <Target className="w-5 h-5" />,
            path: '/guru_bidang_studi/input_nilai',
            sub: `${totalPenilaianAda} dari ${totalPenilaianDibutuhkan} penilaian`,
        },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: '#fdf6f0' }}>

            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* ── Welcome card ── */}
            <div
                className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
                    boxShadow: '0 4px 15px rgba(200,80,10,0.2)',
                }}
            >
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="absolute -bottom-10 right-16 w-56 h-56 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)' }} />
                <div className="relative z-10">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                        Panel Guru Bidang Studi
                    </p>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Selamat Datang, {user.nama_lengkap || 'Guru'}! 👋
                    </h2>
                    <p className="text-white/80 text-sm">
                        {dashboard.jenis_penilaian_aktif
                            ? <>Periode <strong className="text-white">{dashboard.jenis_penilaian_aktif}</strong> sedang aktif. Silakan input nilai siswa.</>
                            : 'Kelola penilaian siswa dengan mudah dari dashboard ini.'}
                    </p>
                </div>
            </div>

            {/* ── CARD: TAHUN AJARAN AKTIF ───────────────────────────────────── */}
            <div className="mb-6">
                <div
                    className="rounded-2xl p-6 relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 50%, #f5870a 100%)',
                        boxShadow: '0 4px 20px rgba(200,80,10,0.25)',
                    }}
                >
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="absolute -bottom-8 right-20 w-40 h-40 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)' }} />

                    <div className="flex items-center justify-between relative z-10">
                        {/* Kiri: Icon + Info TA */}
                        <div className="flex items-center gap-4">
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                }}
                            >
                                <CheckCircle2 className="w-7 h-7 text-white" />
                            </div>

                            <div>
                                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                                    Tahun Ajaran Aktif
                                </p>
                                <div>
                                    <p className="text-2xl font-bold text-white mb-0.5">
                                        {dashboard.tahun_ajaran}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Kanan: Semester Info */}
                        <div className="flex-shrink-0">
                            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                                <Calendar size={16} className="text-white" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider leading-tight">
                                        Semester
                                    </span>
                                    <span className="text-sm font-black text-white leading-tight">
                                        {semesterDisplay}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CARD: PROGRESS PENILAIAN DENGAN DONUT CHART ───────────────── */}
            <div className="mb-6">
                <Card className="overflow-hidden">
                    {/* Header */}
                    <div
                        className="px-6 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Progress Penilaian Siswa</h3>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'}
                        >
                            Mulai Input <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Content: Chart + Legend */}
                    <div className="p-6">
                        {totalSiswa === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-10 h-10 text-orange-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    Belum ada data siswa
                                </p>
                                <p className="text-xs text-gray-400">
                                    Data akan muncul setelah siswa terdaftar di kelas yang Anda ajar
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                                {/* Donut Chart */}
                                <div className="lg:col-span-3 relative">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={130}
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                    stroke="#fff"
                                                    strokeWidth={2}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={entry.color}
                                                            className="transition-opacity"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/*Center Label dengan data yang benar */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <p className="text-5xl font-black" style={{ color: '#c95b08' }}>
                                                {totalPenilaianAda}
                                            </p>
                                            <p className="text-sm text-gray-500 font-semibold mt-1">
                                                dari {totalPenilaianDibutuhkan} Penilaian
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {overallProgress}% selesai
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Legend / Daftar Mapel */}
                                <div className="lg:col-span-2">
                                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                                        <BookOpen className="w-4 h-4" />
                                        Distribusi per Mapel ({list.length})
                                    </h4>
                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                        {list.map((mapel, index) => {
                                            const percentage = mapel.total_siswa > 0
                                                ? ((mapel.sudah_dinilai / mapel.total_siswa) * 100).toFixed(1)
                                                : 0;

                                            return (
                                                <div
                                                    key={mapel.id}
                                                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:shadow-md"
                                                    style={{
                                                        background: index % 2 === 0 ? '#fffaf6' : '#ffffff',
                                                        border: '1px solid #fde0c8'
                                                    }}
                                                    onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = '#fff0e5';
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#f5a623';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = index % 2 === 0 ? '#fffaf6' : '#ffffff';
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#fde0c8';
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                                                        />
                                                        <span className="text-sm font-semibold text-gray-700">
                                                            {mapel.nama}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{percentage}%</span>
                                                        <div
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                                            style={{
                                                                background: percentage === '100.0' ? '#eaf7ef' : '#fff0e5',
                                                                color: percentage === '100.0' ? '#16a34a' : '#c95b08'
                                                            }}
                                                        >
                                                            <Users className="w-3 h-3" />
                                                            {mapel.sudah_dinilai}/{mapel.total_siswa}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <Card key={card.label} className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                        <div
                            className="p-5 h-full"
                            onClick={() => router.push(card.path)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-transform group-hover:scale-110"
                                    style={{
                                        background: 'linear-gradient(135deg, #c95b08, #e8690a)',
                                        boxShadow: '0 3px 10px rgba(232,105,10,0.3)',
                                    }}
                                >
                                    {card.icon}
                                </div>
                                <span
                                    className="text-3xl font-bold transition-transform group-hover:scale-110"
                                    style={{ color: '#c95b08' }}
                                >
                                    {card.value}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">{card.label}</p>
                            <p className="text-xs text-gray-400 mb-3">{card.sub}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Bottom section: Jadwal & Peringatan ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Jadwal Penting */}
                <Card>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid #fde0c8' }}>
                            <CalendarDays size={16} style={{ color: '#e8690a' }} />
                            <p className="text-sm font-bold text-gray-800">Jadwal Penting</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                                style={{
                                    background: dashboard.jenis_penilaian_aktif === 'PTS' ? '#fff0e5' : '#f9fafb',
                                    border: `2px solid ${dashboard.jenis_penilaian_aktif === 'PTS' ? '#fde0c8' : '#e5e7eb'}`
                                }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{
                                            background: dashboard.jenis_penilaian_aktif === 'PTS'
                                                ? 'linear-gradient(135deg,#c95b08,#e8690a)'
                                                : '#e5e7eb'
                                        }}>
                                        <Award size={18} className={dashboard.jenis_penilaian_aktif === 'PTS' ? 'text-white' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">PTS</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold" style={{ color: '#c95b08' }}>
                                    {dashboard.jadwal.pts || '-'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                                style={{
                                    background: dashboard.jenis_penilaian_aktif === 'PAS' ? '#fff0e5' : '#f9fafb',
                                    border: `2px solid ${dashboard.jenis_penilaian_aktif === 'PAS' ? '#fde0c8' : '#e5e7eb'}`
                                }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{
                                            background: dashboard.jenis_penilaian_aktif === 'PAS'
                                                ? 'linear-gradient(135deg,#c95b08,#e8690a)'
                                                : '#e5e7eb'
                                        }}>
                                        <Award size={18} className={dashboard.jenis_penilaian_aktif === 'PAS' ? 'text-white' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">PAS</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold" style={{ color: '#c95b08' }}>
                                    {dashboard.jadwal.pas || '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Status Konfigurasi */}
                <Card>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid #fde0c8' }}>
                            <AlertTriangle size={16} style={{ color: dashboard.warnings.length > 0 ? '#dc2626' : '#16a34a' }} />
                            <p className="text-sm font-bold text-gray-800">Status Konfigurasi</p>
                        </div>

                        {dashboard.warnings.length === 0 ? (
                            <div className="flex items-center gap-3 px-4 py-4 rounded-xl"
                                style={{ background: '#eaf7ef', border: '2px solid #b6e8c8' }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
                                    <CheckCircle2 size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-green-700">Semua Mapel Sudah Dikonfigurasi</p>
                                    <p className="text-xs text-green-600 mt-0.5">Bobot dan kategori nilai sudah lengkap</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                    <AlertCircle size={14} className="text-red-500" />
                                    <span className="text-xs font-semibold text-red-700">
                                        {dashboard.warnings.length} mapel perlu konfigurasi
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                                    {dashboard.warnings.map((w, i) => (
                                        <div key={i} className="px-3 py-2.5 rounded-xl"
                                            style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                            <p className="text-xs font-bold text-red-700">{w.mapel}</p>
                                            <p className="text-[11px] text-red-600 mt-0.5">{w.masalah}</p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => router.push('/guru_bidang_studi/atur_penilaian')}
                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-lg transition-colors mt-3"
                                    style={{
                                        background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                        color: 'white',
                                        boxShadow: '0 2px 8px rgba(232,105,10,0.3)'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                                >
                                    <Settings size={12} /> Atur Sekarang
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
}