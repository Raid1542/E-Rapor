/**
 * Nama File: dashboard_client.tsx
 * Fungsi: Komponen klien untuk menampilkan dashboard admin,
 *         mencakup statistik data guru, siswa, admin, ekstrakurikuler, kelas, dan mata pelajaran,
 *         serta navigasi ke halaman manajemen terkait.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

"use client";

import { useEffect, useState } from 'react';
import { ChevronRight, Users, UserCircle, Award, School, Book } from 'lucide-react';
import { UserData } from '@/lib/types';
import { useRouter } from 'next/navigation';

// Definisikan tipe stats
interface DashboardStats {
    guru: number;
    siswa: number;
    admin: number;
    ekstrakurikuler: number;
    kelas: number;
    mata_pelajaran: number;
}

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

        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    setStats(result.data);
                }
            } catch (err) {
                console.error('Gagal memuat statistik:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
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

    if (!user) {
        return null;
    }

    return (
        <>
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 mb-8 text-white">
                <h2 className="text-2xl font-bold mb-2">
                    Selamat Datang, {user.name || 'Admin'}! 👋
                </h2>
                <p className="text-orange-100">
                    Anda login sebagai Administrator. Kelola sistem E-Rapor dengan mudah.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card Data Guru */}
                <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Data Guru</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.guru}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <Users className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleNavigation('/admin/data_guru')}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition"
                    >
                        <span className="text-sm font-medium">Lihat detail</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Data Siswa */}
                <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Data Siswa</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.siswa}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <Users className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleNavigation('/admin/data_siswa')}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition"
                    >
                        <span className="text-sm font-medium">Lihat detail</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Data Admin */}
                <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Data Admin</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.admin}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <UserCircle className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleNavigation('/admin/data_admin')}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition"
                    >
                        <span className="text-sm font-medium">Lihat detail</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Data Ekstrakurikuler */}
                <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Data Ekstrakurikuler</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.ekstrakurikuler}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <Award className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleNavigation('/admin/ekstrakurikuler')}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition"
                    >
                        <span className="text-sm font-medium">Lihat detail</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Data Kelas */}
                <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Data Kelas</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.kelas}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <School className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleNavigation('/admin/data_kelas')}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition"
                    >
                        <span className="text-sm font-medium">Lihat detail</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Card Data Mata Pelajaran */}
                <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Data Mata Pelajaran</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.mata_pelajaran}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                            <Book className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleNavigation('/admin/data_mata_pelajaran')}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition"
                    >
                        <span className="text-sm font-medium">Lihat detail</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </>
    );
}