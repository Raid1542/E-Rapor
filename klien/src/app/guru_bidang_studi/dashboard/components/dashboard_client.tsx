/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Dashboard guru bidang studi - Clean & Informatif
 * UPDATE: 
 * - Hapus Tahun Ajaran (sudah di header)
 * - Hapus Akses Cepat
 * - Ganti Bar Chart dengan Progress Bar Cards
 * Tema: Oranye elegan, konsisten dengan dashboard admin
 */

"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, Award, Book, Calendar,
    GraduationCap, TrendingUp,
    BookOpen, Settings,
    ArrowRight, Sparkles, Target, AlertTriangle,
    CheckCircle2, AlertCircle, CalendarDays
} from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

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

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes db-fadeUp { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes db-scaleIn { 
            from { opacity: 0; transform: scale(0.9); } 
            to { opacity: 1; transform: scale(1); } 
        }
        .db-fadeUp { animation: db-fadeUp 0.5s ease-out forwards; }
        .db-scaleIn { animation: db-scaleIn 0.4s ease-out forwards; }
    `}</style>
);

// ─── CARD WRAPPER ─────────────────────────────────────────────────────────────

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div
        className={`bg-white rounded-2xl ${className}`}
        style={{ border: '1px solid #fde0c8', boxShadow: '0 4px 20px rgba(200,80,10,0.06)' }}
    >
        {children}
    </div>
);

// ─── PROGRESS BAR CARD ────────────────────────────────────────────────────────

const MapelProgressCard = ({ mapel, index, onClick }: { mapel: MapelItem; index: number; onClick: () => void }) => {
    const percentage = mapel.total_siswa > 0
        ? Math.round((mapel.sudah_dinilai / mapel.total_siswa) * 100)
        : 0;
    
    const isComplete = percentage === 100;
    const isHighProgress = percentage >= 60;

    return (
        <div
            onClick={onClick}
            className="group p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            style={{
                background: 'linear-gradient(135deg, #fff 0%, #fffaf6 100%)',
                border: `2px solid ${isComplete ? '#86efac' : '#fde0c8'}`,
                animationDelay: `${index * 0.1}s`
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110"
                        style={{
                            background: isComplete
                                ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                                : 'linear-gradient(135deg, #c95b08, #e8690a)',
                            boxShadow: isComplete
                                ? '0 4px 12px rgba(22,163,74,0.3)'
                                : '0 4px 12px rgba(232,105,10,0.3)'
                        }}
                    >
                        {isComplete ? <CheckCircle2 size={18} /> : <BookOpen size={18} />}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-gray-900">{mapel.nama}</p>
                        <p className="text-xs text-gray-500">{mapel.total_kelas} kelas • {mapel.total_siswa} siswa</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-black ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                        {percentage}%
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#fde0c8' }}>
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            width: `${percentage}%`,
                            background: isComplete
                                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                : 'linear-gradient(90deg, #c95b08, #f5a623)',
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                    {mapel.sudah_dinilai} / {mapel.total_siswa} dinilai
                </span>
                <span
                    className="font-bold px-2 py-0.5 rounded-full"
                    style={{
                        background: isComplete ? '#dcfce7' : isHighProgress ? '#fff0e5' : '#fef9c3',
                        color: isComplete ? '#15803d' : isHighProgress ? '#c95b08' : '#92400e'
                    }}
                >
                    {isComplete ? '✓ Selesai' : isHighProgress ? 'Berjalan' : 'Belum'}
                </span>
            </div>
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

    if (!user || !dashboard) return null;

    // ── Stat cards config (4 cards utama) ─────────────────────────────────────

    const statCards = [
        {
            label: 'Mata Pelajaran',
            value: dashboard.total_mapel,
            icon: <BookOpen className="w-7 h-7" />,
            path: '/guru_bidang_studi/input_nilai',
            gradient: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)',
            lightBg: '#fff0e5',
            desc: 'Mata pelajaran diampu'
        },
        {
            label: 'Total Kelas',
            value: dashboard.total_kelas,
            icon: <Book className="w-7 h-7" />,
            path: '/guru_bidang_studi/input_nilai',
            gradient: 'linear-gradient(135deg, #e8690a 0%, #f5870a 100%)',
            lightBg: '#fff5eb',
            desc: 'Kelas yang diajar'
        },
        {
            label: 'Total Siswa',
            value: dashboard.total_siswa,
            icon: <Users className="w-7 h-7" />,
            path: '/guru_bidang_studi/input_nilai',
            gradient: 'linear-gradient(135deg, #f5870a 0%, #f5a623 100%)',
            lightBg: '#fffaf0',
            desc: `${dashboard.total_penilaian_ada} sudah dinilai`
        },
        {
            label: 'Progress',
            value: `${dashboard.overall_progress}%`,
            icon: <Target className="w-7 h-7" />,
            path: '/guru_bidang_studi/input_nilai',
            gradient: 'linear-gradient(135deg, #f5a623 0%, #f97316 100%)',
            lightBg: '#fffbf0',
            desc: `${dashboard.total_penilaian_ada} dari ${dashboard.total_penilaian_dibutuhkan}`
        },
    ];

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
            <div className="mb-6 db-fadeUp">
                <div className="flex items-center gap-3 mb-1">
                    <Sparkles className="w-5 h-5" style={{ color: '#e8690a' }} />
                    <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#c95b08' }}>
                        Dashboard Guru Bidang Studi
                    </p>
                </div>
                <h1 className="text-3xl font-black text-gray-900">
                    Selamat Datang, {user.nama_lengkap || 'Guru'} 👋
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Kelola penilaian siswa dengan mudah dari dashboard ini
                </p>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                STAT CARDS - 4 Cards Utama
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card, index) => (
                    <Card
                        key={card.label}
                        className="hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group overflow-hidden db-fadeUp"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div
                            className="p-6 h-full relative"
                            onClick={() => router.push(card.path)}
                        >
                            {/* Background decoration */}
                            <div
                                className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:scale-150"
                                style={{ background: card.gradient }}
                            />

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
                                <p className="text-5xl font-black mb-2" style={{ color: '#c95b08' }}>
                                    {card.value}
                                </p>

                                {/* Label */}
                                <p className="text-base font-bold text-gray-800 mb-1">{card.label}</p>
                                <p className="text-xs text-gray-500">{card.desc}</p>

                                {/* Footer */}
                                <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid #fde0c8' }}>
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
                PROGRESS PENILAIAN PER MAPEL - Progress Bar Cards
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="mb-6 db-fadeUp" style={{ animationDelay: '0.4s' }}>
                <Card className="overflow-hidden">
                    {/* Header */}
                    <div
                        className="px-6 py-5 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)' }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Progress Penilaian per Mata Pelajaran</h3>
                                <p className="text-xs text-white/80 mt-0.5">
                                    Status input nilai siswa di setiap mata pelajaran
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all backdrop-blur-sm"
                            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                        >
                            Input Nilai <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {dashboard.mata_pelajaran_list.length === 0 ? (
                            <div className="text-center py-20">
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5"
                                    style={{ background: '#fff0e5' }}
                                >
                                    <BookOpen className="w-12 h-12" style={{ color: '#e8690a' }} />
                                </div>
                                <p className="text-lg font-bold text-gray-800 mb-2">
                                    Belum ada mata pelajaran
                                </p>
                                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                                    Hubungi administrator untuk penugasan mata pelajaran
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="p-4 rounded-2xl" style={{ background: '#fff0e5', border: '2px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <BookOpen className="w-5 h-5" style={{ color: '#c95b08' }} />
                                            <p className="text-xs font-bold uppercase" style={{ color: '#c95b08' }}>Total Mapel</p>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: '#7a3a0a' }}>{dashboard.total_mapel}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl" style={{ background: '#fff5eb', border: '2px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Users className="w-5 h-5" style={{ color: '#e8690a' }} />
                                            <p className="text-xs font-bold uppercase" style={{ color: '#e8690a' }}>Total Siswa</p>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: '#7a3a0a' }}>{dashboard.total_siswa}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl" style={{ background: '#fffaf0', border: '2px solid #fde0c8' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Target className="w-5 h-5" style={{ color: '#f5870a' }} />
                                            <p className="text-xs font-bold uppercase" style={{ color: '#f5870a' }}>Progress</p>
                                        </div>
                                        <p className="text-3xl font-black" style={{ color: '#7a3a0a' }}>{dashboard.overall_progress}%</p>
                                    </div>
                                </div>

                                {/* Progress Bar Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dashboard.mata_pelajaran_list.map((mapel, index) => (
                                        <MapelProgressCard
                                            key={mapel.id}
                                            mapel={mapel}
                                            index={index}
                                            onClick={() => router.push('/guru_bidang_studi/input_nilai')}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BOTTOM SECTION - Jadwal & Status Konfigurasi
            ═══════════════════════════════════════════════════════════════════ */}
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
                                        <p className="text-xs text-gray-500">Penilaian Tengah Semester</p>
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
                                        <p className="text-xs text-gray-500">Penilaian Akhir Semester</p>
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