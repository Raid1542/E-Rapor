'use client';

/**
 * Nama File: pembelajaran_alquran_client.tsx
 * Fungsi: Komponen client halaman Pembelajaran Al-Quran (admin).
 *         Menampilkan kartu per guru Al-Quran beserta 3 kelompoknya
 *         (A pagi, B siang, C sore), lengkap dengan modal Tambah guru,
 *         Ganti guru, dan Tambah siswa.
 * Pembuat: Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 23 November 2026
 */

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/* ========== Tema: ganti dengan konstanta yang sama di data_mata_pelajaran_client.tsx ========== */
const PAGE_BG = '#ffffff';
const CARD_STYLE: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #f3dcc4',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(194, 65, 12, 0.08)',
};
const HEADER_GRAD = 'linear-gradient(90deg, #c2410c 0%, #ea580c 55%, #f59e0b 100%)';

/* ========== Tipe data ========== */
type NamaKelompok = 'A' | 'B' | 'C';

type Kelompok = {
  id: number;
  nama: NamaKelompok;
  sesi: string;
  kelas: string;
  kapasitas: number;
  siswaIds: number[];
};

type GuruQuran = {
  id: number;
  nama: string;
  kelompok: Kelompok[];
};

type GuruOpsi = { id: number; nama: string };
type Siswa = { id: number; nis: string; nama: string; rombel: string };

type ModalState =
  | { tipe: 'tambahGuru' }
  | { tipe: 'gantiGuru'; guruId: number }
  | { tipe: 'tambahSiswa'; guruId: number; kelompokId: number }
  | null;

type Notif = { tipe: 'success' | 'error'; pesan: string } | null;

/* ========== Konstanta aturan ========== */
const KAPASITAS_MAKS = 15;

const TEMPLATE_KELOMPOK: { nama: NamaKelompok; sesi: string; kelas: string }[] = [
  { nama: 'A', sesi: 'Pagi', kelas: '1 dan 2' },
  { nama: 'B', sesi: 'Siang', kelas: '3 dan 4' },
  { nama: 'C', sesi: 'Sore', kelas: '5 dan 6' },
];

// Fase mengikuti tingkat kelas: kelas 1-2 = Fase A, 3-4 = Fase B, 5-6 = Fase C
const fasePerKelas = (kelas: string): string => {
  const tingkat = Number((kelas.match(/\d+/) ?? ['0'])[0]);
  if (tingkat >= 1 && tingkat <= 2) return 'A';
  if (tingkat >= 3 && tingkat <= 4) return 'B';
  if (tingkat >= 5 && tingkat <= 6) return 'C';
  return '-';
};

// Mapel Al-Quran nanti diambil dari Data Mata Pelajaran dengan jenis = 'Al-Quran'
const MAPEL_QURAN = [
  { kode: 'TLW', nama: 'Tilawah' },
  { kode: 'THF', nama: 'Tahfidz' },
];

/* ========== Data contoh (sementara, ganti dengan data dari API) ========== */
// Guru yang punya peran Al-Quran (dari Data Guru)
const DAFTAR_GURU_QURAN: GuruOpsi[] = [
  { id: 1, nama: 'Guru Al-Quran 1' },
  { id: 2, nama: 'Guru Al-Quran 2' },
  { id: 3, nama: 'Guru Al-Quran 3' },
  { id: 4, nama: 'Guru Al-Quran 4' },
];

// Siswa yang bisa ditempatkan (dari Data Siswa)
const DAFTAR_SISWA: Siswa[] = [
  { id: 1, nis: '1001', nama: 'Aisyah Rahma', rombel: '1 B' },
  { id: 2, nis: '1002', nama: 'Fauzan Pratama', rombel: '1 C' },
  { id: 3, nis: '1003', nama: 'Naura Salsabila', rombel: '2 A' },
  { id: 4, nis: '1004', nama: 'Khalid Ramadhan', rombel: '2 D' },
  { id: 5, nis: '1005', nama: 'Zahra Aulia', rombel: '2 D' },
  { id: 6, nis: '1006', nama: 'Rafi Alvaro', rombel: '1 B' },
  { id: 7, nis: '1007', nama: 'Syifa Nabila', rombel: '3 A' },
  { id: 8, nis: '1008', nama: 'Hanif Maulana', rombel: '3 A' },
  { id: 9, nis: '1009', nama: 'Alya Putri', rombel: '4 B' },
  { id: 10, nis: '1010', nama: 'Dzaky Firmansyah', rombel: '5 A' },
];

