/**
 * Nama File: index.ts
 * Fungsi: Type definitions terpusat (UserData, MenuItem, SidebarProps, HeaderProps)
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 1 Oktober 2025
 */

import { LucideIcon } from 'lucide-react';

// Interface: data user (name, email, role) untuk localStorage & header
export interface UserData {
    name: string;
    email: string;
    role: string;
}

// Interface: item menu navigasi sidebar (id, label, icon)
export interface MenuItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

// Interface: props Sidebar (sidebarOpen, activeMenu + setters)
export interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (value: boolean) => void;
    activeMenu: string;
    setActiveMenu: (value: string) => void;
}

// Interface: props Header (user data, profile dropdown, logout handler)
export interface HeaderProps {
    user: UserData;
    profileOpen: boolean;
    setProfileOpen: (value: boolean) => void;
    handleLogout: () => void;
}