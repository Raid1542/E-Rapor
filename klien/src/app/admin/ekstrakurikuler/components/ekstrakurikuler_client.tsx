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
 */

'use client';
import { useState, useEffect, useRef, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users, Lock, CalendarRange } from 'lucide-react';
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

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes ek-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ek-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ek-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .ek-fadeIn  { animation: ek-fadeIn  0.2s ease; }
    .ek-scaleIn { animation: ek-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ek-pulse   { animation: ek-pulse   0.6s ease 0.15s; }
  `}</style>
);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ek-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ek-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ek-pulse`}>{s.icon}</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
      </div>
    </div>
  );
};

// ─── CONFIRM MODAL (Hapus) ────────────────────────────────────────────────────

const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ek-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ek-scaleIn">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ek-pulse">
        <Trash2 size={36} className="text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2 whitespace-pre-line">{message}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>Batal</button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm bg-red-500 hover:bg-red-600 transition-colors">
          Ya, Hapus
        </button>
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
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ek-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col ek-scaleIn overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' }}>
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

      <div className="px-6 py-3 flex items-center justify-between flex-shrink-0" style={{ background: '#fffaf6', borderBottom: '1px solid #fde0c8' }}>
        <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
          Total: <span style={{ color: '#c95b08' }}>{peserta.length}</span> siswa
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
                <tr style={{ background: '#fffaf6', borderBottom: '1px solid #fde0c8' }}>
                  <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-12">No</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-24">NIS</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-32">NISN</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600">Nama Siswa</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 w-24">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {peserta.map((p, idx) => (
                  <tr key={p.id_siswa} className="transition-colors" style={{ borderBottom: '1px solid #fde0c8' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <td className="px-5 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                    <td className="px-5 py-3 font-mono text-sm text-gray-700">{p.nis}</td>
                    <td className="px-5 py-3 font-mono text-sm text-gray-700">{p.nisn || '—'}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">{p.nama}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: '#fff0e5', color: '#b35a08', border: '1px solid #fde0c8' }}>
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

      <div className="px-6 py-4 flex justify-end flex-shrink-0" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
          Tutup
        </button>
      </div>
    </div>
  </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 4px 20px rgba(180,70,10,0.10)' };
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

const BtnBatal = ({ onClick, children = 'Batal' }: { onClick: () => void; children?: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
    style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
  >
    {children}
  </button>
);

const BtnReset = ({ onClick, children = 'Reset' }: { onClick: () => void; children?: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
    style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
  >
    {children}
  </button>
);

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
    const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
    const btnActive = "text-white border-orange-500";
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

    range.forEach((p) => {
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

  // ── Render Form (Tambah / Edit) ────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Ekstrakurikuler</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
          {isEdit ? 'Edit' : 'Tambah'} Data Ekstrakurikuler
        </p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto" style={CARD_STYLE}>
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
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
            {errors.nama_ekskul && <p className="text-red-500 text-xs">{errors.nama_ekskul}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>
              Pembina Ekstrakurikuler
            </label>
            <select
              name="pembina_id"
              value={formData.pembina_id}
              onChange={handleInputChange}
              className={inputCls}
            >
              <option value="">-- Pilih Pembina --</option>
              {pembinaList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <BtnBatal onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }} />
          <BtnReset onClick={handleReset} />
          <button
            onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}
            className={btnPrimary.base}
            style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
            onMouseEnter={btnPrimary.hover}
            onMouseLeave={btnPrimary.leave}
          >
            {isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Simpan (Tambah/Edit) */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 ek-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 ek-scaleIn">
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

            <div className="flex gap-3">
              <BtnBatal onClick={() => setShowConfirmModal(false)} />
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (confirmAction === 'add') {
                    executeTambah();
                  } else {
                    executeEdit();
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
    </div>
  );

  if (showTambah) return renderForm(false);
  if (showEdit) return renderForm(true);

  // ── HALAMAN UTAMA — 3 Card Terpisah ────────────────────────────────────────

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
      {showLihatPeserta && (
        <ModalLihatPeserta
          ekskul={selectedEkskul}
          peserta={pesertaList}
          loading={loadingPeserta}
          onClose={() => setShowLihatPeserta(false)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Ekstrakurikuler</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data kegiatan ekstrakurikuler per semester</p>
      </div>

      {/* ====================================================================
          CARD 1: Pilih Tahun Ajaran + Semester
      ==================================================================== */}
      <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center gap-5" style={CARD_STYLE}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff0e5' }}>
            <CalendarRange size={16} style={{ color: '#c95b08' }} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
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
              className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[200px]"
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
            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
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
              className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[200px]"
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
        )}
      </div>

      {selectedTahunAjaranId === null ? (
        <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
          <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
            <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
          </div>
        </div>
      ) : selectedSemesterId === null ? (
        <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
          <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
            <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Semester Terlebih Dahulu</p>
          </div>
        </div>
      ) : (
        <>
          {/* ====================================================================
              CARD 2: Toolbar — Tambah Ekstrakurikuler + Tampilkan data + Search
          ==================================================================== */}
          <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-3" style={CARD_STYLE}>
            <div>
              {isSemesterActive ? (
                <button
                  onClick={() => setShowTambah(true)}
                  className={btnPrimary.base}
                  style={btnPrimary.style}
                  onMouseEnter={btnPrimary.hover}
                  onMouseLeave={btnPrimary.leave}
                >
                  <Plus size={16} /> Tambah Ekstrakurikuler
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">
                  Semester ini tidak aktif
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                >
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
                <input
                  type="text"
                  placeholder="Cari ekskul / pembina..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute inset-y-0 right-2 flex items-center"
                    style={{ color: '#c95b08' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ====================================================================
              CARD 3: Tabel data ekstrakurikuler
          ==================================================================== */}
          <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
            <div className="px-5 py-2.5" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
              <p className="text-xs" style={{ color: '#c95b08' }}>
                Menampilkan {filteredEkskul.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredEkskul.length)} dari {filteredEkskul.length} data
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm border-collapse">
                <thead>
                  <tr style={TH_GRAD}>
                    {['No.', 'Nama Ekstrakurikuler', 'Pembina', 'Jumlah Siswa', 'Aksi'].map(h => (
                      <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                          Memuat data...
                        </div>
                      </td>
                    </tr>
                  ) : currentEkskul.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                        {searchQuery ? 'Tidak ada data yang cocok' : 'Belum ada data ekstrakurikuler'}
                      </td>
                    </tr>
                  ) : (
                    currentEkskul.map((ekskul, index) => (
                      <tr
                        key={ekskul.id_ekskul}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                      >
                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-800">{ekskul.nama_ekskul}</td>
                        <td className="px-5 py-3.5 text-gray-700">
                          {ekskul.nama_pembina ? ekskul.nama_pembina : (
                            <span className="text-gray-400 italic text-xs">Belum ditetapkan</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                            {ekskul.jumlah_siswa || 0} siswa
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleLihatPeserta(ekskul)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                              style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#bae6fd')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#e0f2fe')}
                            >
                              <Users size={13} /> Lihat Siswa
                            </button>
                            {isSemesterActive && (
                              <>
                                <button
                                  onClick={() => handleEdit(ekskul)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                  style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(ekskul.id_ekskul, ekskul.nama_ekskul)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                >
                                  <Trash2 size={13} /> Hapus
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
              <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
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