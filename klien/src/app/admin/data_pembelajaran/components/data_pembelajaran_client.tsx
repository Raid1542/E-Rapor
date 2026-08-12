/**
 * Nama File: data_pembelajaran_client.tsx
 * Fungsi: Komponen klien untuk mengelola penugasan guru mengajar (mata
 *         pelajaran wajib & pilihan) per kelas, per semester.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 20 Juli 2026
 */

'use client';

import { useState, useEffect, useRef, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, BookOpen, CheckSquare, Square, Lock, CalendarRange, ChevronDown } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Disamakan persis dengan data_mata_pelajaran_client.tsx.

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* Lebar kolom tabel Mapel Wajib & Mapel Pilihan — dipakai IDENTIK oleh kedua
   tabel (header maupun body) agar kolom No/Kode/Mata Pelajaran/Guru Pengampu/
   Aksi selalu sejajar satu sama lain, terlepas dari isi/jumlah tombol aksinya. */
const PEMBELAJARAN_GRID_WITH_AKSI = 'minmax(50px,0.5fr) minmax(90px,1fr) minmax(200px,2.5fr) minmax(180px,2fr) minmax(170px,1.8fr)';
const PEMBELAJARAN_GRID_NO_AKSI = 'minmax(50px,0.5fr) minmax(90px,1fr) minmax(220px,2.8fr) minmax(220px,2.2fr)';

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
    .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
    .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }

    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0);    }
    }
    .anim-in { animation: fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
    .d1 { animation-delay: 0.03s; }
    .d2 { animation-delay: 0.07s; }
    .d3 { animation-delay: 0.11s; }
    .d4 { animation-delay: 0.15s; }
    .d5 { animation-delay: 0.19s; }
    .d6 { animation-delay: 0.23s; }
    .row-in { animation: fadeInUp 0.28s ease forwards; opacity: 0; }

    .card-flat { transition: box-shadow 0.2s ease; }
    .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

    .row-hover { position: relative; transition: background-color 0.15s ease; }
    .row-hover::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
        background: ${BRAND_GRADIENT}; transform: scaleY(0); transition: transform 0.16s ease;
    }
    .row-hover:hover::before { transform: scaleY(1); }

    .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
    .btn-action:hover  { filter: brightness(1.04); }
    .btn-action:active { filter: brightness(0.98); }

    .scrollbar-thin::-webkit-scrollbar { width: 6px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c896; border-radius: 10px; }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #e8a865; }
    .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #f0c896 transparent; }

    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
        outline: 2.5px solid #f5a623;
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .btn-action, .card-flat, .row-hover {
            animation: none !important;
            transition: none !important;
        }
    }
  `}</style>
);

// ─── HELPER: Filter Duplikat by ID ────────────────────────────────────────────
const removeDuplicatesById = <T extends { id: number }>(arr: T[]): T[] => {
  const seen = new Set<number>();
  return arr.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

// ─── SISTEM TOMBOL AKSI (disamakan dengan Data Mata Pelajaran) ───────────────

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent' | 'danger';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
  info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
  warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
  neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
  success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
  accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
  danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
};

const ActionButton = ({
  onClick, children, variant = 'neutral', size = 'md', disabled = false, fullWidth = false, title,
}: {
  onClick?: () => void; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
  disabled?: boolean; fullWidth?: boolean; title?: string;
}) => {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`btn-action inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap ${pad} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      style={VARIANT_BASE[variant]}
    >
      {children}
    </button>
  );
};

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
  error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
  warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 dg-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
        <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
        <div className="text-center w-full">
          <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>OK, Mengerti</button>
      </div>
    </div>
  );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────
const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";

// ─── CONFIRM MODAL (Hapus) ────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 dg-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
        <Trash2 size={34} className="text-red-500" />
      </div>
      <div className="text-center w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-1.5">Konfirmasi Hapus</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-1">{message}</p>
      </div>
      <div className="flex gap-2.5 w-full mt-1">
        <ActionButton variant="neutral" onClick={onCancel} fullWidth>Batal</ActionButton>
        <ActionButton variant="primary" onClick={onConfirm} fullWidth>Ya, Hapus</ActionButton>
      </div>
    </div>
  </div>
);

// ─── DROPDOWN KUSTOM (Guru Pengampu / Mata Pelajaran) ────────────────────────
// Menggantikan <select> native. <select> native gaya hover/fokus opsinya ikut
// tema abu-abu bawaan browser (tidak konsisten dengan warna oranye brand) dan
// bisa membuka ke ATAS bila ruang di bawah dianggap kurang, sehingga menabrak
// header modal. Dropdown ini SELALU membuka ke bawah dengan tinggi maksimum +
// scroll halus, cukup untuk menampilkan ±10 opsi sekaligus. Perilaku data
// tetap identik: memanggil onChange dengan string id (atau '' untuk kosong).
interface SearchDropdownOption { id: number; label: string; sublabel?: string; }

