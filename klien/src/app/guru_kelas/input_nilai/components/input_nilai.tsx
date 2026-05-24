/**
 * Nama File: input_nilai_client.tsx
 * Fungsi: Halaman untuk menginput dan mengelola nilai siswa
 *         oleh guru kelas, termasuk fitur lihat detail dan edit nilai komponen.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Muhammad Auriel Almayda - NIM: 3312401093
 * Tanggal: 15 September 2025
 * UI Redesign: Tema oranye elegan, konsisten dengan halaman guru kelas lainnya
 */

'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
    Pencil, Eye, Search, X,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface Mapel {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
    bisa_input: boolean;
}

interface NilaiSiswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    nilai_rapor: number;
    deskripsi: string;
    nilai: Record<number, number | null>;
}

interface Komponen {
    id: number;
    nama: string;
    bobot: number;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes in-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes in-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes in-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .in-fadeIn  { animation: in-fadeIn  0.2s ease; }
        .in-scaleIn { animation: in-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .in-pulse   { animation: in-pulse   0.6s ease 0.15s; }
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 in-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 in-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} in-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG    = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const disabledCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-400 outline-none bg-gray-50 border-gray-200 cursor-not-allowed";
const labelCls    = "block text-sm font-semibold mb-1.5";
const labelColor  = { color: '#7a3a0a' };

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
    <button onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const DataInputNilaiPage = () => {
    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [mapelList,           setMapelList]           = useState<Mapel[]>([]);
    const [selectedMapelId,     setSelectedMapelId]     = useState<number | null>(null);
    const [siswaList,           setSiswaList]           = useState<NilaiSiswa[]>([]);
    const [filteredSiswa,       setFilteredSiswa]       = useState<NilaiSiswa[]>([]);
    const [loading,             setLoading]             = useState(false);
    const [loadingMapel,        setLoadingMapel]        = useState(true);
    const [searchQuery,         setSearchQuery]         = useState('');
    const [kelasNama,           setKelasNama]           = useState('');
    const [currentMapel,        setCurrentMapel]        = useState<Mapel | null>(null);
    const [komponenList,        setKomponenList]        = useState<Komponen[]>([]);
    const [currentPage,         setCurrentPage]         = useState(1);

    // Modal notif
    const [modal,    setModal]    = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // Modal Detail
    const [showDetail,    setShowDetail]    = useState(false);
    const [detailSiswa,   setDetailSiswa]   = useState<NilaiSiswa | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);

    // Modal Edit Komponen
    const [editingSiswa,          setEditingSiswa]          = useState<NilaiSiswa | null>(null);
    const [editingKomponenNilai,  setEditingKomponenNilai]  = useState<Record<number, number | null>>({});
    const [editKomponenClosing,   setEditKomponenClosing]   = useState(false);
    const [saving,                setSaving]                = useState(false);

