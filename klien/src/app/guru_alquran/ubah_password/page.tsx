/*
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js (Server Component) untuk Ubah Password Guru Al-Qur'an.
 *         Bertugas me-render komponen client-side UbahPasswordClient.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { Metadata } from 'next';
import UbahPasswordClient from './components/ubah_password_client';

export const metadata: Metadata = {
    title: 'Ubah Kata Sandi',
};

export default function UbahPasswordPage() {
    return <UbahPasswordClient />;
}