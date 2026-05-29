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

const formatTanggalIndonesia = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split(' ')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return '-';
    const [year, month, day] = cleanDate.split('-').map(Number);
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

    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [loading, setLoading]   = useState(true);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit,   setShowEdit]   = useState(false);
    const [editId,     setEditId]     = useState<number | null>(null);
    const [currentPage]    = useState(1);
    const [itemsPerPage]   = useState(10);
    const [page, setPage]  = useState(1);

    // ── popup state ──
    const [modal, setModal] = useState<ModalConfig | null>(null);
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

    const fetchTahunAjaran = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
                return;
            }
            const res  = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTahunAjaranList(data.data);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data tahun ajaran.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Validate ─────────────────────────────────────────────────────────────

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!formData.tahun1 || !formData.tahun2) errs.tahun = 'Tahun ajaran wajib diisi';
        if (!formData.semester)                   errs.semester = 'Semester wajib dipilih';
        if (!formData.tanggal_pembagian_pas)       errs.tanggal_pas = 'Tanggal pembagian PAS wajib diisi';
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

    const handleReset = () => {
        if (showEdit && editId) {
            const item = tahunAjaranList.find(t => t.id_tahun_ajaran === editId);
            if (item) {
                const [thn1, thn2] = item.tahun_ajaran.split('/');
                setFormData({ tahun1: thn1||'2024', tahun2: thn2||'2025', semester: item.semester, tanggal_pembagian_pts: item.tanggal_pembagian_pts||'', tanggal_pembagian_pas: item.tanggal_pembagian_pas||'' });
            }
        } else {
            setFormData({ tahun1: '2024', tahun2: '2025', semester: 'Ganjil', tanggal_pembagian_pts: '', tanggal_pembagian_pas: '' });
        }
        setErrors({});
    };

    // ── pagination ─────────────────────────────────────────────────────────

    const sortedData  = [...tahunAjaranList].sort((a, b) => {
        if (a.status === b.status) return b.id_tahun_ajaran - a.id_tahun_ajaran;
        return a.status === 'aktif' ? -1 : 1;
    });
    const startIndex  = (page - 1) * itemsPerPage;
    const endIndex    = startIndex + itemsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);
    const totalPages  = Math.ceil(sortedData.length / itemsPerPage);

    const renderPagination = () => {
        const pages: React.ReactNode[] = [];
        if (page > 1) pages.push(<button key="prev" onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded">«</button>);
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(<button key={i} onClick={() => setPage(i)} className={`px-3 py-1 border rounded ${page === i ? 'bg-blue-500 text-white' : ''}`}>{i}</button>);
        } else {
            pages.push(<button key={1} onClick={() => setPage(1)} className={`px-3 py-1 border rounded ${page === 1 ? 'bg-blue-500 text-white' : ''}`}>1</button>);
            if (page > 3) pages.push(<span key="l" className="px-2">...</span>);
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++)
                pages.push(<button key={i} onClick={() => setPage(i)} className={`px-3 py-1 border rounded ${page === i ? 'bg-blue-500 text-white' : ''}`}>{i}</button>);
            if (page < totalPages - 2) pages.push(<span key="r" className="px-2">...</span>);
            pages.push(<button key={totalPages} onClick={() => setPage(totalPages)} className={`px-3 py-1 border rounded ${page === totalPages ? 'bg-blue-500 text-white' : ''}`}>{totalPages}</button>);
        }
        if (page < totalPages) pages.push(<button key="next" onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">»</button>);
        return pages;
    };

    // ── form view ──────────────────────────────────────────────────────────

    const renderForm = (isEdit: boolean) => (
        <>
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            <GlobalStyles />
            <div className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
                <div className="w-full max-w-4xl mx-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Data Tahun Ajaran</h1>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">{isEdit ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}</h2>
                            <button onClick={() => isEdit ? setShowEdit(false) : setShowTambah(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahun Ajaran <span className="text-red-500">*</span></label>
                                <div className="flex items-center gap-2">
                                    <input type="text" name="tahun1" value={formData.tahun1} onChange={handleInputChange} className="w-24 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2024" />
                                    <span className="text-xl font-bold">/</span>
                                    <input type="text" name="tahun2" value={formData.tahun2} onChange={handleInputChange} className="w-24 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2025" />
                                </div>
                                {errors.tahun && <p className="text-red-500 text-xs mt-1">{errors.tahun}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester <span className="text-red-500">*</span></label>
                                <select name="semester" value={formData.semester} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                                {errors.semester && <p className="text-red-500 text-xs mt-1">{errors.semester}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Pembagian PTS</label>
                                <input type="date" name="tanggal_pembagian_pts" value={formData.tanggal_pembagian_pts} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Pembagian PAS <span className="text-red-500">*</span></label>
                                <input type="date" name="tanggal_pembagian_pas" value={formData.tanggal_pembagian_pas} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {errors.tanggal_pas && <p className="text-red-500 text-xs mt-1">{errors.tanggal_pas}</p>}
                            </div>
                        </div>
                        <div className="mt-6 sm:mt-8">
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <button onClick={() => isEdit ? setShowEdit(false) : setShowTambah(false)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium">Batal</button>
                                <button onClick={handleReset} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium">Reset</button>
                                <button onClick={isEdit ? handleSubmitEdit : handleSubmitTambah} className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded text-xs sm:text-sm font-medium">
                                    {isEdit ? 'Update' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    if (showTambah) return renderForm(false);
    if (showEdit)   return renderForm(true);

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

                        <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                            <table className="w-full min-w-[600px] table-auto text-sm">
                                <thead>
                                    <tr>
                                        {['No.','Tahun Ajaran','Semester','Pembagian Rapor PTS','Pembagian Rapor PAS','Status','Aksi'].map(h => (
                                            <th key={h} className="px-4 py-3 text-center sticky top-0 bg-gray-800 text-white z-10 font-semibold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat data...</td></tr>
                                    ) : currentData.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data tahun ajaran</td></tr>
                                    ) : currentData.map((item, index) => (
                                        <tr key={item.id_tahun_ajaran} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                            <td className="px-4 py-3 text-center font-medium">{startIndex + index + 1}</td>
                                            <td className="px-4 py-3 text-center font-medium">{item.tahun_ajaran}</td>
                                            <td className="px-4 py-3 text-center">{item.semester}</td>
                                            <td className="px-4 py-3 text-center">{formatTanggalIndonesia(item.tanggal_pembagian_pts)}</td>
                                            <td className="px-4 py-3 text-center">{formatTanggalIndonesia(item.tanggal_pembagian_pas)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {item.status === 'aktif' ? (
                                                    <div className="flex justify-center">
                                                        <button onClick={() => handleEdit(item)} className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm">
                                                            <Pencil size={14} /><span className="hidden sm:inline">Edit</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
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