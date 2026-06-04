
'use client';

import { useState, useEffect, ReactNode, useCallback } from 'react';
import { Eye, Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface EkskulItem { id: number; nama: string; deskripsi: string; }
interface SiswaEkskul { id: number; nama: string; nis: string; nisn: string; jenis_kelamin: string; ekskul: EkskulItem[]; jumlah_ekskul: number; }
interface EkskulOption { id_ekskul: number; nama_ekskul: string; }

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
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl border font-semibold text-sm"
                    style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>Batal</button>
                <button onClick={onConfirm} className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>Ya, Lanjutkan</button>
            </div>
        </div>
    </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG     = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f97316', boxShadow: '0 2px 16px rgba(200,80,10,0.15)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls   = "w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const labelCls   = "block text-xs font-semibold mb-1";
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

export default function DataEkstrakurikulerPage() {
    const [siswaList,     setSiswaList]     = useState<SiswaEkskul[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaEkskul[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showEdit,      setShowEdit]      = useState(false);
    const [showView,      setShowView]      = useState(false);
    const [editId,        setEditId]        = useState<number | null>(null);
    const [viewSiswa,     setViewSiswa]     = useState<SiswaEkskul | null>(null);
    const [editData,      setEditData]      = useState<{ ekskulList: { ekskul_id: number; deskripsi: string }[] }>({ ekskulList: [] });
    const [searchQuery,   setSearchQuery]   = useState('');
    const [kelasNama,     setKelasNama]     = useState<string>('Kelas Anda');
    const [editClosing,   setEditClosing]   = useState(false);
    const [viewClosing,   setViewClosing]   = useState(false);
    const [itemsPerPage,  setItemsPerPage]  = useState(10);
    const [currentPage,   setCurrentPage]   = useState(1);
    const [daftarEkskul,  setDaftarEkskul]  = useState<EkskulOption[]>([]);

    const [modal,      setModal]      = useState<ModalConfig | null>(null);
    const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const showModal   = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal  = useCallback(() => setModal(null), []);
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

    // ── Close modals ───────────────────────────────────────────────────────────
    const closeEdit = () => { setEditClosing(true); setTimeout(() => { setShowEdit(false); setEditClosing(false); setEditId(null); }, 200); };
    const closeView = () => { setViewClosing(true); setTimeout(() => { setShowView(false); setViewClosing(false); setViewSiswa(null); }, 200); };

    // ── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchEkskul = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
                const res = await fetch('http://localhost:5000/api/guru-kelas/ekskul', { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setSiswaList(data.data || []);
                        setFilteredSiswa(data.data || []);
                        setDaftarEkskul(data.daftar_ekskul || []);
                        setKelasNama(data.kelas || 'Kelas Anda');
                    } else {
                        showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data ekstrakurikuler.' });
                    }
                } else {
                    const err = await res.json();
                    showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat data ekstrakurikuler.' });
                }
            } catch {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            } finally {
                setLoading(false);
            }
        };
        fetchEkskul();
    }, []);

    // ── Filter pencarian ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!searchQuery.trim()) { setFilteredSiswa(siswaList); }
        else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s => s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleEdit = (siswa: SiswaEkskul) => {
        const ekskulList = siswa.ekskul.map(e => ({ ekskul_id: e.id, deskripsi: e.deskripsi }));
        while (ekskulList.length < 3) ekskulList.push({ ekskul_id: 0, deskripsi: '' });
        setEditId(siswa.id); setEditData({ ekskulList }); setShowEdit(true);
    };

    const handleView = (siswa: SiswaEkskul) => { setViewSiswa(siswa); setShowView(true); };

    const handleSave = async () => {
        if (!editId) return;
        const validEkskul = editData.ekskulList.filter(item => item.ekskul_id > 0);
        if (validEkskul.length > 3) { showModal({ type: 'warning', title: 'Batas Terlampaui', message: 'Maksimal 3 ekstrakurikuler per siswa.' }); return; }
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir.' }); return; }
            const res = await fetch(`http://localhost:5000/api/guru-kelas/ekskul/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ekskulList: validEkskul }),
            });
            if (res.ok) {
                const updatedSiswa = siswaList.map(s =>
                    s.id === editId ? {
                        ...s, ekskul: validEkskul.map(e => ({
                            id: e.ekskul_id,
                            nama: daftarEkskul.find(d => d.id_ekskul === e.ekskul_id)?.nama_ekskul || '—',
                            deskripsi: e.deskripsi,
                        }))
                    } : s
                );
                setSiswaList(updatedSiswa);
                closeEdit();
                showModal({ type: 'success', title: 'Data Disimpan!', message: 'Data ekstrakurikuler berhasil disimpan.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan data ekstrakurikuler.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const handleEkskulChange = (index: number, field: 'ekskul_id' | 'deskripsi', value: string | number) => {
        const newList = [...editData.ekskulList];
        newList[index] = { ...newList[index], [field]: value };
        setEditData({ ekskulList: newList });
    };

    const handleRemove = (index: number) => {
        const newList = [...editData.ekskulList];
        newList[index] = { ekskul_id: 0, deskripsi: '' };
        setEditData({ ekskulList: newList });
    };

    // ── Pagination ─────────────────────────────────────────────────────────────
    const totalPages   = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex   = (currentPage - 1) * itemsPerPage;
    const endIndex     = startIndex + itemsPerPage;
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

    // ── Render ────────────────────────────────────────────────────────────────
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

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Ekstrakurikuler Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelas {kelasNama} — Kelola ekstrakurikuler siswa (maks. 3 per siswa)</p>
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
                    <table className="w-full min-w-[700px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'NIS', 'NISN', 'Ekstrakurikuler', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        <span className="text-sm text-gray-400">Memuat data...</span>
                                    </div>
                                </td></tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                                    {searchQuery ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa di kelas ini.'}
                                </td></tr>
                            ) : currentSiswa.map((siswa, index) => (
                                <tr key={siswa.id} className="transition-colors"
                                    style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                    <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                    <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                                    <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        {siswa.ekskul.length === 0 ? (
                                            <span className="text-xs text-gray-300">Belum diisi</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {siswa.ekskul.map((e, i) => (
                                                    <span key={i} title={e.deskripsi || 'Tidak ada deskripsi'}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold max-w-[130px] truncate cursor-help"
                                                        style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                                        {e.nama}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleView(siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                <Eye size={12} /> Detail
                                            </button>
                                            <button onClick={() => handleEdit(siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                                <Pencil size={12} /> Edit
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

            {/* ── Modal View (Detail) ──────────────────────────────────────── */}
            {showView && viewSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${viewClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeView(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${viewClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Ekstrakurikuler</h2>
                            <button onClick={closeView} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Info siswa */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-5 pb-5" style={{ borderBottom: '1px solid #fde0c8' }}>
                                {[
                                    { label: 'Nama',  value: viewSiswa.nama },
                                    { label: 'NIS',   value: viewSiswa.nis },
                                    { label: 'NISN',  value: viewSiswa.nisn },
                                ].map(item => (
                                    <div key={item.label}>
                                        <p className="text-xs font-semibold mb-0.5" style={{ color: '#7a3a0a' }}>{item.label}</p>
                                        <p className="text-sm font-medium text-gray-800">{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Daftar ekskul */}
                            <p className="text-sm font-bold mb-3 text-gray-800">Ekstrakurikuler yang Diikuti</p>
                            {viewSiswa.ekskul.length === 0 ? (
                                <div className="text-center py-8 rounded-xl" style={{ background: '#fffaf6', border: '2px dashed #fde0c8' }}>
                                    <p className="text-sm text-gray-400">Belum mengikuti ekstrakurikuler</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {viewSiswa.ekskul.map((e, i) => (
                                        <div key={i} className="rounded-xl p-4"
                                            style={{ background: '#eaf7ef', border: '1px solid #b6e8c8' }}>
                                            <p className="text-sm font-bold mb-1.5" style={{ color: '#1a7a3a' }}>{e.nama}</p>
                                            <p className="text-xs text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
                                                {e.deskripsi || <span className="text-gray-400 italic">Tidak ada deskripsi</span>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeView}>Tutup</BtnSecondary>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Edit ───────────────────────────────────────────────── */}
            {showEdit && editId !== null && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Edit Ekstrakurikuler</h2>
                            <button onClick={closeEdit} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs text-gray-500">Pilih hingga 3 ekstrakurikuler dan tambahkan deskripsi aktivitas siswa.</p>

                            {editData.ekskulList.map((item, idx) => (
                                <div key={idx} className="rounded-xl p-4" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold" style={{ color: '#7a3a0a' }}>Ekstrakurikuler {idx + 1}</p>
                                        {item.ekskul_id > 0 && (
                                            <button type="button" onClick={() => handleRemove(idx)}
                                                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
                                                style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}>
                                                <X size={12} /> Hapus
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className={labelCls} style={labelColor}>Pilih Ekstrakurikuler</label>
                                            <select value={item.ekskul_id}
                                                onChange={e => handleEkskulChange(idx, 'ekskul_id', Number(e.target.value))}
                                                className={inputCls}>
                                                <option value={0}>-- Pilih --</option>
                                                {daftarEkskul.map(opt => (
                                                    <option key={opt.id_ekskul} value={opt.id_ekskul}>{opt.nama_ekskul}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls} style={labelColor}>Deskripsi Aktivitas</label>
                                            <textarea value={item.deskripsi}
                                                onChange={e => handleEkskulChange(idx, 'deskripsi', e.target.value)}
                                                placeholder="Tuliskan deskripsi aktivitas siswa..."
                                                className={inputCls} rows={2} />
                                        </div>
                                    </div>
                                </div>
                            ))}

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