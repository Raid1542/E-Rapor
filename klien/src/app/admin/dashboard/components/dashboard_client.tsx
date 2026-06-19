"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, Award, School, Book,
    Plus, GraduationCap, TrendingUp,
    BookOpen, Settings,
    ArrowRight, Sparkles, Target
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// Import Recharts
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface DashboardStats {
    guru: number;
    siswa: number;
    admin: number;
    ekstrakurikuler: number;
    kelas: number;
    mata_pelajaran: number;
    tahun_ajaran: string | null;
    semester: string | null;
    id_detail: number | null;
}

interface KelasWithSiswa {
    id_kelas: number;
    nama_kelas: string;
    jumlah_siswa: number;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes db-fadeUp { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes db-slideRight { 
            from { opacity: 0; transform: translateX(-20px); } 
            to { opacity: 1; transform: translateX(0); } 
        }
        @keyframes db-growWidth {
            from { width: 0%; }
        }
        .db-fadeUp { animation: db-fadeUp 0.5s ease-out forwards; }
        .db-slideRight { animation: db-slideRight 0.4s ease-out forwards; }
        .db-bar-grow { animation: db-growWidth 0.6s ease-out forwards; }
    `}</style>
);

// ─── CARD WRAPPER ─────────────────────────────────────────────────────────────

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{
            border: '1px solid #fde0c8',
            boxShadow: '0 2px 10px rgba(200,80,10,0.05)'
        }}
    >
        {children}
    </div>
);
// ─── COLORS ──────────────────────────────────────────────────────────────────

const BAR_COLORS = ['#c95b08', '#e8690a', '#f5870a', '#f5a623', '#f97316', '#fb923c', '#fdba74', '#ea580c'];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DashboardClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState<DashboardStats>({
        guru: 0, siswa: 0, admin: 0,
        ekstrakurikuler: 0, kelas: 0, mata_pelajaran: 0,
        tahun_ajaran: null, semester: null, id_detail: null
    });

    const [kelasList, setKelasList] = useState<KelasWithSiswa[]>([]);
    const [kelasLoading, setKelasLoading] = useState(false);

    const router = useRouter();
    const { showSessionExpired, handleLogout } = useSession();

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

        const fetchStats = async () => {
            try {
                const resStats = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const resultStats = await resStats.json();
                if (resStats.ok && resultStats.success) {
                    setStats(resultStats.data);
                    if (resultStats.data.id_detail) {
                        fetchKelasWithSiswa(resultStats.data.id_detail, token);
                    }
                }
            } catch (err) {
                console.error('Gagal memuat data dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchKelasWithSiswa = async (tahunAjaranId: number, token: string) => {
            setKelasLoading(true);
            try {
                const resKelas = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${tahunAjaranId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataKelas = await resKelas.json();

                if (resKelas.ok && dataKelas.success) {
                    const kelasData: KelasWithSiswa[] = [];

                    await Promise.all(
                        dataKelas.data.map(async (kelas: any) => {
                            const kelasId = kelas.id_kelas || kelas.id;
                            if (!kelasId) return;

                            try {
                                const resSiswa = await fetch(
                                    `http://localhost:5000/api/admin/kelas/${kelasId}/siswa`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const dataSiswa = await resSiswa.json();

                                if (dataSiswa.success) {
                                    kelasData.push({
                                        id_kelas: kelasId,
                                        nama_kelas: kelas.nama_kelas || kelas.nama,
                                        jumlah_siswa: dataSiswa.data.length
                                    });
                                }
                            } catch (err) {
                                console.error(`Error fetching siswa for kelas ${kelasId}:`, err);
                            }
                        })
                    );

                    setKelasList(kelasData.sort((a, b) => b.jumlah_siswa - a.jumlah_siswa));
                }
            } catch (err) {
                console.error('Error fetch kelas:', err);
            } finally {
                setKelasLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: '#fdf6f0' }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
                    <p className="mt-4 text-sm font-medium" style={{ color: '#c95b08' }}>Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // ── Stat cards config (4 cards utama) ─────────────────────────────────────

    const statCards = [
        {
            label: 'Total Siswa',
            value: stats.siswa,
            icon: <GraduationCap className="w-6 h-6" />,
            path: '/admin/data_siswa',
            gradient: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
            lightBg: '#fff0e5',
            desc: 'Siswa terdaftar'
        },
        {
            label: 'Total Guru',
            value: stats.guru,
            icon: <Users className="w-6 h-6" />,
            path: '/admin/data_guru',
            gradient: 'linear-gradient(135deg, #e8690a 0%, #f5870a 100%)',
            lightBg: '#fff5eb',
            desc: 'Tenaga pengajar'
        },
        {
            label: 'Total Kelas',
            value: stats.kelas,
            icon: <School className="w-6 h-6" />,
            path: '/admin/data_kelas_siswa',
            gradient: 'linear-gradient(135deg, #f5870a 0%, #f5a623 100%)',
            lightBg: '#fffaf0',
            desc: 'Kelas aktif'
        },
        {
            label: 'Mata Pelajaran',
            value: stats.mata_pelajaran,
            icon: <Book className="w-7 h-7" />,
            path: '/admin/data_mata_pelajaran',
            gradient: 'linear-gradient(135deg, #f5a623 0%, #f97316 100%)',
            lightBg: '#fffbf0',
            desc: 'Kurikulum aktif'
        },
    ];

    // ── Data untuk Bar Chart ──────────────────────────────────────────────────
    const barData = kelasList.map(k => ({
        name: k.nama_kelas,
        siswa: k.jumlah_siswa,
        id_kelas: k.id_kelas
    }));

    // ── Custom Tooltip ────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const total = stats.siswa || 1;
            const percentage = ((data.siswa / total) * 100).toFixed(1);
            return (
                <div className="bg-white rounded-xl shadow-2xl p-4" style={{ border: '2px solid #fde0c8' }}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#c95b08' }}>
                        Kelas {data.name}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black" style={{ color: '#7a3a0a' }}>{data.siswa}</span>
                        <span className="text-sm text-gray-500 font-semibold">siswa</span>
                    </div>
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid #fde0c8' }}>
                        <span className="text-xs font-bold" style={{ color: '#e8690a' }}>
                            {percentage}% dari total siswa
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: '#fdf6f0' }}>
            <GlobalStyles />

            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                WELCOME BANNER
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="mb-8 db-fadeUp">
                <div className="flex items-center gap-3 mb-1">
                    <Sparkles className="w-5 h-5" style={{ color: '#e8690a' }} />
                    <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#c95b08' }}>
                        Dashboard
                    </p>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Selamat Datang, {user.nama || user.name || user.nama_lengkap || 'Admin'} 👋
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Ringkasan data sistem E-Rapor SDIT Ulil Albab
                </p>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                STAT CARDS - 4 Cards Utama
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card, index) => (
                    <Card
                        key={card.label}
                        className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden db-fadeUp"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div
                            className="p-6 h-full relative"
                            onClick={() => router.push(card.path)}
                        >
                            {/* Background decoration */}
                            

                            <div className="relative z-10">
                                {/* Icon */}
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                                    style={{
                                        background: card.gradient,
                                        boxShadow: '0 8px 20px rgba(232,105,10,0.3)',
                                    }}
                                >
                                    {card.icon}
                                </div>

                                {/* Value - Super Big */}
                                <p className="text-4xl font-bold mb-2" style={{ color: '#c95b08' }}>
                                    {card.value}
                                </p>

                                {/* Label */}
                                <p className="text-base font-bold text-gray-800 mb-1">{card.label}</p>
                                <p className="text-xs text-gray-500">{card.desc}</p>

                                {/* Footer */}
                                <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid #fde0c8' }}>
                                    <span className="text-xs font-bold" style={{ color: '#c95b08' }}>
                                        Lihat Detail
                                    </span>
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:translate-x-2"
                                        style={{ background: card.lightBg }}
                                    >
                                        <ArrowRight className="w-4 h-4" style={{ color: '#c95b08' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BAR CHART - Distribusi Siswa per Kelas
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="mb-6 db-fadeUp" style={{ animationDelay: '0.4s' }}>
                <Card className="overflow-hidden">
                    {/* Header */}
                    <div
                        className="px-6 py-5 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)' }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Distribusi Siswa per Kelas</h3>
                                <p className="text-xs text-white/80 mt-0.5">
                                    Perbandingan jumlah siswa di setiap kelas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/admin/data_kelas_siswa')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all backdrop-blur-sm"
                            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                        >
                            Semua Kelas <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {kelasLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-10 h-10 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                                <span className="ml-3 text-sm font-semibold" style={{ color: '#c95b08' }}>Memuat data...</span>
                            </div>
                        ) : kelasList.length === 0 ? (
                            <div className="text-center py-20">
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5"
                                    style={{ background: '#fff0e5' }}
                                >
                                    <School className="w-12 h-12" style={{ color: '#e8690a' }} />
                                </div>
                                <p className="text-lg font-bold text-gray-800 mb-2">
                                    Belum ada data kelas
                                </p>
                                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                                    Silakan buat kelas terlebih dahulu untuk melihat distribusi siswa
                                </p>
                                <button
                                    onClick={() => router.push('/admin/data_kelas_siswa')}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, #e8690a, #f5a623)',
                                        boxShadow: '0 4px 15px rgba(232,105,10,0.3)'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #c95b08, #e8690a)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #e8690a, #f5a623)')}
                                >
                                    <Plus className="w-5 h-5" />
                                    Buat Kelas Pertama
                                </button>
                            </div>
                        ) : (
                            <div>
                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="p-4 rounded-2xl" style={{ background: '#fff0e5', border: '2px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <School className="w-5 h-5" style={{ color: '#c95b08' }} />
                                            <p className="text-xs font-bold uppercase" style={{ color: '#c95b08' }}>Total Kelas</p>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: '#7a3a0a' }}>{kelasList.length}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl" style={{ background: '#fff5eb', border: '2px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Users className="w-5 h-5" style={{ color: '#e8690a' }} />
                                            <p className="text-xs font-bold uppercase" style={{ color: '#e8690a' }}>Total Siswa</p>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: '#7a3a0a' }}>{stats.siswa}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl" style={{ background: '#fffaf0', border: '2px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Target className="w-5 h-5" style={{ color: '#f5870a' }} />
                                            <p className="text-xs font-bold uppercase" style={{ color: '#f5870a' }}>Rata-rata</p>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: '#7a3a0a' }}>
                                            {kelasList.length > 0 ? Math.round(stats.siswa / kelasList.length) : 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Horizontal Bar Chart */}
                                <div style={{ height: `${Math.max(300, kelasList.length * 60)}px` }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={barData}
                                            layout="vertical"
                                            margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#fde0c8" horizontal={false} />
                                            <XAxis
                                                type="number"
                                                stroke="#7a3a0a"
                                                fontSize={11}
                                                fontWeight={600}
                                                tick={{ fill: '#7a3a0a' }}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                stroke="#7a3a0a"
                                                fontSize={12}
                                                fontWeight={700}
                                                width={60}
                                                tick={{ fill: '#7a3a0a' }}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,105,10,0.05)' }} />
                                            <Bar
                                                dataKey="siswa"
                                                radius={[0, 12, 12, 0]}
                                                maxBarSize={45}
                                                barSize={30}
                                            >
                                                {barData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Class List */}
                                <div className="mt-6 pt-6 border-t" style={{ borderColor: '#fde0c8' }}>
                                    <h4 className="text-sm font-bold mb-3" style={{ color: '#7a3a0a' }}>
                                        Detail Kelas ({kelasList.length})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {kelasList.map((kelas, index) => {
                                            const percentage = stats.siswa > 0
                                                ? ((kelas.jumlah_siswa / stats.siswa) * 100).toFixed(1)
                                                : 0;

                                            return (
                                                <div
                                                    key={kelas.id_kelas}
                                                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:shadow-md"
                                                    style={{
                                                        background: '#fffaf6',
                                                        border: '1px solid #fde0c8'
                                                    }}
                                                    onClick={() => router.push(`/admin/data_kelas_siswa/${kelas.id_kelas}`)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                                            style={{ background: BAR_COLORS[index % BAR_COLORS.length] }}
                                                        >
                                                            {kelas.nama_kelas}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">Kelas {kelas.nama_kelas}</p>
                                                            <p className="text-xs text-gray-500">{percentage}% dari total</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-black" style={{ color: '#c95b08' }}>
                                                            {kelas.jumlah_siswa}
                                                        </p>
                                                        <p className="text-xs text-gray-500">siswa</p>
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
        </div>
    );
}