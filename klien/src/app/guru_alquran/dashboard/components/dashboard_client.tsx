/*
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen client-side untuk Dashboard Mandiri Guru Al-Qur'an (FR-46).
 *         Menggunakan data dinamis dari mockDashboardAlquran (Single Source of Truth).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

"use client";

import { useEffect, useState } from 'react';
import {
    ChevronRight, Users, Book, TrendingUp,
    Calendar, CheckCircle2, AlertTriangle, X,
    BookOpen, Settings, Target, School, ArrowUpRight,
    Clock, Hourglass
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mockDashboardAlquran } from '@/lib/mockDashboardAlquran';

/* ==========================================================================
   DESIGN TOKENS & STYLES (Identik dengan Guru Kelas)
   ========================================================================== */
const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';
const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const THEME = {
    statCards: [{ iconBg: '#e8690a' }, { iconBg: '#c95b08' }, { iconBg: '#e07b1a' }, { iconBg: '#d4700f' }],
    semantic: { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
};

type StatusType = 'aktif' | 'nonaktif' | 'selesai';
const STATUS_CFG: Record<StatusType, { bg: string; color: string; border: string; dot: string; label: string }> = {
    aktif:    { bg: '#e6f9f0', color: '#0d6e48', border: '#6dd4c4', dot: '#10b981', label: 'Aktif' },
    selesai:  { bg: '#fff7e6', color: '#8b4513', border: '#ffc080', dot: '#f59e0b', label: 'Selesai' },
    nonaktif: { bg: '#f5f5f5', color: '#666666', border: '#d0d0d0', dot: '#9ca3af', label: 'Belum Aktif' },
};

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes growBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .anim-in { animation: fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; } .d2 { animation-delay: 0.10s; } .d3 { animation-delay: 0.15s; } .d4 { animation-delay: 0.20s; } .d5 { animation-delay: 0.25s; }
        .grow-bar { transform-origin: left; animation: growBar 0.8s cubic-bezier(0.4,0,0.2,1) forwards; }
        .pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }
        .stat-card { position: relative; overflow: hidden; transition: box-shadow 0.22s ease, transform 0.22s ease; }
        .stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07) !important; transform: translateY(-2px); }
        .stat-card:hover .s-icon { transform: scale(1.08); }
        .s-icon { position: relative; z-index: 1; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .s-value { position: relative; z-index: 1; display: inline-block; }
        .section-card { transition: box-shadow 0.2s ease; }
        .section-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important; }
        .item-hover { transition: background 0.15s ease; cursor: pointer; }
        .item-hover:hover { background: #fff8f2 !important; }
        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease; }
        .btn-action:hover { filter: brightness(1.04); }
        button:focus-visible { outline: 2.5px solid #f5a623; outline-offset: 2px; }
    `}</style>
);

const CardHeader = ({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ background: BRAND_GRADIENT, borderRadius: '14px 14px 0 0' }}>
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.22)' }}>{icon}</div>
            <div className="min-w-0">
                <h3 className="text-sm font-bold text-white leading-tight truncate">{title}</h3>
                <p className="text-[11px] text-white/70 truncate">{subtitle}</p>
            </div>
        </div>
        {action}
    </div>
);

const StatusBadge = ({ status }: { status: StatusType }) => {
    const c = STATUS_CFG[status];
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'aktif' ? 'pulse-dot' : ''}`} style={{ background: c.dot }} />
            {c.label}
        </span>
    );
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */
export default function DashboardClient() {
    const dashboard = mockDashboardAlquran;
    const [userName, setUserName] = useState('Guru Al-Qur\'an');
    const router = useRouter();

    useEffect(() => {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) setUserName(JSON.parse(userData).nama_lengkap || 'Guru Al-Qur\'an');
        } catch (e) { console.error('Gagal parse user:', e); }
    }, []);

    // ✅ HITUNG DINAMIS: Rata-rata progress dari semua mapel x kelompok
    const overallProgress = Math.round(
        dashboard.progress_per_mapel.reduce((acc, curr) => acc + curr.persentase, 0) / (dashboard.progress_per_mapel.length || 1)
    );

    const statValues = [
        { value: dashboard.total_mapel, label: 'Mata Pelajaran', desc: 'Total mapel yang diampu', icon: <Book className="w-5 h-5 text-white" /> },
        { value: dashboard.total_kelompok, label: 'Total Kelompok', desc: 'Kelompok bimbingan Anda', icon: <School className="w-5 h-5 text-white" /> },
        { value: dashboard.total_siswa, label: 'Total Siswa', desc: 'Siswa di semua kelompok', icon: <Users className="w-5 h-5 text-white" /> },
        { value: `${overallProgress}%`, label: 'Progress Rata-rata', desc: 'Rata-rata penyelesaian nilai', icon: <Target className="w-5 h-5 text-white" /> },
    ];

    return (
        <div className="flex-1 min-h-screen p-8" style={PAGE_BG}>
            <GlobalStyles />

            {/* HEADER */}
            <div className="mb-8 anim-in d1">
                <div className="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill={ACCENT_DARK} /></svg>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT_DARK }}>Dashboard Guru Al-Qur'an</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Selamat datang, {userName} 👋</h1>
                <p className="text-sm text-gray-400">Pantau ringkasan data kelompok bimbingan Anda secara mandiri</p>
                <div className="mt-5 h-px bg-gray-200" />
            </div>

            {/* STATISTICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {statValues.map((stat, index) => {
                    const cardStyle = THEME.statCards[index] || THEME.statCards[0];
                    return (
                        <div key={stat.label} className={`stat-card bg-white rounded-2xl p-5 anim-in d${index + 1}`} style={CARD_STYLE}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="s-icon w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: cardStyle.iconBg }}>{stat.icon}</div>
                                <ArrowUpRight className="w-4 h-4 opacity-40" style={{ color: cardStyle.iconBg }} />
                            </div>
                            <p className="s-value text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                            <p className="text-sm font-bold mb-1" style={{ color: cardStyle.iconBg }}>{stat.label}</p>
                            <p className="text-xs text-gray-400">{stat.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* PROGRESS PER MAPEL & KELOMPOK (DINAMIS) */}
            <div className="section-card bg-white rounded-2xl overflow-hidden mb-6 anim-in d2" style={CARD_STYLE}>
                <CardHeader
                    icon={<TrendingUp className="w-5 h-5 text-white" />}
                    title="Progress Penilaian per Mapel & Kelompok"
                    subtitle={`Periode ${dashboard.jenis_penilaian_aktif || 'Belum Aktif'}`}
                    action={
                        <button onClick={() => router.push('/guru_alquran/input_nilai')}
                            className="btn-action inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.2)' }}>
                            Input Nilai <ChevronRight className="w-4 h-4" />
                        </button>
                    }
                />
                <div className="p-6 bg-white space-y-4">
                    {dashboard.progress_per_mapel.map((item, index) => {
                        const isComplete = item.persentase === 100;
                        return (
                            <div key={`${item.id_mapel}-${item.id_kelompok}`} className="item-hover rounded-2xl p-5" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: isComplete ? THEME.semantic.success : BRAND_GRADIENT }}>
                                            {isComplete ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-base font-bold text-gray-800 truncate">{item.nama_mapel} - {item.nama_kelompok}</p>
                                            <p className="text-xs text-gray-400">{item.total_siswa} siswa</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-2xl font-bold" style={{ color: isComplete ? THEME.semantic.success : ACCENT_DARK }}>{item.persentase}%</p>
                                        <p className="text-[11px] text-gray-400">{isComplete ? 'Selesai' : 'Berjalan'}</p>
                                    </div>
                                </div>
                                <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
                                    <div className="grow-bar h-full rounded-full" style={{ width: `${item.persentase}%`, background: isComplete ? THEME.semantic.success : BRAND_GRADIENT }} />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    {item.sudah_dinilai} dari {item.total_siswa} siswa sudah dinilai
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BOTTOM SECTION: Jadwal + Konfigurasi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Jadwal Penting */}
                <div className="section-card bg-white rounded-2xl overflow-hidden anim-in d4" style={CARD_STYLE}>
                    <CardHeader icon={<Calendar className="w-5 h-5 text-white" />} title="Jadwal Penting" subtitle="Status periode penilaian" />
                    <div className="p-5 bg-white space-y-3">
                        <div className="item-hover p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: dashboard.status_pts === 'aktif' ? BRAND_GRADIENT : '#d1d5db' }}>
                                        <Clock size={18} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 mb-0.5">PTS</p>
                                        <p className="text-[11px] text-gray-400">Penilaian Tengah Semester</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <StatusBadge status={dashboard.status_pts} />
                                    <p className="text-xs font-bold mt-1.5" style={{ color: ACCENT_DARK }}>{dashboard.jadwal.pts || '-'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="item-hover p-4 rounded-xl" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: dashboard.status_pas === 'aktif' ? BRAND_GRADIENT : dashboard.status_pas === 'selesai' ? '#f0953a' : '#d1d5db' }}>
                                        {dashboard.status_pas === 'selesai' ? <CheckCircle2 size={18} className="text-white" /> : <Hourglass size={18} className="text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 mb-0.5">PAS</p>
                                        <p className="text-[11px] text-gray-400">Penilaian Akhir Semester</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <StatusBadge status={dashboard.status_pas} />
                                    <p className="text-xs font-bold mt-1.5" style={{ color: ACCENT_DARK }}>{dashboard.jadwal.pas || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Konfigurasi */}
                <div className="section-card bg-white rounded-2xl overflow-hidden anim-in d5" style={CARD_STYLE}>
                    <CardHeader icon={<Settings className="w-5 h-5 text-white" />} title="Status Konfigurasi" subtitle="Kelengkapan bobot & kategori" />
                    <div className="p-5 bg-white">
                        {dashboard.konfigurasi_lengkap ? (
                            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#e6f9f0', border: '1px solid #6dd4c4' }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white flex-shrink-0">
                                    <CheckCircle2 size={20} style={{ color: '#0d6e48' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: '#0d6e48' }}>Semua Konfigurasi Sudah Lengkap</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#0d6e48' }}>Semua pengaturan penilaian sudah siap digunakan</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
                                {dashboard.konfigurasi_detail?.summary.map((item, index) => (
                                    <div key={index} className="p-4 rounded-xl" style={{ background: item.type === 'gap' ? '#fff7e6' : '#fef2f2', border: item.type === 'gap' ? '1px solid #ffc080' : '1px solid #fca5a5' }}>
                                        <div className="flex items-start gap-3">
                                            {item.type === 'gap' ? <AlertTriangle size={16} style={{ color: '#f59e0b' }} className="flex-shrink-0 mt-0.5" /> : <X size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold mb-1" style={{ color: item.type === 'gap' ? '#8b4513' : '#991b1b' }}>
                                                    {item.type === 'gap' ? 'Range Belum Lengkap' : 'Belum Diatur'}
                                                </p>
                                                <p className="text-xs font-semibold mb-1" style={{ color: item.type === 'gap' ? '#92400e' : '#991b1b' }}>{item.title}</p>
                                                <p className="text-xs break-words" style={{ color: item.type === 'gap' ? '#92400e' : '#b91c1c' }}>{item.message}</p>
                                                <button onClick={() => router.push('/guru_alquran/atur_penilaian')}
                                                    className="btn-action mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                                    style={{ background: BRAND_GRADIENT }}>
                                                    Atur Sekarang <ChevronRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}