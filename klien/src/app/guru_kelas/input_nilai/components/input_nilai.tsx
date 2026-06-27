/**
 * Nama File: input_nilai_client.tsx
 * Fungsi: Input nilai siswa per mata pelajaran untuk guru kelas
 * UPDATE: 
 *   - Kondisi 1: Modal "Akses Ditolak" + Logout jika belum ditugaskan
 *   - Kondisi 2: Read-Only mode jika periode penilaian belum aktif/selesai
 *   - Banner warning status periode
 *   - Tombol Edit disabled dengan icon  jika read only
 *   - Modal warning saat klik tombol di mode read only
 *   - Semester otomatis dari tahun ajaran aktif
 */

'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Eye, Pencil, X, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, LogOut, Lock } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

interface MapelItem {
    mata_pelajaran_id: number;
    nama_mapel: string;
    jenis: 'wajib' | 'pilihan';
    bisa_input: boolean;
}

interface KomponenPenilaian {
    id_komponen: number;
    nama_komponen: string;
    urutan: number;
}

interface SiswaNilai {
    id: number;
    nama: string;
    nis: string;
    nisn: string;
    nilai_rapor_pts: number;
    deskripsi_pts: string;
    nilai_rapor_pas: number;
    deskripsi_pas: string;
    nilai: Record<number, number | null>;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
    <style jsx global>{`
    @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .dg-fadeIn  { animation: dg-fadeIn  0.2s ease; }
    .dg-scaleIn { animation: dg-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
    .dg-pulse   { animation: dg-pulse   0.6s ease 0.15s; }
  `}</style>
);

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
            </div>
        </div>
    );
};

// ─── SHARED STYLE CONSTANTS ───────────────────────────────────────────────────

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputDisabledCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-400 outline-none bg-gray-100 border-gray-200 cursor-not-allowed";

