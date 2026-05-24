/**
 * Nama File: data_pembelajaran_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data pembelajaran oleh admin.
 *         - Tabel dikelompokkan per guru: 1 baris = 1 guru + kelas + daftar mapel
 *         - Form tambah mendukung banyak mapel sekaligus (hingga 5)
 *         - Fitur "Tambah Sub Pembelajaran" untuk menambah mapel ke guru yang sudah ada
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Konsisten dengan tema oranye elegan DataGuruPage
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
  Pencil, Plus, Search, X, Trash2, Filter,
  CheckCircle2, AlertCircle, WifiOff, ShieldAlert, BookOpen,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes dp-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dp-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dp-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .dp-fadeIn  { animation: dp-fadeIn  0.2s ease; }
    .dp-scaleIn { animation: dp-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .dp-pulse   { animation: dp-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
  error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dp-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dp-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dp-pulse`}>{s.icon}</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
      </div>
    </div>
  );
};

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────

const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dp-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dp-scaleIn">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dp-pulse">
        <Trash2 size={36} className="text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>
          Batal
        </button>
        <button onClick={onConfirm}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm bg-red-500 hover:bg-red-600 transition-colors">
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
  base:  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── SECONDARY BUTTON ─────────────────────────────────────────────────────────

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
  >{children}</button>
);

// ─── INTERFACES ───────────────────────────────────────────────────────────────

/** Satu record dari API — 1 guru + 1 mapel + 1 kelas */
interface Pembelajaran {
  id: number;
  nama_mapel: string;
  nama_kelas: string;
  nama_guru: string;
  user_id: number;
  id_mapel: number;
  id_kelas: number;
}

/**
 * Baris tampilan tabel yang sudah di-group:
 * 1 guru + 1 kelas → bisa punya banyak mapel
 */
interface GroupedRow {
  /** key unik: `${user_id}_${id_kelas}` */
  key: string;
  user_id: number;
  id_kelas: number;
  nama_guru: string;
  nama_kelas: string;
  mapels: Array<{ id: number; nama: string; id_mapel: number; }>;
}

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

interface DropdownItem {
  id: number;
  nama: string;
}

/** Form state untuk tambah data baru (1 guru, 1 kelas, banyak mapel) */
interface FormTambahData {
  user_id: string;
  id_kelas: string;
  /** Slot mapel, minimal 1 selalu ada */
  mapels: string[];
  confirmData: boolean;
}

/** Form state untuk tambah sub pembelajaran (tambah mapel ke guru+kelas yang sudah ada) */
interface FormSubData {
  id_mapel: string;
  confirmData: boolean;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataPembelajaranPage() {

  // ── state utama ────────────────────────────────────────────────────────────
  const [dataList,                 setDataList]                 = useState<Pembelajaran[]>([]);
  const [loading,                  setLoading]                  = useState(true);

  // halaman yang ditampilkan
  type PageView = 'list' | 'tambah' | 'sub';
  const [pageView,                 setPageView]                 = useState<PageView>('list');

  const [searchQuery,              setSearchQuery]              = useState('');
  const [itemsPerPage,             setItemsPerPage]             = useState(10);
  const [currentPage,              setCurrentPage]              = useState(1);

  const [tahunAjaranList,          setTahunAjaranList]          = useState<TahunAjaran[]>([]);
  const [selectedTahunAjaranId,    setSelectedTahunAjaranId]    = useState<number | null>(null);
  const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);

  const [guruList,                 setGuruList]                 = useState<DropdownItem[]>([]);
  const [mapelList,                setMapelList]                = useState<DropdownItem[]>([]);
  const [kelasList,                setKelasList]                = useState<DropdownItem[]>([]);
  const [dropdownLoading,          setDropdownLoading]          = useState(false);

  const [showFilter,               setShowFilter]               = useState(false);
  const [filterClosing,            setFilterClosing]            = useState(false);
  const [filterValues,             setFilterValues]             = useState({ kelas: '', mapel: '' });
  const [tempFilterValues,         setTempFilterValues]         = useState({ kelas: '', mapel: '' });

