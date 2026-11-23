"use client";

import { useState, useMemo } from "react";
import { Plus, Users, Edit2, X, Check, Search, UserCheck, UserPlus } from "lucide-react";

// --- MOCK DATA: Guru & Kelompoknya ---
const MOCK_GURU = [
  { user_id: 1, nama_guru: "Ustadz Ahmad", kelompok: [
    { id_kelompok: 101, nama: "A", fase: "A", jumlah_siswa: 15 },
    { id_kelompok: 102, nama: "B", fase: "B", jumlah_siswa: 12 },
  ]},
  { user_id: 2, nama_guru: "Ustadz Budi", kelompok: [
    { id_kelompok: 103, nama: "A", fase: "A", jumlah_siswa: 10 },
  ]},
  { user_id: 3, nama_guru: "Ustadz Charlie", kelompok: [
    { id_kelompok: 104, nama: "A", fase: "A", jumlah_siswa: 8 },
    { id_kelompok: 105, nama: "B", fase: "B", jumlah_siswa: 9 },
    { id_kelompok: 106, nama: "C", fase: "C", jumlah_siswa: 11 },
  ]},
];

// --- MOCK DATA: Siswa DIPISAH PER FASE (perbaiki bug!) ---
// is_assigned = true artinya siswa ini SUDAH masuk kelompok yang sedang dibuka
const MOCK_SISWA_BY_FASE: Record<string, {id:number;nis:string;nama:string;kelas:string;is_assigned:boolean}[]> = {
  A: [
    { id:1, nis:"1001", nama:"Ahmad Fauzi",   kelas:"1A", is_assigned:true },
    { id:2, nis:"1005", nama:"Eko Prasetyo",  kelas:"1A", is_assigned:false },
    { id:3, nis:"1002", nama:"Siti Aminah",   kelas:"1B", is_assigned:true },
    { id:4, nis:"1006", nama:"Rina Marlina",  kelas:"1B", is_assigned:false },
    { id:5, nis:"1003", nama:"Budi Santoso",  kelas:"2A", is_assigned:false },
    { id:6, nis:"1004", nama:"Dewi Lestari",  kelas:"2B", is_assigned:false },
  ],
  B: [
    { id:7, nis:"2001", nama:"Andi Wijaya",   kelas:"3A", is_assigned:true },
    { id:8, nis:"2002", nama:"Putri Ayu",     kelas:"3B", is_assigned:false },
    { id:9, nis:"2003", nama:"Rizky Ramadhan",kelas:"4A", is_assigned:true },
    { id:10,nis:"2004", nama:"Nadia Safitri", kelas:"4B", is_assigned:false },
  ],
  C: [
    { id:11,nis:"3001", nama:"Hendra Gunawan",kelas:"5A", is_assigned:true },
    { id:12,nis:"3002", nama:"Maya Sari",     kelas:"5B", is_assigned:false },
    { id:13,nis:"3003", nama:"Teguh Prasetyo",kelas:"6A", is_assigned:true },
    { id:14,nis:"3004", nama:"Intan Permata", kelas:"6B", is_assigned:false },
  ],
};

// Penjelasan fase utk user awam
const FASE_LABEL: Record<string,string> = {
  A: "Kelas 1 & 2",
  B: "Kelas 3 & 4",
  C: "Kelas 5 & 6",
};

