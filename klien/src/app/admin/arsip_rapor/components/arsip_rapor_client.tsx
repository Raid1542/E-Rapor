/**
 * Nama File: arsip_rapor_client.tsx
 * Fungsi: Komponen klien untuk mengelola arsip rapor oleh admin,
 *         mencakup pemilihan tahun ajaran, jenis penilaian (PTS/PAS), kelas,
 *         pengelolaan status (aktif/nonaktif/selesai), dan unduh dokumen rapor.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UI Redesign: Konsisten dengan tema oranye elegan
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, AlertCircle, Play, Pause, Lock, CheckCircle2, WifiOff, ShieldAlert, X } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes ar-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ar-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ar-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .ar-fadeIn  { animation: ar-fadeIn  0.2s ease; }
    .ar-scaleIn { animation: ar-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .ar-pulse   { animation: ar-pulse   0.6s ease 0.15s; }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ar-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ar-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ar-pulse`}>{s.icon}</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ar-fadeIn">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ar-scaleIn">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 ar-pulse">
                <ShieldAlert size={40} className="text-orange-500" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Konfirmasi</h3>
                <p className="text-sm text-gray-500 leading-relaxed mt-2 whitespace-pre-line">{message}</p>
            </div>
            <div className="flex gap-3 w-full">
                <button onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors"
                    style={{ borderColor: '#fde0c8', color: '#7a3a0a' }}>
                    Batal
                </button>
                <button onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-colors"
                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)' }}>
                    Ya, Lanjutkan
                </button>
            </div>
        </div>
    </div>
);

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const PAGE_BG    = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const selectCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200";

const btnPrimary = {
    base:  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: 'Ganjil' | 'Genap';
    is_aktif: boolean;
    status_pts: 'nonaktif' | 'aktif' | 'selesai';
    status_pas: 'nonaktif' | 'aktif' | 'selesai';
}

interface Kelas {
    id_kelas: number;
    nama_kelas: string;
}

interface Siswa {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ArsipRaporClient() {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const [tahunAjaranList,       setTahunAjaranList]       = useState<TahunAjaran[]>([]);
    const [kelasList,             setKelasList]             = useState<Kelas[]>([]);
    const [siswaList,             setSiswaList]             = useState<Siswa[]>([]);
    const [selectedTahunAjaran,   setSelectedTahunAjaran]   = useState<number | null>(null);
    const [selectedJenisPenilaian,setSelectedJenisPenilaian]= useState<'PTS' | 'PAS' | null>(null);
    const [selectedKelas,         setSelectedKelas]         = useState<number | null>(null);
    const [loadingTA,             setLoadingTA]             = useState(true);
    const [loadingKelas,          setLoadingKelas]          = useState(false);
    const [loadingSiswa,          setLoadingSiswa]          = useState(false);
    const [loadingAction,         setLoadingAction]         = useState(false);

    const [modal,      setModal]      = useState<ModalConfig | null>(null);
    const [confirmCfg, setConfirmCfg] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const showModal   = (cfg: ModalConfig) => setModal(cfg);
    const closeModal  = () => setModal(null);
    const showConfirm = (message: string, onConfirm: () => void) => setConfirmCfg({ message, onConfirm });

    // ── Fetch Tahun Ajaran ─────────────────────────────────────────────────────
    const fetchTahunAjaran = async () => {
        setLoadingTA(true);
        try {
            const res  = await fetch(`${API_BASE}/admin/arsip-rapor/tahun-ajaran`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTahunAjaranList(data.data.map((ta: any) => ({
                    id: ta.id_tahun_ajaran,
                    tahun_ajaran: ta.tahun_ajaran,
                    semester: ta.semester as 'Ganjil' | 'Genap',
                    is_aktif: ta.status === 'aktif',
                    status_pts: ta.status_pts,
                    status_pas: ta.status_pas,
                })));
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Gagal memuat tahun ajaran.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingTA(false);
        }
    };

    // ── Fetch Kelas ────────────────────────────────────────────────────────────
    const fetchKelasByTA = async (tahunAjaranId: number) => {
        setLoadingKelas(true);
        try {
            const res  = await fetch(`${API_BASE}/admin/arsip-rapor/kelas?tahun_ajaran_id=${tahunAjaranId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setKelasList(data.data);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Kelas', message: data.message || 'Gagal memuat daftar kelas.' });
                setKelasList([]);
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            setKelasList([]);
        } finally {
            setLoadingKelas(false);
        }
    };

    // ── Fetch Siswa ────────────────────────────────────────────────────────────
    const fetchDaftarSiswa = async () => {
        if (!selectedTahunAjaran || !selectedKelas) { setSiswaList([]); return; }
        setLoadingSiswa(true);
        try {
            const res  = await fetch(
                `${API_BASE}/admin/arsip-rapor/daftar-siswa/${selectedTahunAjaran}/${selectedKelas}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            const data = await res.json();
            if (res.ok && data.success) {
                setSiswaList(data.data);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Siswa', message: data.message || 'Gagal memuat daftar siswa.' });
                setSiswaList([]);
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
            setSiswaList([]);
        } finally {
            setLoadingSiswa(false);
        }
    };

    // ── Arsipkan Rapor ─────────────────────────────────────────────────────────
    const handleArsipkanRapor = async () => {
        if (!selectedTahunAjaran || !selectedJenisPenilaian) return;
        const ta = tahunAjaranList.find(t => t.id === selectedTahunAjaran);
        if (!ta) return;
        setLoadingAction(true);
        try {
            const res  = await fetch(`${API_BASE}/admin/arsipkan-rapor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ jenis: selectedJenisPenilaian, semester: ta.semester, tahun_ajaran_id: selectedTahunAjaran }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showModal({ type: 'success', title: 'Berhasil Diarsipkan!', message: 'Rapor berhasil diarsipkan dan dikunci.' });
                fetchTahunAjaran();
            } else {
                showModal({ type: 'error', title: 'Gagal Mengarsipkan', message: data.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingAction(false);
        }
    };

    // ── Ubah Status ────────────────────────────────────────────────────────────
    const handleUbahStatus = async (statusBaru: 'aktif' | 'nonaktif' | 'selesai') => {
        if (!selectedTahunAjaran || !selectedJenisPenilaian) return;
        setLoadingAction(true);
        try {
            const res  = await fetch(`${API_BASE}/admin/atur-status-penilaian`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ jenis: selectedJenisPenilaian, status: statusBaru, tahun_ajaran_id: selectedTahunAjaran }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showModal({ type: 'success', title: 'Status Diperbarui!', message: `Status berhasil diubah menjadi "${statusBaru}".` });
                fetchTahunAjaran();
            } else {
                showModal({ type: 'error', title: 'Gagal Mengubah Status', message: data.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoadingAction(false);
        }
    };

    // ── Download Rapor ─────────────────────────────────────────────────────────
    const handleDownloadRapor = async (siswaId: number) => {
        if (!selectedJenisPenilaian || !selectedTahunAjaran) {
            showModal({ type: 'warning', title: 'Data Tidak Lengkap', message: 'Pastikan semua filter sudah dipilih.' });
            return;
        }
        const ta = tahunAjaranList.find(t => t.id === selectedTahunAjaran);
        if (!ta) return;
        try {
            const res = await fetch(
                `${API_BASE}/guru-kelas/generate-rapor/${siswaId}/${selectedJenisPenilaian}/${ta.semester}/${selectedTahunAjaran}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Gagal mengunduh rapor');
            }
            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `rapor_${selectedJenisPenilaian.toLowerCase()}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            showModal({ type: 'error', title: 'Gagal Mengunduh', message: err.message || 'Coba lagi nanti.' });
        }
    };

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => { fetchTahunAjaran(); }, []);

    useEffect(() => {
        if (selectedTahunAjaran) { fetchKelasByTA(selectedTahunAjaran); }
        else { setKelasList([]); setSelectedKelas(null); }
    }, [selectedTahunAjaran]);

    useEffect(() => {
        if (selectedKelas) { fetchDaftarSiswa(); }
        else { setSiswaList([]); }
    }, [selectedKelas]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const ta             = tahunAjaranList.find(t => t.id === selectedTahunAjaran);
    const statusSaatIni  = selectedJenisPenilaian === 'PTS' ? ta?.status_pts : ta?.status_pas;
    const readyToPrint   = selectedTahunAjaran && selectedJenisPenilaian && selectedKelas;

    const getStatusStyle = (status?: string) => {
        switch (status) {
            case 'aktif':    return { bg: '#dcfce7', color: '#15803d', border: '#86efac', dot: '#22c55e',  text: 'Aktif' };
            case 'selesai':  return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', dot: '#9ca3af',  text: 'Terkunci' };
            case 'nonaktif': return { bg: '#fef9c3', color: '#92400e', border: '#fde68a', dot: '#eab308',  text: 'Belum Dibuka' };
            default:         return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', dot: '#9ca3af',  text: 'Tidak Valid' };
        }
    };

    const statusStyle = getStatusStyle(statusSaatIni);

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal      && <NotifModal modal={modal} onClose={closeModal} />}
            {confirmCfg && (
                <ConfirmModal
                    message={confirmCfg.message}
                    onConfirm={() => { confirmCfg.onConfirm(); setConfirmCfg(null); }}
                    onCancel={() => setConfirmCfg(null)}
                />
            )}

            {/* Page Title */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Arsip Rapor</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola status penilaian dan unduh rapor siswa</p>
            </div>

            {/* ── CARD FILTER ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl overflow-hidden mb-6" style={CARD_STYLE}>
                {/* Card Header */}
                <div className="px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white">Filter Arsip Rapor</h2>
                </div>

                {/* Filter Fields */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                        {/* Tahun Ajaran */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Tahun Ajaran</label>
                            <select
                                value={selectedTahunAjaran ?? ''}
                                onChange={e => setSelectedTahunAjaran(e.target.value ? Number(e.target.value) : null)}
                                className={selectCls}
                                disabled={loadingTA}
                            >
                                <option value="">-- Pilih Tahun Ajaran --</option>
                                {tahunAjaranList
                                    .sort((a, b) => (b.is_aktif ? 1 : 0) - (a.is_aktif ? 1 : 0))
                                    .map(ta => (
                                        <option key={ta.id} value={ta.id}>
                                            {ta.tahun_ajaran} {ta.semester}{ta.is_aktif ? ' (Aktif)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Jenis Penilaian */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Jenis Penilaian</label>
                            <select
                                value={selectedJenisPenilaian ?? ''}
                                onChange={e => setSelectedJenisPenilaian(e.target.value as 'PTS' | 'PAS' | null)}
                                className={selectCls}
                                disabled={!selectedTahunAjaran}
                            >
                                <option value="">-- Pilih Jenis --</option>
                                <option value="PTS">PTS (Penilaian Tengah Semester)</option>
                                <option value="PAS">PAS (Penilaian Akhir Semester)</option>
                            </select>
                        </div>

                        {/* Kelas */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Kelas</label>
                            <select
                                value={selectedKelas ?? ''}
                                onChange={e => setSelectedKelas(e.target.value ? Number(e.target.value) : null)}
                                className={selectCls}
                                disabled={!selectedJenisPenilaian || loadingKelas}
                            >
                                <option value="">-- Pilih Kelas --</option>
                                {kelasList.map(k => (
                                    <option key={k.id_kelas} value={k.id_kelas}>{k.nama_kelas}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ── Panel Kontrol Status ─────────────────────────────── */}
                    {selectedTahunAjaran && selectedJenisPenilaian && (
                        <div className="pt-5" style={{ borderTop: '1px solid #fde0c8' }}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Status Badge */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                                        Status Saat Ini:
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                                            style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusStyle.dot }} />
                                            {statusStyle.text}
                                        </span>
                                        {statusSaatIni === 'selesai' && <Lock size={16} style={{ color: '#6b7280' }} />}
                                    </div>
                                </div>

                                {/* Tombol Aksi */}
                                <div className="flex flex-wrap gap-2">
                                    {statusSaatIni !== 'aktif' && statusSaatIni !== 'selesai' && (
                                        <button
                                            onClick={() => showConfirm(
                                                `Yakin ingin mengaktifkan ${selectedJenisPenilaian}?\n\nGuru akan bisa mengedit nilai.`,
                                                () => handleUbahStatus('aktif')
                                            )}
                                            disabled={loadingAction}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                                            style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 3px 10px rgba(22,163,74,0.25)' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#15803d,#16a34a)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#16a34a,#22c55e)')}>
                                            <Play size={15} /> Aktifkan
                                        </button>
                                    )}

                                    {statusSaatIni === 'aktif' && (
                                        <>
                                            <button
                                                onClick={() => showConfirm(
                                                    `Yakin ingin menonaktifkan ${selectedJenisPenilaian}?\n\nGuru tidak akan bisa mengedit nilai sementara.`,
                                                    () => handleUbahStatus('nonaktif')
                                                )}
                                                disabled={loadingAction}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                                                style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', boxShadow: '0 3px 10px rgba(217,119,6,0.25)' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#b45309,#d97706)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#d97706,#f59e0b)')}>
                                                <Pause size={15} /> Nonaktifkan
                                            </button>

                                            <button
                                                onClick={() => showConfirm(
                                                    `⚠️ PERHATIAN!\n\nYakin ingin mengarsipkan dan mengunci ${selectedJenisPenilaian}?\n\nSetelah dikunci, guru TIDAK BISA mengedit nilai lagi dan data akan permanen terkunci.`,
                                                    handleArsipkanRapor
                                                )}
                                                disabled={loadingAction}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                                                style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: '0 3px 10px rgba(220,38,38,0.25)' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#b91c1c,#dc2626)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#dc2626,#ef4444)')}>
                                                <Lock size={15} /> Arsipkan &amp; Kunci
                                            </button>
                                        </>
                                    )}

                                    {statusSaatIni === 'selesai' && (
                                        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                                            style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' }}>
                                            <Lock size={15} /> Data Terkunci Permanen
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-4 p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                    <span className="font-semibold">Info: </span>
                                    {statusSaatIni === 'nonaktif' && 'Penilaian belum dibuka. Guru tidak bisa input nilai.'}
                                    {statusSaatIni === 'aktif'    && 'Penilaian sedang aktif. Guru bisa input/edit nilai.'}
                                    {statusSaatIni === 'selesai'  && 'Penilaian sudah ditutup dan dikunci. Data tidak bisa diubah.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── AREA DAFTAR SISWA ────────────────────────────────────────── */}
            {!readyToPrint ? (
                /* Placeholder belum pilih filter */
                <div className="bg-white rounded-2xl py-12 text-center" style={{ ...CARD_STYLE, border: '2px dashed #fde0c8' }}>
                    <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#f5a623' }} />
                    <h3 className="text-base font-semibold mb-1" style={{ color: '#c95b08' }}>
                        Pilih Filter untuk Melihat Data
                    </h3>
                    <p className="text-sm text-gray-400">
                        Silakan pilih tahun ajaran, jenis penilaian, dan kelas untuk menampilkan arsip rapor.
                    </p>
                </div>
            ) : loadingSiswa ? (
                /* Loading */
                <div className="bg-white rounded-2xl py-12 text-center" style={CARD_STYLE}>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data arsip rapor...</span>
                    </div>
                </div>
            ) : siswaList.length === 0 ? (
                /* Kosong */
                <div className="bg-white rounded-2xl py-12 text-center" style={{ ...CARD_STYLE, border: '2px dashed #fde0c8' }}>
                    <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#f5a623' }} />
                    <h3 className="text-base font-semibold mb-1" style={{ color: '#c95b08' }}>Data Tidak Ditemukan</h3>
                    <p className="text-sm text-gray-400">Tidak ada data arsip rapor untuk filter yang dipilih.</p>
                </div>
            ) : (
                /* Tabel Siswa */
                <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                    {/* Table Header */}
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                        <h2 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>
                            Daftar Siswa — {selectedJenisPenilaian}
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: '#c95b08' }}>
                            {siswaList.length} siswa ditemukan
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm border-collapse">
                            <thead>
                                <tr style={TH_GRAD}>
                                    {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Aksi'].map(h => (
                                        <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {siswaList.map((siswa, index) => (
                                    <tr key={siswa.id_siswa} className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{index + 1}</td>
                                        <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-600 font-mono">{siswa.nis}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-600 font-mono">{siswa.nisn}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <button
                                                onClick={() => handleDownloadRapor(siswa.id_siswa)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                <Download size={13} /> Unduh
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Catatan Unduhan */}
                    <div className="px-5 py-4" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                        <div className="flex items-start gap-2">
                            <FileText size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#c95b08' }} />
                            <div>
                                <p className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Informasi Unduhan</p>
                                <ul className="text-xs space-y-0.5" style={{ color: '#c95b08' }}>
                                    <li>• Rapor diunduh dalam format <strong>.docx</strong> (Microsoft Word)</li>
                                    <li>• Buka dengan Microsoft Word atau LibreOffice untuk tampilan terbaik</li>
                                    <li>• PAS Semester Genap mencantumkan status kenaikan kelas</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}