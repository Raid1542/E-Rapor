/**
 * Nama File: catatan_wali_client.tsx
 * Fungsi: Komponen klien untuk mengelola catatan wali kelas
 * UPDATE: 
 *   - Kondisi 1: Modal "Akses Ditolak" + Logout jika belum ditugaskan
 *   - Kondisi 2: Read-Only mode jika jenis penilaian belum aktif
 */

'use client';
import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import { Pencil, Search, X, CheckCircle2, AlertCircle, WifiOff, ShieldAlert, Users, LogOut, Save, School, GraduationCap, Lock, AlertTriangle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ====== KONSTANTA API ======
const API = 'http://localhost:5000/api/guru-kelas';

// ====== HELPER: Parse Error dari Backend ======
const parseBackendError = async (res: Response): Promise<{ message: string; code?: string }> => {
    try {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            if (res.status === 404) return { message: 'Endpoint tidak ditemukan.', code: 'NOT_FOUND' };
            if (res.status === 500) return { message: 'Server error.', code: 'SERVER_ERROR' };
            return { message: `Server error (${res.status}).`, code: 'INVALID_RESPONSE' };
        }
        const data = await res.json();
        return { message: data.message || 'Terjadi kesalahan', code: data.code };
    } catch {
        return { message: 'Gagal memproses response dari server' };
    }
};

// ====== TYPES ======
type ModalType = 'success' | 'error' | 'warning' | 'network';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
}

interface SiswaCatatan {
    id_siswa: number;
    nama: string;
    nis: string;
    nisn: string;
    jenis_kelamin: string;
    catatan_wali_kelas: string;
    naik_tingkat: 'ya' | 'tidak' | null;
}

