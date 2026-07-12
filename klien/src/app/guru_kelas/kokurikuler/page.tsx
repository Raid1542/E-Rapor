// File: page.tsx
// Fungsi: Halaman route untuk menampilkan data kokurikuler siswa.
//         Mengimpor komponen client untuk rendering interaktif.
// Pembuat: Raid Aqil Athallah - NIM: 3312401022
// Tanggal: 25 September 2025

import { Metadata } from 'next';
import KokurikulerClient from './components/kokurikuler_client';

export const metadata: Metadata = {
    title: 'Kokurikuler',
};

export default function kokurikulerPage() {
    return <KokurikulerClient />;
}