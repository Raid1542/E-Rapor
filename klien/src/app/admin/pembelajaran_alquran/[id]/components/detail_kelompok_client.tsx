'use client';

/**
 * Nama File: detail_kelompok_client.tsx
 * Fungsi: Komponen client halaman Detail Kelompok Al-Quran (admin).
 *         Menampilkan ringkasan kelompok, daftar anggota, pencarian,
 *         dan tombol keluarkan siswa (dengan konfirmasi).
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 23 November 2026
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

/* ========== Tema: samakan dengan pembelajaran_alquran_client.tsx ========== */
const PAGE_BG = '#ffffff';
const CARD_STYLE: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #f3dcc4',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(194, 65, 12, 0.08)',
};
const HEADER_GRAD = 'linear-gradient(90deg, #c2410c 0%, #ea580c 55%, #f59e0b 100%)';

/* ========== Tipe data ========== */
type SiswaKelompok = {
  id: number;
  nama: string;
  rombel: string;
  sudahAdaNilai: boolean; // dari database nanti: ada nilai Tilawah/Tahfidz atau tidak
};

type DataKelompok = {
  guru: string;
  nama: 'A' | 'B' | 'C';
  sesi: string;
  kelas: string;
  kapasitas: number;
  siswa: SiswaKelompok[];
};

const MAPEL_QURAN = [
  { kode: 'TLW', nama: 'Tilawah' },
  { kode: 'THF', nama: 'Tahfidz' },
];

/* ========== Data contoh (sementara, ganti dengan data dari API berdasarkan id) ========== */
const DATA_KELOMPOK: Record<number, DataKelompok> = {
  1: {
    guru: 'Guru Al-Quran 1',
    nama: 'A',
    sesi: 'Pagi',
    kelas: '1 dan 2',
    kapasitas: 15,
    siswa: [
      { id: 1, nama: 'Aisyah Rahma', rombel: '1B', sudahAdaNilai: false },
      { id: 2, nama: 'Fauzan Pratama', rombel: '1C', sudahAdaNilai: false },
      { id: 3, nama: 'Naura Salsabila', rombel: '2A', sudahAdaNilai: true },
    ],
  },
  2: {
    guru: 'Guru Al-Quran 1',
    nama: 'B',
    sesi: 'Siang',
    kelas: '3 dan 4',
    kapasitas: 15,
    siswa: [{ id: 7, nama: 'Syifa Nabila', rombel: '3A', sudahAdaNilai: false }],
  },
  3: {
    guru: 'Guru Al-Quran 1',
    nama: 'C',
    sesi: 'Sore',
    kelas: '5 dan 6',
    kapasitas: 15,
    siswa: [],
  },
};

export default function DetailKelompokClient({ kelompokId }: { kelompokId: number }) {
  const router = useRouter();
  const data = DATA_KELOMPOK[kelompokId];

  const [siswa, setSiswa] = useState<SiswaKelompok[]>(data?.siswa ?? []);
  const [cari, setCari] = useState('');
  const [akanDikeluarkan, setAkanDikeluarkan] = useState<SiswaKelompok | null>(null);
  const [notif, setNotif] = useState('');

  const kembali = () => router.push('/admin/pembelajaran_alquran');

  /* Kelompok tidak ditemukan */
  if (!data) {
    return (
      <div style={{ background: PAGE_BG }} className="min-h-screen p-6">
        <div style={CARD_STYLE} className="space-y-3 p-10 text-center">
          <p className="text-sm text-gray-600">Kelompok tidak ditemukan.</p>
          <button
            type="button"
            onClick={kembali}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: HEADER_GRAD }}
          >
            Kembali ke Pembelajaran Al-Quran
          </button>
        </div>
      </div>
    );
  }

  const siswaTampil = siswa.filter((s) => s.nama.toLowerCase().includes(cari.trim().toLowerCase()));
  const sisaSlot = data.kapasitas - siswa.length;

  // TODO: ganti dengan panggilan API hapus anggota kelompok
  const konfirmasiKeluarkan = () => {
    if (!akanDikeluarkan) return;
    setSiswa((prev) => prev.filter((s) => s.id !== akanDikeluarkan.id));
    setNotif(`${akanDikeluarkan.nama} dikeluarkan dari Kelompok ${data.nama}.`);
    setAkanDikeluarkan(null);
    setTimeout(() => setNotif(''), 3000);
  };

  return (
    <div style={{ background: PAGE_BG }} className="min-h-screen space-y-5 p-6">
      {notif && (
        <div
          role="status"
          className="fixed right-6 top-6 z-[60] rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          {notif}
        </div>
      )}

      {/* Judul halaman */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={kembali}
          aria-label="Kembali"
          className="mt-1 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kelompok {data.nama}, sesi {data.sesi.toLowerCase()}
          </h1>
          <p className="text-sm text-gray-500">Guru pengajar: {data.guru}</p>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div style={CARD_STYLE} className="overflow-hidden">
        <div className="px-5 py-3 text-white" style={{ background: HEADER_GRAD }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">Ringkasan kelompok</span>
            <span className="ml-auto text-xs opacity-90">Mapel diampu</span>
            {MAPEL_QURAN.map((mapel) => (
              <span
                key={mapel.kode}
                className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-orange-700"
              >
                {mapel.kode} {mapel.nama}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          {[
            { label: 'Terisi', nilai: `${siswa.length} / ${data.kapasitas}` },
            { label: 'Sisa slot', nilai: String(sisaSlot) },
            { label: 'Kelas', nilai: data.kelas },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-orange-50 px-4 py-3">
              <div className="text-xs font-semibold text-orange-800">{item.label}</div>
              <div className="text-xl font-bold text-gray-900">{item.nilai}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kartu daftar anggota */}
      <div style={CARD_STYLE} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama siswa"
            className="w-64 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <span className="text-xs text-gray-500">
            Siswa ditambahkan lewat tombol Tambah siswa di halaman Pembelajaran Al-Quran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-orange-50 text-orange-900">
                <th className="px-5 py-3 font-semibold">No</th>
                <th className="px-5 py-3 font-semibold">Nama siswa</th>
                <th className="px-5 py-3 font-semibold">Rombel</th>
                <th className="px-5 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswaTampil.length === 0 ? (
                <tr className="border-t border-orange-100">
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                    {siswa.length === 0
                      ? 'Belum ada siswa di kelompok ini.'
                      : 'Tidak ada siswa yang cocok dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                siswaTampil.map((s, i) => (
                  <tr key={s.id} className="border-t border-orange-100">
                    <td className="px-5 py-3 text-gray-600">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{s.nama}</td>
                    <td className="px-5 py-3 text-gray-600">{s.rombel}</td>
                    <td className="px-5 py-3">
                      {s.sudahAdaNilai ? (
                        <span className="text-xs text-gray-400">Sudah ada nilai</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAkanDikeluarkan(s)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Keluarkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Konfirmasi keluarkan siswa (ganti dengan ConfirmModal bawaan proyek jika ingin sama persis) */}
      {akanDikeluarkan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi keluarkan siswa"
        >
          <div style={CARD_STYLE} className="w-full max-w-sm space-y-4 p-5">
            <h2 className="text-base font-bold text-gray-900">Keluarkan siswa?</h2>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{akanDikeluarkan.nama}</span> akan dikeluarkan dari
              Kelompok {data.nama}. Siswa bisa ditempatkan lagi ke kelompok lain setelahnya.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAkanDikeluarkan(null)}
                className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={konfirmasiKeluarkan}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Keluarkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}