    // ── Fetch Mapel ────────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchMapel = async () => {
            setLoadingMapel(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token tidak ditemukan');
                const res = await fetch('http://localhost:5000/api/guru-kelas/mapel', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Gagal memuat mata pelajaran');
                const data = await res.json();
                setMapelList([...data.wajib, ...data.pilihan]);
            } catch (err) {
                showModal({ type: 'network', title: 'Gagal Memuat', message: 'Gagal memuat daftar mata pelajaran. Periksa koneksi Anda.' });
            } finally {
                setLoadingMapel(false);
            }
        };
        fetchMapel();
    }, [showModal]);

    // ── Fetch Komponen ─────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchKomponen = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('http://localhost:5000/api/guru-kelas/atur-penilaian/komponen', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Gagal memuat komponen');
                const data = await res.json();
                if (data.success) {
                    setKomponenList(data.data.map((k: any) => ({
                        id:    k.id_komponen,
                        nama:  k.nama_komponen,
                        bobot: k.persentase || 0,
                    })));
                }
            } catch (err) {
                console.error('Error fetch komponen:', err);
            }
        };
        fetchKomponen();
    }, []);

    // ── Fetch Nilai saat Mapel dipilih ─────────────────────────────────────────

    useEffect(() => {
        if (selectedMapelId === null) {
            setSiswaList([]); setFilteredSiswa([]); setCurrentMapel(null);
            return;
        }
        const fetchNilai = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Token tidak ditemukan');

                const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!taRes.ok) throw new Error('Gagal ambil tahun ajaran aktif');
                const taData = await taRes.json();
                const { status_pts, status_pas } = taData.data;
                setJenisPenilaianAktif(
                    status_pts === 'aktif' ? 'PTS' : status_pas === 'aktif' ? 'PAS' : null
                );

                const res = await fetch(`http://localhost:5000/api/guru-kelas/nilai/${selectedMapelId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || 'Gagal mengambil data nilai');
                }
                const data = await res.json();
                if (!data.success) throw new Error(data.message || 'Operasi gagal');
                if (!Array.isArray(data.siswaList)) throw new Error('Data siswa tidak valid');

                const fallbackKomponen: Komponen[] = [
                    { id: 1, nama: 'UH 1', bobot: 0 }, { id: 2, nama: 'UH 2', bobot: 0 },
                    { id: 3, nama: 'UH 3', bobot: 0 }, { id: 4, nama: 'UH 4', bobot: 0 },
                    { id: 5, nama: 'UH 5', bobot: 0 }, { id: 6, nama: 'PTS',  bobot: 0 },
                    { id: 7, nama: 'PAS',  bobot: 0 },
                ];
                const komp = komponenList.length > 0 ? komponenList : fallbackKomponen;

                const mapped = data.siswaList.map((s: any) => {
                    const nilaiRecord: Record<number, number | null> = {};
                    komp.forEach(k => { nilaiRecord[k.id] = s.nilai?.[k.id] ?? null; });
                    return {
                        id:          s.id,
                        nama:        s.nama,
                        nis:         s.nis,
                        nisn:        s.nisn,
                        nilai_rapor: typeof s.nilai_rapor === 'number' ? Math.floor(s.nilai_rapor) : 0,
                        deskripsi:   s.deskripsi || 'Belum ada deskripsi',
                        nilai:       nilaiRecord,
                    };
                });

                setSiswaList(mapped);
                setFilteredSiswa(mapped);
                setKelasNama(data.kelas || '');
                setCurrentMapel(mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null);
                setCurrentPage(1);
            } catch (err) {
                showModal({
                    type: 'error', title: 'Gagal Memuat Data',
                    message: 'Gagal memuat data nilai: ' + (err instanceof Error ? err.message : 'Coba lagi.'),
                });
            } finally {
                setLoading(false);
            }
        };
        fetchNilai();
    }, [selectedMapelId, komponenList, mapelList, showModal]);

    // ── Filter siswa ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (!searchQuery.trim()) { setFilteredSiswa(siswaList); return; }
        const q = searchQuery.toLowerCase().trim();
        setFilteredSiswa(siswaList.filter(s =>
            s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)
        ));
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    // ── Validasi bobot PTS ─────────────────────────────────────────────────────

    const hasInvalidBobot = () => {
        if (jenisPenilaianAktif !== 'PTS') return false;
        const ptsIds = komponenList.filter(k => k.nama.toLowerCase().includes('pts')).map(k => k.id);
        return Object.entries(editingKomponenNilai).some(([idStr, nilai]) =>
            !ptsIds.includes(Number(idStr)) && nilai != null && nilai > 0
        );
    };

    // ── Simpan nilai komponen ──────────────────────────────────────────────────

    const simpanNilaiKomponen = async () => {
        if (!editingSiswa || !selectedMapelId) return;

        for (const [idStr, nilai] of Object.entries(editingKomponenNilai)) {
            if (nilai !== null) {
                const nama = komponenList.find(k => k.id === Number(idStr))?.nama || idStr;
                if (typeof nilai !== 'number' || isNaN(nilai) || nilai < 0 || nilai > 100) {
                    showModal({ type: 'warning', title: 'Nilai Tidak Valid', message: `Nilai untuk komponen "${nama}" harus angka antara 0 dan 100.` });
                    return;
                }
                if (!Number.isInteger(nilai)) {
                    showModal({ type: 'warning', title: 'Nilai Tidak Valid', message: `Nilai untuk komponen "${nama}" harus bilangan bulat.` });
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Token tidak ditemukan');

            const res = await fetch(
                `http://localhost:5000/api/guru-kelas/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ nilai: editingKomponenNilai }),
                }
            );
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal menyimpan nilai');
            }
            const data = await res.json();
            const updated: NilaiSiswa = {
                ...editingSiswa,
                nilai:       editingKomponenNilai,
                nilai_rapor: Math.floor(data.nilai_rapor),
                deskripsi:   data.deskripsi,
            };
            setSiswaList(prev => prev.map(s => s.id === editingSiswa.id ? updated : s));
            setFilteredSiswa(prev => prev.map(s => s.id === editingSiswa.id ? updated : s));
            setEditKomponenClosing(true);
            setTimeout(() => { setEditingSiswa(null); setEditKomponenClosing(false); }, 200);
            localStorage.setItem('rekapan_perlu_update', Date.now().toString());
            showModal({ type: 'success', title: 'Nilai Disimpan!', message: `Nilai komponen untuk ${editingSiswa.nama} berhasil disimpan.` });
        } catch (err) {
            showModal({
                type: 'error', title: 'Gagal Menyimpan',
                message: 'Gagal menyimpan nilai: ' + (err instanceof Error ? err.message : 'Coba lagi.'),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDetail = (siswa: NilaiSiswa) => { setDetailSiswa(siswa); setShowDetail(true); };

    const openEditKomponen = (siswa: NilaiSiswa) => {
        setEditingSiswa(siswa);
        setEditingKomponenNilai({ ...siswa.nilai });
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200);
    };

    const closeEditKomponen = () => {
        setEditKomponenClosing(true);
        setTimeout(() => { setEditingSiswa(null); setEditKomponenClosing(false); }, 200);
    };

    // ── Pagination ─────────────────────────────────────────────────────────────

    const itemsPerPage = 10;
    const totalPages   = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex   = (currentPage - 1) * itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, startIndex + itemsPerPage);

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

    // ── Render nilai rapor badge ───────────────────────────────────────────────

    const NilaiBadge = ({ nilai }: { nilai: number }) => {
        const color = nilai >= 75 ? { bg: '#eaf7ef', text: '#1a7a3a', border: '#b6e8c8' }
            : nilai >= 60       ? { bg: '#fff0e5', text: '#c95b08', border: '#fde0c8' }
            :                     { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' };
        return (
            <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                {nilai}
            </span>
        );
    };

    // ── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola dan input nilai komponen siswa per mata pelajaran
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>

                    {/* Dropdown Mapel */}
                    <div className="mb-4">
                        <label className={labelCls} style={labelColor}>Pilih Mata Pelajaran</label>
                        {loadingMapel ? (
                            <div className="flex items-center gap-2" style={{ color: '#c95b08' }}>
                                <div className="w-4 h-4 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                                <span className="text-sm">Memuat daftar mata pelajaran...</span>
                            </div>
                        ) : (
                            <select
                                value={selectedMapelId === null ? '' : String(selectedMapelId)}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedMapelId(val ? Number(val) : null);
                                    setSearchQuery('');
                                }}
                                className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 w-full md:w-80"
                            >
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {mapelList.filter(m => m.mata_pelajaran_id != null).map(mapel => (
                                    <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                                        {mapel.nama_mapel} ({mapel.jenis})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Info kelas + search — tampil hanya jika mapel sudah dipilih */}
                    {selectedMapelId && currentMapel && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                                    Kelas: <strong>{kelasNama}</strong>
                                </span>
                                {currentMapel.bisa_input ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                                        style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                        <CheckCircle2 size={11} /> Dapat Input Nilai
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                                        <AlertCircle size={11} /> Hanya Lihat
                                    </span>
                                )}
                                {jenisPenilaianAktif && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                                        style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                        Periode: {jenisPenilaianAktif}
                                    </span>
                                )}
                            </div>

                            {/* Search */}
                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari siswa..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedMapelId && currentMapel && (
                        <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                            Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredSiswa.length)} dari {filteredSiswa.length} siswa
                        </p>
                    )}
                </div>

                {/* Empty state — belum pilih mapel */}
                {!selectedMapelId ? (
                    <div className="m-6 text-center py-10 rounded-2xl"
                        style={{ background: '#fff7f0', border: '2px dashed #fde0c8' }}>
                        <div className="text-4xl mb-3">📋</div>
                        <p className="font-semibold" style={{ color: '#c95b08' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
                        <p className="text-sm text-gray-400 mt-1">Data nilai siswa akan muncul setelah mata pelajaran dipilih.</p>
                    </div>
                ) : (
                    <>
                        {/* Tabel */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse" style={{ minWidth: `${200 + (komponenList.length * 70) + 180}px` }}>
                                <thead>
                                    <tr style={TH_GRAD}>
                                        {['No.', 'Nama Siswa', 'NIS', 'NISN',
                                            ...komponenList.map(k => k.nama),
                                            'Nilai Rapor', 'Aksi'
                                        ].map(h => (
                                            <th key={h} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                    Memuat data nilai...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentSiswa.length === 0 ? (
                                        <tr>
                                            <td colSpan={6 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                Tidak ada data siswa
                                            </td>
                                        </tr>
                                    ) : (
                                        currentSiswa.map((siswa, idx) => (
                                            <tr key={siswa.id}
                                                className="transition-colors"
                                                style={{ borderBottom: '1px solid #fde0c8', background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}
                                            >
                                                <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                                                {komponenList.map(k => (
                                                    <td key={`${siswa.id}-${k.id}`} className="px-4 py-3 text-center text-gray-700">
                                                        {siswa.nilai[k.id] !== null ? siswa.nilai[k.id] : <span className="text-gray-300">—</span>}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-center">
                                                    <NilaiBadge nilai={siswa.nilai_rapor} />
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleDetail(siswa)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                                        >
                                                            <Eye size={13} /> Lihat
                                                        </button>
                                                        {currentMapel?.bisa_input && (
                                                            <button onClick={() => openEditKomponen(siswa)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                                style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                                            >
                                                                <Pencil size={13} /> Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredSiswa.length > 0 && (
                            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <div className="flex items-center gap-1">{renderPagination()}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal Detail ─────────────────────────────────────────────────────── */}
            {showDetail && detailSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Nilai Siswa</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Info siswa */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[
                                    { l: 'Nama',        v: detailSiswa.nama },
                                    { l: 'NIS',         v: detailSiswa.nis },
                                    { l: 'NISN',        v: detailSiswa.nisn },
                                    { l: 'Nilai Rapor', v: <NilaiBadge nilai={detailSiswa.nilai_rapor} /> },
                                ].map((item, i) => (
                                    <div key={i} className="pb-2" style={{ borderBottom: '1px solid #fde0c8' }}>
                                        <span className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>{item.l}</span>
                                        <div className="text-sm font-medium text-gray-800 mt-0.5">{item.v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Deskripsi */}
                            <div className="mb-6">
                                <p className="text-xs font-semibold mb-2" style={{ color: '#7a3a0a' }}>Deskripsi</p>
                                <div className="text-sm text-gray-700 rounded-xl p-4 whitespace-pre-wrap break-words"
                                    style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    {detailSiswa.deskripsi || 'Tidak ada deskripsi'}
                                </div>
                            </div>

                            {/* Nilai komponen */}
                            <div>
                                <p className="text-xs font-semibold mb-3" style={{ color: '#7a3a0a' }}>Nilai Komponen</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {komponenList.map(k => (
                                        <div key={k.id} className="rounded-xl p-3 text-center"
                                            style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                            <div className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>{k.nama}</div>
                                            <div className="text-xl font-bold" style={{ color: '#c95b08' }}>
                                                {detailSiswa.nilai[k.id] !== null ? detailSiswa.nilai[k.id] : <span className="text-gray-300 text-base">—</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                                {currentMapel?.bisa_input && (
                                    <button
                                        onClick={() => { openEditKomponen(detailSiswa); closeDetail(); }}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                        style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                                    >
                                        <Pencil size={14} /> Edit Nilai
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Edit Komponen ───────────────────────────────────────────────── */}
            {editingSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editKomponenClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEditKomponen(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editKomponenClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Edit Nilai Komponen</h2>
                            <button onClick={closeEditKomponen} className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Info siswa */}
                            <div className="rounded-xl p-3 mb-5" style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                <p className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>Siswa</p>
                                <p className="text-sm font-bold text-gray-800 mt-0.5">{editingSiswa.nama}</p>
                            </div>

                            {/* Periode info */}
                            {jenisPenilaianAktif && (
                                <div className="rounded-xl p-3 mb-5 flex items-center gap-2"
                                    style={{ background: '#fff7f0', border: '1px solid #fde0c8' }}>
                                    <AlertCircle size={14} style={{ color: '#e8690a' }} />
                                    <p className="text-xs" style={{ color: '#7a3a0a' }}>
                                        Periode aktif: <strong>{jenisPenilaianAktif}</strong>.
                                        {jenisPenilaianAktif === 'PTS'
                                            ? ' Hanya nilai PTS yang dapat diubah.'
                                            : ' Nilai PTS tidak dapat diubah.'}
                                    </p>
                                </div>
                            )}

                            {/* Input per komponen */}
                            <div className="space-y-3 mb-6">
                                {komponenList.map(komponen => {
                                    const isPtsKomponen = /PTS/i.test(komponen.nama);
                                    const isDisabled =
                                        (jenisPenilaianAktif === 'PTS' && !isPtsKomponen) ||
                                        (jenisPenilaianAktif === 'PAS' && isPtsKomponen);
                                    return (
                                        <div key={komponen.id} className="flex flex-col gap-1.5">
                                            <label className={labelCls} style={isDisabled ? { color: '#9ca3af' } : labelColor}>
                                                {komponen.nama}
                                                {komponen.bobot > 0 && (
                                                    <span className="ml-2 text-xs font-normal text-gray-400">({komponen.bobot}%)</span>
                                                )}
                                            </label>
                                            <input
                                                type="number" min="0" max="100" step="1"
                                                value={editingKomponenNilai[komponen.id] ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const num = parseFloat(val);
                                                    setEditingKomponenNilai(prev => ({
                                                        ...prev,
                                                        [komponen.id]: val === '' ? null : (isNaN(num) ? null : Math.floor(num))
                                                    }));
                                                }}
                                                disabled={isDisabled}
                                                className={isDisabled ? disabledCls : inputCls}
                                                placeholder="0 – 100"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeEditKomponen}>Batal</BtnSecondary>
                                <button
                                    onClick={simpanNilaiKomponen}
                                    disabled={saving || hasInvalidBobot()}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                                    onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; }}
                                    onMouseLeave={e => { if (!saving) e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; }}
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataInputNilaiPage;