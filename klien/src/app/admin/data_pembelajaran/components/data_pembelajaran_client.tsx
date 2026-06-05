/**
 * Nama File: data_pembelajaran_client.tsx
 * Update: Tambah fitur Edit + Fix scroll horizontal
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, BookOpen, Users } from 'lucide-react';

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

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
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

interface FormData {
  user_id: string;
  mapel_id: string;
  confirmData: boolean;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DataPembelajaranPage() {
  const [dataPerKelas, setDataPerKelas] = useState<DataPerKelas | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Pembelajaran | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
  const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);

  const [kelasList, setKelasList] = useState<DropdownItem[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);

  const [guruList, setGuruList] = useState<DropdownItem[]>([]);
  const [mapelList, setMapelList] = useState<DropdownItem[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    user_id: '', mapel_id: '', confirmData: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
        setTahunAjaranList(removeDuplicatesById(
          data.data.map((ta: any) => ({
            id: ta.id_induk || ta.id_tahun_ajaran,
            tahun_ajaran: ta.tahun_ajaran,
            semester: ta.semester_aktif?.toLowerCase() || 'ganjil',
            is_aktif: ta.status?.toLowerCase() === 'aktif',
          }))
        ));
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data tahun ajaran.' });
    }
  }, [showModal]);

  const fetchKelasList = useCallback(async (taId: number) => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${taId}`, {
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

  const fetchDropdowns = useCallback(async () => {
    setDropdownLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/admin/pembelajaran/dropdown', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuruList(removeDuplicatesById(data.data.guru || []));
        setMapelList(removeDuplicatesById(data.data.mata_pelajaran || []));
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat memuat data dropdown.' });
    } finally {
      setDropdownLoading(false);
    }
  }, [showModal]);

  const fetchDataPerKelas = useCallback(async (kelasId: number) => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/kelas/${kelasId}`, {
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
  }, [showModal]);

  useEffect(() => { fetchTahunAjaran(); }, [fetchTahunAjaran]);

  useEffect(() => {
    if (tahunAjaranList.length > 0 && selectedTahunAjaranId === null) {
      const savedTA = localStorage.getItem('pembelajaran_selectedTA');
      const savedKelas = localStorage.getItem('pembelajaran_selectedKelas');
      if (savedTA) {
        const id = Number(savedTA);
        const ta = tahunAjaranList.find(t => t.id === id);
        if (ta) {
          setSelectedTahunAjaranId(id);
          setSelectedTahunAjaranAktif(ta.is_aktif);
          fetchKelasList(id);
          if (savedKelas) {
            const kelasId = Number(savedKelas);
            setSelectedKelasId(kelasId);
            fetchDataPerKelas(kelasId);
            if (ta.is_aktif) fetchDropdowns();
          }
        }
      }
    }
  }, [tahunAjaranList]);

  // ── Form Handlers ──────────────────────────────────────────────────────────
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const resetForm = () => {
    setFormData({ user_id: '', mapel_id: '', confirmData: false });
    setErrors({});
    setEditId(null);
    setEditData(null);
  };

  const hasDataChanged = (): boolean => {
    if (!editData) return true; // Jika bukan mode edit, skip

    const newUserId = Number(formData.user_id);
    const newMapelId = Number(formData.mapel_id);

    // Bandingkan dengan data lama
    return (
      editData.user_id !== newUserId ||
      editData.mapel_id !== newMapelId
    );
  };

  const validateForm = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.user_id) ne.user_id = 'Pilih guru pengampu';
    if (!formData.mapel_id) ne.mapel_id = 'Pilih mata pelajaran';
    if (!formData.confirmData) ne.confirmData = 'Harap konfirmasi data';
    setErrors(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
      return false;
    }
    return true;
  };

  const openFormTambah = () => {
    resetForm();

    if (dataPerKelas?.wali_kelas?.id) {
      setFormData(prev => ({
        ...prev,
        user_id: String(dataPerKelas.wali_kelas.id)
      }));
    }
    setShowForm(true);
  };

  const openFormEdit = (mp: Pembelajaran) => {
    setEditId(mp.id);
    setEditData(mp);
    setFormData({
      user_id: String(mp.user_id),
      mapel_id: String(mp.mapel_id),
      confirmData: false,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    if (!selectedKelasId) return;

    if (editId !== null && !hasDataChanged()) {
      showModal({
        type: 'warning',
        title: 'Tidak Ada Perubahan',
        message: 'Tidak ada data yang diubah.'
      });
      return;
    }

    const token = getToken();
    if (!token) {
      showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
      return;
    }

    const isEdit = editId !== null;
    const url = isEdit
      ? `http://localhost:5000/api/admin/pembelajaran/${editId}`
      : 'http://localhost:5000/api/admin/pembelajaran';

    const method = isEdit ? 'PUT' : 'POST';
    const body = {
      user_id: Number(formData.user_id),
      mapel_id: Number(formData.mapel_id),
      kelas_id: selectedKelasId,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setShowForm(false);
        resetForm();
        await fetchDataPerKelas(selectedKelasId);
        showModal({
          type: 'success',
          title: isEdit ? 'Berhasil Diperbarui!' : 'Berhasil Ditambahkan!',
          message: result.message || (isEdit ? 'Data pembelajaran berhasil diperbarui.' : 'Pembelajaran berhasil ditambahkan.')
        });
      } else {
        showModal({
          type: 'error',
          title: isEdit ? 'Gagal Memperbarui' : 'Gagal Menambahkan',
          message: result.message || 'Terjadi kesalahan.'
        });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
  };

  const handleDelete = (id: number, namaMapel: string, namaGuru: string) => {
    showConfirm(
      `Yakin ingin menghapus mata pelajaran "${namaMapel}" dari "${namaGuru}"?\n\nTindakan ini tidak dapat dibatalkan jika sudah ada data nilai rapor.`,
      async () => {
        const token = getToken();
        if (!token || !selectedKelasId) return;
        try {
          const res = await fetch(`http://localhost:5000/api/admin/pembelajaran/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
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

  // ── PAGE: Form Tambah/Edit ─────────────────────────────────────────────────
  if (showForm) {
    const isEdit = editId !== null;
    return (
      <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
        <GlobalStyles />
        {modal && <NotifModal modal={modal} onClose={closeModal} />}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
          <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
            {isEdit ? 'Edit' : 'Tambah'} Pembelajaran — Kelas {dataPerKelas?.kelas.nama_kelas}
          </p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto" style={CARD_STYLE}>
          <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
            <h2 className="text-base font-bold text-white">
              {isEdit ? 'Edit Pembelajaran' : 'Tambah Pembelajaran'}
            </h2>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <X size={16} className="text-white" />
            </button>
          </div>

          {dataPerKelas && (
            <div className="px-6 pt-5">
              <div className="rounded-xl p-4" style={{ background: '#fff8f2', border: '1px solid #fde0c8' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#c95b08' }}>
                  Informasi Kelas
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Kelas</p>
                    <p className="font-semibold text-gray-800">{dataPerKelas.kelas.nama_kelas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">guru Kelas</p>
                    <p className="font-semibold text-gray-800">{dataPerKelas.wali_kelas?.nama || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls} style={labelColor}>
                Guru Pengampu <span className="text-red-500">*</span>
              </label>
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                className={errors.user_id ? inputErrCls : inputCls}
                disabled={dropdownLoading}
              >
                <option value="">-- Pilih Guru --</option>
                {guruList.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
              {errors.user_id && <p className="text-red-500 text-xs">{errors.user_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls} style={labelColor}>
                Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <select
                name="mapel_id"
                value={formData.mapel_id}
                onChange={handleInputChange}
                className={errors.mapel_id ? inputErrCls : inputCls}
                disabled={dropdownLoading}
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {mapelList.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
              {errors.mapel_id && <p className="text-red-500 text-xs">{errors.mapel_id}</p>}
            </div>

            {dropdownLoading && (
              <div className="flex items-center gap-2 text-xs" style={{ color: '#c95b08' }}>
                <div className="w-4 h-4 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                Memuat data dropdown...
              </div>
            )}

            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="confirmData"
                  checked={formData.confirmData}
                  onChange={handleInputChange}
                  className="mt-0.5 w-4 h-4 rounded accent-orange-500"
                />
                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                  Saya yakin data yang diisi sudah benar
                </span>
              </label>
              {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
            <BtnSecondary onClick={() => { setShowForm(false); resetForm(); }}>Batal</BtnSecondary>
            <BtnSecondary onClick={resetForm}>Reset</BtnSecondary>
            <button
              onClick={handleSubmitForm}
              className={btnPrimary.base}
              style={btnPrimary.style}
              onMouseEnter={btnPrimary.hover}
              onMouseLeave={btnPrimary.leave}
            >
              {isEdit ? 'Simpan Perubahan' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── HALAMAN UTAMA ──────────────────────────────────────────────────────────
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
          Kelola penugasan guru mengajar per kelas
        </p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        {/* Dropdown TA */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
              Tahun Ajaran
            </label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || value === 'no-data') {
                  setSelectedTahunAjaranId(null);
                  setSelectedTahunAjaranAktif(false);
                  setSelectedKelasId(null);
                  setDataPerKelas(null);
                  setKelasList([]);
                  setLoading(false);
                  localStorage.removeItem('pembelajaran_selectedTA');
                  localStorage.removeItem('pembelajaran_selectedKelas');
                  return;
                }
                const id = Number(value);
                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                setSelectedTahunAjaranId(id);
                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                setSelectedKelasId(null);
                setDataPerKelas(null);
                localStorage.setItem('pembelajaran_selectedTA', id.toString());
                localStorage.removeItem('pembelajaran_selectedKelas');
                setLoading(true);
                fetchKelasList(id);
              }}
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
            {/* Dropdown Kelas */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>Kelas</label>
                <select
                  value={selectedKelasId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === 'no-data') {
                      setSelectedKelasId(null);
                      setDataPerKelas(null);
                      localStorage.removeItem('pembelajaran_selectedKelas');
                      return;
                    }
                    const id = Number(value);
                    setSelectedKelasId(id);
                    localStorage.setItem('pembelajaran_selectedKelas', id.toString());
                    setLoading(true);
                    fetchDataPerKelas(id);
                    if (selectedTahunAjaranAktif) fetchDropdowns();
                  }}
                  className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[220px]"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedKelasId === null ? (
              <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                <p className="text-base font-bold" style={{ color: '#c95b08' }}>Pilih Kelas Terlebih Dahulu</p>
              </div>
            ) : (
              <>
                {/* Toolbar - HANYA SEARCH */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Tombol dipindah ke bawah */}
                    </div>
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

                {/* Konten Data */}
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
                            {dataPerKelas.kelas.tahun_ajaran} • {dataPerKelas.kelas.is_aktif ? 'Aktif' : 'Non-Aktif'}
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
                      <div className="px-5 py-3" style={TH_GRAD}>
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-white" />
                          <h4 className="text-sm font-bold text-white">Mata Pelajaran Wajib</h4>
                        </div>
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
                                {selectedTahunAjaranAktif && (
                                  <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-32">Aksi</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {filterMapel(dataPerKelas.mapel_wajib).map((mp, idx) => (
                                <tr key={mp.id} className="transition-colors" style={{ borderBottom: '1px solid #fde0c8' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                  <td className="px-5 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                                  <td className="px-5 py-3 font-bold" style={{ color: '#c95b08' }}>{mp.kode_mapel}</td>
                                  <td className="px-5 py-3 font-semibold text-gray-800">{mp.nama_mapel}</td>
                                  <td className="px-5 py-3 text-gray-700">{mp.nama_guru}</td>
                                  {selectedTahunAjaranAktif && (
                                    <td className="px-5 py-3 text-center">
                                      <div className="flex justify-center gap-1">
                                        {/* Tombol Hapus dengan Text */}
                                        <button
                                          onClick={() => handleDelete(mp.id, mp.nama_mapel, mp.nama_guru)}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all"
                                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                          onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                          title="Hapus"
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

                    {/* ═══ MAPEL PILIHAN ═══ */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #fde0c8' }}>
                      <div className="px-5 py-3" style={TH_GRAD}>
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-white" />
                          <h4 className="text-sm font-bold text-white">Mata Pelajaran Pilihan</h4>
                        </div>
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
                                {selectedTahunAjaranAktif && (
                                  <th className="px-5 py-2.5 text-center text-xs font-bold text-gray-600 w-40">Aksi</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {filterMapel(dataPerKelas.mapel_pilihan).map((mp, idx) => (
                                <tr key={mp.id} className="transition-colors" style={{ borderBottom: '1px solid #fde0c8' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                  <td className="px-5 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                                  <td className="px-5 py-3 font-bold" style={{ color: '#c95b08' }}>{mp.kode_mapel}</td>
                                  <td className="px-5 py-3 font-semibold text-gray-800">{mp.nama_mapel}</td>
                                  <td className="px-5 py-3 text-gray-700">{mp.nama_guru}</td>
                                  {selectedTahunAjaranAktif && (
                                    <td className="px-5 py-3 text-center">
                                      <div className="flex justify-center gap-1">
                                        {/* Tombol Edit dengan Text */}
                                        <button
                                          onClick={() => openFormEdit(mp)}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all"
                                          style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                          onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                          title="Edit"
                                        >
                                          <Pencil size={12} />
                                          <span>Edit</span>
                                        </button>
                                        {/* Tombol Hapus dengan Text */}
                                        <button
                                          onClick={() => handleDelete(mp.id, mp.nama_mapel, mp.nama_guru)}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all"
                                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                          onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                                          title="Hapus"
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

                      {/* TOMBOL TAMBAH MAPEL PILIHAN */}
                      {selectedTahunAjaranAktif && (
                        <div className="px-5 py-4 bg-orange-50/30 border-t" style={{ borderColor: '#fde0c8' }}>
                          <button
                            onClick={openFormTambah}
                            className={btnPrimary.base}
                            style={btnPrimary.style}
                            onMouseEnter={btnPrimary.hover}
                            onMouseLeave={btnPrimary.leave}
                          >
                            <Plus size={16} /> Tambah Mapel Pilihan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}