'use client';

import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import { Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface SiswaCatatan {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
    jenis_kelamin: string;
    catatan_wali_kelas: string;
    naik_tingkat: 'ya' | 'tidak' | null;
}

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

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
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

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
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

const BtnPrimary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
    >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DataCatatanWaliKelasPage() {
    const [siswaList,     setSiswaList]     = useState<SiswaCatatan[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaCatatan[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showEdit,      setShowEdit]      = useState(false);
    const [editId,        setEditId]        = useState<number | null>(null);
    const [editData,      setEditData]      = useState<{ catatan_wali_kelas: string; naik_tingkat: 'ya' | 'tidak' | null }>({ catatan_wali_kelas: '', naik_tingkat: null });
    const [originalData,  setOriginalData]  = useState<typeof editData | null>(null);
    const [searchQuery,   setSearchQuery]   = useState('');
    const [kelasNama,     setKelasNama]     = useState<string>('Kelas Anda');
    const [semester,      setSemester]      = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS'>('PAS');
    const [editClosing,   setEditClosing]   = useState(false);
    const [itemsPerPage,  setItemsPerPage]  = useState(10);
    const [currentPage,   setCurrentPage]   = useState(1);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const closeEdit = () => {
        setEditClosing(true);
        setTimeout(() => { setShowEdit(false); setEditClosing(false); setEditId(null); setOriginalData(null); }, 200);
    };

    // ── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
            try {
                const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', { headers: { Authorization: `Bearer ${token}` } });
                if (!taRes.ok) { const err = await taRes.json(); showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat periode aktif.' }); return; }
                const taData = await taRes.json();
                const { semester: sem, status_pts, status_pas } = taData.data;
                const jenis = status_pts === 'aktif' ? 'PTS' : 'PAS';
                setSemester(sem as 'Ganjil' | 'Genap');
                setJenisPenilaian(jenis as 'PTS' | 'PAS');
                await fetchCatatan(sem, jenis, token);
            } catch {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            }
        };
        loadData();
    }, []);

    const fetchCatatan = async (sem: string, jenis: string, token: string) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/guru-kelas/catatan-wali-kelas/${jenis}/${sem}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSiswaList(data.data || []);
                    setFilteredSiswa(data.data || []);
                    setKelasNama(data.kelas || 'Kelas Anda');
                } else {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data catatan wali kelas.' });
                }
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat data catatan wali kelas.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    // ── Filter ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!searchQuery.trim()) { setFilteredSiswa(siswaList); }
        else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s => s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleEdit = (siswa: SiswaCatatan) => {
        const data = { catatan_wali_kelas: siswa.catatan_wali_kelas || '', naik_tingkat: siswa.naik_tingkat };
        setEditId(siswa.id_siswa); setEditData(data); setOriginalData(data); setShowEdit(true);
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'catatan_wali_kelas') setEditData(prev => ({ ...prev, catatan_wali_kelas: value }));
        else if (name === 'naik_tingkat') setEditData(prev => ({ ...prev, naik_tingkat: value === '' ? null : value as 'ya' | 'tidak' }));
    };

    const handleSave = async () => {
        if (!editId || !originalData) return;
        const isPASGenap = jenisPenilaian === 'PAS' && semester === 'Genap';
        const hasChanges = isPASGenap
            ? editData.catatan_wali_kelas !== originalData.catatan_wali_kelas || editData.naik_tingkat !== originalData.naik_tingkat
            : editData.catatan_wali_kelas !== originalData.catatan_wali_kelas;

        if (!hasChanges) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' }); return; }

        if (isPASGenap && editData.naik_tingkat !== 'ya' && editData.naik_tingkat !== 'tidak') {
            showModal({ type: 'warning', title: 'Keputusan Wajib Diisi', message: 'Di PAS Semester Genap, keputusan naik tingkat wajib diisi.' }); return;
        }

        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir.' }); return; }

        const payload: any = { catatan_wali_kelas: editData.catatan_wali_kelas, naik_tingkat: isPASGenap ? editData.naik_tingkat : null };

        try {
            const res = await fetch(`http://localhost:5000/api/guru-kelas/catatan-wali-kelas/${editId}/${jenisPenilaian}/${semester}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setSiswaList(prev => prev.map(s => s.id_siswa === editId ? { ...s, ...payload } : s));
                closeEdit();
                showModal({ type: 'success', title: 'Catatan Disimpan!', message: 'Catatan wali kelas berhasil disimpan.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan catatan wali kelas.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // ── Pagination ─────────────────────────────────────────────────────────────
    const isPASGenap  = jenisPenilaian === 'PAS' && semester === 'Genap';
    const totalPages  = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex  = (currentPage - 1) * itemsPerPage;
    const endIndex    = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";
        pages.push(<button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>);
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
            if (p < 0) pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>);
            else pages.push(
                <button key={p} onClick={() => setCurrentPage(p)}
                    className={`${btnBase} ${currentPage === p ? 'text-white border-orange-500' : btnInactive}`}
                    style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
                >{p}</button>
            );
        });
        pages.push(<button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>);
        return pages;
    };

    // ── Naik tingkat badge ─────────────────────────────────────────────────────
    const NaikTingkatBadge = ({ value }: { value: 'ya' | 'tidak' | null }) => {
        if (!isPASGenap) return <span className="text-gray-300">–</span>;
        if (value === 'ya')    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>Ya</span>;
        if (value === 'tidak') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>Tidak</span>;
        return <span className="text-gray-300">–</span>;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Catatan Wali Kelas</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelas {kelasNama} — {jenisPenilaian} Semester {semester}
                </p>
            </div>

            {/* Info banner periode */}
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: isPASGenap ? '#eaf7ef' : '#fff0e5', border: `1px solid ${isPASGenap ? '#b6e8c8' : '#fde0c8'}` }}>
                <span className="text-base mt-0.5">{isPASGenap ? '✅' : 'ℹ️'}</span>
                <p className="text-sm font-medium" style={{ color: isPASGenap ? '#1a7a3a' : '#7a3a0a' }}>
                    {isPASGenap
                        ? 'Periode PAS Semester Genap — Isi catatan dan keputusan naik tingkat.'
                        : 'Keputusan naik tingkat hanya diisi pada periode PAS Semester Genap.'}
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                            Kelas: <span style={{ color: '#e8690a' }}>{kelasNama}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>
                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari siswa..." value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                                {searchQuery && (
                                    <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} data
                    </p>
                </div>

                {/* Tabel */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'NIS', 'NISN', 'Catatan Wali Kelas', 'Naik Tingkat', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        <span className="text-sm text-gray-400">Memuat data...</span>
                                    </div>
                                </td></tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                                    {searchQuery ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa di kelas ini.'}
                                </td></tr>
                            ) : currentSiswa.map((siswa, index) => (
                                <tr key={siswa.id_siswa} className="transition-colors"
                                    style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                    <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                    <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        {siswa.catatan_wali_kelas ? (
                                            <span className="text-xs text-gray-700 line-clamp-2 max-w-[200px] mx-auto block text-left">{siswa.catatan_wali_kelas}</span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">Belum diisi</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <NaikTingkatBadge value={siswa.naik_tingkat} />
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <button onClick={() => handleEdit(siswa)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                            <Pencil size={12} /> Edit
                                        </button>
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

            {/* ── Modal Edit ───────────────────────────────────────────────── */}
            {showEdit && editId !== null && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Modal header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Edit Catatan Wali Kelas</h2>
                            <button onClick={closeEdit} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Nama siswa */}
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg,#c95b08,#f5a623)' }}>
                                    {siswaList.find(s => s.id_siswa === editId)?.nama.charAt(0).toUpperCase() || '?'}
                                </div>
                                <p className="text-sm font-bold text-gray-800">
                                    {siswaList.find(s => s.id_siswa === editId)?.nama}
                                </p>
                            </div>

                            {/* Catatan */}
                            <div>
                                <label className={labelCls} style={labelColor}>Catatan Wali Kelas</label>
                                <textarea name="catatan_wali_kelas" value={editData.catatan_wali_kelas}
                                    onChange={handleChange} rows={5}
                                    placeholder="Contoh: Anak aktif, perlu bimbingan dalam..."
                                    className={inputCls} />
                            </div>

                            {/* Naik Tingkat */}
                            {isPASGenap ? (
                                <div>
                                    <label className={labelCls} style={labelColor}>
                                        Keputusan Naik Tingkat <span className="text-red-500">*</span>
                                    </label>
                                    <select name="naik_tingkat" value={editData.naik_tingkat || ''} onChange={handleChange}
                                        className={inputCls}>
                                        <option value="">-- Pilih Keputusan --</option>
                                        <option value="ya">Ya — Naik Tingkat</option>
                                        <option value="tidak">Tidak — Tinggal Kelas</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                                    style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                    <span className="text-sm mt-0.5">ℹ️</span>
                                    <p className="text-xs font-medium" style={{ color: '#7a3a0a' }}>
                                        Keputusan naik tingkat hanya diisi pada periode <strong>PAS Semester Genap</strong>.
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeEdit}>Batal</BtnSecondary>
                                <BtnPrimary onClick={handleSave}>Simpan</BtnPrimary>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}