/*
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Data Siswa Kelompok (FR-49).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { Metadata } from 'next';
import DataSiswaClient from './components/data_siswa_client';

export const metadata: Metadata = {
    title: 'Data Siswa Kelompok',
};

export default function DataSiswaPage() {
    return <DataSiswaClient />;
}