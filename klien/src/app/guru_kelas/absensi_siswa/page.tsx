/**
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Absensi Siswa.
 *         Memuat komponen client-side AbsensiSiswaClient.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import AbsensiSiswaClient from './components/absensi_siswa_client';

export const metadata: Metadata = {
    title: 'Absensi Siswa',
};

export default function Absensi() {
    return <AbsensiSiswaClient />;
}