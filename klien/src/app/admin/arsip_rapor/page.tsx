/**
 * Nama File: page.tsx
 * Fungsi: Halaman server untuk manajemen arsip rapor oleh admin.
 *         Merender komponen klien ArsipRaporClient yang menangani filter, status penilaian,
 *         dan unduh data arsip rapor siswa.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022
 * Tanggal: 15 September 2025
 */

import { Metadata } from 'next';
import ArsipRaporClient from './components/arsip_rapor_client';

export const metadata: Metadata = {
    title: 'Data Arsip Rapor',
};

export default function ArsipRapor() {
    return <ArsipRaporClient/>;
}