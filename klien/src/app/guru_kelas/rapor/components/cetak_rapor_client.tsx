'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, AlertCircle, CheckCircle2, WifiOff, ShieldAlert, X } from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface Siswa {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
}

interface TahunAjaranInfo {
    tahun_ajaran: string;
    semester: 'Ganjil' | 'Genap';
    status_pts: 'nonaktif' | 'aktif' | 'selesai';
    status_pas: 'nonaktif' | 'aktif' | 'selesai';
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

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
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

const PAGE_BG    = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f97316', boxShadow: '0 2px 16px rgba(200,80,10,0.15)' };
const TH_GRAD    = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: 'nonaktif' | 'aktif' | 'selesai' | null }) => {
    if (!status) return null;
    const map = {
        aktif:    { bg: '#ecfdf5', color: '#166534', border: '#bbf7d0', label: 'Aktif' },
        selesai:  { bg: '#f3f4f6', color: '#374151', border: '#d1d5db', label: 'Terkunci' },
        nonaktif: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Belum Dibuka' },
    };
    const s = map[status];
    return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {s.label}
        </span>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const RaporGuruKelasClient = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const [jenisPenilaian, setJenisPenilaian]     = useState<string>('');
    const [siswaList, setSiswaList]               = useState<Siswa[]>([]);
    const [loading, setLoading]                   = useState<boolean>(true);
    const [tahunAjaranInfo, setTahunAjaranInfo]   = useState<TahunAjaranInfo | null>(null);
    const [modal, setModal]                       = useState<ModalConfig | null>(null);
    const [downloadingId, setDownloadingId]       = useState<number | null>(null);

    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // === Fetch tahun ajaran aktif ===
    const fetchTahunAjaranAktif = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }

            const res = await fetch(`${API_BASE}/guru-kelas/tahun-ajaran/aktif`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const ta = data.data;
                setTahunAjaranInfo({
                    tahun_ajaran: ta.tahun_ajaran,
                    semester: ta.semester as 'Ganjil' | 'Genap',
                    status_pts: ta.status_pts,
                    status_pas: ta.status_pas,
                });
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal mengambil tahun ajaran aktif.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // === Fetch daftar siswa ===
    const fetchSiswaList = async () => {
        if (!tahunAjaranInfo) return;
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }

            const res = await fetch(`${API_BASE}/guru-kelas/siswa`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSiswaList(data.data);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat', message: data.message || 'Gagal memuat data siswa.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTahunAjaranAktif(); }, []);

    useEffect(() => {
        if (jenisPenilaian && tahunAjaranInfo) {
            setLoading(true);
            fetchSiswaList();
        } else {
            setSiswaList([]);
            setLoading(false);
        }
    }, [jenisPenilaian, tahunAjaranInfo]);

    // === Helper: status penilaian saat ini ===
    const getCurrentStatus = (): 'nonaktif' | 'aktif' | 'selesai' | null => {
        if (!jenisPenilaian || !tahunAjaranInfo) return null;
        return jenisPenilaian.startsWith('PTS') ? tahunAjaranInfo.status_pts : tahunAjaranInfo.status_pas;
    };

    // === Unduh rapor ===
    const handleDownloadRapor = async (siswaId: number) => {
        const token = localStorage.getItem('token');
        if (!token || !jenisPenilaian || !tahunAjaranInfo) {
            showModal({ type: 'warning', title: 'Data Tidak Lengkap', message: 'Silakan pilih jenis penilaian terlebih dahulu.' });
            return;
        }
        const jenisMurni = jenisPenilaian.startsWith('PTS') ? 'PTS' : 'PAS';
        setDownloadingId(siswaId);
        try {
            const res = await fetch(
                `${API_BASE}/guru-kelas/generate-rapor/${siswaId}/${jenisMurni}/${tahunAjaranInfo.semester.toLowerCase()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Gagal mengunduh rapor');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rapor_${jenisMurni.toLowerCase()}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showModal({ type: 'success', title: 'Berhasil Diunduh', message: `Rapor ${jenisMurni} berhasil diunduh.` });
        } catch (err: any) {
            showModal({ type: 'error', title: 'Gagal Mengunduh', message: err.message || 'Terjadi kesalahan. Silakan coba lagi.' });
        } finally {
            setDownloadingId(null);
        }
    };

    // === Derived state ===
    const currentStatus     = getCurrentStatus();
    const isDownloadAllowed = currentStatus === 'aktif';
    const optionsJenisPenilaian = tahunAjaranInfo
        ? [
            { value: `PTS-${tahunAjaranInfo.semester.toLowerCase()}`, label: `Penilaian Tengah Semester (${tahunAjaranInfo.semester})` },
            { value: `PAS-${tahunAjaranInfo.semester.toLowerCase()}`, label: `Penilaian Akhir Semester (${tahunAjaranInfo.semester})` },
        ]
        : [];

    const jenisMurni = jenisPenilaian.startsWith('PTS') ? 'PTS' : 'PAS';

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Cetak Rapor</h1>
                {tahunAjaranInfo && (
                    <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                        Tahun Ajaran <span className="font-semibold">{tahunAjaranInfo.tahun_ajaran}</span> — Semester <span className="font-semibold">{tahunAjaranInfo.semester}</span>
                    </p>
                )}
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Toolbar / Filter */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-end gap-4">

                        <div className="flex items-center gap-3">
    <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
        Jenis Penilaian
    </span>
    <select
        value={jenisPenilaian}
        onChange={(e) => setJenisPenilaian(e.target.value)}
        className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 min-w-[280px]"
    >
        <option value="">-- Pilih Jenis Penilaian --</option>
        {optionsJenisPenilaian.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
    </select>
</div>

                        {/* Status Badge */}
                        {jenisPenilaian && currentStatus && (
                            <div className="flex items-center gap-2 pb-0.5">
                                <span className="text-xs font-semibold" style={{ color: '#7a3a0a' }}>
                                    Status {jenisMurni}:
                                </span>
                                <StatusBadge status={currentStatus} />
                            </div>
                        )}
                    </div>

                    {jenisPenilaian && (
                        <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                            {siswaList.length > 0
                                ? `Menampilkan ${siswaList.length} siswa`
                                : loading ? 'Memuat data...' : 'Tidak ada data siswa'}
                        </p>
                    )}
                </div>

                {/* Konten */}
                {jenisPenilaian === '' ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ background: '#fff0e5', border: '1.5px dashed #f5870a' }}>
                            <FileText size={26} style={{ color: '#e8690a' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Silakan pilih jenis penilaian untuk menampilkan daftar siswa.</p>
                    </div>
                ) : loading ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin" />
                        <p className="text-sm text-gray-400">Memuat daftar siswa...</p>
                    </div>
                ) : siswaList.length === 0 ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                        Tidak ada siswa di kelas Anda.
                    </div>
                ) : (
                    <>
                        {/* Tabel */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm border-collapse">
                                <thead>
                                    <tr style={TH_GRAD}>
                                        {['No.', 'Nama Siswa', 'NIS', 'NISN', 'Unduh Rapor'].map(h => (
                                            <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {siswaList.map((siswa, index) => (
                                        <tr
                                            key={siswa.id}
                                            className="transition-colors"
                                            style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                            onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                        >
                                            <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-5 py-3.5 font-bold text-gray-800">{siswa.nama}</td>
                                            <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nis}</td>
                                            <td className="px-5 py-3.5 text-center text-gray-600">{siswa.nisn}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                {isDownloadAllowed ? (
                                                    <button
                                                        onClick={() => handleDownloadRapor(siswa.id)}
                                                        disabled={downloadingId === siswa.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                                                        style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                        onMouseEnter={e => { if (downloadingId !== siswa.id) e.currentTarget.style.background = '#d4f0de'; }}
                                                        onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                                    >
                                                        {downloadingId === siswa.id ? (
                                                            <>
                                                                <div className="w-3 h-3 rounded-full border border-green-400 border-t-green-700 animate-spin" />
                                                                Mengunduh...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download size={13} />
                                                                Unduh
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                                                        <Download size={13} />
                                                        Tidak Tersedia
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Warning jika tidak aktif */}
                        {!isDownloadAllowed && (
                            <div className="mx-5 my-4 p-3 rounded-xl text-xs font-medium flex items-start gap-2"
                                style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                                <span>
                                    Rapor <strong>{jenisMurni}</strong> belum tersedia untuk diunduh karena statusnya saat ini adalah &ldquo;{currentStatus === 'selesai' ? 'Terkunci' : 'Belum Dibuka'}&rdquo;.
                                </span>
                            </div>
                        )}

                        {/* Catatan */}
                        <div className="mx-5 mb-5 mt-2 p-4 rounded-xl text-xs" style={{ background: '#fffaf6', border: '1px solid #fde0c8', color: '#7a3a0a' }}>
                            <p className="font-bold mb-1.5">Catatan:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Rapor diunduh dalam format <strong>.docx</strong> (Microsoft Word)</li>
                                <li>Buka dengan Microsoft Word untuk tampilan terbaik</li>
                                <li>PAS Semester Genap mencantumkan status kenaikan kelas</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RaporGuruKelasClient;