  // form tambah data baru
  const [formTambah, setFormTambah] = useState<FormTambahData>({
    user_id: '', id_kelas: '', mapels: [''], confirmData: false,
  });
  const [errorsTambah, setErrorsTambah] = useState<Record<string, string>>({});

  // form tambah sub pembelajaran
  const [formSub,        setFormSub]        = useState<FormSubData>({ id_mapel: '', confirmData: false });
  const [errorsSub,      setErrorsSub]      = useState<Record<string, string>>({});
  const [subTargetGuru,  setSubTargetGuru]  = useState<{ user_id: number; id_kelas: number; nama_guru: string; nama_kelas: string } | null>(null);

  // confirm modal
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [modal,     setModal]     = useState<ModalConfig | null>(null);
  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

  // ── helpers ────────────────────────────────────────────────────────────────

  const getToken = (): string | null => localStorage.getItem('token');

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTahunAjaran = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res  = await fetch('http://localhost:5000/api/admin/tahun-ajaran', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setTahunAjaranList(data.data.map((ta: any) => ({
          id: ta.id_tahun_ajaran,
          tahun_ajaran: ta.tahun_ajaran,
          semester: (ta.semester || 'ganjil').toLowerCase(),
          is_aktif: ta.status === 'aktif',
        })));
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data tahun ajaran.' });
    }
  }, [showModal]);

  const fetchAllDropdowns = useCallback(async () => {
    setDropdownLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res  = await fetch('http://localhost:5000/api/admin/pembelajaran/dropdown', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuruList(data.data.guru || []);
        setKelasList(data.data.kelas || []);
        setMapelList(data.data.mata_pelajaran || []);
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data dropdown.' });
    } finally {
      setDropdownLoading(false);
    }
  }, [showModal]);

  const fetchData = useCallback(async (taId: number) => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res  = await fetch('http://localhost:5000/api/admin/pembelajaran', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setDataList((data.data || []).map((item: any) => ({
          id:        item.id,
          nama_mapel: item.nama_mapel || 'Mapel Tidak Ditemukan',
          nama_kelas: item.nama_kelas,
          nama_guru:  item.nama_guru  || 'Belum ditetapkan',
          user_id:    item.user_id,
          id_mapel:   item.mata_pelajaran_id,
          id_kelas:   item.kelas_id,
        })));
      }
    } catch {
      showModal({ type: 'error', title: 'Gagal Memuat Data', message: 'Terjadi kesalahan saat memuat data pembelajaran.' });
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => { fetchTahunAjaran(); }, [fetchTahunAjaran]);
  useEffect(() => {
    if (selectedTahunAjaranId) {
      fetchData(selectedTahunAjaranId);
      if (selectedTahunAjaranAktif) fetchAllDropdowns();
    }
  }, [selectedTahunAjaranId, selectedTahunAjaranAktif, fetchData, fetchAllDropdowns]);

  // ── grouping: gabungkan data per guru+kelas ────────────────────────────────

  const buildGrouped = (list: Pembelajaran[]): GroupedRow[] => {
    const map = new Map<string, GroupedRow>();
    list.forEach(item => {
      const key = `${item.user_id}_${item.id_kelas}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          user_id:   item.user_id,
          id_kelas:  item.id_kelas,
          nama_guru:  item.nama_guru,
          nama_kelas: item.nama_kelas,
          mapels: [],
        });
      }
      map.get(key)!.mapels.push({ id: item.id, nama: item.nama_mapel, id_mapel: item.id_mapel });
    });
    return Array.from(map.values());
  };

  // ── filter & pagination ────────────────────────────────────────────────────

  const filteredData = dataList.filter(item => {
    const q  = searchQuery.toLowerCase();
    const ms = !q || item.nama_mapel.toLowerCase().includes(q) || item.nama_kelas.toLowerCase().includes(q) || item.nama_guru.toLowerCase().includes(q);
    const mk = !filterValues.kelas || String(item.id_kelas)  === filterValues.kelas;
    const mm = !filterValues.mapel || String(item.id_mapel)  === filterValues.mapel;
    return ms && mk && mm;
  });

  const groupedRows  = buildGrouped(filteredData);
  const totalPages   = Math.max(1, Math.ceil(groupedRows.length / itemsPerPage));
  const startIndex   = (currentPage - 1) * itemsPerPage;
  const endIndex     = startIndex + itemsPerPage;
  const currentRows  = groupedRows.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages: ReactNode[] = [];
    const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
    const btnActive   = "text-white border-orange-500";
    const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

    pages.push(
      <button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
        className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>
    );
    const range: number[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
    else {
      range.push(1);
      if (currentPage > 3) range.push(-1);
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
      if (currentPage < totalPages - 2) range.push(-2);
      range.push(totalPages);
    }
    range.forEach(p => {
      if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>); }
      else {
        pages.push(
          <button key={p} onClick={() => setCurrentPage(p)}
            className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
            style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
          >{p}</button>
        );
      }
    });
    pages.push(
      <button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
        className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>
    );
    return pages;
  };

  // ── reset helpers ──────────────────────────────────────────────────────────

  const resetTambah = () => {
    setFormTambah({ user_id: '', id_kelas: '', mapels: [''], confirmData: false });
    setErrorsTambah({});
  };

  const resetSub = () => {
    setFormSub({ id_mapel: '', confirmData: false });
    setErrorsSub({});
  };

  // ── SUBMIT: Tambah data baru (1 guru + 1 kelas + N mapel) ─────────────────

  const validateTambah = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formTambah.user_id)  ne.user_id  = 'Pilih guru pengampu';
    if (!formTambah.id_kelas) ne.id_kelas = 'Pilih kelas';
    const hasMapel = formTambah.mapels.some(m => m !== '');
    if (!hasMapel) ne.mapels = 'Pilih minimal 1 mata pelajaran';
    if (!formTambah.confirmData) ne.confirmData = 'Harap konfirmasi data';
    setErrorsTambah(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
      return false;
    }
    return true;
  };

  const handleSubmitTambah = async () => {
    if (!validateTambah()) return;
    const token = getToken();
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }

    // Kirim satu request per mapel yang dipilih (tidak kosong & tidak duplikat)
    const selectedMapels = [...new Set(formTambah.mapels.filter(m => m !== ''))];
    const payloads = selectedMapels.map(id_mapel => ({
      user_id:           Number(formTambah.user_id),
      mata_pelajaran_id: Number(id_mapel),
      kelas_id:          Number(formTambah.id_kelas),
    }));

    try {
      const results = await Promise.allSettled(
        payloads.map(payload =>
          fetch('http://localhost:5000/api/admin/pembelajaran', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          })
        )
      );

      const gagal = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;

      setPageView('list');
      resetTambah();
      if (selectedTahunAjaranId) await fetchData(selectedTahunAjaranId);

      if (gagal === 0) {
        showModal({ type: 'success', title: 'Data Ditambahkan!', message: `${selectedMapels.length} mata pelajaran berhasil ditambahkan.` });
      } else {
        showModal({ type: 'warning', title: 'Sebagian Berhasil', message: `${selectedMapels.length - gagal} mapel berhasil, ${gagal} mapel gagal disimpan.` });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
  };

  // ── SUBMIT: Tambah Sub Pembelajaran (tambah 1 mapel ke guru+kelas yg ada) ─

  const validateSub = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formSub.id_mapel)    ne.id_mapel    = 'Pilih mata pelajaran';
    if (!formSub.confirmData) ne.confirmData = 'Harap konfirmasi data';
    setErrorsSub(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
      return false;
    }
    return true;
  };

  const handleSubmitSub = async () => {
    if (!validateSub() || !subTargetGuru) return;
    const token = getToken();
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }

    try {
      const res = await fetch('http://localhost:5000/api/admin/pembelajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id:           subTargetGuru.user_id,
          mata_pelajaran_id: Number(formSub.id_mapel),
          kelas_id:          subTargetGuru.id_kelas,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }

      setPageView('list');
      resetSub();
      setSubTargetGuru(null);
      if (selectedTahunAjaranId) await fetchData(selectedTahunAjaranId);
      showModal({ type: 'success', title: 'Sub Pembelajaran Ditambahkan!', message: 'Mata pelajaran berhasil ditambahkan ke guru tersebut.' });
    } catch (err) {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
    }
  };

  // ── DELETE: hapus 1 record pembelajaran (1 mapel dari guru) ───────────────

  const handleDelete = (id: number, namaMapel: string, namaGuru: string) => {
    showConfirm(
      `Yakin ingin menghapus mata pelajaran "${namaMapel}" dari guru "${namaGuru}"? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        const token = getToken();
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }
        try {
          const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/${id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.message || `HTTP ${res.status}`); }
          if (selectedTahunAjaranId) await fetchData(selectedTahunAjaranId);
          showModal({ type: 'success', title: 'Berhasil Dihapus!', message: `Mata pelajaran "${namaMapel}" berhasil dihapus dari guru "${namaGuru}".` });
        } catch (err) {
          showModal({ type: 'error', title: 'Gagal Menghapus', message: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
        }
      }
    );
  };

  // ── filter modal helpers ───────────────────────────────────────────────────

  const openFilterModal  = () => { setTempFilterValues(filterValues); setShowFilter(true); setFilterClosing(false); };
  const applyFilter      = () => { setFilterValues(tempFilterValues); setCurrentPage(1); setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };
  const closeFilterModal = () => { setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };
  const resetFilter      = () => { const e = { kelas: '', mapel: '' }; setFilterValues(e); setTempFilterValues(e); setSearchQuery(''); setCurrentPage(1); };

  // ── mapel slot helpers ─────────────────────────────────────────────────────

  /** Tambah slot mapel baru (maks 5) */
  const addMapelSlot = () => {
    if (formTambah.mapels.length >= 5) return;
    setFormTambah(prev => ({ ...prev, mapels: [...prev.mapels, ''] }));
  };

  /** Hapus slot mapel (minimal 1 slot) */
  const removeMapelSlot = (idx: number) => {
    if (formTambah.mapels.length <= 1) return;
    setFormTambah(prev => ({ ...prev, mapels: prev.mapels.filter((_, i) => i !== idx) }));
  };

  /** Update nilai slot mapel tertentu */
  const updateMapelSlot = (idx: number, value: string) => {
    setFormTambah(prev => {
      const mapels = [...prev.mapels];
      mapels[idx] = value;
      return { ...prev, mapels };
    });
  };

  // ── PAGE: Tambah Data Pembelajaran ────────────────────────────────────────

  if (pageView === 'tambah') return (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data pembelajaran dan pengampu</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto" style={CARD_STYLE}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">Tambah Data Pembelajaran</h2>
          <button onClick={() => { setPageView('list'); resetTambah(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Guru */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Guru Pengampu <span className="text-red-500">*</span></label>
            <select value={formTambah.user_id}
              onChange={e => setFormTambah(prev => ({ ...prev, user_id: e.target.value }))}
              className={errorsTambah.user_id ? inputErrCls : inputCls} disabled={dropdownLoading}>
              <option value="">-- Pilih Guru --</option>
              {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
            {errorsTambah.user_id && <p className="text-red-500 text-xs">{errorsTambah.user_id}</p>}
          </div>

          {/* Kelas */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Kelas <span className="text-red-500">*</span></label>
            <select value={formTambah.id_kelas}
              onChange={e => setFormTambah(prev => ({ ...prev, id_kelas: e.target.value }))}
              className={errorsTambah.id_kelas ? inputErrCls : inputCls} disabled={dropdownLoading}>
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            {errorsTambah.id_kelas && <p className="text-red-500 text-xs">{errorsTambah.id_kelas}</p>}
          </div>

          {/* Mata Pelajaran — bisa banyak slot */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={labelCls} style={{ ...labelColor, marginBottom: 0 }}>
                Mata Pelajaran <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal text-xs ml-1">(maks. 5)</span>
              </label>
              {formTambah.mapels.length < 5 && (
                <button type="button" onClick={addMapelSlot}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg transition-all"
                  style={{ background: '#fff0e5', border: '1px solid #fde0c8', color: '#b35a08' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                  <Plus size={12} /> Tambah Mapel
                </button>
              )}
            </div>

            {formTambah.mapels.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <select value={val}
                    onChange={e => updateMapelSlot(idx, e.target.value)}
                    className={errorsTambah.mapels && idx === 0 ? inputErrCls : inputCls}
                    disabled={dropdownLoading}>
                    <option value="">-- Pilih Mata Pelajaran {idx + 1} --</option>
                    {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>
                {formTambah.mapels.length > 1 && (
                  <button type="button" onClick={() => removeMapelSlot(idx)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-200 transition-all flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}

            {errorsTambah.mapels && (
              <p className="text-red-500 text-xs">{errorsTambah.mapels}</p>
            )}

            <p className="text-xs text-gray-400">
              Guru ini akan mengampu semua mata pelajaran yang dipilih di kelas yang sama.
            </p>
          </div>

          {dropdownLoading && (
            <div className="flex items-center gap-2 text-xs" style={{ color: '#c95b08' }}>
              <div className="w-4 h-4 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
              Memuat data dropdown...
            </div>
          )}

          {/* Konfirmasi */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={formTambah.confirmData}
                onChange={e => setFormTambah(prev => ({ ...prev, confirmData: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Saya yakin data yang diisi sudah benar</span>
            </label>
            {errorsTambah.confirmData && <p className="text-red-500 text-xs mt-1">{errorsTambah.confirmData}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <BtnSecondary onClick={() => { setPageView('list'); resetTambah(); }}>Batal</BtnSecondary>
          <BtnSecondary onClick={resetTambah}>Reset</BtnSecondary>
          <button onClick={handleSubmitTambah}
            className={btnPrimary.base} style={btnPrimary.style}
            onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  );

  // ── PAGE: Tambah Sub Pembelajaran ─────────────────────────────────────────

  if (pageView === 'sub' && subTargetGuru) return (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data pembelajaran dan pengampu</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto" style={CARD_STYLE}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">Tambah Sub Pembelajaran</h2>
          <button onClick={() => { setPageView('list'); resetSub(); setSubTargetGuru(null); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Info guru & kelas (readonly) */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#c95b08' }}>Informasi Pengampu</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Guru</p>
                <p className="font-semibold text-gray-800">{subTargetGuru.nama_guru}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Kelas</p>
                <p className="font-semibold text-gray-800">{subTargetGuru.nama_kelas}</p>
              </div>
            </div>
          </div>

          {/* Mapel baru */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Tambah Mata Pelajaran <span className="text-red-500">*</span></label>
            <select value={formSub.id_mapel}
              onChange={e => setFormSub(prev => ({ ...prev, id_mapel: e.target.value }))}
              className={errorsSub.id_mapel ? inputErrCls : inputCls}
              disabled={dropdownLoading}>
              <option value="">-- Pilih Mata Pelajaran --</option>
              {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>
            {errorsSub.id_mapel && <p className="text-red-500 text-xs">{errorsSub.id_mapel}</p>}
          </div>

          {/* Konfirmasi */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={formSub.confirmData}
                onChange={e => setFormSub(prev => ({ ...prev, confirmData: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Saya yakin data yang diisi sudah benar</span>
            </label>
            {errorsSub.confirmData && <p className="text-red-500 text-xs mt-1">{errorsSub.confirmData}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <BtnSecondary onClick={() => { setPageView('list'); resetSub(); setSubTargetGuru(null); }}>Batal</BtnSecondary>
          <BtnSecondary onClick={resetSub}>Reset</BtnSecondary>
          <button onClick={handleSubmitSub}
            className={btnPrimary.base} style={btnPrimary.style}
            onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  );

  // ── HALAMAN UTAMA (LIST) ───────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {confirmCfg && (
        <ConfirmModal
          message={confirmCfg.message}
          onConfirm={() => { confirmCfg.onConfirm(); setConfirmCfg(null); }}
          onCancel={() => setConfirmCfg(null)}
        />
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data pembelajaran dan pengampu</p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

        {/* Toolbar */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>

          {/* Pilih Tahun Ajaran */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1.5" style={labelColor}>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={e => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedTahunAjaranId(null);
                  setSelectedTahunAjaranAktif(false);
                  setLoading(false);
                  setDataList([]);
                  return;
                }
                const id = Number(value);
                const ta = tahunAjaranList.find(t => t.id === id);
                setSelectedTahunAjaranId(id);
                setSelectedTahunAjaranAktif(ta?.is_aktif || false);
                setLoading(true);
                fetchData(id);
              }}
              className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 w-full md:w-72"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {tahunAjaranList.map(ta => (
                <option key={ta.id} value={ta.id}>
                  {ta.tahun_ajaran} {ta.semester === 'ganjil' ? 'Ganjil' : 'Genap'} {ta.is_aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Controls row */}
          {selectedTahunAjaranId !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3">

              {/* Kiri: Tambah + Filter */}
              <div className="flex flex-wrap gap-2">
                {selectedTahunAjaranAktif && (
                  <button onClick={() => { resetTambah(); setPageView('tambah'); }}
                    className={btnPrimary.base} style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                    <Plus size={16} /> Tambah Pembelajaran
                  </button>
                )}
                <button
                  onClick={openFilterModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <Filter size={15} /> Filter
                </button>
              </div>

              {/* Kanan: Tampilkan + Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                  <select value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                </div>

                <div className="relative min-w-[200px] sm:min-w-[220px]">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                  </div>
                  <input type="text" placeholder="Cari guru / mapel / kelas..." value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTahunAjaranId !== null && (
            <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
              Menampilkan {groupedRows.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, groupedRows.length)} dari {groupedRows.length} pengampu
            </p>
          )}
        </div>

        {/* Belum pilih tahun ajaran */}
        {selectedTahunAjaranId === null ? (
          <div className="m-6 text-center py-10 rounded-xl" style={{ background: '#fff8f3', border: '2px dashed #fde0c8' }}>
            <p className="font-semibold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
            <p className="text-sm text-gray-400 mt-1">Data pembelajaran akan tampil setelah memilih tahun ajaran.</p>
          </div>
        ) : (
          <>
            {/* ── TABLE ─────────────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr style={TH_GRAD}>
                    {[
                      'No.',
                      'Guru Pengampu',
                      'Kelas',
                      'Mata Pelajaran yang Diampu',
                      ...(selectedTahunAjaranAktif ? ['Aksi'] : []),
                    ].map(h => (
                      <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={selectedTahunAjaranAktif ? 5 : 4} className="py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                          Memuat data...
                        </div>
                      </td>
                    </tr>
                  ) : currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={selectedTahunAjaranAktif ? 5 : 4} className="py-12 text-center text-gray-400 text-sm">
                        Tidak ada data pembelajaran
                      </td>
                    </tr>
                  ) : currentRows.map((row, index) => (
                    <tr key={row.key}
                      style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                      onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                    >
                      {/* No */}
                      <td className="px-5 py-3.5 text-center text-gray-500 font-medium align-top">{startIndex + index + 1}</td>

                      {/* Guru */}
                      <td className="px-5 py-3.5 text-center align-top">
                        <p className="font-bold text-gray-800">{row.nama_guru}</p>
                      </td>

                      {/* Kelas */}
                      <td className="px-5 py-3.5 text-center align-top">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: '#fff0e5', color: '#b35a08', border: '1px solid #fde0c8' }}>
                          {row.nama_kelas}
                        </span>
                      </td>

                      {/* Daftar Mapel */}
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex flex-col gap-1.5">
                          {row.mapels.map((mapel, mi) => (
                            <div key={mapel.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5"
                              style={{ background: '#f8fbff', border: '1px solid #dbeafe' }}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <BookOpen size={13} className="text-blue-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700 font-medium truncate">{mapel.nama}</span>
                              </div>
                              {selectedTahunAjaranAktif && (
                                <button
                                  onClick={() => handleDelete(mapel.id, mapel.nama, row.nama_guru)}
                                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all"
                                  style={{ color: '#ef4444' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                  title={`Hapus ${mapel.nama}`}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Tambah Sub Pembelajaran */}
                          {selectedTahunAjaranAktif && (
                            <button
                              onClick={() => {
                                setSubTargetGuru({ user_id: row.user_id, id_kelas: row.id_kelas, nama_guru: row.nama_guru, nama_kelas: row.nama_kelas });
                                resetSub();
                                setPageView('sub');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit mt-0.5"
                              style={{ background: '#fff0e5', border: '1px solid #fde0c8', color: '#b35a08' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                              <Plus size={12} /> Tambah Sub Pembelajaran
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Aksi: hapus semua mapel guru ini */}
                      {selectedTahunAjaranAktif && (
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          <button
                            onClick={() => showConfirm(
                              `Yakin ingin menghapus SEMUA mata pelajaran yang diampu oleh "${row.nama_guru}" di kelas "${row.nama_kelas}"? Tindakan ini tidak dapat dibatalkan.`,
                              async () => {
                                const token = getToken();
                                if (!token) return;
                                try {
                                  await Promise.allSettled(
                                    row.mapels.map(m =>
                                      fetch(`http://localhost:5000/api/admin/pembelajaran/${m.id}`, {
                                        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
                                      })
                                    )
                                  );
                                  if (selectedTahunAjaranId) await fetchData(selectedTahunAjaranId);
                                  showModal({ type: 'success', title: 'Berhasil Dihapus!', message: `Semua pembelajaran "${row.nama_guru}" di kelas "${row.nama_kelas}" telah dihapus.` });
                                } catch {
                                  showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
                                }
                              }
                            )}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                            <Trash2 size={13} /> Hapus Semua
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
              <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">{renderPagination()}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Filter ─────────────────────────────────────────────────── */}
      {showFilter && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeFilterModal(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">Filter Pembelajaran</h2>
              <button onClick={closeFilterModal} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {dropdownLoading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>Kelas</label>
                    <select value={tempFilterValues.kelas}
                      onChange={e => setTempFilterValues(prev => ({ ...prev, kelas: e.target.value }))}
                      className={inputCls}>
                      <option value="">Semua Kelas</option>
                      {kelasList.map(k => <option key={k.id} value={String(k.id)}>{k.nama}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>Mata Pelajaran</label>
                    <select value={tempFilterValues.mapel}
                      onChange={e => setTempFilterValues(prev => ({ ...prev, mapel: e.target.value }))}
                      className={inputCls}>
                      <option value="">Semua Mata Pelajaran</option>
                      {mapelList.map(m => <option key={m.id} value={String(m.id)}>{m.nama}</option>)}
                    </select>
                  </div>

                  <div className="pt-2 flex gap-3" style={{ borderTop: '1px solid #fde0c8' }}>
                    <BtnSecondary onClick={resetFilter}>Reset</BtnSecondary>
                    <button onClick={applyFilter}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}>
                      Terapkan
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}