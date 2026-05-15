/**
 * Nama File: Header.tsx
 * Fungsi: Menampilkan header halaman guru kelas yang mencakup judul dashboard,
 *         nama kelas yang diajar, serta dropdown profil pengguna.
 *         Dropdown menampilkan foto profil, nama, email, peran, dan opsi
 *         navigasi ke Profil atau Logout. Mendukung penutupan otomatis
 *         saat klik di luar area dropdown.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { LogOut, User, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
    class?: string;
    profileImage?: string;
}

interface HeaderProps {
    user: UserData;
}

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .slice(0, 2)
        .map(word => word[0]?.toUpperCase() || '')
        .join('');
};

export default function Header({ user }: HeaderProps) {
    const router = useRouter();
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    // Muat foto profil
    useEffect(() => {
        const loadProfileImage = () => {
            try {
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const userData = JSON.parse(storedUser);
                    if (userData.profileImage) {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                        const imgUrl = userData.profileImage.startsWith('/')
                            ? `${baseUrl}${userData.profileImage}`
                            : `${baseUrl}/${userData.profileImage}`;
                        setProfileImage(imgUrl);
                    } else {
                        setProfileImage(null);
                    }
                }
            } catch (e) {
                console.error('Gagal memuat foto profil:', e);
                setProfileImage(null);
            }
        };

        loadProfileImage();

        const handleProfileUpdate = () => loadProfileImage();
        window.addEventListener('userDataUpdated', handleProfileUpdate);

        return () => {
            window.removeEventListener('userDataUpdated', handleProfileUpdate);
        };
    }, []);

    const toggleDropdown = () => {
        if (dropdownMenuRef.current) {
            dropdownMenuRef.current.classList.toggle('hidden');
        }
    };

    const closeDropdown = () => {
        if (dropdownMenuRef.current) {
            dropdownMenuRef.current.classList.add('hidden');
        }
    };

    const handleLogout = () => {
        closeDropdown();
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        router.push('/login');
    };

    const handleProfile = () => {
        closeDropdown();
        router.push('/guru_kelas/profil');
    };

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
                <div className="flex justify-between items-center">

                    {/* Judul halaman */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Wali Kelas</h1>
                        <p className="text-sm" style={{ color: '#ea580c' }}>
                            {user.class ? `Kelas ${user.class}` : ''}
                        </p>
                    </div>

                    {/* Profil dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={toggleDropdown}
                            className="flex items-center space-x-3 pl-3 pr-2 py-2 rounded-xl transition-all duration-200 hover:shadow-md"
                            style={{
                                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                                border: '1px solid rgba(251,146,60,0.25)',
                            }}
                        >
                            {/* Nama dan role */}
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold leading-tight" style={{ color: '#c2410c' }}>
                                    {user.nama_lengkap}
                                </p>
                                <p className="text-xs leading-tight" style={{ color: '#ea580c', opacity: 0.75 }}>
                                    Wali Kelas
                                </p>
                            </div>

                            {/* Avatar */}
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                                    boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
                                }}
                            >
                                {profileImage ? (
                                    <img
                                        src={profileImage}
                                        alt="Foto Profil"
                                        className="w-full h-full object-cover"
                                        onError={() => setProfileImage(null)}
                                    />
                                ) : (
                                    <span className="text-white text-xs font-bold">
                                        {getInitials(user.nama_lengkap)}
                                    </span>
                                )}
                            </div>

                            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#ea580c' }} />
                        </button>

                        {/* Dropdown menu */}
                        <div
                            ref={dropdownMenuRef}
                            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-50 hidden overflow-hidden"
                            style={{ border: '1px solid rgba(251,146,60,0.2)' }}
                        >
                            {/* Info user */}
                            <div
                                className="p-4"
                                style={{
                                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                                    borderBottom: '1px solid rgba(251,146,60,0.15)',
                                }}
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                                        style={{
                                            background: 'linear-gradient(135deg, #ea580c 0%, #f97316 60%, #fb923c 100%)',
                                            boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
                                        }}
                                    >
                                        {profileImage ? (
                                            <img
                                                src={profileImage}
                                                alt="Foto Profil"
                                                className="w-full h-full object-cover"
                                                onError={() => setProfileImage(null)}
                                            />
                                        ) : (
                                            <span className="text-white text-sm font-bold">
                                                {getInitials(user.nama_lengkap)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate" style={{ color: '#c2410c' }}>
                                            {user.nama_lengkap}
                                        </p>
                                        <p className="text-xs truncate" style={{ color: '#9a3412', opacity: 0.75 }}>
                                            {user.email_sekolah}
                                        </p>
                                        <span
                                            className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full"
                                            style={{
                                                background: 'linear-gradient(135deg, #ea580c, #fb923c)',
                                                color: 'white',
                                            }}
                                        >
                                            WALI KELAS{user.class ? ` – Kelas ${user.class}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="p-2">
                                <button
                                    onClick={handleProfile}
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200"
                                    style={{ color: '#374151' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#fff7ed';
                                        e.currentTarget.style.color = '#ea580c';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#374151';
                                    }}
                                >
                                    <User className="w-4 h-4" />
                                    <span className="text-sm font-medium">Profil Saya</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200"
                                    style={{ color: '#dc2626' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </header>
    );
}