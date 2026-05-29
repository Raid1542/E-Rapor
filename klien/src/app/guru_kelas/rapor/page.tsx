// File: page.tsx
// Fungsi: Halaman route untuk mengunduh rapor siswa berdasarkan jenis penilaian
//         (PTS/PAS) dan semester aktif. Menggunakan komponen client untuk interaksi.
// Pembuat: Raid Aqil Athallah - NIM: 3312401022
// Tanggal: 15 September 2025

import { Metadata } from 'next';
import RaporGuruKelasClient from './components/cetak_rapor_client';

export const metadata: Metadata = {
    title: 'Rapor',
};

export default function RaporGuruKelasPage() {
    return <RaporGuruKelasClient />;
}