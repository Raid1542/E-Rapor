
'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Eye, X, Search, Download, Award, BookOpen, AlertCircle, LogOut, Users, IdCard, Calendar } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ──────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface SiswaRekapan {
    id: number;
    nama: string;
    nis: string;
    nilaiMapel: Record<string, number | null>;
    rataRata: number | null;
    deskripsi: string | null;
    ranking: number | null;
}

/* ==========================================================================
   DESIGN TOKENS — disamakan penuh dengan ekskul_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const labelCls = 'block text-sm font-bold mb-1.5';
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   GLOBAL STYLES — identik dengan ekskul_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes dg-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .dg-fadeIn  { animation: dg-fadeIn  0.18s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.22s cubic-bezier(0.4,0,0.2,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.1s; }
        .dg-shimmer {
            background: linear-gradient(90deg, #f7f7f7 0%, #efefef 50%, #f7f7f7 100%);
            background-size: 800px 100%;
            animation: dg-shimmer 1.3s ease-in-out infinite;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0);   }
        }
        .anim-in { animation: fadeInUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.02s; }
        .d2 { animation-delay: 0.06s; }
        .d3 { animation-delay: 0.10s; }
        .row-in { animation: fadeInUp 0.28s ease forwards; opacity: 0; }

        .card-flat { transition: box-shadow 0.2s ease; }
        .card-flat:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

        .row-hover { position: relative; transition: background-color 0.15s ease; }
        .row-hover::before {
            content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
            background: ${BRAND_GRADIENT}; transform: scaleY(0); transition: transform 0.16s ease;
        }
        .row-hover:hover::before { transform: scaleY(1); }

        .btn-action { transition: box-shadow 0.16s ease, filter 0.14s ease, background 0.14s ease, opacity 0.14s ease; }
        .btn-action:hover  { filter: brightness(1.04); }
        .btn-action:active { filter: brightness(0.98); }

        .scrollbar-thin::-webkit-scrollbar { width: 5px; height: 5px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #f0c9a0; border-radius: 10px; }

        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
            outline: 2.5px solid #f5a623;
            outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
            .anim-in, .row-in, .dg-fadeIn, .dg-scaleIn, .dg-pulse, .dg-shimmer, .btn-action, .card-flat, .row-hover {
                animation: none !important;
                transition: none !important;
            }
        }
    `}</style>
);

/* ==========================================================================
   NOTIFICATION MODAL — identik dengan ekskul_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <Award size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <AlertCircle size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <AlertCircle size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <X size={18} />
                </button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                <div className="text-center w-full">
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>
                    OK, Mengerti
                </button>
            </div>
        </div>
    );
};

/* ==========================================================================
   SISTEM TOMBOL AKSI — identik dengan ekskul_client.tsx / kokurikuler_client.tsx
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
};

const ActionButton = ({
    onClick, children, variant = 'neutral', size = 'md', disabled = false, type = 'button', fullWidth = false, title,
}: {
    onClick?: () => void; children: ReactNode; variant?: BtnVariant; size?: 'md' | 'sm';
    disabled?: boolean; type?: 'button' | 'submit'; fullWidth?: boolean; title?: string;
}) => {
    const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
    return (
        <button
            type={type}
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`btn-action inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap ${pad} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={VARIANT_BASE[variant]}
        >
            {children}
        </button>
    );
};

/** Badge nilai per mapel — konsisten dengan AbsenBadge/NilaiBadge di file lain */
const NilaiMapelBadge = ({ value }: { value: number }) => (
    <span
        className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold min-w-[28px]"
        style={{ background: '#fff0e5', color: ACCENT_DARK, border: '1px solid #fde0c8' }}
    >
        {Math.floor(value)}
    </span>
);

