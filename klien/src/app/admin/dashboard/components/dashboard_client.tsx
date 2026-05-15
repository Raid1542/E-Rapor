/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard admin,
 *         mencakup statistik data guru, siswa, admin, ekstrakurikuler, kelas, dan mata pelajaran,
 *         Bar Chart perbandingan Guru vs Siswa, Donut Chart status guru aktif/nonaktif,
 *         serta navigasi ke halaman manajemen terkait.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

"use client";

import { useEffect, useState } from 'react';
import { ChevronRight, Users, UserCircle, Award, School, Book } from 'lucide-react';
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

// =============================================
// INTERFACES
// =============================================

interface DashboardStats {
    guru: number;
    siswa: number;
    admin: number;
    ekstrakurikuler: number;
    kelas: number;
    mata_pelajaran: number;
}

// =============================================
// CUSTOM TOOLTIP - Bar Chart
// =============================================

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-orange-100 rounded-xl shadow-lg px-4 py-3">
                <p className="text-xs font-semibold text-orange-700 mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-800">{payload[0].value}</p>
            </div>
        );
    }
    return null;
};

// =============================================
// CUSTOM TOOLTIP - Donut Chart
// =============================================

const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-orange-100 rounded-xl shadow-lg px-4 py-3">
                <p className="text-xs font-semibold text-orange-700 mb-1">{payload[0].name}</p>
                <p className="text-lg font-bold text-gray-800">{payload[0].value} guru</p>
            </div>
        );
    }
    return null;
};

// =============================================
// CUSTOM LABEL - persentase di dalam slice donut
// =============================================

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

// =============================================
// MAIN COMPONENT
// =============================================

