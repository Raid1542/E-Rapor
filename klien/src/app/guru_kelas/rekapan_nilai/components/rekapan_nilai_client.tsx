// File: rekapan_nilai_client.tsx
// Fungsi: Komponen utama untuk menampilkan dan mengelola rekapan nilai rapor,
//         termasuk fitur lihat detail per siswa dan ekspor ke Excel.
// Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Muhammad Auriel Almayda - NIM: 3312401093
// Tanggal: 15 September 2025

'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Search, Upload, X, Eye, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SiswaRekapan {
    id: number;
    nama: string;
    nis: string;
    nilaiMapel: Record<string, number | null>;
    rataRata: number | null;
    deskripsiRataRata: string;
    ranking: number | null;
}

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

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

const PAGE_BG     = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f97316', boxShadow: '0 2px 16px rgba(200,80,10,0.15)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const RekapanNilaiClient = () => {
    const [siswaList, setSiswaList]         = useState<SiswaRekapan[]>([]);
    const [mapelList, setMapelList]         = useState<string[]>([]);
    const [loading, setLoading]             = useState(true);
    const [searchQuery, setSearchQuery]     = useState('');
    const [showDetail, setShowDetail]       = useState(false);
    const [detailSiswa, setDetailSiswa]     = useState<SiswaRekapan | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);

    // Modal notif
    const [modal, setModal]      = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ── Fetch rekapan nilai ────────────────────────────────────────────────────

    const fetchRekapanNilai = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Berakhir', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            const res  = await fetch('http://localhost:5000/api/guru-kelas/rekapan-nilai', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (res.ok && data.siswa && Array.isArray(data.mapel_list)) {
                const siswa: SiswaRekapan[] = data.siswa.map((s: any) => ({
                    id:                s.id_siswa,
                    nama:              s.nama,
                    nis:               s.nis,
                    nilaiMapel:        s.nilai_mapel || {},
                    rataRata:          s.rata_rata != null ? parseFloat(s.rata_rata.toFixed(2)) : null,
                    deskripsiRataRata: s.deskripsi_rata_rata || 'Belum ada deskripsi',
                    ranking:           s.ranking || null,
                }));
                setSiswaList(siswa);
                setMapelList(data.mapel_list);
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Memuat Data',
                    message: 'Gagal memuat rekapan nilai: ' + (data.message || 'Error tidak dikenal'),
                });
            }
        } catch (err) {
            console.error('Error fetch rekapan:', err);
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Gagal terhubung ke server. Periksa koneksi Anda.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRekapanNilai(); }, []);

    // ── Auto-refresh dari signal input nilai ──────────────────────────────────

    useEffect(() => {
        const checkForUpdate = () => {
            const lastSignal = localStorage.getItem('rekapan_perlu_update');
            const lastFetch  = localStorage.getItem('rekapan_terakhir_diambil') || '0';
            if (lastSignal && lastSignal > lastFetch) {
                fetchRekapanNilai();
                localStorage.setItem('rekapan_terakhir_diambil', lastSignal);
            }
        };
        checkForUpdate();
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'rekapan_perlu_update') checkForUpdate();
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // ── Detail ─────────────────────────────────────────────────────────────────

    const handleDetail = (siswa: SiswaRekapan) => {
        setDetailSiswa(siswa);
        setShowDetail(true);
        setDetailClosing(false);
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); setDetailSiswa(null); }, 200);
    };

    // ── Filter + sort ──────────────────────────────────────────────────────────

    const filteredSiswa = siswaList
        .filter(siswa => {
            const q = searchQuery.toLowerCase().trim();
            return !q || siswa.nama.toLowerCase().includes(q) || siswa.nis.includes(q);
        })
        .sort((a, b) => {
            if (a.ranking === null && b.ranking === null) return 0;
            if (a.ranking === null) return 1;
            if (b.ranking === null) return -1;
            return a.ranking - b.ranking;
        });

    // ── Export Excel ───────────────────────────────────────────────────────────

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem('token');
            const res   = await fetch('http://localhost:5000/api/guru-kelas/rekapan-nilai/export-excel', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Gagal ekspor');
            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `rekapan_nilai_kelas_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showModal({ type: 'success', title: 'Ekspor Berhasil!', message: 'File Excel berhasil diunduh.' });
        } catch (err) {
            showModal({ type: 'error', title: 'Gagal Ekspor', message: 'Gagal mengunduh file Excel. Coba lagi.' });
        }
    };

    // ── Nilai badge ────────────────────────────────────────────────────────────

    const NilaiBadge = ({ nilai }: { nilai: number }) => {
        const color = nilai >= 75
            ? { bg: '#eaf7ef', text: '#1a7a3a', border: '#b6e8c8' }
            : nilai >= 60
            ? { bg: '#fff0e5', text: '#c95b08', border: '#fde0c8' }
            : { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' };
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
                <h1 className="text-2xl font-bold text-gray-900">Rekapan Nilai Rapor</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Ringkasan nilai seluruh siswa per mata pelajaran beserta rata-rata dan ranking
                </p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">

                        {/* Tombol Ekspor */}
                        <button
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                            style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                        >
                            <Upload size={16} /> Ekspor Excel
                        </button>

                        {/* Search */}
                        <div className="relative min-w-[200px] sm:min-w-[240px] max-w-[400px] flex-1">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari nama atau NIS..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-2 flex items-center"
                                    style={{ color: '#c95b08' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {!loading && (
                        <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                            Menampilkan {filteredSiswa.length} dari {siswaList.length} siswa
                        </p>
                    )}
                </div>

                {/* Tabel */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" style={{ minWidth: `${300 + mapelList.length * 70}px` }}>
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No', 'Nama', 'NIS', ...mapelList, 'Rata-rata', 'Detail', 'Ranking'].map(h => (
                                    <th key={h}
                                        className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5 + mapelList.length} className="py-12 text-center text-gray-400 text-sm">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                            Memuat data rekapan...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={5 + mapelList.length} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <span className="text-3xl">📋</span>
                                            <span className="text-sm">Tidak ada data siswa</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSiswa.map((siswa, index) => (
                                    <tr
                                        key={siswa.id}
                                        className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                    >
                                        <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                        {mapelList.map(kodeMapel => (
                                            <td key={kodeMapel} className="px-3 py-3 text-center text-gray-700">
                                                {siswa.nilaiMapel[kodeMapel] !== undefined && siswa.nilaiMapel[kodeMapel] !== null
                                                    ? Math.floor(siswa.nilaiMapel[kodeMapel]!)
                                                    : <span className="text-gray-300">—</span>}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center">
                                            {siswa.rataRata !== null
                                                ? <NilaiBadge nilai={parseFloat(siswa.rataRata.toFixed(0))} />
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => handleDetail(siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                            >
                                                <Eye size={12} /> Lihat
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {siswa.ranking ? (
                                                <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                                                    style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                    #{siswa.ranking}
                                                </span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal Detail ──────────────────────────────────────────────────── */}
            {showDetail && detailSiswa && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Rekapan Nilai</h2>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Info siswa */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[
                                    { l: 'Nama',      v: detailSiswa.nama },
                                    { l: 'NIS',       v: detailSiswa.nis },
                                    { l: 'Rata-rata', v: detailSiswa.rataRata !== null ? (
                                        <NilaiBadge nilai={parseFloat(detailSiswa.rataRata.toFixed(0))} />
                                    ) : '—' },
                                    { l: 'Ranking',   v: detailSiswa.ranking ? (
                                        <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                                            style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                            #{detailSiswa.ranking}
                                        </span>
                                    ) : '—' },
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
                                    {detailSiswa.deskripsiRataRata || 'Tidak ada deskripsi'}
                                </div>
                            </div>

                            {/* Nilai per mapel */}
                            <div>
                                <p className="text-xs font-semibold mb-3" style={{ color: '#7a3a0a' }}>Nilai per Mata Pelajaran</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {mapelList.map(kodeMapel => (
                                        <div key={kodeMapel} className="rounded-xl p-3 text-center"
                                            style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                            <div className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>{kodeMapel}</div>
                                            <div className="text-xl font-bold" style={{ color: '#c95b08' }}>
                                                {detailSiswa.nilaiMapel[kodeMapel] !== undefined && detailSiswa.nilaiMapel[kodeMapel] !== null
                                                    ? Math.floor(detailSiswa.nilaiMapel[kodeMapel]!)
                                                    : <span className="text-gray-300 text-base">—</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <button
                                    onClick={closeDetail}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                    style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RekapanNilaiClient;