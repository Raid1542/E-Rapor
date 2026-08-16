/*
 * Nama File: index.ts
 * Fungsi: Type definitions terpusat untuk komponen UI
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 * Update: UserData dilengkapi semua field yang dipakai halaman
 *         admin / guru_kelas / guru_bidang_studi.
 */

import { LucideIcon } from 'lucide-react';

/* Interface: data user untuk localStorage dan komponen header */
export interface UserData {
    id?: number;
    name?: string;
    nama?: string;
    nama_lengkap?: string;
    email?: string;
    email_sekolah?: string;
    role: string;
    profileImage?: string | null;
    /* Izinkan field tambahan dari backend tanpa error tipe */
    [key: string]: any;
}

/* Interface: item menu navigasi sidebar */
export interface MenuItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

/* Interface: props untuk komponen Sidebar */
export interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (value: boolean) => void;
    activeMenu: string;
    setActiveMenu: (value: string) => void;
}

/* Interface: props untuk komponen Header */
export interface HeaderProps {
    user: UserData;
    profileOpen: boolean;
    setProfileOpen: (value: boolean) => void;
    handleLogout: () => void;
}