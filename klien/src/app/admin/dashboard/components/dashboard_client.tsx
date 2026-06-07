/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard admin,
 *         mencakup statistik data guru, siswa, admin, ekstrakurikuler, kelas, dan mata pelajaran,
 *         Donut Chart status guru aktif/nonaktif,
 *         serta navigasi ke halaman manajemen terkait.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan Sidebar & Header
 */

"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, UserCircle, Award, School, Book,
    CheckCircle2, AlertCircle, Plus, Pencil, UserCheck, UserX,
    GraduationCap, ClipboardList, Settings
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface DashboardStats {
    guru: number;
    siswa: number;
    admin: number;
    ekstrakurikuler: number;
    kelas: number;
    mata_pelajaran: number;
}

// ─── CUSTOM TOOLTIP — Donut Chart ─────────────────────────────────────────────

const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-xl shadow-lg px-4 py-3" style={{ border: '1px solid #fde0c8' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#c95b08' }}>{payload[0].name}</p>
                <p className="text-lg font-bold text-gray-800">{payload[0].value} guru</p>
            </div>
        );
    }
    return null;
};

// ─── CUSTOM LABEL — persentase di dalam slice donut ───────────────────────────

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// ─── CARD WRAPPER ─────────────────────────────────────────────────────────────

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{ border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' }}
    >
        {children}
    </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DashboardClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState<DashboardStats>({
        guru: 0, siswa: 0, admin: 0,
        ekstrakurikuler: 0, kelas: 0, mata_pelajaran: 0,
    });
    const [guruAktif, setGuruAktif] = useState(0);
    const [guruNonaktif, setGuruNonaktif] = useState(0);

    const [tahunAjaranAktif, setTahunAjaranAktif] = useState<{
        tahun_ajaran: string;
        semester: string;
    } | null>(null);
    const [taLoading, setTaLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token) { window.location.href = '/login'; return; }

        if (userData) {
            const parsedUser: UserData = JSON.parse(userData);
            if (parsedUser.role !== 'admin') {
                alert('Anda tidak memiliki akses ke halaman ini');
                window.location.href = '/login';
                return;
            }
            setUser(parsedUser);
        }

        const fetchAll = async () => {
            try {
                const resStats = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const resultStats = await resStats.json();
                if (resStats.ok && resultStats.success) setStats(resultStats.data);

                const resGuru = await fetch('http://localhost:5000/api/admin/guru', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const resultGuru = await resGuru.json();
                if (resGuru.ok && Array.isArray(resultGuru.data)) {
                    const list = resultGuru.data;
                    const aktif = list.filter((g: any) => (g.status || '').trim().toLowerCase() === 'aktif').length;
                    setGuruAktif(aktif);
                    setGuruNonaktif(list.length - aktif);
                }
            } catch (err) {
                console.error('Gagal memuat data dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();

        const fetchTahunAjaranAktif = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    const aktif = data.data.find((ta: any) =>
                        ta.status?.toLowerCase() === 'aktif'
                    );

                    if (aktif) {
                        setTahunAjaranAktif({
                            tahun_ajaran: aktif.tahun_ajaran || '-',
                            semester: aktif.semester_aktif || 'ganjil'
                        });
                    } else {
                        setTahunAjaranAktif(null);
                    }
                }
            } catch (err) {
                console.error('Error fetch TA aktif:', err);
            } finally {
                setTaLoading(false);
            }
        };

        fetchTahunAjaranAktif();
    }, []);

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

    if (!user) return null;

    // ── Stat cards config ─────────────────────────────────────────────────────

    const statCards = [
        { label: 'Data Guru', value: stats.guru, icon: <Users className="w-5 h-5" />, path: '/admin/data_guru', subtitle: `${guruAktif} aktif` },
        { label: 'Data Siswa', value: stats.siswa, icon: <GraduationCap className="w-5 h-5" />, path: '/admin/data_siswa', subtitle: 'Tahun ajaran aktif' },
        { label: 'Data Admin', value: stats.admin, icon: <UserCircle className="w-5 h-5" />, path: '/admin/data_admin', subtitle: 'Pengelola sistem' },
        { label: 'Ekstrakurikuler', value: stats.ekstrakurikuler, icon: <Award className="w-5 h-5" />, path: '/admin/ekstrakurikuler', subtitle: 'Kegiatan siswa' },
        { label: 'Data Kelas', value: stats.kelas, icon: <School className="w-5 h-5" />, path: '/admin/data_kelas', subtitle: 'Ruang belajar' },
        { label: 'Mata Pelajaran', value: stats.mata_pelajaran, icon: <Book className="w-5 h-5" />, path: '/admin/data_mata_pelajaran', subtitle: 'Kurikulum aktif' },
    ];

    // ── Donut Chart data ──────────────────────────────────────────────────────

    const donutData = [
        { name: 'Aktif', value: guruAktif },
        { name: 'Nonaktif', value: guruNonaktif },
    ].filter(d => d.value > 0);

    const DONUT_COLORS = ['#e8690a', '#fde0c8'];

    // ── Quick Actions ─────────────────────────────────────────────────────────

    const quickActions = [
        { label: 'Tambah Siswa', icon: <Plus size={18} />, path: '/admin/data_siswa', color: '#e8690a' },
        { label: 'Atur Kelas', icon: <Settings size={18} />, path: '/admin/data_kelas', color: '#c95b08' },
        { label: 'Kelola Ekskul', icon: <ClipboardList size={18} />, path: '/admin/ekstrakurikuler', color: '#f5870a' },
        { label: 'Arsip Rapor', icon: <GraduationCap size={18} />, path: '/admin/arsip_rapor', color: '#b35a08' },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: '#fdf6f0' }}>

            {/* ── Welcome card ── */}
            <div
                className="rounded-2xl p-6 mb-6 text-white"
                style={{
                    background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
                    boxShadow: '0 4px 15px rgba(200,80,10,0.2)',
                }}
            >
                <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                        Panel Administrator
                    </p>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Selamat Datang, {user.nama || user.name || user.nama_lengkap || 'Admin'}! 👋
                    </h2>
                    <p className="text-white/80 text-sm">
                        Kelola sistem E-Rapor dengan mudah dari dashboard ini.
                    </p>
                </div>
            </div>

            {/* ── CARD: TAHUN AJARAN AKTIF ───────────────────────────────────── */}
            {!taLoading && (
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
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                    }}
                                >
                                    {tahunAjaranAktif ? (
                                        <CheckCircle2 className="w-7 h-7 text-white" />
                                    ) : (
                                        <AlertCircle className="w-7 h-7 text-white" />
                                    )}
                                </div>

                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                                        Tahun Ajaran Aktif
                                    </p>
                                    {tahunAjaranAktif ? (
                                        <div>
                                            <p className="text-2xl font-bold text-white mb-0.5">
                                                {tahunAjaranAktif.tahun_ajaran}
                                            </p>
                                            <p className="text-sm text-white/90 font-medium">
                                                Semester {tahunAjaranAktif.semester === 'ganjil' ? 'Ganjil' : 'Genap'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-lg font-bold text-white">
                                            Belum Ada Tahun Ajaran Aktif
                                        </p>
                                    )}
                                </div>
                            </div>

                            {tahunAjaranAktif ? (
                                <button
                                    onClick={() => router.push('/admin/data_tahun_ajaran')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.95)',
                                        color: '#c95b08',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.95)';
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Pencil className="w-4 h-4" />
                                    Ubah
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push('/admin/data_tahun_ajaran')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
                                    style={{
                                        background: 'linear-gradient(135deg, #9a3a08, #c95b08)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #7a2a05, #a84a08)';
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #9a3a08, #c95b08)';
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                    Tambah
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                            <p className="text-xs text-gray-500 mb-3">{card.subtitle}</p>
                            <div className="pt-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                <div
                                    className="flex items-center gap-1 text-xs font-semibold transition-colors"
                                    style={{ color: '#e8690a' }}
                                >
                                    Lihat detail
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Donut Chart + Quick Actions ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                {/* Donut Chart — Status Guru (2/3 width) */}
                <Card className="lg:col-span-2">
                    <div className="p-5">
                        <div
                            className="flex items-center justify-between pb-4 mb-4"
                            style={{ borderBottom: '1px solid #fde0c8' }}
                        >
                            <div>
                                <p className="text-sm font-bold text-gray-800">Status Guru</p>
                                <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
                                    Distribusi guru aktif dan nonaktif
                                </p>
                            </div>
                            <div
                                className="px-3 py-1 rounded-lg text-xs font-semibold"
                                style={{ background: '#fff0e5', color: '#c95b08' }}
                            >
                                Total: {stats.guru} guru
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            {/* Donut Chart */}
                            {donutData.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <p className="text-sm text-gray-400">Belum ada data guru</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomLabel}
                                        >
                                            {donutData.map((_, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomDonutTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}

                            {/* Info List */}
                            <div className="space-y-3">
                                {/* Guru Aktif */}
                                <div
                                    className="flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md"
                                    style={{ background: '#dcfce7', border: '1px solid #86efac' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: '#16a34a' }}
                                        >
                                            <UserCheck size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Guru Aktif</p>
                                            <p className="text-xs text-gray-600">Dapat login & mengajar</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: '#15803d' }}>{guruAktif}</p>
                                </div>

                                {/* Guru Nonaktif */}
                                <div
                                    className="flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md"
                                    style={{ background: '#fef9c3', border: '1px solid #fde68a' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: '#eab308' }}
                                        >
                                            <UserX size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Guru Nonaktif</p>
                                            <p className="text-xs text-gray-600">Tidak dapat login</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: '#92400e' }}>{guruNonaktif}</p>
                                </div>

                                {/* Persentase Aktif */}
                                {stats.guru > 0 && (
                                    <div
                                        className="p-4 rounded-xl text-center"
                                        style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}
                                    >
                                        <p className="text-xs text-gray-500 mb-1">Tingkat Keaktifan</p>
                                        <p className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                                            {Math.round((guruAktif / stats.guru) * 100)}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Actions (1/3 width) */}
                <Card>
                    <div className="p-5 flex flex-col h-full">
                        <div
                            className="pb-4 mb-4"
                            style={{ borderBottom: '1px solid #fde0c8' }}
                        >
                            <p className="text-sm font-bold text-gray-800">Aksi Cepat</p>
                            <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
                                Akses fitur yang sering digunakan
                            </p>
                        </div>

                        <div className="flex-1 space-y-2">
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => router.push(action.path)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:shadow-md group"
                                    style={{
                                        background: '#fffaf6',
                                        border: '1px solid #fde0c8',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = '#fff0e5';
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = '#fffaf6';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                                        style={{ background: action.color }}
                                    >
                                        {action.icon}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 flex-1 text-left">
                                        {action.label}
                                    </span>
                                    <ChevronRight
                                        size={16}
                                        className="text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all"
                                    />
                                </button>
                            ))}
                        </div>

                        <div
                            className="mt-4 pt-3 text-center"
                            style={{ borderTop: '1px solid #fde0c8' }}
                        >
                            <p className="text-xs text-gray-500">
                                💡 Klik untuk akses cepat
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── Info Summary ── */}
            <Card>
                <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={18} style={{ color: '#e8690a' }} />
                        <p className="text-sm font-bold text-gray-800">Ringkasan Tahun Ajaran</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-xl transition-all hover:shadow-md" style={{ background: '#fffaf6' }}>
                            <p className="text-3xl font-bold mb-1" style={{ color: '#c95b08' }}>
                                {stats.kelas}
                            </p>
                            <p className="text-xs font-medium text-gray-600">Total Kelas</p>
                        </div>
                        <div className="text-center p-4 rounded-xl transition-all hover:shadow-md" style={{ background: '#fffaf6' }}>
                            <p className="text-3xl font-bold mb-1" style={{ color: '#c95b08' }}>
                                {stats.mata_pelajaran}
                            </p>
                            <p className="text-xs font-medium text-gray-600">Mata Pelajaran</p>
                        </div>
                        <div className="text-center p-4 rounded-xl transition-all hover:shadow-md" style={{ background: '#fffaf6' }}>
                            <p className="text-3xl font-bold mb-1" style={{ color: '#c95b08' }}>
                                {stats.ekstrakurikuler}
                            </p>
                            <p className="text-xs font-medium text-gray-600">Ekstrakurikuler</p>
                        </div>
                        <div className="text-center p-4 rounded-xl transition-all hover:shadow-md" style={{ background: '#fffaf6' }}>
                            <p className="text-3xl font-bold mb-1" style={{ color: '#c95b08' }}>
                                {stats.siswa > 0 && stats.kelas > 0
                                    ? Math.round(stats.siswa / stats.kelas)
                                    : 0}
                            </p>
                            <p className="text-xs font-medium text-gray-600">Rata-rata/Kelas</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}