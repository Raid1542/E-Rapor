/*
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Input Nilai Guru Al-Qur'an (FR-48).
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { Metadata } from 'next';
import InputNilaiForm from './components/input_nilai_client';

export const metadata: Metadata = {
    title: 'Input Nilai',
};

export default function InputNilaiPage() {
    return <InputNilaiForm />;
}