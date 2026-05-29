'use client';

import { useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Pencil, X, Search, Award, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface KokurikulerData {
    mutabaah_nilai: number | null;
    mutabaah_grade: string | null;
    mutabaah_deskripsi: string | null;
    bpi_nilai: number | null;
    bpi_grade: string | null;
    bpi_deskripsi: string | null;
    literasi_nilai: number | null;
    literasi_grade: string | null;
    literasi_deskripsi: string | null;
    judul_proyek_nilai: number | null;
    judul_proyek_grade: string | null;
    judul_proyek_deskripsi: string | null;
    nama_judul_proyek: string | null;
}

interface SiswaKokurikuler {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    kokurikuler: KokurikulerData;
}

const ASPEK_ID = { mutabaah: 1, literasi: 2, bpi: 3, proyek: 4 };

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

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls = "w-full border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";

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

// ─── GRADE DISPLAY ────────────────────────────────────────────────────────────

const GradeDisplay = ({ grade }: { grade: string | null }) => (
    <div className="flex items-center justify-center h-full min-h-[38px]">
        {grade ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                <Award size={12} style={{ color: '#f5a623' }} />
                {grade}
            </span>
        ) : (
            <span className="text-gray-300 text-sm">–</span>
        )}
    </div>
);

const DeskripsiDisplay = ({ text }: { text: string | null }) => (
    <div className="w-full rounded-xl px-3 py-2.5 text-sm whitespace-pre-wrap break-words min-h-[64px]"
        style={{ background: '#fffaf6', border: '1px solid #fde0c8', color: text ? '#374151' : '#9ca3af' }}>
        {text || '–'}
    </div>
);

// ─── ASPEK CARD ───────────────────────────────────────────────────────────────

