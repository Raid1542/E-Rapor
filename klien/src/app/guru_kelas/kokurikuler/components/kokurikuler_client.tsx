'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Layers, RotateCcw, Pencil, X, ChevronDown } from 'lucide-react';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
}

interface AspekKokurikuler {
  id_aspek_kokurikuler: number;
  kode: string;
  nama: string;
}

interface GradeConfig {
  id: number;
  min_nilai: number;
  max_nilai: number;
  grade: string;
  deskripsi: string;
}

interface SiswaItem {
  id: number;
  nama: string;
  nis: string;
  nisn: string;
}

interface NilaiSiswa {
  id_nilai: number | null;
  aspek_id: number;
  nilai: number | null;
  grade: string | null;
  deskripsi: string | null;
}

interface SiswaDenganNilai extends SiswaItem {
  nilai: Record<number, NilaiSiswa>;
  editingNilai: string;
  isChanged: boolean;
}

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
    
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1); }
    .animate-slideDown { animation: slideDown 0.3s ease-out; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    
    input:focus { outline: none; }
    button:focus-visible { outline: 2px solid #F47920; outline-offset: 2px; }
    
    /* Table striping */
    tbody tr:nth-child(odd) { background-color: #f8fafc; }
    tbody tr:nth-child(even) { background-color: #fff; }
    
    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    /* Orange focus ring override */
    .focus-orange:focus { ring-color: #F47920 !important; border-color: #F47920 !important; box-shadow: 0 0 0 2px #F4792033; }
  `}</style>
);

// ====== MODAL STYLES (IMPROVED) ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; iconColor: string; ring: string; icon: React.ReactNode; btn: string; btnHover: string }> = {
  success: { 
    iconBg: '#ecfdf5', 
    iconColor: '#10b981', 
    ring: '#d1fae5', 
    icon: <CheckCircle2 size={40} className="text-emerald-500" />, 
    btn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    btnHover: 'hover:shadow-lg hover:shadow-emerald-200'
  },
  error: { 
    iconBg: '#fef2f2', 
    iconColor: '#ef4444', 
    ring: '#fee2e2', 
    icon: <AlertCircle size={40} className="text-red-500" />, 
    btn: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    btnHover: 'hover:shadow-lg hover:shadow-red-200'
  },
  warning: { 
    iconBg: '#fffbeb', 
    iconColor: '#f59e0b', 
    ring: '#fef3c7', 
    icon: <ShieldAlert size={40} className="text-amber-500" />, 
    btn: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    btnHover: 'hover:shadow-lg hover:shadow-amber-200'
  },
  network: { 
    iconBg: '#f1f5f9', 
    iconColor: '#64748b', 
    ring: '#e2e8f0', 
    icon: <WifiOff size={40} className="text-slate-500" />, 
    btn: 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800',
    btnHover: 'hover:shadow-lg hover:shadow-slate-200'
  },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
  const s = MODAL_STYLES[modal.type];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 animate-scaleIn">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={18} className="text-slate-400" />
        </button>
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ring-8`} style={{ backgroundColor: s.iconBg, ringColor: s.ring }}>
          {s.icon}
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{modal.message}</p>
        </div>
        
        <button 
          onClick={onClose} 
          className={`w-full ${s.btn} ${s.btnHover} text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-4`}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};

// ====== INPUT COMPONENTS ======
const SelectField = ({ value, onChange, options, label }: any) => (
  <div className="relative">
    <select
      value={value || ''}
      onChange={onChange}
      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium transition-all appearance-none cursor-pointer hover:border-slate-300"
      style={{ outline: 'none' }}
      onFocus={e => { e.target.style.borderColor = '#F47920'; e.target.style.boxShadow = '0 0 0 2px #F4792033'; }}
      onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
    >
      <option value="">{label}</option>
      {options.map((opt: any) => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

const InputText = ({ value, onChange, placeholder, disabled = false }: any) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 font-medium transition-all disabled:bg-slate-50 disabled:text-slate-500"
    style={{ outline: 'none' }}
    onFocus={e => { e.target.style.borderColor = '#F47920'; e.target.style.boxShadow = '0 0 0 2px #F4792033'; }}
    onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
  />
);

const InputNumber = ({ value, onChange, placeholder, disabled = false }: any) => (
  <input
    type="number"
    min="0"
    max="100"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 font-semibold transition-all disabled:bg-slate-50 disabled:text-slate-500"
    style={{ outline: 'none' }}
    onFocus={e => { e.target.style.borderColor = '#F47920'; e.target.style.boxShadow = '0 0 0 2px #F4792033'; }}
    onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
  />
);

// ====== BADGE COMPONENTS ======
const GradeBadge = ({ grade, deskripsi }: { grade: string; deskripsi: string }) => (
  <div className="inline-flex items-center gap-2">
    <span className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: '#10b981' }}>
      {grade}
    </span>
  </div>
);

const ChangedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 animate-pulse">
    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
    Belum Disimpan
  </span>
);

// ====== BUTTON COMPONENTS ======
const BtnPrimary = ({ onClick, children, disabled = false, loading = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ backgroundColor: disabled || loading ? '#fdba74' : '#F47920' }}
    onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8731A'; }}
    onMouseLeave={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F47920'; }}
    onMouseDown={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D4650F'; }}
    onMouseUp={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8731A'; }}
  >
    {loading && <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
    {children}
  </button>
);

const BtnSecondary = ({ onClick, children, disabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

const BtnReset = ({ onClick }: any) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 active:bg-amber-200 transition-colors duration-200"
  >
    <RotateCcw size={12} /> Reset
  </button>
);

const BtnEdit = ({ onClick }: any) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200"
    style={{ color: '#c2550f', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ffedd5')}
    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff7ed')}
  >
    <Pencil size={12} /> Edit
  </button>
);

// ====== MAIN COMPONENT ======
export default function InputNilaiKokurikulerBulkClient() {
  const [loading, setLoading] = useState(true);
  const [aspekList, setAspekList] = useState<AspekKokurikuler[]>([]);
  const [gradeConfig, setGradeConfig] = useState<GradeConfig[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaDenganNilai[]>([]);
  const [kelasNama, setKelasNama] = useState('');
  const [selectedAspek, setSelectedAspek] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClosing, setEditClosing] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<SiswaItem | null>(null);
  const [editingNilai, setEditingNilai] = useState<string>('');
  
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ====== FETCH DATA AWAL ======
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const taRes = await fetch(`${API}/tahun-ajaran/aktif`, { headers });
        if (!taRes.ok) throw new Error('Gagal memuat tahun ajaran');
        await taRes.json();

        const aspekRes = await fetch(`${API}/atur-penilaian/aspek-kokurikuler`, { headers });
        if (!aspekRes.ok) throw new Error('Gagal memuat aspek');
        const aspekData = await aspekRes.json();
        setAspekList(aspekData.data || []);

        const gradeRes = await fetch(`${API}/atur-penilaian/kategori-kokurikuler`, { headers });
        if (!gradeRes.ok) throw new Error('Gagal memuat konfigurasi grade');
        const gradeData = await gradeRes.json();
        setGradeConfig(gradeData.data || []);

        const kelasRes = await fetch(`${API}/kelas`, { headers });
        if (!kelasRes.ok) throw new Error('Gagal memuat kelas');
        const kelasData = await kelasRes.json();
        setKelasNama(kelasData.data?.nama_kelas || 'Kelas Anda');

        const siswaRes = await fetch(`${API}/siswa`, { headers });
        if (!siswaRes.ok) throw new Error('Gagal memuat siswa');
        const siswaData = await siswaRes.json();
        
        const siswaList: SiswaDenganNilai[] = (siswaData.data || []).map((s: any, index: number) => ({
          id: s.id_siswa || s.id || (index + 1),
          nama: s.nama_lengkap || s.nama || s.nama_siswa || '',
          nis: s.nis || '',
          nisn: s.nisn || '',
          nilai: {},
          editingNilai: '',
          isChanged: false
        }));
        
        setSiswaList(siswaList);

      } catch (err: any) {
        showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showModal]);

  // ====== FETCH NILAI SAAT ASPEK DIPILIH ======
  useEffect(() => {
    if (!selectedAspek) return;

    const fetchNilai = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        const res = await fetch(`${API}/kokurikuler`, { headers });
        if (!res.ok) throw new Error('Gagal memuat nilai');
        
        const data = await res.json();
        
        setSiswaList(prevSiswaList => {
          const updatedList = prevSiswaList.map(siswa => {
            const siswaData = data.data?.find((s: any) => s.id_siswa === siswa.id);
            
            if (!siswaData) {
              return {
                ...siswa,
                nilai: { ...siswa.nilai, [selectedAspek]: null },
                editingNilai: '',
                isChanged: false
              };
            }
            
            const nilaiData = siswaData.nilai?.find((n: any) => n.aspek_id === selectedAspek);
            
            const nilaiMapped = nilaiData ? {
              id_nilai: nilaiData.id_nilai_kokurikuler,
              aspek_id: selectedAspek,
              nilai: nilaiData.nilai,
              grade: nilaiData.grade,
              deskripsi: nilaiData.deskripsi
            } : null;

            return {
              ...siswa,
              nilai: { ...siswa.nilai, [selectedAspek]: nilaiMapped },
              editingNilai: nilaiMapped?.nilai?.toString() || '',
              isChanged: false
            };
          });
          
          return updatedList;
        });
      } catch (err: any) {
        showModal({ type: 'error', title: 'Gagal Memuat', message: 'Gagal memuat nilai siswa.' });
      }
    };

    fetchNilai();
  }, [selectedAspek]);

  // ====== HANDLERS ======
  const handleNilaiChange = useCallback((siswaId: number, value: string) => {
    setSiswaList(prev => {
      return prev.map(siswa => {
        if (siswa.id === siswaId) {
          const originalNilai = siswa.nilai[selectedAspek || -1]?.nilai;
          const isChanged = value !== (originalNilai?.toString() || '');
          return {
            ...siswa,
            editingNilai: value,
            isChanged
          };
        }
        return siswa;
      });
    });
  }, [selectedAspek]);

  const handleReset = useCallback((siswaId: number) => {
    setSiswaList(prev => {
      return prev.map(siswa => {
        if (siswa.id === siswaId) {
          const originalNilai = siswa.nilai[selectedAspek || -1]?.nilai;
          return {
            ...siswa,
            editingNilai: originalNilai?.toString() || '',
            isChanged: false
          };
        }
        return siswa;
      });
    });
  }, [selectedAspek]);

  const handleEdit = (siswa: SiswaItem) => {
    const nilaiData = siswaList.find(s => s.id === siswa.id)?.nilai[selectedAspek || -1];
    setEditingSiswa(siswa);
    setEditingNilai(nilaiData?.nilai?.toString() || '');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditClosing(true);
    setTimeout(() => {
      setShowEditModal(false);
      setEditClosing(false);
      setEditingSiswa(null);
      setEditingNilai('');
    }, 200);
  };

  const handleSaveEdit = async () => {
    if (!editingSiswa || !selectedAspek) return;

    const nilai = parseInt(editingNilai);
    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
      showModal({ type: 'warning', title: 'Nilai Tidak Valid', message: 'Nilai harus antara 0-100.' });
      return;
    }

    const grade = gradeConfig.find(g => nilai >= g.min_nilai && nilai <= g.max_nilai);

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      };

      const payload = {
        aspek_id: selectedAspek,
        nilai: nilai,
        grade: grade?.grade || null,
        deskripsi: grade?.deskripsi || null
      };

      const res = await fetch(`${API}/kokurikuler/${editingSiswa.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSiswaList(prev => prev.map(siswa => {
          if (siswa.id === editingSiswa.id) {
            return {
              ...siswa,
              nilai: {
                ...siswa.nilai,
                [selectedAspek]: {
                  id_nilai: siswa.nilai[selectedAspek]?.id_nilai || Date.now(),
                  aspek_id: selectedAspek,
                  nilai: nilai,
                  grade: grade?.grade || null,
                  deskripsi: grade?.deskripsi || null
                }
              },
              editingNilai: nilai.toString(),
              isChanged: false
            };
          }
          return siswa;
        }));

        closeEditModal();
        showModal({ type: 'success', title: 'Tersimpan!', message: 'Nilai berhasil diperbarui.' });
      } else {
        const error = await res.json();
        throw new Error(error.message);
      }
    } catch (err: any) {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const changedSiswa = siswaList.filter(s => s.isChanged && selectedAspek);
    
    if (changedSiswa.length === 0) {
      showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Semua nilai sudah tersimpan.' });
      return;
    }

    const invalidData = changedSiswa.filter(s => {
      const nilai = parseInt(s.editingNilai);
      return isNaN(nilai) || nilai < 0 || nilai > 100;
    });

    if (invalidData.length > 0) {
      showModal({ 
        type: 'warning', 
        title: 'Nilai Tidak Valid', 
        message: `${invalidData.length} siswa memiliki nilai tidak valid (harus 0-100).` 
      });
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      };

      let successCount = 0;
      let errorCount = 0;

      for (const siswa of changedSiswa) {
        const nilai = parseInt(siswa.editingNilai);
        const grade = gradeConfig.find(g => nilai >= g.min_nilai && nilai <= g.max_nilai);
        
        const payload = {
          aspek_id: selectedAspek,
          nilai: nilai,
          grade: grade?.grade || null,
          deskripsi: grade?.deskripsi || null
        };

        try {
          const res = await fetch(`${API}/kokurikuler/${siswa.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      setSiswaList(prev => prev.map(siswa => {
        if (siswa.isChanged) {
          const nilai = parseInt(siswa.editingNilai);
          const grade = gradeConfig.find(g => nilai >= g.min_nilai && nilai <= g.max_nilai);
          return {
            ...siswa,
            nilai: {
              ...siswa.nilai,
              [selectedAspek || -1]: {
                id_nilai: siswa.nilai[selectedAspek || -1]?.id_nilai || Date.now(),
                aspek_id: selectedAspek || -1,
                nilai: nilai,
                grade: grade?.grade || null,
                deskripsi: grade?.deskripsi || null
              }
            },
            isChanged: false
          };
        }
        return siswa;
      }));

      showModal({ 
        type: successCount > 0 ? 'success' : 'error', 
        title: successCount > 0 ? 'Berhasil!' : 'Gagal', 
        message: `Tersimpan ${successCount} nilai.${errorCount > 0 ? ` Gagal: ${errorCount}` : ''}` 
      });

    } catch (err: any) {
      showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan.' });
    } finally {
      setSaving(false);
    }
  };

  // ====== FILTER ======
  const filteredSiswa = siswaList.filter(s => {
    const namaLower = (s.nama || '').toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    return namaLower.includes(queryLower) || (s.nis || '').includes(searchQuery);
  });

  const changedCount = filteredSiswa.filter(s => s.isChanged).length;

  // ====== RENDER ======
  if (loading) {
    return (
      <div className="flex-1 p-6 min-h-screen flex items-center justify-center bg-slate-50">
        <GlobalStyles />
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-orange-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 p-6 md:p-8">
      <GlobalStyles />
      {modal && <NotifModal modal={modal} onClose={closeModal} />}

      {/* Header */}
      <div className="mb-8 animate-slideDown">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Input Nilai Kokurikuler</h1>
        <p className="text-sm text-slate-600">Kelas <span className="font-semibold" style={{ color: '#F47920' }}>{kelasNama}</span> • Kelola nilai siswa dengan mudah</p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
        
        {/* Toolbar */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-orange-50/30 space-y-4">
          {/* Row 1: Select Aspek & Search */}
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Pilih Aspek Kokurikuler
              </label>
              <SelectField
                value={selectedAspek}
                onChange={(e: any) => setSelectedAspek(e.target.value ? Number(e.target.value) : null)}
                options={aspekList.map(a => ({ id: a.id_aspek_kokurikuler, name: a.nama }))}
                label="-- Pilih Aspek --"
              />
            </div>

            {selectedAspek && (
              <div className="flex-1 md:flex-0">
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Cari Siswa
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <div className="pl-9">
                    <InputText
                      value={searchQuery}
                      onChange={(e: any) => setSearchQuery(e.target.value)}
                      placeholder="Nama atau NIS..."
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Status & Action */}
          {selectedAspek && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="text-sm text-slate-600 space-y-1">
                <p className="font-medium">{filteredSiswa.length} siswa ditampilkan</p>
                {changedCount > 0 && <ChangedBadge />}
              </div>
              
              {changedCount > 0 && (
                <BtnPrimary 
                  onClick={handleSaveAll}
                  disabled={saving}
                  loading={saving}
                >
                  <Save size={16} />
                  Simpan {changedCount} Nilai
                </BtnPrimary>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {!selectedAspek ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fff7ed' }}>
              <Layers size={28} style={{ color: '#F47920' }} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Pilih Aspek untuk Mulai</h3>
            <p className="text-sm text-slate-600">Silakan pilih salah satu aspek kokurikuler di atas untuk melihat daftar siswa dan input nilai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white" style={{ background: 'linear-gradient(to right, #F47920, #E8731A)' }}>
                  <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider">No.</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider">Nama Siswa</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider">NIS</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider">Nilai</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider">Grade</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider">Deskripsi</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <p className="text-slate-500 text-sm">{searchQuery ? 'Siswa tidak ditemukan' : 'Belum ada data siswa'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((siswa, idx) => {
                    const nilaiData = siswa.nilai[selectedAspek];
                    const grade = gradeConfig.find(g => {
                      const nilai = parseInt(siswa.editingNilai);
                      return !isNaN(nilai) && nilai >= g.min_nilai && nilai <= g.max_nilai;
                    });

                    return (
                      <tr
                        key={`siswa-${siswa.id}`}
                        className={`border-b border-slate-200 transition-all duration-200 ${siswa.isChanged ? 'bg-amber-50' : ''}`}
                      >
                        <td className="px-4 py-4 text-center text-slate-500 font-medium">{idx + 1}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900">{siswa.nama}</td>
                        <td className="px-4 py-4 text-center text-slate-600 font-mono text-xs">{siswa.nis}</td>
                        <td className="px-4 py-4">
                          <InputNumber
                            value={siswa.editingNilai}
                            onChange={(e: any) => handleNilaiChange(siswa.id, e.target.value)}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          {siswa.editingNilai && grade ? (
                            <GradeBadge grade={grade.grade} deskripsi={grade.deskripsi} />
                          ) : nilaiData?.grade ? (
                            <GradeBadge grade={nilaiData.grade} deskripsi={nilaiData.deskripsi} />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-slate-600 max-w-xs">
                          {siswa.editingNilai && grade ? (
                            <span className="line-clamp-1">{grade.deskripsi}</span>
                          ) : nilaiData?.deskripsi ? (
                            <span className="line-clamp-1">{nilaiData.deskripsi}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {siswa.isChanged ? (
                            <BtnReset onClick={() => handleReset(siswa.id)} />
                          ) : (
                            <BtnEdit onClick={() => handleEdit(siswa)} />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingSiswa && (
        <div
          className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: 'linear-gradient(to right, #F47920, #E8731A)' }}>
              <h2 className="text-base font-bold text-white">Edit Nilai Siswa</h2>
              <button onClick={closeEditModal} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Student Info */}
              <div className="p-4 rounded-lg border space-y-1" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-sm font-bold" style={{ color: '#7c2d12' }}>{editingSiswa.nama}</p>
                <p className="text-xs" style={{ color: '#c2550f' }}>NIS: {editingSiswa.nis}</p>
              </div>

              {/* Nilai Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">
                  Nilai <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  value={editingNilai}
                  onChange={(e: any) => setEditingNilai(e.target.value)}
                  placeholder="0-100"
                />
                <p className="text-xs text-slate-500">Masukkan nilai antara 0 dan 100</p>
              </div>

              {/* Grade Preview */}
              {editingNilai && (() => {
                const nilai = parseInt(editingNilai);
                const grade = gradeConfig.find(g => nilai >= g.min_nilai && nilai <= g.max_nilai);
                if (grade) {
                  return (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                      <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Ringkasan Nilai</p>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white bg-emerald-500">
                          {grade.grade}
                        </span>
                        <span className="text-sm text-emerald-900">{grade.deskripsi}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
              <BtnSecondary onClick={closeEditModal} disabled={saving}>
                Batal
              </BtnSecondary>
              <BtnPrimary 
                onClick={handleSaveEdit}
                disabled={saving || !editingNilai}
                loading={saving}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}