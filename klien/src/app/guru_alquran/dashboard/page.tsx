/*
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Dashboard Guru Al-Qur'an.
 *         Memuat komponen client-side DashboardClient.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { Metadata } from 'next';
import DashboardClient from './components/dashboard_client';

export const metadata: Metadata = {
    title: 'Dashboard',
};

export default function DashboardPage() {
    return <DashboardClient />;
}