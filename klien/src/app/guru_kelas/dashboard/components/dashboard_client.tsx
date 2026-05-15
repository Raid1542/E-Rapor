/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen client-side untuk menampilkan ringkasan informasi dashboard guru kelas,
 *         termasuk jumlah siswa, nama kelas, tahun ajaran, dan semester yang sedang berjalan.
 *         Memvalidasi peran pengguna dan mengarahkan ke login jika tidak sesuai.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Muhammad Auriel Almayda - NIM: 3312401093
 * Tanggal: 15 September 2025
 */

"use client";

import { useEffect, useState } from 'react';
import { Users, User, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserData {
    id: string;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
}

interface KelasInfo {
    kelas: string;
    jumlah_siswa: number;
    tahun_ajaran: string;
    semester: string;
}

export default function GuruKelasDashboard() {

    const [user, setUser] = useState<UserData | null>(null);
    const [kelasInfo, setKelasInfo] = useState<KelasInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser: UserData = JSON.parse(userData);

            if (parsedUser.role !== 'guru kelas') {
                alert('Anda tidak memiliki akses ke halaman ini');
                router.push('/login');
                return;
            }

            setUser(parsedUser);

            const fetchKelasInfo = async () => {
                try {
                    const res = await fetch('http://localhost:5000/api/guru-kelas/kelas', {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            setKelasInfo(data[0]);
                        }
                    }
                } catch (err) {
                    console.error('Gagal memuat data kelas:', err);
                } finally {
                    setLoading(false);
                }
            };

            fetchKelasInfo();
        } catch (e) {
            console.error('Error parsing user ', e);
            router.push('/login');
        }
    }, [router]);

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

    if (!user || !kelasInfo) {
        return (
            <div className="p-6 text-center text-gray-600">
                Anda belum ditugaskan sebagai wali kelas di tahun ajaran ini.
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
                        Anda login sebagai <strong>Wali Kelas</strong>. Silakan kelola siswa Anda.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Data Siswa */}
                <div
                    className="rounded-2xl shadow hover:shadow-lg transition-all duration-300 p-6 cursor-pointer hover:-translate-y-0.5"
                    style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                        border: '1px solid rgba(251,146,60,0.2)',
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium mb-1" style={{ color: '#9a3412' }}>
                                Data Siswa
                            </p>
                            <p className="text-3xl font-bold" style={{ color: '#c2410c' }}>
                                {kelasInfo.jumlah_siswa}
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
                            <Users className="w-8 h-8" />
                        </div>
                    </div>
                    <div
                        className="mb-3"
                        style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, rgba(251,146,60,0.3), transparent)',
                        }}
                    />
                    <p className="text-sm font-medium" style={{ color: '#ea580c' }}>
                        Total siswa di kelas Anda
                    </p>
                </div>

                {/* 2. Kelas Anda */}
                <div
                    className="rounded-2xl shadow hover:shadow-lg transition-all duration-300 p-6 cursor-pointer hover:-translate-y-0.5"
                    style={{
                        background: 'linear-gradient(160deg, #ffffff 0%, #fff7ed 60%, #ffedd5 100%)',
                        border: '1px solid rgba(251,146,60,0.2)',
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium mb-1" style={{ color: '#9a3412' }}>
                                Kelas Anda
                            </p>
                            <p className="text-3xl font-bold" style={{ color: '#c2410c' }}>
                                {kelasInfo.kelas}
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
                            <User className="w-8 h-8" />
                        </div>
                    </div>
                    <div
                        className="mb-3"
                        style={{
                            height: '1px',
                            background: 'linear-gradient(90deg, rgba(251,146,60,0.3), transparent)',
                        }}
                    />
                    <p className="text-sm font-medium" style={{ color: '#ea580c' }}>
                        Kelas yang Anda ampu
                    </p>
                </div>

                {/* 3. Tahun Ajaran */}
                <div
                    className="rounded-2xl shadow hover:shadow-lg transition-all duration-300 p-6 cursor-pointer hover:-translate-y-0.5"
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
                            <p className="text-3xl font-bold truncate" style={{ color: '#c2410c' }}>
                                {kelasInfo.tahun_ajaran}
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
                        {kelasInfo.semester}
                    </span>
                </div>

            </div>
        </>
    );
}