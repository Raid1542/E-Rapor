'use client';

import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import { Eye, Pencil, Upload, X, Plus, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes pe-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pe-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes pe-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .pe-fadeIn  { animation: pe-fadeIn  0.2s ease; }
    .pe-scaleIn { animation: pe-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .pe-pulse   { animation: pe-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
  success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
  error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pe-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 pe-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} pe-pulse`}>{s.icon}</div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
      </div>
    </div>
  );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
  base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface PembinaEkskul {
  id: number;
  nama: string;
  niy?: string;
  nuptk?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenisKelamin?: string;
  alamat?: string;
  no_telepon?: string;
  statusPembina?: string;
  profileImage?: string;
}

interface FormDataType {
  nama: string;
  niy: string;
  nuptk: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  no_telepon: string;
  statusPembina: string;
  confirmData: boolean;
}

const formatTanggalIndonesia = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][date.getMonth()];
  return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

// ─── SECONDARY BUTTON ─────────────────────────────────────────────────────────

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
  >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataPembinaEkskulClient() {
  const formatGender = (g?: string | null) => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
    if (s === 'perempuan' || s === 'p') return 'Perempuan';
    if (s.includes('laki')) return 'Laki-laki';
    if (s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
  };

  const [pembinaList,   setPembinaList]   = useState<PembinaEkskul[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showDetail,    setShowDetail]    = useState(false);
  const [showTambah,    setShowTambah]    = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [editId,        setEditId]        = useState<number | null>(null);
  const [selectedPembina, setSelectedPembina] = useState<PembinaEkskul | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [itemsPerPage,  setItemsPerPage]  = useState(10);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [showImport,    setShowImport]    = useState(false);
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const [importClosing, setImportClosing] = useState(false);

  const [modal,     setModal]     = useState<ModalConfig | null>(null);
  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchPembina = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' }); return; }
      const res  = await fetch('http://localhost:5000/api/admin/pembina-ekskul', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setPembinaList(Array.isArray(data.data) ? data.data.map((p: any) => {
          let s = 'aktif';
          if (typeof p.status === 'string') { s = p.status.trim().toLowerCase(); if (s !== 'aktif') s = 'nonaktif'; }
          return {
            id: p.id_user || p.id, nama: p.nama_lengkap || p.nama,
            niy: p.niy, nuptk: p.nuptk, tempat_lahir: p.tempat_lahir || '',
            tanggal_lahir: p.tanggal_lahir || '', jenisKelamin: p.jenis_kelamin || '',
            alamat: p.alamat || '', no_telepon: p.no_telepon || '',
            statusPembina: s, profileImage: p.profileImage || null,
          };
        }) : []);
      } else {
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data pembina.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    } finally { setLoading(false); }
  }, [showModal]);

  useEffect(() => { fetchPembina(); }, [fetchPembina]);

  // ── form state ─────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<FormDataType>({
    nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '',
    jenisKelamin: '', alamat: '', no_telepon: '', statusPembina: 'aktif', confirmData: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDetail = (pembina: PembinaEkskul) => { setSelectedPembina(pembina); setShowDetail(true); };

  const handleEdit = (pembina: PembinaEkskul) => {
    setEditId(pembina.id);
    setFormData({
      nama: pembina.nama || '', niy: pembina.niy || '', nuptk: pembina.nuptk || '',
      tempatLahir: pembina.tempat_lahir || '', tanggalLahir: pembina.tanggal_lahir || '',
      jenisKelamin: pembina.jenisKelamin || '', alamat: pembina.alamat || '',
      no_telepon: pembina.no_telepon || '',
      statusPembina: pembina.statusPembina === 'aktif' ? 'aktif' : 'nonaktif', confirmData: false,
    });
    setShowEdit(true);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validate = (isEdit: boolean): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.nama?.trim()) ne.nama = 'Nama wajib diisi';
    if (!formData.jenisKelamin) ne.jenisKelamin = 'Pilih jenis kelamin';
    if (!formData.tanggalLahir) {
      ne.tanggalLahir = 'Tanggal lahir wajib diisi';
    } else {
      const dob = new Date(formData.tanggalLahir);
      if (isNaN(dob.getTime())) { ne.tanggalLahir = 'Tanggal lahir tidak valid'; }
      else if (dob > new Date()) { ne.tanggalLahir = 'Tanggal lahir tidak boleh di masa depan'; }
      else {
        let age = new Date().getFullYear() - dob.getFullYear();
        const m = new Date().getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && new Date().getDate() < dob.getDate())) age--;
        if (age < 18) ne.tanggalLahir = 'Usia minimal 18 tahun';
      }
    }
    if (isEdit && (!formData.statusPembina || formData.statusPembina === '')) ne.statusPembina = 'Status wajib dipilih';
    if (!formData.confirmData) ne.confirmData = 'Harap konfirmasi data sebelum melanjutkan';
    setErrors(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
      return false;
    }
    return true;
  };

  const handleSubmitTambah = async () => {
    if (!validate(false)) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    try {
      const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_lengkap: formData.nama, niy: formData.niy, nuptk: formData.nuptk,
          tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat, no_telepon: formData.no_telepon,
        }),
      });
      if (res.ok) {
        setShowTambah(false); handleReset(); await fetchPembina();
        showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data pembina ${formData.nama} berhasil ditambahkan.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data pembina.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleSubmitEdit = async () => {
    const originalData = pembinaList.find(p => p.id === editId);
    if (!originalData) return;
    const normalize = (str?: string | null) => (str || '').trim().toLowerCase();
    const hasChanged =
      formData.nama !== (originalData.nama || '') ||
      formData.niy !== (originalData.niy || '') ||
      formData.nuptk !== (originalData.nuptk || '') ||
      formData.tempatLahir !== (originalData.tempat_lahir || '') ||
      formData.tanggalLahir !== (originalData.tanggal_lahir || '') ||
      normalize(formData.jenisKelamin) !== normalize(originalData.jenisKelamin) ||
      formData.alamat !== (originalData.alamat || '') ||
      formData.no_telepon !== (originalData.no_telepon || '') ||
      formData.statusPembina !== (originalData.statusPembina || 'aktif');
    if (!hasChanged) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' }); return; }
    if (!validate(true)) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/pembina-ekskul/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_lengkap: formData.nama, niy: formData.niy, nuptk: formData.nuptk,
          tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat,
          no_telepon: formData.no_telepon, status: formData.statusPembina,
        }),
      });
      if (res.ok) {
        setShowEdit(false); setEditId(null); handleReset(); await fetchPembina();
        showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data pembina ${formData.nama} berhasil diperbarui.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data pembina.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleReset = () => {
    setFormData({ nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '', alamat: '', no_telepon: '', statusPembina: 'aktif', confirmData: false });
    setErrors({});
  };

  const handleImportExcel = async () => {
    if (!importFile) { showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' }); return; }
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul/import', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const result = await res.json();
      if (res.ok) {
        setShowImport(false); setImportFile(null); await fetchPembina();
        showModal({ type: 'success', title: 'Import Berhasil!', message: result.message || `Berhasil mengimport ${result.total} data pembina.` });
      } else {
        showModal({ type: 'error', title: 'Import Gagal', message: result.message || 'Terjadi kesalahan saat mengimpor data.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  // ── filter & pagination ────────────────────────────────────────────────────

  const filteredPembina = pembinaList.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return !q || p.nama?.toLowerCase().includes(q) || p.niy?.includes(q) ||
      p.nuptk?.includes(q) || p.tempat_lahir?.toLowerCase().includes(q) || p.no_telepon?.includes(q);
  });

  const totalPages   = Math.max(1, Math.ceil(filteredPembina.length / itemsPerPage));
  const startIndex   = (currentPage - 1) * itemsPerPage;
  const endIndex     = startIndex + itemsPerPage;
  const currentPembina = filteredPembina.slice(startIndex, endIndex);

  const closeDetail = () => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); };
  const closeImport = () => { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); };

  const renderPagination = () => {
    const pages: ReactNode[] = [];
    const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
    const btnActive   = "text-white border-orange-500";
    const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";
    pages.push(<button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>);
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
      if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>); }
      else { pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}>{p}</button>); }
    });
    pages.push(<button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>);
    return pages;
  };

  // ── FORM PAGE ──────────────────────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembina Ekstrakurikuler</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data pembina kegiatan ekstrakurikuler</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Data Pembina' : 'Tambah Data Pembina'}</h2>
          <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nama */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
            <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className={errors.nama ? inputErrCls : inputCls} />
            {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
          </div>
          {/* NIY */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>NIY</label>
            <input type="text" name="niy" value={formData.niy} onChange={handleInputChange} placeholder="Nomor Induk Yayasan" className={inputCls} />
          </div>
          {/* NUPTK */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>NUPTK</label>
            <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange} placeholder="Nomor Unik Pendidik" className={inputCls} />
          </div>
          {/* Tempat Lahir */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Tempat Lahir</label>
            <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Misal: Jakarta" className={inputCls} />
          </div>
          {/* Tanggal Lahir */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Tanggal Lahir <span className="text-red-500">*</span></label>
            <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className={errors.tanggalLahir ? inputErrCls : inputCls} />
            {errors.tanggalLahir && <p className="text-red-500 text-xs">{errors.tanggalLahir}</p>}
          </div>
          {/* Jenis Kelamin */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
            <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange} className={errors.jenisKelamin ? inputErrCls : inputCls}>
              <option value="">-- Pilih --</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
            {errors.jenisKelamin && <p className="text-red-500 text-xs">{errors.jenisKelamin}</p>}
          </div>
          {/* Telepon */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Telepon</label>
            <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange} placeholder="misal: 081234567890" className={inputCls} />
          </div>
          {/* Status (edit only) */}
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls} style={labelColor}>Status Pembina <span className="text-red-500">*</span></label>
              <select name="statusPembina" value={formData.statusPembina} onChange={handleInputChange} className={errors.statusPembina ? inputErrCls : inputCls}>
                <option value="">-- Pilih --</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
              {errors.statusPembina && <p className="text-red-500 text-xs">{errors.statusPembina}</p>}
            </div>
          )}
          {/* Alamat */}
          <div className={`flex flex-col gap-1.5 ${isEdit ? 'md:col-span-1' : 'md:col-span-2'}`}>
            <label className={labelCls} style={labelColor}>Alamat</label>
            <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Masukkan alamat lengkap" rows={2} className={inputCls} />
          </div>
        </div>

        {/* Konfirmasi */}
        <div className="px-6 pb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" name="confirmData" checked={formData.confirmData}
              onChange={e => setFormData(p => ({ ...p, confirmData: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
            <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Saya yakin data yang diisi sudah benar</span>
          </label>
          {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
        </div>

        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <BtnSecondary onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>Batal</BtnSecondary>
          <BtnSecondary onClick={handleReset}>Reset</BtnSecondary>
          <button onClick={isEdit ? handleSubmitEdit : handleSubmitTambah}
            className={btnPrimary.base} style={btnPrimary.style}
            onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
            {isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );

  if (showTambah) return renderForm(false);
  if (showEdit)   return renderForm(true);

  // ── HALAMAN UTAMA ──────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Pembina Ekstrakurikuler</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data pembina kegiatan ekstrakurikuler</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        {/* Toolbar */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setShowTambah(true)} className={btnPrimary.base} style={btnPrimary.style} onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
              <Plus size={16} /> Tambah Pembina
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                  <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                </select>
                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
              </div>
              <div className="relative min-w-[200px] sm:min-w-[220px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                </div>
                <input type="text" placeholder="Cari pembina..." value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                <Upload size={15} /> Import Pembina
              </button>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
            Menampilkan {filteredPembina.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredPembina.length)} dari {filteredPembina.length} data
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr style={TH_GRAD}>
                {['No.', 'Nama', 'Jenis Kelamin', 'NIY', 'NUPTK', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                    Memuat data...
                  </div>
                </td></tr>
              ) : currentPembina.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Tidak ada data pembina ekstrakurikuler</td></tr>
              ) : currentPembina.map((pembina, index) => (
                <tr key={pembina.id} className="transition-colors"
                  style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                  onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                  <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                  <td className="px-5 py-3.5 font-bold text-gray-800">{pembina.nama}</td>
                  <td className="px-5 py-3.5 text-center text-gray-700">{formatGender(pembina.jenisKelamin)}</td>
                  <td className="px-5 py-3.5 text-center text-gray-600">{pembina.niy || '-'}</td>
                  <td className="px-5 py-3.5 text-center text-gray-600">{pembina.nuptk || '-'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {pembina.statusPembina === 'aktif' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />AKTIF
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />NONAKTIF
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center whitespace-nowrap">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleDetail(pembina)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                        <Eye size={13} /> Detail
                      </button>
                      <button onClick={() => handleEdit(pembina)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                        <Pencil size={13} /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
          <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
          <div className="flex items-center gap-1">{renderPagination()}</div>
        </div>
      </div>

      {/* ── Modal Detail ─────────────────────────────────────────────────── */}
      {showDetail && selectedPembina && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={CARD_STYLE}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">Detail Pembina</h2>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#fde0c8,#f5a623)' }}>
                  {selectedPembina.profileImage ? (
                    <img src={`http://localhost:5000${selectedPembina.profileImage.startsWith('/') ? selectedPembina.profileImage : '/' + selectedPembina.profileImage}`}
                      alt="Foto Profil" className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                      {selectedPembina.nama.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '??'}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{selectedPembina.nama}</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Status', value: (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                      style={selectedPembina.statusPembina === 'aktif'
                        ? { background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }
                        : { background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedPembina.statusPembina === 'aktif' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {selectedPembina.statusPembina?.toUpperCase() || 'AKTIF'}
                    </span>
                  )},
                  { label: 'NIY',          value: selectedPembina.niy || '-' },
                  { label: 'NUPTK',        value: selectedPembina.nuptk || '-' },
                  { label: 'Jenis Kelamin',value: formatGender(selectedPembina.jenisKelamin) },
                  { label: 'Tempat Lahir', value: selectedPembina.tempat_lahir || '-' },
                  { label: 'Tanggal Lahir',value: formatTanggalIndonesia(selectedPembina.tanggal_lahir) },
                  { label: 'Telepon',      value: selectedPembina.no_telepon || '-' },
                  { label: 'Alamat',       value: selectedPembina.alamat || '-' },
                ].map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 pb-2.5" style={{ borderBottom: '1px solid #fde0c8' }}>
                    <span className="text-xs font-semibold col-span-1" style={{ color: '#7a3a0a' }}>{item.label}</span>
                    <span className="text-xs text-gray-400">:</span>
                    <span className="text-xs text-gray-700 col-span-2 break-words">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                <button onClick={() => { handleEdit(selectedPembina); closeDetail(); }}
                  className={btnPrimary.base} style={btnPrimary.style}
                  onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Import ─────────────────────────────────────────────────── */}
      {showImport && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeImport(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={CARD_STYLE}>
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">Import Data Pembina</h2>
              <button onClick={closeImport} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm mb-3" style={{ color: '#7a3a0a' }}>Format file: <strong>.xlsx</strong> atau <strong>.xls</strong></p>
              <div className="mb-4">
                <a href="http://localhost:5000/templates/template_import_pembina_ekskul.xlsx" download
                  className="text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: '#e8690a' }}>
                  📥 Unduh template Excel
                </a>
                <p className="text-xs text-gray-400 mt-1">Isi sesuai contoh, lalu simpan sebagai <strong>.xlsx</strong></p>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors"
                style={{ border: '2px dashed #fde0c8', background: '#fffaf6' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fffaf6')}>
                <Upload className="w-8 h-8 mb-2" style={{ color: '#e8690a' }} />
                <p className="text-sm">
                  {importFile ? <span className="font-semibold" style={{ color: '#c95b08' }}>{importFile.name}</span> : <span className="text-gray-400">Klik untuk pilih file</span>}
                </p>
                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <div className="flex gap-3 mt-5">
                <button onClick={handleImportExcel} disabled={!importFile}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${!importFile ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: importFile ? '0 3px 10px rgba(232,105,10,0.25)' : 'none' }}>
                  Import
                </button>
                <BtnSecondary onClick={closeImport}>Batal</BtnSecondary>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}