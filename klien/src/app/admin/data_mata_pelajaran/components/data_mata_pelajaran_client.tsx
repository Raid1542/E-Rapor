/**
 * Nama File: data_mata_pelajaran_client.tsx
 * Fungsi: Komponen utama halaman Data Mata Pelajaran untuk admin.
 *         Menyediakan fitur CRUD (Create, Read, Update, Delete) mata pelajaran
 *         berdasarkan tahun ajaran aktif atau non-aktif, termasuk pencarian,
 *         paginasi, dan input urutan rapor hanya saat edit.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan DataGuruPage
 */

'use client';
import { useState, useEffect, useRef, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface MataPelajaran {
  id: number;
  kode_mapel: string;
  nama_mapel: string;
  jenis: string;
  kurikulum: string;
  tahun_ajaran_id: number;
  tahun_ajaran: string;
  semester: string;
  urutan_rapor: number | null;
}

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

interface FormDataType {
  kode_mapel: string;
  nama_mapel: string;
  jenis: string;
  kurikulum: string;
  urutan_rapor: string;
  confirmData: boolean;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes mp-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes mp-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes mp-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .mp-fadeIn  { animation: mp-fadeIn  0.2s ease; }
    .mp-scaleIn { animation: mp-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .mp-pulse   { animation: mp-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
  error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
  confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  const isConfirm = modal.type === 'confirm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mp-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 mp-scaleIn">
        {!isConfirm && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        )}
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} mp-pulse`}>{s.icon}</div>
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
            >Ya, Hapus</button>
          </div>
        ) : (
          <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
        )}
      </div>
    </div>
  );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG    = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
  base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
  >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataMataPelajaranPage() {
  const [mapelList,                setMapelList]                = useState<MataPelajaran[]>([]);
  const [loading,                  setLoading]                  = useState(true);
  const [showTambah,               setShowTambah]               = useState(false);
  const [showEdit,                 setShowEdit]                 = useState(false);
  const [editId,                   setEditId]                   = useState<number | null>(null);
  const [searchQuery,              setSearchQuery]              = useState('');
  const [itemsPerPage,             setItemsPerPage]             = useState(10);
  const [currentPage,              setCurrentPage]              = useState(1);
  const [tahunAjaranList,          setTahunAjaranList]          = useState<TahunAjaran[]>([]);
  const [selectedTahunAjaranId,    setSelectedTahunAjaranId]    = useState<number | null>(null);
  const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormDataType>({
    kode_mapel: '', nama_mapel: '', jenis: '', kurikulum: '', urutan_rapor: '', confirmData: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [modal,    setModal]    = useState<ModalConfig | null>(null);
  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  const initialFormDataRef = useRef<FormDataType | null>(null);

  // ── Fetch Tahun Ajaran ────────────────────────────────────────────────────

  const fetchTahunAjaran = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
        return;
      }
      const res  = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const options = data.data.map((ta: any) => ({
          id:          ta.id_tahun_ajaran,
          tahun_ajaran: ta.tahun_ajaran,
          semester:    (ta.semester || 'ganjil').toLowerCase(),
          is_aktif:    ta.status === 'aktif'
        }));
        setTahunAjaranList(options);
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  };

  // ── Fetch Mata Pelajaran ──────────────────────────────────────────────────

  const fetchMataPelajaran = async (tahunAjaranId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
        return;
      }
      const res  = await fetch(`http://localhost:5000/api/admin/mata-pelajaran?tahun_ajaran_id=${tahunAjaranId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const mapped = (Array.isArray(data.data) ? data.data : []).map((mp: any) => ({
          id:             mp.id_mata_pelajaran,
          kode_mapel:     mp.kode_mapel,
          nama_mapel:     mp.nama_mapel,
          jenis:          mp.jenis,
          kurikulum:      mp.kurikulum,
          tahun_ajaran_id: mp.tahun_ajaran_id,
          tahun_ajaran:   mp.tahun_ajaran,
          semester:       mp.semester,
          urutan_rapor:   mp.urutan_rapor
        }));
        setMapelList(mapped);
      } else {
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data mata pelajaran.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTahunAjaran(); }, []);

  // ── Form Handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'jenis') {
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase() }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validate = (): boolean => {
    const ne: Record<string, string> = {};
    const kodeMapel = formData.kode_mapel?.trim() || '';
    const namaMapel = formData.nama_mapel?.trim() || '';
    const kurikulum = formData.kurikulum?.trim()  || '';
    const jenis     = formData.jenis?.toLowerCase().trim() || '';

    if (!kodeMapel) ne.kode_mapel = 'Kode mapel wajib diisi';
    if (!namaMapel) ne.nama_mapel = 'Nama mapel wajib diisi';
    if (!kurikulum) ne.kurikulum  = 'Kurikulum wajib diisi';
    if (!jenis) {
      ne.jenis = 'Jenis mapel wajib dipilih';
    } else if (!['wajib', 'pilihan'].includes(jenis)) {
      ne.jenis = `Jenis tidak valid: "${jenis}". Harus "wajib" atau "pilihan"`;
    }
    if (!formData.confirmData) ne.confirmData = 'Harap konfirmasi data terlebih dahulu';

    setErrors(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
      return false;
    }
    return true;
  };

  const handleSubmitTambah = async () => {
    if (!validate()) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    if (!selectedTahunAjaranId) { showModal({ type: 'warning', title: 'Tahun Ajaran Belum Dipilih', message: 'Pilih tahun ajaran aktif terlebih dahulu.' }); return; }

    try {
      const payload = {
        kode_mapel:      formData.kode_mapel.trim().toUpperCase(),
        nama_mapel:      formData.nama_mapel.trim(),
        jenis:           formData.jenis.trim(),
        kurikulum:       formData.kurikulum.trim(),
        tahun_ajaran_id: selectedTahunAjaranId
      };
      const res = await fetch('http://localhost:5000/api/admin/mata-pelajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowTambah(false);
        handleReset();
        await fetchMataPelajaran(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Berhasil Ditambahkan!', message: `Mata pelajaran ${formData.nama_mapel} berhasil ditambahkan.` });
      } else {
        const err = await res.json();
        const isDuplicate = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
        showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan mata pelajaran.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  };

  const handleEdit = (mapel: MataPelajaran) => {
    const initialData: FormDataType = {
      kode_mapel:  mapel.kode_mapel,
      nama_mapel:  mapel.nama_mapel,
      jenis:       mapel.jenis.toLowerCase(),
      kurikulum:   mapel.kurikulum,
      urutan_rapor: mapel.urutan_rapor !== null ? String(mapel.urutan_rapor) : '',
      confirmData: false
    };
    setEditId(mapel.id);
    setFormData(initialData);
    initialFormDataRef.current = { ...initialData };
    setShowEdit(true);
  };

  const handleSubmitEdit = async () => {
    const initial = initialFormDataRef.current;
    const hasChanges =
      formData.kode_mapel  !== initial?.kode_mapel  ||
      formData.nama_mapel  !== initial?.nama_mapel  ||
      formData.jenis       !== initial?.jenis       ||
      formData.kurikulum   !== initial?.kurikulum   ||
      formData.urutan_rapor !== initial?.urutan_rapor;

    if (!hasChanges) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return;
    }
    if (!validate()) return;

    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    if (!editId) return;

    try {
      const urutan_rapor = formData.urutan_rapor.trim() ? Number(formData.urutan_rapor.trim()) : null;
      const payload = {
        kode_mapel:  formData.kode_mapel.trim().toUpperCase(),
        nama_mapel:  formData.nama_mapel.trim(),
        jenis:       formData.jenis.trim(),
        kurikulum:   formData.kurikulum.trim(),
        urutan_rapor
      };
      const res = await fetch(`http://localhost:5000/api/admin/mata-pelajaran/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowEdit(false);
        setEditId(null);
        handleReset();
        if (selectedTahunAjaranId) await fetchMataPelajaran(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Data Diperbarui!', message: `Mata pelajaran ${formData.nama_mapel} berhasil diperbarui.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui mata pelajaran.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  };

  const handleDelete = (id: number, namaMapel: string) => {
    showModal({
      type: 'confirm',
      title: 'Hapus Mata Pelajaran',
      message: `Apakah Anda yakin ingin menghapus mata pelajaran "${namaMapel}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
        try {
          const res = await fetch(`http://localhost:5000/api/admin/mata-pelajaran/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            if (selectedTahunAjaranId) await fetchMataPelajaran(selectedTahunAjaranId);
            showModal({ type: 'success', title: 'Berhasil Dihapus!', message: `Mata pelajaran "${namaMapel}" berhasil dihapus.` });
          } else {
            const err = await res.json();
            showModal({ type: 'error', title: 'Gagal Menghapus', message: err.message || 'Terjadi kesalahan saat menghapus mata pelajaran.' });
          }
        } catch {
          showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
      }
    });
  };

  const handleReset = () => {
    setFormData({ kode_mapel: '', nama_mapel: '', jenis: '', kurikulum: '', urutan_rapor: '', confirmData: false });
    setErrors({});
  };

  // ── Filtering & Pagination ────────────────────────────────────────────────

  const filteredMapel = mapelList.filter((mp) => {
    const query = searchQuery.toLowerCase().trim();
    return !query ||
      mp.kode_mapel.toLowerCase().includes(query) ||
      mp.nama_mapel.toLowerCase().includes(query) ||
      mp.jenis.toLowerCase().includes(query)      ||
      mp.kurikulum.toLowerCase().includes(query);
  });

  const totalPages  = Math.max(1, Math.ceil(filteredMapel.length / itemsPerPage));
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const endIndex    = startIndex + itemsPerPage;
  const currentMapel = filteredMapel.slice(startIndex, endIndex);

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

  // ── Render Form ───────────────────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Mata Pelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data mata pelajaran per tahun ajaran</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Data Mata Pelajaran' : 'Tambah Data Mata Pelajaran'}
          </h2>
          <button
            onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Kode Mapel */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Kode Mapel <span className="text-red-500">*</span></label>
            <input
              type="text" name="kode_mapel" value={formData.kode_mapel}
              onChange={handleInputChange} placeholder="Contoh: MAT, BINDO"
              className={errors.kode_mapel ? inputErrCls : inputCls}
            />
            {errors.kode_mapel && <p className="text-red-500 text-xs">{errors.kode_mapel}</p>}
          </div>

          {/* Nama Mata Pelajaran */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Nama Mata Pelajaran <span className="text-red-500">*</span></label>
            <input
              type="text" name="nama_mapel" value={formData.nama_mapel}
              onChange={handleInputChange} placeholder="Contoh: Matematika Wajib"
              className={errors.nama_mapel ? inputErrCls : inputCls}
            />
            {errors.nama_mapel && <p className="text-red-500 text-xs">{errors.nama_mapel}</p>}
          </div>

          {/* Jenis */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Jenis <span className="text-red-500">*</span></label>
            <select
              name="jenis" value={formData.jenis} onChange={handleInputChange}
              className={errors.jenis ? inputErrCls : inputCls}
            >
              <option value="">-- Pilih --</option>
              <option value="wajib">Wajib</option>
              <option value="pilihan">Pilihan</option>
            </select>
            {errors.jenis && <p className="text-red-500 text-xs">{errors.jenis}</p>}
          </div>

          {/* Kurikulum */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Kurikulum <span className="text-red-500">*</span></label>
            <input
              type="text" name="kurikulum" value={formData.kurikulum}
              onChange={handleInputChange} placeholder="Contoh: Kurikulum Merdeka"
              className={errors.kurikulum ? inputErrCls : inputCls}
            />
            {errors.kurikulum && <p className="text-red-500 text-xs">{errors.kurikulum}</p>}
          </div>

          {/* Urutan Rapor — hanya di form EDIT */}
          {isEdit && (
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className={labelCls} style={labelColor}>
                Urutan di Rapor
                <span className="ml-2 text-xs font-normal text-gray-400">(kosongkan = tampil di akhir)</span>
              </label>
              <input
                type="number" name="urutan_rapor" value={formData.urutan_rapor}
                onChange={handleInputChange} placeholder="Contoh: 1, 2, 3..."
                min="1" className={inputCls}
                style={{ maxWidth: '200px' }}
              />
            </div>
          )}
        </div>

        {/* Konfirmasi */}
        <div className="px-6 pb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox" name="confirmData" checked={formData.confirmData}
              onChange={handleInputChange} className="mt-0.5 w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
              Saya yakin data yang diisi sudah benar
            </span>
          </label>
          {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
        </div>

        {/* Form footer */}
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <BtnSecondary onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>Batal</BtnSecondary>
          <BtnSecondary onClick={handleReset}>Reset</BtnSecondary>
          <button
            onClick={isEdit ? handleSubmitEdit : handleSubmitTambah}
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

  if (showTambah) return renderForm(false);
  if (showEdit)   return renderForm(true);

  // ── HALAMAN UTAMA ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Mata Pelajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data mata pelajaran per tahun ajaran</p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

        {/* Toolbar */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>

          {/* Dropdown Tahun Ajaran */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedTahunAjaranId(null);
                  setSelectedTahunAjaranAktif(false);
                  setLoading(false);
                  setMapelList([]);
                  return;
                }
                const id = Number(value);
                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                setSelectedTahunAjaranId(id);
                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                setLoading(true);
                fetchMataPelajaran(id);
              }}
              className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 w-full md:w-72"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {tahunAjaranList.map(ta => {
                const semesterDisplay = ta.semester === 'ganjil' ? 'Ganjil' : 'Genap';
                return (
                  <option key={ta.id} value={ta.id}>
                    {ta.tahun_ajaran} {semesterDisplay} {ta.is_aktif ? '(Aktif)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedTahunAjaranId !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Kiri: Tambah + items per page */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedTahunAjaranAktif && (
                  <button
                    onClick={() => setShowTambah(true)}
                    className={btnPrimary.base}
                    style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover}
                    onMouseLeave={btnPrimary.leave}
                  >
                    <Plus size={16} /> Tambah Mapel
                  </button>
                )}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                </div>
              </div>

              {/* Kanan: Search */}
              <div className="relative min-w-[200px] sm:min-w-[220px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                </div>
                <input
                  type="text" placeholder="Cari mata pelajaran..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedTahunAjaranId !== null && (
            <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
              Menampilkan {filteredMapel.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredMapel.length)} dari {filteredMapel.length} data
            </p>
          )}
        </div>

        {/* Pilih Tahun Ajaran dulu */}
        {selectedTahunAjaranId === null ? (
          <div className="m-6 text-center py-10 rounded-2xl" style={{ background: '#fff7f0', border: '2px dashed #fde0c8' }}>
            <div className="text-4xl mb-3">📚</div>
            <p className="font-semibold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
            <p className="text-sm text-gray-400 mt-1">Data mata pelajaran akan muncul setelah tahun ajaran dipilih.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr style={TH_GRAD}>
                    {['No.', 'Kode', 'Mata Pelajaran', 'Jenis', 'Kurikulum', 'Urutan Rapor', 'Aksi'].map(h => (
                      <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                          Memuat data...
                        </div>
                      </td>
                    </tr>
                  ) : currentMapel.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Tidak ada data mata pelajaran</td>
                    </tr>
                  ) : (
                    currentMapel.map((mp, index) => (
                      <tr
                        key={mp.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                      >
                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                        <td className="px-5 py-3.5 text-center font-bold" style={{ color: '#c95b08' }}>{mp.kode_mapel}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-800">{mp.nama_mapel}</td>
                        <td className="px-5 py-3.5 text-center">
                          {mp.jenis === 'wajib' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                              style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                              Wajib
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                              style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                              Pilihan
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-600">{mp.kurikulum}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600">
                          {mp.urutan_rapor !== null ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                              style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                              {mp.urutan_rapor}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          {selectedTahunAjaranAktif ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(mp)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(mp.id, mp.nama_mapel)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                              >
                                <Trash2 size={13} /> Hapus
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredMapel.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex items-center gap-1">{renderPagination()}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}