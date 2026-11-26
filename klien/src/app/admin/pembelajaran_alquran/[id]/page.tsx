/**
 * Nama File: page.tsx
 * Fungsi: Halaman rute Next.js untuk menampilkan Detail Kelompok Al-Quran.
 *         Bertindak sebagai wrapper yang menyertakan metadata halaman
 *         dan memuat komponen client-side DetailKelompokClient.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 23 November 2026
 */

import { Metadata } from 'next';
import DetailKelompokClient from './components/detail_kelompok_client';

export const metadata: Metadata = {
  title: 'Detail Kelompok Al-Quran',
};

export default async function DetailKelompokAlquranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetailKelompokClient kelompokId={Number(id)} />;
}