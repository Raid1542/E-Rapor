/**
 * Nama File: index.ts
 * Fungsi: Mendefinisikan tipe data terpusat (centralized type definitions) untuk aplikasi E-Rapor.
 *         Berisi interface untuk struktur data pengguna, item menu navigasi, dan props komponen layout.
 *         File ini di-import oleh berbagai komponen untuk memastikan konsistensi tipe data di seluruh aplikasi.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

import { LucideIcon } from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════════
// 1. USER DATA TYPE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Interface untuk data user yang tersimpan di localStorage dan digunakan di header.
 * 
 * Properti:
 *   - name: Nama lengkap user yang ditampilkan di header
 *   - email: Email user untuk identifikasi
 *   - role: Role user ('admin', 'guru_kelas', atau 'guru_bidang_studi')
 * 
 * Penggunaan:
 *   const user: UserData = JSON.parse(localStorage.getItem('currentUser'));
 */
export interface UserData {
    name: string;
    email: string;
    role: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. MENU ITEM TYPE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Interface untuk item menu navigasi di sidebar.
 * 
 * Properti:
 *   - id: Identifier unik untuk menu (digunakan untuk active state)
 *   - label: Teks label yang ditampilkan di sidebar
 *   - icon: Komponen icon dari lucide-react
 * 
 * Penggunaan:
 *   const menuItems: MenuItem[] = [
 *     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
 *     { id: 'siswa', label: 'Data Siswa', icon: Users }
 *   ];
 */
export interface MenuItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. SIDEBAR PROPS TYPE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Interface untuk props komponen Sidebar.
 * Mengatur state sidebar (open/close) dan menu aktif.
 * 
 * Properti:
 *   - sidebarOpen: Boolean untuk kontrol visibility sidebar (mobile)
 *   - setSidebarOpen: Setter function untuk sidebarOpen
 *   - activeMenu: ID menu yang sedang aktif (untuk highlight)
 *   - setActiveMenu: Setter function untuk activeMenu
 * 
 * Penggunaan:
 *   <Sidebar 
 *     sidebarOpen={isOpen} 
 *     setSidebarOpen={setIsOpen}
 *     activeMenu="dashboard"
 *     setActiveMenu={setActiveMenu}
 *   />
 */
export interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (value: boolean) => void;
    activeMenu: string;
    setActiveMenu: (value: string) => void;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. HEADER PROPS TYPE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Interface untuk props komponen Header.
 * Menampilkan data user dan kontrol profile dropdown.
 * 
 * Properti:
 *   - user: Data user yang ditampilkan di header (nama, email, role)
 *   - profileOpen: Boolean untuk kontrol visibility profile dropdown
 *   - setProfileOpen: Setter function untuk profileOpen
 *   - handleLogout: Callback function untuk handle logout action
 * 
 * Penggunaan:
 *   <Header 
 *     user={userData}
 *     profileOpen={isProfileOpen}
 *     setProfileOpen={setIsProfileOpen}
 *     handleLogout={handleLogout}
 *   />
 */
export interface HeaderProps {
    user: UserData;
    profileOpen: boolean;
    setProfileOpen: (value: boolean) => void;
    handleLogout: () => void;
}