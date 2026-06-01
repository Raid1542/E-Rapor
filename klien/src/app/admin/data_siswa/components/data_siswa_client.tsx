/**
 * Nama File: data_siswa_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data siswa oleh admin.
 *         Menyediakan fitur CRUD (Create, Read, Update, Delete), filter berdasarkan
 *         kelas, jenis kelamin, dan status, serta import data siswa via Excel.
 *         Hanya tahun ajaran aktif yang memungkinkan aksi edit, hapus, tambah, dan import.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401022
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan DataGuruPage
 * Update: Tambah filter kelas di header (di samping tahun ajaran)
 */

'use client';
import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import { Eye, Pencil, Upload, X, Plus, Search, Filter, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes ds-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ds-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ds-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .ds-fadeIn  { animation: ds-fadeIn  0.2s ease; }
    .ds-scaleIn { animation: ds-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ds-pulse   { animation: ds-pulse   0.6s ease 0.15s; }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ds-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ds-pulse`}>{s.icon}</div>
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
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ds-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ds-scaleIn">
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 ds-pulse">
        <ShieldAlert size={40} className="text-orange-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
          style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>Batal</button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-colors"
          style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>Ya, Lanjutkan</button>
      </div>
    </div>
  </div>
);

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

interface Siswa {
  id: number;
  nama: string;
  kelas: string;
  nis: string;
  nisn: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisKelamin: string;
  alamat?: string;
  fase: string;
  statusSiswa: string;
}

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

interface FormDataType {
  nama: string;
  kelas: string;
  nis: string;
  nisn: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  fase: string;
  statusSiswa: string;
  confirmData: boolean;
}

const formatTanggalIndonesia = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
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

export default function DataSiswaPage() {

  const [siswaList,                setWiswaList]               = useState<Siswa[]>([]);
  const [loading,                  setLoading]                 = useState(true);
  const [showDetail,               setShowDetail]              = useState(false);
  const [detailClosing,            setDetailClosing]           = useState(false);
  const [showTambah,               setShowTambah]              = useState(false);
  const [showEdit,                 setShowEdit]                = useState(false);
  const [editId,                   setEditId]                  = useState<number | null>(null);
  const [selectedSiswa,            setSelectedSiswa]           = useState<Siswa | null>(null);
  const [searchQuery,              setSearchQuery]             = useState('');
  const [itemsPerPage,             setItemsPerPage]            = useState(10);
  const [currentPage,              setCurrentPage]             = useState(1);
  const [showImport,               setShowImport]              = useState(false);
  const [importFile,               setImportFile]              = useState<File | null>(null);
  const [importClosing,            setImportClosing]           = useState(false);
  const [tahunAjaranList,          setTahunAjaranList]         = useState<TahunAjaran[]>([]);
  const [selectedTahunAjaranId,    setSelectedTahunAjaranId]   = useState<number | null>(null);
  const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);
  const [kelasList,                setKelasList]               = useState<{ id: number; nama: string; fase: string }[]>([]);
  const [kelasLoading,             setKelasLoading]            = useState(true);
  const [showFilter,               setShowFilter]              = useState(false);
  const [filterClosing,            setFilterClosing]           = useState(false);
  const [filterValues,             setFilterValues]            = useState({ kelas: '', jenisKelamin: '', status: '' });
  const [openedFilterValues,       setOpenedFilterValues]      = useState({ kelas: '', jenisKelamin: '', status: '' });

  // ── STATE BARU: filter kelas di header (di samping tahun ajaran) ────────────
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('');

  const [modal,      setModal]      = useState<ModalConfig | null>(null);
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showModal   = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal  = useCallback(() => setModal(null), []);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTahunAjaran = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
      const res  = await fetch('http://localhost:5000/api/admin/tahun-ajaran', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setTahunAjaranList(data.data.map((ta: any) => ({
          id: ta.id_tahun_ajaran, tahun_ajaran: ta.tahun_ajaran,
          semester: (ta.semester || 'ganjil').toLowerCase(), is_aktif: ta.status === 'aktif',
        })));
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const fetchKelasDropdown = async () => {
    setKelasLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setKelasLoading(false); return; }
      const res  = await fetch('http://localhost:5000/api/admin/dropdown', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) setKelasList(data.data);
    } catch (err) { console.error('Error fetch kelas dropdown:', err); }
    finally { setKelasLoading(false); }
  };

  useEffect(() => { fetchTahunAjaran(); fetchKelasDropdown(); }, []);

  const fetchSiswa = async (tahunAjaranId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
      const res  = await fetch(`http://localhost:5000/api/admin/siswa?tahun_ajaran_id=${tahunAjaranId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setWiswaList((Array.isArray(data.data) ? data.data : []).map((s: any) => ({
          id: s.id, nama: s.nama, kelas: s.kelas, nis: s.nis, nisn: s.nisn,
          tempatLahir: s.tempat_lahir, tanggalLahir: s.tanggal_lahir,
          jenisKelamin: s.jenis_kelamin, alamat: s.alamat, fase: s.fase, statusSiswa: s.status,
        })));
      } else {
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data siswa.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
    finally { setLoading(false); }
  };

  // ── form state ─────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<FormDataType>({
    nama: '', kelas: '', nis: '', nisn: '', tempatLahir: '', tanggalLahir: '',
    jenisKelamin: '', alamat: '', fase: '', statusSiswa: 'aktif', confirmData: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDetail = (siswa: Siswa) => { setSelectedSiswa(siswa); setShowDetail(true); };

  const handleEdit = (siswa: Siswa) => {
    setEditId(siswa.id);
    const kelasItem = kelasList.find(k => k.nama === siswa.kelas);
    setFormData({
      nama: siswa.nama, kelas: kelasItem ? String(kelasItem.id) : '',
      nis: siswa.nis, nisn: siswa.nisn, tempatLahir: siswa.tempatLahir || '',
      tanggalLahir: siswa.tanggalLahir || '', jenisKelamin: siswa.jenisKelamin,
      alamat: siswa.alamat || '', fase: kelasItem?.fase || siswa.fase || '',
      statusSiswa: siswa.statusSiswa || 'aktif', confirmData: false,
    });
    setShowEdit(true);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'kelas') {
      const selectedKelas = kelasList.find(k => k.id === Number(value));
      setFormData(prev => ({ ...prev, kelas: value, fase: selectedKelas?.fase || '' }));
    }
  };

  const validate = (isEdit: boolean): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.nama?.trim())        ne.nama         = 'Nama wajib diisi';
    if (!formData.kelas)               ne.kelas        = 'Pilih kelas';
    else if (!kelasList.some(k => k.id === Number(formData.kelas))) ne.kelas = 'Kelas tidak valid';
    if (!formData.nis)                 ne.nis          = 'NIS wajib diisi';
    if (!formData.nisn)                ne.nisn         = 'NISN wajib diisi';
    if (!formData.jenisKelamin)        ne.jenisKelamin = 'Pilih jenis kelamin';
    if (!formData.confirmData)         ne.confirmData  = 'Harap konfirmasi data';
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
      const res = await fetch('http://localhost:5000/api/admin/siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nis: formData.nis, nisn: formData.nisn, nama_lengkap: formData.nama,
          tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat,
          kelas_id: Number(formData.kelas), tahun_ajaran_id: selectedTahunAjaranId,
        }),
      });
      if (res.ok) {
        setShowTambah(false); handleReset(); if (selectedTahunAjaranId) fetchSiswa(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data siswa ${formData.nama} berhasil ditambahkan.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data siswa.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleSubmitEdit = async () => {
    const originalData = siswaList.find(s => s.id === editId);
    if (!originalData) return;
    const hasChanged =
      formData.nama !== originalData.nama ||
      formData.kelas !== String(kelasList.find(k => k.nama === originalData.kelas)?.id || '') ||
      formData.nis !== originalData.nis || formData.nisn !== originalData.nisn ||
      formData.tempatLahir !== (originalData.tempatLahir || '') ||
      formData.tanggalLahir !== (originalData.tanggalLahir || '') ||
      formData.jenisKelamin !== originalData.jenisKelamin ||
      formData.alamat !== (originalData.alamat || '') ||
      formData.statusSiswa !== (originalData.statusSiswa || 'aktif');
    if (!hasChanged) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' }); return; }
    if (!validate(true)) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    if (selectedTahunAjaranId === null) { showModal({ type: 'warning', title: 'Kesalahan', message: 'Tahun ajaran tidak dipilih.' }); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/siswa/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nis: formData.nis, nisn: formData.nisn, nama_lengkap: formData.nama,
          tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir,
          jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat,
          kelas_id: Number(formData.kelas), status: formData.statusSiswa,
          tahun_ajaran_id: selectedTahunAjaranId,
        }),
      });
      if (res.ok) {
        setShowEdit(false); setEditId(null); handleReset(); if (selectedTahunAjaranId) fetchSiswa(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data siswa ${formData.nama} berhasil diperbarui.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data siswa.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleReset = () => {
    setFormData({ nama: '', kelas: '', nis: '', nisn: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '', alamat: '', fase: '', statusSiswa: 'aktif', confirmData: false });
    setErrors({});
  };

  const handleImportExcel = async () => {
    if (!importFile) { showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' }); return; }
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/siswa/import', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const result = await res.json();
      if (res.ok) {
        setShowImport(false); setImportFile(null); if (selectedTahunAjaranId) fetchSiswa(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Import Berhasil!', message: result.message || `Berhasil mengimport ${result.total} data siswa.` });
      } else {
        showModal({ type: 'error', title: 'Import Gagal', message: result.message || 'Terjadi kesalahan saat mengimpor data siswa.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  // ── filter & pagination ────────────────────────────────────────────────────

  const resetFilter      = () => { setFilterValues({ kelas: '', jenisKelamin: '', status: '' }); setSearchQuery(''); setCurrentPage(1); };
  const closeFilterModal = () => { setFilterClosing(true); setTimeout(() => { setFilterValues(openedFilterValues); setShowFilter(false); setFilterClosing(false); }, 200); };
  const applyFilter      = () => { setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };

  // filteredSiswa: gabungkan filter header kelas (selectedKelasFilter) + filter modal
  const filteredSiswa = siswaList.filter((siswa) => {
    const query = searchQuery.toLowerCase().trim();
    const ms       = !query || siswa.nama.toLowerCase().includes(query) || siswa.nis.includes(query) ||
      siswa.nisn.includes(query) || siswa.kelas.toLowerCase().includes(query) ||
      (siswa.alamat && siswa.alamat.toLowerCase().includes(query));
    const mk       = !filterValues.kelas       || siswa.kelas         === filterValues.kelas;
    const mj       = !filterValues.jenisKelamin|| siswa.jenisKelamin  === filterValues.jenisKelamin;
    const ms2      = !filterValues.status      || siswa.statusSiswa   === filterValues.status;
    // Filter kelas dari header dropdown
    const mkHeader = !selectedKelasFilter      || siswa.kelas         === selectedKelasFilter;
    return ms && mk && mj && ms2 && mkHeader;
  });

  const totalPages   = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
  const startIndex   = (currentPage - 1) * itemsPerPage;
  const endIndex     = startIndex + itemsPerPage;
  const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

  const closeDetail = () => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); };
  const closeImport = () => { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); };

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

  const getStatusBadge = (status: string) => {
    const s = (status || 'aktif').toLowerCase();
    if (s === 'aktif')  return { bg: '#eaf7ef', color: '#1a7a3a', border: '#b6e8c8', dot: 'bg-green-500' };
    if (s === 'lulus')  return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: 'bg-blue-500' };
    if (s === 'pindah') return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: 'bg-yellow-500' };
    return { bg: '#f5f5f5', color: '#888', border: '#ddd', dot: 'bg-gray-400' };
  };

  // ── FORM PAGE ──────────────────────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data siswa per tahun ajaran</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Data Siswa' : 'Tambah Data Siswa'}</h2>
          <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nama */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
            <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap"
              className={errors.nama ? inputErrCls : inputCls} />
            {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
          </div>

          {/* Kelas */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Kelas <span className="text-red-500">*</span></label>
            <select name="kelas" value={formData.kelas} onChange={handleInputChange}
              className={errors.kelas ? inputErrCls : inputCls}>
              <option value="">-- Pilih --</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            {errors.kelas && <p className="text-red-500 text-xs">{errors.kelas}</p>}
          </div>

          {/* NIS */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>NIS <span className="text-red-500">*</span></label>
            <input type="text" name="nis" value={formData.nis} onChange={handleInputChange} placeholder="NIS"
              className={errors.nis ? inputErrCls : inputCls} />
            {errors.nis && <p className="text-red-500 text-xs">{errors.nis}</p>}
          </div>

          {/* NISN */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>NISN <span className="text-red-500">*</span></label>
            <input type="text" name="nisn" value={formData.nisn} onChange={handleInputChange} placeholder="NISN"
              className={errors.nisn ? inputErrCls : inputCls} />
            {errors.nisn && <p className="text-red-500 text-xs">{errors.nisn}</p>}
          </div>

          {/* Tempat Lahir */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Tempat Lahir</label>
            <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Tempat Lahir" className={inputCls} />
          </div>

          {/* Tanggal Lahir */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Tanggal Lahir</label>
            <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className={inputCls} />
          </div>

          {/* Jenis Kelamin */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
            <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange}
              className={errors.jenisKelamin ? inputErrCls : inputCls}>
              <option value="">-- Pilih --</option>
              <option value="LAKI-LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
            {errors.jenisKelamin && <p className="text-red-500 text-xs">{errors.jenisKelamin}</p>}
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls} style={labelColor}>Status Siswa <span className="text-red-500">*</span></label>
              <select name="statusSiswa" value={formData.statusSiswa} onChange={handleInputChange}
                className={errors.statusSiswa ? inputErrCls : inputCls}>
                <option value="aktif">Aktif</option>
                <option value="lulus">Lulus</option>
                <option value="pindah">Pindah</option>
                <option value="drop-out">Drop-out</option>
              </select>
              {errors.statusSiswa && <p className="text-red-500 text-xs">{errors.statusSiswa}</p>}
            </div>
          )}

          {/* Alamat */}
          <div className={`flex flex-col gap-1.5 ${isEdit ? '' : 'md:col-span-2'}`}>
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

  if ((showTambah || showEdit) && kelasLoading) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
          <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data kelas...</span>
        </div>
      </div>
    );
  }
  if (showTambah) return renderForm(false);
  if (showEdit && kelasList.length > 0) return renderForm(true);

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
        <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data siswa per tahun ajaran</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

        {/* ── DROPDOWN TAHUN AJARAN + KELAS ───────────────────────────────── */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div className="flex flex-wrap items-center gap-3">

            {/* Tahun Ajaran */}
            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                // Reset filter kelas header saat ganti tahun ajaran
                setSelectedKelasFilter('');
                if (value === '') {
                  setSelectedTahunAjaranId(null);
                  setSelectedTahunAjaranAktif(false);
                  setLoading(false);
                  return;
                }
                const id = Number(value);
                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                setSelectedTahunAjaranId(id);
                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                setLoading(true);
                fetchSiswa(id);
              }}
              className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[220px]"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {tahunAjaranList.map(ta => (
                <option key={ta.id} value={ta.id}>
                  {ta.tahun_ajaran} {ta.semester === 'ganjil' ? 'Ganjil' : 'Genap'} {ta.is_aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>

            {/* ── FILTER KELAS (tampil setelah tahun ajaran dipilih) ─────── */}
            {selectedTahunAjaranId !== null && (
              <>
                {/* Divider vertikal */}
                <div className="h-6 w-px" style={{ background: '#fde0c8' }} />

                <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>Kelas</label>
                <select
                  value={selectedKelasFilter}
                  onChange={(e) => {
                    setSelectedKelasFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 min-w-[160px]"
                >
                  <option value="">Semua Kelas</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.nama}>{k.nama}</option>
                  ))}
                </select>

                {/* Tombol reset filter kelas (tampil kalau ada kelas dipilih) */}
                {selectedKelasFilter && (
                  <button
                    onClick={() => { setSelectedKelasFilter(''); setCurrentPage(1); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                    style={{ borderColor: '#fde0c8', color: '#c95b08', background: '#fff7ed' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff7ed')}
                    title="Reset filter kelas"
                  >
                    <X size={12} /> Reset
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {selectedTahunAjaranId === null ? (
          <div className="m-6 py-10 text-center rounded-2xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
            <p className="text-base font-semibold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
            <p className="text-sm text-gray-400 mt-1">Data siswa akan ditampilkan sesuai tahun ajaran yang dipilih</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {selectedTahunAjaranAktif && (
                    <button onClick={() => setShowTambah(true)}
                      className={btnPrimary.base} style={btnPrimary.style}
                      onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                      <Plus size={16} /> Tambah Siswa
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                    <select value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
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
                    <input type="text" placeholder="Cari siswa..." value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                    {searchQuery && (
                      <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {selectedTahunAjaranAktif && (
                    <>
                      <button onClick={() => { setOpenedFilterValues({ ...filterValues }); setShowFilter(true); setFilterClosing(false); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                        <Filter size={15} /> Filter Siswa
                      </button>
                      <button onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                        <Upload size={15} /> Import Siswa
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Info jumlah data + info filter aktif */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <p className="text-xs" style={{ color: '#c95b08' }}>
                  Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                </p>
                {selectedKelasFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                    Kelas: {selectedKelasFilter}
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr style={TH_GRAD}>
                    {['No.', 'Nama', 'Kelas', 'NIS', 'NISN', 'Status', selectedTahunAjaranAktif ? 'Aksi' : 'Detail'].map(h => (
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
                  ) : currentSiswa.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                      {selectedKelasFilter
                        ? `Tidak ada siswa di kelas ${selectedKelasFilter}`
                        : 'Tidak ada data siswa'}
                    </td></tr>
                  ) : currentSiswa.map((siswa, index) => {
                    const badge = getStatusBadge(siswa.statusSiswa);
                    return (
                      <tr key={siswa.id} className="transition-colors"
                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                        <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                        <td className="px-5 py-3.5 text-center text-gray-700">{siswa.kelas}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${badge.dot}`} />
                            {(siswa.statusSiswa || 'AKTIF').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleDetail(siswa)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                              style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                              <Eye size={13} /> Detail
                            </button>
                            {selectedTahunAjaranAktif && (
                              <button onClick={() => handleEdit(siswa)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                <Pencil size={13} /> Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
              <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
              <div className="flex items-center gap-1">{renderPagination()}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Detail ─────────────────────────────────────────────────── */}
      {showDetail && selectedSiswa && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">Detail Siswa</h2>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-3 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#fde0c8,#f5a623)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                    {selectedSiswa.nama.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '??'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800">{selectedSiswa.nama}</h3>
              </div>

              <div className="space-y-2.5">
                {(() => {
                  const badge = getStatusBadge(selectedSiswa.statusSiswa);
                  return [
                    { label: 'Status', value: (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${badge.dot}`} />
                        {(selectedSiswa.statusSiswa || 'AKTIF').toUpperCase()}
                      </span>
                    )},
                    { label: 'Kelas',         value: selectedSiswa.kelas },
                    { label: 'NIS',           value: selectedSiswa.nis },
                    { label: 'NISN',          value: selectedSiswa.nisn },
                    { label: 'Tempat Lahir',  value: selectedSiswa.tempatLahir || '-' },
                    { label: 'Tanggal Lahir', value: formatTanggalIndonesia(selectedSiswa.tanggalLahir) },
                    { label: 'Jenis Kelamin', value: selectedSiswa.jenisKelamin },
                    { label: 'Alamat',        value: selectedSiswa.alamat || '-' },
                    { label: 'Fase',          value: selectedSiswa.fase },
                  ].map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 pb-2.5" style={{ borderBottom: '1px solid #fde0c8' }}>
                      <span className="text-xs font-semibold col-span-1" style={{ color: '#7a3a0a' }}>{item.label}</span>
                      <span className="text-xs text-gray-400">:</span>
                      <span className="text-xs text-gray-700 col-span-2 break-words">{item.value}</span>
                    </div>
                  ));
                })()}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                {selectedTahunAjaranAktif && (
                  <button onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}
                    className={btnPrimary.base} style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                    <Pencil size={14} /> Edit
                  </button>
                )}
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
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">Import Data Siswa</h2>
              <button onClick={closeImport} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm mb-3" style={{ color: '#7a3a0a' }}>
                Format file: <strong>.xlsx</strong> atau <strong>.xls</strong>
              </p>
              <div className="mb-4">
                <a href="http://localhost:5000/templates/template_import_siswa.xlsx" download
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
                  {importFile
                    ? <span className="font-semibold" style={{ color: '#c95b08' }}>{importFile.name}</span>
                    : <span className="text-gray-400">Klik untuk pilih file</span>}
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

      {/* ── Modal Filter ─────────────────────────────────────────────────── */}
      {showFilter && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) closeFilterModal(); }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={CARD_STYLE}>

            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
              <h2 className="text-base font-bold text-white">Filter Siswa</h2>
              <button onClick={closeFilterModal} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: 'Kelas', name: 'kelas', options: [{ v: '', l: 'Semua Kelas' }, ...kelasList.map(k => ({ v: k.nama, l: k.nama }))] },
                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua Jenis Kelamin' }, { v: 'LAKI-LAKI', l: 'Laki-laki' }, { v: 'PEREMPUAN', l: 'Perempuan' }] },
                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'lulus', l: 'Lulus' }, { v: 'pindah', l: 'Pindah' }, { v: 'drop-out', l: 'Drop-out' }] },
              ].map(f => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <label className={labelCls} style={labelColor}>{f.label}</label>
                  <select value={(filterValues as any)[f.name]}
                    onChange={e => setFilterValues(p => ({ ...p, [f.name]: e.target.value }))}
                    className={inputCls}>
                    {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}

              <div className="pt-2 flex gap-3" style={{ borderTop: '1px solid #fde0c8' }}>
                <BtnSecondary onClick={resetFilter}>Reset</BtnSecondary>
                <button onClick={applyFilter}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}>
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}