/*
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Atur Penilaian Guru Al-Qur'an (FR-47).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { Metadata } from 'next';
import AturPenilaianClient from './components/atur_penilaian_client';

export const metadata: Metadata = {
    title: 'Atur Penilaian',
};

export default function AturPenilaianPage() {
    return <AturPenilaianClient />;
}