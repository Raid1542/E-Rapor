/**
 * Nama File: page.tsx
 * Fungsi: Halaman server untuk manajemen data admin oleh pengguna role admin.
 *         Merender komponen klien DataAdminClient yang menangani CRUD, pencarian,
 *         dan tampilan detail data admin.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import DataAdminClient from './components/data_admin_client';

export const metadata: Metadata = {
    title: 'Data Admin',
};

export default function DataAdmin() {
    return <DataAdminClient/>;
}