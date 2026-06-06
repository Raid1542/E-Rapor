/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard admin,
 *         mencakup statistik data guru, siswa, admin, ekstrakurikuler, kelas, dan mata pelajaran,
 *         Bar Chart perbandingan Guru vs Siswa, Donut Chart status guru aktif/nonaktif,
 *         serta navigasi ke halaman manajemen terkait.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan Sidebar & Header
 */

"use client";

import { useEffect, useState } from 'react';
import { ChevronRight, Users, UserCircle, Award, School, Book, CheckCircle2, AlertCircle, Plus, Pencil } from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
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

// ─── CUSTOM TOOLTIP — Bar Chart ───────────────────────────────────────────────

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-xl shadow-lg px-4 py-3" style={{ border: '1px solid #fde0c8' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#c95b08' }}>{label}</p>
                <p className="text-lg font-bold text-gray-800">{payload[0].value}</p>
            </div>
        );
    }
    return null;
};

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

// ─── CARD WRAPPER — dipakai oleh stat cards & chart cards ─────────────────────

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
        { label: 'Data Guru', value: stats.guru, icon: <Users className="w-5 h-5" />, path: '/admin/data_guru' },
        { label: 'Data Siswa', value: stats.siswa, icon: <Users className="w-5 h-5" />, path: '/admin/data_siswa' },
        { label: 'Data Admin', value: stats.admin, icon: <UserCircle className="w-5 h-5" />, path: '/admin/data_admin' },
        { label: 'Data Ekstrakurikuler', value: stats.ekstrakurikuler, icon: <Award className="w-5 h-5" />, path: '/admin/ekstrakurikuler' },
        { label: 'Data Kelas', value: stats.kelas, icon: <School className="w-5 h-5" />, path: '/admin/data_kelas' },
        { label: 'Data Mata Pelajaran', value: stats.mata_pelajaran, icon: <Book className="w-5 h-5" />, path: '/admin/data_mata_pelajaran' },
    ];

    // ── Chart data ────────────────────────────────────────────────────────────

    const barData = [
        { name: 'Guru', jumlah: stats.guru },
        { name: 'Siswa', jumlah: stats.siswa },
    ];

    const donutData = [
        { name: 'Aktif', value: guruAktif },
        { name: 'Nonaktif', value: guruNonaktif },
    ].filter(d => d.value > 0);

    const DONUT_COLORS = ['#e8690a', '#fde0c8'];

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

            {/* ── CARD: TAHUN AJARAN AKTIF ───────────────────────────────────────── */}
            {!taLoading && (
                <div className="mb-6">
                    <div
                        className="rounded-2xl p-6 relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 50%, #f5870a 100%)',
                            boxShadow: '0 4px 20px rgba(200,80,10,0.25)',
                        }}
                    >
                        {/* Dekorasi lingkaran */}
                        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <div className="absolute -bottom-8 right-20 w-40 h-40 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.05)' }} />

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                {/* Icon dengan background */}
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

                                {/* Info */}
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                                        {tahunAjaranAktif ? 'Tahun Ajaran Aktif' : 'Tahun Ajaran Aktif'}
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

                            {/* ✅ TOMBOL - Conditional Rendering */}
                            {tahunAjaranAktif ? (
                                /* Tombol UBAH */
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
                                /* Tombol TAMBAH */
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
                                <span
                                    className="text-3xl font-bold"
                                    style={{ color: '#c95b08' }}
                                >
                                    {card.value}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-3">{card.label}</p>
                            <div className="pt-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                <button
                                    onClick={() => router.push(card.path)}
                                    className="flex items-center gap-1 text-xs font-semibold transition-colors group"
                                    style={{ color: '#e8690a' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#c95b08')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#e8690a')}
                                >
                                    Lihat detail
                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Bar Chart — Guru vs Siswa */}
                <Card className="lg:col-span-2">
                    <div className="p-5">
                        {/* Chart header */}
                        <div
                            className="flex items-center justify-between pb-4 mb-4"
                            style={{ borderBottom: '1px solid #fde0c8' }}
                        >
                            <div>
                                <p className="text-sm font-bold text-gray-800">Jumlah Guru &amp; Siswa</p>
                                <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
                                    Perbandingan total guru dan siswa terdaftar
                                </p>
                            </div>
                            <div
                                className="px-3 py-1 rounded-lg text-xs font-semibold"
                                style={{ background: '#fff0e5', color: '#c95b08' }}
                            >
                                Perbandingan
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                                data={barData}
                                barSize={56}
                                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#c95b08" />
                                        <stop offset="100%" stopColor="#f5a623" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(253,224,200,0.6)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 13, fill: '#7a3a0a', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#d1d5db' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(253,224,200,0.3)' }} />
                                <Bar dataKey="jumlah" radius={[10, 10, 0, 0]} fill="url(#barGradient)" />
                            </BarChart>
                        </ResponsiveContainer>

                        <div
                            className="grid grid-cols-2 gap-4 mt-4 pt-4"
                            style={{ borderTop: '1px solid #fde0c8' }}
                        >
                            <div
                                className="text-center py-3 rounded-xl"
                                style={{ background: '#fff0e5' }}
                            >
                                <p className="text-xs font-medium mb-1" style={{ color: '#b35a08' }}>Total Guru</p>
                                <p className="text-2xl font-bold" style={{ color: '#c95b08' }}>{stats.guru}</p>
                            </div>
                            <div
                                className="text-center py-3 rounded-xl"
                                style={{ background: '#fff0e5' }}
                            >
                                <p className="text-xs font-medium mb-1" style={{ color: '#b35a08' }}>Total Siswa</p>
                                <p className="text-2xl font-bold" style={{ color: '#c95b08' }}>{stats.siswa}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Donut Chart — Status Guru */}
                <Card>
                    <div className="p-5 flex flex-col h-full">
                        {/* Chart header */}
                        <div
                            className="pb-4 mb-2"
                            style={{ borderBottom: '1px solid #fde0c8' }}
                        >
                            <p className="text-sm font-bold text-gray-800">Status Guru</p>
                            <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
                                Guru aktif vs nonaktif
                            </p>
                        </div>

                        {donutData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center py-8">
                                <p className="text-sm text-gray-400">Belum ada data guru</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
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

                                <div className="mt-3 space-y-2">
                                    {donutData.map((entry, index) => (
                                        <div key={entry.name} className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                                                />
                                                <span className="text-xs font-medium text-gray-600">{entry.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-800">{entry.value} guru</span>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="mt-4 pt-3 flex items-center justify-between"
                                    style={{ borderTop: '1px solid #fde0c8' }}
                                >
                                    <span className="text-xs font-medium text-gray-500">Total Guru</span>
                                    <span className="text-sm font-bold" style={{ color: '#c95b08' }}>
                                        {donutData.reduce((s, d) => s + d.value, 0)} guru
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
}