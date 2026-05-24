/**
 * Nama File: ekstrakurikuler_client.tsx
 * Fungsi: Komponen client-side untuk mengelola data ekstrakurikuler oleh admin.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Konsisten dengan tema oranye elegan DataGuruPage
 */

'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Pencil, Plus, Trash2, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

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
  success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
  error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
  network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
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

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG    = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
  base:  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
  style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
  hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
  leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── SECONDARY BUTTON ─────────────────────────────────────────────────────────

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
  >{children}</button>
);

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface Ekstrakurikuler {
  id: number;
  nama_ekskul: string;
  nama_pembina: string | null;
  jumlah_anggota: number;
}

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

interface FormDataType {
  nama_ekskul: string;
  nama_pembina: string;
  confirmData: boolean;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataEkstrakurikulerPage() {

  const [ekskulList,               setEkskulList]               = useState<Ekstrakurikuler[]>([]);
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

  const [formData, setFormData] = useState<FormDataType>({ nama_ekskul: '', nama_pembina: '', confirmData: false });
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const [modal,     setModal]     = useState<ModalConfig | null>(null);
  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTahunAjaran = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' }); return; }
      const res  = await fetch('http://localhost:5000/api/admin/tahun-ajaran', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        const options = data.data.map((ta: any) => ({
          id: ta.id_tahun_ajaran,
          tahun_ajaran: ta.tahun_ajaran,
          semester: (ta.semester || 'ganjil').toLowerCase(),
          is_aktif: ta.status === 'aktif',
        }));
        setTahunAjaranList(options);
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    }
  }, [showModal]);

  const fetchEkskul = useCallback(async (tahunAjaranId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' }); return; }
      const res  = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler?tahun_ajaran_id=${tahunAjaranId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        const mapped = (Array.isArray(data.data) ? data.data : []).map((ekskul: any) => ({
          id: ekskul.id_ekskul,
          nama_ekskul: ekskul.nama_ekskul,
          nama_pembina: ekskul.nama_pembina || '-',
          jumlah_anggota: ekskul.jumlah_anggota || 0,
        }));
        setEkskulList(mapped);
      } else {
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data ekstrakurikuler.' });
      }
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => { fetchTahunAjaran(); }, [fetchTahunAjaran]);
  useEffect(() => { if (selectedTahunAjaranId) { setLoading(true); fetchEkskul(selectedTahunAjaranId); } }, [selectedTahunAjaranId, fetchEkskul]);

  // ── filter & pagination ────────────────────────────────────────────────────

  const filteredEkskul = ekskulList.filter((ekskul) => {
    const query = searchQuery.toLowerCase().trim();
    return !query || ekskul.nama_ekskul.toLowerCase().includes(query) || (ekskul.nama_pembina && ekskul.nama_pembina.toLowerCase().includes(query));
  });

  const totalPages  = Math.max(1, Math.ceil(filteredEkskul.length / itemsPerPage));
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const endIndex    = startIndex + itemsPerPage;
  const currentEkskul = filteredEkskul.slice(startIndex, endIndex);

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

  // ── form handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.nama_ekskul?.trim()) ne.nama_ekskul = 'Nama ekstrakurikuler wajib diisi';
    if (!formData.confirmData) ne.confirmData = 'Harap konfirmasi data sebelum melanjutkan';
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
    try {
      const res = await fetch('http://localhost:5000/api/admin/ekstrakurikuler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nama_ekskul: formData.nama_ekskul, nama_pembina: formData.nama_pembina || null, tahun_ajaran_id: selectedTahunAjaranId }),
      });
      if (res.ok) {
        setShowTambah(false);
        handleReset();
        if (selectedTahunAjaranId) await fetchEkskul(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Berhasil Ditambahkan!', message: `Ekstrakurikuler "${formData.nama_ekskul}" berhasil ditambahkan.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan ekstrakurikuler.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleSubmitEdit = async () => {
    if (!validate() || editId === null) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nama_ekskul: formData.nama_ekskul, nama_pembina: formData.nama_pembina || null, tahun_ajaran_id: selectedTahunAjaranId }),
      });
      if (res.ok) {
        setShowEdit(false);
        setEditId(null);
        handleReset();
        if (selectedTahunAjaranId) await fetchEkskul(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Data Diperbarui!', message: `Ekstrakurikuler "${formData.nama_ekskul}" berhasil diperbarui.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleDelete = async (id: number, namaEkskul: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ekstrakurikuler "${namaEkskul}"?`)) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/ekstrakurikuler/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        if (selectedTahunAjaranId) await fetchEkskul(selectedTahunAjaranId);
        showModal({ type: 'success', title: 'Berhasil Dihapus!', message: `Ekstrakurikuler "${namaEkskul}" berhasil dihapus.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menghapus', message: err.message || 'Terjadi kesalahan saat menghapus data.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const handleReset = () => { setFormData({ nama_ekskul: '', nama_pembina: '', confirmData: false }); setErrors({}); };

  // ── FORM PAGE ──────────────────────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Ekstrakurikuler</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data kegiatan ekstrakurikuler</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto" style={CARD_STYLE}>

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Data Ekstrakurikuler' : 'Tambah Data Ekstrakurikuler'}</h2>
          <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-5">

          {/* Nama Ekstrakurikuler */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Nama Ekstrakurikuler <span className="text-red-500">*</span></label>
            <input type="text" name="nama_ekskul" value={formData.nama_ekskul} onChange={handleInputChange}
              placeholder="Contoh: Pramuka"
              className={errors.nama_ekskul ? inputErrCls : inputCls} />
            {errors.nama_ekskul && <p className="text-red-500 text-xs">{errors.nama_ekskul}</p>}
          </div>

          {/* Nama Pembina */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>Nama Pembina</label>
            <input type="text" name="nama_pembina" value={formData.nama_pembina} onChange={handleInputChange}
              placeholder="Nama pembina (opsional)"
              className={inputCls} />
          </div>

          {/* Konfirmasi */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" name="confirmData" checked={formData.confirmData}
                onChange={e => setFormData(prev => ({ ...prev, confirmData: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Saya yakin data yang diisi sudah benar</span>
            </label>
            {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
          </div>
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

  // ── HALAMAN UTAMA ──────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Ekstrakurikuler</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data kegiatan ekstrakurikuler</p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

        {/* Toolbar */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>

          {/* Pilih Tahun Ajaran */}
          <div className="mb-4">
            <label className={`${labelCls} mb-1.5`} style={labelColor}>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') { setSelectedTahunAjaranId(null); setSelectedTahunAjaranAktif(false); setLoading(false); return; }
                const id = Number(value);
                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                setSelectedTahunAjaranId(id);
                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                setLoading(true);
                fetchEkskul(id);
              }}
              className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 w-full md:w-72"
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {tahunAjaranList.map(ta => {
                const semesterDisplay = ta.semester === 'ganjil' ? 'Ganjil' : 'Genap';
                return (<option key={ta.id} value={ta.id}>{ta.tahun_ajaran} {semesterDisplay} {ta.is_aktif ? '(Aktif)' : ''}</option>);
              })}
            </select>
          </div>

          {/* Controls row — only when tahun ajaran selected */}
          {selectedTahunAjaranId !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3">

              {/* Tambah button */}
              <div>
                {selectedTahunAjaranAktif && (
                  <button onClick={() => setShowTambah(true)}
                    className={btnPrimary.base}
                    style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover}
                    onMouseLeave={btnPrimary.leave}
                  >
                    <Plus size={16} /> Tambah Ekstrakurikuler
                  </button>
                )}
              </div>

              {/* Right controls */}
              <div className="flex flex-wrap items-center gap-2">

                {/* Tampilkan N data */}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                  <select value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                </div>

                {/* Search */}
                <div className="relative min-w-[200px] sm:min-w-[220px]">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                  </div>
                  <input type="text" placeholder="Cari ekstrakurikuler..." value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
            </div>
          )}

          {/* Info count */}
          {selectedTahunAjaranId !== null && (
            <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
              Menampilkan {filteredEkskul.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredEkskul.length)} dari {filteredEkskul.length} data
            </p>
          )}
        </div>

        {/* Pilih Tahun Ajaran dulu */}
        {selectedTahunAjaranId === null ? (
          <div className="m-6 text-center py-10 rounded-xl" style={{ background: '#fff8f3', border: '2px dashed #fde0c8' }}>
            <p className="font-semibold" style={{ color: '#c95b08' }}>Pilih Tahun Ajaran Terlebih Dahulu</p>
            <p className="text-sm text-gray-400 mt-1">Data ekstrakurikuler akan tampil setelah memilih tahun ajaran.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm border-collapse">
                <thead>
                  <tr style={TH_GRAD}>
                    {['No.', 'Nama Ekstrakurikuler', 'Pembina', 'Jumlah Anggota', selectedTahunAjaranAktif ? 'Aksi' : 'Keterangan'].map(h => (
                      <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                        Memuat data...
                      </div>
                    </td></tr>
                  ) : currentEkskul.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Tidak ada data ekstrakurikuler</td></tr>
                  ) : currentEkskul.map((ekskul, index) => (
                    <tr key={ekskul.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                      onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                    >
                      <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                      <td className="px-5 py-3.5 font-bold text-gray-800">{ekskul.nama_ekskul}</td>
                      <td className="px-5 py-3.5 text-gray-700 text-center">{ekskul.nama_pembina || '-'}</td>
                      <td className="px-5 py-3.5 text-center text-gray-700">{ekskul.jumlah_anggota}</td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {selectedTahunAjaranAktif ? (
                          <div className="flex justify-center gap-2">
                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditId(ekskul.id);
                                setFormData({ nama_ekskul: ekskul.nama_ekskul, nama_pembina: ekskul.nama_pembina || '', confirmData: false });
                                setShowEdit(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                              style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            {/* Hapus */}
                            <button
                              onClick={() => handleDelete(ekskul.id, ekskul.nama_ekskul)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                              style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                              onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                            >
                              <Trash2 size={13} /> Hapus
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Tahun ajaran tidak aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
              <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">{renderPagination()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}