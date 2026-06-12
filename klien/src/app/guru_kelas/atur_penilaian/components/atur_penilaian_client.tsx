/**
 * Nama File: atur_penilaian_client.tsx
 * Fungsi: Komponen klien untuk mengatur konfigurasi penilaian
 *         oleh guru kelas, mencakup kategori kokurikuler, akademik, dan bobot.
 * UI: Tema oranye elegan, konsisten dengan DataMataPelajaranPage
 * 
 */

'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, X, Plus, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== HELPER: Authenticated Fetch ======
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    const err: any = new Error('Token tidak ditemukan');
    err.code = 'NO_TOKEN';
    throw err;
  }
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
};

// ====== HELPER: Parse Error dari Backend ======
const parseBackendError = async (res: Response): Promise<{ message: string; code?: string }> => {
  try {
    const data = await res.json();
    return {
      message: data.message || 'Terjadi kesalahan',
      code: data.code
    };
  } catch {
    return { message: 'Terjadi kesalahan' };
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
          <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
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
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
);

// ====== COVERAGE WARNING BANNER ======
const CoverageWarning = ({ coverage }: { coverage: CoverageInfo | null }) => {
  if (!coverage || coverage.covered) return null;

  return (
    <div className="mb-4 p-3 rounded-xl flex items-start gap-2"
      style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
      <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="text-xs" style={{ color: '#78350f' }}>
        <strong>Peringatan:</strong> Range nilai 0-100 belum lengkap.
        Ada gap pada rentang <strong>{coverage.gap}</strong>.
        Siswa dengan nilai di rentang ini tidak akan mendapatkan deskripsi di rapor.
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

  // Modal edit/tambah kategori
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
  const [selectedMapelForRataRata, setSelectedMapelForRataRata] = useState(false);

  // Bobot
  const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
  const [bobotList, setBobotList] = useState<BobotItem[]>([]);
  const [bobotLoading, setBobotLoading] = useState(false);
  const [isBobotLocked, setIsBobotLocked] = useState(false);
  const initialBobotListRef = useRef<BobotItem[]>([]);

  // Saving state
  const [isSavingBobot, setIsSavingBobot] = useState(false);
  const [isSavingKategori, setIsSavingKategori] = useState(false);

  // Modals
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

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
          throw new Error(err.message);
        }
        if (!aspekRes.ok) {
          const err = await parseBackendError(aspekRes);
          throw new Error(err.message);
        }

        const [taData, komponenData, mapelData, aspekData] = await Promise.all([
          taRes.json(), komponenRes.json(), mapelRes.json(), aspekRes.json(),
        ]);

        const { status_pts, status_pas } = taData.data;
        setJenisPenilaianAktif(status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null);
        setKomponenList(komponenData.data || []);

        // Format mapel: backend return { wajib: [], pilihan: [] }
        const mapelWajib = mapelData.data?.wajib || mapelData.wajib || [];
        const mapelPilihan = mapelData.data?.pilihan || mapelData.pilihan || [];
        setMapelList([...mapelWajib, ...mapelPilihan]);

        setAspekList(aspekData.data || []);
      } catch (err: any) {
        console.error('Error fetch data pendukung:', err);
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showModal]);

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
          if (selectedMapelForRataRata) {
            endpoint = `${API}/atur-penilaian/kategori-rata-rata`;
          } else if (selectedMapelAkademik !== null) {
            endpoint = `${API}/atur-penilaian/kategori-akademik?mapel_id=${selectedMapelAkademik}`;
          } else {
            setKategoriList([]);
            setKategoriLoading(false);
            return;
          }
        }

        const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const err = await parseBackendError(res);
          throw new Error(err.message);
        }
        const data = await res.json();
        setKategoriList(data.data || []);

        // Simpan coverage info untuk akademik & rata-rata
        if (activeTab === 'akademik' && data.coverage) {
          setCoverageInfo(data.coverage);
        }
      } catch (err: any) {
        showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat kategori' });
      } finally {
        setKategoriLoading(false);
      }
    };

    fetchKategori();
  }, [activeTab, selectedMapelAkademik, selectedMapelForRataRata, loading, showModal]);

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
          const err = await parseBackendError(res);
          throw new Error(err.message);
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
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal mengambil bobot penilaian' });
      } finally {
        setBobotLoading(false);
      }
    };

    fetchBobot();
  }, [selectedMapelId, komponenList, activeTab, showModal]);

  // ====== TAB CHANGE HANDLER ======
  const handleTabChange = (tab: 'kokurikuler' | 'akademik' | 'bobot') => {
    if (tab !== 'akademik') {
      setSelectedMapelAkademik(null);
      setSelectedMapelForRataRata(false);
      setCoverageInfo(null);
    }
    if (tab !== 'bobot') {
      setSelectedMapelId(null);
      setIsBobotLocked(false);
    }
    setKategoriList([]);
    setActiveTab(tab);
  };

  // ====== MODAL KATEGORI ======
  const openEditKategori = (kategori: KategoriAkademik | KategoriKokurikuler | null = null) => {
    setErrors({});
    if (kategori) {
      setEditKategoriId(kategori.id);
      const d = {
        min_nilai: kategori.min_nilai,
        max_nilai: kategori.max_nilai,
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

  // ====== SAVE KATEGORI ======
  const handleSaveKategori = async () => {
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
    } else if (activeTab === 'akademik') {
      if (!selectedMapelForRataRata && selectedMapelAkademik === null) {
        ne.form = 'Pilih mata pelajaran terlebih dahulu.';
      }
    }

    if (Object.keys(ne).length > 0) {
      setErrors(ne);
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: Object.values(ne).join('\n') });
      return;
    }

    // Cek apakah ada perubahan
    const initial = initialEditKategoriDataRef.current;
    const isUnchanged =
      initial &&
      editKategoriData.min_nilai === initial.min_nilai &&
      editKategoriData.max_nilai === initial.max_nilai &&
      editKategoriData.deskripsi.trim() === initial.deskripsi.trim() &&
      editKategoriData.grade === initial.grade &&
      editKategoriData.id_aspek_kokurikuler === initial.id_aspek_kokurikuler;

    if (isUnchanged) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return;
    }

    setIsSavingKategori(true);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let payload: any;

      if (activeTab === 'kokurikuler') {
        endpoint = `${API}/atur-penilaian/kategori-kokurikuler`;
        payload = {
          min_nilai: editKategoriData.min_nilai,
          max_nilai: editKategoriData.max_nilai,
          grade: editKategoriData.grade?.trim().toUpperCase(),
          deskripsi: editKategoriData.deskripsi.trim(),
          urutan: 0,
          id_aspek_kokurikuler: editKategoriData.id_aspek_kokurikuler,
        };
      } else if (activeTab === 'akademik') {
        if (selectedMapelForRataRata) {
          endpoint = `${API}/atur-penilaian/kategori-rata-rata`;
          payload = {
            min_nilai: Math.floor(editKategoriData.min_nilai),
            max_nilai: Math.floor(editKategoriData.max_nilai),
            deskripsi: editKategoriData.deskripsi.trim(),
            urutan: 0,
          };
        } else {
          endpoint = `${API}/atur-penilaian/kategori-akademik`;
          payload = {
            min_nilai: Math.floor(editKategoriData.min_nilai),
            max_nilai: Math.floor(editKategoriData.max_nilai),
            deskripsi: editKategoriData.deskripsi.trim(),
            urutan: 0,
            mapel_id: selectedMapelAkademik,
          };
        }
      }

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
        // FORCE CLOSE modal edit DULU
        setShowEditKategori(false);
        setEditKategoriClosing(false);
        setEditKategoriId(null);
        setErrors({});

        setTimeout(() => {
          showModal({
            type: 'success',
            title: editKategoriId ? 'Kategori Diperbarui!' : 'Kategori Ditambahkan!',
            message: result.message || 'Berhasil!',
          });
        }, 50);

        // Reload kategori
        let reloadUrl = endpoint;
        if (activeTab === 'akademik' && !selectedMapelForRataRata && selectedMapelAkademik) {
          reloadUrl += `?mapel_id=${selectedMapelAkademik}`;
        }
        const reloadRes = await fetch(reloadUrl, { headers: { Authorization: `Bearer ${token}` } });
        const reloadData = await reloadRes.json();
        setKategoriList(reloadData.data || []);
        if (activeTab === 'akademik' && reloadData.coverage) {
          setCoverageInfo(reloadData.coverage);
        }
      } else {
        // ✅ Handle error code dari backend
        const errorCode = result.code;
        let errorMessage = result.message || 'Terjadi kesalahan.';
        let errorTitle = editKategoriId ? 'Gagal Memperbarui' : 'Gagal Menambahkan';

        if (errorCode === 'RANGE_OVERLAP') {
          errorTitle = '⚠️ Range Nilai Bertabrakan';
          errorMessage = `${result.message}\n\nSilakan sesuaikan nilai min/max agar tidak tumpang tindih dengan kategori lain.`;
        } else if (errorCode === 'DUPLICATE_GRADE') {
          errorTitle = '⚠️ Grade Sudah Ada';
          errorMessage = `${result.message}\n\nGunakan grade lain atau edit kategori yang sudah ada.`;
        }

        showModal({ type: 'error', title: errorTitle, message: errorMessage });
      }
    } catch (err: any) {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSavingKategori(false);
    }
  };

  // ====== DELETE KATEGORI ======
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
            if (selectedMapelForRataRata) {
              endpoint = `${API}/atur-penilaian/kategori-rata-rata/${id}`;
            } else {
              endpoint = `${API}/atur-penilaian/kategori-akademik/${id}`;
            }
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
            // ✅ Handle error khusus untuk kategori yang sedang dipakai
            let errorMessage = result.message || 'Gagal menghapus kategori.';
            let errorTitle = 'Gagal Menghapus';

            if (errorMessage.includes('nilai siswa')) {
              errorTitle = '⚠️ Kategori Sedang Digunakan';
              errorMessage = `${result.message}\n\nAnda tidak dapat menghapus kategori yang sudah digunakan oleh siswa. Ubah range nilai kategori lain sebagai gantinya.`;
            }

            showModal({ type: 'error', title: errorTitle, message: errorMessage });
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

  const handleSaveBobot = async () => {
    if (!selectedMapelId) return;

    const isUnchanged = bobotList.every((b) => {
      const initial = initialBobotListRef.current.find((i) => i.komponen_id === b.komponen_id);
      return initial && Math.abs(b.bobot - initial.bobot) < 0.01;
    });

    if (isUnchanged) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return;
    }

    const adaNegatif = bobotList.some(b => b.bobot < 0);
    if (adaNegatif) {
      showModal({ type: 'warning', title: 'Bobot Tidak Valid', message: 'Bobot tidak boleh negatif.' });
      return;
    }

    const total = bobotList.reduce((sum, b) => sum + b.bobot, 0);
    if (Math.abs(total - 100) > 0.01) {
      showModal({
        type: 'warning',
        title: 'Total Bobot Salah',
        message: `Total bobot harus tepat 100%.\nSaat ini: ${total.toFixed(2)}%`,
      });
      return;
    }

    if (isPTSActive) {
      showModal({
        type: 'warning',
        title: 'Periode PTS Aktif',
        message: 'Bobot tidak dapat diubah saat periode PTS aktif.',
      });
      return;
    }

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
        // ✅ Handle error code dari backend
        const errorCode = result.code;
        let errorMessage = result.message || 'Gagal menyimpan bobot.';
        let errorTitle = 'Gagal Menyimpan';

        if (errorCode === 'PERIOD_LOCKED') {
          errorTitle = '🔒 Periode Terkunci';
          errorMessage = `${result.message}\n\nAnda tidak dapat mengubah bobot saat periode PTS aktif.`;
        } else if (errorCode === 'BOBOT_NOT_100') {
          errorTitle = '⚠️ Total Bobot Salah';
          errorMessage = result.message;
        }

        showModal({ type: 'error', title: errorTitle, message: errorMessage });
      }
    } catch (err) {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal menyimpan bobot.' });
    } finally {
      setIsSavingBobot(false);
    }
  };

  // ====== LOADING STATE ======
  if (loading) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
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
              {jenisPenilaianAktif && (
                <div className="mb-5 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                  <p className="text-sm" style={{ color: '#7a3a0a' }}>
                    <span className="font-bold">ℹ️ Info: </span>
                    Periode <strong>{jenisPenilaianAktif}</strong> sedang aktif.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                <p className="text-xs" style={{ color: '#c95b08' }}>
                  Menampilkan {kategoriList.length} kategori kokurikuler
                </p>
                <button
                  onClick={() => openEditKategori()}
                  className={btnPrimary.base}
                  style={btnPrimary.style}
                  onMouseEnter={btnPrimary.hover}
                  onMouseLeave={btnPrimary.leave}
                >
                  <Plus size={16} />
                  Tambah Kategori
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #fde0c8' }}>
                <table className="w-full min-w-[700px] text-sm border-collapse">
                  <thead>
                    <tr style={TH_GRAD}>
                      {['No.', 'Aspek', 'Grade', 'Range Nilai', 'Deskripsi', 'Aksi'].map(h => (
                        <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kategoriLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                          <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-2" />
                          Memuat data...
                        </td>
                      </tr>
                    ) : kategoriList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                          Belum ada kategori kokurikuler.
                        </td>
                      </tr>
                    ) : (
                      kategoriList.map((kategori, index) => {
                        const k = kategori as KategoriKokurikuler;
                        const aspek = aspekList.find(a => a.id_aspek_kokurikuler === k.id_aspek_kokurikuler);
                        return (
                          <tr
                            key={k.id}
                            className="transition-colors"
                            style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                            onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                          >
                            <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{index + 1}</td>
                            <td className="px-5 py-3.5 text-center text-gray-700">{aspek?.nama || '-'}</td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                {k.grade}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                {Math.floor(k.min_nilai)} – {Math.floor(k.max_nilai)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-700" style={{ maxWidth: '250px' }}>
                              <span className="truncate block" title={k.deskripsi}>{k.deskripsi}</span>
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => openEditKategori(k)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                  style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteKategori(k.id, k.deskripsi)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                  style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                >
                                  <Trash2 size={13} /> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====== TAB: AKADEMIK ====== */}
          {activeTab === 'akademik' && (
            <div>
              {jenisPenilaianAktif && (
                <div className="mb-5 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                  <p className="text-sm" style={{ color: '#7a3a0a' }}>
                    <span className="font-bold">ℹ️ Info: </span>
                    Periode <strong>{jenisPenilaianAktif}</strong> sedang aktif.
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className={labelCls} style={labelColor}>
                  Pilih Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMapelForRataRata ? 'rata-rata' : (selectedMapelAkademik || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'rata-rata') {
                      setSelectedMapelForRataRata(true);
                      setSelectedMapelAkademik(null);
                    } else {
                      setSelectedMapelForRataRata(false);
                      setSelectedMapelAkademik(val ? Number(val) : null);
                    }
                  }}
                  className={inputCls}
                  style={{ maxWidth: '400px' }}
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  <option value="rata-rata">📚 Rata-rata Seluruh Mapel</option>
                  {mapelWajibList.map((mapel) => (
                    <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                      {mapel.nama_mapel}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedMapelAkademik || selectedMapelForRataRata) ? (
                <>
                  {/* ✅ Coverage Warning Banner */}
                  <CoverageWarning coverage={coverageInfo} />

                  <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: '1px solid #fde0c8' }}>
                    <p className="text-xs" style={{ color: '#c95b08' }}>
                      Menampilkan {kategoriList.length} kategori nilai
                    </p>
                    <button
                      onClick={() => openEditKategori()}
                      className={btnPrimary.base}
                      style={btnPrimary.style}
                      onMouseEnter={btnPrimary.hover}
                      onMouseLeave={btnPrimary.leave}
                    >
                      <Plus size={16} />
                      Tambah Kategori
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
                              Belum ada kategori untuk {selectedMapelForRataRata ? 'rata-rata' : 'mata pelajaran ini'}.
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
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                  >
                                    <Pencil size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteKategori(kategori.id, kategori.deskripsi)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                  >
                                    <Trash2 size={13} /> Hapus
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
                    <span className="font-bold">ℹ️ Periode PTS Aktif: </span>
                    Sistem otomatis menetapkan <strong>PTS = 100%</strong>. Anda tidak perlu mengatur bobot manual.
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className={labelCls} style={labelColor}>
                  Mata Pelajaran <span className="text-red-500">*</span>
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
                          {isBobotValid ? ' ✓' : ' ✗'}
                        </span>
                      </div>
                    </div>

                    {!isPTSActive && (
                      <div className="flex justify-end pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                        <button
                          onClick={handleSaveBobot}
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

      {/* ====== MODAL EDIT KATEGORI ====== */}
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
              {/* Aspek & Grade (kokurikuler only) */}
              {activeTab === 'kokurikuler' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>
                      Aspek Kokurikuler <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editKategoriData.id_aspek_kokurikuler || ''}
                      onChange={(e) => setEditKategoriData({ ...editKategoriData, id_aspek_kokurikuler: Number(e.target.value) })}
                      className={errors.form ? inputErrCls : inputCls}
                    >
                      <option value="">-- Pilih Aspek --</option>
                      {aspekList.map(a => (
                        <option key={a.id_aspek_kokurikuler} value={a.id_aspek_kokurikuler}>{a.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>
                      Grade <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs font-normal text-gray-400">(1 karakter: A, B, C, dst)</span>
                    </label>
                    <input
                      type="text"
                      value={editKategoriData.grade || ''}
                      onChange={(e) => setEditKategoriData({ ...editKategoriData, grade: e.target.value.toUpperCase().slice(0, 1) })}
                      className={errors.grade ? inputErrCls : inputCls}
                      maxLength={1}
                      placeholder="A"
                    />
                    {errors.grade && <p className="text-red-500 text-xs">{errors.grade}</p>}
                  </div>
                </>
              )}

              {/* Range nilai */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>
                    Nilai Minimum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editKategoriData.min_nilai}
                    onChange={(e) => setEditKategoriData({ ...editKategoriData, min_nilai: Number(e.target.value) })}
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
                    value={editKategoriData.max_nilai}
                    onChange={(e) => setEditKategoriData({ ...editKategoriData, max_nilai: Number(e.target.value) })}
                    className={errors.form ? inputErrCls : inputCls}
                  />
                </div>
              </div>

              {/* ✅ Real-time validation warning */}
              {editKategoriData.min_nilai >= editKategoriData.max_nilai && (
                <div className="p-2 rounded-lg text-xs" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                  ⚠️ Nilai minimum harus lebih kecil dari nilai maksimum
                </div>
              )}

              {/* Deskripsi */}
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
                onClick={handleSaveKategori}
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
    </div>
  );
}