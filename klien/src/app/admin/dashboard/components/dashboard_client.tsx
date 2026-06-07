/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard admin
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

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

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface DashboardStats {
    guru: number;
    siswa: number;
    admin: number;
    ekstrakurikuler: number;
    kelas: number;
    mata_pelajaran: number;
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DashboardClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [stats, setStats] = useState<DashboardStats>({
        guru: 0, siswa: 0, admin: 0,
        ekstrakurikuler: 0, kelas: 0, mata_pelajaran: 0,
    });

    const [tahunAjaranAktif, setTahunAjaranAktif] = useState<{
        tahun_ajaran: string;
        semester: string;
    } | null>(null);
    const [taLoading, setTaLoading] = useState(true);

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

        const fetchAll = async () => {
            try {
                const resStats = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const resultStats = await resStats.json();
                if (resStats.ok && resultStats.success) setStats(resultStats.data);
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
        { label: 'Data Siswa', value: stats.siswa, icon: <GraduationCap className="w-5 h-5" />, path: '/admin/data_siswa' },
        { label: 'Data Admin', value: stats.admin, icon: <UserCircle className="w-5 h-5" />, path: '/admin/data_admin' },
        { label: 'Ekstrakurikuler', value: stats.ekstrakurikuler, icon: <Award className="w-5 h-5" />, path: '/admin/ekstrakurikuler' },
        { label: 'Data Kelas', value: stats.kelas, icon: <School className="w-5 h-5" />, path: '/admin/data_kelas' },
        { label: 'Mata Pelajaran', value: stats.mata_pelajaran, icon: <Book className="w-5 h-5" />, path: '/admin/data_mata_pelajaran' },
    ];

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