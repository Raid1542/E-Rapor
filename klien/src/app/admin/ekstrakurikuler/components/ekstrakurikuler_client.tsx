/**
 * Nama File: data_ekstrakurikuler_client.tsx
 * Fungsi: Komponen utama halaman Data Ekstrakurikuler untuk admin.
 *         Menyediakan fitur CRUD ekstrakurikuler PER SEMESTER
 * Update:
 *   - Tambah dropdown Semester (TA → Semester → CRUD)
 *   - Kirim semester_id ke semua API call
 *   - Validasi semester aktif
 *   - REFACTOR: Struktur 3 card terpisah (TA+Semester, Toolbar, Tabel)
 *   - REFACTOR: Buttons konsisten dengan BtnBatal dan BtnReset
 *   - REFACTOR: Modal handling sesuai dengan data_mata_pelajaran_client
 *   - UPDATE: Tambah animasi fadeInUp + hover lift konsisten dengan Data Admin
 *   - 🎨 RESTYLE: Disamakan dengan design system Data Pembina Ekskul & Data
 *     Pembelajaran — kartu abu netral (#f6f7f9 / border #ececec), gradient
 *     header BRAND_GRADIENT, sistem ActionButton (primary/neutral/warning/
 *     danger/info), animasi anim-in/row-hover/btn-action yang konsisten.
 *     TIDAK ADA PERUBAHAN LOGIKA: seluruh state, effect, handler, dan
 *     endpoint API tetap identik dengan versi sebelumnya.
 *   - 🩹 FIX: Dropdown "Pembina Ekstrakurikuler" sebelumnya memakai <select>
 *     native, yang bisa membuka opsi ke ATAS (perilaku bawaan browser saat
 *     ruang di bawah dianggap kurang) sehingga menabrak/menutupi header modal.
 *     Diganti dengan dropdown kustom (PembinaDropdown) yang SELALU membuka
 *     ke bawah dengan tinggi maksimum + scroll. Secara fungsi tetap sama
 *     persis — hanya mengubah tampilan/posisi panel opsi, bukan cara data
 *     pembina_id disimpan atau divalidasi.
 *   - 🩹 FIX 2: Tabel data ekstrakurikuler sebelumnya memakai <table> native
 *     tanpa lebar kolom eksplisit yang sama antara header dan body, sehingga
 *     kolom header (gradient oranye) tidak sejajar dengan isi baris —
 *     terutama kolom Aksi yang "menggantung" jauh ke kanan dengan banyak
 *     ruang kosong. Diganti dengan tabel berbasis CSS grid (GRID_COLS_EKSKUL)
 *     yang dipakai identik oleh header maupun setiap baris, sama seperti pola
 *     di Data Guru/Admin/Siswa, sehingga kolom selalu sejajar dan rapi.
 */

'use client';
import { useState, useEffect, useRef, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users, Lock, CalendarRange, RotateCcw, ChevronDown } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
}

interface Ekstrakurikuler {
  id_ekskul: number;
  nama_ekskul: string;
  pembina_id: number | null;
  nama_pembina: string | null;
  jumlah_siswa: number;
  tahun_ajaran_id: number;
}

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  is_aktif: boolean;
}

interface SemesterOption {
  id: number;
  semester: string;
  is_aktif: boolean;
}

interface Pembina {
  id: number;
  nama: string;
}

interface PesertaEkskul {
  id_siswa: number;
  nis: string;
  nisn: string;
  nama: string;
  nama_kelas: string;
}

interface FormDataType {
  nama_ekskul: string;
  pembina_id: string;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Disamakan persis dengan data_pembina_ekskul_client.tsx & data_pembelajaran_client.tsx.

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

/* Kolom grid tabel — dipakai identik oleh header dan setiap baris agar
   selalu sejajar (pola sama seperti Data Guru/Admin/Siswa). */
const GRID_COLS_EKSKUL = 'minmax(56px,0.5fr) minmax(200px,2.2fr) minmax(160px,1.6fr) minmax(130px,1.1fr) minmax(280px,2.4fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

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

