/**
 * Nama File: Header.tsx
 * Fungsi: Komponen header untuk layout guru bidang studi,
 *         menampilkan judul halaman dan menu profil pengguna dengan dropdown.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { LogOut, ChevronDown, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface UserData {
    id: number;
    nama_lengkap: string;
    email_sekolah: string;
    role: string;
    profileImage?: string;
}

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .slice(0, 2)
        .map(word => word[0]?.toUpperCase() || '')
        .join('');
};

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUserData = () => {
            try {
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const userData: UserData = JSON.parse(storedUser);
                    setUser(userData);
                    if (userData.profileImage) {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                        setProfileImage(`${baseUrl}/${userData.profileImage}`);
                    } else {
                        setProfileImage(null);
                    }
                } else {
                    setUser(null);
                    setProfileImage(null);
                }
            } catch (e) {
                console.error('Gagal memuat data user:', e);
                setUser(null);
                setProfileImage(null);
            }
        };

        loadUserData();

        const fallbackInterval = setInterval(() => {
            const stored = localStorage.getItem('currentUser');
            if (stored && !user) {
                loadUserData();
            }
        }, 500);

        const handleUserUpdate = () => {
            loadUserData();
        };

        window.addEventListener('userDataUpdated', handleUserUpdate);
        window.addEventListener('profileImageUpdated', handleUserUpdate);

        return () => {
            window.removeEventListener('userDataUpdated', handleUserUpdate);
            window.removeEventListener('profileImageUpdated', handleUserUpdate);
            clearInterval(fallbackInterval);
        };
    }, []);

    const closeDropdown = () => {
        if (dropdownMenuRef.current) {
            dropdownMenuRef.current.classList.add('hidden');
        }
    };

    const toggleDropdown = () => {
        if (dropdownMenuRef.current) {
            dropdownMenuRef.current.classList.toggle('hidden');
        }
    };

    const handleLogout = () => {
        closeDropdown();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            sessionStorage.clear();
        }
        router.push('/login');
    };

    const handleProfile = () => {
        closeDropdown();
        router.push('/guru_bidang_studi/profil');
    };

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                closeDropdown();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) {
        return (
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Guru Bidang Studi</h1>
                        <div className="w-48 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
                <div className="flex justify-between items-center">

                    {/* Judul halaman */}
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Guru Bidang Studi</h1>

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
                                    Guru Bidang Studi
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
                                            GURU BIDANG STUDI
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