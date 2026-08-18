'use client';

import { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  Eye, Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff,
  ShieldAlert, LogOut, Lock, BookOpen, Award, Save, Unlock,
  Calendar, Upload, Download, ChevronLeft, ChevronRight, Users,
  User,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ Deploy-ready: URL API diambil dari environment variable, fallback ke localhost saat dev
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const GURU_KELAS_BASE = `${API_BASE_URL}/api/guru-kelas`;

// Konstanta untuk kode error
const ERROR_CODES = {
  NOT_ASSIGNED: 'NOT_ASSIGNED',
  KATEGORI_BELUM_DIATUR: 'KATEGORI_BELUM_DIATUR',
};

// Types
// ✅ PERBAIKAN: tambahkan tipe 'confirm' supaya popup konfirmasi memakai
// sistem notifikasi yang SAMA dengan data_guru_client.tsx (bukan modal
// terpisah seperti sebelumnya yang membuat tampilan tidak konsisten).
type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface GradeConfig {
  id_kategori_grade_kokurikuler: number;
  id_aspek_kokurikuler: number;
  rentang_min: number;
  rentang_max: number;
  min_nilai?: number;
  max_nilai?: number;
  grade: string;
  deskripsi: string;
}

interface NilaiAspek {
  nilai: number | null;
  grade: string | null;
  deskripsi: string | null;
}

interface SiswaKokurikuler {
  id: number;
  nama: string;
  nis: string;
  nisn: string;
  nilai: Record<number, NilaiAspek>;
}

interface JudulProyek {
  id_judul_proyek: number | null;
  judul: string;
  deskripsi?: string;
}

interface AspekInfo {
  id: number;
  nama: string;
  celah?: string[];
}

interface KategoriStatus {
  configured: boolean;
  aspek_tanpa_kategori: AspekInfo[];
  aspek_dengan_celah?: AspekInfo[];
  jenis_penilaian: string | null;
  semester?: string;
  message: string;
}

// Mapping ID aspek (sesuai database)
const ASPEK_ID = {
  mutabaah: 5,
  bpi: 2,
  literasi: 4,
  proyek: 3,
};

// Daftar aspek kokurikuler
const DAFTAR_ASPEK = [
  { id: ASPEK_ID.mutabaah, nama: "Mutaba'ah Yaumiyah", kode: 'MUTABAAH' },
  { id: ASPEK_ID.bpi, nama: 'Mentoring BPI', kode: 'BPI' },
  { id: ASPEK_ID.literasi, nama: 'Literasi', kode: 'LITERASI' },
  { id: ASPEK_ID.proyek, nama: 'Penilaian Proyek', kode: 'PROYEK' },
];

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan data_guru_client.tsx
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const GRID_COLS = 'minmax(48px,0.5fr) minmax(170px,2.2fr) minmax(80px,0.9fr) minmax(80px,0.9fr) minmax(90px,1fr) minmax(70px,0.8fr) minmax(80px,0.9fr) minmax(80px,0.9fr) minmax(170px,1.7fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   GLOBAL STYLES — identik dengan data_guru_client.tsx
   ========================================================================== */

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    @keyframes dg-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
    .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
    .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }
    .dg-shimmer {
        background: linear-gradient(90deg, #f7f7f7 0%, #efefef 50%, #f7f7f7 100%);
        background-size: 800px 100%;
        animation: dg-shimmer 1.3s ease-in-out infinite;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0);   }
    }
    .anim-in { animation: fadeInUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
    .d1 { animation-delay: 0.02s; }
    .d2 { animation-delay: 0.06s; }
    .d3 { animation-delay: 0.10s; }
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

    .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c9a0; border-radius: 10px; }

    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
        outline: 2.5px solid #f5a623;
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .dg-shimmer, .btn-action, .card-flat, .row-hover {
            animation: none !important;
            transition: none !important;
        }
    }
  `}</style>
);

/* ==========================================================================
   NOTIFICATION MODAL — disamakan penuh dengan data_guru_client.tsx
   (sekarang juga menangani tipe 'confirm', menggantikan modal konfirmasi
   terpisah yang sebelumnya tampilannya tidak konsisten)
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, {
  iconBg: string;
  ring: string;
  icon: React.ReactNode;
  btn: string;
}> = {
  success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
  error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
  warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
  confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={38} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  const isConfirm = modal.type === 'confirm';
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
        <div className="dg-scaleIn contents w-full">
          {!isConfirm && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          )}
          <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>
            {s.icon}
          </div>
          <div className="text-center w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">
              {modal.message}
            </p>
          </div>
          {isConfirm ? (
            <div className="flex gap-2.5 w-full mt-1">
              <button
                onClick={onClose}
                className="btn-action flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors"
                style={{ borderColor: '#e5e7eb', color: '#4b5563', background: '#fff' }}
              >
                Batal
              </button>
              <button
                onClick={() => { modal.onConfirm?.(); onClose(); }}
                className="btn-action flex-1 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}
              >
                Lanjutkan
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}
            >
              OK, Mengerti
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   INPUT & SISTEM TOMBOL AKSI — identik dengan data_guru_client.tsx
   ========================================================================== */

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputDisabledCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-400 outline-none bg-gray-100 border-gray-200 cursor-not-allowed";

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
  info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
  warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
  neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
  success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
  accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
};

const ActionButton = ({
  onClick, children, variant = 'neutral', size = 'md', disabled = false, type = 'button', fullWidth = false, title,
}: {
  onClick?: () => void; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
  disabled?: boolean; type?: 'button' | 'submit'; fullWidth?: boolean; title?: string;
}) => {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
  return (
    <button
      type={type}
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

// Komponen utama
export default function KokurikulerClient() {
  const { showSessionExpired, handleLogout } = useSession();

  // State dasar
  const [isNotAssigned, setIsNotAssigned] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
  const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
  const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
  const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);

  // State data
  const [loading, setLoading] = useState(true);
  const [kelasNama, setKelasNama] = useState('');
  const [siswaList, setSiswaList] = useState<SiswaKokurikuler[]>([]);
  const [filteredSiswa, setFilteredSiswa] = useState<SiswaKokurikuler[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dataLoading, setDataLoading] = useState(false);

  // State konfigurasi
  const [gradeConfig, setGradeConfig] = useState<GradeConfig[]>([]);
  const [judulProyek, setJudulProyek] = useState<JudulProyek>({
    id_judul_proyek: null,
    judul: '',
  });

  // State modal
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  // State detail & edit
  const [showDetail, setShowDetail] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaKokurikuler | null>(null);
  const [editingNilai, setEditingNilai] = useState<Record<number, NilaiAspek>>({});

  const [showEdit, setShowEdit] = useState(false);
  const [editClosing, setEditClosing] = useState(false);
  const [saving, setSaving] = useState(false);

  // State judul proyek
  const [showProyekModal, setShowProyekModal] = useState(false);
  const [editingProyek, setEditingProyek] = useState<JudulProyek>({
    id_judul_proyek: null,
    judul: '',
  });
  const [savingProyek, setSavingProyek] = useState(false);

  // State import Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // State kategori kokurikuler
  const [kategoriStatus, setKategoriStatus] = useState<KategoriStatus | null>(null);
  const [kategoriLoading, setKategoriLoading] = useState(false);

  // Helper functions
  const canEditAspek = useCallback((aspekId: number): boolean => {
    if (!jenisPenilaianAktif) return false;
    if (jenisPenilaianAktif === 'PTS') return aspekId === ASPEK_ID.mutabaah;
    if (jenisPenilaianAktif === 'PAS') return true;
    return false;
  }, [jenisPenilaianAktif]);

  const canEditJudulProyek = useCallback((): boolean => {
    return jenisPenilaianAktif === 'PAS';
  }, [jenisPenilaianAktif]);

  const getAspekLockReason = useCallback((aspekId: number): string => {
    if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
    if (jenisPenilaianAktif === 'PTS' && aspekId !== ASPEK_ID.mutabaah) return 'Terkunci - PTS';
    return '';
  }, [jenisPenilaianAktif]);

  // Cek status kategori kokurikuler dari backend
  const cekStatusKategori = useCallback(async () => {
    setKategoriLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(
        `${GURU_KELAS_BASE}/kokurikuler/cek-status-kategori`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKategoriStatus(data.data);
        }
      }
    } catch (err) {
      console.error('Error cekStatusKategori:', err);
    } finally {
      setKategoriLoading(false);
    }
  }, []);

  // Fetch data awal
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showModal({
            type: 'warning',
            title: 'Sesi Tidak Valid',
            message: 'Silakan login terlebih dahulu.',
          });
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        const taRes = await fetch(
          `${GURU_KELAS_BASE}/tahun-ajaran/aktif`,
          { headers }
        );

        if (taRes.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        if (!taRes.ok) {
          throw new Error('Gagal memuat tahun ajaran');
        }

        const taData = await taRes.json();
        if (!taData.success) {
          throw new Error(taData.message || 'Gagal memuat tahun ajaran');
        }

        const { status_pts, status_pas } = taData.data;

        setStatusPTS(status_pts || 'nonaktif');
        setStatusPAS(status_pas || 'nonaktif');

        if (status_pts === 'aktif') {
          setJenisPenilaianAktif('PTS');
          setIsReadOnly(false);
          setReadOnlyReason(null);
        } else if (status_pas === 'aktif') {
          setJenisPenilaianAktif('PAS');
          setIsReadOnly(false);
          setReadOnlyReason(null);
        } else if (status_pts === 'selesai' || status_pas === 'selesai') {
          setIsReadOnly(true);
          setReadOnlyReason('locked');
          setJenisPenilaianAktif(status_pts === 'selesai' ? 'PTS' : 'PAS');
          setTimeout(() => {
            showModal({
              type: 'warning',
              title: 'Periode Penilaian Selesai',
              message:
                'Periode penilaian telah selesai dan data sudah dikunci.\n\n' +
                'Anda dapat melihat nilai siswa dalam mode baca saja (read only), ' +
                'tetapi tidak dapat mengedit.',
            });
          }, 500);
        } else {
          setIsReadOnly(true);
          setReadOnlyReason('not_open');
          setJenisPenilaianAktif(null);
          setTimeout(() => {
            showModal({
              type: 'warning',
              title: 'Periode Penilaian Belum Aktif',
              message:
                'Baik PTS maupun PAS belum dibuka oleh admin.\n\n' +
                'Anda dapat melihat nilai siswa dalam mode baca saja (read only), ' +
                'tetapi belum dapat menginput nilai.\n\n' +
                'Silakan hubungi admin untuk membuka periode penilaian.',
            });
          }, 500);
        }

        const [gradeRes, proyekRes] = await Promise.all([
          fetch(
            `${GURU_KELAS_BASE}/atur-penilaian/kategori-kokurikuler`,
            { headers }
          ),
          fetch(
            `${GURU_KELAS_BASE}/kokurikuler/judul-proyek`,
            { headers }
          ),
        ]);

        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          if (gradeData.success) {
            setGradeConfig(gradeData.data || []);
          }
        }

        if (proyekRes.ok) {
          const proyekData = await proyekRes.json();
          if (proyekData.success && proyekData.data) {
            setJudulProyek(proyekData.data);
          }
        }

        // Panggil cek status kategori
        cekStatusKategori();
      } catch (err: any) {
        showModal({
          type: 'network',
          title: 'Koneksi Gagal',
          message: err.message || 'Gagal memuat data.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showModal, cekStatusKategori]);

  // Fetch nilai siswa — mengambil SEMUA siswa di kelas ini dari server
  // (loop per halaman), bukan hanya sejumlah data yang dikembalikan
  // backend secara default.
  useEffect(() => {
    const fetchNilai = async () => {
      setDataLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const PAGE_SIZE = 100;
        let page = 1;
        let rawList: any[] = [];
        let kelasNamaHasil = '';
        const seenIds = new Set<number>();

        while (true) {
          const res = await fetch(
            `${GURU_KELAS_BASE}/kokurikuler?page=${page}&limit=${PAGE_SIZE}`,
            { headers }
          );

          if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
          }

          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Gagal memuat' }));
            if (res.status === 403 && err.code === ERROR_CODES.NOT_ASSIGNED) {
              setIsNotAssigned(true);
              return;
            }
            throw new Error(err.message || 'Gagal memuat data');
          }

          const data = await res.json();
          if (!data.success) break;

          if (data.kelas) kelasNamaHasil = data.kelas;

          const chunk: any[] = Array.isArray(data.data) ? data.data : [];

          const adaDataBaru = chunk.some(s => !seenIds.has(s.id || s.id_siswa));
          if (page > 1 && !adaDataBaru) break;

          chunk.forEach(s => seenIds.add(s.id || s.id_siswa));
          rawList = rawList.concat(chunk);

          if (chunk.length < PAGE_SIZE) break;
          page += 1;
        }

        if (kelasNamaHasil) setKelasNama(kelasNamaHasil);

        const mapped: SiswaKokurikuler[] = rawList.map((s: any) => ({
          id: s.id || s.id_siswa,
          nama: s.nama || s.nama_lengkap,
          nis: s.nis || '-',
          nisn: s.nisn || '-',
          nilai: s.nilai || {},
        }));

        setSiswaList(mapped);
        setFilteredSiswa(mapped);
        setCurrentPage(1);
      } catch (err: any) {
        showModal({
          type: 'error',
          title: 'Gagal Memuat',
          message: err.message || 'Gagal memuat data nilai.',
        });
      } finally {
        setDataLoading(false);
      }
    };

    fetchNilai();
  }, []);

  // Filter & pagination
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSiswa(siswaList);
    } else {
      const q = searchQuery.toLowerCase().trim();
      setFilteredSiswa(
        siswaList.filter(s =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.includes(q) ||
          s.nisn.includes(q)
        )
      );
    }
    setCurrentPage(1);
  }, [searchQuery, siswaList]);

  const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

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
    range.forEach(p => {
      if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
      else {
        pages.push(
          <button
            key={p}
            onClick={() => setCurrentPage(p)}
            className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
            style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}
          >
            {p}
          </button>
        );
      }
    });
    return pages;
  };

  // Helper: cari grade berdasarkan nilai
  const getGradeByNilai = (
    nilai: number | null,
    aspekId: number
  ): { grade: string | null; deskripsi: string | null } => {
    if (nilai === null || nilai === undefined) {
      return { grade: null, deskripsi: null };
    }

    const configForAspek = gradeConfig.filter((c) => c.id_aspek_kokurikuler === aspekId);

    for (const c of configForAspek) {
      const min = parseFloat(String(c.rentang_min ?? c.min_nilai));
      const max = parseFloat(String(c.rentang_max ?? c.max_nilai));

      if (!isNaN(min) && !isNaN(max) && nilai >= min && nilai <= max) {
        return { grade: c.grade, deskripsi: c.deskripsi };
      }
    }

    return { grade: null, deskripsi: null };
  };

  // Handler detail
  const handleDetail = (siswa: SiswaKokurikuler) => {
    setSelectedSiswa(siswa);
    setEditingNilai({ ...siswa.nilai });
    setShowDetail(true);
  };

  // ✅ PERBAIKAN BUG UTAMA:
  // Sebelumnya closeDetail() SELALU menghapus selectedSiswa lewat setTimeout
  // (200ms) untuk keperluan animasi tutup. Masalahnya, saat tombol "Edit
  // Nilai" di modal Detail ditekan, handleEdit() dipanggil lebih dulu untuk
  // membuka modal Edit (menyetel selectedSiswa + showEdit=true), tapi 200ms
  // kemudian closeDetail() menimpa selectedSiswa jadi null — sehingga modal
  // Edit yang baru saja terbuka otomatis ikut hilang (karena kondisi render
  // modal Edit adalah `showEdit && selectedSiswa`). Itulah kenapa tampilan
  // Edit sempat "tidak ada" dan baru muncul lagi setelah menekan Detail
  // kedua kalinya.
  // Perbaikan: closeDetail menerima parameter keepSiswa — saat transisi ke
  // Edit, data siswa TIDAK dihapus.
  const closeDetail = (keepSiswa: boolean = false) => {
    setDetailClosing(true);
    setTimeout(() => {
      setShowDetail(false);
      setDetailClosing(false);
      if (!keepSiswa) setSelectedSiswa(null);
    }, 200);
  };

  // Handler edit
  const handleEdit = (siswa: SiswaKokurikuler) => {
    if (isReadOnly) {
      if (readOnlyReason === 'locked') {
        showModal({
          type: 'warning',
          title: 'Mode Baca Saja',
          message:
            'Periode penilaian sudah selesai dan data sudah dikunci.\n\n' +
            'Anda tidak dapat mengedit nilai siswa.',
        });
      } else {
        showModal({
          type: 'warning',
          title: 'Mode Baca Saja',
          message:
            'Periode penilaian belum aktif.\n\n' +
            'Anda belum dapat mengedit nilai siswa.\n\n' +
            'Silakan tunggu admin membuka periode penilaian.',
        });
      }
      return;
    }

    if (!jenisPenilaianAktif) {
      showModal({
        type: 'warning',
        title: 'Periode Belum Aktif',
        message:
          'Periode penilaian belum aktif.\n\n' +
          'Silakan tunggu admin membuka periode penilaian.',
      });
      return;
    }

    // Cek apakah kategori sudah diatur
    if (kategoriStatus && !kategoriStatus.configured) {
      const namaAspek = kategoriStatus.aspek_tanpa_kategori
        .map(a => a.nama)
        .join(', ');
      showModal({
        type: 'warning',
        title: 'Kategori Penilaian Belum Diatur',
        message:
          `Aspek berikut belum memiliki konfigurasi grade:\n${namaAspek}\n\n` +
          `Solusi:\n` +
          `1. Buka menu "Atur Penilaian" > "Kategori Kokurikuler"\n` +
          `2. Pilih aspek yang belum diatur\n` +
          `3. Atur rentang nilai dan grade (minimal 1 kategori)\n` +
          `4. Setelah selesai, Anda dapat menginput nilai siswa`,
      });
      return;
    }

    const editableAspek = DAFTAR_ASPEK.filter(aspek => canEditAspek(aspek.id));

    if (editableAspek.length === 0) {
      showModal({
        type: 'warning',
        title: 'Tidak Ada Aspek yang Bisa Diedit',
        message:
          `Saat ini periode ${jenisPenilaianAktif} aktif.\n\n` +
          `${jenisPenilaianAktif === 'PTS'
            ? "Hanya aspek Mutaba'ah Yaumiyah yang dapat diisi.\n\n" +
            "Silakan pilih siswa lain atau tunggu periode PAS untuk mengisi aspek lainnya."
            : "Silakan hubungi administrator."}`,
      });
      return;
    }

    setSelectedSiswa(siswa);

    const initialEditingNilai: Record<number, NilaiAspek> = {};
    DAFTAR_ASPEK.forEach(aspek => {
      initialEditingNilai[aspek.id] = siswa.nilai[aspek.id] || {
        nilai: null,
        grade: null,
        deskripsi: null,
      };
    });
    setEditingNilai(initialEditingNilai);

    setShowEdit(true);

    setTimeout(() => {
      const firstEditableAspek = editableAspek[0];
      const element = document.getElementById(`aspek-${firstEditableAspek.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-orange-400');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-orange-400');
        }, 2000);
      }
    }, 100);
  };

  const closeEdit = () => {
    setEditClosing(true);
    setTimeout(() => {
      setShowEdit(false);
      setEditClosing(false);
      setSelectedSiswa(null);
    }, 200);
  };

  const handleNilaiChange = (aspekId: number, nilai: number | null) => {
    if (nilai !== null) {
      if (nilai < 0 || nilai > 100) {
        showModal({
          type: 'warning',
          title: 'Nilai Tidak Valid',
          message: 'Nilai harus antara 0 dan 100.',
        });
        return;
      }

      if (!Number.isInteger(nilai)) {
        showModal({
          type: 'warning',
          title: 'Nilai Tidak Valid',
          message: 'Nilai harus bilangan bulat (integer).',
        });
        return;
      }
    }

    setEditingNilai(prev => {
      const { grade, deskripsi } = getGradeByNilai(nilai, aspekId);
      return {
        ...prev,
        [aspekId]: {
          nilai,
          grade,
          deskripsi,
        },
      };
    });
  };

  // ✅ Konfirmasi sekarang memakai showModal({ type: 'confirm', ... })
  // supaya tampilannya konsisten dengan sistem notifikasi lainnya
  // (tidak lagi pakai modal konfirmasi terpisah).
  const openConfirmSimpan = () => {
    if (!selectedSiswa) return;

    const aspekBelumTerisi = DAFTAR_ASPEK.filter(aspek => {
      if (!canEditAspek(aspek.id)) return false;
      const nilaiData = editingNilai[aspek.id];
      return !nilaiData || nilaiData.nilai === null || nilaiData.nilai === undefined;
    });

    if (aspekBelumTerisi.length > 0) {
      showModal({
        type: 'warning',
        title: 'Nilai Belum Lengkap',
        message:
          `Aspek berikut belum diisi:\n${aspekBelumTerisi.map(a => `• ${a.nama}`).join('\n')}`,
      });
      return;
    }

    const hasChanges = DAFTAR_ASPEK.some(aspek => {
      if (!canEditAspek(aspek.id)) return false;

      const newNilai = editingNilai[aspek.id]?.nilai;
      const oldNilai = selectedSiswa.nilai[aspek.id]?.nilai;

      const newNum = (newNilai === null || newNilai === undefined) ? null : Number(newNilai);
      const oldNum = (oldNilai === null || oldNilai === undefined) ? null : Number(oldNilai);

      if (newNum === null && oldNum === null) return false;
      if (newNum === null || oldNum === null) return true;
      if (isNaN(newNum) || isNaN(oldNum)) return false;

      return newNum !== oldNum;
    });

    if (!hasChanges) {
      showModal({
        type: 'warning',
        title: 'Tidak Ada Perubahan',
        message:
          'Data yang Anda masukkan sama dengan data sebelumnya.\n\n' +
          'Silakan ubah nilai minimal satu aspek sebelum menyimpan.',
      });
      return;
    }

    showModal({
      type: 'confirm',
      title: 'Konfirmasi Penyimpanan',
      message: `Apakah Anda yakin ingin menyimpan nilai ${selectedSiswa.nama}?`,
      onConfirm: executeSimpanNilai,
    });
  };

  // Handler import
  const openImportModal = () => {
    if (!jenisPenilaianAktif) {
      showModal({
        type: 'warning',
        title: 'Periode Belum Aktif',
        message:
          'Periode penilaian belum aktif.\n\n' +
          'Silakan tunggu admin membuka periode penilaian.',
      });
      return;
    }

    if (isReadOnly) {
      showModal({
        type: 'warning',
        title: 'Mode Baca Saja',
        message:
          readOnlyReason === 'locked'
            ? 'Periode penilaian sudah selesai dan data sudah dikunci.\n\n' +
            'Anda tidak dapat mengimport nilai.'
            : 'Anda tidak dapat mengimport nilai saat ini.',
      });
      return;
    }

    // Cek apakah kategori sudah diatur
    if (kategoriStatus && !kategoriStatus.configured) {
      const namaAspek = kategoriStatus.aspek_tanpa_kategori
        .map(a => a.nama)
        .join(', ');
      showModal({
        type: 'warning',
        title: 'Kategori Penilaian Belum Diatur',
        message:
          `Aspek berikut belum memiliki konfigurasi grade:\n${namaAspek}\n\n` +
          `Solusi:\n` +
          `1. Buka menu "Atur Penilaian" > "Kategori Kokurikuler"\n` +
          `2. Pilih aspek yang belum diatur\n` +
          `3. Atur rentang nilai dan grade (minimal 1 kategori)\n` +
          `4. Setelah selesai, Anda dapat import nilai dari Excel`,
      });
      return;
    }

    setImportFile(null);
    if (importFileInputRef.current) importFileInputRef.current.value = '';
    setShowImportModal(true);
  };

  const handleDownloadTemplateKokurikuler = async () => {
    setDownloadingTemplate(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${GURU_KELAS_BASE}/kokurikuler/import-template`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Gagal download template' }));
        throw new Error(err.message || 'Gagal download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Kokurikuler_${kelasNama.replace(/[^a-z0-9]/gi, '_')}_${jenisPenilaianAktif}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showModal({
        type: 'success',
        title: 'Template Berhasil Diunduh',
        message:
          'Template Excel berhasil diunduh.\n\n' +
          'Langkah selanjutnya:\n' +
          '1. Buka file Excel\n' +
          '2. Isi nilai pada kolom aspek kokurikuler\n' +
          '3. Simpan file\n' +
          '4. Upload kembali melalui tombol "Import Nilai"',
      });
    } catch (err: any) {
      showModal({
        type: 'error',
        title: 'Gagal Mengunduh Template',
        message: err.message || 'Terjadi kesalahan saat mengunduh template.',
      });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      showModal({
        type: 'warning',
        title: 'Format File Tidak Valid',
        message: 'Silakan upload file Excel (.xlsx atau .xls)',
      });
      setImportFile(null);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showModal({
        type: 'warning',
        title: 'File Terlalu Besar',
        message: 'Ukuran file maksimal 10MB',
      });
      setImportFile(null);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      return;
    }

    setImportFile(file);
  };

  const downloadErrorReportKokurikuler = (errors: any[]) => {
    const headers = ['No', 'Baris', 'Aspek', 'Alasan Error'];
    const rows = errors.map((err, index) => {
      const message = err.message || '';
      const rowMatch = message.match(/Baris\s+(\d+)/i);
      const rowNumber = rowMatch ? rowMatch[1] : '-';
      const aspekMatch = message.match(/Aspek\s+"([^"]+)"/i) || message.match(/Kolom\s+"([^"]+)"/i);
      const aspek = aspekMatch ? aspekMatch[1] : '-';
      const escapedMessage = message.replace(/"/g, '""');

      return [index + 1, rowNumber, aspek, `"${escapedMessage}"`].join(',');
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `error_import_kokurikuler_${kelasNama.replace(/[^a-z0-9]/gi, '_')}_${jenisPenilaianAktif}_${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const executeImportKokurikuler = async () => {
    if (!importFile) {
      showModal({
        type: 'warning',
        title: 'File Belum Dipilih',
        message: 'Silakan pilih file Excel yang akan diimport.',
      });
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(
        `${GURU_KELAS_BASE}/kokurikuler/import`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengimport nilai');
      }

      // Refresh data nilai (ambil semua halaman, sama seperti fetch awal)
      const refreshHeaders = { Authorization: `Bearer ${token}` };
      const REFRESH_PAGE_SIZE = 100;
      let refreshPage = 1;
      let refreshRawList: any[] = [];
      const refreshSeenIds = new Set<number>();

      while (true) {
        const refreshRes = await fetch(
          `${GURU_KELAS_BASE}/kokurikuler?page=${refreshPage}&limit=${REFRESH_PAGE_SIZE}`,
          { headers: refreshHeaders }
        );

        if (!refreshRes.ok) break;

        const refreshData = await refreshRes.json();
        if (!refreshData.success) break;

        const chunk: any[] = Array.isArray(refreshData.data) ? refreshData.data : [];
        const adaDataBaru = chunk.some(s => !refreshSeenIds.has(s.id || s.id_siswa));
        if (refreshPage > 1 && !adaDataBaru) break;

        chunk.forEach(s => refreshSeenIds.add(s.id || s.id_siswa));
        refreshRawList = refreshRawList.concat(chunk);

        if (chunk.length < REFRESH_PAGE_SIZE) break;
        refreshPage += 1;
      }

      const mapped: SiswaKokurikuler[] = refreshRawList.map((s: any) => ({
        id: s.id || s.id_siswa,
        nama: s.nama || s.nama_lengkap,
        nis: s.nis || '-',
        nisn: s.nisn || '-',
        nilai: s.nilai || {},
      }));
      setSiswaList(mapped);
      setFilteredSiswa(mapped);

      setShowImportModal(false);
      setImportFile(null);
      if (importFileInputRef.current) importFileInputRef.current.value = '';

      const errors = data.data?.errors || [];
      if (errors.length > 5) {
        downloadErrorReportKokurikuler(errors);
      }

      let notifMessage = '';

      if (errors.length === 0) {
        notifMessage =
          `Import berhasil!\n\n` +
          `${data.data?.berhasil || 0} siswa berhasil diimport\n` +
          `${data.data?.total_nilai_disimpan || 0} nilai disimpan`;
      } else {
        notifMessage =
          `Import selesai dengan catatan\n\n` +
          `Berhasil: ${data.data?.berhasil || 0} siswa\n` +
          `Gagal: ${errors.length} baris\n`;

        if (errors.length <= 5) {
          notifMessage += `\nDetail Error:\n`;
          errors.slice(0, 3).forEach((e: any, i: number) => {
            notifMessage += `${i + 1}. ${e.message}\n`;
          });
        } else {
          notifMessage += `\nContoh Error:\n`;
          errors.slice(0, 2).forEach((e: any, i: number) => {
            notifMessage += `${i + 1}. ${e.message}\n`;
          });
          notifMessage += `\nFile CSV error telah diunduh otomatis!`;
        }
      }

      if (data.data?.aspek_diabaikan && data.data.aspek_diabaikan.length > 0) {
        notifMessage += `\n\nKolom diabaikan: ${data.data.aspek_diabaikan.join(', ')}`;
      }

      setTimeout(() => {
        showModal({
          type: errors.length > 0 ? 'warning' : 'success',
          title: errors.length > 0 ? 'Import Selesai' : 'Import Berhasil!',
          message: notifMessage,
        });
      }, 250);
    } catch (err: any) {
      showModal({
        type: 'error',
        title: 'Gagal Import',
        message: err.message || 'Terjadi kesalahan saat mengimport nilai.',
      });
    } finally {
      setImporting(false);
    }
  };

  // Handler judul proyek
  const openProyekModal = () => {
    if (!canEditJudulProyek()) {
      showModal({
        type: 'warning',
        title: 'Judul Proyek Terkunci',
        message:
          'Judul proyek hanya dapat diatur saat periode PAS aktif.\n\n' +
          'Silakan tunggu admin mengaktifkan periode PAS.',
      });
      return;
    }

    setEditingProyek({ ...judulProyek });
    setShowProyekModal(true);
  };

  const closeProyekModal = () => {
    setShowProyekModal(false);
    setEditingProyek({ id_judul_proyek: null, judul: '' });
  };

  const openConfirmSaveProyek = () => {
    if (!editingProyek.judul.trim()) {
      showModal({
        type: 'warning',
        title: 'Judul Kosong',
        message: 'Judul proyek tidak boleh kosong.',
      });
      return;
    }

    if (editingProyek.judul.length > 255) {
      showModal({
        type: 'warning',
        title: 'Judul Terlalu Panjang',
        message: 'Judul proyek maksimal 255 karakter.',
      });
      return;
    }

    showModal({
      type: 'confirm',
      title: 'Konfirmasi Penyimpanan',
      message: 'Apakah Anda yakin ingin menyimpan judul proyek ini?',
      onConfirm: executeSaveProyek,
    });
  };

  const executeSaveProyek = async () => {
    setSavingProyek(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${GURU_KELAS_BASE}/kokurikuler/judul-proyek`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            judul: editingProyek.judul.trim(),
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setJudulProyek({
          id_judul_proyek: data.data?.id || editingProyek.id_judul_proyek,
          judul: editingProyek.judul.trim(),
        });

        closeProyekModal();
        showModal({
          type: 'success',
          title: 'Berhasil!',
          message: 'Judul proyek berhasil disimpan.',
        });
      } else {
        const err = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
        throw new Error(err.message || 'Gagal menyimpan judul proyek');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        showModal({
          type: 'error',
          title: 'Request Timeout',
          message: 'Permintaan Anda terlalu lama. Silakan coba lagi.',
        });
        return;
      }

      if (err.message === 'Sesi berakhir') return;

      showModal({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Gagal menyimpan judul proyek.',
      });
    } finally {
      setSavingProyek(false);
    }
  };

  const executeSimpanNilai = async () => {
    if (!selectedSiswa || !jenisPenilaianAktif) return;

    setSaving(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Sesi berakhir');
      }

      const aspekYangDisimpan = DAFTAR_ASPEK.filter(aspek => canEditAspek(aspek.id));

      const promises = aspekYangDisimpan.map(async (aspek) => {
        const nilaiData = editingNilai[aspek.id];
        const nilai = nilaiData?.nilai ?? null;

        if (nilai === null) return;

        const { grade, deskripsi } = getGradeByNilai(nilai, aspek.id);

        const res = await fetch(
          `${GURU_KELAS_BASE}/kokurikuler/${selectedSiswa.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              aspek_id: aspek.id,
              nilai: nilai,
              grade: grade,
              deskripsi: deskripsi,
              jenis_penilaian: jenisPenilaianAktif,
            }),
            signal: controller.signal,
          }
        );

        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          throw new Error('Sesi berakhir');
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
          throw new Error(errData.message || `Gagal menyimpan aspek ${aspek.nama}`);
        }

        return res.json();
      });

      await Promise.all(promises);
      clearTimeout(timeoutId);

      const updatedSiswa: SiswaKokurikuler = {
        ...selectedSiswa,
        nilai: { ...editingNilai },
      };

      setSiswaList(prev => prev.map(s => s.id === updatedSiswa.id ? updatedSiswa : s));
      setFilteredSiswa(prev => prev.map(s => s.id === updatedSiswa.id ? updatedSiswa : s));

      setShowEdit(false);
      setSelectedSiswa(null);
      setEditingNilai({});

      setTimeout(() => {
        showModal({
          type: 'success',
          title: 'Nilai Berhasil Disimpan!',
          message: `Nilai kokurikuler ${updatedSiswa.nama} berhasil disimpan.`,
        });
      }, 250);
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        showModal({
          type: 'error',
          title: 'Request Timeout',
          message: 'Permintaan Anda terlalu lama. Silakan coba lagi.',
        });
        return;
      }

      if (err.message === 'Sesi berakhir') return;

      showModal({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Gagal menyimpan nilai kokurikuler.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Komponen badge nilai
  const NilaiBadge = ({ nilai }: { nilai: number | null }) => {
    if (nilai === null || nilai === undefined) {
      return <span className="text-gray-400 text-xs">-</span>;
    }

    return (
      <span
        className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
        style={{
          background: '#fff0e5',
          color: ACCENT_DARK,
          border: '1px solid #fde0c8',
        }}
      >
        {nilai}
      </span>
    );
  };

  // Loading state (page-level)
  if (loading) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <GlobalStyles />
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>
            Memuat data...
          </p>
        </div>
      </div>
    );
  }

  if (isNotAssigned) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <GlobalStyles />
        {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn" style={CARD_STYLE}>
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Anda belum ditugaskan sebagai guru kelas di semester ini.
                <br />
                Silakan hubungi Administrator untuk penugasan kelas.
              </p>
            </div>
            <ActionButton variant="primary" fullWidth onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  // Render utama
  const canEditNilai = !isReadOnly && jenisPenilaianAktif !== null;
  const isPasActive = jenisPenilaianAktif === 'PAS';
  const isPtsActive = jenisPenilaianAktif === 'PTS';
  const kategoriBelumDiatur = kategoriStatus && !kategoriStatus.configured;

  // Render banner info
  const renderBannerInfo = () => {
    // Banner warning kategori belum diatur atau ada celah rentang
    if (
      !isReadOnly &&
      jenisPenilaianAktif &&
      kategoriStatus &&
      !kategoriStatus.configured
    ) {
      const aspekBelumDiatur = kategoriStatus.aspek_tanpa_kategori || [];
      const aspekCelah = (kategoriStatus as any).aspek_dengan_celah || [];
      const totalMasalah = aspekBelumDiatur.length + aspekCelah.length;

      return (
        <div
          className="mb-5 rounded-2xl overflow-hidden card-flat"
          style={{ border: '1px solid #fecaca', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div className="px-5 py-4">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#fecaca' }}
              >
                <AlertCircle size={20} className="text-red-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-red-900 mb-1">
                  Kategori Penilaian Belum Lengkap
                </h3>
                <p className="text-sm text-red-700">
                  Periode {jenisPenilaianAktif} sedang aktif. Ditemukan{' '}
                  <strong>{totalMasalah} masalah</strong> pada konfigurasi grade.
                </p>
              </div>
            </div>

            {aspekBelumDiatur.length > 0 && (
              <div className="rounded-xl p-4 mb-3" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Aspek yang belum diatur:
                </p>
                <div className="space-y-2">
                  {aspekBelumDiatur.map((aspek, index) => (
                    <div
                      key={aspek.id ?? `aspek-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{
                        background: '#fff',
                        borderColor: '#fecaca',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: '#fee2e2' }}
                      >
                        <Lock size={16} className="text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          {aspek.nama}
                        </p>
                        <p className="text-xs text-gray-500">
                          Belum ada kategori grade
                        </p>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                        }}
                      >
                        Belum Diatur
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aspekCelah.length > 0 && (
              <div className="rounded-xl p-4 mb-3" style={{ background: '#fafafa', border: '1px solid #ececec' }}>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Aspek dengan rentang nilai tidak lengkap:
                </p>
                <div className="space-y-2">
                  {aspekCelah.map((aspek: any, index: number) => (
                    <div
                      key={aspek.id ?? `celah-${index}`}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                      style={{
                        background: '#fff',
                        borderColor: '#fcd34d',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#fef3c7' }}
                      >
                        <AlertCircle size={16} className="text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">
                          {aspek.nama}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          Rentang yang belum tercover:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {aspek.celah.map((range: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs font-semibold"
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                              }}
                            >
                              {range}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: '#fef3c7',
                          color: '#92400e',
                        }}
                      >
                        Ada Celah
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="p-4 rounded-xl"
              style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    Perlu diperhatikan:
                  </p>
                  <p className="text-sm text-yellow-800">
                    Tombol <strong>Edit</strong> dan <strong>Import Nilai</strong> tidak dapat digunakan
                    sampai semua kategori grade untuk periode {jenisPenilaianAktif} diatur dengan lengkap
                    (mencakup rentang 0-100).
                  </p>
                  <p className="text-sm text-yellow-800 mt-2">
                    Silakan buka menu <strong>Atur Penilaian → Kategori Kokurikuler</strong> untuk
                    mengatur rentang nilai dan grade untuk aspek-aspek di atas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Banner read only
    if (isReadOnly) {
      return (
        <div
          className="mb-5 rounded-2xl overflow-hidden card-flat"
          style={{
            border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}`,
          }}
        >
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{
              background: readOnlyReason === 'locked' ? '#fee2e2' : '#fef3c7',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: readOnlyReason === 'locked' ? '#fecaca' : '#fde68a',
              }}
            >
              <Lock
                size={18}
                className={readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'}
              />
            </div>
            <div>
              <p
                className={`text-sm font-bold ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'
                  }`}
              >
                Mode Baca Saja
              </p>
              <p
                className={`text-xs mt-0.5 ${readOnlyReason === 'locked' ? 'text-red-700' : 'text-yellow-700'
                  }`}
              >
                {readOnlyReason === 'locked'
                  ? 'Periode penilaian telah selesai. Data sudah dikunci dan tidak dapat diedit.'
                  : 'Periode penilaian belum aktif. Silakan hubungi admin untuk membuka periode penilaian.'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Banner periode aktif
    if (!jenisPenilaianAktif) return null;

    const editableAspek = DAFTAR_ASPEK.filter(a => canEditAspek(a.id));

    return (
      <div
        className="mb-5 rounded-2xl overflow-hidden card-flat"
        style={{
          border: `1px solid ${isPtsActive ? '#fdba74' : '#86efac'}`,
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3.5"
          style={{
            background: isPtsActive ? '#fff7ed' : '#ecfdf5',
          }}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${isPtsActive ? 'bg-orange-100' : 'bg-green-100'
              }`}
          >
            <Calendar
              size={18}
              className={isPtsActive ? 'text-orange-600' : 'text-green-600'}
            />
          </div>
          <div className="flex-1">
            <p
              className={`text-sm font-bold ${isPtsActive ? 'text-orange-900' : 'text-green-900'
                }`}
            >
              Periode {jenisPenilaianAktif} Sedang Aktif
            </p>
            <p
              className={`text-xs mt-0.5 ${isPtsActive ? 'text-orange-700' : 'text-green-700'
                }`}
            >
              {isPtsActive
                ? "Hanya aspek Mutaba'ah Yaumiyah yang dapat diinput"
                : 'Semua aspek kokurikuler dapat diinput'}
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              background: isPtsActive ? '#fed7aa' : '#bbf7d0',
              color: isPtsActive ? '#9a3412' : '#166534',
            }}
          >
            <Unlock size={12} />
            {editableAspek.length} aspek aktif
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

      {renderBannerInfo()}

      {/* HEADER */}
      <div className="mb-4 sm:mb-5 anim-in d1">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nilai Kokurikuler</h1>
            <p className="text-xs sm:text-sm mt-1 text-gray-500">
              Kelas <strong>{kelasNama}</strong> - Kelola nilai kokurikuler siswa
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEditNilai && (
              <ActionButton
                variant={kategoriBelumDiatur ? 'neutral' : 'info'}
                disabled={!!kategoriBelumDiatur}
                onClick={openImportModal}
                title={kategoriBelumDiatur ? 'Kategori penilaian belum diatur' : ''}
              >
                {kategoriBelumDiatur ? (
                  <>
                    <AlertCircle size={16} /> Belum Diatur
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Import Nilai
                  </>
                )}
              </ActionButton>
            )}

            <ActionButton
              variant="accent"
              disabled={!canEditJudulProyek()}
              onClick={openProyekModal}
              title={!canEditJudulProyek() ? 'Judul proyek hanya bisa diatur saat PAS aktif' : ''}
            >
              <BookOpen size={16} />
              {judulProyek.judul ? 'Edit Judul Proyek' : 'Atur Judul Proyek'}
              {!canEditJudulProyek() && <Lock size={14} />}
            </ActionButton>
          </div>
        </div>

        {judulProyek.judul && (
          <div
            className="mt-4 p-4 rounded-xl card-flat"
            style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#fed7aa' }}
              >
                <BookOpen size={20} style={{ color: '#c2410c' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: '#c2410c' }}
                >
                  Judul Proyek Kelas Ini
                </p>
                <p
                  className="text-lg font-bold break-words"
                  style={{ color: '#7a3a0a' }}
                >
                  {judulProyek.judul}
                </p>
                {judulProyek.deskripsi && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">
                    {judulProyek.deskripsi}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="relative w-full lg:w-72 flex-shrink-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            </div>
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
          </div>
        </div>

        <p className="text-xs mt-3 text-gray-400">
          Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}-
          {Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} siswa
        </p>
      </div>

      {/* TABEL — CSS grid, konsisten dengan data_guru_client.tsx */}
      <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
        <div className="overflow-x-auto scrollbar-thin">
          <div style={{ width: '100%', minWidth: '900px' }}>
            <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
              {['No.', 'Nama Siswa', 'NIS', 'NISN', "Mutaba'ah", 'BPI', 'Literasi', 'Proyek', 'Aksi'].map((h, i) => (
                <div
                  key={i}
                  className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap relative group flex items-center justify-center"
                >
                  {h}
                  {jenisPenilaianAktif === 'PTS' &&
                    (h === 'BPI' || h === 'Literasi' || h === 'Proyek') && (
                      <div className="absolute -top-1 -right-1">
                        <Lock size={12} className="text-white/80" />
                      </div>
                    )}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 text-center normal-case font-medium">
                    {jenisPenilaianAktif === 'PTS' && (h === 'BPI' || h === 'Literasi' || h === 'Proyek')
                      ? `Terkunci - Hanya Mutaba'ah yang bisa diinput saat PTS`
                      : jenisPenilaianAktif === 'PAS'
                        ? 'Dapat diinput'
                        : 'Periode belum aktif'}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              ))}
            </div>

            {dataLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <div key={j} className="px-4 py-4 flex items-center justify-center">
                      <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '55%' }} />
                    </div>
                  ))}
                </div>
              ))
            ) : currentSiswa.length === 0 ? (
              <div className="py-14 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users size={32} className="text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">
                    {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                  </p>
                </div>
              </div>
            ) : (
              currentSiswa.map((siswa, idx) => (
                <div
                  key={siswa.id}
                  className="grid row-in row-hover border-b transition-colors"
                  style={{
                    gridTemplateColumns: GRID_COLS,
                    borderColor: '#f0f0f0',
                    background: '#fff',
                    animationDelay: `${Math.min(idx, 8) * 0.03}s`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">
                    {startIndex + idx + 1}
                  </div>
                  <div className="px-4 py-4 flex items-center overflow-hidden">
                    <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600">{siswa.nis}</div>
                  <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600">{siswa.nisn}</div>
                  <div className="px-4 py-4 flex items-center justify-center">
                    <NilaiBadge nilai={siswa.nilai[ASPEK_ID.mutabaah]?.nilai ?? null} />
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center">
                    <NilaiBadge nilai={siswa.nilai[ASPEK_ID.bpi]?.nilai ?? null} />
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center">
                    <NilaiBadge nilai={siswa.nilai[ASPEK_ID.literasi]?.nilai ?? null} />
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center">
                    <NilaiBadge nilai={siswa.nilai[ASPEK_ID.proyek]?.nilai ?? null} />
                  </div>
                  <div className="px-4 py-4 flex items-center justify-center">
                    <div className="flex justify-center gap-1.5">
                      <ActionButton size="sm" variant="info" onClick={() => handleDetail(siswa)}>
                        <Eye size={13} /> Detail
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        variant="warning"
                        disabled={!canEditNilai || !!kategoriBelumDiatur}
                        onClick={() => handleEdit(siswa)}
                        title={
                          kategoriBelumDiatur
                            ? 'Kategori penilaian belum diatur'
                            : !canEditNilai
                              ? 'Periode belum aktif'
                              : ''
                        }
                      >
                        {kategoriBelumDiatur ? (
                          <>
                            <AlertCircle size={13} /> Belum Diatur
                          </>
                        ) : canEditNilai ? (
                          <>
                            <Pencil size={13} /> Edit
                          </>
                        ) : (
                          <>
                            <Lock size={13} /> Terkunci
                          </>
                        )}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {filteredSiswa.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
            <span className="text-xs font-medium text-gray-500">
              Halaman {currentPage} dari {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                style={{ color: ACCENT_DARK }}
              >
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <div className="flex items-center gap-1 mx-1">{renderPagination()}</div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                style={{ color: ACCENT_DARK }}
              >
                Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail — dirombak: avatar, kartu ringkas, satu kolom per
          aspek (sebelumnya grid 3 kolom sempit yang sulit dibaca) */}
      {showDetail && selectedSiswa && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'
            }`}
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}
          >
            <div
              className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl"
              style={{ background: BRAND_GRADIENT }}
            >
              <div>
                <h2 className="text-lg font-bold text-white">Detail Nilai Kokurikuler</h2>
                <p className="text-xs text-orange-100 mt-0.5">{kelasNama}</p>
              </div>
              <button
                onClick={() => closeDetail()}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {/* Avatar + nama siswa */}
              <div className="flex flex-col items-center gap-3 pb-5 border-b" style={{ borderColor: '#fde0c8' }}>
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center border-4"
                  style={{ background: 'linear-gradient(135deg, #fed7aa, #fde0c8)', borderColor: '#fde0c8' }}
                >
                  <User size={34} style={{ color: '#c2410c' }} />
                </div>
                <div className="text-center">
                  <p className="text-base sm:text-lg font-bold text-gray-900">{selectedSiswa.nama}</p>
                  <p className="text-xs text-gray-500 mt-0.5">NIS {selectedSiswa.nis} · NISN {selectedSiswa.nisn}</p>
                </div>
              </div>

              {judulProyek.judul && (
                <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                      <BookOpen size={18} style={{ color: '#c2410c' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c2410c' }}>Judul Proyek</p>
                      <p className="text-sm font-bold break-words" style={{ color: '#7a3a0a' }}>{judulProyek.judul}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 px-0.5">Nilai per Aspek</p>

                {DAFTAR_ASPEK.map(aspek => {
                  const nilaiData = selectedSiswa.nilai[aspek.id];
                  const nilai = nilaiData?.nilai;
                  const grade = nilaiData?.grade;
                  const deskripsi = nilaiData?.deskripsi;
                  const hasValue = nilai !== null && nilai !== undefined;

                  return (
                    <div key={aspek.id} className="rounded-xl overflow-hidden border" style={{ borderColor: '#fde0c8' }}>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#fff7ed' }}>
                        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                          <div className="w-1.5 h-5 rounded-full" style={{ background: ACCENT }}></div>
                          {aspek.nama}
                        </h3>
                        {hasValue && grade ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white flex-shrink-0" style={{ background: ACCENT }}>
                            <Award size={12} /> Grade {grade}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400 flex-shrink-0">Belum dinilai</span>
                        )}
                      </div>

                      <div className="p-4 bg-white">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: hasValue ? '#fff0e5' : '#f9fafb', border: `1px solid ${hasValue ? '#fde0c8' : '#e5e7eb'}` }}
                          >
                            <span className="text-2xl font-bold" style={{ color: hasValue ? '#c2410c' : '#d1d5db' }}>
                              {hasValue ? nilai : '-'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-xs text-gray-500 mb-1">Deskripsi Penilaian</p>
                            <p
                              className="text-sm leading-relaxed break-words whitespace-pre-wrap"
                              style={{ color: deskripsi ? '#374151' : '#9ca3af' }}
                            >
                              {deskripsi || <span className="italic">Belum ada deskripsi</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
              <ActionButton variant="neutral" onClick={() => closeDetail()}>Tutup</ActionButton>
              {canEditNilai && (
                <ActionButton
                  variant="warning"
                  onClick={() => {
                    // ✅ Urutan yang benar: buka Edit dulu, baru tutup Detail
                    // TANPA menghapus data siswa (keepSiswa = true), sehingga
                    // modal Edit tidak lagi ikut hilang.
                    handleEdit(selectedSiswa);
                    closeDetail(true);
                  }}
                >
                  <Pencil size={14} /> Edit Nilai
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEdit && selectedSiswa && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'
            }`}
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}
          >
            <div
              className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl"
              style={{ background: BRAND_GRADIENT }}
            >
              <div>
                <h2 className="text-lg font-bold text-white">Edit Nilai Kokurikuler</h2>
                <p className="text-xs text-orange-100 mt-0.5">
                  {selectedSiswa.nama} - {kelasNama}
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {jenisPenilaianAktif && (
                <div
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{
                    background: isPtsActive ? '#fff7ed' : '#ecfdf5',
                    border: `1px solid ${isPtsActive ? '#fdba74' : '#86efac'}`,
                  }}
                >
                  <Calendar size={18} style={{ color: isPtsActive ? '#c2410c' : '#166534', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: isPtsActive ? '#7a3a0a' : '#14532d' }}>
                    <strong>Periode {jenisPenilaianAktif} Aktif</strong>
                    {isPtsActive && " - Hanya Mutaba'ah yang dapat diinput"}
                    {isPasActive && ' - Semua aspek dapat diinput'}
                  </p>
                </div>
              )}

              {DAFTAR_ASPEK.map(aspek => {
                const nilaiData = editingNilai[aspek.id];
                const nilai = nilaiData?.nilai;
                const { grade, deskripsi } = getGradeByNilai(nilai ?? null, aspek.id);

                const isAspekEditable = canEditAspek(aspek.id);
                const lockReason = getAspekLockReason(aspek.id);

                return (
                  <div
                    key={aspek.id}
                    id={`aspek-${aspek.id}`}
                    className="rounded-xl overflow-hidden border-2 transition-all"
                    style={{
                      borderColor: isAspekEditable ? '#fdba74' : '#d1d5db',
                      opacity: isAspekEditable ? 1 : 0.6,
                      background: isAspekEditable ? '#fff' : '#f9fafb',
                    }}
                  >
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: isAspekEditable ? '#fff7ed' : '#f3f4f6' }}>
                      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: isAspekEditable ? '#7a3a0a' : '#6b7280' }}>
                        <div className="w-1.5 h-5 rounded-full" style={{ background: isAspekEditable ? ACCENT : '#9ca3af' }}></div>
                        {aspek.nama}
                      </h3>
                      {!isAspekEditable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                          <Lock size={11} /> {lockReason}
                        </span>
                      ) : grade ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>
                          <Award size={11} /> Grade {grade}
                        </span>
                      ) : null}
                    </div>

                    <div className="p-4" style={{ background: isAspekEditable ? '#fffaf6' : '#f9fafb' }}>
                      {!isAspekEditable && (
                        <div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                          <Lock size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-800">
                            <strong>Aspek ini terkunci</strong>
                            <br />
                            {jenisPenilaianAktif === 'PTS'
                              ? "Saat periode PTS aktif, hanya aspek Mutaba'ah Yaumiyah yang dapat diisi. Aspek ini akan terbuka saat periode PAS."
                              : 'Periode penilaian belum aktif.'}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className={labelCls} style={{ color: isAspekEditable ? '#7a3a0a' : '#9ca3af' }}>Nilai (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={nilai ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = val === '' ? null : parseFloat(val);
                              handleNilaiChange(aspek.id, num === null || isNaN(num) ? null : Math.floor(num));
                            }}
                            disabled={!isAspekEditable}
                            className={isAspekEditable ? inputCls : inputDisabledCls}
                            placeholder={isAspekEditable ? 'Masukkan nilai 0-100' : 'Terkunci'}
                          />
                        </div>
                        <div>
                          <label className={labelCls} style={{ color: isAspekEditable ? '#7a3a0a' : '#9ca3af' }}>Grade Otomatis</label>
                          <div
                            className="w-full border rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
                            style={{
                              background: isAspekEditable ? 'rgba(255, 247, 237, 0.4)' : '#f3f4f6',
                              borderColor: isAspekEditable ? '#fdba74' : '#d1d5db',
                              color: isAspekEditable ? '#7a3a0a' : '#9ca3af',
                              minHeight: '42px',
                            }}
                          >
                            {grade ? (
                              <>
                                <Award size={16} className="text-orange-500 flex-shrink-0" />
                                <span className="font-bold">{grade}</span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {deskripsi && (
                        <div>
                          <label className={labelCls} style={{ color: isAspekEditable ? '#7a3a0a' : '#9ca3af' }}>Deskripsi Penilaian</label>
                          <div
                            className="w-full border rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[60px]"
                            style={{
                              background: isAspekEditable ? 'rgba(255, 247, 237, 0.4)' : '#f3f4f6',
                              borderColor: isAspekEditable ? '#fdba74' : '#d1d5db',
                              color: isAspekEditable ? '#374151' : '#9ca3af',
                            }}
                          >
                            {deskripsi}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
              <ActionButton variant="neutral" disabled={saving} onClick={closeEdit}>Batal</ActionButton>
              <ActionButton variant="primary" disabled={saving} onClick={openConfirmSimpan}>
                {saving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Simpan Nilai
                  </>
                )}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Judul Proyek */}
      {showProyekModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 dg-fadeIn"
          onClick={e => { if (e.target === e.currentTarget) closeProyekModal(); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-md dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
            <div className="sticky top-0 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={18} />
                {editingProyek.id_judul_proyek ? 'Edit Judul Proyek' : 'Atur Judul Proyek'}
              </h2>
              <button
                onClick={closeProyekModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#c2410c' }}>Informasi</p>
                <p className="text-sm text-gray-700">
                  Judul proyek ini akan digunakan untuk semua siswa di kelas {kelasNama}.
                  Nilai proyek akan diberikan kepada setiap siswa secara individual.
                </p>
              </div>

              <div className="space-y-2">
                <label className={labelCls} style={labelColor}>
                  Judul Proyek <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProyek.judul}
                  onChange={(e) => setEditingProyek({ ...editingProyek, judul: e.target.value })}
                  placeholder="Contoh: Proyek Kebersihan Lingkungan"
                  className={inputCls}
                  maxLength={255}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
              <ActionButton variant="neutral" disabled={savingProyek} onClick={closeProyekModal}>Batal</ActionButton>
              <ActionButton variant="primary" disabled={savingProyek || !editingProyek.judul.trim()} onClick={openConfirmSaveProyek}>
                {savingProyek ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Simpan
                  </>
                )}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Nilai */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 dg-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !importing) {
              setShowImportModal(false);
            }
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl w-full max-w-lg dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Upload size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">Data Massal</p>
                  <h2 className="text-sm font-bold text-white leading-tight truncate">Import Nilai Kokurikuler</h2>
                  <p className="text-[10px] text-white/70 mt-0.5">Kelas {kelasNama} - Periode {jenisPenilaianAktif}</p>
                </div>
              </div>
              <button
                onClick={() => { if (!importing) setShowImportModal(false); }}
                disabled={importing}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 p-4 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p className="text-sm text-blue-900 font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle size={16} className="text-blue-600" />
                  Langkah-langkah Import:
                </p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download template Excel (sudah berisi daftar siswa)</li>
                  <li>Isi nilai pada kolom aspek kokurikuler</li>
                  <li>Simpan file Excel</li>
                  <li>Upload file Excel yang sudah diisi</li>
                  <li>Klik "Import Nilai" untuk memproses</li>
                </ol>
              </div>

              <div className="mb-5 p-3 rounded-xl flex items-start gap-2" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                <AlertCircle size={16} style={{ color: ACCENT_DARK }} className="flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1" style={{ color: '#7a3a0a' }}>
                  <p><strong>Periode {jenisPenilaianAktif} Aktif:</strong></p>
                  {jenisPenilaianAktif === 'PTS' ? (
                    <>
                      <p>- Yang diimport: Mutaba'ah Yaumiyah</p>
                      <p>- Yang diabaikan: BPI, Literasi, Proyek</p>
                      <p className="mt-1"><strong>Tip:</strong> Isi kolom lain nanti saat periode PAS aktif. Data tidak akan hilang.</p>
                    </>
                  ) : (
                    <p>- Semua aspek (Mutaba'ah, BPI, Literasi, Proyek) akan diimport.</p>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <ActionButton
                  variant="warning"
                  fullWidth
                  disabled={downloadingTemplate}
                  onClick={handleDownloadTemplateKokurikuler}
                >
                  {downloadingTemplate ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Mengunduh Template...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Download Template Excel
                    </>
                  )}
                </ActionButton>
              </div>

              <div className="mb-5">
                <label className={labelCls} style={labelColor}>
                  Upload File Excel <span className="text-red-500">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${importFile ? 'border-green-400 bg-green-50' : 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                    }`}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                  {importFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 size={24} className="text-green-600" />
                      </div>
                      <p className="text-sm font-bold text-green-900">{importFile.name}</p>
                      <p className="text-xs text-green-700">
                        {(importFile.size / 1024).toFixed(1)} KB - Klik untuk ganti file
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={32} className="text-orange-400" />
                      <p className="text-sm font-bold text-orange-900">Klik untuk pilih file Excel</p>
                      <p className="text-xs text-orange-700">Format: .xlsx atau .xls (Maks 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5">
                <ActionButton
                  variant="neutral"
                  fullWidth
                  disabled={importing}
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                >
                  Batal
                </ActionButton>
                <ActionButton
                  variant="success"
                  fullWidth
                  disabled={!importFile || importing}
                  onClick={executeImportKokurikuler}
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin" />
                      Mengimport...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Import Nilai
                    </>
                  )}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}