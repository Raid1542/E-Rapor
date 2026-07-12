/**
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk Catatan Wali Kelas.
 *         Memuat komponen client-side CatatanWaliKelasClient.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import CatatanWaliKelasClient from './components/catatan_wali_kelas_client';

export const metadata: Metadata = {
    title: 'Catatan Wali Kelas',
};

export default function DataCatatan() {
    return <CatatanWaliKelasClient />;
}