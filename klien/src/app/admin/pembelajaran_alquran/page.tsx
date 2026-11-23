/**
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk menampilkan Pembelajaran Al-Quran.
 *         Bertindak sebagai wrapper yang menyertakan metadata halaman
 *         dan memuat komponen client-side PembelajaranAlquranClient.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 23 November 2026
 */

import { Metadata } from 'next';
import PembelajaranAlquranClient from './components/pembelajaran_alquran_client';

export const metadata: Metadata = {
  title: 'Pembelajaran Al-Quran',
};

export default function PembelajaranAlquranPage() {
  return <PembelajaranAlquranClient />;
}