const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const BtnSecondary = ({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => { if (!disabled) (e.currentTarget.style.background = '#fff0e5'); }}
        onMouseLeave={e => { if (!disabled) (e.currentTarget.style.background = '#fff'); }}
    >{children}</button>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function InputNilaiClient() {
    const { showSessionExpired, handleLogout } = useSession();

    // ✅ STATE BARU: Kondisi akses
    const [isNotAssigned, setIsNotAssigned] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);
    const [statusPTS, setStatusPTS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [statusPAS, setStatusPAS] = useState<'aktif' | 'nonaktif' | 'selesai'>('nonaktif');
    const [semesterAktif, setSemesterAktif] = useState<string>('Ganjil');

    const [jenisPenilaianAktif, setJenisPenilaianAktif] = useState<'PTS' | 'PAS' | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapelList, setMapelList] = useState<MapelItem[]>([]);
    const [komponenList, setKomponenList] = useState<KomponenPenilaian[]>([]);
    const [selectedMapelId, setSelectedMapelId] = useState<number | null>(null);
    const [currentMapel, setCurrentMapel] = useState<MapelItem | null>(null);
    const [kelasNama, setKelasNama] = useState('');
    const [siswaList, setSiswaList] = useState<SiswaNilai[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaNilai[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataLoading, setDataLoading] = useState(false);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showDetail, setShowDetail] = useState(false);
    const [detailClosing, setDetailClosing] = useState(false);
    const [selectedSiswa, setSelectedSiswa] = useState<SiswaNilai | null>(null);

    const [showEdit, setShowEdit] = useState(false);
    const [editClosing, setEditClosing] = useState(false);
    const [editingSiswa, setEditingSiswa] = useState<SiswaNilai | null>(null);
    const [editingNilai, setEditingNilai] = useState<Record<number, number | null>>({});
    const [saving, setSaving] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmSiswaNama, setConfirmSiswaNama] = useState<string>('');

    // ── FETCH TAHUN AJARAN AKTIF ──────────────────────────────────────────────

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

                // 1. Fetch tahun ajaran aktif dulu
                const taRes = await fetch('http://localhost:5000/api/guru-kelas/tahun-ajaran/aktif', { headers });

                if (!taRes.ok) {
                    const errData = await taRes.json().catch(() => ({ code: 'UNKNOWN' }));
                    if (errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                        return;
                    }
                    throw new Error('Gagal memuat tahun ajaran');
                }

                const taData = await taRes.json();
                if (!taData.success) {
                    throw new Error(taData.message || 'Gagal memuat tahun ajaran');
                }

                const { status_pts, status_pas, semester } = taData.data;

                setStatusPTS(status_pts || 'nonaktif');
                setStatusPAS(status_pas || 'nonaktif');
                setSemesterAktif(semester || 'Ganjil');

                // Tentukan jenis penilaian aktif & status read only
                if (status_pts === 'aktif') {
                    setJenisPenilaianAktif('PTS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (status_pas === 'aktif') {
                    setJenisPenilaianAktif('PAS');
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (status_pts === 'selesai' || status_pas === 'selesai') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    setJenisPenilaianAktif(status_pts === 'selesai' ? 'PTS' : 'PAS');
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Selesai',
                            message: 'Periode penilaian telah selesai dan data sudah dikunci.\n\nAnda dapat melihat nilai siswa dalam mode baca saja (read only), tetapi tidak dapat mengedit.'
                        });
                    }, 500);
                } else {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    setJenisPenilaianAktif(null);
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: '⏳ Periode Penilaian Belum Aktif',
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin.\n\nAnda dapat melihat nilai siswa dalam mode baca saja (read only), tetapi belum dapat menginput nilai.\n\nSilakan hubungi admin untuk membuka periode penilaian.'
                        });
                    }, 500);
                }

                // 2. Fetch mapel & komponen
                const [mapelRes, komponenRes] = await Promise.all([
                    fetch('http://localhost:5000/api/guru-kelas/mapel', { headers }),
                    fetch('http://localhost:5000/api/guru-kelas/atur-penilaian/komponen', { headers }),
                ]);

                if (!mapelRes.ok) {
                    const errData = await mapelRes.json().catch(() => ({}));
                    if (mapelRes.status === 403 && errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                        return;
                    }
                    if (mapelRes.status !== 403) {
                        throw new Error(errData.message || 'Gagal memuat mata pelajaran');
                    }
                }

                if (!komponenRes.ok) {
                    throw new Error('Gagal memuat komponen penilaian');
                }

                const [mapelData, komponenData] = await Promise.all([
                    mapelRes.json().catch(() => ({ wajib: [], pilihan: [] })),
                    komponenRes.json()
                ]);

                const wajib = mapelData.data?.wajib || [];
                const pilihan = mapelData.data?.pilihan || [];
                setMapelList([...wajib, ...pilihan]);
                setKomponenList(komponenData.data || []);
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Gagal memuat data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showModal]);

    // ── FETCH NILAI SAAT MAPEL DIPILIH ──────────────────────────────────────────

    useEffect(() => {
        if (mapelList.length === 0 || selectedMapelId === null) {
            setSiswaList([]);
            setFilteredSiswa([]);
            setCurrentMapel(null);
            setKelasNama('');
            return;
        }

        const fetchNilai = async () => {
            setDataLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };
                const res = await fetch(`http://localhost:5000/api/guru-kelas/nilai/${selectedMapelId}`, { headers });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ message: 'Gagal memuat' }));
                    if (res.status === 403 && err.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                        return;
                    }
                    if (res.status === 403) {
                        showModal({
                            type: 'error',
                            title: 'Akses Ditolak',
                            message: err.message || 'Anda tidak memiliki akses ke mata pelajaran ini.'
                        });
                        return;
                    }
                    throw new Error(err.message || 'Gagal memuat data');
                }

                const data = await res.json();
                const mapped: SiswaNilai[] = (data.siswaList || []).map((s: any) => ({
                    id: s.id,
                    nama: s.nama,
                    nis: s.nis || '-',
                    nisn: s.nisn || '-',
                    nilai_rapor_pts: s.nilai_rapor_pts || 0,
                    deskripsi_pts: s.deskripsi_pts || '',
                    nilai_rapor_pas: s.nilai_rapor_pas || 0,
                    deskripsi_pas: s.deskripsi_pas || '',
                    nilai: s.nilai || {},
                }));

                setSiswaList(mapped);
                setFilteredSiswa(mapped);
                setKelasNama(data.kelas || '');
                setCurrentMapel(mapelList.find(m => m.mata_pelajaran_id === selectedMapelId) || null);
                setCurrentPage(1);
            } catch (err: any) {
                showModal({ type: 'error', title: 'Gagal Memuat', message: err.message || 'Gagal memuat data nilai.' });
            } finally {
                setDataLoading(false);
            }
        };
        fetchNilai();
    }, [selectedMapelId, mapelList, showModal]);

    // ── FILTER & PAGINATION ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q)
            ));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    const totalPages = Math.max(1, Math.ceil(filteredSiswa.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSiswa = filteredSiswa.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive = "text-white border-orange-500";
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
        range.forEach((p) => {
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

    // ── HANDLERS ────────────────────────────────────────────────────────────────

    const handleDetail = (siswa: SiswaNilai) => { setSelectedSiswa(siswa); setShowDetail(true); };
    const closeDetail = () => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); };

    // ✅ PERBAIKAN: Cek read only sebelum buka modal edit
    const handleEdit = (siswa: SiswaNilai) => {
        // Cek 1: Read only mode (periode belum aktif/selesai)
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'Periode penilaian sudah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit nilai siswa.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: '⏳ Mode Baca Saja',
                    message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengedit nilai siswa.\n\nSilakan tunggu admin membuka periode penilaian.'
                });
            }
            return;
        }

        // Cek 2: Mapel tidak bisa input
        if (!currentMapel?.bisa_input) {
            showModal({
                type: 'warning',
                title: 'Tidak Dapat Input',
                message: 'Mata pelajaran ini tidak dapat diinput nilainya oleh Anda.\n\nSilakan hubungi Administrator.'
            });
            return;
        }

        setEditingSiswa(siswa);
        setEditingNilai({ ...siswa.nilai });
        setShowEdit(true);
    };
    const closeEdit = () => { setEditClosing(true); setTimeout(() => { setShowEdit(false); setEditClosing(false); setEditingSiswa(null); }, 200); };

    const openConfirmSimpan = () => {
        if (!editingSiswa || !selectedMapelId) return;

        for (const [idStr, nilai] of Object.entries(editingNilai)) {
            if (nilai !== null) {
                const nama = komponenList.find(k => k.id_komponen === Number(idStr))?.nama_komponen || idStr;
                if (typeof nilai !== 'number' || isNaN(nilai) || nilai < 0 || nilai > 100) {
                    showModal({
                        type: 'warning',
                        title: 'Nilai Tidak Valid',
                        message: `Nilai untuk "${nama}" harus angka 0-100.`
                    });
                    return;
                }
            }
        }

        const hasChanged = Object.entries(editingNilai).some(([idStr, nilaiBaru]) => {
            const nilaiLama = editingSiswa.nilai[Number(idStr)] ?? null;
            const n1 = nilaiBaru ?? null;
            const n2 = nilaiLama ?? null;
            return n1 !== n2;
        });

        if (!hasChanged) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Data yang Anda masukkan sama dengan data sebelumnya.'
            });
            return;
        }

        setConfirmSiswaNama(editingSiswa.nama);
        setShowConfirmModal(true);
    };

    const executeSimpanNilai = async () => {
        if (!editingSiswa || !selectedMapelId) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/guru-kelas/nilai-komponen/${selectedMapelId}/${editingSiswa.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nilai: editingNilai }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Gagal menyimpan' }));
                throw new Error(err.message);
            }

            const data = await res.json();
            const updated: SiswaNilai = {
                ...editingSiswa,
                nilai: editingNilai,
                nilai_rapor_pts: data.jenis_penilaian === 'PTS' ? Math.floor(data.nilai_rapor ?? editingSiswa.nilai_rapor_pts) : editingSiswa.nilai_rapor_pts,
                deskripsi_pts: data.jenis_penilaian === 'PTS' ? (data.deskripsi ?? editingSiswa.deskripsi_pts) : editingSiswa.deskripsi_pts,
                nilai_rapor_pas: data.jenis_penilaian === 'PAS' ? Math.floor(data.nilai_rapor ?? editingSiswa.nilai_rapor_pas) : editingSiswa.nilai_rapor_pas,
                deskripsi_pas: data.jenis_penilaian === 'PAS' ? (data.deskripsi ?? editingSiswa.deskripsi_pas) : editingSiswa.deskripsi_pas,
            };

            setSiswaList(prev => prev.map(s => s.id === editingSiswa.id ? updated : s));
            setFilteredSiswa(prev => prev.map(s => s.id === editingSiswa.id ? updated : s));

            setShowConfirmModal(false);
            setShowEdit(false);
            setEditingSiswa(null);
            setConfirmSiswaNama('');

            setTimeout(() => {
                showModal({
                    type: 'success',
                    title: 'Nilai Disimpan!',
                    message: `Nilai ${updated.nama} berhasil disimpan.`
                });
            }, 250);
        } catch (err: any) {
            setShowConfirmModal(false);
            setShowEdit(false);
            setEditingSiswa(null);
            setConfirmSiswaNama('');

            setTimeout(() => {
                showModal({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    message: err.message || 'Gagal menyimpan nilai.'
                });
            }, 250);
        } finally {
            setSaving(false);
        }
    };

    // ── BADGE NILAI ─────────────────────────────────────────────────────────────

    const NilaiBadge = ({ nilai, jenis }: { nilai: number; jenis: 'PTS' | 'PAS' }) => {
        if (nilai === null || nilai === undefined) {
            return <span className="text-gray-700 text-xs">—</span>;
        }

        const color = {
            bg: '#fff0e5',
            text: '#c95b08',
            border: '#fde0c8'
        };

        return (
            <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold"
                style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                {nilai}
            </span>
        );
    };

    // ── LOADING STATE ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium" style={{ color: '#c95b08' }}>Memuat data...</p>
                </div>
            </div>
        );
    }

    // ✅ KONDISI 1: Belum Ditugaskan → Blokir Total
    if (isNotAssigned) {
        return (
            <div className="flex-1 p-6 min-h-screen flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 dg-scaleIn">
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
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                boxShadow: '0 3px 12px rgba(232,105,10,0.3)'
                            }}
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── RENDER UTAMA ────────────────────────────────────────────────────────────

    const minTableWidth = 400 + (komponenList.length * 100) + 240;

    // ✅ Helper: Apakah tombol Edit harus aktif?
    const canEditNilai = currentMapel?.bisa_input && !isReadOnly;

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* ✅ BANNER READ ONLY (KONDISI 2) */}
            {isReadOnly && (
                <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{
                        background: readOnlyReason === 'locked' ? '#fef2f2' : '#fef3c7',
                        border: `1px solid ${readOnlyReason === 'locked' ? '#fca5a5' : '#fcd34d'}`
                    }}>
                    <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${readOnlyReason === 'locked' ? 'text-red-600' : 'text-yellow-600'}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${readOnlyReason === 'locked' ? 'text-red-900' : 'text-yellow-900'}`}>
                            Mode Baca Saja (Read Only)
                        </p>
                        <p className={`text-xs ${readOnlyReason === 'locked' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {readOnlyReason === 'locked'
                                ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat nilai siswa, tetapi tidak dapat mengedit.'
                                : 'Periode penilaian belum aktif. Anda dapat melihat nilai siswa, tetapi belum dapat menginput nilai. Silakan hubungi admin untuk membuka periode penilaian.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Banner: Mata pelajaran belum diatur */}
            {mapelList.length === 0 && !isReadOnly && (
                <div className="mb-6 p-4 rounded-2xl flex items-start gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                        border: '2px solid #fdba74',
                        boxShadow: '0 2px 8px rgba(253,186,116,0.2)'
                    }}>
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={20} style={{ color: '#c2410c' }} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm mb-1" style={{ color: '#9a3412' }}>
                            Mata Pelajaran Belum Diatur
                        </h3>
                        <p className="text-xs" style={{ color: '#7c2d12' }}>
                            Belum ada mata pelajaran yang dikonfigurasi untuk tahun ajaran ini.
                            Silakan hubungi <strong>Administrator</strong> untuk menambahkan mata pelajaran.
                        </p>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Input Nilai Siswa</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola nilai komponen & rapor siswa per mata pelajaran</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                            <label className="text-sm font-semibold whitespace-nowrap" style={{ color: '#7a3a0a' }}>
                                Mata Pelajaran
                            </label>
                            <select
                                value={selectedMapelId === null ? '' : String(selectedMapelId)}
                                onChange={e => { const val = e.target.value; setSelectedMapelId(val ? Number(val) : null); setSearchQuery(''); }}
                                className={inputCls}
                                style={{ maxWidth: '400px' }}
                            >
                                <option value="">-- Pilih Mata Pelajaran --</option>
                                {mapelList.map(mapel => (
                                    <option key={mapel.mata_pelajaran_id} value={mapel.mata_pelajaran_id}>
                                        {mapel.nama_mapel} ({mapel.jenis})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedMapelId && (
                            <div className="relative min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari siswa..." value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400" />
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedMapelId && currentMapel && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
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
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage}
                                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200">
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>
                        </div>
                    )}

                    {selectedMapelId && currentMapel && (
                        <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                            Menampilkan {filteredSiswa.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredSiswa.length)} dari {filteredSiswa.length} siswa
                        </p>
                    )}
                </div>

                {!selectedMapelId ? (
                    <div className="m-6 text-center py-10 rounded-2xl" style={{ background: '#fff7f0', border: '2px dashed #fde0c8' }}>
                        <p className="font-bold" style={{ color: '#c95b08' }}>Pilih Mata Pelajaran Terlebih Dahulu</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse" style={{ minWidth: `${minTableWidth}px` }}>
                                <thead>
                                    <tr style={TH_GRAD}>
                                        {['No.', 'Nama Siswa', 'NIS', 'NISN',
                                            ...komponenList.map(k => k.nama_komponen),
                                            'Rapor PTS', 'Rapor PAS', 'Aksi'
                                        ].map((h, i) => (
                                            <th key={i} className="px-4 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataLoading ? (
                                        <tr>
                                            <td colSpan={7 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                                    Memuat data nilai...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentSiswa.length === 0 ? (
                                        <tr>
                                            <td colSpan={7 + komponenList.length} className="py-12 text-center text-gray-400 text-sm">
                                                {searchQuery ? 'Siswa tidak ditemukan.' : 'Belum ada data siswa.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        currentSiswa.map((siswa, idx) => (
                                            <tr key={siswa.id} className="transition-colors"
                                                style={{ borderBottom: '1px solid #fde0c8', background: idx % 2 === 0 ? '#fff' : '#fffaf6' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fffaf6')}>
                                                <td className="px-4 py-3 text-center text-gray-500 font-medium">{startIndex + idx + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-gray-800">{siswa.nama}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{siswa.nis}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{siswa.nisn}</td>
                                                {komponenList.map(k => (
                                                    <td key={`${siswa.id}-${k.id_komponen}`} className="px-4 py-3 text-center text-gray-700">
                                                        {siswa.nilai[k.id_komponen] !== null && siswa.nilai[k.id_komponen] !== undefined
                                                            ? siswa.nilai[k.id_komponen]
                                                            : <span className="text-gray-700">—</span>}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai_rapor_pts} jenis="PTS" /></td>
                                                <td className="px-4 py-3 text-center"><NilaiBadge nilai={siswa.nilai_rapor_pas} jenis="PAS" /></td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleDetail(siswa)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                            <Eye size={13} /> Detail
                                                        </button>
                                                        {/* ✅ TOMBOL EDIT: Disabled jika read-only atau mapel tidak bisa input */}
                                                        <button
                                                            onClick={() => handleEdit(siswa)}
                                                            disabled={!canEditNilai}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            style={{
                                                                background: canEditNilai ? '#fff0e5' : '#e5e7eb',
                                                                border: canEditNilai ? '1px solid #f5a623' : '1px solid #d1d5db',
                                                                color: canEditNilai ? '#b35a08' : '#6b7280'
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (canEditNilai) {
                                                                    e.currentTarget.style.background = '#ffe4c8';
                                                                }
                                                            }}
                                                            onMouseLeave={e => {
                                                                if (canEditNilai) {
                                                                    e.currentTarget.style.background = '#fff0e5';
                                                                }
                                                            }}
                                                        >
                                                            {canEditNilai ? (
                                                                <>
                                                                    <Pencil size={13} /> Edit
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Lock size={13} /> Terkunci
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredSiswa.length > 0 && (
                            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
                                <div className="flex items-center gap-1">{renderPagination()}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showDetail && selectedSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Header */}
                        <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Detail Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{selectedSiswa.nama} - {kelasNama}</p>
                            </div>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Info Siswa */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                    <p className="text-xs text-gray-500 mb-1">NIS</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nis}</p>
                                </div>
                                <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fde0c8' }}>
                                    <p className="text-xs text-gray-500 mb-1">NISN</p>
                                    <p className="text-sm font-bold" style={{ color: '#7a3a0a' }}>{selectedSiswa.nisn}</p>
                                </div>
                            </div>

                            {/* Rapor PTS & PAS */}
                            <div>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                                    <span className="w-1 h-5 rounded-full" style={{ background: '#e8690a' }}></span>
                                    Nilai Rapor
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* PTS */}
                                    <div className="rounded-xl p-5 border-2" style={{
                                        background: '#fff7ed',
                                        borderColor: '#fdba74',
                                        boxShadow: '0 2px 8px rgba(232,105,10,0.1)'
                                    }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fed7aa' }}>
                                                    <span className="text-xs font-bold" style={{ color: '#c2410c' }}>PTS</span>
                                                </div>
                                                <span className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Rapor PTS</span>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                style={{
                                                    background: statusPTS === 'aktif' ? '#fed7aa' : statusPTS === 'selesai' ? '#e5e7eb' : '#fef3c7',
                                                    color: statusPTS === 'aktif' ? '#c2410c' : statusPTS === 'selesai' ? '#6b7280' : '#92400e'
                                                }}>
                                                {statusPTS === 'aktif' ? '● Aktif' : statusPTS === 'selesai' ? 'Selesai' : '⏳ Menunggu'}
                                            </span>
                                        </div>
                                        <div className="text-center py-3">
                                            <div className="text-4xl font-bold mb-2" style={{ color: '#c2410c' }}>
                                                {selectedSiswa.nilai_rapor_pts !== null && selectedSiswa.nilai_rapor_pts !== undefined ? selectedSiswa.nilai_rapor_pts : '-'}
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t" style={{ borderColor: '#fde0c8' }}>
                                            <p className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Deskripsi:</p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {selectedSiswa.deskripsi_pts || <span className="text-gray-400 italic">Belum ada deskripsi</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* PAS */}
                                    <div className="rounded-xl p-5 border-2" style={{
                                        background: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#fff7ed' : '#f9fafb',
                                        borderColor: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#fdba74' : '#e5e7eb'
                                    }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ background: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#fed7aa' : '#e5e7eb' }}>
                                                    <span className="text-xs font-bold" style={{ color: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#c2410c' : '#6b7280' }}>PAS</span>
                                                </div>
                                                <span className="text-sm font-bold" style={{ color: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#7a3a0a' : '#9ca3af' }}>Rapor PAS</span>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                style={{
                                                    background: statusPAS === 'aktif' ? '#fed7aa' : statusPAS === 'selesai' ? '#e5e7eb' : '#fef3c7',
                                                    color: statusPAS === 'aktif' ? '#c2410c' : statusPAS === 'selesai' ? '#6b7280' : '#92400e'
                                                }}>
                                                {statusPAS === 'aktif' ? '● Aktif' : statusPAS === 'selesai' ? 'Selesai' : '⏳ Menunggu'}
                                            </span>
                                        </div>
                                        <div className="text-center py-3">
                                            <div className="text-4xl font-bold mb-2"
                                                style={{ color: selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? '#c2410c' : '#d1d5db' }}>
                                                {selectedSiswa.nilai_rapor_pas !== null && selectedSiswa.nilai_rapor_pas !== undefined && selectedSiswa.nilai_rapor_pas > 0 ? selectedSiswa.nilai_rapor_pas : '-'}
                                            </div>
                                        </div>
                                        <div className="pt-3 border-t" style={{ borderColor: '#fde0c8' }}>
                                            <p className="text-xs font-semibold mb-1" style={{ color: '#7a3a0a' }}>Deskripsi:</p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                {selectedSiswa.deskripsi_pas || <span className="text-gray-400 italic">Belum ada deskripsi</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Nilai Komponen */}
                            <div>
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#7a3a0a' }}>
                                    <span className="w-1 h-5 rounded-full" style={{ background: '#e8690a' }}></span>
                                    Nilai Komponen Penilaian
                                </h3>

                                {/* Ulangan Harian */}
                                <div className="mb-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full" style={{ background: '#fbbf24' }}></div>
                                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7a3a0a' }}>Ulangan Harian</p>
                                    </div>
                                    <div className="grid grid-cols-5 gap-3">
                                        {komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(k => {
                                            const nilai = selectedSiswa.nilai[k.id_komponen];
                                            return (
                                                <div key={k.id_komponen} className="rounded-xl p-4 text-center border-2 transition-all"
                                                    style={{
                                                        background: nilai !== null && nilai !== undefined ? '#fff' : '#f9fafb',
                                                        borderColor: nilai !== null && nilai !== undefined ? '#fde0c8' : '#e5e7eb',
                                                        boxShadow: nilai !== null && nilai !== undefined ? '0 2px 8px rgba(232,105,10,0.08)' : 'none'
                                                    }}>
                                                    <div className="text-xs font-bold mb-2" style={{ color: '#7a3a0a' }}>{k.nama_komponen}</div>
                                                    <div className="text-2xl font-bold"
                                                        style={{
                                                            color: nilai !== null && nilai !== undefined ? '#c95b08' : '#d1d5db'
                                                        }}>
                                                        {nilai !== null && nilai !== undefined ? nilai : '-'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* PTS & PAS */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full" style={{ background: '#e8690a' }}></div>
                                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7a3a0a' }}>Penilaian Tengah & Akhir Semester</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {komponenList.filter(k => /PTS|PAS/i.test(k.nama_komponen)).map(k => {
                                            const nilai = selectedSiswa.nilai[k.id_komponen];
                                            const isPTS = /PTS/i.test(k.nama_komponen);
                                            return (
                                                <div key={k.id_komponen} className="rounded-xl p-5 text-center border-2 relative overflow-hidden"
                                                    style={{
                                                        background: '#fff7ed',
                                                        borderColor: '#fdba74',
                                                        boxShadow: '0 2px 8px rgba(232,105,10,0.1)'
                                                    }}>
                                                    <div className="relative">
                                                        <div className="text-center mb-3">
                                                            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: '#c2410c' }}>
                                                                {k.nama_komponen}
                                                            </span>
                                                        </div>
                                                        <div className="text-3xl font-bold mb-2"
                                                            style={{
                                                                color: nilai !== null && nilai !== undefined ? '#c2410c' : '#d1d5db'
                                                            }}>
                                                            {nilai !== null && nilai !== undefined ? nilai : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                            {canEditNilai && (
                                <button onClick={() => { handleEdit(selectedSiswa); closeDetail(); }}
                                    className={btnPrimary.base} style={btnPrimary.style}
                                    onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                                    <Pencil size={14} /> Edit Nilai
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showEdit && editingSiswa && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        {/* Header */}
                        <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div>
                                <h2 className="text-lg font-bold text-white">Edit Nilai Siswa</h2>
                                <p className="text-xs text-orange-100 mt-0.5">{editingSiswa.nama} - {kelasNama}</p>
                            </div>
                            <button onClick={closeEdit} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Info Banner */}
                            {jenisPenilaianAktif && (
                                <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                                    style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
                                    <AlertCircle size={18} style={{ color: '#c2410c', flexShrink: 0 }} />
                                    <p className="text-sm" style={{ color: '#7a3a0a' }}>
                                        <strong>Periode {jenisPenilaianAktif} Aktif</strong> —
                                        {jenisPenilaianAktif === 'PTS'
                                            ? ' Hanya nilai PTS yang dapat diubah.'
                                            : ' Nilai PTS terkunci, hanya UH & PAS yang bisa diubah.'}
                                    </p>
                                </div>
                            )}

                            {/* Ulangan Harian */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 rounded-full" style={{ background: '#fbbf24' }}></div>
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Ulangan Harian</h3>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                    {komponenList.filter(k => /^UH[\s\-_]*\d+$/i.test(k.nama_komponen)).map(komponen => {
                                        const isDisabled = jenisPenilaianAktif === 'PTS';
                                        const nilai = editingNilai[komponen.id_komponen];
                                        return (
                                            <div key={komponen.id_komponen}>
                                                <label className="block text-xs font-bold mb-2 text-center"
                                                    style={{ color: isDisabled ? '#9ca3af' : '#7a3a0a' }}>
                                                    {komponen.nama_komponen}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={nilai ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const num = parseFloat(val);
                                                        setEditingNilai(prev => ({
                                                            ...prev,
                                                            [komponen.id_komponen]: val === '' ? null : (isNaN(num) ? null : Math.floor(num))
                                                        }));
                                                    }}
                                                    disabled={isDisabled}
                                                    placeholder="-"
                                                    className={`w-full px-3 py-3 rounded-xl text-center font-bold transition-all border-2 ${isDisabled
                                                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                                        : 'bg-white border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                        }`}
                                                    style={isDisabled ? {} : { boxShadow: '0 2px 8px rgba(232,105,10,0.08)' }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* PTS & PAS */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 rounded-full" style={{ background: '#e8690a' }}></div>
                                    <h3 className="text-sm font-bold" style={{ color: '#7a3a0a' }}>Penilaian Tengah & Akhir Semester</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {komponenList.filter(k => /PTS|PAS/i.test(k.nama_komponen)).map(komponen => {
                                        const isPTS = /PTS/i.test(komponen.nama_komponen);
                                        const isActive = (jenisPenilaianAktif === 'PTS' && isPTS) || (jenisPenilaianAktif === 'PAS' && !isPTS);
                                        const isDisabled = !isActive;
                                        const nilai = editingNilai[komponen.id_komponen];

                                        return (
                                            <div key={komponen.id_komponen}
                                                className={`rounded-xl p-5 border-2 transition-all relative overflow-hidden ${isActive
                                                    ? 'border-orange-400 shadow-lg'
                                                    : 'border-gray-200 bg-gray-50'
                                                    }`}>
                                                {isActive && (
                                                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
                                                        style={{ background: '#e8690a', transform: 'translate(30%, -30%)' }}></div>
                                                )}

                                                <div className="relative">
                                                    <div className="text-center mb-4">
                                                        <span className="text-base font-bold uppercase tracking-wide"
                                                            style={{ color: isActive ? '#c2410c' : '#9ca3af' }}>
                                                            {komponen.nama_komponen}
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="1"
                                                        value={nilai ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const num = parseFloat(val);
                                                            setEditingNilai(prev => ({
                                                                ...prev,
                                                                [komponen.id_komponen]: val === '' ? null : (isNaN(num) ? null : Math.floor(num))
                                                            }));
                                                        }}
                                                        disabled={isDisabled}
                                                        placeholder="0"
                                                        className={`w-full px-4 py-4 rounded-xl text-3xl font-bold text-center transition-all border-2 ${isDisabled
                                                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                            : 'bg-white border-orange-200 text-orange-700 focus:ring-2 focus:ring-orange-400 focus:border-orange-400'
                                                            }`}
                                                        style={isActive ? { boxShadow: '0 4px 12px rgba(232,105,10,0.15)' } : {}}
                                                    />

                                                    {isActive && (
                                                        <div className="flex items-center justify-center gap-1.5 mt-3">
                                                            <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
                                                            <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Dapat diubah</span>
                                                        </div>
                                                    )}
                                                    {isDisabled && (
                                                        <div className="flex items-center justify-center gap-1.5 mt-3">
                                                            <Lock size={12} style={{ color: '#9ca3af' }} />
                                                            <span className="text-xs font-semibold" style={{ color: '#9ca3af' }}>Terkunci</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <BtnSecondary onClick={closeEdit} disabled={saving}>Batal</BtnSecondary>
                            <button onClick={openConfirmSimpan} disabled={saving}
                                className={`px-6 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={btnPrimary.style}
                                onMouseEnter={e => { if (!saving) btnPrimary.hover(e); }}
                                onMouseLeave={e => { if (!saving) btnPrimary.leave(e); }}>
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        Simpan Nilai
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL KONFIRMASI ─────────────────────────────────────────────── */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                Konfirmasi Penyimpanan Nilai
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 whitespace-nowrap">
                            Apakah Anda yakin ingin menyimpan nilai {confirmSiswaNama}?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeSimpanNilai}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>Simpan</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}