/**
 * Nama File: data_guru_client.tsx
 * Fungsi: Komponen klien untuk mengelola data guru,
 *         mencakup fitur tambah, edit, detail, import Excel, filter,
 *         pencarian, dan pagination.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Eye, Pencil, Upload, X, Plus, Search, Filter, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─────────────────────────────────────────────
//  NOTIF MODAL SYSTEM (sama seperti tahun ajaran)
// ─────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
}

const MODAL_STYLES: Record<ModalType, {
  iconBg: string; ringColor: string; icon: React.ReactNode;
  btnClass: string; btnShadow: string;
}> = {
  success: {
    iconBg: 'bg-green-50', ringColor: 'ring-green-100',
    icon: <CheckCircle2 size={44} className="text-green-500" />,
    btnClass: 'bg-green-500 hover:bg-green-600 active:bg-green-700', btnShadow: 'shadow-green-200',
  },
  error: {
    iconBg: 'bg-red-50', ringColor: 'ring-red-100',
    icon: <AlertCircle size={44} className="text-red-500" />,
    btnClass: 'bg-red-500 hover:bg-red-600 active:bg-red-700', btnShadow: 'shadow-red-200',
  },
  warning: {
    iconBg: 'bg-orange-50', ringColor: 'ring-orange-100',
    icon: <ShieldAlert size={44} className="text-orange-500" />,
    btnClass: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700', btnShadow: 'shadow-orange-200',
  },
  network: {
    iconBg: 'bg-slate-100', ringColor: 'ring-slate-200',
    icon: <WifiOff size={44} className="text-slate-500" />,
    btnClass: 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800', btnShadow: 'shadow-slate-200',
  },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-5 animate-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
        <div className={`w-20 h-20 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ringColor} animate-pulse-once`}>
          {s.icon}
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`w-full ${s.btnClass} text-white font-semibold py-3 rounded-xl transition-all duration-150 shadow-lg ${s.btnShadow}`}>
          OK, Mengerti
        </button>
      </div>
    </div>
  );
};

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes pulse-once { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
    .animate-fadeIn     { animation: fadeIn      0.2s  ease; }
    .animate-scaleIn    { animation: scaleIn     0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .animate-pulse-once { animation: pulse-once  0.6s  ease 0.2s; }
  `}</style>
);

// ─────────────────────────────────────────────
//  INTERFACES
// ─────────────────────────────────────────────

interface Guru {
  id: number; nama: string; email?: string; niy?: string; nuptk?: string;
  tempat_lahir?: string; tanggal_lahir?: string; jenisKelamin?: string;
  alamat?: string; no_telepon?: string; statusGuru?: string; profileImage?: string; roles?: string[];
}

interface FormDataType {
  nama: string; niy: string; nuptk: string; tempatLahir: string; tanggalLahir: string;
  jenisKelamin: string; alamat: string; no_telepon: string; email: string;
  roles: string[]; statusGuru: string; confirmData: boolean;
}

const formatTanggalIndonesia = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][date.getMonth()];
  return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

// ─────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────

export default function DataGuruClient() {
  const formatGender = (g?: string | null) => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
    if (s === 'perempuan' || s === 'p') return 'Perempuan';
    if (s.includes('laki')) return 'Laki-laki';
    if (s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
  };

  const [guruList,      setGuruList]      = useState<Guru[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showDetail,    setShowDetail]    = useState(false);
  const [showTambah,    setShowTambah]    = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [editId,        setEditId]        = useState<number | null>(null);
  const [selectedGuru,  setSelectedGuru]  = useState<Guru | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [itemsPerPage,  setItemsPerPage]  = useState(10);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [showImport,    setShowImport]    = useState(false);
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const [importClosing, setImportClosing] = useState(false);
  const [filterClosing, setFilterClosing] = useState(false);
  const [showFilter,    setShowFilter]    = useState(false);
  const [filterValues,     setFilterValues]     = useState({ role: '', jenisKelamin: '', status: '' });
  const [tempFilterValues, setTempFilterValues] = useState({ role: '', jenisKelamin: '', status: '' });

  // ── popup modal state ──
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── fetch ──
  const fetchGuru = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
        return;
      }
      const res  = await fetch('http://localhost:5000/api/admin/guru', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        const validRoles = ['guru kelas', 'guru bidang studi'];
        setGuruList(Array.isArray(data.data) ? data.data.map((g: any) => {
          let s = 'aktif';
          if (typeof g.status === 'string') { s = g.status.trim().toLowerCase(); if (s !== 'aktif') s = 'nonaktif'; }
          let roles: string[] = [];
          if (g.roles) { const r = Array.isArray(g.roles) ? g.roles : [g.roles]; roles = r.map((x: any) => String(x).toLowerCase().trim()).filter((x: string) => validRoles.includes(x)); }
          return {
            id: g.id_user || g.id, nama: g.nama_lengkap || g.nama, email: g.email_sekolah || g.email,
            niy: g.niy, nuptk: g.nuptk, tempat_lahir: g.tempat_lahir || '', tanggal_lahir: g.tanggal_lahir || '',
            jenisKelamin: g.jenis_kelamin || '', alamat: g.alamat, no_telepon: g.no_telepon || '',
            statusGuru: s, roles, profileImage: g.profileImage || null,
          };
        }) : []);
      } else {
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data guru.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => { fetchGuru(); }, [fetchGuru]);

  const [formData, setFormData] = useState<FormDataType>({
    nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '',
    jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif', confirmData: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDetail = (guru: Guru) => { setSelectedGuru(guru); setShowDetail(true); };

  const handleEdit = (guru: Guru) => {
    setEditId(guru.id);
    setFormData({
      nama: guru.nama || '', email: guru.email || '', niy: guru.niy || '', nuptk: guru.nuptk || '',
      tempatLahir: guru.tempat_lahir || '', tanggalLahir: guru.tanggal_lahir || '',
      jenisKelamin: guru.jenisKelamin || '', alamat: guru.alamat || '', no_telepon: guru.no_telepon || '',
      roles: Array.isArray(guru.roles) ? guru.roles : [],
      statusGuru: guru.statusGuru === 'aktif' ? 'aktif' : 'nonaktif', confirmData: false,
    });
    setShowEdit(true);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (isEdit: boolean): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.nama?.trim()) ne.nama = 'Nama wajib diisi';
    if (!formData.jenisKelamin) ne.jenisKelamin = 'Pilih jenis kelamin';
    if (!formData.roles || formData.roles.length === 0) ne.roles = 'Pilih minimal satu role';
    if (!formData.tanggalLahir) {
      ne.tanggalLahir = 'Tanggal lahir wajib diisi';
    } else {
      const dob = new Date(formData.tanggalLahir);
      if (isNaN(dob.getTime())) {
        ne.tanggalLahir = 'Tanggal lahir tidak valid';
      } else if (dob > new Date()) {
        ne.tanggalLahir = 'Tanggal lahir tidak boleh di masa depan';
      } else {
        let age = new Date().getFullYear() - dob.getFullYear();
        const m = new Date().getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && new Date().getDate() < dob.getDate())) age--;
        if (age < 18) ne.tanggalLahir = 'Usia minimal 18 tahun';
      }
    }
    if (isEdit && (!formData.statusGuru || formData.statusGuru === '')) ne.statusGuru = 'Status wajib dipilih';
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
      const res = await fetch('http://localhost:5000/api/admin/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles,
          niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir,
          tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin,
          alamat: formData.alamat, no_telepon: formData.no_telepon,
        }),
      });
      if (res.ok) {
        setShowTambah(false);
        handleReset();
        await fetchGuru();
        showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data guru ${formData.nama} berhasil ditambahkan.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data guru.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  };

  const handleSubmitEdit = async () => {
    const originalData = guruList.find(g => g.id === editId);
    if (!originalData) return;
    const normalize = (str?: string | null) => (str || '').trim().toLowerCase();
    const hasChanged =
      formData.nama !== (originalData.nama || '') || formData.email !== (originalData.email || '') ||
      formData.niy !== (originalData.niy || '') || formData.nuptk !== (originalData.nuptk || '') ||
      formData.tempatLahir !== (originalData.tempat_lahir || '') || formData.tanggalLahir !== (originalData.tanggal_lahir || '') ||
      normalize(formData.jenisKelamin) !== normalize(originalData.jenisKelamin) ||
      formData.alamat !== (originalData.alamat || '') || formData.no_telepon !== (originalData.no_telepon || '') ||
      formData.statusGuru !== (originalData.statusGuru || 'aktif') ||
      JSON.stringify(formData.roles.sort()) !== JSON.stringify((originalData.roles || []).sort());
    if (!hasChanged) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
      return;
    }
    if (!validate(true)) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/guru/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles,
          niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir,
          tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin,
          alamat: formData.alamat, no_telepon: formData.no_telepon, status: formData.statusGuru,
        }),
      });
      if (res.ok) {
        setShowEdit(false);
        setEditId(null);
        handleReset();
        await fetchGuru();
        showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data guru ${formData.nama} berhasil diperbarui.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data guru.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  };

  const handleReset = () => {
    setFormData({ nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif', confirmData: false });
    setErrors({});
  };

  const handleImportExcel = async () => {
    if (!importFile) { showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu sebelum mengimpor.' }); return; }
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/guru/import', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const result = await res.json();
      if (res.ok) {
        setShowImport(false);
        setImportFile(null);
        await fetchGuru();
        showModal({ type: 'success', title: 'Import Berhasil!', message: `Berhasil mengimpor ${result.total} data guru.` });
      } else {
        showModal({ type: 'error', title: 'Import Gagal', message: result.message || 'Terjadi kesalahan saat mengimpor data guru.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  };

  // ── filter & pagination ──
  const filteredGuru = guruList.filter((guru) => {
    const query = searchQuery.toLowerCase().trim();
    const ms = !query || guru.nama?.toLowerCase().includes(query) || guru.email?.toLowerCase().includes(query) ||
      guru.niy?.includes(query) || guru.nuptk?.includes(query) ||
      guru.tempat_lahir?.toLowerCase().includes(query) || guru.no_telepon?.includes(query);
    const mr  = !filterValues.role || (guru.roles && guru.roles.includes(filterValues.role));
    const mj  = !filterValues.jenisKelamin || guru.jenisKelamin?.toLowerCase() === filterValues.jenisKelamin.toLowerCase();
    const ms2 = !filterValues.status || guru.statusGuru?.toLowerCase() === filterValues.status.toLowerCase();
    return ms && mr && mj && ms2;
  });
  const totalPages  = Math.ceil(filteredGuru.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const endIndex    = startIndex + itemsPerPage;
  const currentGuru = filteredGuru.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages: ReactNode[] = [];
    const btn = (key: any, label: any, active = false, onClick: () => void) =>
      <button key={key} onClick={onClick} className={`px-3 py-1 border border-gray-300 rounded hover:bg-orange-50 transition ${active ? 'text-white' : ''}`}
        style={active ? { background: 'linear-gradient(135deg,#ea580c,#f97316)' } : {}}>{label}</button>;
    if (currentPage > 1) pages.push(btn('prev', '«', false, () => setCurrentPage(p => p - 1)));
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(btn(i, i, currentPage === i, () => setCurrentPage(i)));
    } else {
      pages.push(btn(1, 1, currentPage === 1, () => setCurrentPage(1)));
      if (currentPage > 3) pages.push(<span key="d1" className="px-2 text-gray-600">...</span>);
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(btn(i, i, currentPage === i, () => setCurrentPage(i)));
      if (currentPage < totalPages - 2) pages.push(<span key="d2" className="px-2 text-gray-600">...</span>);
      pages.push(btn(totalPages, totalPages, currentPage === totalPages, () => setCurrentPage(totalPages)));
    }
    if (currentPage < totalPages) pages.push(btn('next', '»', false, () => setCurrentPage(p => p + 1)));
    return pages;
  };

  const resetFilter      = () => { const e = { role: '', jenisKelamin: '', status: '' }; setFilterValues(e); setTempFilterValues(e); };
  const openFilterModal  = () => { setTempFilterValues(filterValues); setShowFilter(true); };
  const applyFilter      = () => { setFilterValues(tempFilterValues); setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };
  const closeFilterModal = () => { setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };

  const focusClass = 'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400';
  const cardStyle  = { background: 'linear-gradient(160deg,#ffffff 0%,#fff7ed 60%,#ffedd5 100%)', border: '1px solid rgba(251,146,60,0.2)' };
  const bgGradient = { background: 'linear-gradient(160deg,#fff7ed 0%,#ffedd5 50%,#fed7aa 100%)' };

  // ── Render Form ──
  const renderForm = (isEdit: boolean) => (
    <>
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      <GlobalStyles />
      <div className="flex-1 p-4 sm:p-6 min-h-screen" style={bgGradient}>
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Data Guru</h1>
          <div className="rounded-2xl shadow-sm p-6" style={cardStyle}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}</h2>
              <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <hr className="mb-5 border-orange-100" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama <span className="text-red-500">*</span></label>
                <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap"
                  className={`w-full border ${errors.nama ? 'border-red-500' : 'border-orange-200'} rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
                {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Akun</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="contoh@sekolah.sch.id"
                  className={`w-full border border-orange-200 rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NIY</label>
                <input type="text" name="niy" value={formData.niy} onChange={handleInputChange} placeholder="Nomor Induk Yayasan"
                  className={`w-full border border-orange-200 rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NUPTK</label>
                <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange} placeholder="Nomor Unik Pendidik"
                  className={`w-full border border-orange-200 rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempat Lahir</label>
                <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Misal: Jakarta"
                  className={`w-full border border-orange-200 rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir <span className="text-red-500">*</span></label>
                <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange}
                  className={`w-full border ${errors.tanggalLahir ? 'border-red-500' : 'border-orange-200'} rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
                {errors.tanggalLahir && <p className="text-red-500 text-xs mt-1">{errors.tanggalLahir}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Kelamin <span className="text-red-500">*</span></label>
                <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange}
                  className={`w-full border ${errors.jenisKelamin ? 'border-red-500' : 'border-orange-200'} rounded-lg px-4 py-2.5 bg-white ${focusClass}`}>
                  <option value="">-- Pilih --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
                {errors.jenisKelamin && <p className="text-red-500 text-xs mt-1">{errors.jenisKelamin}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telepon</label>
                <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange} placeholder="misal: 081234567890"
                  className={`w-full border border-orange-200 rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat</label>
                <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Masukkan alamat lengkap" rows={2}
                  className={`w-full border border-orange-200 rounded-lg px-4 py-2.5 bg-white ${focusClass}`} />
              </div>
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Role (Hak Akses) <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {[{ key: 'guru kelas', label: 'Guru Kelas' }, { key: 'guru bidang studi', label: 'Guru Bidang Studi' }].map(role => {
                        const active = formData.roles.includes(role.key);
                        return (
                          <button key={role.key} type="button"
                            onClick={() => { setFormData(p => ({ ...p, roles: p.roles.includes(role.key) ? p.roles.filter(r => r !== role.key) : [...p.roles, role.key] })); setErrors(p => ({ ...p, roles: '' })); }}
                            className="px-3 py-1.5 rounded-full text-sm font-medium transition"
                            style={active ? { background: 'linear-gradient(135deg,#ea580c,#f97316)', color: 'white' } : { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}>
                            {role.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.roles && <p className="text-red-500 text-xs mt-1">{errors.roles}</p>}
                  </div>
                  {isEdit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status Guru <span className="text-red-500">*</span></label>
                      <select name="statusGuru" value={formData.statusGuru} onChange={handleInputChange}
                        className={`w-full border ${errors.statusGuru ? 'border-red-500' : 'border-orange-200'} rounded-lg px-4 py-2.5 bg-white ${focusClass}`}>
                        <option value="">-- Pilih --</option>
                        <option value="aktif">Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                      </select>
                      {errors.statusGuru && <p className="text-red-500 text-xs mt-1">{errors.statusGuru}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="confirmData" checked={formData.confirmData} onChange={handleInputChange} className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
                <span className="text-sm text-gray-700">Saya yakin data yang diisi sudah benar</span>
              </label>
              {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
            </div>
            <hr className="mt-6 mb-5 border-orange-100" />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium">Batal</button>
              <button onClick={handleReset}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium">Reset</button>
              <button onClick={isEdit ? handleSubmitEdit : handleSubmitTambah}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium">
                {isEdit ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (showTambah) return renderForm(false);
  if (showEdit)   return renderForm(true);

  // ── Halaman Utama ──
  return (
    <>
      {modal && <NotifModal modal={modal} onClose={closeModal} />}
      <GlobalStyles />

      <div className="flex-1 min-h-screen" style={bgGradient}>
        <div className="w-full p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Guru</h1>

          <div className="rounded-2xl shadow-sm mb-6" style={cardStyle}>
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <button onClick={() => setShowTambah(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Plus size={20} /> Tambah Guru
                </button>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-gray-700 text-sm">Tampilkan</span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 hover:border-orange-400 transition">
                      <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                    </select>
                    <span className="text-gray-700 text-sm">data</span>
                  </div>
                  <div className="relative flex-1 min-w-[200px] sm:min-w-[240px] max-w-[400px]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-gray-400" /></div>
                    <input type="text" placeholder="Pencarian" value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-white border border-orange-200 rounded-xl pl-10 pr-10 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 hover:border-orange-400 transition" />
                    {searchQuery && (
                      <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button onClick={openFilterModal} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Filter size={20} /> Filter Guru
                  </button>
                  <button onClick={() => setShowImport(true)} className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Upload size={20} /> Import Guru
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border-2 shadow-sm" style={{ borderColor: '#f97316' }}>
                <table className="w-full min-w-[600px] table-auto text-sm">
                  <thead>
                    <tr>
                      {['No.', 'Nama', 'Jenis Kelamin', 'NIY', 'NUPTK', 'Status', 'Aksi'].map((h) => (
                        <th key={h} className="px-4 py-3 text-center sticky top-0 z-10 font-semibold text-white border-b-2 border-orange-700"
                          style={{ background: 'linear-gradient(135deg,#ea580c 0%,#f97316 100%)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                    ) : currentGuru.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data guru</td></tr>
                    ) : currentGuru.map((guru, index) => (
                      <tr key={guru.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-orange-50 transition`}>
                        <td className="px-4 py-3 text-center align-middle font-medium">{startIndex + index + 1}</td>
                        <td className="px-4 py-3 align-middle font-medium">{guru.nama}</td>
                        <td className="px-4 py-3 text-center align-middle">{formatGender(guru.jenisKelamin)}</td>
                        <td className="px-4 py-3 text-center align-middle">{guru.niy || '-'}</td>
                        <td className="px-4 py-3 text-center align-middle">{guru.nuptk || '-'}</td>
                        <td className="px-4 py-3 text-center align-middle">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${guru.statusGuru === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {guru.statusGuru?.toUpperCase() || 'AKTIF'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                          <div className="flex justify-center gap-1 sm:gap-2">
                            <button onClick={() => handleDetail(guru)} className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm">
                              <Eye size={16} /><span className="hidden sm:inline">Detail</span>
                            </button>
                            <button onClick={() => handleEdit(guru)} className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm">
                              <Pencil size={16} /><span className="hidden sm:inline">Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
                <div className="text-sm text-gray-600">Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredGuru.length)} dari {filteredGuru.length} data</div>
                <div className="flex gap-1 flex-wrap justify-center">{renderPagination()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Detail ── */}
        {showDetail && selectedGuru && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
            onClick={(e) => { if (e.target === e.currentTarget) { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); } }}>
            <div className="absolute inset-0 bg-gray-900/70" />
            <div className={`relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Detail Guru</h2>
                <button onClick={() => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); }} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-3 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#fed7aa,#fdba74)' }}>
                    {selectedGuru.profileImage ? (
                      <img src={`http://localhost:5000${selectedGuru.profileImage.startsWith('/') ? selectedGuru.profileImage : '/' + selectedGuru.profileImage}`}
                        alt="Foto Profil" className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span className="text-orange-700 text-xl sm:text-2xl font-bold">
                        {selectedGuru.nama.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '??'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 text-center break-words">{selectedGuru.nama}</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {[
                    { label: 'Status', value: <span className={`inline-block px-3 py-1 rounded text-xs sm:text-sm font-medium ${selectedGuru.statusGuru === 'aktif' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{selectedGuru.statusGuru?.toUpperCase() || 'AKTIF'}</span> },
                    { label: 'NIY',          value: selectedGuru.niy || '-' },
                    { label: 'NUPTK',        value: selectedGuru.nuptk || '-' },
                    { label: 'Jenis Kelamin',value: formatGender(selectedGuru.jenisKelamin) },
                    { label: 'Tempat Lahir', value: selectedGuru.tempat_lahir || '-' },
                    { label: 'Tanggal Lahir',value: formatTanggalIndonesia(selectedGuru.tanggal_lahir) },
                    { label: 'Telepon',      value: selectedGuru.no_telepon || '-' },
                    { label: 'Alamat',       value: selectedGuru.alamat || '-' },
                    { label: 'Email',        value: selectedGuru.email || '-' },
                    { label: 'Hak Akses',    value: selectedGuru.roles?.length ? selectedGuru.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ') : '-' },
                  ].map((item, i) => (
                    <div key={i} className="grid grid-cols-3 sm:grid-cols-4 gap-2 border-b border-orange-100 pb-2">
                      <span className="font-semibold text-xs sm:text-sm">{item.label}</span>
                      <span className="text-xs sm:text-sm">:</span>
                      <span className="text-xs sm:text-sm col-span-1 sm:col-span-2 break-words">{item.value}</span>
                    </div>
                  ))}
                </div>
                <hr className="my-5 border-orange-100" />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button onClick={() => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); }}
                    className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-xs sm:text-sm font-medium">Tutup</button>
                  <button onClick={() => { handleEdit(selectedGuru); setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); }}
                    className="px-4 sm:px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-lg transition text-xs sm:text-sm font-medium">Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Import ── */}
        {showImport && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
            onClick={(e) => { if (e.target === e.currentTarget) { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); } }}>
            <div className="absolute inset-0 bg-gray-900/70" />
            <div className={`relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Import Data Guru</h2>
                <button onClick={() => { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); }} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-sm text-gray-600 mb-4">Format file: <strong>.xlsx</strong> atau <strong>.xls</strong></p>
                <div className="mb-4">
                  <a href="http://localhost:5000/templates/template_import_guru.xlsx" download className="text-sm hover:underline flex items-center gap-1" style={{ color: '#ea580c' }}>
                    📥 Unduh template Excel
                  </a>
                  <p className="text-xs text-gray-500 mt-1">Isi sesuai contoh, lalu simpan sebagai <strong>.xlsx</strong></p>
                </div>
                <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer"
                  style={{ border: '2px dashed rgba(251,146,60,0.5)', background: 'rgba(255,247,237,0.6)' }}>
                  <div className="flex flex-col items-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2" style={{ color: '#f97316' }} />
                    <p className="text-sm text-gray-600">
                      {importFile ? <span className="font-medium" style={{ color: '#ea580c' }}>{importFile.name}</span> : 'Klik untuk pilih file'}
                    </p>
                  </div>
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleImportExcel} disabled={!importFile}
                    className={`flex-1 py-2.5 rounded-xl font-medium transition text-sm ${!importFile ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-white'}`}
                    style={importFile ? { background: 'linear-gradient(135deg,#ea580c,#f97316)' } : {}}>
                    Import
                  </button>
                  <button onClick={() => { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); }}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition text-sm">Batal</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Filter ── */}
        {showFilter && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'} p-3 sm:p-4`}
            onClick={(e) => { if (e.target === e.currentTarget) closeFilterModal(); }}>
            <div className="absolute inset-0 bg-gray-900/70" />
            <div className={`relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Filter Guru</h2>
                <button onClick={closeFilterModal} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {[
                  { label: 'Role', name: 'role', options: [{ v: '', l: 'Semua Role' }, { v: 'guru kelas', l: 'Guru Kelas' }, { v: 'guru bidang studi', l: 'Guru Bidang Studi' }] },
                  { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua Jenis Kelamin' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                  { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }] },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <select value={(tempFilterValues as any)[f.name]} onChange={(e) => setTempFilterValues(p => ({ ...p, [f.name]: e.target.value }))}
                      className={`w-full border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white ${focusClass}`}>
                      {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                <hr className="border-orange-100" />
                <div className="flex gap-3">
                  <button onClick={resetFilter} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl hover:bg-gray-100 transition text-sm">Reset</button>
                  <button onClick={applyFilter} className="flex-1 text-white py-2 rounded-xl transition text-sm" style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>Terapkan</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
