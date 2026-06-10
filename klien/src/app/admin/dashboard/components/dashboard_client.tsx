"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, UserCircle, Award, School, Book,
    CheckCircle2, AlertCircle, Plus, Pencil,
    GraduationCap
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// Import Recharts
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip
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

                    // Fetch kelas data jika ada id_detail
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
                console.log('🔍 [Dashboard] Fetching kelas untuk TA ID:', tahunAjaranId);

                const resKelas = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${tahunAjaranId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataKelas = await resKelas.json();

                console.log('📚 [Dashboard] Response kelas:', dataKelas);
                console.log('📚 [Dashboard] Jumlah kelas:', dataKelas.data?.length || 0);

                if (resKelas.ok && dataKelas.success) {
                    const kelasData: KelasWithSiswa[] = [];

                    await Promise.all(
                        dataKelas.data.map(async (kelas: any) => {
                            // Coba gunakan 'id' atau 'id_kelas'
                            const kelasId = kelas.id_kelas || kelas.id;

                            console.log(`👥 [Dashboard] Fetching siswa untuk kelas ${kelas.nama_kelas} (ID: ${kelasId})...`);

                            if (!kelasId) {
                                console.error('❌ Kelas ID tidak ada!', kelas);
                                return;
                            }

                            try {
                                const resSiswa = await fetch(
                                    `http://localhost:5000/api/admin/kelas/${kelasId}/siswa`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const dataSiswa = await resSiswa.json();

                                if (dataSiswa.success && dataSiswa.data.length > 0) {
                                    kelasData.push({
                                        id_kelas: kelasId,
                                        nama_kelas: kelas.nama_kelas || kelas.nama,
                                        jumlah_siswa: dataSiswa.data.length
                                    });
                                }
                            } catch (err) {
                                console.error(`   ❌ Error:`, err);
                            }
                        })
                    );

                    console.log('✅ [Dashboard] Total kelas dengan siswa:', kelasData);
                    console.log('✅ [Dashboard] Total siswa:', kelasData.reduce((sum, k) => sum + k.jumlah_siswa, 0));

                    setKelasList(kelasData.sort((a, b) => b.jumlah_siswa - a.jumlah_siswa));
                } else {
                    console.error('❌ [Dashboard] Gagal fetch kelas:', dataKelas);
                }
            } catch (err) {
                console.error('❌ [Dashboard] Error fetch kelas:', err);
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
                    <p className="mt-4 text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // ── Stat cards config ─────────────────────────────────────────────────────

    const statCards = [
        { label: 'Data Guru', value: stats.guru, icon: <Users className="w-5 h-5" />, path: '/admin/data_guru' },
        { label: 'Data Admin', value: stats.admin, icon: <UserCircle className="w-5 h-5" />, path: '/admin/data_admin' },
        { label: 'Ekstrakurikuler', value: stats.ekstrakurikuler, icon: <Award className="w-5 h-5" />, path: '/admin/ekstrakurikuler' },
        { label: 'Data Kelas', value: stats.kelas, icon: <School className="w-5 h-5" />, path: '/admin/data_kelas_siswa' },
        { label: 'Mata Pelajaran', value: stats.mata_pelajaran, icon: <Book className="w-5 h-5" />, path: '/admin/data_mata_pelajaran' },
    ];

    // ── Format semester display ───────────────────────────────────────────────
    const semesterDisplay = stats.semester === 'Ganjil' ? 'Ganjil' :
        stats.semester === 'Genap' ? 'Genap' : '-';

    // ── Data untuk Pie Chart ──────────────────────────────────────────────────
    const pieData = kelasList.map(k => ({
        name: k.nama_kelas,
        value: k.jumlah_siswa,
        id_kelas: k.id_kelas
    }));

    // ── Custom Tooltip ────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = stats.siswa > 0
                ? ((data.value / stats.siswa) * 100).toFixed(1)
                : 0;
            return (
                <div className="bg-white rounded-xl shadow-xl p-3" style={{ border: '2px solid #fde0c8' }}>
                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{data.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold" style={{ color: '#c95b08' }}>{data.value}</span>
                        <span className="text-xs text-gray-500">siswa ({percentage}%)</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 min-h-screen p-6" style={{ background: '#fdf6f0' }}>

            {showSessionExpired && (
                <SessionExpiredModal onConfirm={handleLogout} />
            )}

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
                                {stats.tahun_ajaran ? (
                                    <CheckCircle2 className="w-7 h-7 text-white" />
                                ) : (
                                    <AlertCircle className="w-7 h-7 text-white" />
                                )}
                            </div>

                            <div>
                                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                                    Tahun Ajaran Aktif
                                </p>
                                {stats.tahun_ajaran ? (
                                    <div>
                                        <p className="text-2xl font-bold text-white mb-0.5">
                                            {stats.tahun_ajaran}
                                        </p>
                                        <p className="text-sm text-white/90 font-medium">
                                            Semester {semesterDisplay}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-lg font-bold text-white">
                                        Belum Ada Tahun Ajaran Aktif
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/admin/data_tahun_ajaran')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg"
                            style={{
                                background: stats.tahun_ajaran ? 'rgba(255,255,255,0.95)' : 'linear-gradient(135deg, #9a3a08, #c95b08)',
                                color: stats.tahun_ajaran ? '#c95b08' : '#ffffff',
                                border: '1px solid rgba(255,255,255,0.5)',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = stats.tahun_ajaran ? 'rgba(255,255,255,0.95)' : 'linear-gradient(135deg, #9a3a08, #c95b08)';
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            }}
                        >
                            {stats.tahun_ajaran ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {stats.tahun_ajaran ? 'Ubah' : 'Tambah'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CARD: TOTAL SISWA DENGAN DONUT CHART ───────────────────────── */}
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
                                <h3 className="text-base font-bold text-white">Total Siswa Aktif</h3>
                                <p className="text-xs text-white/80">
                                    Semester {semesterDisplay} • TA {stats.tahun_ajaran || '-'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/admin/data_siswa')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'}
                        >
                            Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Content: Chart + Legend */}
                    <div className="p-6">
                        {kelasLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-10 h-10 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                                <span className="ml-3 text-sm" style={{ color: '#c95b08' }}>Memuat data siswa...</span>
                            </div>
                        ) : stats.siswa === 0 || kelasList.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-10 h-10 text-orange-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    {stats.siswa > 0 && kelasList.length === 0
                                        ? `${stats.siswa} siswa belum memiliki kelas`
                                        : 'Belum ada data siswa aktif'}
                                </p>
                                <p className="text-xs text-gray-400 mb-4">
                                    {stats.siswa > 0 && kelasList.length === 0
                                        ? 'Silakan tambahkan siswa ke kelas untuk melihat distribusi'
                                        : 'Data akan muncul setelah siswa terdaftar di kelas'}
                                </p>
                                {stats.siswa > 0 && kelasList.length === 0 && (
                                    <button
                                        onClick={() => router.push('/admin/data_kelas_siswa')}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                                        style={{ background: 'linear-gradient(135deg, #c95b08, #e8690a)' }}
                                    >
                                        <School className="w-4 h-4" />
                                        Kelola Kelas
                                    </button>
                                )}
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
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    stroke="#fff"
                                                    strokeWidth={2}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => router.push(`/admin/data_kelas_siswa/${entry.id_kelas}`)}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Center Label */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <p className="text-5xl font-black" style={{ color: '#c95b08' }}>
                                                {stats.siswa}
                                            </p>
                                            <p className="text-sm text-gray-500 font-semibold mt-1">Total Siswa</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Legend / Daftar Kelas */}
                                <div className="lg:col-span-2">
                                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                                        <School className="w-4 h-4" />
                                        Distribusi per Kelas ({kelasList.length})
                                    </h4>
                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                        {kelasList.map((kelas, index) => {
                                            const percentage = stats.siswa > 0
                                                ? ((kelas.jumlah_siswa / stats.siswa) * 100).toFixed(1)
                                                : 0;

                                            return (
                                                <div
                                                    key={kelas.id_kelas}
                                                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all hover:shadow-md"
                                                    style={{
                                                        background: index % 2 === 0 ? '#fffaf6' : '#ffffff',
                                                        border: '1px solid #fde0c8'
                                                    }}
                                                    onClick={() => router.push(`/admin/data_kelas_siswa/${kelas.id_kelas}`)}
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
                                                            {kelas.nama_kelas}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{percentage}%</span>
                                                        <div
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                                            style={{ background: '#eaf7ef', color: '#16a34a' }}
                                                        >
                                                            <Users className="w-3 h-3" />
                                                            {kelas.jumlah_siswa}
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

            {/* ── Stat cards lainnya ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            <p className="text-sm font-semibold text-gray-700 mb-3">{card.label}</p>
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
        </div>
    );
}