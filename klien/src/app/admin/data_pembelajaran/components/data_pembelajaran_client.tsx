/**
 * Nama File: data_pembelajaran_client.tsx
 * Update: 
 *   - ✅ FIXED: Race condition saat load dari localStorage
 *   - ✅ FIXED: fetchDataPerKelas terima parameter semesterId
 *   - ✅ FIXED: Disable dropdown kelas jika semester belum dipilih
 *   - Dropdown Semester (TA → Semester → Kelas)
 *   - Kirim semester_id ke semua endpoint
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, BookOpen, CheckSquare, Square, Lock } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

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

// ─── HELPER: Filter Duplikat by ID ────────────────────────────────────────────
const removeDuplicatesById = <T extends { id: number }>(arr: T[]): T[] => {
  const seen = new Set<number>();
  return arr.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
  error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 dp-fadeIn">
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
  <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 dp-fadeIn">
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
const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

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
    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#fff0e5'; }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = '#fff'; }}
  >{children}</button>
);

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

  const [searchQuery, setSearchQuery] = useState('');

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
      const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
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
        
        // ✅ PERBAIKAN: Kirim sebagai query parameter
        const res = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${idInduk}`, {
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
      const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/dropdown?semester_id=${semesterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuruList(removeDuplicatesById(data.data.guru || []));
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
      const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/kelas/${kelasId}?semester_id=${semId}`, {
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
      const res = await fetch('http://localhost:5000/api/admin/pembelajaran/tambah-wajib', {
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
      const res = await fetch('http://localhost:5000/api/admin/pembelajaran/tambah-pilihan', {
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
      const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/${editId}`, {
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
          const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/${id}`, {
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

  const filterMapel = (list: Pembelajaran[]): Pembelajaran[] => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(m =>
      m.nama_mapel.toLowerCase().includes(q) ||
      m.nama_guru.toLowerCase().includes(q) ||
      m.kode_mapel.toLowerCase().includes(q)
    );
  };

  // ── PAGE: Form EDIT Mapel Pilihan ──────────────────────────────────────────
  if (showFormEdit) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 dp-fadeIn" style={PAGE_BG}>
        <GlobalStyles />
        {modal && <NotifModal modal={modal} onClose={closeModal} />}
        {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
          <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
            Edit Pembelajaran — Kelas {dataPerKelas?.kelas.nama_kelas}
          </p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto" style={CARD_STYLE}>
          <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
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
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#c95b08' }}>
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
              <select
                name="user_id"
                value={formDataPilihan.user_id}
                onChange={handlePilihanChange}
                className={errorsPilihan.user_id ? inputErrCls : inputCls}
                disabled={dropdownLoading}
              >
                <option value="">-- Pilih Guru --</option>
                {guruList.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
              {errorsPilihan.user_id && <p className="text-red-500 text-xs">{errorsPilihan.user_id}</p>}
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
            <BtnSecondary onClick={() => { setShowFormEdit(false); setEditId(null); setEditData(null); }}>Batal</BtnSecondary>
            <button
              onClick={() => openConfirmPilihan('edit-pilihan')}
              className={btnPrimary.base}
              style={btnPrimary.style}
              onMouseEnter={btnPrimary.hover}
              onMouseLeave={btnPrimary.leave}
            >
              Simpan Perubahan
            </button>
          </div>
        </div>

        {showConfirmModal && confirmAction === 'edit-pilihan' && (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 dp-fadeIn"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dp-scaleIn">
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
                    setShowConfirmModal(false);
                    executeEditPilihan();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── HALAMAN UTAMA ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 dp-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submittingWajib && setShowModalWajib(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col dp-scaleIn" style={CARD_STYLE}>
            <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
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
                    className="w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: '#fff8f2', border: '1px solid #fde0c8', color: '#7a3a0a' }}
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
                          border: selectedMapelWajibIds.includes(mp.id) ? '2px solid #f5a623' : '1px solid #fde0c8',
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
                            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#fff0e5', color: '#c95b08' }}>
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

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={() => setShowModalWajib(false)} disabled={submittingWajib}>Batal</BtnSecondary>
              <button
                onClick={openConfirmWajib}
                disabled={selectedMapelWajibIds.length === 0 || submittingWajib || dataPerKelas.mapel_wajib_tersedia.length === 0}
                className={`${btnPrimary.base} ${(selectedMapelWajibIds.length === 0 || submittingWajib || dataPerKelas.mapel_wajib_tersedia.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL TAMBAH MAPEL PILIHAN ═══ */}
      {showModalPilihan && dataPerKelas && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 dp-fadeIn">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submittingPilihan && setShowModalPilihan(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden dp-scaleIn" style={CARD_STYLE}>
            <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
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
                    <select
                      name="mapel_id"
                      value={formDataPilihan.mapel_id}
                      onChange={handlePilihanChange}
                      className={errorsPilihan.mapel_id ? inputErrCls : inputCls}
                      disabled={dropdownLoading || submittingPilihan}
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {dataPerKelas.mapel_pilihan_tersedia.map(m => (
                        <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                      ))}
                    </select>
                    {errorsPilihan.mapel_id && <p className="text-red-500 text-xs">{errorsPilihan.mapel_id}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} style={labelColor}>
                      Guru Pengampu <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="user_id"
                      value={formDataPilihan.user_id}
                      onChange={handlePilihanChange}
                      className={errorsPilihan.user_id ? inputErrCls : inputCls}
                      disabled={dropdownLoading || submittingPilihan}
                    >
                      <option value="">-- Pilih Guru --</option>
                      {guruList.map(g => (
                        <option key={g.id} value={g.id}>{g.nama}</option>
                      ))}
                    </select>
                    {errorsPilihan.user_id && <p className="text-red-500 text-xs">{errorsPilihan.user_id}</p>}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
              <BtnSecondary onClick={() => setShowModalPilihan(false)} disabled={submittingPilihan}>Batal</BtnSecondary>
              <button
                onClick={() => openConfirmPilihan('add-pilihan')}
                disabled={dataPerKelas.mapel_pilihan_tersedia.length === 0 || submittingPilihan}
                className={`${btnPrimary.base} ${(dataPerKelas.mapel_pilihan_tersedia.length === 0 || submittingPilihan) ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={btnPrimary.style}
                onMouseEnter={btnPrimary.hover}
                onMouseLeave={btnPrimary.leave}
              >
                {submittingPilihan ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL KONFIRMASI ═══ */}
      {showConfirmModal && (confirmAction === 'add-wajib' || confirmAction === 'add-pilihan') && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 dp-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dp-scaleIn">
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
                  setShowConfirmModal(false);
                  if (confirmAction === 'add-wajib') {
                    executeTambahWajib();
                  } else {
                    executeTambahPilihan();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HALAMAN UTAMA ═══ */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
          Kelola penugasan guru mengajar per kelas
        </p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        {/* ═══ DROPDOWN TAHUN AJARAN ═══ */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
              Tahun Ajaran
            </label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => handleTahunAjaranChange(e.target.value)}
              className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[220px]"
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

        {selectedTahunAjaranId === null ? (
          <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
            <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
          </div>
        ) : (
          <>
            {/* ═══ DROPDOWN SEMESTER ═══ */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                  Semester
                </label>
                <select
                  value={selectedSemesterId ?? ''}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[220px]"
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#d4f0dd', color: '#1a7a3a', border: '1px solid #86efac' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      Aktif - Bisa Edit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}>
                      <Lock size={12} />
                      Non-Aktif - Read Only
                    </span>
                  )
                )}
              </div>
            </div>

            {selectedSemesterId === null ? (
              <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Semester Terlebih Dahulu</p>
              </div>
            ) : (
              <>
                {/* ═══ DROPDOWN KELAS (DENGAN DISABLE) ═══ */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>Kelas</label>
                    <select
                      value={selectedKelasId ?? ''}
                      onChange={(e) => handleKelasChange(e.target.value)}
                      disabled={!selectedSemesterId}
                      className={`border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[220px] ${!selectedSemesterId ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {kelasList.map(k => (
                        <option key={k.id} value={k.id}>{k.nama}</option>
                      ))}
                    </select>
                    
                    {!selectedSemesterId && (
                      <span className="text-xs text-gray-500 italic">
                        Pilih semester terlebih dahulu
                      </span>
                    )}
                  </div>
                </div>

                {selectedKelasId === null ? (
                  <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                    <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Kelas Terlebih Dahulu</p>
                  </div>
                ) : (
                  <>
                    {/* ═══ TOOLBAR - SEARCH ═══ */}
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div />
                        <div className="relative min-w-[200px] sm:min-w-[220px]">
                          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                          </div>
                          <input
                            type="text"
                            placeholder="Cari mapel / guru..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                          />
                          {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')}
                              className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ═══ KONTEN DATA ═══ */}
                    {loading ? (
                      <div className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                          <p className="text-sm text-gray-400">Memuat data...</p>
                        </div>
                      </div>
                    ) : !dataPerKelas ? (
                      <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                        <p className="text-base font-bold" style={{ color: '#c95b08' }}>Data tidak ditemukan</p>
                      </div>
                    ) : (
                      <div className="p-5 space-y-6">
                        {/* Info Kelas */}
                        <div className="rounded-xl p-4" style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
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

                        {/* ═══ MAPEL WAJIB ═══ */}
                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #fde0c8' }}>
                          <div className="px-5 py-3 flex items-center justify-between" style={TH_GRAD}>
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
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                              >
                                <Plus size={14} />
                                Tambah Mapel Wajib
                              </button>
                            )}
                          </div>

                          {filterMapel(dataPerKelas.mapel_wajib).length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 bg-white">
                              {searchQuery ? 'Tidak ada mapel wajib yang cocok' : 'Belum ada mapel wajib yang ditugaskan'}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[600px] text-sm border-collapse bg-white">
                                <thead>
                                  <tr style={{ background: '#fffaf6', borderBottom: '1px solid #fde0c8' }}>
                                    <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-12">No</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-24">Kode</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600">Mata Pelajaran</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600">Guru Pengampu</th>
                                    {isSemesterActive && (
                                      <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-32">Aksi</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {filterMapel(dataPerKelas.mapel_wajib).map((mp, idx) => (
                                    <tr key={`wajib-${idx}-${mp.id}`} className="transition-colors" style={{ borderBottom: '1px solid #fde0c8' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                      <td className="px-5 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                                      <td className="px-5 py-3 font-bold" style={{ color: '#c95b08' }}>{mp.kode_mapel}</td>
                                      <td className="px-5 py-3 font-semibold text-gray-800">{mp.nama_mapel}</td>
                                      <td className="px-5 py-3 text-gray-700">{mp.nama_guru}</td>
                                      {isSemesterActive && (
                                        <td className="px-5 py-3 text-center">
                                          <button
                                            onClick={() => handleDelete(mp.id, mp.nama_mapel, mp.nama_guru)}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all"
                                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                          >
                                            <Trash2 size={12} />
                                            <span>Hapus</span>
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* ═══ MAPEL PILIHAN ═══ */}
                        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #fde0c8' }}>
                          <div className="px-5 py-3 flex items-center justify-between" style={TH_GRAD}>
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
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                              >
                                <Plus size={14} />
                                Tambah Mapel Pilihan
                              </button>
                            )}
                          </div>

                          {filterMapel(dataPerKelas.mapel_pilihan).length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 bg-white">
                              {searchQuery ? 'Tidak ada mapel pilihan yang cocok' : 'Belum ada mapel pilihan yang ditugaskan'}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[600px] text-sm border-collapse bg-white">
                                <thead>
                                  <tr style={{ background: '#fffaf6', borderBottom: '1px solid #fde0c8' }}>
                                    <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-12">No</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-24">Kode</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600">Mata Pelajaran</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600">Guru Pengampu</th>
                                    {isSemesterActive && (
                                      <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-40">Aksi</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {filterMapel(dataPerKelas.mapel_pilihan).map((mp, idx) => (
                                    <tr key={`pilihan-${idx}-${mp.id}`} className="transition-colors" style={{ borderBottom: '1px solid #fde0c8' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                      <td className="px-5 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                                      <td className="px-5 py-3 font-bold" style={{ color: '#c95b08' }}>{mp.kode_mapel}</td>
                                      <td className="px-5 py-3 font-semibold text-gray-800">{mp.nama_mapel}</td>
                                      <td className="px-5 py-3 text-gray-700">{mp.nama_guru}</td>
                                      {isSemesterActive && (
                                        <td className="px-5 py-3 text-center">
                                          <div className="flex justify-center gap-1">
                                            <button
                                              onClick={() => openFormEdit(mp)}
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all"
                                              style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                              onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                              onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                            >
                                              <Pencil size={12} />
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              onClick={() => handleDelete(mp.id, mp.nama_mapel, mp.nama_guru)}
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all"
                                              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                                              onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                              onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                            >
                                              <Trash2 size={12} />
                                              <span>Hapus</span>
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}