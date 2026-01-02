/**
 * Nama File: page.tsx
 * Fungsi: Halaman server untuk manajemen data kelas oleh admin.
 *         Merender komponen klien DataKelasClient yang menangani CRUD,
 *         filter berdasarkan tahun ajaran, dan manajemen wali kelas.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import DataKelasClient from './components/data_kelas_client';

export const metadata: Metadata = {
    title: 'Data Kelas',
};

export default function ArsipRapor() {
    return <DataKelasClient/>;
}