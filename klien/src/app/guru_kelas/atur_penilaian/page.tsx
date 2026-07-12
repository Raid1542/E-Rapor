/**
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Atur Penilaian.
 *         Memuat komponen client-side AturPenilaianClient.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import AturPenilaianClient from './components/atur_penilaian_client';

export const metadata: Metadata = {
    title: 'Atur Penilaian',
};

export default function aturPenialaianPage() {
    return <AturPenilaianClient />;
}