/**
 * Nama File: rekapan_nilai_client.tsx
 * UPDATE:
 *   - Auto-sort by ranking
 *   - Detail modal dengan tema konsisten
 *   - Auto-update tanpa refresh
 *   - Hapus statistik tertinggi/terendah
 *   - Hapus indikator Lulus/Remedial
 *   - ✅ FIX: Deskripsi Capaian hanya untuk PTS, PAS cukup tanda "-"
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, X, Search, Download, Award, BookOpen } from 'lucide-react';
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

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .dg-fadeIn { animation: dg-fadeIn 0.2s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.25s ease; }
    `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <Award size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <Award size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <Award size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <Award size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring}`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
            </div>
        </div>
    );
};

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

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showDetail, setShowDetail] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaRekapan | null>(null);

    // ── FETCH DATA ─────────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (taRes.ok) {
                const taData = await taRes.json();
                const { status_pts, status_pas, semester: sem } = taData.data;
                setSemester(sem || 'Ganjil');
                if (status_pts === 'aktif') setJenisPenilaian('PTS');
                else if (status_pas === 'aktif') setJenisPenilaian('PAS');
            }

            const res = await fetch('http://localhost:5000/api/guru-kelas/rekapan-nilai', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Gagal memuat data');

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
            const res = await fetch('http://localhost:5000/api/guru-kelas/rekapan-nilai/export-excel', {
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

    // ── RENDER ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={{ background: '#fdf6f0' }}>
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-orange-700">Memuat data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 min-h-screen" style={{ background: '#fdf6f0' }}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Rekapan Nilai Rapor</h1>
                <p className="text-sm mt-1 text-orange-700">
                    Ringkasan nilai seluruh siswa per mata pelajaran beserta rata-rata dan ranking
                </p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100">
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-orange-100 bg-orange-50/30">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting || filteredSiswa.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ 
                                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                            }}
                        >
                            {exporting ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    Mengekspor...
                                </>
                            ) : (
                                <>
                                    <Download size={16} /> Ekspor Excel
                                </>
                            )}
                        </button>

                        <div className="relative min-w-[280px]">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-orange-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari nama atau NIS..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full border-2 border-orange-200 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/30 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-2 flex items-center text-orange-500 hover:text-orange-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-xs mt-3 text-orange-700">
                        Menampilkan <strong>{filteredSiswa.length}</strong> dari <strong>{siswaList.length}</strong> siswa
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white">No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-white">Nama</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white">NIS</th>
                                {mapelList.map((mapel, idx) => (
                                    <th key={idx} className="px-3 py-3 text-center text-xs font-bold text-white whitespace-nowrap">
                                        {mapel}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center text-xs font-bold text-white whitespace-nowrap">Rata-rata</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white">Ranking</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={6 + mapelList.length} className="py-12 text-center text-gray-400">
                                        {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredSiswa.map((siswa, idx) => (
                                    <tr
                                        key={siswa.id}
                                        className="border-b border-orange-100 hover:bg-orange-50/50 transition-colors"
                                        style={{ background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    >
                                        <td className="px-4 py-3 text-center text-gray-600 font-medium">{idx + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                        
                                        {mapelList.map((mapel, mapelIdx) => {
                                            const nilai = siswa.nilaiMapel[mapel];
                                            return (
                                                <td key={mapelIdx} className="px-3 py-3 text-center">
                                                    {nilai != null ? (
                                                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold"
                                                            style={{
                                                                background: '#fff7ed',
                                                                color: '#c2410c',
                                                                border: '1px solid #fdba74'
                                                            }}>
                                                            {Math.floor(nilai)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        
                                        <td className="px-4 py-3 text-center">
                                            {siswa.rataRata != null ? (
                                                <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold"
                                                    style={{
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        border: '1px solid #fcd34d'
                                                    }}>
                                                    {siswa.rataRata.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-3 text-center">
                                            {siswa.ranking ? (
                                                <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold"
                                                    style={{
                                                        background: '#fff7ed',
                                                        color: '#c2410c',
                                                        border: '1px solid #fdba74'
                                                    }}>
                                                    {siswa.ranking}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleDetail(siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{
                                                    background: '#dcfce7',
                                                    border: '1px solid #86efac',
                                                    color: '#166534'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}
                                            >
                                                <Eye size={12} /> Lihat
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ✅ MODAL DETAIL - SIMPLIFIED & THEME CONSISTENT */}
            {showDetail && selectedSiswa && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={e => { if (e.target === e.currentTarget) setShowDetail(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto dg-scaleIn">
                        
                        {/* Header */}
                        <div className="sticky top-0 px-6 py-5 rounded-t-2xl z-10"
                            style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        Detail Nilai Siswa
                                    </h2>
                                    <p className="text-sm text-orange-100 mt-1">
                                        {selectedSiswa.nama} • NIS: {selectedSiswa.nis}
                                    </p>
                                </div>
                                <button onClick={() => setShowDetail(false)}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors bg-white/10">
                                    <X size={20} className="text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* ✅ Summary Cards - 3 Kolom (Rata-rata, Ranking, Semester) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Rata-rata */}
                                <div className="p-5 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #fdba74, #fb923c)' }}>
                                            <Award size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-600 mb-1">Rata-rata Nilai</p>
                                            <p className="text-3xl font-bold truncate" style={{ color: '#c2410c' }}>
                                                {selectedSiswa.rataRata != null ? selectedSiswa.rataRata.toFixed(2) : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ranking */}
                                <div className="p-5 rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-white to-white shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #fde047, #facc15)' }}>
                                            <Award size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-600 mb-1">Ranking Kelas</p>
                                            <p className="text-3xl font-bold truncate" style={{ color: '#a16207' }}>
                                                {selectedSiswa.ranking || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Semester */}
                                <div className="p-5 rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 via-white to-white shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #86efac, #4ade80)' }}>
                                            <Award size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-600 mb-1">Semester</p>
                                            <p className="text-xl font-bold truncate" style={{ color: '#166534' }}>
                                                {semester} {jenisPenilaian ? `(${jenisPenilaian})` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ✅ Deskripsi Capaian - CONDITIONAL: PTS = deskripsi, PAS = tanda "-" */}
                            {jenisPenilaian === 'PTS' ? (
                                // PTS: Tampilkan deskripsi dari database
                                <div className="p-5 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 via-white to-white shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #fdba74, #fb923c)' }}>
                                            <BookOpen size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold" style={{ color: '#7a3a0a' }}>Deskripsi Capaian</h3>
                                            <p className="text-xs text-gray-600">Penilaian keseluruhan berdasarkan rata-rata nilai</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white border-2 border-orange-100 min-h-[100px]">
                                        <p className="text-sm leading-relaxed" style={{ color: '#7a3a0a' }}>
                                            {selectedSiswa.deskripsi || (
                                                <span className="italic text-gray-500">
                                                    Deskripsi belum diatur untuk rentang nilai ini.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                // PAS: Cukup tanda "-" saja
                                <div className="p-5 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 via-white to-white shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #d1d5db, #9ca3af)' }}>
                                            <BookOpen size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold" style={{ color: '#7a3a0a' }}>Deskripsi Capaian</h3>
                                            <p className="text-xs text-gray-600">Periode PAS tidak menggunakan deskripsi</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white border-2 border-gray-100 min-h-[100px] flex items-center justify-center">
                                        <span className="text-4xl font-bold text-gray-400">-</span>
                                    </div>
                                </div>
                            )}

                            {/* ✅ Nilai per Mata Pelajaran - TANPA LULUS/REMEDIAL */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}></div>
                                    <h3 className="text-base font-bold" style={{ color: '#7a3a0a' }}>
                                        Nilai per Mata Pelajaran
                                    </h3>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {mapelList.map((mapel, idx) => {
                                        const nilai = selectedSiswa.nilaiMapel[mapel];
                                        
                                        return (
                                            <div key={idx} 
                                                className="p-4 rounded-xl border-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                                                style={{
                                                    background: 'linear-gradient(135deg, #fff7ed, #fff)',
                                                    borderColor: '#fdba74'
                                                }}>
                                                <div className="text-xs font-bold text-gray-700 mb-2 truncate" title={mapel}>
                                                    {mapel}
                                                </div>
                                                <div className="text-2xl font-bold"
                                                    style={{ color: nilai != null ? '#c2410c' : '#d1d5db' }}>
                                                    {nilai != null ? Math.floor(nilai) : '-'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end px-6 py-4 border-t-2 border-orange-100 bg-gradient-to-r from-orange-50 to-white rounded-b-2xl sticky bottom-0">
                            <button
                                onClick={() => setShowDetail(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold border-2 border-orange-200 text-orange-700 hover:bg-orange-100 transition-all hover:shadow-md"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}