const SearchDropdown = ({
  value, options, onChange, hasError = false, placeholder, disabled = false,
}: {
  value: string;
  options: SearchDropdownOption[];
  onChange: (v: string) => void;
  hasError?: boolean;
  placeholder: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => String(o.id) === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`${hasError ? inputErrCls : inputCls} flex items-center justify-between ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selected ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: ACCENT }} />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-white overflow-y-auto dg-scaleIn scrollbar-thin"
          style={{ ...CARD_STYLE, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', maxHeight: '400px' }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3.5 py-2.5 text-sm text-gray-400 hover:bg-orange-50/60 transition-colors"
          >
            {placeholder}
          </button>
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(String(o.id)); setOpen(false); }}
              className="w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-sm font-medium text-gray-800 hover:bg-orange-50/60 transition-colors"
              style={String(o.id) === value ? { background: '#fff5eb', color: ACCENT_DARK, fontWeight: 700 } : {}}
            >
              {o.sublabel && (
                <span className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                  {o.sublabel}
                </span>
              )}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── INTERFACES ───────────────────────────────────────────────────────────────
interface Pembelajaran {
  id: number;
  tahun_ajaran_id: number;
  kelas_id: number;
  mapel_id: number;
  user_id: number;
  nama_mapel: string;
  kode_mapel: string;
  jenis_mapel: 'wajib' | 'pilihan';
  nama_guru: string;
}

interface MapelTersedia {
  id: number;
  nama_mapel: string;
  kode_mapel: string;
}

interface KelasInfo {
  id: number;
  nama_kelas: string;
  tahun_ajaran_id: number;
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

interface WaliKelas {
  id: number;
  nama: string;
}

interface DataPerKelas {
  kelas: KelasInfo;
  wali_kelas: WaliKelas | null;
  mapel_wajib: Pembelajaran[];
  mapel_pilihan: Pembelajaran[];
  mapel_wajib_tersedia: MapelTersedia[];
  mapel_pilihan_tersedia: MapelTersedia[];
}

interface TahunAjaranInduk {
  id: number;
  tahun_ajaran: string;
  is_aktif: boolean;
}

interface SemesterOption {
  id: number;
  semester: string;
  is_aktif: boolean;
}

interface DropdownItem {
  id: number;
  nama: string;
}

interface FormDataPilihan {
  user_id: string;
  mapel_id: string;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DataPembelajaranPage() {
  const { showSessionExpired, handleLogout } = useSession();
  const [dataPerKelas, setDataPerKelas] = useState<DataPerKelas | null>(null);
  const [loading, setLoading] = useState(false);

  const [showFormEdit, setShowFormEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Pembelajaran | null>(null);

  const [showModalWajib, setShowModalWajib] = useState(false);
  const [selectedMapelWajibIds, setSelectedMapelWajibIds] = useState<number[]>([]);
  const [submittingWajib, setSubmittingWajib] = useState(false);

  const [showModalPilihan, setShowModalPilihan] = useState(false);
  const [formDataPilihan, setFormDataPilihan] = useState<FormDataPilihan>({
    user_id: '', mapel_id: ''
  });
  const [errorsPilihan, setErrorsPilihan] = useState<Record<string, string>>({});
  const [submittingPilihan, setSubmittingPilihan] = useState(false);

  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaranInduk[]>([]);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);

  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [isSemesterActive, setIsSemesterActive] = useState<boolean>(false);

  const [kelasList, setKelasList] = useState<DropdownItem[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);

  const [guruList, setGuruList] = useState<DropdownItem[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'add-pilihan' | 'edit-pilihan' | 'add-wajib' | null>(null);

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

  const getToken = (): string | null => localStorage.getItem('token');

  // ── Fetches ────────────────────────────────────────────────────────────────

  const fetchTahunAjaran = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      // ✅ PERUBAHAN 2: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/tahun-ajaran`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const uniqueTA = Array.from(
          new Map(data.data.map((ta: any) => [ta.id_induk, {
            id: ta.id_induk,
            tahun_ajaran: ta.tahun_ajaran,
            is_aktif: ta.status?.toLowerCase() === 'aktif',
          }])).values()
        ) as TahunAjaranInduk[];
        setTahunAjaranList(uniqueTA);
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data tahun ajaran.' });
    }
  }, [showModal]);

  const fetchSemesterByTahunAjaran = useCallback(async (idInduk: number) => {
    try {
      const token = getToken();
      if (!token) return [];

      // ✅ PERUBAHAN 3: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/semester-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const semesters = data.data
          .filter((sem: any) => sem.id_induk === idInduk)
          .map((sem: any) => ({
            id: sem.id,
            semester: sem.semester,
            is_aktif: sem.is_aktif
          }));

        setSemesterOptions(semesters);
        return semesters;
      }
      return [];
    } catch (err) {
      console.error('Error fetch semester:', err);
      return [];
    }
  }, []);

  const fetchKelasList = useCallback(async (idInduk: number) => {
    try {
      const token = getToken();
      if (!token) return;

      // ✅ PERUBAHAN 4: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/kelas?tahun_ajaran_id=${idInduk}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKelasList(removeDuplicatesById(
          (data.data || []).map((k: any) => ({ id: k.id, nama: k.nama_kelas }))
        ));
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data kelas.' });
    }
  }, [showModal]);

  const fetchDropdowns = useCallback(async (semesterId: number) => {
    setDropdownLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      // ✅ PERUBAHAN 5: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/pembelajaran/dropdown?semester_id=${semesterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // ✅ BACKWARD COMPATIBLE:
        // - Backend baru: menggunakan guru_bidang_studi (hanya guru bidang studi)
        // - Backend lama: fallback ke guru (semua guru)
        const guruData = data.data.guru_bidang_studi || data.data.guru || [];
        setGuruList(removeDuplicatesById(guruData));
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data dropdown.' });
    } finally {
      setDropdownLoading(false);
    }
  }, [showModal]);

  // ✅ FIXED: Terima parameter semesterId opsional untuk hindari race condition
  const fetchDataPerKelas = useCallback(async (kelasId: number, semesterIdParam?: number) => {
    // ✅ Gunakan parameter jika ada, fallback ke state
    const semId = semesterIdParam || selectedSemesterId;

    if (!semId) {
      // Silent return - tidak tampilkan modal
      console.warn('Semester belum dipilih');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      // ✅ PERUBAHAN 6: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/pembelajaran/kelas/${kelasId}?semester_id=${semId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDataPerKelas(data.data);
      } else {
        setDataPerKelas(null);
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan.' });
      }
    } catch {
      setDataPerKelas(null);
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  }, [showModal, selectedSemesterId]);

  // ── useEffect: Load awal ───────────────────────────────────────────────────
  useEffect(() => {
    fetchTahunAjaran();
  }, [fetchTahunAjaran]);

  // ✅ FIXED: useEffect load dari localStorage - kirim semesterId langsung
  useEffect(() => {
    if (tahunAjaranList.length > 0 && selectedTahunAjaranId === null) {
      const savedTA = localStorage.getItem('pembelajaran_selectedTA');
      const savedSemester = localStorage.getItem('pembelajaran_selectedSemester');
      const savedKelas = localStorage.getItem('pembelajaran_selectedKelas');

      if (savedTA) {
        const id = Number(savedTA);
        const ta = tahunAjaranList.find(t => t.id === id);
        if (ta) {
          setSelectedTahunAjaranId(id);
          fetchSemesterByTahunAjaran(id).then((semesters: SemesterOption[]) => {
            if (savedSemester) {
              const semesterId = Number(savedSemester);
              const sem = semesters.find(s => s.id === semesterId);
              if (sem) {
                setSelectedSemesterId(semesterId);
                setIsSemesterActive(sem.is_aktif);

                // ✅ Kirim idInduk ke fetchKelasList
                fetchKelasList(id);

                if (savedKelas) {
                  const kelasId = Number(savedKelas);
                  setSelectedKelasId(kelasId);

                  // ✅ KIRIM semesterId LANGSUNG sebagai parameter!
                  // Ini menghindari race condition dengan state selectedSemesterId
                  fetchDataPerKelas(kelasId, semesterId);

                  if (sem.is_aktif) fetchDropdowns(semesterId);
                }
              }
            }
          });
        }
      }
    }
  }, [tahunAjaranList]);

  // ── Handler: Pilih Tahun Ajaran ────────────────────────────────────────────
  const handleTahunAjaranChange = async (value: string) => {
    if (value === '' || value === 'no-data') {
      setSelectedTahunAjaranId(null);
      setSelectedSemesterId(null);
      setIsSemesterActive(false);
      setSemesterOptions([]);
      setSelectedKelasId(null);
      setDataPerKelas(null);
      setKelasList([]);
      setGuruList([]);
      localStorage.removeItem('pembelajaran_selectedTA');
      localStorage.removeItem('pembelajaran_selectedSemester');
      localStorage.removeItem('pembelajaran_selectedKelas');
      return;
    }

    const id = Number(value);
    setSelectedTahunAjaranId(id);
    setSelectedSemesterId(null);
    setIsSemesterActive(false);
    setSelectedKelasId(null);
    setDataPerKelas(null);
    setKelasList([]);
    setGuruList([]);
    localStorage.setItem('pembelajaran_selectedTA', id.toString());
    localStorage.removeItem('pembelajaran_selectedSemester');
    localStorage.removeItem('pembelajaran_selectedKelas');

    await fetchSemesterByTahunAjaran(id);
  };

  // ── Handler: Pilih Semester ────────────────────────────────────────────────
  const handleSemesterChange = async (value: string) => {
    if (value === '' || value === 'no-data') {
      setSelectedSemesterId(null);
      setIsSemesterActive(false);
      setSelectedKelasId(null);
      setDataPerKelas(null);
      setKelasList([]);
      setGuruList([]);
      localStorage.removeItem('pembelajaran_selectedSemester');
      localStorage.removeItem('pembelajaran_selectedKelas');
      return;
    }

    const id = Number(value);
    const selectedSem = semesterOptions.find(s => s.id === id);
    setSelectedSemesterId(id);
    setIsSemesterActive(selectedSem?.is_aktif || false);
    setSelectedKelasId(null);
    setDataPerKelas(null);
    setGuruList([]);
    localStorage.setItem('pembelajaran_selectedSemester', id.toString());
    localStorage.removeItem('pembelajaran_selectedKelas');

    if (selectedTahunAjaranId) {
      await fetchKelasList(selectedTahunAjaranId);
    }

    if (selectedSem?.is_aktif) {
      await fetchDropdowns(id);
    }
  };

  // ✅ FIXED: Validasi semester sebelum pilih kelas
  const handleKelasChange = (value: string) => {
    if (!selectedSemesterId) {
      showModal({
        type: 'warning',
        title: 'Semester Belum Dipilih',
        message: 'Silakan pilih semester terlebih dahulu sebelum memilih kelas.'
      });
      return;
    }

    if (value === '' || value === 'no-data') {
      setSelectedKelasId(null);
      setDataPerKelas(null);
      localStorage.removeItem('pembelajaran_selectedKelas');
      return;
    }

    const id = Number(value);
    setSelectedKelasId(id);
    localStorage.setItem('pembelajaran_selectedKelas', id.toString());
    fetchDataPerKelas(id);
  };

  const toggleMapelWajib = (mapelId: number) => {
    setSelectedMapelWajibIds(prev =>
      prev.includes(mapelId)
        ? prev.filter(id => id !== mapelId)
        : [...prev, mapelId]
    );
  };

  const selectAllMapelWajib = () => {
    if (!dataPerKelas?.mapel_wajib_tersedia) return;
    if (selectedMapelWajibIds.length === dataPerKelas.mapel_wajib_tersedia.length) {
      setSelectedMapelWajibIds([]);
    } else {
      setSelectedMapelWajibIds(dataPerKelas.mapel_wajib_tersedia.map(m => m.id));
    }
  };

  const executeTambahWajib = async () => {
    const token = getToken();
    if (!token || !selectedKelasId || !selectedSemesterId) return;

    setSubmittingWajib(true);
    try {
      // ✅ PERUBAHAN 7: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/pembelajaran/tambah-wajib`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          kelas_id: selectedKelasId,
          mapel_ids: selectedMapelWajibIds,
          semester_id: selectedSemesterId
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setShowModalWajib(false);
        setSelectedMapelWajibIds([]);
        await fetchDataPerKelas(selectedKelasId);
        showModal({ type: 'success', title: 'Berhasil Ditambahkan!', message: result.message });
      } else {
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setSubmittingWajib(false);
    }
  };

  const openConfirmWajib = () => {
    if (selectedMapelWajibIds.length === 0) {
      showModal({ type: 'warning', title: 'Belum Ada Mapel Dipilih', message: 'Pilih minimal 1 mata pelajaran wajib.' });
      return;
    }
    setConfirmAction('add-wajib');
    setShowConfirmModal(true);
  };

  const handlePilihanChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormDataPilihan(prev => ({ ...prev, [name]: value }));
    if (errorsPilihan[name]) setErrorsPilihan(prev => ({ ...prev, [name]: '' }));
  };

  const setPilihanField = (name: keyof FormDataPilihan, value: string) => {
    setFormDataPilihan(prev => ({ ...prev, [name]: value }));
    if (errorsPilihan[name]) setErrorsPilihan(prev => ({ ...prev, [name]: '' }));
  };

  const validateFormPilihan = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formDataPilihan.mapel_id) ne.mapel_id = 'Pilih mata pelajaran';
    if (!formDataPilihan.user_id) ne.user_id = 'Pilih guru pengampu';
    setErrorsPilihan(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap lengkapi semua field.' });
      return false;
    }
    return true;
  };

  const executeTambahPilihan = async () => {
    const token = getToken();
    if (!token || !selectedKelasId || !selectedSemesterId) return;

    setSubmittingPilihan(true);
    try {
      // ✅ PERUBAHAN 8: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/pembelajaran/tambah-pilihan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          kelas_id: selectedKelasId,
          mapel_id: Number(formDataPilihan.mapel_id),
          user_id: Number(formDataPilihan.user_id),
          semester_id: selectedSemesterId
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setShowModalPilihan(false);
        setFormDataPilihan({ user_id: '', mapel_id: '' });
        setErrorsPilihan({});
        await fetchDataPerKelas(selectedKelasId);
        showModal({ type: 'success', title: 'Berhasil Ditambahkan!', message: result.message });
      } else {
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setSubmittingPilihan(false);
    }
  };

  const executeEditPilihan = async () => {
    if (!editId || !selectedKelasId || !selectedSemesterId) return;

    const token = getToken();
    if (!token) return;

    setSubmittingPilihan(true);
    try {
      // ✅ PERUBAHAN 9: URL sekarang pakai API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/admin/pembelajaran/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          kelas_id: selectedKelasId,
          mapel_id: Number(formDataPilihan.mapel_id),
          user_id: Number(formDataPilihan.user_id),
          semester_id: selectedSemesterId
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setShowFormEdit(false);
        setEditId(null);
        setEditData(null);
        setFormDataPilihan({ user_id: '', mapel_id: '' });
        await fetchDataPerKelas(selectedKelasId);
        showModal({ type: 'success', title: 'Berhasil Diperbarui!', message: result.message });
      } else {
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setSubmittingPilihan(false);
    }
  };

  const openConfirmPilihan = (action: 'add-pilihan' | 'edit-pilihan') => {
    if (!validateFormPilihan()) return;

    if (action === 'edit-pilihan' && editData) {
      const hasChanged = editData.user_id !== Number(formDataPilihan.user_id);
      if (!hasChanged) {
        showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
        return;
      }
    }

    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const openFormEdit = (mp: Pembelajaran) => {
    setEditId(mp.id);
    setEditData(mp);
    setFormDataPilihan({
      user_id: String(mp.user_id),
      mapel_id: String(mp.mapel_id),
    });
    setErrorsPilihan({});
    setShowFormEdit(true);
  };

  const handleDelete = (id: number, namaMapel: string, namaGuru: string) => {
    showConfirm(
      `Yakin ingin menghapus "${namaMapel}" dari "${namaGuru}"?\n\nTindakan ini tidak dapat dibatalkan jika sudah ada data nilai rapor.`,
      async () => {
        const token = getToken();
        if (!token || !selectedKelasId || !selectedSemesterId) return;
        try {
          // ✅ PERUBAHAN 10: URL sekarang pakai API_BASE_URL
          const res = await fetch(`${API_BASE_URL}/api/admin/pembelajaran/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              semester_id: selectedSemesterId
            })
          });
          const result = await res.json();
          if (res.ok && result.success) {
            await fetchDataPerKelas(selectedKelasId);
            showModal({ type: 'success', title: 'Berhasil Dihapus!', message: result.message || 'Data berhasil dihapus.' });
          } else {
            showModal({ type: 'error', title: 'Gagal Menghapus', message: result.message || 'Terjadi kesalahan.' });
          }
        } catch {
          showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
      }
    );
  };

  // Lebar kolom tabel Mapel Wajib & Mapel Pilihan — sama persis untuk kedua
  // tabel, tergantung apakah kolom "Aksi" ditampilkan (semester aktif) atau tidak.
  const pembelajaranGridCols = isSemesterActive ? PEMBELAJARAN_GRID_WITH_AKSI : PEMBELAJARAN_GRID_NO_AKSI;

  // Opsi dropdown Guru Pengampu (dipakai di form Edit & Modal Tambah Pilihan)
  const guruOptions: SearchDropdownOption[] = guruList.map(g => ({ id: g.id, label: g.nama }));

  // ── PAGE: Form EDIT Mapel Pilihan — dibiarkan ringkas (card kecil) ─────────
  if (showFormEdit) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 dg-fadeIn" style={PAGE_BG}>
        <GlobalStyles />
        {modal && <NotifModal modal={modal} onClose={closeModal} />}
        {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

        <div className="w-full max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
            <p className="text-sm mt-0.5 text-gray-500">
              Edit Pembelajaran — Kelas {dataPerKelas?.kelas.nama_kelas}
            </p>
          </div>

          <div className="card-flat bg-white rounded-2xl mx-auto" style={CARD_STYLE}>
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
              <h2 className="text-base font-bold text-white">Edit Guru Pengampu</h2>
              <button onClick={() => { setShowFormEdit(false); setEditId(null); setEditData(null); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            {dataPerKelas && (
              <div className="px-6 pt-5">
                <div className="rounded-xl p-4" style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: ACCENT_DARK }}>
                    Informasi Mapel
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Mata Pelajaran</p>
                      <p className="font-semibold text-gray-800">{editData?.nama_mapel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Guru Lama</p>
                      <p className="font-semibold text-gray-800">{editData?.nama_guru}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls} style={labelColor}>
                  Guru Pengampu Baru <span className="text-red-500">*</span>
                </label>
                <SearchDropdown
                  value={formDataPilihan.user_id}
                  options={guruOptions}
                  onChange={(v) => setPilihanField('user_id', v)}
                  hasError={!!errorsPilihan.user_id}
                  placeholder="-- Pilih Guru --"
                  disabled={dropdownLoading}
                />
                {errorsPilihan.user_id && <p className="text-red-600 text-xs font-semibold mt-0.5">{errorsPilihan.user_id}</p>}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-2.5 rounded-b-2xl" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
              <ActionButton variant="neutral" onClick={() => { setShowFormEdit(false); setEditId(null); setEditData(null); }}>
                Batal
              </ActionButton>
              <ActionButton variant="primary" onClick={() => openConfirmPilihan('edit-pilihan')}>
                Simpan Perubahan
              </ActionButton>
            </div>
          </div>
        </div>

        {showConfirmModal && confirmAction === 'edit-pilihan' && (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 dg-fadeIn"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={24} className="text-orange-500" />
                </div>
                <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                  Konfirmasi Perubahan Data
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                Apakah Anda yakin ingin mengubah guru pengampu ini?
              </p>

              <div className="flex gap-2.5">
                <ActionButton variant="neutral" onClick={() => setShowConfirmModal(false)} fullWidth>
                  Batal
                </ActionButton>
                <ActionButton
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    setShowConfirmModal(false);
                    executeEditPilihan();
                  }}
                >
                  Simpan
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── HALAMAN UTAMA ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

      {confirmCfg && (
        <ConfirmModal
          message={confirmCfg.message}
          onConfirm={() => { confirmCfg.onConfirm(); setConfirmCfg(null); }}
          onCancel={() => setConfirmCfg(null)}
        />
      )}

      {/* ═══ MODAL TAMBAH MAPEL WAJIB ═══ */}
      {showModalWajib && dataPerKelas && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 dg-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submittingWajib && setShowModalWajib(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col dg-scaleIn" style={CARD_STYLE}>
            <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND_GRADIENT }}>
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-white" />
                <h2 className="text-base font-bold text-white">Tambah Mapel Wajib</h2>
              </div>
              <button onClick={() => !submittingWajib && setShowModalWajib(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }} disabled={submittingWajib}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="rounded-xl p-3" style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
                <p className="text-xs text-gray-600">
                  Kelas <strong>{dataPerKelas.kelas.nama_kelas}</strong> • Guru Kelas: <strong>{dataPerKelas.wali_kelas?.nama || '—'}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ Mapel wajib otomatis ditugaskan ke guru kelas.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {dataPerKelas.mapel_wajib_tersedia.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
                  <p className="font-semibold text-green-700">Semua mapel wajib sudah ditugaskan!</p>
                  <p className="text-xs mt-1">Tidak ada mapel wajib yang perlu ditambahkan.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={selectAllMapelWajib}
                    className="btn-action w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                    style={{ background: '#fff5eb', border: '1px solid #fde0c8', color: ACCENT_DARK }}
                  >
                    {selectedMapelWajibIds.length === dataPerKelas.mapel_wajib_tersedia.length ? (
                      <CheckSquare size={16} className="text-orange-500" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    {selectedMapelWajibIds.length === dataPerKelas.mapel_wajib_tersedia.length
                      ? 'Batal Pilih Semua'
                      : `Pilih Semua (${dataPerKelas.mapel_wajib_tersedia.length} mapel)`}
                  </button>

                  <div className="space-y-2">
                    {dataPerKelas.mapel_wajib_tersedia.map(mp => (
                      <label
                        key={mp.id}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-orange-50/50"
                        style={{
                          border: selectedMapelWajibIds.includes(mp.id) ? '2px solid #f5a623' : '1px solid #ececec',
                          background: selectedMapelWajibIds.includes(mp.id) ? '#fff8f2' : '#fff'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMapelWajibIds.includes(mp.id)}
                          onChange={() => toggleMapelWajib(mp.id)}
                          className="w-5 h-5 rounded accent-orange-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                              {mp.kode_mapel}
                            </span>
                            <span className="font-semibold text-gray-800 text-sm">{mp.nama_mapel}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end gap-2.5" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
              <ActionButton variant="neutral" onClick={() => setShowModalWajib(false)} disabled={submittingWajib}>
                Batal
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={openConfirmWajib}
                disabled={selectedMapelWajibIds.length === 0 || submittingWajib || dataPerKelas.mapel_wajib_tersedia.length === 0}
              >
                {submittingWajib ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    Simpan {selectedMapelWajibIds.length > 0 ? `(${selectedMapelWajibIds.length})` : ''}
                  </>
                )}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL TAMBAH MAPEL PILIHAN ═══ */}
      {showModalPilihan && dataPerKelas && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 dg-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submittingPilihan && setShowModalPilihan(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md dg-scaleIn" style={CARD_STYLE}>
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-white" />
                <h2 className="text-base font-bold text-white">Tambah Mapel Pilihan</h2>
              </div>
              <button onClick={() => !submittingPilihan && setShowModalPilihan(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }} disabled={submittingPilihan}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="rounded-xl p-3" style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
                <p className="text-xs text-gray-600">
                  Kelas <strong>{dataPerKelas.kelas.nama_kelas}</strong>
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {dataPerKelas.mapel_pilihan_tersedia.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
                  <p className="font-semibold text-green-700">Semua mapel pilihan sudah ditugaskan!</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>
                      Mata Pelajaran <span className="text-red-500">*</span>
                    </label>
                    <SearchDropdown
                      value={formDataPilihan.mapel_id}
                      options={dataPerKelas.mapel_pilihan_tersedia.map(m => ({ id: m.id, label: m.nama_mapel, sublabel: m.kode_mapel }))}
                      onChange={(v) => setPilihanField('mapel_id', v)}
                      hasError={!!errorsPilihan.mapel_id}
                      placeholder="-- Pilih Mata Pelajaran --"
                      disabled={dropdownLoading || submittingPilihan}
                    />
                    {errorsPilihan.mapel_id && <p className="text-red-600 text-xs font-semibold mt-0.5">{errorsPilihan.mapel_id}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>
                      Guru Pengampu <span className="text-red-500">*</span>
                    </label>
                    <SearchDropdown
                      value={formDataPilihan.user_id}
                      options={guruOptions}
                      onChange={(v) => setPilihanField('user_id', v)}
                      hasError={!!errorsPilihan.user_id}
                      placeholder="-- Pilih Guru --"
                      disabled={dropdownLoading || submittingPilihan}
                    />
                    {errorsPilihan.user_id && <p className="text-red-600 text-xs font-semibold mt-0.5">{errorsPilihan.user_id}</p>}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end gap-2.5 rounded-b-2xl" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
              <ActionButton variant="neutral" onClick={() => setShowModalPilihan(false)} disabled={submittingPilihan}>
                Batal
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => openConfirmPilihan('add-pilihan')}
                disabled={dataPerKelas.mapel_pilihan_tersedia.length === 0 || submittingPilihan}
              >
                {submittingPilihan ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>Simpan</>
                )}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL KONFIRMASI ═══ */}
      {showConfirmModal && (confirmAction === 'add-wajib' || confirmAction === 'add-pilihan') && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 dg-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} className="text-orange-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                Konfirmasi Penambahan Data
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
              {confirmAction === 'add-wajib'
                ? `Apakah Anda yakin ingin menambahkan ${selectedMapelWajibIds.length} mapel wajib ini?`
                : 'Apakah Anda yakin ingin menambahkan mapel pilihan ini?'}
            </p>

            <div className="flex gap-2.5">
              <ActionButton variant="neutral" onClick={() => setShowConfirmModal(false)} fullWidth>
                Batal
              </ActionButton>
              <ActionButton
                variant="primary"
                fullWidth
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmAction === 'add-wajib') {
                    executeTambahWajib();
                  } else {
                    executeTambahPilihan();
                  }
                }}
              >
                Simpan
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HALAMAN UTAMA ═══ */}
      <div className="mb-4 sm:mb-5 anim-in d1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
        <p className="text-xs sm:text-sm mt-1 text-gray-500">
          Kelola penugasan guru mengajar per kelas
        </p>
      </div>

      {/* ====================================================================
          CARD 1: Tahun Ajaran + Semester + Kelas — compact satu baris,
          disamakan dengan pola Card 1 di Data Mata Pelajaran.
      ==================================================================== */}
      <div className="card-flat bg-white rounded-2xl px-4 sm:px-5 py-3.5 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 anim-in d2" style={CARD_STYLE}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
            <CalendarRange size={16} style={{ color: ACCENT_DARK }} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold whitespace-nowrap" style={labelColor}>
              Tahun Ajaran
            </label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => handleTahunAjaranChange(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200 min-w-[200px]"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {tahunAjaranList.map(ta => (
                <option key={ta.id} value={ta.id}>
                  {ta.tahun_ajaran} {ta.is_aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTahunAjaranId !== null && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold whitespace-nowrap" style={labelColor}>
              Semester
            </label>
            <select
              value={selectedSemesterId ?? ''}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200 min-w-[190px]"
            >
              <option value="">-- Pilih Semester --</option>
              {semesterOptions.map(sem => (
                <option key={sem.id} value={sem.id}>
                  {sem.semester} {sem.is_aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>

            {selectedSemesterId && (
              isSemesterActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-500 border border-gray-200">
                  <Lock size={11} />
                  Nonaktif
                </span>
              )
            )}
          </div>
        )}

        {selectedTahunAjaranId !== null && selectedSemesterId !== null && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold whitespace-nowrap" style={labelColor}>
              Kelas
            </label>
            <select
              value={selectedKelasId ?? ''}
              onChange={(e) => handleKelasChange(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200 min-w-[190px]"
            >
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedTahunAjaranId === null ? (
        <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
          <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
            <CalendarRange size={30} className="text-gray-300" />
            <p className="text-sm font-bold text-gray-500">Pilih Tahun Ajaran Terlebih Dahulu</p>
          </div>
        </div>
      ) : selectedSemesterId === null ? (
        <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
          <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
            <BookOpen size={30} className="text-gray-300" />
            <p className="text-sm font-bold text-gray-500">Pilih Semester Terlebih Dahulu</p>
          </div>
        </div>
      ) : selectedKelasId === null ? (
        <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
          <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
            <BookOpen size={30} className="text-gray-300" />
            <p className="text-sm font-bold text-gray-500">Pilih Kelas Terlebih Dahulu</p>
          </div>
        </div>
      ) : (
        <>
          {/* ═══ KONTEN DATA ═══ */}
          {loading ? (
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
              <div className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </div>
              </div>
            </div>
          ) : !dataPerKelas ? (
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
              <div className="m-5 sm:m-6 py-12 text-center rounded-2xl flex flex-col items-center gap-2" style={{ background: '#fafafa', border: '2px dashed #e5e5e5' }}>
                <p className="text-sm font-bold text-gray-500">Data tidak ditemukan</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* CARD: Info Kelas */}
              <div className="card-flat bg-white rounded-2xl px-5 py-4 anim-in d3" style={CARD_STYLE}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Kelas {dataPerKelas.kelas.nama_kelas}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {dataPerKelas.kelas.tahun_ajaran} • {dataPerKelas.kelas.semester} • {dataPerKelas.kelas.is_aktif ? 'Aktif' : 'Non-Aktif'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Guru Kelas</p>
                    <p className="font-semibold text-gray-800">{dataPerKelas.wali_kelas?.nama || '—'}</p>
                  </div>
                </div>
              </div>

              {/* CARD: MAPEL WAJIB — grid, kolom disamakan persis dengan Mapel Pilihan via pembelajaranGridCols */}
              <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d4" style={CARD_STYLE}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: BRAND_GRADIENT }}>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-white" />
                    <h4 className="text-sm font-bold text-white">Mata Pelajaran Wajib</h4>
                  </div>
                  {isSemesterActive && (
                    <button
                      onClick={() => {
                        setSelectedMapelWajibIds([]);
                        setShowModalWajib(true);
                      }}
                      className="btn-action inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                    >
                      <Plus size={14} />
                      Tambah Mapel Wajib
                    </button>
                  )}
                </div>

                {dataPerKelas.mapel_wajib.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 bg-white">
                    Belum ada mapel wajib yang ditugaskan
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div style={{ width: '100%', minWidth: '650px' }}>
                      {/* Header — lebar kolom sama persis dengan tabel Mapel Pilihan di bawahnya */}
                      <div className="grid" style={{ gridTemplateColumns: pembelajaranGridCols, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <div className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 flex items-center justify-center">No</div>
                        <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 flex items-center">Kode</div>
                        <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 flex items-center">Mata Pelajaran</div>
                        <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 flex items-center">Guru Pengampu</div>
                        {isSemesterActive && (
                          <div className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 flex items-center justify-center">Aksi</div>
                        )}
                      </div>

                      {/* Body */}
                      {dataPerKelas.mapel_wajib.map((mp, idx) => (
                        <div key={`wajib-${idx}-${mp.id}`}
                          className="grid row-in row-hover transition-colors"
                          style={{
                            gridTemplateColumns: pembelajaranGridCols,
                            borderBottom: '1px solid #f0f0f0',
                            background: '#fff',
                            animationDelay: `${Math.min(idx, 8) * 0.03}s`,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                          <div className="px-5 py-3 flex items-center justify-center text-center text-gray-400">{idx + 1}</div>
                          <div className="px-5 py-3 flex items-center font-bold" style={{ color: ACCENT_DARK }}>{mp.kode_mapel}</div>
                          <div className="px-5 py-3 flex items-center font-bold text-gray-900">{mp.nama_mapel}</div>
                          <div className="px-5 py-3 flex items-center text-gray-700">{mp.nama_guru}</div>
                          {isSemesterActive && (
                            <div className="px-5 py-3 flex items-center justify-center">
                              <ActionButton size="sm" variant="danger" onClick={() => handleDelete(mp.id, mp.nama_mapel, mp.nama_guru)} title="Hapus penugasan">
                                <Trash2 size={13} /> Hapus
                              </ActionButton>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD: MAPEL PILIHAN — grid, kolom disamakan persis dengan Mapel Wajib via pembelajaranGridCols */}
              <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d5" style={CARD_STYLE}>
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: BRAND_GRADIENT }}>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-white" />
                    <h4 className="text-sm font-bold text-white">Mata Pelajaran Pilihan</h4>
                  </div>
                  {isSemesterActive && (
                    <button
                      onClick={() => {
                        setFormDataPilihan({ user_id: '', mapel_id: '' });
                        setErrorsPilihan({});
                        setShowModalPilihan(true);
                      }}
                      className="btn-action inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                    >
                      <Plus size={14} />
                      Tambah Mapel Pilihan
                    </button>
                  )}
                </div>

                {dataPerKelas.mapel_pilihan.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 bg-white">
                    Belum ada mapel pilihan yang ditugaskan
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div style={{ width: '100%', minWidth: '650px' }}>
                      {/* Header — lebar kolom sama persis dengan tabel Mapel Wajib di atasnya */}
                      <div className="grid" style={{ gridTemplateColumns: pembelajaranGridCols, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <div className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 flex items-center justify-center">No</div>
                        <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 flex items-center">Kode</div>
                        <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 flex items-center">Mata Pelajaran</div>
                        <div className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 flex items-center">Guru Pengampu</div>
                        {isSemesterActive && (
                          <div className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 flex items-center justify-center">Aksi</div>
                        )}
                      </div>

                      {/* Body */}
                      {dataPerKelas.mapel_pilihan.map((mp, idx) => (
                        <div key={`pilihan-${idx}-${mp.id}`}
                          className="grid row-in row-hover transition-colors"
                          style={{
                            gridTemplateColumns: pembelajaranGridCols,
                            borderBottom: '1px solid #f0f0f0',
                            background: '#fff',
                            animationDelay: `${Math.min(idx, 8) * 0.03}s`,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                          <div className="px-5 py-3 flex items-center justify-center text-center text-gray-400">{idx + 1}</div>
                          <div className="px-5 py-3 flex items-center font-bold" style={{ color: ACCENT_DARK }}>{mp.kode_mapel}</div>
                          <div className="px-5 py-3 flex items-center font-bold text-gray-900">{mp.nama_mapel}</div>
                          <div className="px-5 py-3 flex items-center text-gray-700">{mp.nama_guru}</div>
                          {isSemesterActive && (
                            <div className="px-5 py-3 flex items-center justify-center">
                              <div className="flex justify-center gap-1.5">
                                <ActionButton size="sm" variant="warning" onClick={() => openFormEdit(mp)} title="Edit guru pengampu">
                                  <Pencil size={13} /> Edit
                                </ActionButton>
                                <ActionButton size="sm" variant="danger" onClick={() => handleDelete(mp.id, mp.nama_mapel, mp.nama_guru)} title="Hapus penugasan">
                                  <Trash2 size={13} /> Hapus
                                </ActionButton>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}