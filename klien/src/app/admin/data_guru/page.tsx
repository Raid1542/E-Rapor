/**
 * Nama File: page.tsx
 * Fungsi: Halaman server untuk manajemen data guru oleh admin.
 *         Merender komponen klien DataGuruClient yang menangani CRUD,
 *         import Excel, filter, pencarian, dan detail data guru.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import DataGuruClient from './components/data_guru_client';

export const metadata: Metadata = {
    title: 'Data Guru',
};

export default function DataGuru() {
    return <DataGuruClient/>;
}