export default function PenempatanAlquranClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{guru:string; fase:string; namaKelompok:string} | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  // BUKA MODAL: inisialisasi centang dari siswa fase tsb yang sudah assigned
  const handleOpenModal = (guru:string, fase:string, namaKelompok:string) => {
    const sudah = (MOCK_SISWA_BY_FASE[fase] || []).filter(s => s.is_assigned).map(s => s.id);
    setSelectedSiswa(sudah);
    setSearch("");
    setModalData({ guru, fase, namaKelompok });
    setIsModalOpen(true);
  };

  const toggleSiswa = (id:number) => {
    setSelectedSiswa(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // SISWA SESUAI FASE + FILTER CARIAN
  const siswaAktif = useMemo(() => {
    if (!modalData) return [];
    const list = MOCK_SISWA_BY_FASE[modalData.fase] || [];
    const q = search.toLowerCase().trim();
    return q ? list.filter(s => s.nama.toLowerCase().includes(q) || s.nis.includes(q)) : list;
  }, [modalData, search]);

  // GROUP PER KELAS (inti solusi UX)
  const siswaPerKelas = useMemo(() => {
    const map: Record<string, typeof siswaAktif> = {};
    siswaAktif.forEach(s => { (map[s.kelas] ||= []).push(s); });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [siswaAktif]);

  const toggleKelas = (kelas:string) => {
    const ids = siswaPerKelas.find(([k]) => k === kelas)?.[1].map(s => s.id) || [];
    const semuaTerpilih = ids.every(id => selectedSiswa.includes(id));
    setSelectedSiswa(prev => semuaTerpilih
      ? prev.filter(id => !ids.includes(id))
      : [...new Set([...prev, ...ids])]);
  };

  return (
    <div>
      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tahun Ajaran</label>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none min-w-[200px]">
            <option>2024/2025 (Aktif)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Semester</label>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none min-w-[150px]">
            <option>Ganjil (Aktif)</option>
          </select>
        </div>
      </div>

      {/* TABEL GURU */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Guru Pengampu</th>
                <th className="px-6 py-4">Kelompok yang Diampu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_GURU.map((guru, i) => (
                <tr key={guru.user_id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4 text-center text-gray-500">{i+1}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{guru.nama_guru}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {["A","B","C"].map((huruf) => {
                        const kel = guru.kelompok.find(k => k.nama === huruf);
                        if (!kel) return null;
                        return (
                          <button key={huruf}
                            onClick={() => handleOpenModal(guru.nama_guru, kel.fase, kel.nama)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors text-xs font-semibold">
                            <Users size={14} /> Kelompok {kel.nama} · {kel.jumlah_siswa} siswa
                            <Edit2 size={12} className="opacity-60" />
                          </button>
                        );
                      })}
                      {guru.kelompok.length < 3 && (
                        <button onClick={() => {
                          const fase = ["A","B","C"].find(f => !guru.kelompok.some(k => k.fase === f)) || "A";
                          handleOpenModal(guru.nama_guru, fase, fase);
                        }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 border border-dashed border-gray-300 hover:bg-gray-200 transition-colors text-xs font-semibold">
                          <Plus size={14} /> Tambah Kelompok
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL — VERSI BARU YANG JELAS */}
      {isModalOpen && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* HEADER — menjelaskan konteks */}
            <div className="bg-orange-600 px-6 py-4 flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold text-lg">Kelompok {modalData.namaKelompok} — {modalData.guru}</h3>
                <p className="text-orange-100 text-xs mt-1">
                  Fase {modalData.fase} ({FASE_LABEL[modalData.fase]}). Centang siswa yang akan belajar Al-Qur'an di kelompok ini.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 -mt-1">
                <X size={20} />
              </button>
            </div>

            {/* LEGENDA STATUS */}
            <div className="px-6 py-2 bg-orange-50/50 border-b border-gray-100 flex gap-4 text-[11px] text-gray-600">
              <span className="inline-flex items-center gap-1"><UserCheck size={12} className="text-green-600" /> Sudah di kelompok ini</span>
              <span className="inline-flex items-center gap-1"><UserPlus size={12} className="text-gray-400" /> Belum dipilih</span>
            </div>

            {/* BODY */}
            <div className="p-6 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama atau NIS..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>

              {siswaPerKelas.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">Tidak ada siswa yang cocok.</p>
              )}

              {/* PER KELAS */}
              {siswaPerKelas.map(([kelas, list]) => {
                const terpilih = list.filter(s => selectedSiswa.includes(s.id)).length;
                return (
                  <div key={kelas} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-gray-700">Kelas {kelas} <span className="text-gray-400 font-normal">({terpilih}/{list.length} dipilih)</span></h4>
                      <button onClick={() => toggleKelas(kelas)} className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                        {terpilih === list.length ? "Batal Pilih Kelas" : "Pilih Semua Kelas Ini"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {list.map(siswa => {
                        const on = selectedSiswa.includes(siswa.id);
                        return (
                          <label key={siswa.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              on ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100 hover:bg-gray-50"}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleSiswa(siswa.id)}
                              className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{siswa.nis}</span>
                              <span className="text-sm font-medium text-gray-800">{siswa.nama}</span>
                            </div>
                            {siswa.is_assigned
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><UserCheck size={11}/> sudah</span>
                              : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><UserPlus size={11}/> baru</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">Total terpilih: <b className="text-orange-600">{selectedSiswa.length}</b> siswa</span>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
                <button onClick={() => { alert(`Simpan ${selectedSiswa.length} siswa ke Kelompok ${modalData.namaKelompok} (Fase ${modalData.fase})`); setIsModalOpen(false); }}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-2">
                  <Check size={16} /> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}