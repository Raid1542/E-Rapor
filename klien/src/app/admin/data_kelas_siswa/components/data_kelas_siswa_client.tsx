/**
 * Nama File: data_kelas_siswa_client.tsx
 * Fungsi: Komponen klien untuk mengelola data kelas,
 *         mencakup fitur tambah (dengan pilihan wali kelas langsung),
 *         edit, hapus, pemilihan tahun ajaran, dan penetapan wali kelas.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan DataGuruPage
 * Update: Wali kelas kini dapat langsung dipilih saat menambahkan kelas baru
 */

'use client';

import Link from 'next/link';
import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import { Pencil, Plus, Search, X, Trash2, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes dk-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dk-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dk-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .dk-fadeIn  { animation: dk-fadeIn  0.2s ease; }
    .dk-scaleIn { animation: dk-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .dk-pulse   { animation: dk-pulse   0.6s ease 0.15s; }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dk-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dk-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dk-pulse`}>{s.icon}</div>
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
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dk-fadeIn">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dk-scaleIn">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dk-pulse">
        <Trash2 size={36} className="text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
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

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface Kelas {
  id: number;
  nama_kelas: string;
  wali_kelas: string;
  wali_kelas_id: number | null;
  fase: string;
  jumlah_siswa: number;
}

interface TahunAjaran {
  id: number;
  tahun_ajaran: string;
  semester: string;
  is_aktif: boolean;
}

interface GuruOption {
  id: number;
  nama: string;
}

interface FormDataType {
  nama_kelas: string;
  fase: string;
  user_id: string;
  confirmData: boolean;
}

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

export default function DataKelasClient() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState<number | null>(null);
  const [selectedTahunAjaranAktif, setSelectedTahunAjaranAktif] = useState<boolean>(false);
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [loadingGuru, setLoadingGuru] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({ nama_kelas: '', fase: '', user_id: '', confirmData: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTahunAjaran = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
      const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setTahunAjaranList(data.data.map((ta: any) => ({
          id: ta.id_induk,
          tahun_ajaran: ta.tahun_ajaran,
          semester: ta.semester_aktif?.toLowerCase() || 'ganjil',
          is_aktif: ta.status === 'AKTIF',
        })));
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  const fetchGuruList = async () => {
    setLoadingGuru(true);
    const token = localStorage.getItem('token');
    if (!token) { setLoadingGuru(false); return; }
    try {
      const res = await fetch('http://localhost:5000/api/admin/guru-kelas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const filteredGurus = data.data
          .filter((g: any) => g.user_id != null)
          .filter((g: any) => {
            if (editId && g.kelas_id === editId) return true;
            if (g.kelas_id && g.kelas_id !== editId) return false;
            return true;
          })
          .map((g: any) => ({ id: g.user_id, nama: g.nama }));

        setGuruList(filteredGurus);
      } else {
        setGuruList([]);
      }
    } catch {
      setGuruList([]);
    }
    finally {
      setLoadingGuru(false);
    }
  };

  const fetchKelas = async (tahunAjaranId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
      const res = await fetch(`http://localhost:5000/api/admin/kelas?tahun_ajaran_id=${tahunAjaranId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setKelasList(data.data.map((k: any) => ({ ...k, wali_kelas_id: k.wali_kelas === '-' ? null : k.wali_kelas_id })));
      } else {
        showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data kelas.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchTahunAjaran();
    fetchGuruList();
  }, []);

  useEffect(() => {
    if (tahunAjaranList.length > 0 && selectedTahunAjaranId === null) {
      const savedId = localStorage.getItem('selectedTahunAjaranId');
      if (savedId) {
        const id = Number(savedId);
        const ta = tahunAjaranList.find(t => t.id === id);
        if (ta) {
          setSelectedTahunAjaranId(id);
          setSelectedTahunAjaranAktif(ta.is_aktif);
          setLoading(true);
          fetchKelas(id);
        }
      }
    }
  }, [tahunAjaranList]);

  // ── form handlers ──────────────────────────────────────────────────────────

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const ne: Record<string, string> = {};
    if (!formData.nama_kelas?.trim()) ne.nama_kelas = 'Nama kelas wajib diisi';
    if (!formData.fase?.trim()) ne.fase = 'Fase wajib diisi';
    if (!formData.confirmData) ne.confirmData = 'Harap konfirmasi data';
    setErrors(ne);
    if (Object.keys(ne).length > 0) {
      showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
      return false;
    }
    return true;
  };

  // ── TAMBAH: kini mendukung pilihan wali kelas langsung ────────────────────

  const handleSubmitTambah = async () => {
    if (!validate()) return;
    const token = localStorage.getItem('token');
    if (!token) {
      showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
      return;
    }
    try {
      // Langkah 1: Buat kelas baru
      const res = await fetch('http://localhost:5000/api/admin/kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_kelas: formData.nama_kelas.trim(),
          fase: formData.fase.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan kelas.' });
        return;
      }

      const newKelasData = await res.json();

      // Langkah 2: Jika wali kelas dipilih, langsung assign ke kelas yang baru dibuat
      if (formData.user_id && formData.user_id !== '') {
        const newKelasId = newKelasData.data?.id ?? newKelasData.id ?? null;
        const userIdNum = Number(formData.user_id);

        if (newKelasId && !isNaN(userIdNum) && userIdNum > 0) {
          const resWali = await fetch(`http://localhost:5000/api/admin/kelas/${newKelasId}/guru`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ user_id: userIdNum }),
          });

          if (!resWali.ok) {
            // Kelas sudah tersimpan, namun penetapan wali kelas gagal — beri peringatan
            setShowTambah(false);
            handleReset();
            if (selectedTahunAjaranId) fetchKelas(selectedTahunAjaranId);
            showModal({
              type: 'warning',
              title: 'Kelas Ditambahkan',
              message: `Kelas ${formData.nama_kelas} berhasil ditambahkan, namun wali kelas gagal ditetapkan. Silakan atur melalui menu Edit.`,
            });
            return;
          }
        }
      }

      // Semua berhasil
      setShowTambah(false);
      handleReset();
      if (selectedTahunAjaranId) fetchKelas(selectedTahunAjaranId);
      showModal({
        type: 'success',
        title: 'Kelas Ditambahkan!',
        message: `Kelas ${formData.nama_kelas} berhasil ditambahkan.`,
      });
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    }
  };

  const handleEdit = (kelas: Kelas) => {
    setEditId(kelas.id);
    setFormData({ nama_kelas: kelas.nama_kelas, fase: kelas.fase, user_id: kelas.wali_kelas_id ? String(kelas.wali_kelas_id) : '', confirmData: false });
    setShowEdit(true);
  };

  const handleHapus = (kelasId: number, namaKelas: string) => {
    showConfirm(`Yakin ingin menghapus kelas "${namaKelas}"? Tindakan ini tidak dapat dibatalkan.`, async () => {
      const token = localStorage.getItem('token');
      if (!token || !selectedTahunAjaranId) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi tidak valid.' }); return; }
      try {
        const res = await fetch(`http://localhost:5000/api/admin/kelas/${kelasId}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          fetchKelas(selectedTahunAjaranId);
          showModal({ type: 'success', title: 'Kelas Dihapus!', message: `Kelas "${namaKelas}" berhasil dihapus.` });
        } else {
          const err = await res.json();
          showModal({ type: 'error', title: 'Gagal Menghapus', message: err.message || 'Terjadi kesalahan saat menghapus kelas.' });
        }
      } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
    });
  };

  const handleSubmitEdit = async () => {
    if (!validate()) return;
    const token = localStorage.getItem('token');
    if (!token || !editId || !selectedTahunAjaranId) {
      showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Sesi tidak valid.' });
      return;
    }

    const originalData = kelasList.find(k => k.id === editId);
    if (originalData) {
      const hasChanges =
        originalData.nama_kelas.toLowerCase().trim() !== formData.nama_kelas.toLowerCase().trim() ||
        originalData.fase.toLowerCase().trim() !== formData.fase.toLowerCase().trim() ||
        String(originalData.wali_kelas_id || '') !== String(formData.user_id || ''); // ✅ Cek perubahan wali kelas

      if (!hasChanges) {
        showModal({
          type: 'warning',
          title: 'Tidak Ada Perubahan',
          message: 'Tidak ada data yang berubah. Tidak perlu menyimpan.'
        });
        return;
      }
    }

    try {
      const resKelas = await fetch(`http://localhost:5000/api/admin/kelas/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nama_kelas: formData.nama_kelas.trim(),
          fase: formData.fase.trim(),
          user_id: formData.user_id && formData.user_id !== '' ? Number(formData.user_id) : null  // ✅ Kirim user_id (bisa null)
        }),
      });

      if (!resKelas.ok) {
        const err = await resKelas.json();
        throw new Error(err.message || 'Gagal update kelas');
      }

      setShowEdit(false);
      setEditId(null);
      handleReset();
      if (selectedTahunAjaranId) fetchKelas(selectedTahunAjaranId);

      showModal({
        type: 'success',
        title: 'Data Diperbarui!',
        message: `Data kelas ${formData.nama_kelas} berhasil diperbarui.`
      });

    } catch (err: any) {
      showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
    }
  };

  const handleReset = () => { setFormData({ nama_kelas: '', fase: '', user_id: '', confirmData: false }); setErrors({}); };

  // ── filter & pagination ────────────────────────────────────────────────────

  const filteredKelas = kelasList.filter(kelas => {
    const query = searchQuery.toLowerCase().trim();
    return !query || kelas.nama_kelas.toLowerCase().includes(query) ||
      (kelas.wali_kelas !== '-' && kelas.wali_kelas.toLowerCase().includes(query)) ||
      kelas.fase.toLowerCase().includes(query);
  });

  const totalPages = Math.max(1, Math.ceil(filteredKelas.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentKelas = filteredKelas.slice(startIndex, endIndex);

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
    range.forEach(p => {
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

  // ── FORM PAGE ──────────────────────────────────────────────────────────────

  const renderForm = (isEdit: boolean) => (
    <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Kelas</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data kelas dan wali kelas</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Data Kelas' : 'Tambah Data Kelas'}</h2>
          <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Nama Kelas */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>
              Nama Kelas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama_kelas"
              value={formData.nama_kelas}
              onChange={handleInputChange}
              placeholder="Contoh: 1 A"
              className={errors.nama_kelas ? inputErrCls : inputCls}
            />
            {errors.nama_kelas && <p className="text-red-500 text-xs">{errors.nama_kelas}</p>}
          </div>

          {/* Fase */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>
              Fase <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fase"
              value={formData.fase}
              onChange={handleInputChange}
              placeholder="A, B, atau C"
              className={errors.fase ? inputErrCls : inputCls}
            />
            {errors.fase && <p className="text-red-500 text-xs">{errors.fase}</p>}
          </div>

          {/* Wali Kelas — tampil di TAMBAH dan EDIT */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className={labelCls} style={labelColor}>
              Wali Kelas
              <span className="text-gray-400 font-normal text-xs ml-1">(opsional)</span>
            </label>
            {loadingGuru ? (
              <div
                className="border rounded-xl px-4 py-2.5 text-sm text-gray-500"
                style={{ borderColor: '#fde0c8', background: '#fffaf6' }}
              >
                Memuat data guru...
              </div>
            ) : (
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                className={inputCls}
              >
                <option value="">-- Pilih Wali Kelas --</option>
                {guruList.map(g => (
                  <option key={`guru-${g.id}`} value={g.id}>{g.nama}</option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-400">
              {isEdit
                ? 'Ubah wali kelas jika diperlukan'
                : 'Bisa diisi sekarang atau diatur nanti melalui Edit'}
            </p>
          </div>
        </div>

        {/* Konfirmasi */}
        <div className="px-6 pb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="confirmData"
              checked={formData.confirmData}
              onChange={e => setFormData(p => ({ ...p, confirmData: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded accent-orange-500"
            />
            <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
              Saya yakin data yang diisi sudah benar
            </span>
          </label>
          {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <BtnSecondary onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>
            Batal
          </BtnSecondary>
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
  if (showEdit) return renderForm(true);

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
        <h1 className="text-2xl font-bold text-gray-900">Data Kelas</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data kelas dan wali kelas</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

        {/* Dropdown Tahun Ajaran */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaranId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setSelectedTahunAjaranId(null);
                  setSelectedTahunAjaranAktif(false);
                  setLoading(false);
                  setKelasList([]);
                  localStorage.removeItem('selectedTahunAjaranId');
                  return;
                }
                const id = Number(value);
                const selectedTa = tahunAjaranList.find(ta => ta.id === id);
                setSelectedTahunAjaranId(id);
                setSelectedTahunAjaranAktif(selectedTa?.is_aktif || false);
                localStorage.setItem('selectedTahunAjaranId', id.toString());
                setLoading(true);
                fetchKelas(id);
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
            {/* Toolbar */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {selectedTahunAjaranAktif && (
                    <button
                      onClick={() => setShowTambah(true)}
                      className={btnPrimary.base}
                      style={btnPrimary.style}
                      onMouseEnter={btnPrimary.hover}
                      onMouseLeave={btnPrimary.leave}
                    >
                      <Plus size={16} /> Tambah Kelas
                    </button>
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
                      <option key="10" value={10}>10</option>
                      <option key="25" value={25}>25</option>
                      <option key="50" value={50}>50</option>
                      <option key="100" value={100}>100</option>
                    </select>
                    <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                  </div>

                  <div className="relative min-w-[200px] sm:min-w-[220px]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                    </div>
                    <input
                      type="text"
                      placeholder="Cari kelas..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
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
              <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                Menampilkan {filteredKelas.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredKelas.length)} dari {filteredKelas.length} data
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr style={TH_GRAD}>
                    {['No.', 'Nama Kelas', 'Wali Kelas', 'Fase', 'Jumlah Siswa', 'Aksi'].map(h => (
                      <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                          Memuat data...
                        </div>
                      </td>
                    </tr>
                  ) : currentKelas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                        Tidak ada data kelas
                      </td>
                    </tr>
                  ) : currentKelas.map((kelas, index) => (
                    <tr
                      key={kelas.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                      onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                    >
                      <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-gray-800">{kelas.nama_kelas}</td>
                      <td className="px-5 py-3.5 text-center text-gray-700">
                        {kelas.wali_kelas === '-' ? (
                          <span className="text-gray-400 italic text-xs">Belum ditetapkan</span>
                        ) : kelas.wali_kelas}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: '#fff0e5', color: '#b35a08', border: '1px solid #fde0c8' }}
                        >
                          {kelas.fase}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                        >
                          {kelas.jumlah_siswa} siswa
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          {/* LIHAT SISWA: SELALU MUNCUL (walau tahun ajaran tidak aktif) */}
                          <Link
                            href={`/admin/data_kelas_siswa/${kelas.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#bae6fd')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#e0f2fe')}
                          >
                            <Users size={13} /> Lihat Siswa
                          </Link>

                          {/* EDIT & HAPUS: HANYA MUNCUL JIKA TAHUN AJARAN AKTIF */}
                          {selectedTahunAjaranAktif && (
                            <>
                              <button
                                onClick={() => handleEdit(kelas)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleHapus(kelas.id, kelas.nama_kelas)}
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