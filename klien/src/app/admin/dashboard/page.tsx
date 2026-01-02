/**
 * Nama File: page.tsx
 * Fungsi: Halaman server untuk dashboard admin.
 *         Merender komponen klien DashboardClient yang menampilkan statistik sistem E-Rapor.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import DashboardClient from './components/dashboard_client';

export const metadata: Metadata = {
    title: 'Dashboard',
};

export default function Dashboard() {
    return <DashboardClient/>;
}