/**
 * Nama File: DataTahunAjaranPage.tsx
 * Fungsi: Halaman manajemen data tahun ajaran.
 *         Menampilkan daftar tahun ajaran dalam tabel dengan fitur tambah dan edit.
 *         Tanpa card statistik dan tanpa kolom pencarian.
 * UI: Tema oranye elegan, konsisten dengan Sidebar & Header
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface TahunAjaran {
  id_tahun_ajaran: number;
  tahun_ajaran: string;
  semester: 'Ganjil' | 'Genap';
  tanggal_pembagian_pts: string | null;
  tanggal_pembagian_pas: string | null;
  status: 'aktif' | 'nonaktif';
}

type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes ta-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ta-scaleIn {
      from { opacity: 0; transform: scale(0.93) translateY(10px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    @keyframes ta-pulseOnce {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    .ta-fadeIn    { animation: ta-fadeIn    0.2s ease; }
    .ta-scaleIn   { animation: ta-scaleIn   0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ta-pulseOnce { animation: ta-pulseOnce 0.6s ease 0.15s; }
  `}</style>
);

// ─── MODAL STYLES ─────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, {
  iconBg: string; ring: string; icon: React.ReactNode; btn: string;
}> = {
  success: {
    iconBg: 'bg-green-50', ring: 'ring-green-100',
    icon: <CheckCircle2 size={40} className="text-green-500" />,
    btn: 'bg-green-500 hover:bg-green-600',
  },
  error: {
    iconBg: 'bg-red-50', ring: 'ring-red-100',
    icon: <AlertCircle size={40} className="text-red-500" />,
    btn: 'bg-red-500 hover:bg-red-600',
  },
  warning: {
    iconBg: 'bg-orange-50', ring: 'ring-orange-100',
    icon: <ShieldAlert size={40} className="text-orange-500" />,
    btn: 'bg-orange-500 hover:bg-orange-600',
  },
  network: {
    iconBg: 'bg-slate-100', ring: 'ring-slate-200',
    icon: <WifiOff size={40} className="text-slate-500" />,
    btn: 'bg-slate-600 hover:bg-slate-700',
  },
};

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ta-fadeIn">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ta-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ta-pulseOnce`}>
          {s.icon}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{modal.message}</p>
        </div>
        <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
          OK, Mengerti
        </button>
      </div>
    </div>
  );
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatTanggal = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const clean = dateStr.split(' ')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return '-';
  const [year, month, day] = clean.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return '-';
  const hari  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][date.getDay()];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][date.getMonth()];
  return `${hari}, ${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

// ─── FORM FIELD ───────────────────────────────────────────────────────────────

const Field = ({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataTahunAjaranPage() {

  const [list, setList]           = useState<TahunAjaran[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const PER_PAGE = 10;

  const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  const [form, setForm] = useState({
    tahun1: '2024', tahun2: '2025',
    semester: 'Ganjil' as 'Ganjil' | 'Genap',
    tanggal_pembagian_pts: '',
    tanggal_pembagian_pas: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
      const res  = await fetch('http://localhost:5000/api/admin/tahun-ajaran', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) setList(data.data);
      else showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan.' });
    } catch {
      showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  }, [showModal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Validate ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.tahun1 || !form.tahun2) errs.tahun = 'Tahun ajaran wajib diisi';
    else if (!/^\d+$/.test(form.tahun1) || !/^\d+$/.test(form.tahun2)) errs.tahun = 'Tahun harus berupa angka';
    if (!form.semester) errs.semester = 'Semester wajib dipilih';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Tambah ───────────────────────────────────────────────────────────────

  const handleTambah = async () => {
    if (!validate()) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }
    try {
      const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tahun1: form.tahun1, tahun2: form.tahun2, semester: form.semester,
          tanggal_pembagian_pts: form.tanggal_pembagian_pts || null,
          tanggal_pembagian_pas: form.tanggal_pembagian_pas || null,
        }),
      });
      if (res.ok) {
        setShowTambah(false);
        resetForm();
        await fetchData();
        showModal({ type: 'success', title: 'Berhasil Ditambahkan!', message: `Tahun ajaran ${form.tahun1}/${form.tahun2} semester ${form.semester} berhasil ditambahkan.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────

  const openEdit = (item: TahunAjaran) => {
    const [t1, t2] = item.tahun_ajaran.split('/');
    setEditId(item.id_tahun_ajaran);
    setForm({ tahun1: t1 || '2024', tahun2: t2 || '2025', semester: item.semester, tanggal_pembagian_pts: item.tanggal_pembagian_pts || '', tanggal_pembagian_pas: item.tanggal_pembagian_pas || '' });
    setErrors({});
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!validate()) return;
    const token = localStorage.getItem('token');
    if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/admin/tahun-ajaran/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tahun1: form.tahun1, tahun2: form.tahun2, semester: form.semester,
          tanggal_pembagian_pts: form.tanggal_pembagian_pts || null,
          tanggal_pembagian_pas: form.tanggal_pembagian_pas || null,
        }),
      });
      if (res.ok) {
        setShowEdit(false);
        setEditId(null);
        await fetchData();
        showModal({ type: 'success', title: 'Data Diperbarui!', message: `Tahun ajaran ${form.tahun1}/${form.tahun2} semester ${form.semester} berhasil diperbarui.` });
      } else {
        const err = await res.json();
        showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
      }
    } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
  };

  // ── Reset / helpers ───────────────────────────────────────────────────────

  const resetForm = (fromItem?: TahunAjaran) => {
    if (fromItem) {
      const [t1, t2] = fromItem.tahun_ajaran.split('/');
      setForm({ tahun1: t1 || '2024', tahun2: t2 || '2025', semester: fromItem.semester, tanggal_pembagian_pts: fromItem.tanggal_pembagian_pts || '', tanggal_pembagian_pas: fromItem.tanggal_pembagian_pas || '' });
    } else {
      setForm({ tahun1: '2024', tahun2: '2025', semester: 'Ganjil', tanggal_pembagian_pts: '', tanggal_pembagian_pas: '' });
    }
    setErrors({});
  };

  const handleReset = () => {
    if (showEdit && editId) {
      const item = list.find(t => t.id_tahun_ajaran === editId);
      if (item) resetForm(item);
    } else {
      resetForm();
    }
  };

  // ── Sorted + paginated ────────────────────────────────────────────────────

  const sorted = [...list].sort((a, b) => {
    if (a.status === b.status) return b.id_tahun_ajaran - a.id_tahun_ajaran;
    return a.status === 'aktif' ? -1 : 1;
  });
  const totalPages  = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const startIdx    = (page - 1) * PER_PAGE;
  const pageData    = sorted.slice(startIdx, startIdx + PER_PAGE);

  // ── Pagination renderer ───────────────────────────────────────────────────

  const Pagination = () => {
    if (totalPages <= 1) return null;
    const pages: React.ReactNode[] = [];

    const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
    const btnActive = "text-white border-orange-500" ;
    const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

    pages.push(
      <button key="prev" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>
    );

    const range: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push(-1);
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
      if (page < totalPages - 2) range.push(-2);
      range.push(totalPages);
    }

    range.forEach((p, i) => {
      if (p < 0) {
        pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>);
      } else {
        pages.push(
          <button key={p} onClick={() => setPage(p)}
            className={`${btnBase} ${page === p ? btnActive : btnInactive}`}
            style={page === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
          >{p}</button>
        );
      }
    });

    pages.push(
      <button key="next" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>
    );

    return (
      <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
          Halaman {page} dari {totalPages}
        </span>
        <div className="flex items-center gap-1">{pages}</div>
      </div>
    );
  };

  // ── Form (tambah / edit) ──────────────────────────────────────────────────

  const FormPage = ({ isEdit }: { isEdit: boolean }) => (
    <div className="flex-1 p-6 min-h-screen" style={{ background: '#fdf6f0' }}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Tahun Ajaran</h1>
          <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
            Kelola tahun ajaran dan semester aktif
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' }}>
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)', }}>
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
          </h2>
          <button
            onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); setErrors({}); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tahun Ajaran */}
          <div className="md:col-span-2">
            <Field label="Tahun Ajaran" required error={errors.tahun}>
              <div className="flex items-center gap-3">
                <input
                  type="text" value={form.tahun1}
                  onChange={e => { setForm(p => ({ ...p, tahun1: e.target.value })); setErrors(p => ({ ...p, tahun: '' })); }}
                  className={`${inputCls} w-28`} placeholder="2024"
                />
                <span className="text-2xl font-bold" style={{ color: '#e8690a' }}>/</span>
                <input
                  type="text" value={form.tahun2}
                  onChange={e => { setForm(p => ({ ...p, tahun2: e.target.value })); setErrors(p => ({ ...p, tahun: '' })); }}
                  className={`${inputCls} w-28`} placeholder="2025"
                />
              </div>
            </Field>
          </div>

          {/* Semester */}
          <Field label="Semester" required error={errors.semester}>
            <select
              value={form.semester}
              onChange={e => { setForm(p => ({ ...p, semester: e.target.value as 'Ganjil' | 'Genap' })); setErrors(p => ({ ...p, semester: '' })); }}
              className={inputCls}
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </Field>

          {/* Tanggal PTS */}
          <Field label="Tanggal Pembagian PTS">
            <input type="date" value={form.tanggal_pembagian_pts}
              onChange={e => setForm(p => ({ ...p, tanggal_pembagian_pts: e.target.value }))}
              className={inputCls}
            />
          </Field>

          {/* Tanggal PAS */}
          <Field label="Tanggal Pembagian PAS">
            <input type="date" value={form.tanggal_pembagian_pas}
              onChange={e => setForm(p => ({ ...p, tanggal_pembagian_pas: e.target.value }))}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Form footer */}
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
          <button
            onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); setErrors({}); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
            style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            Batal
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
            style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            Reset
          </button>
          <button
            onClick={isEdit ? handleEdit : handleTambah}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
          >
            {isEdit ? 'Simpan Perubahan' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );

  if (showTambah) return <FormPage isEdit={false} />;
  if (showEdit)   return <FormPage isEdit={true} />;

  // ── Table view ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 min-h-screen" style={{ background: '#fdf6f0' }}>
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Tahun Ajaran</h1>
        <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
          Kelola tahun ajaran dan semester aktif
        </p>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' }}>

        {/* Card sub-header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
          <div>
            <p className="text-sm font-bold text-gray-800">Daftar Tahun Ajaran</p>
            <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
              Menampilkan {sorted.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + PER_PAGE, sorted.length)} dari {sorted.length} data
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowTambah(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
          >
            <Plus size={16} />
            Tambah Tahun Ajaran
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' }}>
                {['No.','Tahun Ajaran','Semester','Pembagian Rapor PTS','Pembagian Rapor PAS','Status','Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">
                    {h}
                  </th>
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
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                    Tidak ada data tahun ajaran
                  </td>
                </tr>
              ) : pageData.map((item, idx) => (
                <tr
                  key={item.id_tahun_ajaran}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid #fde0c8',
                    background: idx % 2 === 0 ? '#fff' : '#fffaf6',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}
                >
                  <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIdx + idx + 1}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-gray-800">{item.tahun_ajaran}</td>
                  <td className="px-5 py-3.5 text-center text-gray-700">{item.semester}</td>
                  <td className="px-5 py-3.5 text-center text-gray-600 text-[13px]">{formatTanggal(item.tanggal_pembagian_pts)}</td>
                  <td className="px-5 py-3.5 text-center text-gray-600 text-[13px]">{formatTanggal(item.tanggal_pembagian_pas)}</td>
                  <td className="px-5 py-3.5 text-center">
                    {item.status === 'aktif' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        AKTIF
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                        NONAKTIF
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {item.status === 'aktif' ? (
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    ) : (
                      <span className="text-gray-300 text-base">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination />
      </div>
    </div>
  );
}