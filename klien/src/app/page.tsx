/*
 * Nama File: page.tsx
 * Fungsi: Halaman login (server component wrapper untuk LoginClient)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import LoginClient from './login/login_client';

// Metadata default untuk halaman login
export const metadata: Metadata = {
    title: 'E-Rapor - Login',
};

// Komponen utama halaman login
export default function LoginPage() {
    return <LoginClient />;
}