// ====== GLOBAL STYLES ======
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes ap-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ap-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ap-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .ap-fadeIn  { animation: ap-fadeIn  0.2s ease; }
        .ap-scaleIn { animation: ap-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .ap-pulse   { animation: ap-pulse   0.6s ease 0.15s; }
    `}</style>
);

// ====== NOTIF MODAL ======
const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 ap-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 ap-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} ap-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>Ok</button>
            </div>
        </div>
    );
};

// ====== SHARED STYLE CONSTANTS ======
const PAGE_BG = { background: '#fdf6f0' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 4px 24px rgba(200,80,10,0.08)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const inputCls = "w-full border-2 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-200 focus:border-orange-500 bg-white border-orange-200 placeholder:text-gray-400";
const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const btnPrimary = {
    base: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

// ====== MAIN COMPONENT ======
export default function CatatanWaliClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const [siswaList, setSiswaList] = useState<SiswaCatatan[]>([]);
    const [filteredSiswa, setFilteredSiswa] = useState<SiswaCatatan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasNama, setKelasNama] = useState<string>('Kelas Anda');
    const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [jenisPenilaian, setJenisPenilaian] = useState<'PTS' | 'PAS'>('PTS');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // ✅ KONDISI 1: Belum ditugaskan
    const [isNotAssigned, setIsNotAssigned] = useState(false);

    // ✅ KONDISI 2: Read-Only mode (periode belum aktif)
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [readOnlyReason, setReadOnlyReason] = useState<'not_open' | 'locked' | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const [showEdit, setShowEdit] = useState(false);
    const [editClosing, setEditClosing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editData, setEditData] = useState<{ catatan_wali_kelas: string; naik_tingkat: 'ya' | 'tidak' | null }>({
        catatan_wali_kelas: '',
        naik_tingkat: null
    });
    const [originalData, setOriginalData] = useState<typeof editData | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const closeEdit = () => {
        setEditClosing(true);
        setTimeout(() => {
            setShowEdit(false);
            setEditClosing(false);
            setEditId(null);
            setOriginalData(null);
        }, 200);
    };

    // ====== FETCH DATA ======
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                    return;
                }

                const taRes = await fetch(`${API}/tahun-ajaran/aktif`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!taRes.ok) {
                    const errData = await parseBackendError(taRes);
                    if (taRes.status === 403 || errData.code === 'NOT_ASSIGNED') {
                        setIsNotAssigned(true);
                        return;
                    }
                    showModal({ type: 'error', title: 'Gagal Memuat', message: errData.message });
                    return;
                }

                const taData = await taRes.json();
                if (!taData.success) {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: taData.message });
                    return;
                }

                const { semester: sem, status_pts, status_pas } = taData.data;

                // ✅ TENTUKAN JENIS PENILAIAN AKTIF & STATUS READ-ONLY
                const ptsAktif = status_pts === 'aktif';
                const pasAktif = status_pas === 'aktif';
                const ptsSelesai = status_pts === 'selesai';
                const pasSelesai = status_pas === 'selesai';

                let jenisAktif: 'PTS' | 'PAS' | null = null;

                if (ptsAktif) {
                    jenisAktif = 'PTS';
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (pasAktif) {
                    jenisAktif = 'PAS';
                    setIsReadOnly(false);
                    setReadOnlyReason(null);
                } else if (ptsSelesai || pasSelesai) {
                    // ✅ KONDISI 2b: Periode sudah selesai (terkunci)
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    jenisAktif = ptsSelesai ? 'PTS' : 'PAS';

                    // Tampilkan modal warning sekali saat load
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: 'Periode Penilaian Selesai',
                            message: 'Periode penilaian telah selesai dan data sudah dikunci.\n\nAnda dapat melihat data siswa dalam mode baca saja (read only), tetapi tidak dapat mengedit catatan wali kelas.\n\nSilakan hubungi Administrator jika ada perubahan yang diperlukan.'
                        });
                    }, 500);
                } else {
                    // ✅ KONDISI 2a: Tidak ada periode yang aktif
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    jenisAktif = 'PTS'; // default untuk fetch data

                    // Tampilkan modal warning sekali saat load
                    setTimeout(() => {
                        showModal({
                            type: 'warning',
                            title: '⏳ Periode Penilaian Belum Aktif',
                            message: 'Baik PTS maupun PAS belum dibuka oleh admin.\n\nAnda dapat melihat data siswa dalam mode baca saja (read only), tetapi belum dapat menginput catatan wali kelas.\n\nSilakan hubungi Administrator untuk membuka periode penilaian.'
                        });
                    }, 500);
                }

                setSemester(sem as 'Ganjil' | 'Genap');
                setJenisPenilaian(jenisAktif as 'PTS' | 'PAS');

                await fetchCatatan(sem, jenisAktif || 'PTS', token);
            } catch (err: any) {
                showModal({ type: 'network', title: 'Koneksi Gagal', message: err.message || 'Tidak dapat terhubung ke server.' });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [showModal]);

    const fetchCatatan = async (sem: string, jenis: string, token: string) => {
        try {
            const res = await fetch(`${API}/catatan-wali-kelas/${jenis}/${sem}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSiswaList(data.data || []);
                    setFilteredSiswa(data.data || []);
                    setKelasNama(data.kelas || 'Kelas Anda');
                } else {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: data.message });
                }
            } else {
                const errData = await parseBackendError(res);

                // ✅ HANDLE ERROR CODES YANG BERBEDA
                if (errData.code === 'NOT_ASSIGNED') {
                    setIsNotAssigned(true);
                } else if (errData.code === 'PERIOD_NOT_OPEN') {
                    setIsReadOnly(true);
                    setReadOnlyReason('not_open');
                    // Tampilkan data kosong, tapi dalam mode read-only
                    setSiswaList([]);
                    setFilteredSiswa([]);
                } else if (errData.code === 'PERIOD_LOCKED') {
                    setIsReadOnly(true);
                    setReadOnlyReason('locked');
                    // Tampilkan data kosong, tapi dalam mode read-only
                    setSiswaList([]);
                    setFilteredSiswa([]);
                } else {
                    showModal({ type: 'error', title: 'Gagal Memuat', message: errData.message });
                }
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    // ====== WARNING SEBELUM UNLOAD ======
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (showEdit) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [showEdit]);

    // ====== FILTER PENCARIAN ======
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredSiswa(siswaList);
        } else {
            const q = searchQuery.toLowerCase().trim();
            setFilteredSiswa(siswaList.filter(s =>
                s.nama.toLowerCase().includes(q) ||
                s.nis.includes(q) ||
                s.nisn.includes(q)
            ));
        }
        setCurrentPage(1);
    }, [searchQuery, siswaList]);

    // ====== HANDLERS ======
    const handleEdit = (siswa: SiswaCatatan) => {
        // ✅ CEK READ-ONLY: Tampilkan warning jika periode tidak aktif
        if (isReadOnly) {
            if (readOnlyReason === 'locked') {
                showModal({
                    type: 'warning',
                    title: 'Mode Baca Saja',
                    message: 'Periode penilaian telah selesai dan data sudah dikunci.\n\nAnda tidak dapat mengedit catatan wali kelas.'
                });
            } else {
                showModal({
                    type: 'warning',
                    title: '⏳ Mode Baca Saja',
                    message: 'Periode penilaian belum aktif.\n\nAnda belum dapat mengedit catatan wali kelas.\n\nSilakan tunggu admin membuka periode penilaian.'
                });
            }
            return;
        }

        const data = {
            catatan_wali_kelas: siswa.catatan_wali_kelas || '',
            naik_tingkat: siswa.naik_tingkat
        };
        setEditId(siswa.id_siswa);
        setEditData(data);
        setOriginalData(data);
        setShowEdit(true);
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'catatan_wali_kelas') {
            setEditData(prev => ({ ...prev, catatan_wali_kelas: value }));
        } else if (name === 'naik_tingkat') {
            setEditData(prev => ({ ...prev, naik_tingkat: value === '' ? null : value as 'ya' | 'tidak' }));
        }
    };

    const openConfirmModal = () => {
        if (!editId || !originalData) return;

        const isPASGenap = jenisPenilaian === 'PAS' && semester === 'Genap';

        const hasChanges = isPASGenap
            ? editData.catatan_wali_kelas !== originalData.catatan_wali_kelas ||
            editData.naik_tingkat !== originalData.naik_tingkat
            : editData.catatan_wali_kelas !== originalData.catatan_wali_kelas;

        if (!hasChanges) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' });
            return;
        }

        const trimmedCatatan = editData.catatan_wali_kelas.trim();
        if (!trimmedCatatan) {
            showModal({ type: 'error', title: 'Catatan Kosong', message: 'Catatan wali kelas wajib diisi.' });
            return;
        }

        if (trimmedCatatan.length < 20) {
            showModal({
                type: 'error',
                title: 'Catatan Terlalu Pendek',
                message: `Catatan wali kelas minimal 20 karakter.\nSaat ini: ${trimmedCatatan.length} karakter.`
            });
            return;
        }

        if (isPASGenap && editData.naik_tingkat !== 'ya' && editData.naik_tingkat !== 'tidak') {
            showModal({
                type: 'error',
                title: 'Keputusan Wajib Diisi',
                message: 'Di PAS Semester Genap, keputusan naik tingkat wajib diisi (Ya/Tidak).'
            });
            return;
        }

        setShowConfirmModal(true);
    };

    const handleSave = async () => {
        if (!editId || !originalData) return;

        const isPASGenap = jenisPenilaian === 'PAS' && semester === 'Genap';

        setIsSaving(true);

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir.' });
            setIsSaving(false);
            return;
        }

        const payload: any = {
            catatan_wali_kelas: editData.catatan_wali_kelas.trim(),
            naik_tingkat: isPASGenap ? editData.naik_tingkat : null
        };

        try {
            const res = await fetch(`${API}/catatan-wali-kelas/${editId}/${jenisPenilaian}/${semester}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSiswaList(prev => prev.map(s =>
                    s.id_siswa === editId
                        ? { ...s, catatan_wali_kelas: payload.catatan_wali_kelas, naik_tingkat: payload.naik_tingkat }
                        : s
                ));
                closeEdit();
                showModal({
                    type: 'success',
                    title: 'Catatan Disimpan!',
                    message: 'Catatan wali kelas berhasil disimpan.'
                });
            } else {
                const errData = await parseBackendError(res);
                showModal({ type: 'error', title: 'Gagal Menyimpan', message: errData.message });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ====== PAGINATION LOGIC ======
    const isPASGenap = jenisPenilaian === 'PAS' && semester === 'Genap';
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

    // ====== BADGE NAIK TINGKAT ======
    const NaikTingkatBadge = ({ value }: { value: 'ya' | 'tidak' | null }) => {
        if (!isPASGenap) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                    –
                </span>
            );
        }

        if (value === 'ya') {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                    <CheckCircle2 size={12} /> Ya
                </span>
            );
        }

        if (value === 'tidak') {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                    <AlertCircle size={12} /> Tidak
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                <AlertCircle size={10} /> Belum diisi
            </span>
        );
    };

    // ====== RENDER UTAMA ======

    // ✅ KONDISI 1: Belum Ditugaskan → Blokir Total
    if (isNotAssigned) {
        return (
            <div className="flex-1 min-h-screen p-6 flex items-center justify-center" style={PAGE_BG}>
                <GlobalStyles />
                {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 ap-fadeIn">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 ap-scaleIn">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center ring-8 ring-red-100 ap-pulse">
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

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />

            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Catatan Wali Kelas</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola catatan perkembangan siswa kelas {kelasNama}
                </p>
            </div>

            {/* ✅ BANNER READ-ONLY (KONDISI 2) */}
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
                                ? 'Periode penilaian telah selesai dan data sudah dikunci. Anda dapat melihat data siswa, tetapi tidak dapat mengedit catatan.'
                                : 'Periode penilaian belum aktif. Anda dapat melihat data siswa, tetapi belum dapat menginput catatan. Silakan hubungi Administrator untuk membuka periode penilaian.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Card Header - Minimalis */}
                <div className="px-6 py-5" style={HEADER_GRAD}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center backdrop-blur-sm shadow-lg">
                            <School className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {kelasNama}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Info banner periode - Hanya tampilkan jika TIDAK read-only */}
                {!isReadOnly && (
                    <div className="mx-5 mt-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                        style={{
                            background: isPASGenap ? '#eaf7ef' : '#fff0e5',
                            border: `1px solid ${isPASGenap ? '#b6e8c8' : '#fde0c8'}`
                        }}>
                        <span className="text-base mt-0.5">{isPASGenap ? '✅' : 'ℹ️'}</span>
                        <p className="text-sm font-medium" style={{ color: isPASGenap ? '#1a7a3a' : '#7a3a0a' }}>
                            {isPASGenap
                                ? 'Periode PAS Semester Genap — Isi catatan dan keputusan naik tingkat.'
                                : 'Keputusan naik tingkat hanya diisi pada periode PAS Semester Genap.'}
                        </p>
                    </div>
                )}

                {/* Toolbar */}
                <div className="px-5 py-4 mt-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" style={{ color: '#c95b08' }} />
                            <span className="text-sm font-semibold" style={{ color: '#7a3a0a' }}>
                                Total: {filteredSiswa.length} siswa
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                                <select value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white border-orange-200">
                                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                            </div>

                            <div className="relative min-w-[200px] sm:min-w-[250px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input type="text" placeholder="Cari nama atau NIS..." value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white border-orange-200 placeholder:text-gray-400" />
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
                    <table className="w-full min-w-[900px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                <th className="px-4 py-3.5 text-center text-xs font-bold text-white w-12">No.</th>
                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white">Nama Siswa</th>
                                <th className="px-4 py-3.5 text-center text-xs font-bold text-white w-28">NIS</th>
                                <th className="px-4 py-3.5 text-center text-xs font-bold text-white w-28">NISN</th>
                                <th className="px-4 py-3.5 text-left text-xs font-bold text-white">Catatan Wali Kelas</th>
                                <th className="px-4 py-3.5 text-center text-xs font-bold text-white w-32">Naik Tingkat</th>
                                <th className="px-4 py-3.5 text-center text-xs font-bold text-white w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 rounded-full border-3 border-orange-300 border-t-orange-600 animate-spin" />
                                        <p className="font-medium">Memuat data...</p>
                                    </div>
                                </td></tr>
                            ) : currentSiswa.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#fff0e5' }}>
                                                <Users size={32} style={{ color: '#c95b08' }} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-700 mb-1">
                                                    {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
                                                </p>
                                                <p className="text-xs text-gray-500 max-w-md mx-auto">
                                                    {searchQuery
                                                        ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}".`
                                                        : `Belum ada siswa yang terdaftar di kelas Anda.`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentSiswa.map((siswa, index) => (
                                <tr key={siswa.id_siswa}
                                    className="transition-all"
                                    style={{
                                        borderBottom: '1px solid #fde0c8',
                                        background: index % 2 === 0 ? '#fff' : '#fffaf6'
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}>
                                    <td className="px-4 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                    <td className="px-4 py-3.5">
                                        <p className="font-bold text-gray-800">{siswa.nama}</p>
                                    </td>
                                    <td className="px-4 py-3.5 text-center text-gray-600 font-mono text-xs">{siswa.nis}</td>
                                    <td className="px-4 py-3.5 text-center text-gray-600 font-mono text-xs">{siswa.nisn}</td>
                                    <td className="px-4 py-3.5">
                                        {siswa.catatan_wali_kelas ? (
                                            <p className="text-xs text-gray-700 line-clamp-2 max-w-[350px] leading-relaxed">
                                                {siswa.catatan_wali_kelas}
                                            </p>
                                        ) : (
                                            <span className="text-gray-500 text-xs">Belum diisi</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <NaikTingkatBadge value={siswa.naik_tingkat} />
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        {/* ✅ TOMBOL EDIT: Disabled jika read-only */}
                                        <button
                                            onClick={() => handleEdit(siswa)}
                                            disabled={isReadOnly}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                background: isReadOnly ? '#e5e7eb' : 'linear-gradient(135deg,#e8690a,#f5a623)',
                                                color: isReadOnly ? '#6b7280' : '#fff',
                                                boxShadow: isReadOnly ? 'none' : '0 2px 8px rgba(232,105,10,0.3)'
                                            }}
                                            onMouseEnter={e => {
                                                if (!isReadOnly) {
                                                    (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isReadOnly) {
                                                    (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)';
                                                }
                                            }}
                                        >
                                            {isReadOnly ? (
                                                <>
                                                    <Lock size={13} /> Terkunci
                                                </>
                                            ) : (
                                                <>
                                                    <Pencil size={13} /> Edit
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredSiswa.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                        <span className="text-sm font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
                        <div className="flex items-center gap-1">{renderPagination()}</div>
                    </div>
                )}
            </div>

            {/* ====== MODAL EDIT ====== */}
            {showEdit && editId !== null && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${editClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${editClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}>

                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl z-10" style={HEADER_GRAD}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-base font-bold text-white">Edit Catatan Wali Kelas</h2>
                            </div>
                            <button onClick={closeEdit}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-4 px-5 py-4 rounded-xl"
                                style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg,#c95b08,#f5a623)' }}>
                                    {siswaList.find(s => s.id_siswa === editId)?.nama.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-gray-800">
                                        {siswaList.find(s => s.id_siswa === editId)?.nama}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        NIS: {siswaList.find(s => s.id_siswa === editId)?.nis} • NISN: {siswaList.find(s => s.id_siswa === editId)?.nisn}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls} style={labelColor}>
                                    Catatan Wali Kelas <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="catatan_wali_kelas"
                                    value={editData.catatan_wali_kelas}
                                    onChange={handleChange}
                                    rows={6}
                                    placeholder="Tuliskan catatan perkembangan siswa ini (minimal 20 karakter)..."
                                    className={inputCls}
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs" style={{ color: editData.catatan_wali_kelas.trim().length < 20 ? '#b91c1c' : '#7a3a0a' }}>
                                        {editData.catatan_wali_kelas.trim().length} karakter (minimal 20)
                                    </p>
                                    {editData.catatan_wali_kelas.trim().length < 20 && editData.catatan_wali_kelas.trim().length > 0 && (
                                        <p className="text-xs text-red-500 font-semibold">
                                            ⚠️ Kurang {20 - editData.catatan_wali_kelas.trim().length} karakter lagi
                                        </p>
                                    )}
                                </div>
                            </div>

                            {isPASGenap ? (
                                <div>
                                    <label className={labelCls} style={labelColor}>
                                        Keputusan Naik Tingkat <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="naik_tingkat"
                                        value={editData.naik_tingkat || ''}
                                        onChange={handleChange}
                                        className={inputCls}
                                    >
                                        <option value="">-- Pilih Keputusan --</option>
                                        <option value="ya">✓ Ya — Naik Tingkat</option>
                                        <option value="tidak">✗ Tidak — Tinggal Kelas</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                                    style={{ background: '#fff0e5', border: '1px solid #fde0c8' }}>
                                    <span className="text-lg mt-0.5">ℹ️</span>
                                    <p className="text-xs font-medium leading-relaxed" style={{ color: '#7a3a0a' }}>
                                        Keputusan naik tingkat hanya diisi pada periode <strong>PAS Semester Genap</strong>.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeEdit}>Batal</BtnSecondary>
                                <button
                                    onClick={openConfirmModal}
                                    disabled={isSaving}
                                    className={btnPrimary.base}
                                    style={{ ...btnPrimary.style, opacity: isSaving ? 0.6 : 1 }}
                                    onMouseEnter={btnPrimary.hover}
                                    onMouseLeave={btnPrimary.leave}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Simpan Perubahan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL KONFIRMASI ====== */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 ap-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 ap-scaleIn">
                        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center ring-8 ring-orange-100 ap-pulse mx-auto mb-4">
                            <ShieldAlert size={32} className="text-orange-500" />
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                            Konfirmasi Penyimpanan
                        </h3>

                        <p className="text-sm text-gray-500 text-center mb-6">
                            Apakah Anda yakin ingin menyimpan catatan wali kelas ini?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    handleSave();
                                }}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                                style={{
                                    background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                    boxShadow: '0 3px 10px rgba(232,105,10,0.3)'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}