const AspekCard = ({ title, nilaiField, gradeVal, deskripsiVal, onChange }: {
    title: string;
    nilaiField: string;
    gradeVal: string | null;
    deskripsiVal: string | null;
    onChange: (val: string) => void;
}) => (
    <div className="rounded-xl p-4 space-y-3" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
        <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{title}</p>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Nilai (0–100)</label>
                <input type="number" min="0" max="100" value={nilaiField} onChange={e => onChange(e.target.value)}
                    className={inputCls} placeholder="0–100" />
            </div>
            <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Grade</label>
                <GradeDisplay grade={gradeVal} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Deskripsi</label>
            <DeskripsiDisplay text={deskripsiVal} />
        </div>
    </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function KokurikulerClient() {
    const [siswaList,     setSiswaList]     = useState<SiswaKokurikuler[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showDetail,    setShowDetail]    = useState(false);
    const [isDetailClosing, setIsDetailClosing] = useState(false);
    const [detailId,      setDetailId]      = useState<number | null>(null);
    const [detailData,    setDetailData]    = useState<KokurikulerData | null>(null);
    const [searchQuery,   setSearchQuery]   = useState('');
    const [itemsPerPage,  setItemsPerPage]  = useState(10);
    const [currentPage,   setCurrentPage]   = useState(1);
    const [kelasNama,     setKelasNama]     = useState<string>('Kelas Anda');
    const [semester,      setSemester]      = useState<string>('');
    const [kelasId,       setKelasId]       = useState<number | null>(null);
    const [tahunAjaranId, setTahunAjaranId] = useState<number | null>(null);
    const [gradeConfig,   setGradeConfig]   = useState<any[]>([]);

    const [modal,      setModal]      = useState<ModalConfig | null>(null);
    const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const showModal   = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal  = useCallback(() => setModal(null), []);
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchKokurikuler = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
            const res = await fetch('http://localhost:5000/api/guru-kelas/kokurikuler', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSiswaList(data.data || []);
                    setKelasNama(data.kelas || 'Kelas Anda');
                    setSemester(data.semester || '');
                    setKelasId(data.kelasId || null);
                    setTahunAjaranId(data.tahunAjaranId || null);
                } else {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data kokurikuler.' });
                }
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat data kokurikuler.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    const fetchGradeConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/guru-kelas/atur-penilaian/kategori-kokurikuler', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { const data = await res.json(); if (data.success) setGradeConfig(data.data); }
        } catch { /* silent */ }
    };

    useEffect(() => { fetchKokurikuler(); fetchGradeConfig(); }, []);

    const getGradeByNilai = (nilai: number | null, aspekId: number) => {
        if (nilai === null) return { grade: null, deskripsi: null };
        const cfg = gradeConfig.filter(c => c.id_aspek_kokurikuler === aspekId);
        for (const c of cfg) { if (nilai >= c.min_nilai && nilai <= c.max_nilai) return { grade: c.grade, deskripsi: c.deskripsi }; }
        return { grade: null, deskripsi: null };
    };

    // ── Detail modal ───────────────────────────────────────────────────────────
    const handleDetail = (siswa: SiswaKokurikuler) => {
        setDetailId(siswa.id); setDetailData({ ...siswa.kokurikuler });
        setShowDetail(true); setIsDetailClosing(false);
    };

    const closeDetail = () => setIsDetailClosing(true);

    const handleFieldChange = (field: keyof KokurikulerData, value: string) => {
        if (!detailData) return;
        if (field.endsWith('_nilai')) {
            const numValue = value === '' ? null : Number(value);
            if (value === '' || (numValue !== null && !isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
                setDetailData(prev => ({ ...prev!, [field]: numValue }));
                let aspekId: number | null = null;
                if (field === 'mutabaah_nilai')     aspekId = ASPEK_ID.mutabaah;
                else if (field === 'bpi_nilai')      aspekId = ASPEK_ID.bpi;
                else if (field === 'literasi_nilai') aspekId = ASPEK_ID.literasi;
                else if (field === 'judul_proyek_nilai') aspekId = ASPEK_ID.proyek;
                if (aspekId !== null) {
                    const { grade, deskripsi } = getGradeByNilai(numValue, aspekId);
                    setDetailData(prev => ({
                        ...prev!,
                        [field.replace('_nilai', '_grade')]: grade,
                        [field.replace('_nilai', '_deskripsi')]: deskripsi,
                    }));
                }
            }
        } else if (field === 'nama_judul_proyek') {
            setDetailData(prev => ({ ...prev!, [field]: value }));
        }
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async (siswaId: number) => {
        if (!detailData) return;
        const original = siswaList.find(s => s.id === siswaId);
        if (!original) { showModal({ type: 'error', title: 'Data Tidak Ditemukan', message: 'Data siswa tidak ditemukan.' }); closeDetail(); return; }

        const hasChanges =
            detailData.mutabaah_nilai     !== original.kokurikuler.mutabaah_nilai ||
            detailData.bpi_nilai          !== original.kokurikuler.bpi_nilai ||
            detailData.literasi_nilai     !== original.kokurikuler.literasi_nilai ||
            detailData.judul_proyek_nilai !== original.kokurikuler.judul_proyek_nilai ||
            detailData.nama_judul_proyek  !== original.kokurikuler.nama_judul_proyek;

        if (!hasChanges) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' }); return; }

        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir.' }); return; }
            const res = await fetch(`http://localhost:5000/api/guru-kelas/kokurikuler/${siswaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    mutabaah_nilai: detailData.mutabaah_nilai,
                    bpi_nilai: detailData.bpi_nilai,
                    literasi_nilai: detailData.literasi_nilai,
                    judul_proyek_nilai: detailData.judul_proyek_nilai,
                    nama_judul_proyek: detailData.nama_judul_proyek,
                    kelasId, tahunAjaranId, semester,
                }),
            });
            if (res.ok) {
                await fetchKokurikuler();
                closeDetail();
                showModal({ type: 'success', title: 'Data Disimpan!', message: 'Nilai kokurikuler berhasil disimpan.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Gagal menyimpan data kokurikuler.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // ── Filter & pagination ────────────────────────────────────────────────────
    const filteredSiswa = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return siswaList.filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q));
    }, [siswaList, searchQuery]);

    const totalPages   = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex   = (currentPage - 1) * itemsPerPage;
    const endIndex     = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive   = "text-white border-orange-500";
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
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>); }
            else pages.push(
                <button key={p} onClick={() => setCurrentPage(p)}
                    className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                    style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
                >{p}</button>
            );
        });
        pages.push(<button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>);
        return pages;
    };

    // ── Nilai badge helper ─────────────────────────────────────────────────────
    const NilaiBadge = ({ nilai }: { nilai: number | null }) => nilai != null ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>{nilai}</span>
    ) : <span className="text-gray-300">–</span>;

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
                <h1 className="text-2xl font-bold text-gray-900">Nilai Kokurikuler Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelas {kelasNama} — Isi dan perbarui nilai kokurikuler siswa</p>
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
                                {["No.", "Nama", "NIS", "NISN", "Mutaba'ah", "BPI", "Literasi", "Judul Proyek", "Aksi"].map(h => (
                                    <th key={h} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        <span className="text-sm text-gray-400">Memuat data...</span>
                                    </div>
                                </td></tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">
                                    {searchQuery ? 'Tidak ada siswa yang cocok.' : 'Belum ada siswa di kelas ini.'}
                                </td></tr>
                            ) : currentSiswa.map((siswa, index) => (
                                <tr key={siswa.id} className="transition-colors"
                                    style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                    <td className="px-4 py-3 font-bold text-gray-800">{siswa.nama}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.kokurikuler.mutabaah_nilai} /></td>
                                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.kokurikuler.bpi_nilai} /></td>
                                    <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.kokurikuler.literasi_nilai} /></td>
                                    <td className="px-4 py-3 text-center text-xs text-gray-600 max-w-[120px] truncate" title={siswa.kokurikuler.nama_judul_proyek || ''}>
                                        {siswa.kokurikuler.nama_judul_proyek || <span className="text-gray-300">–</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => handleDetail(siswa)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                            <Pencil size={12} /> Input Nilai
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

            {/* ── Modal Detail / Input Nilai ───────────────────────────────── */}
            {showDetail && detailData && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${isDetailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
                    onTransitionEnd={() => {
                        if (isDetailClosing) { setShowDetail(false); setIsDetailClosing(false); setDetailId(null); setDetailData(null); }
                    }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${isDetailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Modal header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Input Nilai Kokurikuler</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Mutaba'ah */}
                            <AspekCard
                                title="Mutaba'ah Yaumiyah"
                                nilaiField={detailData.mutabaah_nilai?.toString() ?? ''}
                                gradeVal={detailData.mutabaah_grade}
                                deskripsiVal={detailData.mutabaah_deskripsi}
                                onChange={v => handleFieldChange('mutabaah_nilai', v)}
                            />

                            {/* BPI */}
                            <AspekCard
                                title="Mentoring BPI"
                                nilaiField={detailData.bpi_nilai?.toString() ?? ''}
                                gradeVal={detailData.bpi_grade}
                                deskripsiVal={detailData.bpi_deskripsi}
                                onChange={v => handleFieldChange('bpi_nilai', v)}
                            />

                            {/* Literasi */}
                            <AspekCard
                                title="Literasi"
                                nilaiField={detailData.literasi_nilai?.toString() ?? ''}
                                gradeVal={detailData.literasi_grade}
                                deskripsiVal={detailData.literasi_deskripsi}
                                onChange={v => handleFieldChange('literasi_nilai', v)}
                            />

                            {/* Judul Proyek */}
                            <div className="rounded-xl p-4 space-y-3" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Judul Proyek</p>
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Nama Kegiatan Proyek</label>
                                    <input type="text" value={detailData.nama_judul_proyek ?? ''}
                                        onChange={e => setDetailData(prev => ({ ...prev!, nama_judul_proyek: e.target.value }))}
                                        className={inputCls} placeholder="Contoh: Kebersihan Lingkungan" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Nilai (0–100)</label>
                                        <input type="number" min="0" max="100" value={detailData.judul_proyek_nilai?.toString() ?? ''}
                                            onChange={e => handleFieldChange('judul_proyek_nilai', e.target.value)}
                                            className={inputCls} placeholder="0–100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Grade</label>
                                        <GradeDisplay grade={detailData.judul_proyek_grade} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Deskripsi</label>
                                    <DeskripsiDisplay text={detailData.judul_proyek_deskripsi} />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Batal</BtnSecondary>
                                <BtnPrimary onClick={() => detailId && handleSave(detailId)}>Simpan</BtnPrimary>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}