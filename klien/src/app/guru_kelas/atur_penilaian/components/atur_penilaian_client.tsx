/**
 * Nama File: atur_penilaian_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian
 *         oleh guru kelas, mencakup kategori kokurikuler, akademik, dan bobot.
 * 
 * UPDATE: 
 *   - ✅ Kategori Kokurikuler: PTS → hanya Mutaba'ah, PAS → semua aspek
 *   - Fix error openBatchEdit is not defined
 *   - Tambah validasi "Tidak Ada Perubahan"
 *   - Reset originalBatchGrades saat tutup modal
 */

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, AlertTriangle, LogOut, Layers, Lock, Calendar, Unlock } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== ID ASPEK MUTABA'AH (untuk rules PTS) ======
const ASPEK_MUTABAAH_ID = 5;

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
  grade: string;
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
              className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
              style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
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
          className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>
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

  const gaps = coverage.gaps || (coverage.gap ? [{ aspek: 'Akademik', gap: coverage.gap }] : []);

  if (gaps.length === 0) return null;

  return (
    <div className="mb-4 p-3 rounded-xl flex items-start gap-2"
      style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
      <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="text-xs" style={{ color: '#78350f' }}>
        <strong>Peringatan:</strong> Range nilai 0-100 belum lengkap.
        {gaps.length === 1 ? (
          <>
            {' '}Ada gap pada <strong>{gaps[0].aspek}</strong> di rentang <strong>{gaps[0].gap}</strong>.
          </>
        ) : (
          <ul className="mt-1 ml-4 list-disc">
            {gaps.map((g, i) => (
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
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

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

  const [activeTab, setActiveTab] = useState<'kokurikuler' | 'akademik' | 'bobot'>('kokurikuler');
  const [loading, setLoading] = useState(true);

  // Data pendukung
  const [aspekList, setAspekList] = useState<AspekKokurikuler[]>([]);
  const [mapelList, setMapelList] = useState<MapelItem[]>([]);
  const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);

  // Kategori
  const [kategoriList, setKategoriList] = useState<(KategoriAkademik | KategoriKokurikuler)[]>([]);
  const [kategoriLoading, setKategoriLoading] = useState(false);
  const [coverageInfo, setCoverageInfo] = useState<CoverageInfo | null>(null);

  // ====== BATCH EDIT STATE ======
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditClosing, setBatchEditClosing] = useState(false);
  const [batchEditAspekId, setBatchEditAspekId] = useState<number | null>(null);
  const [batchGrades, setBatchGrades] = useState<BatchGradeItem[]>([]);
  const [originalBatchGrades, setOriginalBatchGrades] = useState<BatchGradeItem[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Modal edit/tambah kategori (untuk akademik)
  const [showEditKategori, setShowEditKategori] = useState(false);
  const [editKategoriId, setEditKategoriId] = useState<number | null>(null);
  const [editKategoriClosing, setEditKategoriClosing] = useState(false);
  const [editKategoriData, setEditKategoriData] = useState<{
    min_nilai: number; max_nilai: number; grade?: string; deskripsi: string; id_aspek_kokurikuler?: number;
  }>({ min_nilai: 0, max_nilai: 100, deskripsi: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialEditKategoriDataRef = useRef<typeof editKategoriData | null>(null);

  // Mapel selection (akademik)
  const [selectedMapelAkademik, setSelectedMapelAkademik] = useState<number | null>(null);

  // Bobot
  const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
  const [bobotList, setBobotList] = useState<BobotItem[]>([]);
  const [bobotLoading, setBobotLoading] = useState(false);
  const [isBobotLocked, setIsBobotLocked] = useState(false);
  const initialBobotListRef = useRef<BobotItem[]>([]);

  // Saving state
  const [isSavingBobot, setIsSavingBobot] = useState(false);
  const [isSavingKategori, setIsSavingKategori] = useState(false);

  // Modal konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'save-kategori' | 'save-bobot' | 'save-batch' | null>(null);

  // Modals
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  const [isNotAssigned, setIsNotAssigned] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ HELPER: Rules Kategori Kokurikuler berdasarkan periode
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cek apakah aspek kokurikuler bisa dikelola kategorinya
   * - PTS aktif: hanya Mutaba'ah (id=5)
   * - PAS aktif: semua aspek
   * - Belum aktif: tidak ada
   */
  const canEditAspekKokurikuler = useCallback((aspekId: number): boolean => {
    if (isReadOnly) return false;
    if (!jenisPenilaianAktif) return false;
    if (jenisPenilaianAktif === 'PTS') return aspekId === ASPEK_MUTABAAH_ID;
    if (jenisPenilaianAktif === 'PAS') return true;
    return false;
  }, [jenisPenilaianAktif, isReadOnly]);

  /**
   * Alasan kenapa aspek kokurikuler terkunci
   */
  const getAspekKokurikulerLockReason = useCallback((aspekId: number): string => {
    if (isReadOnly) {
      if (readOnlyReason === 'locked') return 'Periode Selesai';
      return 'Periode Belum Aktif';
    }
    if (!jenisPenilaianAktif) return 'Periode Belum Aktif';
    if (jenisPenilaianAktif === 'PTS' && aspekId !== ASPEK_MUTABAAH_ID) return 'Terkunci - PTS';
    return '';
  }, [jenisPenilaianAktif, isReadOnly, readOnlyReason]);

  // ====== FETCH DATA DUKUNGAN ======
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

  // ====== FETCH KATEGORI ======
  useEffect(() => {
    if (loading) return;
    if (activeTab === 'bobot') return;

    const fetchKategori = async () => {
      setKategoriLoading(true);
      setCoverageInfo(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        let endpoint = '';

        if (activeTab === 'kokurikuler') {
          endpoint = `${API}/atur-penilaian/kategori-kokurikuler`;
        } else if (activeTab === 'akademik') {
          if (selectedMapelAkademik !== null) {
            endpoint = `${API}/atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}`;
          } else {
            setKategoriList([]);
            setKategoriLoading(false);
            return;
          }
        }

        if (!endpoint) {
          setKategoriList([]);
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
        const formattedData = (data.data || []).map((item: any) => ({
          ...item,
          min_nilai: Math.floor(parseFloat(item.min_nilai)),
          max_nilai: Math.floor(parseFloat(item.max_nilai)),
        }));

        setKategoriList(formattedData);
        setCoverageInfo(data.coverage || null);
      } catch (err: any) {
        if (err.message?.includes('belum ditugaskan')) return;
        showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat kategori' });
      } finally {
        setKategoriLoading(false);
      }
    };

    fetchKategori();
  }, [activeTab, selectedMapelAkademik, loading, showModal, handleLogout]);

  // ====== FETCH BOBOT ======
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
        const res = await fetch(
          `${API}/atur-penilaian/bobot-akademik/${selectedMapelId}`,
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
  }, [selectedMapelId, komponenList, activeTab, showModal, handleLogout]);

  // ====== TAB CHANGE HANDLER ======
  const handleTabChange = (tab: 'kokurikuler' | 'akademik' | 'bobot') => {
    if (tab !== 'akademik') {
      setSelectedMapelAkademik(null);
      setCoverageInfo(null);
    }
    if (tab !== 'bobot') {
      setSelectedMapelId(null);
      setIsBobotLocked(false);
    }
    setKategoriList([]);
    setActiveTab(tab);
  };

  // ====== HELPER: Load grade untuk aspek tertentu ======
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

  // ====== BATCH EDIT HANDLERS ======
  // ✅ FIX: Validasi periode sebelum buka batch edit
  const openBatchEdit = (aspekId: number | null = null) => {
    // ✅ Cek apakah aspek ini bisa diedit
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

  const handleAspekChange = (newAspekId: number | null) => {
    if (newAspekId !== batchEditAspekId) {
      loadGradesForAspek(newAspekId);
    }
    setBatchEditAspekId(newAspekId);
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

    const grades = batchGrades.map(g => g.grade.toUpperCase());
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
        grades: batchGrades.map(g => ({
          id: g.id,
          grade: g.grade.toUpperCase(),
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

        const reloadRes = await fetch(`${API}/atur-penilaian/kategori-kokurikuler`, { headers: { Authorization: `Bearer ${token}` } });
        const reloadData = await reloadRes.json();
        setKategoriList(reloadData.data || []);
        if (reloadData.coverage) setCoverageInfo(reloadData.coverage);
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

  // ====== MODAL KATEGORI (untuk akademik) ======
  const openEditKategori = (kategori: KategoriAkademik | KategoriKokurikuler | null = null) => {
    setErrors({});
    if (kategori) {
      setEditKategoriId(kategori.id);
      const d = {
        min_nilai: Math.floor(kategori.min_nilai),
        max_nilai: Math.floor(kategori.max_nilai),
        grade: 'grade' in kategori ? kategori.grade : undefined,
        deskripsi: kategori.deskripsi,
        id_aspek_kokurikuler: 'id_aspek_kokurikuler' in kategori ? kategori.id_aspek_kokurikuler : undefined,
      };
      setEditKategoriData(d);
      initialEditKategoriDataRef.current = d;
    } else {
      setEditKategoriId(null);
      setEditKategoriData({
        min_nilai: 0, max_nilai: 100, deskripsi: '',
        grade: activeTab === 'kokurikuler' ? '' : undefined,
        id_aspek_kokurikuler: undefined,
      });
      initialEditKategoriDataRef.current = null;
    }
    setShowEditKategori(true);
  };

  const closeEditKategori = () => {
    setEditKategoriClosing(true);
    setTimeout(() => {
      setShowEditKategori(false);
      setEditKategoriClosing(false);
      setEditKategoriId(null);
      setErrors({});
    }, 200);
  };

  const handleSaveKategori = () => {
    const ne: Record<string, string> = {};

    if (isNaN(editKategoriData.min_nilai) || isNaN(editKategoriData.max_nilai)) {
      ne.form = 'Nilai min dan max harus berupa angka.';
    } else {
      if (editKategoriData.min_nilai < 0 || editKategoriData.max_nilai > 100) {
        ne.form = 'Nilai harus antara 0 dan 100.';
      }
      if (editKategoriData.min_nilai >= editKategoriData.max_nilai) {
        ne.form = `Nilai minimum (${editKategoriData.min_nilai}) harus lebih kecil dari nilai maksimum (${editKategoriData.max_nilai}).`;
      }
      const range = editKategoriData.max_nilai - editKategoriData.min_nilai;
      if (range < 3) {
        ne.form = `Range nilai minimal 3 poin. Saat ini: ${range} poin (${editKategoriData.min_nilai}-${editKategoriData.max_nilai}).`;
      }
    }

    if (!editKategoriData.deskripsi || editKategoriData.deskripsi.trim().length < 3) {
      ne.deskripsi = 'Deskripsi minimal 3 karakter.';
    }

    if (activeTab === 'kokurikuler') {
      if (!editKategoriData.id_aspek_kokurikuler) {
        ne.form = 'Pilih aspek kokurikuler terlebih dahulu.';
      }
      const grade = editKategoriData.grade?.trim() || '';
      if (!grade) {
        ne.grade = 'Grade tidak boleh kosong.';
      } else if (grade.length !== 1) {
        ne.grade = 'Grade harus tepat 1 karakter (A, B, C, dst).';
      }
    }

    if (Object.keys(ne).length > 0) {
      setErrors(ne);
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: Object.values(ne).join('\n') });
      return false;
    }

    const initial = initialEditKategoriDataRef.current;
    const isUnchanged =
      initial &&
      editKategoriData.min_nilai === initial.min_nilai &&
      editKategoriData.max_nilai === initial.max_nilai &&
      editKategoriData.deskripsi.trim() === initial.deskripsi.trim();

    if (isUnchanged) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return false;
    }

    return true;
  };

  const openConfirmSaveKategori = () => {
    const isValid = handleSaveKategori();
    if (!isValid) return;

    setEditKategoriClosing(true);
    setTimeout(() => {
      setShowEditKategori(false);
      setEditKategoriClosing(false);
      setConfirmAction('save-kategori');
      setShowConfirmModal(true);
    }, 200);
  };

  const executeSaveKategori = async () => {
    setIsSavingKategori(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = `${API}/atur-penilaian/kategori-akademik`;
      const payload = {
        min_nilai: Math.floor(editKategoriData.min_nilai),
        max_nilai: Math.floor(editKategoriData.max_nilai),
        deskripsi: editKategoriData.deskripsi.trim(),
        urutan: 0,
        mapel_id: selectedMapelAkademik,
      };

      const url = editKategoriId ? `${endpoint}/${editKategoriId}` : endpoint;
      const method = editKategoriId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        setEditKategoriId(null);
        setErrors({});

        setTimeout(() => {
          showModal({
            type: 'success',
            title: editKategoriId ? 'Kategori Diperbarui!' : 'Kategori Ditambahkan!',
            message: result.message || 'Berhasil!',
          });
        }, 50);

        const reloadRes = await fetch(`${endpoint}?mapel_id=${selectedMapelAkademik}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const reloadData = await reloadRes.json();
        setKategoriList(reloadData.data || []);
        if (reloadData.coverage) setCoverageInfo(reloadData.coverage);
      } else {
        showModal({ type: 'error', title: 'Gagal Menyimpan', message: result.message || 'Terjadi kesalahan.' });
      }
    } catch (err: any) {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSavingKategori(false);
      setShowConfirmModal(false);
    }
  };

  const handleDeleteKategori = (id: number, deskripsi: string) => {
    showModal({
      type: 'confirm',
      title: 'Hapus Kategori',
      message: `Apakah Anda yakin ingin menghapus kategori "${deskripsi}"?\n\nTindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          let endpoint = '';

          if (activeTab === 'kokurikuler') {
            endpoint = `${API}/atur-penilaian/kategori-kokurikuler/${id}`;
          } else if (activeTab === 'akademik') {
            endpoint = `${API}/atur-penilaian/kategori-akademik/${id}`;
          }

          const res = await fetch(endpoint, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          const result = await res.json();

          if (res.ok) {
            setKategoriList(kategoriList.filter((k) => k.id !== id));
            showModal({ type: 'success', title: 'Berhasil Dihapus!', message: result.message || 'Kategori berhasil dihapus.' });
          } else {
            showModal({ type: 'error', title: 'Gagal Menghapus', message: result.message || 'Gagal menghapus kategori.' });
          }
        } catch (err) {
          showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menghubungi server.' });
        }
      },
    });
  };

  // ====== BOBOT HANDLERS ======
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
      const res = await fetch(
        `${API}/atur-penilaian/bobot-akademik/${selectedMapelId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bobotList),
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

  // ====== LOADING STATE ======
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ BANNER INFO KATEGORI KOKURIKULER
  // ═══════════════════════════════════════════════════════════════════════════
  const renderKokurikulerBanner = () => {
    if (isReadOnly) return null;
    if (!jenisPenilaianAktif) return null;

    // Daftar aspek yang bisa dan tidak bisa dikelola
    const editableAspek = aspekList.filter(a => canEditAspekKokurikuler(a.id_aspek_kokurikuler));
    const lockedAspek = aspekList.filter(a => !canEditAspekKokurikuler(a.id_aspek_kokurikuler));

    return (
      <div className="mb-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${isPtsActive ? '#fdba74' : '#86efac'}` }}>
        {/* Header Banner */}
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

        {/* Content - 2 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-white">
          {/* Kolom Kiri: Yang Bisa Dikelola */}
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

          {/* Kolom Kanan: Yang Terkunci */}
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

  // ====== RENDER ======
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

      {/* Page header */}
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
        <div className="px-6 py-3 border-b" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
          <div className="flex gap-2">
            <button
              className={`px-6 py-2.5 text-sm font-bold transition-all rounded-t-lg border-b-2 ${activeTab === 'kokurikuler'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                }`}
              onClick={() => handleTabChange('kokurikuler')}
            >
              Kategori Kokurikuler
            </button>
            <button
              className={`px-6 py-2.5 text-sm font-bold transition-all rounded-t-lg border-b-2 ${activeTab === 'akademik'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                }`}
              onClick={() => handleTabChange('akademik')}
            >
              Kategori Akademik
            </button>
            <button
              className={`px-6 py-2.5 text-sm font-bold transition-all rounded-t-lg border-b-2 ${activeTab === 'bobot'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                }`}
              onClick={() => handleTabChange('bobot')}
            >
              Atur Bobot Penilaian
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* ====== TAB: KOKURIKULER ====== */}
          {activeTab === 'kokurikuler' && (
            <div>
              {/* ✅ BANNER INFO RULES KATEGORI KOKURIKULER */}
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
                    // ✅ Cek apakah aspek ini bisa dikelola
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
                        {/* Header Aspek */}
                        <div
                          className="px-5 py-3 flex items-center justify-between gap-3"
                          style={{
                            background: isAspekEditable ? '#fff7ed' : '#f9fafb',
                            borderBottom: `1px solid ${isAspekEditable ? '#fde0c8' : '#e5e7eb'}`
                          }}
                        >
                          {/* Kiri: Icon + Info Aspek */}
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

                          {/* Kanan: Tombol Edit */}
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

                        {/* Tabel Grade */}
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

          {/* ====== TAB: AKADEMIK ====== */}
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

                  <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                    <p className="text-xs" style={{ color: '#c95b08' }}>
                      Menampilkan {kategoriList.length} kategori nilai
                    </p>
                    <button
                      onClick={() => openEditKategori()}
                      disabled={isReadOnly}
                      className={`${btnPrimary.base} disabled:opacity-50 disabled:cursor-not-allowed`}
                      style={btnPrimary.style}
                      onMouseEnter={btnPrimary.hover}
                      onMouseLeave={btnPrimary.leave}
                    >
                      {isReadOnly ? (
                        <>
                          <Lock size={16} />
                          Terkunci
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Tambah Kategori
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #fde0c8' }}>
                    <table className="w-full min-w-[600px] text-sm border-collapse">
                      <thead>
                        <tr style={TH_GRAD}>
                          {['No.', 'Range Nilai', 'Deskripsi', 'Aksi'].map(h => (
                            <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {kategoriLoading ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                              <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-2" />
                              Memuat data...
                            </td>
                          </tr>
                        ) : kategoriList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                              Belum ada kategori untuk mata pelajaran ini.
                            </td>
                          </tr>
                        ) : (
                          kategoriList.map((kategori, index) => (
                            <tr
                              key={kategori.id}
                              className="transition-colors"
                              style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                              onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                            >
                              <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{index + 1}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                                  style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                  {Math.floor(kategori.min_nilai)} – {Math.floor(kategori.max_nilai)}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-700" style={{ maxWidth: '300px' }}>
                                <span className="truncate block" title={kategori.deskripsi}>
                                  {kategori.deskripsi}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => openEditKategori(kategori)}
                                    disabled={isReadOnly}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      background: isReadOnly ? '#e5e7eb' : '#fff0e5',
                                      border: isReadOnly ? '1px solid #d1d5db' : '1px solid #f5a623',
                                      color: isReadOnly ? '#6b7280' : '#b35a08'
                                    }}
                                    onMouseEnter={e => { if (!isReadOnly) e.currentTarget.style.background = '#ffe4c8'; }}
                                    onMouseLeave={e => { if (!isReadOnly) e.currentTarget.style.background = '#fff0e5'; }}
                                  >
                                    {isReadOnly ? (
                                      <>
                                        <Lock size={13} /> Terkunci
                                      </>
                                    ) : (
                                      <>
                                        <Pencil size={13} /> Edit
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteKategori(kategori.id, kategori.deskripsi)}
                                    disabled={isReadOnly}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      background: isReadOnly ? '#e5e7eb' : '#fef2f2',
                                      border: isReadOnly ? '1px solid #d1d5db' : '1px solid #fca5a5',
                                      color: isReadOnly ? '#6b7280' : '#dc2626'
                                    }}
                                    onMouseEnter={e => { if (!isReadOnly) e.currentTarget.style.background = '#fee2e2'; }}
                                    onMouseLeave={e => { if (!isReadOnly) e.currentTarget.style.background = '#fef2f2'; }}
                                  >
                                    {isReadOnly ? (
                                      <>
                                        <Lock size={13} /> Terkunci
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 size={13} /> Hapus
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                  <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
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
                        const isEditable = !isPTSActive;

                        return (
                          <div
                            key={bobot.komponen_id}
                            className="flex items-center gap-4 p-4 rounded-xl"
                            style={{
                              background: isPTSActive && isPTS ? '#fff7ed' : isEditable ? '#fffaf6' : '#f9fafb',
                              border: `1px solid ${isPTSActive && isPTS ? '#fdba74' : isEditable ? '#fde0c8' : '#e5e7eb'}`,
                            }}
                          >
                            <span className="font-semibold min-w-[150px] text-sm" style={{ color: '#7a3a0a' }}>
                              {komponen?.nama_komponen || 'Komponen'}
                            </span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={displayBobot}
                                onChange={(e) => {
                                  if (isEditable) {
                                    handleBobotChange(bobot.komponen_id, e.target.value);
                                  }
                                }}
                                disabled={!isEditable}
                                className={`${isEditable ? inputCls : inputDisabledCls} text-right`}
                                style={{ maxWidth: '120px' }}
                                readOnly={isPTSActive}
                              />
                              <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>%</span>
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

      {/* ====== MODAL BATCH EDIT ====== */}
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
                        <div className="flex-1 grid grid-cols-4 gap-3">
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

      {/* ====== MODAL EDIT KATEGORI (untuk akademik) ====== */}
      {showEditKategori && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-[80] p-4 transition-opacity duration-200 ${editKategoriClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditKategori();
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${editKategoriClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}
          >
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">
                {editKategoriId ? 'Edit Kategori' : 'Tambah Kategori'}
              </h2>
              <button
                onClick={closeEditKategori}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>
                    Nilai Minimum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editKategoriData.min_nilai}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setEditKategoriData({
                        ...editKategoriData,
                        min_nilai: isNaN(val) ? 0 : Math.floor(val)
                      });
                    }}
                    className={errors.form ? inputErrCls : inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>
                    Nilai Maksimum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editKategoriData.max_nilai}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setEditKategoriData({
                        ...editKategoriData,
                        max_nilai: isNaN(val) ? 0 : Math.floor(val)
                      });
                    }}
                    className={errors.form ? inputErrCls : inputCls}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelCls} style={labelColor}>
                  Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editKategoriData.deskripsi}
                  onChange={(e) => setEditKategoriData({ ...editKategoriData, deskripsi: e.target.value })}
                  className={errors.deskripsi ? inputErrCls : inputCls}
                  rows={3}
                  placeholder="Contoh: Sangat Baik, Perlu Bimbingan, dll."
                />
                {errors.deskripsi && <p className="text-red-500 text-xs">{errors.deskripsi}</p>}
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={closeEditKategori} disabled={isSavingKategori}>Batal</BtnSecondary>
              <button
                onClick={openConfirmSaveKategori}
                disabled={isSavingKategori}
                className={btnPrimary.base + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
              >
                {isSavingKategori ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
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
                  : 'Apakah Anda yakin ingin menyimpan kategori ini?'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'save-bobot') {
                    executeSaveBobot();
                  } else if (confirmAction === 'save-batch') {
                    executeSaveBatch();
                  } else {
                    executeSaveKategori();
                  }
                }}
                disabled={isSavingBobot || isSavingKategori || isSavingBatch}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
              >
                {(isSavingBobot || isSavingKategori || isSavingBatch) ? (
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