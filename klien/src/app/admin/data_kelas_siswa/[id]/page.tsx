/**
 * Nama File: page.tsx
 * Fungsi: Halaman server untuk menampilkan siswa per kelas.
 *         Merender komponen klien SiswaPerKelasClient.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import SiswaPerKelasClient from './components/data_siswa_per_kelas_client';

export const metadata: Metadata = {
    title: 'Siswa Per Kelas',
};

export default function SiswaPerKelasPage() {
    return <SiswaPerKelasClient />;
}