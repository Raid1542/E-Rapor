/*
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js (Server Component) untuk Profil Guru Al-Qur'an.
 *         Bertugas me-render komponen client-side ProfilPage.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 18 November 2026
 */

import { Metadata } from 'next';
import ProfilePage from './components/profil_client'; // Pastikan nama file ini sesuai

export const metadata: Metadata = {
    title: 'Profil Saya | E-Rapor SDIT Ulil Albab',
};

export default function ProfilPageRoute() {
    return <ProfilePage />;
}