/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard guru bidang studi,
 *         mencakup data profil, tahun ajaran aktif, dan ringkasan mata pelajaran yang diampu.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 dan Syahrul Ramadhan - NIM: 3312301093
 * Tanggal: 15 September 2025
 */

"use client";

import { useEffect, useState } from 'react';
import { Book, Calendar } from 'lucide-react';

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
}

interface DashboardData {
    tahun_ajaran: string;
    semester: string;
    mata_pelajaran_list: MapelItem[];
}

export default function DashboardClient() {
    const [user, setUser] = useState<UserData | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) {
            alert("Silakan login terlebih dahulu.");
            window.location.href = "/login";
            return;
        }

        try {
            const parsedUser: UserData = JSON.parse(userData);

            if (parsedUser.role !== 'guru bidang studi') {
                alert('Anda tidak memiliki akses ke halaman ini.');
                window.location.href = "/login";
                return;
            }

            setUser(parsedUser);

            const fetchDashboard = async () => {
                try {
                    const res = await fetch('http://localhost:5000/api/guru-bidang-studi/dashboard', {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });

                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('currentUser');
                        alert('Sesi Anda telah berakhir. Silakan login kembali.');
                        window.location.href = "/login";
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
            window.location.href = "/login";
        }
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Memuat data...</p>
                </div>
            </div>
        );
    }

    if (!user || !dashboard || dashboard.mata_pelajaran_list.length === 0) {
        return (
            <div className="p-6 text-center">
                <div
                    className="inline-block px-4 py-3 rounded-xl text-sm font-medium"
                    style={{
                        background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                        color: '#c2410c',
                        border: '1px solid rgba(251,146,60,0.2)',
                    }}
                >
                    Anda belum ditugaskan mengajar mata pelajaran apapun di tahun ajaran ini.
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Welcome Card */}
            <div
                className="rounded-2xl shadow-lg p-6 mb-8 text-white relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
                }}
            >
                {/* Lingkaran dekorasi */}
                <div
                    className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20"
                    style={{ background: 'rgba(255,255,255,0.4)' }}
                />
                <div
                    className="absolute -bottom-8 -right-2 w-48 h-48 rounded-full opacity-10"
                    style={{ background: 'rgba(255,255,255,0.4)' }}
                />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">
                        Selamat Datang, {user.nama_lengkap || 'Guru'}! 👋
                    </h2>
                    <p style={{ color: 'rgba(255,237,213,0.95)' }}>
                        Anda login sebagai <strong>Guru Bidang Studi</strong>. Silakan input nilai siswa berdasarkan mata pelajaran yang diampu.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Card: Tahun Ajaran */}
                <div
                    className="rounded-2xl shadow hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-0.5"
                    style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                        border: '1px solid rgba(251,146,60,0.2)',
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium mb-1" style={{ color: '#9a3412' }}>
                                Tahun Ajaran
                            </p>
                            <p className="text-3xl font-bold" style={{ color: '#c2410c' }}>
                                {dashboard.tahun_ajaran}
                            </p>
                        </div>
                        <div
                            className="p-3 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                                color: 'white',
                                boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                            }}
                        >
                            <Calendar className="w-8 h-8" />
                        </div>
                    </div>
                    <div
                        className="mb-3"
                        style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, rgba(251,146,60,0.3), transparent)',
                        }}
                    />
                    <span
                        className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, #ea580c, #fb923c)',
                            color: 'white',
                        }}
                    >
                        {dashboard.semester}
                    </span>
                </div>

                {/* Cards Per Mata Pelajaran */}
                {dashboard.mata_pelajaran_list.map((mapel, index) => (
                    <div
                        key={index}
                        className="rounded-2xl shadow hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-0.5"
                        style={{
                            background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                            border: '1px solid rgba(251,146,60,0.2)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1 min-w-0 pr-3">
                                <p className="text-sm font-medium mb-1 truncate" style={{ color: '#9a3412' }}>
                                    {mapel.nama}
                                </p>
                                <p className="text-3xl font-bold" style={{ color: '#c2410c' }}>
                                    {mapel.total_siswa}
                                </p>
                            </div>
                            <div
                                className="p-3 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                                    color: 'white',
                                    boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                                }}
                            >
                                <Book className="w-8 h-8" />
                            </div>
                        </div>
                        <div
                            className="mb-3"
                            style={{
                                height: '1px',
                                background: 'linear-gradient(90deg, rgba(251,146,60,0.3), transparent)',
                            }}
                        />
                        <div className="flex items-center space-x-2">
                            <span
                                className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                                style={{
                                    background: 'linear-gradient(135deg, #ea580c, #fb923c)',
                                    color: 'white',
                                }}
                            >
                                {mapel.total_kelas} Kelas
                            </span>
                            <span
                                className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                                style={{
                                    background: 'linear-gradient(160deg, #ffffff, #ffedd5)',
                                    color: '#c2410c',
                                    border: '1px solid rgba(251,146,60,0.3)',
                                }}
                            >
                                {mapel.total_siswa} Siswa
                            </span>
                        </div>
                    </div>
                ))}

            </div>
        </>
    );
}