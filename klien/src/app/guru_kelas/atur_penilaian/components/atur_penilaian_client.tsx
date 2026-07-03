/**
 * Nama File: atur_penilaian_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian
 *         oleh guru kelas, mencakup kategori kokurikuler, akademik, deskripsi rata-rata, dan bobot.
 * 
 * ✅ UPDATED: 
 *   - ✅ UI Akademik & Deskripsi Rata-rata sekarang konsisten dengan Kokurikuler
 *   - ✅ Menggunakan card dengan header, tabel di dalam, dan tombol "Edit Semua"
 *   - ✅ Modal batch edit untuk semua kategori
 *   - ✅ Semua API call mengirim parameter `jenis` (PTS/PAS)
 *   - ✅ Semua save payload mengirim field `jenis`
 *   - ✅ Banner periode aktif yang jelas
 *   - ✅ Kategori Kokurikuler: PTS → hanya Mutaba'ah, PAS → semua aspek
 *   - ✅ Tab Deskripsi Rata-rata: HANYA PTS
 *   - ✅ Bobot: PTS = auto 100%, PAS = editable
 */

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, AlertTriangle, LogOut, Layers, Lock, Calendar, Unlock, Award, BookOpen, BarChart3 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== ID ASPEK MUTABA'AH (untuk rules PTS) ======
const ASPEK_MUTABAAH_ID = 5;

// ✅ HELPER: Generate parameter jenis untuk API call
const getJenisParam = (jenis: 'PTS' | 'PAS' | null): string => {
  return jenis ? `jenis=${jenis}` : '';
};

// ====== HELPER: Parse Error dari Backend ======
const parseBackendError = async (res: Response): Promise<{ message: string; code?: string }> => {
  try {
    const contentType = res.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();

      if (res.status === 404) {
        return { message: 'Endpoint tidak ditemukan.', code: 'NOT_FOUND' };
      }
      if (res.status === 500) {
        return { message: 'Server error.', code: 'SERVER_ERROR' };
      }
      return { message: `Server error (${res.status}).`, code: 'INVALID_RESPONSE' };
    }

    const data = await res.json();
    return { message: data.message || 'Terjadi kesalahan', code: data.code };
  } catch (error) {
    return { message: 'Gagal memproses response dari server' };
  }
};

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface AspekKokurikuler {
  id_aspek_kokurikuler: number;
  nama: string;
}

interface MapelItem {
  mata_pelajaran_id: number;
  nama_mapel: string;
  jenis: 'wajib' | 'pilihan';
}

interface KategoriAkademik {
  id: number;
  min_nilai: number;
  max_nilai: number;
  deskripsi: string;
  urutan: number;
}

interface KategoriKokurikuler {
  id: number;
  min_nilai: number;
  max_nilai: number;
  grade: string;
  deskripsi: string;
  urutan: number;
  id_aspek_kokurikuler: number;
}

interface KomponenPenilaian {
  id_komponen: number;
  nama_komponen: string;
  urutan: number;
}

interface BobotItem {
  komponen_id: number;
  bobot: number;
}

interface CoverageInfo {
  covered: boolean;
  gap?: string;
  gaps?: Array<{ aspek: string; gap: string }>;
}

