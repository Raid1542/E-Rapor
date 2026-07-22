/*
 * Nama File: index.ts
 * Fungsi: Type definitions terpusat untuk komponen UI
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 10 Juli 2026
 */

import { LucideIcon } from 'lucide-react';

/* Interface: data user untuk localStorage dan komponen header */
export interface UserData {
    name: string;
    email: string;
    role: string;
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