export default function DashboardClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState<DashboardStats>({
        guru: 0,
        siswa: 0,
        admin: 0,
        ekstrakurikuler: 0,
        kelas: 0,
        mata_pelajaran: 0,
    });
    const [guruAktif, setGuruAktif] = useState(0);
    const [guruNonaktif, setGuruNonaktif] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token) {
            window.location.href = '/login';
            return;
        }

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
                if (resStats.ok && resultStats.success) {
                    setStats(resultStats.data);
                }

                const resGuru = await fetch('http://localhost:5000/api/admin/guru', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const resultGuru = await resGuru.json();
                if (resGuru.ok && Array.isArray(resultGuru.data)) {
                    const list = resultGuru.data;
                    const aktif = list.filter(
                        (g: any) => (g.status || '').trim().toLowerCase() === 'aktif'
                    ).length;
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
    }, []);

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // =============================================
    // DATA KARTU STATISTIK
    // =============================================

    const statCards = [
        { label: 'Data Guru', value: stats.guru, icon: <Users className="w-8 h-8" />, path: '/admin/data_guru' },
        { label: 'Data Siswa', value: stats.siswa, icon: <Users className="w-8 h-8" />, path: '/admin/data_siswa' },
        { label: 'Data Admin', value: stats.admin, icon: <UserCircle className="w-8 h-8" />, path: '/admin/data_admin' },
        { label: 'Data Ekstrakurikuler', value: stats.ekstrakurikuler, icon: <Award className="w-8 h-8" />, path: '/admin/ekstrakurikuler' },
        { label: 'Data Kelas', value: stats.kelas, icon: <School className="w-8 h-8" />, path: '/admin/data_kelas' },
        { label: 'Data Mata Pelajaran', value: stats.mata_pelajaran, icon: <Book className="w-8 h-8" />, path: '/admin/data_mata_pelajaran' },
    ];

    // =============================================
    // DATA GRAFIK
    // =============================================

    const barData = [
        { name: 'Guru', jumlah: stats.guru },
        { name: 'Siswa', jumlah: stats.siswa },
    ];

    const donutData = [
        { name: 'Aktif', value: guruAktif },
        { name: 'Nonaktif', value: guruNonaktif },
    ].filter((d) => d.value > 0);

    const DONUT_COLORS = ['#ea580c', '#fed7aa'];

    // =============================================
    // RENDER
    // =============================================

    return (
        // ── Latar belakang orange gradient sama seperti data admin ──
        <div
            className="flex-1 min-h-screen p-6"
            style={{ background: 'linear-gradient(160deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)' }}
        >
            {/* Welcome Card */}
            <div
                className="rounded-2xl shadow-lg p-6 mb-8 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)' }}
            >
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.4)' }} />
                <div className="absolute -bottom-8 -right-2 w-48 h-48 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.4)' }} />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">Selamat Datang, {user.name || 'Admin'}! 👋</h2>
                    <p style={{ color: 'rgba(255,237,213,0.95)' }}>
                        Anda login sebagai Administrator. Kelola sistem E-Rapor dengan mudah.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-2xl shadow hover:shadow-lg transition-all duration-300 p-6 cursor-pointer hover:-translate-y-0.5"
                        style={{
                            background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                            border: '1px solid rgba(251,146,60,0.2)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-medium mb-1" style={{ color: '#9a3412' }}>{card.label}</p>
                                <p className="text-3xl font-bold" style={{ color: '#c2410c' }}>{card.value}</p>
                            </div>
                            <div
                                className="p-3 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                                    color: 'white',
                                    boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                                }}
                            >
                                {card.icon}
                            </div>
                        </div>
                        <div className="mb-3" style={{ height: '1px', background: 'linear-gradient(90deg, rgba(251,146,60,0.3), transparent)' }} />
                        <button
                            onClick={() => handleNavigation(card.path)}
                            className="flex items-center space-x-1 transition-all duration-200 group"
                            style={{ color: '#ea580c' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#c2410c')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#ea580c')}
                        >
                            <span className="text-sm font-semibold">Lihat detail</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </button>
                    </div>
                ))}
            </div>

            {/* =============================================
                GRAFIK
            ============================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Bar Chart — Guru vs Siswa */}
                <div
                    className="lg:col-span-2 rounded-2xl shadow p-6"
                    style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                        border: '1px solid rgba(251,146,60,0.2)',
                    }}
                >
                    <div className="mb-5">
                        <h3 className="text-base font-bold text-gray-800">Jumlah Guru & Siswa</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Perbandingan total guru dan siswa terdaftar</p>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={barData}
                            barSize={64}
                            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ea580c" />
                                    <stop offset="100%" stopColor="#fb923c" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,146,60,0.15)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 13, fill: '#9a3412', fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#d1d5db' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(251,146,60,0.07)' }} />
                            <Bar dataKey="jumlah" radius={[10, 10, 0, 0]} fill="url(#barGradient)" />
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(251,146,60,0.15)' }}>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">Total Guru</p>
                            <p className="text-2xl font-bold" style={{ color: '#ea580c' }}>{stats.guru}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">Total Siswa</p>
                            <p className="text-2xl font-bold" style={{ color: '#ea580c' }}>{stats.siswa}</p>
                        </div>
                    </div>
                </div>

                {/* Donut Chart — Status Guru */}
                <div
                    className="rounded-2xl shadow p-6 flex flex-col"
                    style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                        border: '1px solid rgba(251,146,60,0.2)',
                    }}
                >
                    <div className="mb-5">
                        <h3 className="text-base font-bold text-gray-800">Status Guru</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Guru aktif vs nonaktif</p>
                    </div>

                    {donutData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
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

                            <div className="mt-4 space-y-2">
                                {donutData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                                            />
                                            <span className="text-xs text-gray-600 font-medium">{entry.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-800">{entry.value} guru</span>
                                    </div>
                                ))}
                            </div>

                            <div
                                className="mt-4 pt-3 flex items-center justify-between"
                                style={{ borderTop: '1px solid rgba(251,146,60,0.2)' }}
                            >
                                <span className="text-xs text-gray-500 font-medium">Total Guru</span>
                                <span className="text-sm font-bold" style={{ color: '#c2410c' }}>
                                    {donutData.reduce((sum, d) => sum + d.value, 0)} guru
                                </span>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}