const DATA_AWAL: GuruQuran[] = [
  {
    id: 1,
    nama: 'Guru Al-Quran 1',
    kelompok: [
      { id: 1, nama: 'A', sesi: 'Pagi', kelas: '1 dan 2', kapasitas: 15, siswaIds: [1, 2, 3] },
      { id: 2, nama: 'B', sesi: 'Siang', kelas: '3 dan 4', kapasitas: 15, siswaIds: [7] },
      { id: 3, nama: 'C', sesi: 'Sore', kelas: '5 dan 6', kapasitas: 15, siswaIds: [] },
    ],
  },
];

/* ========== Komponen kecil yang dipakai ulang ========== */
function BtnBatal({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
    >
      Batal
    </button>
  );
}

function BtnSimpan({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: HEADER_GRAD }}
    >
      Simpan
    </button>
  );
}

function ModalShell({
  judul,
  onClose,
  children,
  footer,
}: {
  judul: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={judul}
    >
      <div style={CARD_STYLE} className="w-full max-w-md overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 text-white"
          style={{ background: HEADER_GRAD }}
        >
          <h2 className="text-base font-bold">{judul}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-md bg-white/20 px-2 text-lg leading-none hover:bg-white/30"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-orange-100 bg-gray-50 px-5 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

function PesanError({ pesan }: { pesan: string }) {
  if (!pesan) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{pesan}</p>;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200';
const LABEL_CLASS = 'mb-1 block text-sm font-semibold text-orange-900';

/* ========== Modal: Tambah guru ========== */
function ModalTambahGuru({
  guruTersedia,
  onClose,
  onSimpan,
}: {
  guruTersedia: GuruOpsi[];
  onClose: () => void;
  onSimpan: (guruId: number, kapasitas: number, dipilih: NamaKelompok[]) => void;
}) {
  const [guruId, setGuruId] = useState('');
  const [kapasitas, setKapasitas] = useState(String(KAPASITAS_MAKS));
  const [dipilih, setDipilih] = useState<NamaKelompok[]>(['A', 'B', 'C']);
  const [error, setError] = useState('');

  const toggleKelompok = (nama: NamaKelompok) => {
    setDipilih((prev) => (prev.includes(nama) ? prev.filter((n) => n !== nama) : [...prev, nama]));
  };

  const handleSimpan = () => {
    const kap = Number(kapasitas);
    if (!guruId) return setError('Pilih guru pengajar terlebih dahulu.');
    if (!Number.isInteger(kap) || kap < 1 || kap > KAPASITAS_MAKS)
      return setError(`Kapasitas harus berupa angka 1 sampai ${KAPASITAS_MAKS}.`);
    if (dipilih.length === 0) return setError('Pilih minimal satu kelompok.');
    onSimpan(Number(guruId), kap, dipilih);
  };

  return (
    <ModalShell
      judul="Tambah guru Al-Quran"
      onClose={onClose}
      footer={
        <>
          <BtnBatal onClick={onClose} />
          <BtnSimpan onClick={handleSimpan} />
        </>
      }
    >
      <p className="text-xs text-gray-500">Kelompok dibuat otomatis untuk guru yang dipilih.</p>

      <div>
        <label className={LABEL_CLASS}>
          Guru pengajar <span className="text-red-600">*</span>
        </label>
        {guruTersedia.length === 0 ? (
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
            Semua guru Al-Quran sudah ditugaskan. Tambahkan peran Guru Al-Quran di Data Guru
            untuk menambah pilihan.
          </p>
        ) : (
          <select value={guruId} onChange={(e) => setGuruId(e.target.value)} className={INPUT_CLASS}>
            <option value="">-- Pilih Guru --</option>
            {guruTersedia.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS}>Kapasitas per kelompok</label>
        <input
          type="number"
          min={1}
          max={KAPASITAS_MAKS}
          value={kapasitas}
          onChange={(e) => setKapasitas(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <span className={LABEL_CLASS}>Kelompok yang dibuat</span>
        <div className="overflow-hidden rounded-lg border border-orange-100">
          {TEMPLATE_KELOMPOK.map((t, i) => (
            <label
              key={t.nama}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                i > 0 ? 'border-t border-orange-100' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={dipilih.includes(t.nama)}
                onChange={() => toggleKelompok(t.nama)}
                className="h-4 w-4 accent-orange-600"
              />
              <span className="flex-1 font-medium text-gray-800">Kelompok {t.nama}</span>
              <span className="text-xs text-gray-500">
                {t.sesi}, kelas {t.kelas}
              </span>
            </label>
          ))}
        </div>
      </div>

      <PesanError pesan={error} />
    </ModalShell>
  );
}

/* ========== Modal: Ganti guru ========== */
function ModalGantiGuru({
  guruSaatIni,
  guruTersedia,
  onClose,
  onSimpan,
}: {
  guruSaatIni: GuruQuran;
  guruTersedia: GuruOpsi[];
  onClose: () => void;
  onSimpan: (penggantiId: number) => void;
}) {
  const [penggantiId, setPenggantiId] = useState('');
  const [error, setError] = useState('');

  const handleSimpan = () => {
    if (!penggantiId) return setError('Pilih guru pengganti terlebih dahulu.');
    onSimpan(Number(penggantiId));
  };

  return (
    <ModalShell
      judul="Ganti guru"
      onClose={onClose}
      footer={
        <>
          <BtnBatal onClick={onClose} />
          <BtnSimpan onClick={handleSimpan} disabled={guruTersedia.length === 0} />
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Ketiga kelompok milik <span className="font-semibold">{guruSaatIni.nama}</span> beserta
        siswanya dipindahkan ke guru pengganti.
      </p>

      <div>
        <label className={LABEL_CLASS}>
          Guru pengganti <span className="text-red-600">*</span>
        </label>
        {guruTersedia.length === 0 ? (
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
            Tidak ada guru Al-Quran lain yang tersedia.
          </p>
        ) : (
          <select
            value={penggantiId}
            onChange={(e) => setPenggantiId(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">-- Pilih Guru --</option>
            {guruTersedia.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      <PesanError pesan={error} />
    </ModalShell>
  );
}

/* ========== Modal: Tambah siswa ========== */
// Hanya menampilkan siswa dari kelas yang sesuai kelompok (A: kelas 1 dan 2, B: 3 dan 4, C: 5 dan 6),
// dikelompokkan per rombel. Anggota yang sudah ada di kelompok ini ditandai "sudah" dan tidak bisa
// dicentang ulang. Mengeluarkan siswa dilakukan di halaman Detail kelompok.
function ModalTambahSiswa({
  guru,
  kelompok,
  penempatan,
  onClose,
  onSimpan,
}: {
  guru: GuruQuran;
  kelompok: Kelompok;
  penempatan: Map<number, string>;
  onClose: () => void;
  onSimpan: (siswaIds: number[]) => void;
}) {
  const [cari, setCari] = useState('');
  const [terpilih, setTerpilih] = useState<number[]>([]);
  const [error, setError] = useState('');

  // Contoh: "1 dan 2" menjadi [1, 2]
  const kelasBoleh = useMemo(
    () => (kelompok.kelas.match(/\d+/g) ?? []).map(Number),
    [kelompok.kelas]
  );

  // Siswa yang sesuai kelas kelompok dan cocok dengan pencarian, dikelompokkan per rombel
  const grupRombel = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const peta = new Map<string, Siswa[]>();
    DAFTAR_SISWA.filter((s) => kelasBoleh.includes(parseInt(s.rombel, 10)))
      .filter((s) => s.nama.toLowerCase().includes(kata) || s.nis.includes(kata))
      .forEach((s) => peta.set(s.rombel, [...(peta.get(s.rombel) ?? []), s]));
    return Array.from(peta.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [kelasBoleh, cari]);

  const sisaSlot = kelompok.kapasitas - kelompok.siswaIds.length - terpilih.length;
  const totalSiswa = kelompok.siswaIds.length + terpilih.length;

  const toggleSiswa = (id: number) => {
    setError('');
    if (terpilih.includes(id)) {
      setTerpilih((prev) => prev.filter((x) => x !== id));
      return;
    }
    if (sisaSlot <= 0) {
      setError(`Kapasitas kelompok penuh (maksimal ${kelompok.kapasitas} siswa).`);
      return;
    }
    setTerpilih((prev) => [...prev, id]);
  };

  // Pilih atau batalkan semua siswa baru dalam satu rombel (sesuai sisa slot)
  const pilihSemuaRombel = (daftar: Siswa[]) => {
    setError('');
    const kandidat = daftar.filter((s) => !penempatan.has(s.id));
    const sudahTerpilihSemua = kandidat.length > 0 && kandidat.every((s) => terpilih.includes(s.id));
    if (sudahTerpilihSemua) {
      setTerpilih((prev) => prev.filter((id) => !kandidat.some((s) => s.id === id)));
      return;
    }
    const belumDipilih = kandidat.filter((s) => !terpilih.includes(s.id));
    const tambah = belumDipilih.slice(0, Math.max(sisaSlot, 0)).map((s) => s.id);
    if (tambah.length < belumDipilih.length) {
      setError('Sebagian siswa tidak dipilih karena kapasitas kelompok penuh.');
    }
    setTerpilih((prev) => [...prev, ...tambah]);
  };

  const handleSimpan = () => {
    if (terpilih.length === 0) return setError('Pilih minimal satu siswa baru.');
    onSimpan(terpilih);
  };

  return (
    <ModalShell
      judul={`Kelompok ${kelompok.nama} — ${guru.nama}`}
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto self-center text-xs text-gray-500">
            Total: <span className="font-bold text-orange-600">{totalSiswa}</span> siswa
            {terpilih.length > 0 && `, ${terpilih.length} baru`}
          </span>
          <BtnBatal onClick={onClose} />
          <BtnSimpan onClick={handleSimpan} />
        </>
      }
    >
      <p className="-mt-2 text-xs text-gray-500">
        Fase {fasePerKelas(kelompok.kelas)} (Kelas {kelompok.kelas.replace(' dan ', ' & ')}), sesi {kelompok.sesi.toLowerCase()}. Centang
        siswa yang akan belajar Al-Quran di kelompok ini.
      </p>

      <input
        type="text"
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari nama atau NIS"
        className={INPUT_CLASS}
      />

      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {grupRombel.length === 0 ? (
          <p className="rounded-lg border border-orange-100 p-4 text-center text-sm text-gray-400">
            Tidak ada siswa kelas {kelompok.kelas} yang cocok
          </p>
        ) : (
          grupRombel.map(([rombel, daftar]) => {
            const jumlahDipilih = daftar.filter(
              (s) => kelompok.siswaIds.includes(s.id) || terpilih.includes(s.id)
            ).length;
            const adaKandidat = daftar.some((s) => !penempatan.has(s.id));

            return (
              <div key={rombel}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">
                    Kelas {rombel}{' '}
                    <span className="font-normal text-gray-400">
                      ({jumlahDipilih}/{daftar.length} dipilih)
                    </span>
                  </span>
                  {adaKandidat && (
                    <button
                      type="button"
                      onClick={() => pilihSemuaRombel(daftar)}
                      className="text-xs font-semibold text-orange-600 hover:underline"
                    >
                      Pilih semua kelas ini
                    </button>
                  )}
                </div>

                <div className="overflow-hidden rounded-lg border border-orange-100">
                  {daftar.map((s, i) => {
                    const diKelompokIni = kelompok.siswaIds.includes(s.id);
                    const diKelompokLain = penempatan.has(s.id) && !diKelompokIni;
                    const tidakBisa = diKelompokIni || diKelompokLain;

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-3 py-2 text-sm ${
                          i > 0 ? 'border-t border-orange-100' : ''
                        } ${diKelompokIni ? 'bg-orange-50' : ''} ${
                          tidakBisa ? 'cursor-not-allowed' : 'cursor-pointer'
                        } ${diKelompokLain ? 'text-gray-400' : 'text-gray-800'}`}
                      >
                        <input
                          type="checkbox"
                          disabled={tidakBisa}
                          checked={diKelompokIni || terpilih.includes(s.id)}
                          onChange={() => toggleSiswa(s.id)}
                          className="h-4 w-4 accent-orange-600"
                        />
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500">
                          {s.nis}
                        </span>
                        <span className="flex-1">{s.nama}</span>
                        {diKelompokIni ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            sudah
                          </span>
                        ) : diKelompokLain ? (
                          <span className="text-xs">{penempatan.get(s.id)}</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                            baru
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-gray-500">
        Sisa slot {Math.max(sisaSlot, 0)} dari {kelompok.kapasitas}
      </p>

      <PesanError pesan={error} />
    </ModalShell>
  );
}

/* ========== Halaman utama ========== */
export default function PembelajaranAlquranClient() {
  const router = useRouter();
  const idBerikut = useRef(100); // id sementara untuk kelompok baru, nanti dari database

  const [daftarGuru, setDaftarGuru] = useState<GuruQuran[]>(DATA_AWAL);
  const [modal, setModal] = useState<ModalState>(null);
  const [notif, setNotif] = useState<Notif>(null);

  const tampilkanNotif = (tipe: 'success' | 'error', pesan: string) => {
    setNotif({ tipe, pesan });
    setTimeout(() => setNotif(null), 3000);
  };

  // Guru Al-Quran yang belum punya kelompok pada tahun ajaran ini
  const guruTersedia = DAFTAR_GURU_QURAN.filter((g) => !daftarGuru.some((d) => d.id === g.id));

  // Peta siswa -> kelompok tempat siswa berada (satu siswa satu kelompok per tahun ajaran)
  const penempatan = useMemo(() => {
    const peta = new Map<number, string>();
    daftarGuru.forEach((g) =>
      g.kelompok.forEach((k) =>
        k.siswaIds.forEach((id) => peta.set(id, `Sudah di Kelompok ${k.nama} (${g.nama})`))
      )
    );
    return peta;
  }, [daftarGuru]);

  /* ---- Aksi (TODO: ganti state lokal dengan panggilan API) ---- */
  const simpanTambahGuru = (guruId: number, kapasitas: number, dipilih: NamaKelompok[]) => {
    const guru = DAFTAR_GURU_QURAN.find((g) => g.id === guruId);
    if (!guru) return;
    const kelompokBaru: Kelompok[] = TEMPLATE_KELOMPOK.filter((t) => dipilih.includes(t.nama)).map(
      (t) => ({ id: idBerikut.current++, ...t, kapasitas, siswaIds: [] })
    );
    setDaftarGuru((prev) => [...prev, { id: guru.id, nama: guru.nama, kelompok: kelompokBaru }]);
    setModal(null);
    tampilkanNotif('success', `${guru.nama} berhasil ditambahkan.`);
  };

  const simpanGantiGuru = (guruLamaId: number, penggantiId: number) => {
    const pengganti = DAFTAR_GURU_QURAN.find((g) => g.id === penggantiId);
    if (!pengganti) return;
    setDaftarGuru((prev) =>
      prev.map((g) => (g.id === guruLamaId ? { ...g, id: pengganti.id, nama: pengganti.nama } : g))
    );
    setModal(null);
    tampilkanNotif('success', `Guru berhasil diganti dengan ${pengganti.nama}.`);
  };

  const simpanTambahSiswa = (guruId: number, kelompokId: number, siswaIds: number[]) => {
    setDaftarGuru((prev) =>
      prev.map((g) =>
        g.id !== guruId
          ? g
          : {
              ...g,
              kelompok: g.kelompok.map((k) =>
                k.id === kelompokId ? { ...k, siswaIds: [...k.siswaIds, ...siswaIds] } : k
              ),
            }
      )
    );
    setModal(null);
    tampilkanNotif('success', `${siswaIds.length} siswa berhasil ditambahkan ke kelompok.`);
  };

  const handleDetail = (kelompok: Kelompok) => {
    // Halaman detail dibuat di langkah berikutnya: /admin/pembelajaran_alquran/[id]
    router.push(`/admin/pembelajaran_alquran/${kelompok.id}`);
  };

  /* ---- Data modal yang sedang terbuka ---- */
  const guruModal =
    modal && modal.tipe !== 'tambahGuru' ? daftarGuru.find((g) => g.id === modal.guruId) : undefined;
  const kelompokModal =
    modal?.tipe === 'tambahSiswa'
      ? guruModal?.kelompok.find((k) => k.id === modal.kelompokId)
      : undefined;

  return (
    <div style={{ background: PAGE_BG }} className="min-h-screen space-y-5 p-6">
      {/* Notifikasi singkat (ganti dengan NotifModal bawaan proyek jika ingin sama persis) */}
      {notif && (
        <div
          role="status"
          className={`fixed right-6 top-6 z-[60] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            notif.tipe === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {notif.pesan}
        </div>
      )}

      {/* Judul halaman */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pembelajaran Al-Quran</h1>
        <p className="text-sm text-gray-500">Kelola penugasan guru Al-Quran dan kelompok belajar</p>
      </div>

      {/* Kartu 1: filter */}
      <div style={CARD_STYLE} className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-semibold text-orange-900">Tahun Ajaran</span>
        <select disabled className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm">
          <option>2028/2029 (Aktif)</option>
        </select>
        <span className="text-sm font-semibold text-orange-900">Semester</span>
        <select disabled className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm">
          <option>Ganjil (Aktif)</option>
        </select>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Aktif
        </span>
        <button
          type="button"
          onClick={() => setModal({ tipe: 'tambahGuru' })}
          className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm"
          style={{ background: HEADER_GRAD }}
        >
          + Tambah guru
        </button>
      </div>

      {/* Kartu per guru */}
      {daftarGuru.length === 0 ? (
        <div style={CARD_STYLE} className="p-10 text-center text-sm text-gray-500">
          Belum ada guru Al-Quran yang ditugaskan. Klik <span className="font-semibold">Tambah guru</span>{' '}
          untuk memulai.
        </div>
      ) : (
        daftarGuru.map((guru) => {
          const totalSiswa = guru.kelompok.reduce((total, k) => total + k.siswaIds.length, 0);

          return (
            <div key={guru.id} style={CARD_STYLE} className="overflow-hidden">
              <div
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-white"
                style={{ background: HEADER_GRAD }}
              >
                <div>
                  <div className="text-base font-bold">{guru.nama}</div>
                  <div className="text-xs opacity-90">
                    {guru.kelompok.length} kelompok, {totalSiswa} siswa
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs opacity-90">Mapel diampu</span>
                  {MAPEL_QURAN.map((mapel) => (
                    <span
                      key={mapel.kode}
                      className="rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-orange-700"
                    >
                      {mapel.kode} {mapel.nama}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModal({ tipe: 'gantiGuru', guruId: guru.id })}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-orange-700"
                  >
                    Ganti guru
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-orange-50 text-orange-900">
                      <th className="px-5 py-3 font-semibold">Kelompok</th>
                      <th className="px-5 py-3 font-semibold">Sesi</th>
                      <th className="px-5 py-3 font-semibold">Kelas</th>
                      <th className="px-5 py-3 font-semibold">Fase</th>
                      <th className="px-5 py-3 font-semibold">Siswa</th>
                      <th className="px-5 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guru.kelompok.map((kelompok) => {
                      const penuh = kelompok.siswaIds.length >= kelompok.kapasitas;
                      return (
                        <tr key={kelompok.id} className="border-t border-orange-100">
                          <td className="px-5 py-3 font-medium text-gray-800">
                            Kelompok {kelompok.nama}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{kelompok.sesi}</td>
                          <td className="px-5 py-3 text-gray-600">{kelompok.kelas}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-xs font-bold text-orange-700">
                              {fasePerKelas(kelompok.kelas)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {kelompok.siswaIds.length} / {kelompok.kapasitas}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={penuh}
                                title={penuh ? 'Kelompok sudah penuh' : undefined}
                                onClick={() =>
                                  setModal({
                                    tipe: 'tambahSiswa',
                                    guruId: guru.id,
                                    kelompokId: kelompok.id,
                                  })
                                }
                                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Tambah siswa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDetail(kelompok)}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Modal */}
      {modal?.tipe === 'tambahGuru' && (
        <ModalTambahGuru
          guruTersedia={guruTersedia}
          onClose={() => setModal(null)}
          onSimpan={simpanTambahGuru}
        />
      )}

      {modal?.tipe === 'gantiGuru' && guruModal && (
        <ModalGantiGuru
          guruSaatIni={guruModal}
          guruTersedia={guruTersedia}
          onClose={() => setModal(null)}
          onSimpan={(penggantiId) => simpanGantiGuru(guruModal.id, penggantiId)}
        />
      )}

      {modal?.tipe === 'tambahSiswa' && guruModal && kelompokModal && (
        <ModalTambahSiswa
          guru={guruModal}
          kelompok={kelompokModal}
          penempatan={penempatan}
          onClose={() => setModal(null)}
          onSimpan={(siswaIds) => simpanTambahSiswa(guruModal.id, kelompokModal.id, siswaIds)}
        />
      )}
    </div>
  );
}