/** Badge rata-rata / ranking — sedikit lebih tegas, memakai palet variant "accent" */
const SummaryBadge = ({ value }: { value: string | number }) => (
    <span
        className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold"
        style={{
            background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)',
            color: ACCENT_DARK,
            border: '1.5px solid #f0a94e',
        }}
    >
        {value}
    </span>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function RekapanNilaiClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [loading, setLoading] = useState(true);
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS' | null>(null);
    const [semester, setSemester] = useState<string>('Ganjil');
    const [siswaList, setSiswaList] = useState<SiswaRekapan[]>([]);
    const [mapelList, setMapelList] = useState<string[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaRekapan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [exporting, setExporting] = useState(false);

    // ✅ State untuk kondisi akses
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showDetail, setShowDetail] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaRekapan | null>(null);

    // ── FETCH DATA ─────────────────────────────────────────────────────────────
    // ✅ PERBAIKAN: Tambahkan pengecekan NOT_ASSIGNED di fetchData
    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const taRes = await fetch(`${API_BASE}/api/guru-kelas/tahun-ajaran/aktif`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (taRes.ok) {
                const taData = await taRes.json();
                const { status_pts, status_pas, semester: sem } = taData.data;
                setSemester(sem || 'Ganjil');
                if (status_pts === 'aktif') setJenisPenilaian('PTS');
                else if (status_pas === 'aktif') setJenisPenilaian('PAS');
            }

            const res = await fetch(`${API_BASE}/api/guru-kelas/rekapan-nilai`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // ✅ PERBAIKAN: Cek NOT_ASSIGNED di sini (endpoint /rekapan-nilai menggunakan middleware cekGuruKelasDitugaskan)
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 403 && errData.code === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                    return;
                }
                throw new Error(errData.message || 'Gagal memuat data');
            }

            const data = await res.json();

            if (data.success && data.siswa && Array.isArray(data.mapel_list)) {
                const siswa: SiswaRekapan[] = data.siswa.map((s: any) => ({
                    id: s.id_siswa,
                    nama: s.nama,
                    nis: s.nis || '-',
                    nilaiMapel: s.nilai_mapel || {},
                    rataRata: s.rata_rata != null ? parseFloat(s.rata_rata.toFixed(2)) : null,
                    deskripsi: s.deskripsi || null,
                    ranking: s.ranking || null,
                }));

                // ✅ AUTO-SORT BY RANKING
                const sortedSiswa = [...siswa].sort((a, b) => {
                    if (a.ranking === null && b.ranking === null) return 0;
                    if (a.ranking === null) return 1;
                    if (b.ranking === null) return -1;
                    return a.ranking - b.ranking;
                });

                setSiswaList(sortedSiswa);
                setFilteredSiswa(sortedSiswa);
                setMapelList(data.mapel_list);
                if (data.jenis_penilaian) setJenisPenilaian(data.jenis_penilaian);

                // ✅ Reset isNotAssigned jika fetch berhasil
                setIsNotAssigned(false);
            }
        } catch (err: any) {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── AUTO-REFRESH ───────────────────────────────────────────────────────────

    useEffect(() => {
        const checkForUpdate = () => {
            const lastSignal = localStorage.getItem('rekapan_perlu_update');
            const lastFetch = localStorage.getItem('rekapan_terakhir_diambil') || '0';
            if (lastSignal && lastSignal > lastFetch) {
                fetchData();
                localStorage.setItem('rekapan_terakhir_diambil', lastSignal);
            }
        };

        checkForUpdate();
        const interval = setInterval(checkForUpdate, 5000);

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'rekapan_perlu_update') checkForUpdate();
        };

        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
            clearInterval(interval);
        };
    }, [fetchData]);

    // ── FILTER ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!searchQuery.trim()) {
            const sorted = [...siswaList].sort((a, b) => {
                if (a.ranking === null && b.ranking === null) return 0;
                if (a.ranking === null) return 1;
                if (b.ranking === null) return -1;
                return a.ranking - b.ranking;
            });
            setFilteredSiswa(sorted);
        } else {
            const q = searchQuery.toLowerCase().trim();
            const filtered = siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) || s.nis.includes(q)
            );
            const sorted = filtered.sort((a, b) => {
                if (a.ranking === null && b.ranking === null) return 0;
                if (a.ranking === null) return 1;
                if (b.ranking === null) return -1;
                return a.ranking - b.ranking;
            });
            setFilteredSiswa(sorted);
        }
    }, [searchQuery, siswaList]);

    // ── HANDLERS ───────────────────────────────────────────────────────────────

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const token = localStorage.getItem('token');
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE}/api/guru-kelas/rekapan-nilai/export-excel`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Gagal ekspor');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rekapan_nilai_${jenisPenilaian || 'rapor'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showModal({ type: 'success', title: 'Ekspor Berhasil!', message: 'File Excel berhasil diunduh.' });
        } catch (err) {
            showModal({ type: 'error', title: 'Gagal Ekspor', message: 'Gagal mengunduh file Excel.' });
        } finally {
            setExporting(false);
        }
    };

    const handleDetail = (siswa: SiswaRekapan) => {
        setSelectedSiswa(siswa);
        setShowDetail(true);
    };

    // ── GRID KOLOM TABEL — dinamis mengikuti jumlah mapel ───────────────────────
    const GRID_COLS = `minmax(48px,0.5fr) minmax(170px,2.2fr) minmax(90px,0.9fr) repeat(${mapelList.length},minmax(90px,1fr)) minmax(100px,1.1fr) minmax(90px,0.9fr) minmax(100px,1fr)`;
    const totalKolom = 6 + mapelList.length;

    // ── RENDER ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-100 border-t-orange-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold" style={{ color: ACCENT_DARK }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    // ✅ KONDISI: Belum Ditugaskan → Blokir Total
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn" style={CARD_STYLE}>
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 dg-pulse">
                            <AlertCircle size={48} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Anda belum ditugaskan sebagai guru kelas di semester ini.
                                <br />
                                Silakan hubungi Administrator untuk penugasan kelas.
                            </p>
                        </div>
                        <ActionButton variant="primary" fullWidth onClick={handleLogout}>
                            <LogOut size={16} /> Logout
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* HEADER */}
            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rekapan Nilai Rapor</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">
                    Ringkasan nilai seluruh siswa per mata pelajaran beserta rata-rata dan ranking
                </p>
            </div>

            {/* TOOLBAR — card terpisah, konsisten dengan design system terbaru */}
            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <ActionButton variant="warning" disabled={exporting || filteredSiswa.length === 0} onClick={handleExportExcel}>
                        {exporting ? (
                            <>
                                <div className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin" />
                                Mengekspor...
                            </>
                        ) : (
                            <>
                                <Download size={16} /> Ekspor Excel
                            </>
                        )}
                    </ActionButton>

                    <div className="relative w-full sm:w-72 flex-shrink-0">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari nama atau NIS..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-2.5 flex items-center"
                                style={{ color: ACCENT }}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-xs mt-3 text-gray-400">
                    Menampilkan {filteredSiswa.length} dari {siswaList.length} siswa
                </p>
            </div>

            {/* TABEL — CSS grid, konsisten dengan design system terbaru */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>
                <div className="overflow-x-auto scrollbar-thin">
                    <div style={{ width: '100%', minWidth: `${820 + mapelList.length * 80}px` }}>
                        <div className="grid" style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                            <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NIS</div>
                            {mapelList.map((mapel, idx) => (
                                <div key={idx} className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">
                                    {mapel}
                                </div>
                            ))}
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Rata-rata</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Ranking</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Detail</div>
                        </div>

                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                    {Array.from({ length: totalKolom }).map((__, j) => (
                                        <div key={j} className="px-4 py-4 flex items-center justify-center">
                                            <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '55%' }} />
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : filteredSiswa.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Users size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">
                                        {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredSiswa.map((siswa, index) => (
                                <div
                                    key={siswa.id}
                                    className="grid row-in row-hover border-b transition-colors"
                                    style={{
                                        gridTemplateColumns: GRID_COLS,
                                        borderColor: '#f0f0f0',
                                        background: '#fff',
                                        animationDelay: `${Math.min(index, 8) * 0.03}s`,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                >
                                    <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{index + 1}</div>
                                    <div className="px-4 py-4 flex items-center overflow-hidden">
                                        <p className="font-bold text-gray-900 truncate" title={siswa.nama}>{siswa.nama}</p>
                                    </div>
                                    <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{siswa.nis}</div>

                                    {mapelList.map((mapel, mapelIdx) => {
                                        const nilai = siswa.nilaiMapel[mapel];
                                        return (
                                            <div key={mapelIdx} className="px-3 py-4 flex items-center justify-center">
                                                {nilai != null ? <NilaiMapelBadge value={nilai} /> : <span className="text-gray-400 text-xs">-</span>}
                                            </div>
                                        );
                                    })}

                                    <div className="px-4 py-4 flex items-center justify-center">
                                        {siswa.rataRata != null ? <SummaryBadge value={siswa.rataRata.toFixed(2)} /> : <span className="text-gray-400 text-xs">-</span>}
                                    </div>

                                    <div className="px-4 py-4 flex items-center justify-center">
                                        {siswa.ranking ? <SummaryBadge value={siswa.ranking} /> : <span className="text-gray-400 text-xs">-</span>}
                                    </div>

                                    <div className="px-4 py-4 flex items-center justify-center">
                                        <ActionButton size="sm" variant="info" onClick={() => handleDetail(siswa)}>
                                            <Eye size={13} /> Lihat
                                        </ActionButton>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DETAIL — pola card konsisten dengan design system terbaru */}
            {showDetail && selectedSiswa && (
                <div
                    className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 dg-fadeIn"
                    onClick={e => { if (e.target === e.currentTarget) setShowDetail(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>

                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-2xl" style={{ background: BRAND_GRADIENT }}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Detail Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{selectedSiswa.nama} · NIS: {selectedSiswa.nis}</p>
                            </div>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20"
                                style={{ background: 'rgba(255,255,255,0.15)' }}
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-5">
                            {/* Ringkasan: Rata-rata, Ranking, Semester */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                                            <Award size={16} style={{ color: '#c2410c' }} />
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Rata-rata Nilai</p>
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900 ml-10 sm:ml-11">
                                        {selectedSiswa.rataRata != null ? selectedSiswa.rataRata.toFixed(2) : '-'}
                                    </p>
                                </div>

                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                                            <IdCard size={16} style={{ color: '#c2410c' }} />
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Ranking Kelas</p>
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900 ml-10 sm:ml-11">
                                        {selectedSiswa.ranking || '-'}
                                    </p>
                                </div>

                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}>
                                            <Calendar size={16} style={{ color: '#c2410c' }} />
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Semester</p>
                                    </div>
                                    <p className="text-base sm:text-lg font-bold text-gray-900 ml-10 sm:ml-11">
                                        {semester} {jenisPenilaian ? `(${jenisPenilaian})` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Deskripsi Capaian — CONDITIONAL: PTS = deskripsi, PAS = tanda "-" */}
                            <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#fde0c8' }}>
                                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#fff7ed' }}>
                                    <BookOpen size={16} style={{ color: ACCENT }} />
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Deskripsi Capaian</p>
                                        <p className="text-[11px] text-gray-500">
                                            {jenisPenilaian === 'PTS' ? 'Penilaian keseluruhan berdasarkan rata-rata nilai' : 'Periode PAS tidak menggunakan deskripsi'}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white min-h-[80px] flex items-center">
                                    {jenisPenilaian === 'PTS' ? (
                                        <p className="text-sm leading-relaxed text-gray-700">
                                            {selectedSiswa.deskripsi || (
                                                <span className="italic text-gray-400">Deskripsi belum diatur untuk rentang nilai ini.</span>
                                            )}
                                        </p>
                                    ) : (
                                        <span className="text-3xl font-bold text-gray-300 mx-auto">-</span>
                                    )}
                                </div>
                            </div>

                            {/* Nilai per Mata Pelajaran */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 px-0.5 mb-3">Nilai per Mata Pelajaran</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {mapelList.map((mapel, idx) => {
                                        const nilai = selectedSiswa.nilaiMapel[mapel];
                                        return (
                                            <div key={idx} className="p-3 rounded-xl border text-center" style={{ background: '#fffaf6', borderColor: '#fde0c8' }}>
                                                <p className="text-[11px] font-bold text-gray-600 mb-1.5 truncate" title={mapel}>{mapel}</p>
                                                <p className="text-xl font-bold" style={{ color: nilai != null ? ACCENT_DARK : '#d1d5db' }}>
                                                    {nilai != null ? Math.floor(nilai) : '-'}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" onClick={() => setShowDetail(false)}>Tutup</ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}