    .dg-shimmer {
        background: linear-gradient(90deg, #f7f7f7 0%, #efefef 50%, #f7f7f7 100%);
        background-size: 800px 100%;
        animation: dg-shimmer-move 1.3s ease-in-out infinite;
    }
    @keyframes dg-shimmer-move { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

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
        .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .btn-action, .card-flat, .row-hover, .dg-shimmer {
            animation: none !important;
            transition: none !important;
        }
    }
  `}</style>
);

// ─── SISTEM TOMBOL AKSI (disamakan dengan Data Pembina Ekskul / Data Pembelajaran) ───

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
        <p className="text-sm text-gray-500 leading-relaxed mt-1 whitespace-pre-line">{message}</p>
      </div>
      <div className="flex gap-2.5 w-full mt-1">
        <ActionButton variant="neutral" onClick={onCancel} fullWidth>Batal</ActionButton>
        <ActionButton variant="primary" onClick={onConfirm} fullWidth>Ya, Hapus</ActionButton>
      </div>
    </div>
  </div>
);

// ─── MODAL LIHAT PESERTA ─────────────────────────────────────────────────────

const ModalLihatPeserta = ({
  ekskul,
  peserta,
  loading,
  onClose
}: {
  ekskul: Ekstrakurikuler | null;
  peserta: PesertaEkskul[];
  loading: boolean;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 dg-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col dg-scaleIn overflow-hidden" style={CARD_STYLE}>
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: BRAND_GRADIENT }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Peserta: {ekskul?.nama_ekskul}</h3>
            <p className="text-xs text-white/80">Pembina: {ekskul?.nama_pembina || '—'}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <X size={16} className="text-white" />
        </button>
      </div>

      <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ background: '#fff8f2', borderBottom: '1px solid #fde0c8' }}>
        <span className="text-sm font-bold" style={labelColor}>
          Total: <span style={{ color: ACCENT_DARK }}>{peserta.length}</span> siswa
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
              <p className="text-sm text-gray-400">Memuat data...</p>
            </div>
          </div>
        ) : peserta.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-semibold">Belum ada peserta</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm border-collapse bg-white">
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-12">No</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-24">NIS</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-32">NISN</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600">Nama Siswa</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-24">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {peserta.map((p, idx) => (
                  <tr key={p.id_siswa} className="row-hover transition-colors" style={{ borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <td className="px-5 py-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3 font-mono text-sm text-gray-700">{p.nis}</td>
                    <td className="px-5 py-3 font-mono text-sm text-gray-700">{p.nisn || '—'}</td>
                    <td className="px-5 py-3 font-bold text-gray-900">{p.nama}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: '#fff5eb', color: ACCENT_DARK, border: '1px solid #fde0c8' }}>
                        {p.nama_kelas || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="px-6 py-4 flex justify-end flex-shrink-0" style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
        <ActionButton variant="neutral" onClick={onClose}>Tutup</ActionButton>
      </div>
    </div>
  </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";

// ─── DROPDOWN KUSTOM PEMBINA ──────────────────────────────────────────────────
// Menggantikan <select> native khusus untuk field "Pembina Ekstrakurikuler".
// <select> native bisa membuka opsi ke ATAS bila browser menganggap ruang di
// bawah kurang — pada modal ini itu menabrak/menutupi header. Dropdown kustom
// ini SELALU membuka panel ke bawah (top-full) dengan tinggi maksimum + scroll,
// jadi tidak pernah menabrak elemen di atasnya. Perilaku datanya identik: tetap
// memanggil onChange dengan string id pembina (atau '' untuk "Tidak ada").
const PembinaDropdown = ({
  value, options, onChange, hasError = false,
}: {
  value: string;
  options: Pembina[];
  onChange: (v: string) => void;
  hasError?: boolean;
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
        onClick={() => setOpen(o => !o)}
        className={`${hasError ? inputErrCls : inputCls} flex items-center justify-between cursor-pointer`}
      >
        <span className={selected ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {selected ? selected.nama : '-- Pilih Pembina --'}
        </span>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: ACCENT }} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-white overflow-y-auto dg-scaleIn scrollbar-thin"
          style={{ ...CARD_STYLE, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', maxHeight: '400px' }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3.5 py-2.5 text-sm text-gray-400 hover:bg-orange-50/60 transition-colors"
          >
            -- Pilih Pembina --
          </button>
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(String(o.id)); setOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-gray-800 hover:bg-orange-50/60 transition-colors"
              style={String(o.id) === value ? { background: '#fff5eb', color: ACCENT_DARK, fontWeight: 700 } : {}}
            >
              {o.nama}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataEkstrakurikulerPage() {
  const { showSessionExpired, handleLogout } = useSession();
  const [ekskulList, setEkskulList] = useState<Ekstrakurikuler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // State untuk dropdown Tahun Ajaran & Semester
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [isSemesterActive, setIsSemesterActive] = useState<boolean>(false);

  const [pembinaList, setPembinaList] = useState<Pembina[]>([]);

  // Modal Lihat Peserta
  const [showLihatPeserta, setShowLihatPeserta] = useState(false);
  const [selectedEkskul, setSelectedEkskul] = useState<Ekstrakurikuler | null>(null);
  const [pesertaList, setPesertaList] = useState<PesertaEkskul[]>([]);
  const [loadingPeserta, setLoadingPeserta] = useState(false);

  // Modal konfirmasi tambah/edit
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'add' | 'edit' | null>(null);

  // Modal konfirmasi hapus
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

  const [formData, setFormData] = useState<FormDataType>({
    nama_ekskul: '', pembina_id: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  const initialFormDataRef = useRef<FormDataType | null>(null);

  // ── Fetches ────────────────────────────────────────────────────────────────

  const fetchTahunAjaran = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const uniqueTA = Array.from(
          new Map(data.data.map((item: any) => [item.id_induk, {
            id: item.id_induk,
            tahun_ajaran: item.tahun_ajaran,
            is_aktif: item.status === 'AKTIF'
          }])).values()
        );

        setTahunAjaranList(uniqueTA);

        const savedTA = localStorage.getItem('ekskul_selectedTA');
        if (savedTA) {
          const savedId = Number(savedTA);
          setSelectedTahunAjaranId(savedId);
          fetchSemesterByTahunAjaran(savedId);
        }
      }
    } catch (err) {
      console.error('Error fetch tahun ajaran:', err);
    }
  };

  const fetchSemesterByTahunAjaran = async (idInduk: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/admin/semester-list', {
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

        const savedSemester = localStorage.getItem('ekskul_selectedSemester');
        if (savedSemester) {
          const savedId = Number(savedSemester);
          const sem = semesters.find(s => s.id === savedId);
          if (sem) {
            setSelectedSemesterId(savedId);
            setIsSemesterActive(sem.is_aktif);
            setLoading(true);
            fetchEkskul(savedId);
            return;
          }
        }

        setSelectedSemesterId(null);
        setIsSemesterActive(false);
        setEkskulList([]);
      }
    } catch (err) {
      console.error('Error fetch semester:', err);
    }
  };

  const fetchPembinaList = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/admin/ekstrakurikuler/pembina-dropdown', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPembinaList(data.data || []);
      }
    } catch {
      console.error('Error fetch pembina');
    }
  };

  const fetchEkskul = async (semesterId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler?semester_id=${semesterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEkskulList(data.data || []);
      } else {
        setEkskulList([]);
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan.' });
      }
    } catch {
      setEkskulList([]);
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPesertaByEkskul = async (ekskulId: number) => {
    if (!selectedSemesterId) {
      showModal({ type: 'warning', title: 'Error', message: 'Semester belum dipilih.' });
      return;
    }

    setLoadingPeserta(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
        return;
      }

      const res = await fetch(
        `http://localhost:5000/api/admin/ekstrakurikuler/${ekskulId}/anggota?semester_id=${selectedSemesterId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Response tidak valid');
      }

      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Operasi gagal');
      }

      let peserta: PesertaEkskul[] = [];
      if (data.data) {
        if (Array.isArray(data.data)) {
          peserta = data.data;
        } else if (data.data.peserta && Array.isArray(data.data.peserta)) {
          peserta = data.data.peserta;
        } else if (Array.isArray(data.data.data)) {
          peserta = data.data.data;
        }
      }

      setPesertaList(peserta);
    } catch (err: any) {
      console.error('Error fetch peserta:', err);
      showModal({
        type: 'error',
        title: 'Gagal Memuat Peserta',
        message: err.message || 'Tidak dapat memuat data peserta.'
      });
      setPesertaList([]);
    } finally {
      setLoadingPeserta(false);
    }
  };

  useEffect(() => {
    fetchTahunAjaran();
    fetchPembinaList();
  }, []);

  // ── Form Handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.nama_ekskul?.trim()) ne.nama_ekskul = 'Nama ekstrakurikuler wajib diisi';
    setErrors(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
      return false;
    }
    return true;
  };

  const openConfirmModal = (action: 'add' | 'edit') => {
    if (!validate()) return;

    if (action === 'edit' && initialFormDataRef.current) {
      const initial = initialFormDataRef.current;
      const hasChanges =
        formData.nama_ekskul !== initial.nama_ekskul ||
        formData.pembina_id !== initial.pembina_id;

      if (!hasChanges) {
        showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
        return;
      }
    }

    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeTambah = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedSemesterId) {
      showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi tidak valid.' });
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/admin/ekstrakurikuler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_ekskul: formData.nama_ekskul.trim(),
          pembina_id: formData.pembina_id ? Number(formData.pembina_id) : null,
          semester_id: selectedSemesterId,
        }),
      });

      const result = await res.json();
      if (res.ok && (result.success || res.status === 201)) {
        setShowTambah(false);
        handleReset();
        fetchEkskul(selectedSemesterId);
        showModal({ type: 'success', title: 'Berhasil Ditambahkan!', message: result.message || 'Ekstrakurikuler berhasil ditambahkan.' });
      } else {
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
  };

  const executeEdit = async () => {
    if (!editId) return;

    const token = localStorage.getItem('token');
    if (!token || !selectedSemesterId) {
      showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi tidak valid.' });
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_ekskul: formData.nama_ekskul.trim(),
          pembina_id: formData.pembina_id ? Number(formData.pembina_id) : null,
          semester_id: selectedSemesterId,
        }),
      });

      const result = await res.json();
      if (res.ok && (result.success || res.status === 200)) {
        setShowEdit(false);
        setEditId(null);
        handleReset();
        fetchEkskul(selectedSemesterId);
        showModal({ type: 'success', title: 'Data Diperbarui!', message: result.message || 'Data berhasil diperbarui.' });
      } else {
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
  };

  const handleEdit = (ekskul: Ekstrakurikuler) => {
    const initialData: FormDataType = {
      nama_ekskul: ekskul.nama_ekskul,
      pembina_id: ekskul.pembina_id ? String(ekskul.pembina_id) : '',
    };
    setEditId(ekskul.id_ekskul);
    setFormData(initialData);
    initialFormDataRef.current = { ...initialData };
    setShowEdit(true);
  };

  const handleDelete = (id: number, namaEkskul: string) => {
    showConfirm(`Apakah Anda yakin ingin menghapus "${namaEkskul}"? Tindakan ini tidak dapat dibatalkan.`, async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
        return;
      }

      if (!selectedSemesterId) {
        showModal({ type: 'warning', title: 'Error', message: 'Semester belum dipilih.' });
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler/${id}?semester_id=${selectedSemesterId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        let result;
        try {
          result = await res.json();
        } catch {
          throw new Error('Response tidak valid');
        }

        if (!res.ok) {
          throw new Error(result.message || `HTTP ${res.status}`);
        }

        fetchEkskul(selectedSemesterId);
        showModal({
          type: 'success',
          title: 'Berhasil Dihapus!',
          message: result.message || `Ekstrakurikuler "${namaEkskul}" berhasil dihapus.`
        });
      } catch (err: any) {
        console.error('Error delete:', err);
        showModal({
          type: 'error',
          title: 'Gagal Menghapus',
          message: err.message || 'Tidak dapat menghapus data.'
        });
      }
    });
  };

  const handleLihatPeserta = (ekskul: Ekstrakurikuler) => {
    setSelectedEkskul({
      id_ekskul: ekskul.id_ekskul,
      nama_ekskul: ekskul.nama_ekskul,
      pembina_id: ekskul.pembina_id,
      nama_pembina: ekskul.nama_pembina,
      jumlah_siswa: ekskul.jumlah_siswa,
      tahun_ajaran_id: ekskul.tahun_ajaran_id,
    });
    setPesertaList([]);
    setShowLihatPeserta(true);
    fetchPesertaByEkskul(ekskul.id_ekskul);
  };

  const handleReset = () => {
    setFormData({ nama_ekskul: '', pembina_id: '' });
    setErrors({});
  };

  // ── Filtering & Pagination ─────────────────────────────────────────────────

  const filteredEkskul = ekskulList.filter((e) => {
    const query = searchQuery.toLowerCase().trim();
    return !query ||
      e.nama_ekskul.toLowerCase().includes(query) ||
      (e.nama_pembina && e.nama_pembina.toLowerCase().includes(query));
  });

  const totalPages = Math.max(1, Math.ceil(filteredEkskul.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEkskul = filteredEkskul.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages: ReactNode[] = [];
    const btnBase = "min-w-[30px] h-8 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold border-2 transition-colors btn-action";
    const btnActive = "text-white border-transparent";
    const btnInactive = "text-gray-600 border-transparent hover:bg-orange-50 bg-transparent";

    const range: number[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) range.push(i); }
    else {
      range.push(1);
      if (currentPage > 3) range.push(-1);
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) range.push(i);
      if (currentPage < totalPages - 2) range.push(-2);
      range.push(totalPages);
    }

    range.forEach((p) => {
      if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
      else {
        pages.push(
          <button key={p} onClick={() => setCurrentPage(p)}
            className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
            style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}
          >{p}</button>
        );
      }
    });

    return pages;
  };

  // ── Render Form (Tambah / Edit) ────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-3 sm:p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

      <div className="mb-4 sm:mb-5 anim-in d1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Ekstrakurikuler</h1>
        <p className="text-xs sm:text-sm mt-1 text-gray-500">
          {isEdit ? 'Edit' : 'Tambah'} Data Ekstrakurikuler
        </p>
      </div>

      <div className="card-flat bg-white rounded-2xl max-w-2xl mx-auto anim-in d2" style={CARD_STYLE}>
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
          </h2>
          <button
            onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>
              Nama Ekstrakurikuler <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama_ekskul"
              value={formData.nama_ekskul}
              onChange={handleInputChange}
              placeholder="Contoh: Pramuka, Futsal, PMR"
              className={errors.nama_ekskul ? inputErrCls : inputCls}
            />
            {errors.nama_ekskul && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nama_ekskul}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>
              Pembina Ekstrakurikuler
            </label>
            <PembinaDropdown
              value={formData.pembina_id}
              options={pembinaList}
              onChange={(v) => {
                setFormData(prev => ({ ...prev, pembina_id: v }));
                if (errors.pembina_id) setErrors(prev => ({ ...prev, pembina_id: '' }));
              }}
            />
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col sm:flex-row justify-end gap-2.5 rounded-b-2xl" style={{ borderTop: '1px solid #f0e0d0', background: '#fafafa' }}>
          <ActionButton variant="neutral" onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>
            Batal
          </ActionButton>
          <ActionButton variant="info" onClick={handleReset}>
            <RotateCcw size={15} /> Reset
          </ActionButton>
          <ActionButton variant="primary" onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}>
            {isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </ActionButton>
        </div>
      </div>

      {/* Modal Konfirmasi Simpan (Tambah/Edit) */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} className="text-orange-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'} Data
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
              {confirmAction === 'add'
                ? 'Apakah Anda yakin ingin menambahkan ekstrakurikuler ini?'
                : 'Apakah Anda yakin ingin mengubah data ekstrakurikuler ini?'}
            </p>

            <div className="flex gap-2.5">
              <ActionButton variant="neutral" onClick={() => setShowConfirmModal(false)} fullWidth>Batal</ActionButton>
              <ActionButton
                variant="primary"
                fullWidth
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmAction === 'add') {
                    executeTambah();
                  } else {
                    executeEdit();
                  }
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

  if (showTambah) return renderForm(false);
  if (showEdit) return renderForm(true);

  // ── HALAMAN UTAMA — 3 Card Terpisah ────────────────────────────────────────

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
      {showLihatPeserta && (
        <ModalLihatPeserta
          ekskul={selectedEkskul}
          peserta={pesertaList}
          loading={loadingPeserta}
          onClose={() => setShowLihatPeserta(false)}
        />
      )}

      <div className="mb-4 sm:mb-5 anim-in d1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Ekstrakurikuler</h1>
        <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data kegiatan ekstrakurikuler per semester</p>
      </div>

      {/* ====================================================================
          CARD 1: Pilih Tahun Ajaran + Semester
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
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedTahunAjaranId(null);
                  setSelectedSemesterId(null);
                  setIsSemesterActive(false);
                  setSemesterOptions([]);
                  setEkskulList([]);
                  setLoading(false);
                  localStorage.removeItem('ekskul_selectedTA');
                  localStorage.removeItem('ekskul_selectedSemester');
                  return;
                }
                const id = Number(value);
                setSelectedTahunAjaranId(id);
                setSelectedSemesterId(null);
                setIsSemesterActive(false);
                setEkskulList([]);
                localStorage.setItem('ekskul_selectedTA', id.toString());
                localStorage.removeItem('ekskul_selectedSemester');
                setLoading(true);
                fetchSemesterByTahunAjaran(id);
              }}
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
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedSemesterId(null);
                  setIsSemesterActive(false);
                  setEkskulList([]);
                  localStorage.removeItem('ekskul_selectedSemester');
                  return;
                }
                const id = Number(value);
                const selectedSem = semesterOptions.find(s => s.id === id);
                setSelectedSemesterId(id);
                setIsSemesterActive(selectedSem?.is_aktif || false);
                localStorage.setItem('ekskul_selectedSemester', id.toString());
                setLoading(true);
                fetchEkskul(id);
              }}
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
            <CalendarRange size={30} className="text-gray-300" />
            <p className="text-sm font-bold text-gray-500">Pilih Semester Terlebih Dahulu</p>
          </div>
        </div>
      ) : (
        <>
          {/* ====================================================================
              CARD 2: Toolbar — Tambah Ekstrakurikuler + Tampilkan data + Search
          ==================================================================== */}
          <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d3" style={CARD_STYLE}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex-shrink-0">
                {isSemesterActive ? (
                  <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                    <Plus size={16} /> <span className="hidden sm:inline">Tambah Ekstrakurikuler</span><span className="sm:hidden">Tambah</span>
                  </ActionButton>
                ) : (
                  <span className="text-xs text-gray-400 italic">Semester ini tidak aktif</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari ekskul / pembina..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Bersihkan pencarian"
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute inset-y-0 right-2.5 flex items-center"
                      style={{ color: ACCENT }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================================
              CARD 3: Tabel data ekstrakurikuler — berbasis CSS grid, kolom
              header & body memakai GRID_COLS_EKSKUL yang identik sehingga
              selalu sejajar (memperbaiki tabel native yang sebelumnya renggang
              tidak rata pada kolom Aksi).
          ==================================================================== */}
          <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d4" style={CARD_STYLE}>
            <div className="px-4 sm:px-5 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
              <p className="text-xs font-medium text-gray-500">
                Menampilkan {filteredEkskul.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredEkskul.length)} dari {filteredEkskul.length} data
              </p>
            </div>

            <div className="overflow-x-auto">
              <div style={{ width: '100%', minWidth: '850px' }}>
                {/* Header */}
                <div className="grid" style={{ gridTemplateColumns: GRID_COLS_EKSKUL, background: BRAND_GRADIENT }}>
                  <div className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                  <div className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama Ekstrakurikuler</div>
                  <div className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Pembina</div>
                  <div className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Jumlah Siswa</div>
                  <div className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                </div>

                {/* Body */}
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS_EKSKUL, borderColor: '#f0f0f0' }}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <div key={j} className="px-4 py-4 flex items-center justify-center">
                          <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '60%' }} />
                        </div>
                      ))}
                    </div>
                  ))
                ) : currentEkskul.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    {searchQuery ? 'Tidak ada data yang cocok' : 'Belum ada data ekstrakurikuler'}
                  </div>
                ) : (
                  currentEkskul.map((ekskul, index) => (
                    <div
                      key={ekskul.id_ekskul}
                      className="grid row-in row-hover border-b transition-colors"
                      style={{
                        gridTemplateColumns: GRID_COLS_EKSKUL,
                        borderColor: '#f0f0f0',
                        background: '#fff',
                        animationDelay: `${Math.min(index, 8) * 0.03}s`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <div className="px-4 py-3.5 flex items-center justify-center text-center text-gray-400">{startIndex + index + 1}</div>

                      <div className="px-4 py-3.5 flex items-center overflow-hidden">
                        <p className="font-bold text-gray-900 truncate" title={ekskul.nama_ekskul}>{ekskul.nama_ekskul}</p>
                      </div>

                      <div className="px-4 py-3.5 flex items-center overflow-hidden">
                        {ekskul.nama_pembina ? (
                          <p className="text-gray-700 truncate" title={ekskul.nama_pembina}>{ekskul.nama_pembina}</p>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Belum ditetapkan</span>
                        )}
                      </div>

                      <div className="px-4 py-3.5 flex items-center justify-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          {ekskul.jumlah_siswa || 0} siswa
                        </span>
                      </div>

                      <div className="px-4 py-3.5 flex items-center justify-center">
                        <div className="flex justify-center flex-wrap gap-1.5">
                          <ActionButton size="sm" variant="info" onClick={() => handleLihatPeserta(ekskul)} title="Lihat siswa">
                            <Users size={13} /> Lihat Siswa
                          </ActionButton>
                          {isSemesterActive && (
                            <>
                              <ActionButton size="sm" variant="warning" onClick={() => handleEdit(ekskul)} title="Edit data">
                                <Pencil size={13} /> Edit
                              </ActionButton>
                              <ActionButton size="sm" variant="danger" onClick={() => handleDelete(ekskul.id_ekskul, ekskul.nama_ekskul)} title="Hapus data">
                                <Trash2 size={13} /> Hapus
                              </ActionButton>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
              <span className="text-xs font-medium text-gray-500">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">{renderPagination()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}