interface BatchGradeItem {
  id?: number;
  grade?: string;
  min_nilai: number;
  max_nilai: number;
  deskripsi: string;
  isNew?: boolean;
}

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes ap-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ap-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ap-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .ap-fadeIn  { animation: ap-fadeIn  0.2s ease; }
    .ap-scaleIn { animation: ap-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ap-pulse   { animation: ap-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ====== NOTIF MODAL ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
  success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
  error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
  confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  const isConfirm = modal.type === 'confirm';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 ap-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ap-scaleIn">
        {!isConfirm && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        )}
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ap-pulse`}>{s.icon}</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        {isConfirm ? (
          <div className="flex gap-3 w-full">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
            >Batal</button>
            <button onClick={() => { modal.onConfirm?.(); onClose(); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >Ya, Lanjutkan</button>
          </div>
        ) : (
          <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
        )}
      </div>
    </div>
  );
};

// ====== CONFIRM MODAL ======
const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 ap-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ap-scaleIn">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ap-pulse">
        <Trash2 size={36} className="text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}>
          Batal
        </button>
        <button onClick={onConfirm}
          className="flex-1 py-3 rounded-xl text-white font-semibold text-sm bg-red-500 hover:bg-red-600 transition-colors">
          Hapus
        </button>
      </div>
    </div>
  </div>
);

// ====== COVERAGE WARNING BANNER ======
const CoverageWarning = ({ coverage }: { coverage: CoverageInfo | null }) => {
  if (!coverage || coverage.covered) return null;

  const gaps = coverage.gaps || (coverage.gap ? [{ aspek: 'Deskripsi Rata-rata', gap: coverage.gap }] : []);

  if (gaps.length === 0) return null;

  const validGaps = gaps.filter(g => {
    const parts = g.gap.split('-');
    if (parts.length !== 2) return true;
    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);
    return min <= max;
  });

  if (validGaps.length === 0) return null;

  return (
    <div className="mb-4 p-3 rounded-xl flex items-start gap-2"
      style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
      <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="text-xs" style={{ color: '#78350f' }}>
        <strong>Peringatan:</strong> Range nilai 0-100 belum lengkap.
        {validGaps.length === 1 ? (
          <>
            {' '}Ada gap pada <strong>{validGaps[0].aspek}</strong> di rentang <strong>{validGaps[0].gap}</strong>.
          </>
        ) : (
          <ul className="mt-1 ml-4 list-disc">
            {validGaps.map((g, i) => (
              <li key={i}>
                <strong>{g.aspek}:</strong> gap pada rentang <strong>{g.gap}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ====== SHARED STYLE CONSTANTS ======
const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";
const inputDisabledCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-500 outline-none bg-gray-100 border-gray-200 cursor-not-allowed";

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
  base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)', border: '1.5px solid #c95b08' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ✅ BtnSecondary kini "Batal" bergaya merah, konsisten dengan data_admin_client
const BtnSecondary = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => { if (!disabled) (e.currentTarget.style.background = '#fff0e5'); }}
    onMouseLeave={e => { if (!disabled) (e.currentTarget.style.background = '#fff'); }}
  >{children}</button>
);

// ====== MAIN COMPONENT ======
export default function AturPenilaianGuruKelasClient() {
  const { showSessionExpired, handleLogout } = useSession();

  const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
  const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
  const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');

  const [activeTab, setActiveTab] = useState<'kokurikuler' | 'akademik' | 'bobot' | 'deskripsi-rata-rata'>('kokurikuler');
  const [loading, setLoading] = useState(true);

  const [aspekList, setAspekList] = useState<AspekKokurikuler[]>([]);
  const [mapelList, setMapelList] = useState<MapelItem[]>([]);
  const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);

  const [kategoriList, setKategoriList] = useState<(KategoriAkademik | KategoriKokurikuler)[]>([]);
  const [kategoriLoading, setKategoriLoading] = useState(false);
  const [coverageInfo, setCoverageInfo] = useState<CoverageInfo | null>(null);

  const [deskripsiRataRataList, setDeskripsiRataRataList] = useState<any[]>([]);
  const [deskripsiRataRataLoading, setDeskripsiRataRataLoading] = useState(false);
  const [deskripsiRataRataCoverage, setDeskripsiRataRataCoverage] = useState<CoverageInfo | null>(null);

  // ✅ State untuk Batch Edit Kokurikuler
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditClosing, setBatchEditClosing] = useState(false);
  const [batchEditAspekId, setBatchEditAspekId] = useState<number | null>(null);
  const [batchGrades, setBatchGrades] = useState<BatchGradeItem[]>([]);
  const [originalBatchGrades, setOriginalBatchGrades] = useState<BatchGradeItem[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // ✅ State untuk Batch Edit Akademik
  const [showBatchEditAkademik, setShowBatchEditAkademik] = useState(false);
  const [batchEditAkademikClosing, setBatchEditAkademikClosing] = useState(false);
  const [batchAkademik, setBatchAkademik] = useState<BatchGradeItem[]>([]);
  const [originalBatchAkademik, setOriginalBatchAkademik] = useState<BatchGradeItem[]>([]);
  const [isSavingBatchAkademik, setIsSavingBatchAkademik] = useState(false);

  // ✅ State untuk Batch Edit Deskripsi Rata-rata
  const [showBatchEditDeskripsi, setShowBatchEditDeskripsi] = useState(false);
  const [batchEditDeskripsiClosing, setBatchEditDeskripsiClosing] = useState(false);
  const [batchDeskripsi, setBatchDeskripsi] = useState<BatchGradeItem[]>([]);
  const [originalBatchDeskripsi, setOriginalBatchDeskripsi] = useState<BatchGradeItem[]>([]);
  const [isSavingBatchDeskripsi, setIsSavingBatchDeskripsi] = useState(false);

  const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);

  const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
  const [bobotList, setBobotList] = useState<BobotItem[]>([]);
  const [bobotLoading, setBobotLoading] = useState(false);
  const [isBobotLocked, setIsBobotLocked] = useState(false);
  const initialBobotListRef = useRef<BobotItem[]>([]);

  const [isSavingBobot, setIsSavingBobot] = useState(false);
  const [isSavingKategori, setIsSavingKategori] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'save-kategori' | 'save-bobot' | 'save-batch' | 'save-batch-akademik' | 'save-batch-deskripsi' | 'save-deskripsi-rata-rata' | null>(null);

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  const [isNotAssigned, setIsNotAssigned] = useState(false);

  const canEditAspekKokurikuler = useCallback((aspekId: number): boolean => {
    if (isReadOnly) return false;
    if (!jenisPenilaianAktif) return false;
    if (jenisPenilaianAktif === 'PTS') return aspekId === ASPEK_MUTABAAH_ID;
    if (jenisPenilaianAktif === 'PAS') return true;
    return false;
  }, [jenisPenilaianAktif, isReadOnly]);

  const getAspekKokurikulerLockReason = useCallback((aspekId: number): string => {
    if (isReadOnly) {
      if (readOnlyReason === 'locked') return 'Periode Selesai';
      return 'Periode Belum Aktif';
    }
    if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
    if (jenisPenilaianAktif === 'PTS' && aspekId !== ASPEK_MUTABAAH_ID) return 'Terkunci - PTS';
    return '';
  }, [jenisPenilaianAktif, isReadOnly, readOnlyReason]);

  const canEditDeskripsiRataRata = useCallback((): boolean => {
    if (isReadOnly) return false;
    if (!jenisPenilaianAktif) return false;
    return jenisPenilaianAktif === 'PTS';
  }, [jenisPenilaianAktif, isReadOnly]);

  const getDeskripsiRataRataLockReason = useCallback((): string => {
    if (isReadOnly) {
      if (readOnlyReason === 'locked') return 'Periode Selesai';
      return 'Periode Belum Aktif';
    }
    if (jenisPenilaianAktif === 'PAS') return 'Terkunci - PAS';
    if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
    return '';
  }, [jenisPenilaianAktif, isReadOnly, readOnlyReason]);

  const canEditAkademik = useCallback((): boolean => {
    if (isReadOnly) return false;
    if (!jenisPenilaianAktif) return false;
    return true;
  }, [jenisPenilaianAktif, isReadOnly]);

  // ✅ UPDATED: reloadData dengan parameter jenis
  const reloadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !jenisPenilaianAktif) return;

    const jenisParam = getJenisParam(jenisPenilaianAktif);

    try {
      if (activeTab === 'kokurikuler') {
        const res = await fetch(`${API}/atur-penilaian/kategori-kokurikuler?${jenisParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setKategoriList((data.data || []).map((item: any) => ({
            ...item,
            min_nilai: Math.floor(parseFloat(item.min_nilai)),
            max_nilai: Math.floor(parseFloat(item.max_nilai)),
          })));
          setCoverageInfo(data.coverage || null);
        }
      } else if (activeTab === 'akademik' && selectedMapelAkademik !== null) {
        const res = await fetch(`${API}/atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}&${jenisParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setKategoriList((data.data || []).map((item: any) => ({
            ...item,
            min_nilai: Math.floor(parseFloat(item.min_nilai)),
            max_nilai: Math.floor(parseFloat(item.max_nilai)),
          })));
          setCoverageInfo(data.coverage || null);
        }
      } else if (activeTab === 'deskripsi-rata-rata') {
        const res = await fetch(`${API}/atur-penilaian/deskripsi-rata-rata`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // ✅ DESKRIPSI RATA-RATA: Gunakan parseFloat untuk support desimal
          setDeskripsiRataRataList((data.data || []).map((item: any) => ({
            ...item,
            min_nilai: parseFloat(parseFloat(item.min_nilai).toFixed(2)),
            max_nilai: parseFloat(parseFloat(item.max_nilai).toFixed(2)),
          })));
          setDeskripsiRataRataCoverage(data.coverage || null);
        }
      }
    } catch (err) {
      console.error('Error reloading data:', err);
    }
  }, [activeTab, selectedMapelAkademik, jenisPenilaianAktif]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [taRes, komponenRes, mapelRes, aspekRes] = await Promise.all([
          fetch(`${API}/tahun-ajaran/aktif`, { headers }),
          fetch(`${API}/atur-penilaian/komponen`, { headers }),
          fetch(`${API}/mapel`, { headers }),
          fetch(`${API}/atur-penilaian/aspek-kokurikuler`, { headers }),
        ]);

        if (!taRes.ok) {
          const err = await parseBackendError(taRes);
          throw new Error(err.message);
        }
        if (!komponenRes.ok) {
          const err = await parseBackendError(komponenRes);
          throw new Error(err.message);
        }
        if (!mapelRes.ok) {
          const err = await parseBackendError(mapelRes);
          if (mapelRes.status === 403 && err.code === 'NOT_ASSIGNED') {
            setIsNotAssigned(true);
            return;
          } else if (mapelRes.status !== 403) {
            throw new Error(err.message);
          }
        }
        if (!aspekRes.ok) {
          const err = await parseBackendError(aspekRes);
          throw new Error(err.message);
        }

        const [taData, komponenData, mapelData, aspekData] = await Promise.all([
          taRes.json(),
          komponenRes.json(),
          mapelRes.json(),
          aspekRes.json(),
        ]);

        const { status_pts, status_pas } = taData.data;

        setStatusPTS(status_pts || 'nonaktif');
        setStatusPAS(status_pas || 'nonaktif');

        const jenisAktif = status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null;
        setJenisPenilaianAktif(jenisAktif);

        if (status_pts === 'aktif' || status_pas === 'aktif') {
          setIsReadOnly(false);
          setReadOnlyReason(null);
        } else if (status_pts === 'selesai' || status_pas === 'selesai') {
          setIsReadOnly(true);
          setReadOnlyReason('locked');
          setTimeout(() => {
            showModal({
              type: 'warning',
              title: 'Periode Penilaian Selesai',
              message: 'Periode penilaian telah selesai dan data sudah dikunci.\n\nAnda dapat melihat konfigurasi dalam mode baca saja, tetapi tidak dapat mengedit.'
            });
          }, 500);
        } else {
          setIsReadOnly(true);
          setReadOnlyReason('not_open');
          setTimeout(() => {
            showModal({
              type: 'warning',
              title: '⏳ Periode Penilaian Belum Aktif',
              message: 'Baik PTS maupun PAS belum dibuka oleh admin.\n\nAnda dapat melihat konfigurasi dalam mode baca saja, tetapi belum dapat mengedit.\n\nSilakan hubungi admin untuk membuka periode penilaian.'
            });
          }, 500);
        }

        setKomponenList(komponenData.data || []);

        const mapelWajib = mapelData.data?.wajib || mapelData.wajib || [];
        const mapelPilihan = mapelData.data?.pilihan || mapelData.pilihan || [];
        const allMapel = [...mapelWajib, ...mapelPilihan];
        setMapelList(allMapel);

        setAspekList(aspekData.data || []);

      } catch (err: any) {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showModal, handleLogout]);

  useEffect(() => {
    if (loading) return;
    if (activeTab === 'bobot') return;

    const fetchKategori = async () => {
      setKategoriLoading(true);
      setCoverageInfo(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const jenisParam = getJenisParam(jenisPenilaianAktif);
        let endpoint = '';

        if (activeTab === 'kokurikuler') {
          endpoint = `${API}/atur-penilaian/kategori-kokurikuler?${jenisParam}`;
        } else if (activeTab === 'akademik') {
          if (selectedMapelAkademik !== null) {
            endpoint = `${API}/atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}&${jenisParam}`;
          } else {
            setKategoriList([]);
            setCoverageInfo(null);
            setKategoriLoading(false);
            return;
          }
        } else if (activeTab === 'deskripsi-rata-rata') {
          endpoint = `${API}/atur-penilaian/deskripsi-rata-rata`;
        }

        if (!endpoint) {
          setKategoriList([]);
          setCoverageInfo(null);
          setKategoriLoading(false);
          return;
        }

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          let errorData;
          try {
            errorData = await res.json();
          } catch {
            errorData = { message: await res.text(), code: null };
          }

          if (errorData.code === 'NOT_ASSIGNED') {
            setIsNotAssigned(true);
            return;
          }

          if (errorData.code === 'PERIOD_NOT_OPEN') {
            showModal({
              type: 'warning',
              title: 'Periode Belum Dibuka',
              message: errorData.message || 'Admin belum membuka periode penilaian.'
            });
            setKategoriList([]);
            setKategoriLoading(false);
            return;
          }

          if (errorData.code === 'PERIOD_LOCKED') {
            showModal({
              type: 'warning',
              title: 'Periode Terkunci',
              message: errorData.message || 'Data sudah dikunci dan tidak dapat diubah.'
            });
            return;
          }

          if (res.status === 403) {
            showModal({
              type: 'error',
              title: 'Akses Ditolak',
              message: errorData.message || 'Anda tidak memiliki akses'
            });
            return;
          }

          throw new Error(errorData.message || `HTTP ${res.status}`);
        }

        const data = await res.json();

        // ✅ DESKRIPSI RATA-RATA: Gunakan parseFloat untuk support desimal
        const formattedData = activeTab === 'deskripsi-rata-rata'
          ? (data.data || []).map((item: any) => ({
            ...item,
            min_nilai: parseFloat(parseFloat(item.min_nilai).toFixed(2)),
            max_nilai: parseFloat(parseFloat(item.max_nilai).toFixed(2)),
          }))
          : (data.data || []).map((item: any) => ({
            ...item,
            min_nilai: Math.floor(parseFloat(item.min_nilai)),
            max_nilai: Math.floor(parseFloat(item.max_nilai)),
          }));

        if (activeTab === 'deskripsi-rata-rata') {
          setDeskripsiRataRataList(formattedData);
          setDeskripsiRataRataCoverage(data.coverage || null);
        } else {
          setKategoriList(formattedData);
          setCoverageInfo(data.coverage || null);
        }
      } catch (err: any) {
        if (err.message?.includes('belum ditugaskan')) return;
        showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat kategori' });
      } finally {
        setKategoriLoading(false);
      }
    };

    fetchKategori();
  }, [activeTab, selectedMapelAkademik, jenisPenilaianAktif]);

  useEffect(() => {
    if (selectedMapelId === null || activeTab !== 'bobot') {
      setBobotList([]);
      initialBobotListRef.current = [];
      setIsBobotLocked(false);
      return;
    }

    const fetchBobot = async () => {
      setBobotLoading(true);
      try {
        const token = localStorage.getItem('token');
        const jenisParam = getJenisParam(jenisPenilaianAktif);
        const res = await fetch(
          `${API}/atur-penilaian/bobot-akademik/${selectedMapelId}?${jenisParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          let errorData;
          try {
            errorData = await res.json();
          } catch {
            errorData = { message: await res.text(), code: null };
          }

          if (errorData.code === 'NOT_ASSIGNED') {
            setIsNotAssigned(true);
            return;
          }

          if (errorData.code === 'PERIOD_NOT_OPEN') {
            showModal({
              type: 'warning',
              title: 'Periode Belum Dibuka',
              message: errorData.message || 'Admin belum membuka periode penilaian.'
            });
            setBobotList([]);
            setBobotLoading(false);
            return;
          }

          if (errorData.code === 'PERIOD_LOCKED') {
            showModal({
              type: 'warning',
              title: 'Periode Terkunci',
              message: errorData.message || 'Data sudah dikunci.'
            });
            return;
          }

          if (res.status === 403) {
            showModal({
              type: 'error',
              title: 'Akses Ditolak',
              message: errorData.message || 'Anda tidak memiliki akses'
            });
            return;
          }

          throw new Error(errorData.message || `HTTP ${res.status}`);
        }

        const result = await res.json();
        const bobotData: any[] = result.data || [];
        setIsBobotLocked(result.is_locked || false);

        const bobotMap = new Map<number, number>();
        bobotData.forEach((b: any) => {
          const numBobot = typeof b.bobot === 'number' ? b.bobot : parseFloat(b.bobot);
          bobotMap.set(b.komponen_id, isNaN(numBobot) ? 0 : numBobot);
        });

        const fullBobot = komponenList.map((k) => ({
          komponen_id: k.id_komponen,
          bobot: bobotMap.get(k.id_komponen) || 0,
        }));

        setBobotList(fullBobot);
        initialBobotListRef.current = JSON.parse(JSON.stringify(fullBobot));
      } catch (err: any) {
        if (err.message.includes('belum ditugaskan')) return;
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal mengambil bobot penilaian' });
      } finally {
        setBobotLoading(false);
      }
    };

    fetchBobot();
  }, [selectedMapelId, komponenList, activeTab, showModal, handleLogout, jenisPenilaianAktif]);

  const handleTabChange = (tab: 'kokurikuler' | 'akademik' | 'bobot' | 'deskripsi-rata-rata') => {
    if (tab !== 'akademik') {
      setSelectedMapelAkademik(null);
      setCoverageInfo(null);
    }
    if (tab !== 'bobot') {
      setSelectedMapelId(null);
      setIsBobotLocked(false);
    }
    if (tab !== 'deskripsi-rata-rata') {
      setDeskripsiRataRataList([]);
      setDeskripsiRataRataCoverage(null);
    }
    setKategoriList([]);
    setActiveTab(tab);
  };

  // ====== BATCH EDIT KOKURIKULER ======
  const loadGradesForAspek = (aspekId: number | null) => {
    if (!aspekId) {
      const defaultGrades = [
        { grade: 'A', min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
        { grade: 'B', min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
        { grade: 'C', min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
        { grade: 'D', min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
        { grade: 'E', min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
      ];
      setBatchGrades(defaultGrades);
      setOriginalBatchGrades([]);
    } else {
      const existingGrades = kategoriList
        .filter(k => (k as KategoriKokurikuler).id_aspek_kokurikuler === aspekId)
        .map(k => ({
          id: k.id,
          grade: (k as KategoriKokurikuler).grade,
          min_nilai: Math.floor(k.min_nilai),
          max_nilai: Math.floor(k.max_nilai),
          deskripsi: k.deskripsi,
          isNew: false,
        }))
        .sort((a, b) => b.min_nilai - a.min_nilai);

      if (existingGrades.length > 0) {
        setBatchGrades(existingGrades);
        setOriginalBatchGrades([...existingGrades]);
      } else {
        const defaultGrades = [
          { grade: 'A', min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
          { grade: 'B', min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
          { grade: 'C', min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
          { grade: 'D', min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
          { grade: 'E', min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
        ];
        setBatchGrades(defaultGrades);
        setOriginalBatchGrades([]);
      }
    }
  };

  const openBatchEdit = (aspekId: number | null = null) => {
    if (aspekId !== null && !canEditAspekKokurikuler(aspekId)) {
      const reason = getAspekKokurikulerLockReason(aspekId);
      showModal({
        type: 'warning',
        title: 'Aspek Terkunci',
        message: `Aspek ini tidak dapat dikelola saat ini.\n\nAlasan: ${reason}\n\n${jenisPenilaianAktif === 'PTS'
          ? 'Saat periode PTS aktif, hanya aspek Mutaba\'ah Yaumiyah yang dapat dikelola kategorinya. Aspek lain akan dibuka saat periode PAS.'
          : 'Silakan tunggu admin mengaktifkan periode penilaian.'}`
      });
      return;
    }

    setBatchEditAspekId(aspekId);
    loadGradesForAspek(aspekId);
    setShowBatchEdit(true);
  };

  const closeBatchEdit = () => {
    setBatchEditClosing(true);
    setTimeout(() => {
      setShowBatchEdit(false);
      setBatchEditClosing(false);
      setBatchEditAspekId(null);
      setBatchGrades([]);
      setOriginalBatchGrades([]);
    }, 200);
  };

  const addBatchGradeRow = () => {
    setBatchGrades(prev => [...prev, {
      grade: '',
      min_nilai: 0,
      max_nilai: 100,
      deskripsi: '',
      isNew: true,
    }]);
  };

  const removeBatchGradeRow = (index: number) => {
    setBatchGrades(prev => prev.filter((_, i) => i !== index));
  };

  const updateBatchGrade = (index: number, field: keyof BatchGradeItem, value: any) => {
    setBatchGrades(prev => prev.map((g, i) =>
      i === index ? { ...g, [field]: value } : g
    ));
  };

  const validateBatchGrades = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!batchEditAspekId) {
      errors.push('Pilih aspek kokurikuler terlebih dahulu.');
    }

    if (batchGrades.length === 0) {
      errors.push('Minimal harus ada 1 grade.');
      return { valid: false, errors };
    }

    batchGrades.forEach((g, i) => {
      if (!g.grade || g.grade.trim().length === 0) {
        errors.push(`Grade baris ${i + 1} tidak boleh kosong.`);
      }
      if (g.grade && g.grade.length !== 1) {
        errors.push(`Grade baris ${i + 1} harus tepat 1 karakter.`);
      }
      if (isNaN(g.min_nilai) || isNaN(g.max_nilai)) {
        errors.push(`Grade ${g.grade || i + 1}: Nilai min/max harus angka.`);
      } else {
        if (g.min_nilai < 0 || g.max_nilai > 100) {
          errors.push(`Grade ${g.grade}: Nilai harus antara 0-100.`);
        }
        if (g.min_nilai >= g.max_nilai) {
          errors.push(`Grade ${g.grade}: Min (${g.min_nilai}) harus < Max (${g.max_nilai}).`);
        }
      }
      if (!g.deskripsi || g.deskripsi.trim().length < 3) {
        errors.push(`Grade ${g.grade || i + 1}: Deskripsi minimal 3 karakter.`);
      }
    });

    const grades = batchGrades.map(g => g.grade?.toUpperCase()).filter(Boolean);
    const duplicates = grades.filter((g, i) => grades.indexOf(g) !== i);
    if (duplicates.length > 0) {
      errors.push(`Grade duplikat: ${[...new Set(duplicates)].join(', ')}`);
    }

    const sorted = [...batchGrades].sort((a, b) => a.min_nilai - b.min_nilai);
    let covered = new Set<number>();
    let hasOverlap = false;

    sorted.forEach(g => {
      for (let i = g.min_nilai; i <= g.max_nilai; i++) {
        if (covered.has(i)) {
          hasOverlap = true;
        }
        covered.add(i);
      }
    });

    if (hasOverlap) {
      errors.push('Ada overlap pada range nilai. Pastikan tidak ada nilai yang masuk ke 2 grade.');
    }

    return { valid: errors.length === 0, errors };
  };

  const hasBatchChanges = (): boolean => {
    if (originalBatchGrades.length === 0) {
      return true;
    }

    if (batchGrades.length !== originalBatchGrades.length) {
      return true;
    }

    const sortedCurrent = [...batchGrades].sort((a, b) =>
      (a.grade || '').localeCompare(b.grade || '')
    );
    const sortedOriginal = [...originalBatchGrades].sort((a, b) =>
      (a.grade || '').localeCompare(b.grade || '')
    );

    for (let i = 0; i < sortedCurrent.length; i++) {
      const current = sortedCurrent[i];
      const original = sortedOriginal[i];

      const currentGrade = (current.grade || '').toUpperCase().trim();
      const originalGrade = (original.grade || '').toUpperCase().trim();
      if (currentGrade !== originalGrade) return true;

      if (Number(current.min_nilai) !== Number(original.min_nilai)) return true;
      if (Number(current.max_nilai) !== Number(original.max_nilai)) return true;

      const currentDesc = (current.deskripsi || '').trim();
      const originalDesc = (original.deskripsi || '').trim();
      if (currentDesc !== originalDesc) return true;
    }

    return false;
  };

  const openConfirmSaveBatch = () => {
    const validation = validateBatchGrades();
    if (!validation.valid) {
      showModal({ type: 'warning', title: 'Validasi Gagal', message: validation.errors.join('\n') });
      return;
    }

    const hasChanges = hasBatchChanges();
    if (!hasChanges) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' });
      return;
    }

    setConfirmAction('save-batch');
    setShowConfirmModal(true);
  };

  const executeSaveBatch = async () => {
    setIsSavingBatch(true);
    try {
      const token = localStorage.getItem('token');

      const payload = {
        id_aspek_kokurikuler: batchEditAspekId,
        jenis: jenisPenilaianAktif,
        grades: batchGrades.map(g => ({
          id: g.id,
          grade: g.grade?.toUpperCase(),
          min_nilai: Math.floor(g.min_nilai),
          max_nilai: Math.floor(g.max_nilai),
          deskripsi: g.deskripsi.trim(),
          isNew: g.isNew,
        }))
      };

      const res = await fetch(`${API}/atur-penilaian/kategori-kokurikuler-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        setShowConfirmModal(false);
        closeBatchEdit();
        showModal({ type: 'success', title: 'Berhasil Disimpan!', message: `${batchGrades.length} grade berhasil disimpan.` });

        await reloadData();
      } else {
        setShowConfirmModal(false);
        showModal({ type: 'error', title: 'Gagal Menyimpan', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSavingBatch(false);
    }
  };

  // ====== BATCH EDIT AKADEMIK ======
  const loadBatchAkademik = () => {
    const existingGrades = kategoriList
      .map(k => ({
        id: k.id,
        min_nilai: Math.floor(k.min_nilai),
        max_nilai: Math.floor(k.max_nilai),
        deskripsi: k.deskripsi,
        isNew: false,
      }))
      .sort((a, b) => b.min_nilai - a.min_nilai);

    if (existingGrades.length > 0) {
      setBatchAkademik(existingGrades);
      setOriginalBatchAkademik([...existingGrades]);
    } else {
      const defaultGrades = [
        { min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
        { min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
        { min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
        { min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
        { min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
      ];
      setBatchAkademik(defaultGrades);
      setOriginalBatchAkademik([]);
    }
  };

  const openBatchEditAkademik = () => {
    if (!canEditAkademik()) {
      showModal({
        type: 'warning',
        title: 'Kategori Akademik Terkunci',
        message: 'Kategori akademik tidak dapat dikelola saat ini.\n\nSilakan tunggu admin mengaktifkan periode penilaian.'
      });
      return;
    }

    if (!selectedMapelAkademik) {
      showModal({
        type: 'warning',
        title: 'Pilih Mata Pelajaran',
        message: 'Silakan pilih mata pelajaran terlebih dahulu.'
      });
      return;
    }

    loadBatchAkademik();
    setShowBatchEditAkademik(true);
  };

  const closeBatchEditAkademik = () => {
    setBatchEditAkademikClosing(true);
    setTimeout(() => {
      setShowBatchEditAkademik(false);
      setBatchEditAkademikClosing(false);
      setBatchAkademik([]);
      setOriginalBatchAkademik([]);
    }, 200);
  };

  const addBatchAkademikRow = () => {
    setBatchAkademik(prev => [...prev, {
      min_nilai: 0,
      max_nilai: 100,
      deskripsi: '',
      isNew: true,
    }]);
  };

  const removeBatchAkademikRow = (index: number) => {
    setBatchAkademik(prev => prev.filter((_, i) => i !== index));
  };

  const updateBatchAkademik = (index: number, field: keyof BatchGradeItem, value: any) => {
    setBatchAkademik(prev => prev.map((g, i) =>
      i === index ? { ...g, [field]: value } : g
    ));
  };

  const validateBatchAkademik = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (batchAkademik.length === 0) {
      errors.push('Minimal harus ada 1 kategori.');
      return { valid: false, errors };
    }

    batchAkademik.forEach((g, i) => {
      if (isNaN(g.min_nilai) || isNaN(g.max_nilai)) {
        errors.push(`Kategori baris ${i + 1}: Nilai min/max harus angka.`);
      } else {
        if (g.min_nilai < 0 || g.max_nilai > 100) {
          errors.push(`Kategori baris ${i + 1}: Nilai harus antara 0-100.`);
        }
        if (g.min_nilai >= g.max_nilai) {
          errors.push(`Kategori baris ${i + 1}: Min (${g.min_nilai}) harus < Max (${g.max_nilai}).`);
        }
      }
      if (!g.deskripsi || g.deskripsi.trim().length < 3) {
        errors.push(`Kategori baris ${i + 1}: Deskripsi minimal 3 karakter.`);
      }
    });

    const sorted = [...batchAkademik].sort((a, b) => a.min_nilai - b.min_nilai);
    let covered = new Set<number>();
    let hasOverlap = false;

    sorted.forEach(g => {
      for (let i = g.min_nilai; i <= g.max_nilai; i++) {
        if (covered.has(i)) {
          hasOverlap = true;
        }
        covered.add(i);
      }
    });

    if (hasOverlap) {
      errors.push('Ada overlap pada range nilai. Pastikan tidak ada nilai yang masuk ke 2 kategori.');
    }

    return { valid: errors.length === 0, errors };
  };

  const hasBatchAkademikChanges = (): boolean => {
    if (originalBatchAkademik.length === 0) {
      return true;
    }

    if (batchAkademik.length !== originalBatchAkademik.length) {
      return true;
    }

    const sortedCurrent = [...batchAkademik].sort((a, b) => a.min_nilai - b.min_nilai);
    const sortedOriginal = [...originalBatchAkademik].sort((a, b) => a.min_nilai - b.min_nilai);

    for (let i = 0; i < sortedCurrent.length; i++) {
      const current = sortedCurrent[i];
      const original = sortedOriginal[i];

      if (Number(current.min_nilai) !== Number(original.min_nilai)) return true;
      if (Number(current.max_nilai) !== Number(original.max_nilai)) return true;

      const currentDesc = (current.deskripsi || '').trim();
      const originalDesc = (original.deskripsi || '').trim();
      if (currentDesc !== originalDesc) return true;
    }

    return false;
  };

  const openConfirmSaveBatchAkademik = () => {
    const validation = validateBatchAkademik();
    if (!validation.valid) {
      showModal({ type: 'warning', title: 'Validasi Gagal', message: validation.errors.join('\n') });
      return;
    }

    const hasChanges = hasBatchAkademikChanges();
    if (!hasChanges) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' });
      return;
    }

    setConfirmAction('save-batch-akademik');
    setShowConfirmModal(true);
  };

  const executeSaveBatchAkademik = async () => {
    setIsSavingBatchAkademik(true);
    try {
      const token = localStorage.getItem('token');

      // Hapus semua kategori lama, lalu insert yang baru
      const deletePromises = originalBatchAkademik
        .filter(g => g.id)
        .map(g => fetch(`${API}/atur-penilaian/kategori-akademik/${g.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }));

      await Promise.all(deletePromises);

      // Insert kategori baru
      const insertPromises = batchAkademik.map(g => fetch(`${API}/atur-penilaian/kategori-akademik`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          min_nilai: Math.floor(g.min_nilai),
          max_nilai: Math.floor(g.max_nilai),
          deskripsi: g.deskripsi.trim(),
          urutan: 0,
          mapel_id: selectedMapelAkademik,
          jenis: jenisPenilaianAktif,
        })
      }));

      const results = await Promise.all(insertPromises);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        setShowConfirmModal(false);
        closeBatchEditAkademik();
        showModal({ type: 'success', title: 'Berhasil Disimpan!', message: `${batchAkademik.length} kategori berhasil disimpan.` });

        await reloadData();
      } else {
        setShowConfirmModal(false);
        showModal({ type: 'error', title: 'Gagal Menyimpan', message: 'Beberapa kategori gagal disimpan.' });
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSavingBatchAkademik(false);
    }
  };

  // ====== BATCH EDIT DESKRIPSI RATA-RATA ======
  const loadBatchDeskripsi = () => {
    const existingGrades = deskripsiRataRataList
      .map(k => ({
        id: k.id,
        min_nilai: parseFloat(k.min_nilai),  // ✅ parseFloat untuk desimal
        max_nilai: parseFloat(k.max_nilai),  // ✅ parseFloat untuk desimal
        deskripsi: k.deskripsi,
        isNew: false,
      }))
      .sort((a, b) => b.min_nilai - a.min_nilai);

    if (existingGrades.length > 0) {
      setBatchDeskripsi(existingGrades);
      setOriginalBatchDeskripsi([...existingGrades]);
    } else {
      const defaultGrades = [
        { min_nilai: 90, max_nilai: 100, deskripsi: 'Sangat Baik', isNew: true },
        { min_nilai: 80, max_nilai: 89, deskripsi: 'Baik', isNew: true },
        { min_nilai: 70, max_nilai: 79, deskripsi: 'Cukup', isNew: true },
        { min_nilai: 60, max_nilai: 69, deskripsi: 'Kurang', isNew: true },
        { min_nilai: 0, max_nilai: 59, deskripsi: 'Perlu Bimbingan', isNew: true },
      ];
      setBatchDeskripsi(defaultGrades);
      setOriginalBatchDeskripsi([]);
    }
  };

  const openBatchEditDeskripsi = () => {
    if (!canEditDeskripsiRataRata()) {
      showModal({
        type: 'warning',
        title: 'Deskripsi Rata-rata Terkunci',
        message: getDeskripsiRataRataLockReason() + '\n\nDeskripsi rata-rata hanya dapat diatur saat periode PTS aktif.'
      });
      return;
    }

    loadBatchDeskripsi();
    setShowBatchEditDeskripsi(true);
  };

  const closeBatchEditDeskripsi = () => {
    setBatchEditDeskripsiClosing(true);
    setTimeout(() => {
      setShowBatchEditDeskripsi(false);
      setBatchEditDeskripsiClosing(false);
      setBatchDeskripsi([]);
      setOriginalBatchDeskripsi([]);
    }, 200);
  };

  const addBatchDeskripsiRow = () => {
    setBatchDeskripsi(prev => [...prev, {
      min_nilai: 0,
      max_nilai: 100,
      deskripsi: '',
      isNew: true,
    }]);
  };

  const removeBatchDeskripsiRow = (index: number) => {
    setBatchDeskripsi(prev => prev.filter((_, i) => i !== index));
  };

  const updateBatchDeskripsi = (index: number, field: keyof BatchGradeItem, value: any) => {
    setBatchDeskripsi(prev => prev.map((g, i) =>
      i === index ? { ...g, [field]: value } : g
    ));
  };

  const validateBatchDeskripsi = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (batchDeskripsi.length === 0) {
      errors.push('Minimal harus ada 1 kategori.');
      return { valid: false, errors };
    }

    batchDeskripsi.forEach((g, i) => {
      if (isNaN(g.min_nilai) || isNaN(g.max_nilai)) {
        errors.push(`Kategori baris ${i + 1}: Nilai min/max harus angka.`);
      } else {
        if (g.min_nilai < 0 || g.max_nilai > 100) {
          errors.push(`Kategori baris ${i + 1}: Nilai harus antara 0-100.`);
        }
        if (g.min_nilai >= g.max_nilai) {
          errors.push(`Kategori baris ${i + 1}: Min (${g.min_nilai}) harus < Max (${g.max_nilai}).`);
        }
      }
      if (!g.deskripsi || g.deskripsi.trim().length < 3) {
        errors.push(`Kategori baris ${i + 1}: Deskripsi minimal 3 karakter.`);
      }
    });

    // ✅ DESKRIPSI RATA-RATA: Validasi overlap untuk desimal (cek range, bukan loop integer)
    const sorted = [...batchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);
    let hasOverlap = false;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Cek overlap: max saat ini harus < min berikutnya
      if (current.max_nilai >= next.min_nilai) {
        hasOverlap = true;
        break;
      }
    }

    if (hasOverlap) {
      errors.push('Ada overlap pada range nilai. Pastikan tidak ada nilai yang masuk ke 2 kategori.');
    }

    return { valid: errors.length === 0, errors };
  };

  const hasBatchDeskripsiChanges = (): boolean => {
    if (originalBatchDeskripsi.length === 0) {
      return true;
    }

    if (batchDeskripsi.length !== originalBatchDeskripsi.length) {
      return true;
    }

    const sortedCurrent = [...batchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);
    const sortedOriginal = [...originalBatchDeskripsi].sort((a, b) => a.min_nilai - b.min_nilai);

    for (let i = 0; i < sortedCurrent.length; i++) {
      const current = sortedCurrent[i];
      const original = sortedOriginal[i];

      if (Number(current.min_nilai) !== Number(original.min_nilai)) return true;
      if (Number(current.max_nilai) !== Number(original.max_nilai)) return true;

      const currentDesc = (current.deskripsi || '').trim();
      const originalDesc = (original.deskripsi || '').trim();
      if (currentDesc !== originalDesc) return true;
    }

    return false;
  };

  const openConfirmSaveBatchDeskripsi = () => {
    const validation = validateBatchDeskripsi();
    if (!validation.valid) {
      showModal({ type: 'warning', title: 'Validasi Gagal', message: validation.errors.join('\n') });
      return;
    }

    const hasChanges = hasBatchDeskripsiChanges();
    if (!hasChanges) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data yang sudah ada.' });
      return;
    }

    setConfirmAction('save-batch-deskripsi');
    setShowConfirmModal(true);
  };

  const executeSaveBatchDeskripsi = async () => {
    setIsSavingBatchDeskripsi(true);
    try {
      const token = localStorage.getItem('token');

      // Hapus semua kategori lama, lalu insert yang baru
      const deletePromises = originalBatchDeskripsi
        .filter(g => g.id)
        .map(g => fetch(`${API}/atur-penilaian/deskripsi-rata-rata/${g.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }));

      await Promise.all(deletePromises);

      // Insert kategori baru
      const insertPromises = batchDeskripsi.map(g => fetch(`${API}/atur-penilaian/deskripsi-rata-rata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          min_nilai: parseFloat(g.min_nilai.toFixed(2)),  // ✅ 2 desimal
          max_nilai: parseFloat(g.max_nilai.toFixed(2)),  // ✅ 2 desimal
          deskripsi: g.deskripsi.trim(),
        })
      }));

      const results = await Promise.all(insertPromises);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        setShowConfirmModal(false);
        closeBatchEditDeskripsi();
        showModal({ type: 'success', title: 'Berhasil Disimpan!', message: `${batchDeskripsi.length} kategori berhasil disimpan.` });

        await reloadData();
      } else {
        setShowConfirmModal(false);
        showModal({ type: 'error', title: 'Gagal Menyimpan', message: 'Beberapa kategori gagal disimpan.' });
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSavingBatchDeskripsi(false);
    }
  };

  const isPTSActive = jenisPenilaianAktif === 'PTS';

  const handleBobotChange = (komponenId: number, value: string) => {
    let num = parseFloat(value);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    num = Math.round(num * 100) / 100;

    setBobotList((prev) =>
      prev.map((b) => (b.komponen_id === komponenId ? { ...b, bobot: num } : b))
    );
  };

  const validateBobot = (): boolean => {
    if (!selectedMapelId) return false;

    const isUnchanged = bobotList.every((b) => {
      const initial = initialBobotListRef.current.find((i) => i.komponen_id === b.komponen_id);
      return initial && Math.abs(b.bobot - initial.bobot) < 0.01;
    });

    if (isUnchanged) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return false;
    }

    const adaNegatif = bobotList.some(b => b.bobot < 0);
    if (adaNegatif) {
      showModal({ type: 'warning', title: 'Bobot Tidak Valid', message: 'Bobot tidak boleh negatif.' });
      return false;
    }

    const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
    if (Math.abs(total - 100) > 0.01) {
      showModal({
        type: 'warning',
        title: 'Total Bobot Salah',
        message: `Total bobot harus tepat 100%.\nSaat ini: ${total.toFixed(2)}%`,
      });
      return false;
    }

    if (isPTSActive) {
      showModal({
        type: 'warning',
        title: 'Periode PTS Aktif',
        message: 'Bobot tidak dapat diubah saat periode PTS aktif.',
      });
      return false;
    }

    return true;
  };

  const openConfirmSaveBobot = () => {
    if (!validateBobot()) return;
    setConfirmAction('save-bobot');
    setShowConfirmModal(true);
  };

  const executeSaveBobot = async () => {
    if (!selectedMapelId) return;

    setIsSavingBobot(true);
    try {
      const token = localStorage.getItem('token');
      const jenisParam = getJenisParam(jenisPenilaianAktif);

      const res = await fetch(
        `${API}/atur-penilaian/bobot-akademik/${selectedMapelId}?${jenisParam}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bobot: bobotList,
            jenis: jenisPenilaianAktif,
          }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        showModal({ type: 'success', title: 'Bobot Disimpan!', message: result.message || 'Bobot penilaian berhasil disimpan.' });
        initialBobotListRef.current = JSON.parse(JSON.stringify(bobotList));
      } else {
        showModal({ type: 'error', title: 'Gagal Menyimpan', message: result.message || 'Gagal menyimpan bobot.' });
      }
    } catch (err) {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan bobot.' });
    } finally {
      setIsSavingBobot(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <GlobalStyles />
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (isNotAssigned) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <GlobalStyles />
        {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 ap-fadeIn">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 ap-scaleIn">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ap-pulse">
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
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                boxShadow: '0 3px 12px rgba(232,105,10,0.3)'
              }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalBobot = bobotList.reduce((sum, b) => {
    const komponen = komponenList.find((k) => k.id_komponen === b.komponen_id);
    const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
    const actualBobot = isPTSActive ? (isPTS ? 100 : 0) : b.bobot;
    return sum + actualBobot;
  }, 0);

  const isBobotValid = Math.abs(totalBobot - 100) < 0.01;
  const mapelWajibList = mapelList.filter(m => m.jenis === 'wajib');

  const groupedKokurikuler = aspekList.map(aspek => ({
    aspek,
    grades: kategoriList
      .filter(k => (k as KategoriKokurikuler).id_aspek_kokurikuler === aspek.id_aspek_kokurikuler)
      .sort((a, b) => b.min_nilai - a.min_nilai)
  }));

  const isPasActive = jenisPenilaianAktif === 'PAS';
  const isPtsActive = jenisPenilaianAktif === 'PTS';

  const renderKokurikulerBanner = () => {
    if (isReadOnly) return null;
    if (!jenisPenilaianAktif) return null;

    const editableAspek = aspekList.filter(a => canEditAspekKokurikuler(a.id_aspek_kokurikuler));
    const lockedAspek = aspekList.filter(a => !canEditAspekKokurikuler(a.id_aspek_kokurikuler));

    return (
      <div className="mb-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${isPtsActive ? '#fdba74' : '#86efac'}` }}>
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: isPtsActive ? '#fff7ed' : '#ecfdf5' }}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPtsActive ? 'bg-orange-100' : 'bg-green-100'}`}>
            <Calendar className={`w-4 h-4 ${isPtsActive ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${isPtsActive ? 'text-orange-900' : 'text-green-900'}`}>
              Periode {jenisPenilaianAktif} Sedang Aktif
            </p>
            <p className={`text-xs ${isPtsActive ? 'text-orange-700' : 'text-green-700'}`}>
              Rules pengelolaan kategori kokurikuler
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-white">
          <div className="p-4 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Unlock size={12} className="text-green-600" />
              </div>
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Dapat Dikelola</p>
            </div>
            <div className="space-y-2">
              {editableAspek.map(aspek => (
                <div key={aspek.id_aspek_kokurikuler} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-900">{aspek.nama}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={12} className="text-gray-600" />
              </div>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Terkunci</p>
            </div>
            {lockedAspek.length > 0 ? (
              <div className="space-y-2">
                {lockedAspek.map(aspek => (
                  <div key={aspek.id_aspek_kokurikuler} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <Lock size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{aspek.nama}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 font-medium">✨ Semua aspek terbuka</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {confirmCfg && (
        <ConfirmModal
          message={confirmCfg.message}
          onConfirm={() => { confirmCfg.onConfirm(); setConfirmCfg(null); }}
          onCancel={() => setConfirmCfg(null)}
        />
      )}
      {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Atur Penilaian</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola kategori dan bobot penilaian kelas Anda</p>
      </div>

      {isReadOnly && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{
            background: readOnlyReason === 'locked' ? '#fef2f2' : '#fef3c7',
            border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}`
          }}>
          <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'}`} />
          <div className="flex-1">
            <p className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
              Mode Baca Saja (Read Only)
            </p>
            <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'}`}>
              {readOnlyReason === 'locked'
                ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat konfigurasi, tetapi tidak dapat mengedit.'
                : 'Periode penilaian belum aktif. Anda dapat melihat konfigurasi, tetapi belum dapat mengedit. Silakan hubungi admin untuk membuka periode penilaian.'}
            </p>
          </div>
        </div>
      )}

      {jenisPenilaianAktif && (
        <div className="mb-5 p-4 rounded-xl flex items-center gap-3"
          style={{
            background: jenisPenilaianAktif === 'PTS'
              ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
              : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: `2px solid ${jenisPenilaianAktif === 'PTS' ? '#fdba74' : '#86efac'}`
          }}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${jenisPenilaianAktif === 'PTS' ? 'bg-orange-200' : 'bg-green-200'
            }`}>
            {jenisPenilaianAktif === 'PTS' ? (
              <Award className="w-6 h-6 text-orange-700" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-green-700" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-base font-bold ${jenisPenilaianAktif === 'PTS' ? 'text-orange-900' : 'text-green-900'
              }`}>
              📋 Mode Konfigurasi: {jenisPenilaianAktif === 'PTS' ? 'PTS (Penilaian Tengah Semester)' : 'PAS (Penilaian Akhir Semester)'}
            </p>
            <p className={`text-xs mt-0.5 ${jenisPenilaianAktif === 'PTS' ? 'text-orange-700' : 'text-green-700'
              }`}>
              {jenisPenilaianAktif === 'PTS'
                ? 'Anda sedang mengatur konfigurasi untuk PTS. Data PAS tidak akan terpengaruh.'
                : 'Anda sedang mengatur konfigurasi untuk PAS. Data PTS sudah dikunci dan tidak dapat diubah.'}
            </p>
          </div>
        </div>
      )}

      {mapelList.length === 0 && (
        <div className="mb-6 p-4 rounded-2xl flex items-start gap-3"
          style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            border: '2px solid #fdba74',
            boxShadow: '0 2px 8px rgba(253,186,116,0.2)'
          }}>
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} style={{ color: '#c2410c' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1" style={{ color: '#9a3412' }}>
              Mata Pelajaran Belum Diatur
            </h3>
            <p className="text-xs" style={{ color: '#7c2d12' }}>
              Belum ada mata pelajaran yang dikonfigurasi untuk tahun ajaran ini.
              Silakan hubungi <strong>Administrator</strong> untuk menambahkan mata pelajaran.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        {/* Tabs */}
        <div className="px-4 sm:px-6 py-3 border-b" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg ${activeTab === 'kokurikuler'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              onClick={() => handleTabChange('kokurikuler')}
            >
              <span className="hidden sm:inline">Kategori Kokurikuler</span>
              <span className="sm:hidden">Kokurikuler</span>
            </button>
            <button
              className={`px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg ${activeTab === 'akademik'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              onClick={() => handleTabChange('akademik')}
            >
              <span className="hidden sm:inline">Kategori Akademik</span>
              <span className="sm:hidden">Akademik</span>
            </button>
            <button
              className={`px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg relative ${!canEditDeskripsiRataRata()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : activeTab === 'deskripsi-rata-rata'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              onClick={() => {
                if (!canEditDeskripsiRataRata()) {
                  showModal({
                    type: 'warning',
                    title: 'Deskripsi Rata-rata Terkunci',
                    message: getDeskripsiRataRataLockReason() + '\n\nDeskripsi rata-rata hanya dapat diatur saat periode PTS aktif.'
                  });
                  return;
                }
                handleTabChange('deskripsi-rata-rata');
              }}
              title={!canEditDeskripsiRataRata() ? 'Hanya aktif saat PTS' : ''}
            >
              <span className="hidden sm:inline">Deskripsi Rata-rata</span>
              <span className="sm:hidden">Deskripsi</span>
              {!canEditDeskripsiRataRata() && <Lock size={12} className="inline ml-1" />}
            </button>
            <button
              className={`px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg ${activeTab === 'bobot'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              onClick={() => handleTabChange('bobot')}
            >
              <span className="hidden sm:inline">Bobot Penilaian</span>
              <span className="sm:hidden">Bobot</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {/* ====== TAB: KOKURIKULER ====== */}
          {activeTab === 'kokurikuler' && (
            <div>
              {renderKokurikulerBanner()}

              <CoverageWarning coverage={coverageInfo} />

              {kategoriLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </div>
              ) : groupedKokurikuler.length === 0 ? (
                <div className="py-12 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                  <p className="text-base font-bold" style={{ color: '#c95b08' }}>Belum ada kategori kokurikuler</p>
                  <p className="text-sm text-gray-500 mt-2">Klik tombol "Edit" pada aspek untuk mulai menambahkan grade</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedKokurikuler.map(({ aspek, grades }) => {
                    const isAspekEditable = canEditAspekKokurikuler(aspek.id_aspek_kokurikuler);
                    const lockReason = getAspekKokurikulerLockReason(aspek.id_aspek_kokurikuler);

                    return (
                      <div
                        key={aspek.id_aspek_kokurikuler}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          border: `1px solid ${isAspekEditable ? '#fde0c8' : '#e5e7eb'}`,
                          opacity: isAspekEditable ? 1 : 0.75
                        }}
                      >
                        <div
                          className="px-5 py-3 flex items-center justify-between gap-3"
                          style={{
                            background: isAspekEditable ? '#fff7ed' : '#f9fafb',
                            borderBottom: `1px solid ${isAspekEditable ? '#fde0c8' : '#e5e7eb'}`
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: isAspekEditable ? '#fed7aa' : '#e5e7eb' }}
                            >
                              <Layers size={16} style={{ color: isAspekEditable ? '#c2410c' : '#6b7280' }} />
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <h3 className="text-sm font-bold truncate" style={{ color: isAspekEditable ? '#7a3a0a' : '#6b7280' }} title={aspek.nama}>
                                {aspek.nama}
                              </h3>
                              {!isAspekEditable && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 flex-shrink-0 whitespace-nowrap">
                                  <Lock size={10} />
                                  <span className="hidden lg:inline">{lockReason}</span>
                                </span>
                              )}
                              <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{grades.length} grade</span>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <button
                              onClick={() => openBatchEdit(aspek.id_aspek_kokurikuler)}
                              disabled={!isAspekEditable}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{
                                background: isAspekEditable ? '#fff0e5' : '#e5e7eb',
                                border: isAspekEditable ? '1px solid #f5a623' : '1px solid #d1d5db',
                                color: isAspekEditable ? '#b35a08' : '#6b7280'
                              }}
                              onMouseEnter={e => { if (isAspekEditable) e.currentTarget.style.background = '#ffe4c8'; }}
                              onMouseLeave={e => { if (isAspekEditable) e.currentTarget.style.background = '#fff0e5'; }}
                              title={!isAspekEditable ? `Aspek ini tidak bisa dikelola saat ini. Alasan: ${lockReason}` : ''}
                            >
                              {isAspekEditable ? (
                                <>
                                  <Pencil size={13} />
                                  <span className="hidden sm:inline">Edit</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={13} />
                                  <span className="hidden sm:inline">Terkunci</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {grades.length > 0 ? (
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr style={{ background: isAspekEditable ? '#fffaf6' : '#f9fafb' }}>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Grade</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Range Nilai</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Deskripsi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {grades.map((g, idx) => (
                                <tr key={g.id} style={{ borderTop: idx > 0 ? '1px solid #fde0c8' : 'none' }}>
                                  <td className="px-4 py-2.5">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                                      style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                      {(g as KategoriKokurikuler).grade}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700">
                                    {Math.floor(g.min_nilai)} – {Math.floor(g.max_nilai)}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700">{g.deskripsi}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="px-5 py-6 text-center text-sm text-gray-400">
                            Belum ada grade untuk aspek ini
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: AKADEMIK (UI BARU - KONSISTEN DENGAN KOKURIKULER) ====== */}
          {activeTab === 'akademik' && (
            <div>
              <div className="mb-6">
                <label className={labelCls} style={labelColor}>
                  Mata Pelajaran
                </label>
                <select
                  value={selectedMapelAkademik || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMapelAkademik(val ? Number(val) : null);
                  }}
                  className={inputCls}
                  style={{ maxWidth: '400px' }}
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {mapelWajibList.map((mapel) => (
                    <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                      {mapel.nama_mapel}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMapelAkademik ? (
                <>
                  <CoverageWarning coverage={coverageInfo} />

                  {kategoriLoading ? (
                    <div className="py-12 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Memuat data...</p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden transition-all"
                      style={{
                        border: `1px solid ${canEditAkademik() ? '#fde0c8' : '#e5e7eb'}`,
                        opacity: canEditAkademik() ? 1 : 0.75
                      }}>
                      {/* Header Card */}
                      <div
                        className="px-5 py-3 flex items-center justify-between gap-3"
                        style={{
                          background: canEditAkademik() ? '#fff7ed' : '#f9fafb',
                          borderBottom: `1px solid ${canEditAkademik() ? '#fde0c8' : '#e5e7eb'}`
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: canEditAkademik() ? '#fed7aa' : '#e5e7eb' }}
                          >
                            <BookOpen size={16} style={{ color: canEditAkademik() ? '#c2410c' : '#6b7280' }} />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <h3 className="text-sm font-bold truncate" style={{ color: canEditAkademik() ? '#7a3a0a' : '#6b7280' }}>
                              Kategori Akademik
                            </h3>
                            {!canEditAkademik() && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 flex-shrink-0 whitespace-nowrap">
                                <Lock size={10} />
                                <span>Terkunci</span>
                              </span>
                            )}
                            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                              {kategoriList.length} kategori
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <button
                            onClick={() => openBatchEditAkademik()}
                            disabled={!canEditAkademik()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            style={{
                              background: canEditAkademik() ? '#fff0e5' : '#e5e7eb',
                              border: canEditAkademik() ? '1px solid #f5a623' : '1px solid #d1d5db',
                              color: canEditAkademik() ? '#b35a08' : '#6b7280'
                            }}
                            onMouseEnter={e => { if (canEditAkademik()) e.currentTarget.style.background = '#ffe4c8'; }}
                            onMouseLeave={e => { if (canEditAkademik()) e.currentTarget.style.background = '#fff0e5'; }}
                          >
                            {canEditAkademik() ? (
                              <>
                                <Pencil size={13} />
                                <span className="hidden sm:inline">Edit Semua</span>
                              </>
                            ) : (
                              <>
                                <Lock size={13} />
                                <span className="hidden sm:inline">Terkunci</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Tabel Kategori */}
                      {(kategoriList as KategoriAkademik[]).length > 0 ? (
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr style={{ background: canEditAkademik() ? '#fffaf6' : '#f9fafb' }}>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">No</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Range Nilai</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Deskripsi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(kategoriList as KategoriAkademik[])
                              .sort((a, b) => b.min_nilai - a.min_nilai)
                              .map((k, idx) => (
                                <tr key={k.id} style={{ borderTop: idx > 0 ? '1px solid #fde0c8' : 'none' }}>
                                  <td className="px-4 py-2.5 text-gray-500 font-medium">{idx + 1}</td>
                                  <td className="px-4 py-2.5 text-gray-700">
                                    {Math.floor(k.min_nilai)} – {Math.floor(k.max_nilai)}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700">{k.deskripsi}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="px-5 py-6 text-center text-sm text-gray-400">
                          Belum ada kategori untuk mata pelajaran ini
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                  <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: DESKRIPSI RATA-RATA (UI BARU - KONSISTEN DENGAN KOKURIKULER) ====== */}
          {activeTab === 'deskripsi-rata-rata' && (
            <div>
              {/* Info Banner */}
              {!canEditDeskripsiRataRata() ? (
                <div className="mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid #fca5a5' }}>
                  <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#fef2f2' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
                      <Lock className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-900">Deskripsi Rata-rata Terkunci</p>
                      <p className="text-xs text-red-700">{getDeskripsiRataRataLockReason()}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-white">
                    <p className="text-xs text-gray-600">
                      Deskripsi rata-rata hanya dapat diatur saat <strong>periode PTS aktif</strong>.
                      {jenisPenilaianAktif === 'PAS' && ' Saat ini periode PAS sedang aktif.'}
                      {!jenisPenilaianAktif && ' Silakan hubungi admin untuk membuka periode PTS.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-5 rounded-xl overflow-hidden" style={{ border: '1px solid #fdba74' }}>
                  <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#fff7ed' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-900">Periode PTS Sedang Aktif</p>
                      <p className="text-xs text-orange-700">Deskripsi rata-rata digunakan untuk rapor PTS</p>
                    </div>
                  </div>
                </div>
              )}

              <CoverageWarning coverage={deskripsiRataRataCoverage} />

              {deskripsiRataRataLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden transition-all"
                  style={{
                    border: `1px solid ${canEditDeskripsiRataRata() ? '#fde0c8' : '#e5e7eb'}`,
                    opacity: canEditDeskripsiRataRata() ? 1 : 0.75
                  }}>
                  {/* Header Card */}
                  <div
                    className="px-5 py-3 flex items-center justify-between gap-3"
                    style={{
                      background: canEditDeskripsiRataRata() ? '#fff7ed' : '#f9fafb',
                      borderBottom: `1px solid ${canEditDeskripsiRataRata() ? '#fde0c8' : '#e5e7eb'}`
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: canEditDeskripsiRataRata() ? '#fed7aa' : '#e5e7eb' }}
                      >
                        <BarChart3 size={16} style={{ color: canEditDeskripsiRataRata() ? '#c2410c' : '#6b7280' }} />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <h3 className="text-sm font-bold truncate" style={{ color: canEditDeskripsiRataRata() ? '#7a3a0a' : '#6b7280' }}>
                          Deskripsi Rata-rata Nilai
                        </h3>
                        {!canEditDeskripsiRataRata() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 flex-shrink-0 whitespace-nowrap">
                            <Lock size={10} />
                            <span>Terkunci</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                          {deskripsiRataRataList.length} kategori
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={() => openBatchEditDeskripsi()}
                        disabled={!canEditDeskripsiRataRata()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        style={{
                          background: canEditDeskripsiRataRata() ? '#fff0e5' : '#e5e7eb',
                          border: canEditDeskripsiRataRata() ? '1px solid #f5a623' : '1px solid #d1d5db',
                          color: canEditDeskripsiRataRata() ? '#b35a08' : '#6b7280'
                        }}
                        onMouseEnter={e => { if (canEditDeskripsiRataRata()) e.currentTarget.style.background = '#ffe4c8'; }}
                        onMouseLeave={e => { if (canEditDeskripsiRataRata()) e.currentTarget.style.background = '#fff0e5'; }}
                      >
                        {canEditDeskripsiRataRata() ? (
                          <>
                            <Pencil size={13} />
                            <span className="hidden sm:inline">Edit Semua</span>
                          </>
                        ) : (
                          <>
                            <Lock size={13} />
                            <span className="hidden sm:inline">Terkunci</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tabel Kategori */}
                  {deskripsiRataRataList.length > 0 ? (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr style={{ background: canEditDeskripsiRataRata() ? '#fffaf6' : '#f9fafb' }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">No</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Range Nilai</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Deskripsi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...deskripsiRataRataList]
                          .sort((a, b) => b.min_nilai - a.min_nilai)
                          .map((k, idx) => (
                            <tr key={k.id} style={{ borderTop: idx > 0 ? '1px solid #fde0c8' : 'none' }}>
                              <td className="px-4 py-2.5 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-gray-700">
                                {/* ✅ DESKRIPSI RATA-RATA: Tampilkan 2 desimal */}
                                {parseFloat(k.min_nilai).toFixed(2)} – {parseFloat(k.max_nilai).toFixed(2)}
                              </td>
                              <td className="px-4 py-2.5 text-gray-700">{k.deskripsi}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-5 py-6 text-center text-sm text-gray-400">
                      Belum ada kategori deskripsi rata-rata
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: BOBOT ====== */}
          {activeTab === 'bobot' && (
            <div>
              {isPTSActive && (
                <div className="mb-5 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                  <p className="text-sm" style={{ color: '#7a3a0a' }}>
                    Sistem otomatis menetapkan <strong>PTS = 100% (PTS aktif)</strong>. Anda tidak perlu mengatur bobot manual.
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className={labelCls} style={labelColor}>
                  Mata Pelajaran
                </label>
                <select
                  value={selectedMapelId || ''}
                  onChange={(e) =>
                    setSelectedMapelId(e.target.value ? Number(e.target.value) : null)
                  }
                  className={inputCls}
                  style={{ maxWidth: '400px' }}
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {mapelWajibList.map((mapel) => (
                    <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                      {mapel.nama_mapel}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMapelId ? (
                bobotLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Memuat bobot...</p>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-3 mb-6">
                      {bobotList.map((bobot) => {
                        const komponen = komponenList.find((k) => k.id_komponen === bobot.komponen_id);
                        const isPTS = komponen && /^PTS$/i.test(komponen.nama_komponen);
                        const displayBobot = isPTSActive ? (isPTS ? 100 : 0) : bobot.bobot;
                        const isEditable = !isPTSActive && !isReadOnly;

                        return (
                          <div
                            key={bobot.komponen_id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl"
                            style={{
                              background: isPTSActive && isPTS ? '#fff7ed' : isEditable ? '#fffaf6' : '#f9fafb',
                              border: `1px solid ${isPTSActive && isPTS ? '#fdba74' : isEditable ? '#fde0c8' : '#e5e7eb'}`,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm block sm:inline" style={{ color: '#7a3a0a' }}>
                                {komponen?.nama_komponen || 'Komponen'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                              <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                value={displayBobot}
                                onChange={(e) => {
                                  if (isEditable) {
                                    const value = e.target.value;
                                    // Hanya izinkan angka dan titik desimal
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      handleBobotChange(bobot.komponen_id, value);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  // Validasi saat lose focus
                                  const value = parseFloat(e.target.value);
                                  if (isNaN(value) || value < 0) {
                                    handleBobotChange(bobot.komponen_id, '0');
                                  } else if (value > 100) {
                                    handleBobotChange(bobot.komponen_id, '100');
                                  }
                                }}
                                disabled={!isEditable}
                                className={`w-24 h-11 px-3 text-center font-bold text-base rounded-xl border-2 transition-all outline-none
    ${isEditable
                                    ? 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                    : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                  }`}
                                readOnly={!isEditable}
                                placeholder="0"
                              />
                              <span className="text-base font-bold flex-shrink-0" style={{ color: '#7a3a0a' }}>
                                %
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 rounded-xl mb-6" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm" style={{ color: '#7a3a0a' }}>Total Bobot:</span>
                        <span className={`text-lg font-bold ${isBobotValid ? 'text-green-600' : 'text-red-600'}`}>
                          {totalBobot.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {!isPTSActive && !isReadOnly && (
                      <div className="flex justify-end pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                        <button
                          onClick={openConfirmSaveBobot}
                          disabled={isSavingBobot || !isBobotValid}
                          className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                          style={btnPrimary.style}
                          onMouseEnter={btnPrimary.hover}
                          onMouseLeave={btnPrimary.leave}
                        >
                          {isSavingBobot ? (
                            <>
                              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                              Menyimpan...
                            </>
                          ) : (
                            <>Simpan Bobot</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="py-12 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                  <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ====== MODAL BATCH EDIT KOKURIKULER ====== */}
      {showBatchEdit && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBatchEdit();
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}
          >
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">
                Edit Grade Aspek
              </h2>
              <button
                onClick={closeBatchEdit}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg text-xs" style={{ background: '#fff7ed', border: '1px solid #fdba74', color: '#7a3a0a' }}>
                  <strong>💡 Tips:</strong> Isi semua grade sekaligus untuk aspek ini. Sistem akan menyimpan semua grade dalam 1 aksi.
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                      Grade ({batchGrades.length})
                    </h3>
                    <button
                      onClick={addBatchGradeRow}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                    >
                      <Plus size={14} />
                      Tambah Baris
                    </button>
                  </div>

                  {batchGrades.map((grade, index) => (
                    <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Grade <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={grade.grade}
                              onChange={(e) => updateBatchGrade(index, 'grade', e.target.value.toUpperCase().slice(0, 1))}
                              className={inputCls}
                              maxLength={1}
                              placeholder="A"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Min <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={grade.min_nilai}
                              onChange={(e) => updateBatchGrade(index, 'min_nilai', parseInt(e.target.value) || 0)}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Max <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={grade.max_nilai}
                              onChange={(e) => updateBatchGrade(index, 'max_nilai', parseInt(e.target.value) || 0)}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Deskripsi <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={grade.deskripsi}
                              onChange={(e) => updateBatchGrade(index, 'deskripsi', e.target.value)}
                              className={inputCls}
                              placeholder="Sangat Baik"
                            />
                          </div>
                        </div>

                        {batchGrades.length > 1 && (
                          <button
                            onClick={() => removeBatchGradeRow(index)}
                            className="mt-6 p-2 rounded-lg transition-all"
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {(() => {
                        const errors: string[] = [];
                        if (!grade.grade) errors.push('Grade kosong');
                        if (grade.grade && grade.grade.length !== 1) errors.push('Grade harus 1 karakter');
                        if (isNaN(grade.min_nilai) || isNaN(grade.max_nilai)) errors.push('Nilai tidak valid');
                        else if (grade.min_nilai >= grade.max_nilai) errors.push(`Min (${grade.min_nilai}) >= Max (${grade.max_nilai})`);
                        if (!grade.deskripsi || grade.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                        if (errors.length > 0) {
                          return (
                            <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                              ⚠️ {errors.join(' | ')}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))}
                </div>

                {(() => {
                  const validation = validateBatchGrades();
                  return (
                    <div className="p-3 rounded-lg" style={{
                      background: validation.valid ? '#f0fdf4' : '#fef3c7',
                      border: `1px solid ${validation.valid ? '#86efac' : '#fcd34d'}`,
                      color: validation.valid ? '#166534' : '#78350f'
                    }}>
                      <strong>{validation.valid ? '✅' : '⚠️'} Status:</strong>{' '}
                      {validation.valid ? 'Semua grade valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeBatchEdit} disabled={isSavingBatch}>Batal</BtnSecondary>
              <button
                onClick={openConfirmSaveBatch}
                disabled={isSavingBatch}
                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
              >
                Simpan {batchGrades.length} Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL BATCH EDIT AKADEMIK ====== */}
      {showBatchEditAkademik && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditAkademikClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBatchEditAkademik();
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditAkademikClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}
          >
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">
                Edit Kategori Akademik
              </h2>
              <button
                onClick={closeBatchEditAkademik}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg text-xs" style={{ background: '#fff7ed', border: '1px solid #fdba74', color: '#7a3a0a' }}>
                  <strong>💡 Tips:</strong> Isi semua kategori sekaligus untuk mata pelajaran ini. Sistem akan menyimpan semua kategori dalam 1 aksi.
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                      Kategori ({batchAkademik.length})
                    </h3>
                    <button
                      onClick={addBatchAkademikRow}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                    >
                      <Plus size={14} />
                      Tambah Baris
                    </button>
                  </div>

                  {batchAkademik.map((kategori, index) => (
                    <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Min <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={kategori.min_nilai}
                              onChange={(e) => updateBatchAkademik(index, 'min_nilai', parseInt(e.target.value) || 0)}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Max <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={kategori.max_nilai}
                              onChange={(e) => updateBatchAkademik(index, 'max_nilai', parseInt(e.target.value) || 0)}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Deskripsi <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={kategori.deskripsi}
                              onChange={(e) => updateBatchAkademik(index, 'deskripsi', e.target.value)}
                              className={inputCls}
                              placeholder="Sangat Baik"
                            />
                          </div>
                        </div>

                        {batchAkademik.length > 1 && (
                          <button
                            onClick={() => removeBatchAkademikRow(index)}
                            className="mt-6 p-2 rounded-lg transition-all"
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {(() => {
                        const errors: string[] = [];
                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                        if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                        if (errors.length > 0) {
                          return (
                            <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                              ⚠️ {errors.join(' | ')}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))}
                </div>

                {(() => {
                  const validation = validateBatchAkademik();
                  return (
                    <div className="p-3 rounded-lg" style={{
                      background: validation.valid ? '#f0fdf4' : '#fef3c7',
                      border: `1px solid ${validation.valid ? '#86efac' : '#fcd34d'}`,
                      color: validation.valid ? '#166534' : '#78350f'
                    }}>
                      <strong>{validation.valid ? '✅' : '⚠️'} Status:</strong>{' '}
                      {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeBatchEditAkademik} disabled={isSavingBatchAkademik}>Batal</BtnSecondary>
              <button
                onClick={openConfirmSaveBatchAkademik}
                disabled={isSavingBatchAkademik}
                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
              >
                Simpan {batchAkademik.length} Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL BATCH EDIT DESKRIPSI RATA-RATA ====== */}
      {showBatchEditDeskripsi && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${batchEditDeskripsiClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeBatchEditDeskripsi();
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 ${batchEditDeskripsiClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}
          >
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">
                Edit Deskripsi Rata-rata
              </h2>
              <button
                onClick={closeBatchEditDeskripsi}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-4">
                <div className="p-3 rounded-lg text-xs" style={{ background: '#fff7ed', border: '1px solid #fdba74', color: '#7a3a0a' }}>
                  <strong>💡 Tips:</strong> Isi semua kategori sekaligus. Sistem akan menyimpan semua kategori dalam 1 aksi.
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                      Kategori ({batchDeskripsi.length})
                    </h3>
                    <button
                      onClick={addBatchDeskripsiRow}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                    >
                      <Plus size={14} />
                      Tambah Baris
                    </button>
                  </div>

                  {batchDeskripsi.map((kategori, index) => (
                    <div key={index} className="p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Min <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={kategori.min_nilai}
                              onChange={(e) => updateBatchDeskripsi(index, 'min_nilai', parseFloat(e.target.value) || 0)}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Max <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={kategori.max_nilai}
                              onChange={(e) => updateBatchDeskripsi(index, 'max_nilai', parseFloat(e.target.value) || 0)}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>
                              Deskripsi <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={kategori.deskripsi}
                              onChange={(e) => updateBatchDeskripsi(index, 'deskripsi', e.target.value)}
                              className={inputCls}
                              placeholder="Sangat Baik"
                            />
                          </div>
                        </div>

                        {batchDeskripsi.length > 1 && (
                          <button
                            onClick={() => removeBatchDeskripsiRow(index)}
                            className="mt-6 p-2 rounded-lg transition-all"
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {(() => {
                        const errors: string[] = [];
                        if (isNaN(kategori.min_nilai) || isNaN(kategori.max_nilai)) errors.push('Nilai tidak valid');
                        else if (kategori.min_nilai >= kategori.max_nilai) errors.push(`Min (${kategori.min_nilai}) >= Max (${kategori.max_nilai})`);
                        if (!kategori.deskripsi || kategori.deskripsi.trim().length < 3) errors.push('Deskripsi minimal 3 karakter');

                        if (errors.length > 0) {
                          return (
                            <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                              ⚠️ {errors.join(' | ')}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))}
                </div>

                {(() => {
                  const validation = validateBatchDeskripsi();
                  return (
                    <div className="p-3 rounded-lg" style={{
                      background: validation.valid ? '#f0fdf4' : '#fef3c7',
                      border: `1px solid ${validation.valid ? '#86efac' : '#fcd34d'}`,
                      color: validation.valid ? '#166534' : '#78350f'
                    }}>
                      <strong>{validation.valid ? '✅' : '⚠️'} Status:</strong>{' '}
                      {validation.valid ? 'Semua kategori valid dan siap disimpan' : `Ada ${validation.errors.length} error yang perlu diperbaiki`}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeBatchEditDeskripsi} disabled={isSavingBatchDeskripsi}>Batal</BtnSecondary>
              <button
                onClick={openConfirmSaveBatchDeskripsi}
                disabled={isSavingBatchDeskripsi}
                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
              >
                Simpan {batchDeskripsi.length} Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Sederhana */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 ap-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ap-scaleIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} className="text-orange-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                Konfirmasi Penyimpanan Data
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
              {confirmAction === 'save-bobot'
                ? 'Apakah Anda yakin ingin menyimpan bobot penilaian ini?'
                : confirmAction === 'save-batch'
                  ? `Apakah Anda yakin ingin menyimpan ${batchGrades.length} grade untuk aspek ini?`
                  : confirmAction === 'save-batch-akademik'
                    ? `Apakah Anda yakin ingin menyimpan ${batchAkademik.length} kategori akademik?`
                    : confirmAction === 'save-batch-deskripsi'
                      ? `Apakah Anda yakin ingin menyimpan ${batchDeskripsi.length} kategori deskripsi rata-rata?`
                      : 'Apakah Anda yakin ingin menyimpan kategori ini?'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'save-bobot') {
                    executeSaveBobot();
                  } else if (confirmAction === 'save-batch') {
                    executeSaveBatch();
                  } else if (confirmAction === 'save-batch-akademik') {
                    executeSaveBatchAkademik();
                  } else if (confirmAction === 'save-batch-deskripsi') {
                    executeSaveBatchDeskripsi();
                  }
                }}
                disabled={isSavingBobot || isSavingBatch || isSavingBatchAkademik || isSavingBatchDeskripsi}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)', border: '1.5px solid #c95b08' }}
              >
                {(isSavingBobot || isSavingBatch || isSavingBatchAkademik || isSavingBatchDeskripsi) ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>Simpan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


