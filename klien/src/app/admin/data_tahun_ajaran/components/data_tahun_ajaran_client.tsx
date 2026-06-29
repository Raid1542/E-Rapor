"use client";

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Pencil, Plus, X, RotateCw, Search, CheckCircle2,
    AlertCircle, WifiOff, ShieldAlert, CalendarDays,
    CalendarRange, ChevronLeft, ChevronRight as ChevronRightIcon,
    ChevronDown, History,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

/* ==========================================================================
   INTERFACES
   ========================================================================== */

interface TahunAjaran {
    id_induk: number;
    tahun_ajaran: string;
    pts_ganjil: string | null;
    pas_ganjil: string | null;
    pts_genap: string | null;
    pas_genap: string | null;
    semester_aktif: 'Ganjil' | 'Genap' | null;
    status: 'AKTIF' | 'NONAKTIF';
}

interface FormDataType {
    tahun1: string;
    tahun2: string;
    pts_ganjil: string;
    pas_ganjil: string;
    pts_genap: string;
    pas_genap: string;
}

/* ==========================================================================
   NOTIFICATION MODAL - Template dari data_admin_client
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes da-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes da-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes da-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes da-cardIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .da-fadeIn  { animation: da-fadeIn  0.2s ease; }
        .da-scaleIn { animation: da-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .da-pulse   { animation: da-pulse   0.6s ease 0.15s; }
        .da-cardIn  { animation: da-cardIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
    `}</style>
);

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-500" />, btn: 'bg-green-500 hover:bg-green-600' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-500" />, btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={40} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 da-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 da-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} da-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors"
                            style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => {
                                modal.onConfirm?.();
                                onClose();
                            }}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                        >
                            Lanjutkan
                        </button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-3 rounded-xl transition-colors`}>OK, Mengerti</button>
                )}
            </div>
        </div>
    );
};

/* ==========================================================================
   SHARED STYLE CONSTANTS
   ========================================================================== */

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG = { background: '#ffffff' };
const CARD_STYLE = { border: '1px solid #f0e0d0', boxShadow: '0 4px 20px rgba(180,70,10,0.10)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const cleanDate = dateStr.split(' ')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return '-';

    const [year, month, day] = cleanDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime())) return '-';

    const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ][date.getMonth()];

    return `${day} ${bulan} ${year}`;
};

const formatTanggalSingkat = (dateStr?: string | null): string => {
    if (!dateStr) return 'Belum diatur';
    const cleanDate = dateStr.split(' ')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return 'Belum diatur';

    const [year, month, day] = cleanDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return 'Belum diatur';

    const bulan = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ][date.getMonth()];

    return `${day} ${bulan} ${year}`;
};

/* ==========================================================================
   SEMESTER BLOCK — sub-komponen untuk satu blok Ganjil/Genap di dalam card
   ========================================================================== */

const SemesterBlock = ({
    label,
    aktif,
    pts,
    pas,
    accentColor,
    accentBg,
}: {
    label: string;
    aktif: boolean;
    pts: string | null;
    pas: string | null;
    accentColor: string;
    accentBg: string;
}) => (
    <div
        className="rounded-xl p-3.5 flex-1 min-w-[180px]"
        style={{
            background: aktif ? accentBg : '#fafafa',
            border: `1px solid ${aktif ? accentColor + '40' : '#e5e7eb'}`,
        }}
    >
        <div className="flex items-center justify-between mb-2.5">
            <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: aktif ? accentColor : '#9ca3af' }}
            >
                {label}
            </span>
            {aktif && (
                <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: accentColor, color: '#fff' }}
                >
                    Berjalan
                </span>
            )}
        </div>
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#6b7280' }}>PTS</span>
                <span className="font-semibold" style={{ color: '#374151' }}>{formatTanggalSingkat(pts)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#6b7280' }}>PAS</span>
                <span className="font-semibold" style={{ color: '#374151' }}>{formatTanggalSingkat(pas)}</span>
            </div>
        </div>
    </div>
);

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DataTahunAjaranClient() {
    /* --------------------------------------------------------------------
       STATE MANAGEMENT (tidak diubah dari versi asli)
    -------------------------------------------------------------------- */

    const { showSessionExpired, handleLogout } = useSession();

    const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showConfirmGantiSemester, setShowConfirmGantiSemester] = useState(false);
    const [selectedItemForSemester, setSelectedItemForSemester] = useState<TahunAjaran | null>(null);

    const [alasanKoreksi, setAlasanKoreksi] = useState('');
    const [showAlasanLainnya, setShowAlasanLainnya] = useState(false);
    const [alasanCustom, setAlasanCustom] = useState('');

    const [showConfirmTambah, setShowConfirmTambah] = useState(false);
    const [showConfirmEdit, setShowConfirmEdit] = useState(false);

    const [formData, setFormData] = useState<FormDataType>({
        tahun1: '', tahun2: '',
        pts_ganjil: '', pas_ganjil: '',
        pts_genap: '', pas_genap: '',
    });

    const [originalFormData, setOriginalFormData] = useState<FormDataType>({
        tahun1: '', tahun2: '',
        pts_ganjil: '', pas_ganjil: '',
        pts_genap: '', pas_genap: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showRiwayat, setShowRiwayat] = useState(false);

    /* --------------------------------------------------------------------
       DATA FETCHING (tidak diubah dari versi asli)
    -------------------------------------------------------------------- */

    const fetchTahunAjaran = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setTahunAjaranList(data.data);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => {
        fetchTahunAjaran();
    }, [fetchTahunAjaran]);

    /* --------------------------------------------------------------------
       FORM HANDLERS (tidak diubah dari versi asli)
    -------------------------------------------------------------------- */

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};

        if (!formData.tahun1 || !formData.tahun2) {
            errs.tahun = 'Tahun ajaran wajib diisi';
        }

        setErrors(errs);

        if (Object.keys(errs).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai.' });
            return false;
        }

        return true;
    };

    const resetForm = () => {
        setFormData({
            tahun1: '', tahun2: '',
            pts_ganjil: '', pas_ganjil: '',
            pts_genap: '', pas_genap: ''
        });
        setErrors({});
    };

    const hasChanges = () => {
        return (
            formData.pts_ganjil !== originalFormData.pts_ganjil ||
            formData.pas_ganjil !== originalFormData.pas_ganjil ||
            formData.pts_genap !== originalFormData.pts_genap ||
            formData.pas_genap !== originalFormData.pas_genap
        );
    };

    const openConfirmTambah = () => {
        if (!validate()) return;
        setShowConfirmTambah(true);
    };

    const openConfirmEdit = () => {
        if (!validate() || !editId) return;

        if (!hasChanges()) {
            showModal({
                type: 'warning',
                title: 'Tidak Ada Perubahan',
                message: 'Tidak ada tanggal PTS/PAS yang berubah. Tidak perlu menyimpan.'
            });
            return;
        }

        setShowConfirmEdit(true);
    };

    const executeEdit = async () => {
        if (!editId) return;

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/admin/tahun-ajaran/${editId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    pts_ganjil: formData.pts_ganjil || null,
                    pas_ganjil: formData.pas_ganjil,
                    pts_genap: formData.pts_genap || null,
                    pas_genap: formData.pas_genap,
                }),
            });

            if (res.ok) {
                setShowEdit(false);
                setEditId(null);
                await fetchTahunAjaran();

                window.dispatchEvent(new CustomEvent('tahunAjaranUpdated'));
                localStorage.setItem('tahunAjaranUpdated', Date.now().toString());

                showModal({ type: 'success', title: 'Data Diperbarui', message: 'Tahun ajaran berhasil diperbarui.' });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const handleTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/admin/tahun-ajaran', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    tahun1: formData.tahun1,
                    tahun2: formData.tahun2,
                    pts_ganjil: formData.pts_ganjil || null,
                    pas_ganjil: formData.pas_ganjil,
                    pts_genap: formData.pts_genap || null,
                    pas_genap: formData.pas_genap,
                }),
            });

            if (res.ok) {
                setShowTambah(false);
                resetForm();
                await fetchTahunAjaran();

                window.dispatchEvent(new CustomEvent('tahunAjaranUpdated'));
                window.dispatchEvent(new CustomEvent('semesterUpdated'));
                localStorage.setItem('tahunAjaranUpdated', Date.now().toString());
                localStorage.setItem('semesterUpdated', Date.now().toString());

                showModal({
                    type: 'success',
                    title: 'Berhasil Ditambahkan',
                    message: `Tahun ajaran ${formData.tahun1}/${formData.tahun2} berhasil ditambahkan dan diaktifkan.\n\nTahun ajaran sebelumnya otomatis dinonaktifkan.`
                });
            } else {
                const err = await res.json();
                showModal({ type: 'error', title: 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const openEdit = (item: TahunAjaran) => {
        const [t1, t2] = item.tahun_ajaran.split('/');
        setEditId(item.id_induk);

        const data = {
            tahun1: t1 || '',
            tahun2: t2 || '',
            pts_ganjil: item.pts_ganjil || '',
            pas_ganjil: item.pas_ganjil || '',
            pts_genap: item.pts_genap || '',
            pas_genap: item.pas_genap || '',
        };

        setFormData(data);
        setOriginalFormData(data);
        setErrors({});
        setShowEdit(true);
    };

    const openConfirmGantiSemester = (item: TahunAjaran) => {
        setSelectedItemForSemester(item);
        setShowConfirmGantiSemester(true);
        setAlasanKoreksi('');
        setAlasanCustom('');
        setShowAlasanLainnya(false);
    };

    const executeGantiSemester = async () => {
        if (!selectedItemForSemester) return;

        const alasanFinal = showAlasanLainnya ? alasanCustom.trim() : alasanKoreksi;
        if (!alasanFinal) {
            showModal({
                type: 'warning',
                title: 'Alasan Wajib Diisi',
                message: 'Silakan pilih atau isi alasan pergantian semester.'
            });
            return;
        }

        const item = selectedItemForSemester;
        const semesterBaru = item.semester_aktif === 'Ganjil' ? 'Genap' : 'Ganjil';

        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' });
            return;
        }

        setShowConfirmGantiSemester(false);

        try {
            const res = await fetch(`http://localhost:5000/api/admin/tahun-ajaran/${item.id_induk}/semester`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    semester_baru: semesterBaru,
                    alasan: alasanFinal
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                await fetchTahunAjaran();

                window.dispatchEvent(new CustomEvent('tahunAjaranUpdated'));
                window.dispatchEvent(new CustomEvent('semesterUpdated'));
                localStorage.setItem('tahunAjaranUpdated', Date.now().toString());
                localStorage.setItem('semesterUpdated', Date.now().toString());

                setAlasanKoreksi('');
                setAlasanCustom('');
                setShowAlasanLainnya(false);

                let successMessage = data.message || `Semester berhasil diganti ke ${semesterBaru}.`;
                if (data.data?.catatan) {
                    successMessage += `\n\n${data.data.catatan}`;
                }

                showModal({
                    type: 'success',
                    title: 'Semester Berhasil Diganti',
                    message: successMessage
                });
            } else {
                showModal({
                    type: 'error',
                    title: 'Gagal Ganti Semester',
                    message: data.message || 'Terjadi kesalahan saat mengganti semester.'
                });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    /* --------------------------------------------------------------------
       FILTER & PAGINATION
       Data dipisah jadi 2 kelompok: tahun ajaran AKTIF (maksimal 1, tampil
       sebagai hero card) dan riwayat NONAKTIF (collapsible, dengan
       pagination sendiri karena bisa jadi banyak seiring waktu).
    -------------------------------------------------------------------- */

    const filteredData = tahunAjaranList.filter((item) => {
        const query = searchQuery.toLowerCase().trim();
        return !query || item.tahun_ajaran.toLowerCase().includes(query);
    });

    const tahunAktif = filteredData.find((item) => item.status === 'AKTIF') || null;
    const riwayatNonaktif = filteredData.filter((item) => item.status !== 'AKTIF');

    const totalPages = Math.max(1, Math.ceil(riwayatNonaktif.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = riwayatNonaktif.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive = "text-white border-orange-500";
        const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";

        pages.push(
            <button
                key="prev"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}
            >
                <ChevronLeft size={14} />
            </button>
        );

        const range: number[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) range.push(i);
        } else {
            range.push(1);
            if (currentPage > 3) range.push(-1);
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                range.push(i);
            }
            if (currentPage < totalPages - 2) range.push(-2);
            range.push(totalPages);
        }

        range.forEach((p) => {
            if (p < 0) {
                pages.push(<span key={p} className="px-1 text-gray-400 text-sm">...</span>);
            } else {
                pages.push(
                    <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}
                    >
                        {p}
                    </button>
                );
            }
        });

        pages.push(
            <button
                key="next"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`${btnBase} ${btnInactive} disabled:opacity-40`}
            >
                <ChevronRightIcon size={14} />
            </button>
        );

        return pages;
    };

    /* --------------------------------------------------------------------
       FORM PAGE RENDER
    -------------------------------------------------------------------- */

    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-6 flex items-center gap-3">
                <button
                    onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); resetForm(); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: '#fff', border: '1px solid #fde0c8', color: '#c95b08' }}
                >
                    <ChevronLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                        {isEdit ? 'Perbarui tanggal PTS dan PAS' : 'Buat periode tahun ajaran baru'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                {/* Card header gradient — konsisten dengan pola Data Admin */}
                <div className="px-6 py-5 flex items-center gap-3" style={HEADER_GRAD}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <CalendarRange size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                            {isEdit ? 'Formulir Edit' : 'Formulir Tambah'}
                        </p>
                        <h2 className="text-base font-bold text-white leading-tight">
                            {isEdit ? 'Ubah Tahun Ajaran' : 'Tahun Ajaran Baru'}
                        </h2>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="mb-7">
                        <label className={labelCls} style={labelColor}>
                            Tahun Ajaran <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                name="tahun1"
                                value={formData.tahun1}
                                onChange={handleInputChange}
                                placeholder="2024"
                                className={`w-32 ${errors.tahun ? inputErrCls : inputCls}`}
                                disabled={isEdit}
                            />
                            <span className="text-2xl font-bold text-gray-300">/</span>
                            <input
                                type="text"
                                name="tahun2"
                                value={formData.tahun2}
                                onChange={handleInputChange}
                                placeholder="2025"
                                className={`w-32 ${errors.tahun ? inputErrCls : inputCls}`}
                                disabled={isEdit}
                            />
                        </div>
                        {errors.tahun && <p className="text-red-500 text-xs mt-1.5">{errors.tahun}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
                        <div
                            className="p-4 rounded-xl border"
                            style={{ background: '#fff7ed', borderColor: '#fdba74' }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarRange size={16} style={{ color: '#c2410c' }} />
                                <h3 className="text-sm font-bold" style={{ color: '#c2410c' }}>
                                    Semester Ganjil
                                </h3>
                            </div>
                            <div className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={labelColor}>
                                        Tanggal PTS
                                    </label>
                                    <input
                                        type="date"
                                        name="pts_ganjil"
                                        value={formData.pts_ganjil}
                                        onChange={handleInputChange}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={labelColor}>
                                        Tanggal PAS
                                    </label>
                                    <input
                                        type="date"
                                        name="pas_ganjil"
                                        value={formData.pas_ganjil}
                                        onChange={handleInputChange}
                                        className={errors.pas_ganjil ? inputErrCls : inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        <div
                            className="p-4 rounded-xl border"
                            style={{ background: '#f0fdf4', borderColor: '#86efac' }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarDays size={16} style={{ color: '#15803d' }} />
                                <h3 className="text-sm font-bold" style={{ color: '#15803d' }}>
                                    Semester Genap
                                </h3>
                            </div>
                            <div className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={labelColor}>
                                        Tanggal PTS
                                    </label>
                                    <input
                                        type="date"
                                        name="pts_genap"
                                        value={formData.pts_genap}
                                        onChange={handleInputChange}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={labelColor}>
                                        Tanggal PAS
                                    </label>
                                    <input
                                        type="date"
                                        name="pas_genap"
                                        value={formData.pas_genap}
                                        onChange={handleInputChange}
                                        className={errors.pas_genap ? inputErrCls : inputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-5" style={{ borderTop: '1px solid #fde0c8' }}>
                        {/* Batal — merah, konsisten dengan Data Admin */}
                        <button
                            onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); resetForm(); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
                        >
                            Batal
                        </button>

                        {/* Reset — biru, konsisten dengan Data Admin */}
                        <button
                            onClick={resetForm}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                        >
                            Reset
                        </button>

                        <button
                            onClick={isEdit ? openConfirmEdit : openConfirmTambah}
                            className={btnPrimary.base}
                            style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
                            onMouseEnter={btnPrimary.hover}
                            onMouseLeave={btnPrimary.leave}
                        >
                            {isEdit ? 'Simpan Perubahan' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal - Tambah */}
            {showConfirmTambah && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 da-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmTambah(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 da-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi Penambahan Data
                            </h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6">
                            Anda akan menambahkan tahun ajaran <strong>{formData.tahun1}/{formData.tahun2}</strong>.
                            Tahun ajaran ini akan otomatis aktif dan tahun ajaran sebelumnya akan dinonaktifkan.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmTambah(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmTambah(false);
                                    handleTambah();
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                Tambah & Aktifkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal - Edit */}
            {showConfirmEdit && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 da-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmEdit(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 da-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi Perubahan Data
                            </h3>
                        </div>

                        <div className="text-sm text-gray-600 mb-6">
                            <p className="mb-2">Perubahan yang akan disimpan:</p>
                            <ul className="text-xs space-y-1 ml-4">
                                <li>PTS Ganjil: {formData.pts_ganjil ? formatTanggalIndonesia(formData.pts_ganjil) : 'belum diatur'}</li>
                                <li>PAS Ganjil: {formData.pas_ganjil ? formatTanggalIndonesia(formData.pas_ganjil) : 'belum diatur'}</li>
                                <li>PTS Genap: {formData.pts_genap ? formatTanggalIndonesia(formData.pts_genap) : 'belum diatur'}</li>
                                <li>PAS Genap: {formData.pas_genap ? formatTanggalIndonesia(formData.pas_genap) : 'belum diatur'}</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmEdit(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmEdit(false);
                                    executeEdit();
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    /* --------------------------------------------------------------------
       MAIN LIST RENDER — hero aktif + riwayat collapsible
    -------------------------------------------------------------------- */

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Tahun Ajaran</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                    Kelola tahun ajaran dan semester aktif
                </p>
            </div>

            {/* Toolbar: tambah + search + items per page */}
            <div
                className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-3"
                style={CARD_STYLE}
            >
                <button
                    onClick={() => setShowTambah(true)}
                    className={btnPrimary.base}
                    style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover}
                    onMouseLeave={btnPrimary.leave}
                >
                    <Plus size={16} /> Tambah Tahun Ajaran
                </button>

                <div className="flex items-center gap-3">
                    <div className="relative min-w-[200px] max-w-xs">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari tahun ajaran..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                className="absolute inset-y-0 right-2 flex items-center"
                                style={{ color: '#c95b08' }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl py-16 flex flex-col items-center gap-3" style={CARD_STYLE}>
                    <div className="w-7 h-7 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                    <span className="text-sm text-gray-400">Memuat data...</span>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="bg-white rounded-2xl py-16 flex flex-col items-center gap-2" style={CARD_STYLE}>
                    <CalendarRange size={32} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Tidak ada data tahun ajaran</p>
                    <p className="text-xs text-gray-400">Coba kata kunci lain atau tambahkan tahun ajaran baru</p>
                </div>
            ) : (
                <>
                    {/* ============================================================
                        HERO: Tahun Ajaran Aktif
                        Cuma 1 tahun ajaran yang bisa aktif sekaligus, jadi
                        ditampilkan besar dan menonjol, terpisah dari riwayat.
                    ============================================================ */}
                    {tahunAktif && (
                        <div
                            className="da-cardIn bg-white rounded-2xl overflow-hidden mb-5"
                            style={{ boxShadow: '0 6px 24px rgba(232,105,10,0.18)', border: '1.5px solid #f5a623' }}
                        >
                            <div
                                className="px-6 py-5 flex items-center justify-between"
                                style={HEADER_GRAD}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <CalendarRange size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                                            Tahun ajaran berjalan
                                        </p>
                                        <h3 className="text-xl font-bold text-white leading-tight">
                                            {tahunAktif.tahun_ajaran}
                                        </h3>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/20 text-white">
                                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-white" />
                                    AKTIF
                                </span>
                            </div>

                            <div className="p-6">
                                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                                    <SemesterBlock
                                        label="Ganjil"
                                        aktif={tahunAktif.semester_aktif === 'Ganjil'}
                                        pts={tahunAktif.pts_ganjil}
                                        pas={tahunAktif.pas_ganjil}
                                        accentColor="#c2410c"
                                        accentBg="#fff7ed"
                                    />
                                    <SemesterBlock
                                        label="Genap"
                                        aktif={tahunAktif.semester_aktif === 'Genap'}
                                        pts={tahunAktif.pts_genap}
                                        pas={tahunAktif.pas_genap}
                                        accentColor="#15803d"
                                        accentBg="#f0fdf4"
                                    />
                                </div>

                                <div className="flex gap-2.5 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                    <button
                                        onClick={() => openEdit(tahunAktif)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-orange-100"
                                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                    >
                                        <Pencil size={14} /> Edit Tanggal
                                    </button>
                                    <button
                                        onClick={() => openConfirmGantiSemester(tahunAktif)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-orange-100"
                                        style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                    >
                                        <RotateCw size={14} /> Ganti ke Semester {tahunAktif.semester_aktif === 'Ganjil' ? 'Genap' : 'Ganjil'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!tahunAktif && (
                        <div className="bg-white rounded-2xl py-10 flex flex-col items-center gap-2 mb-5" style={CARD_STYLE}>
                            <AlertCircle size={28} className="text-gray-300" />
                            <p className="text-sm font-medium text-gray-500">Tidak ada tahun ajaran yang aktif</p>
                            <p className="text-xs text-gray-400">Tambahkan tahun ajaran baru untuk mengaktifkannya</p>
                        </div>
                    )}

                    {/* ============================================================
                        RIWAYAT: Tahun Ajaran Nonaktif (collapsible)
                    ============================================================ */}
                    {riwayatNonaktif.length > 0 && (
                        <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>
                            <button
                                onClick={() => setShowRiwayat((v) => !v)}
                                className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-orange-50/40"
                            >
                                <div className="flex items-center gap-2.5">
                                    <History size={16} style={{ color: '#c95b08' }} />
                                    <span className="text-sm font-bold text-gray-700">
                                        Riwayat Tahun Ajaran
                                    </span>
                                    <span
                                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: '#fff0e5', color: '#c95b08' }}
                                    >
                                        {riwayatNonaktif.length}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={18}
                                    style={{
                                        color: '#c95b08',
                                        transform: showRiwayat ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                    }}
                                />
                            </button>

                            {showRiwayat && (
                                <div style={{ borderTop: '1px solid #fde0c8' }}>
                                    <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
                                        {currentData.map((item) => (
                                            <div
                                                key={item.id_induk}
                                                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
                                                style={{ borderBottom: '1px solid #f3f4f6' }}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f3f4f6' }}>
                                                        <CalendarRange size={14} className="text-gray-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-700">{item.tahun_ajaran}</p>
                                                        <p className="text-xs text-gray-400">
                                                            Ganjil: {formatTanggalSingkat(item.pts_ganjil)} – {formatTanggalSingkat(item.pas_ganjil)}
                                                            {'  ·  '}
                                                            Genap: {formatTanggalSingkat(item.pts_genap)} – {formatTanggalSingkat(item.pas_genap)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 flex-shrink-0">
                                                    NONAKTIF
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-5 py-3">
                                            <span className="text-xs font-medium" style={{ color: '#c95b08' }}>
                                                Halaman {currentPage} dari {totalPages}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {renderPagination()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Confirmation Modal - Ganti Semester */}
            {showConfirmGantiSemester && selectedItemForSemester && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 da-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmGantiSemester(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 da-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Ganti Semester
                            </h3>
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                            <div className="flex items-center justify-center gap-3 py-2 mb-3">
                                <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-gray-100">
                                    {selectedItemForSemester.semester_aktif}
                                </span>
                                <span className="text-orange-600">→</span>
                                <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ background: '#fff0e5', color: '#c95b08' }}>
                                    {selectedItemForSemester.semester_aktif === 'Ganjil' ? 'Genap' : 'Ganjil'}
                                </span>
                            </div>

                            <div className="text-xs space-y-1.5 mb-3">
                                <p className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: '#e8690a' }}></span>
                                    <span>Data nilai siswa tetap tersimpan</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: '#e8690a' }}></span>
                                    <span>Dapat bolak-balik untuk koreksi nilai</span>
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#7a3a0a' }}>
                                    Alasan Ganti Semester <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={showAlasanLainnya ? 'lainnya' : alasanKoreksi}
                                    onChange={(e) => {
                                        if (e.target.value === 'lainnya') {
                                            setShowAlasanLainnya(true);
                                            setAlasanKoreksi('');
                                        } else {
                                            setShowAlasanLainnya(false);
                                            setAlasanKoreksi(e.target.value);
                                            setAlasanCustom('');
                                        }
                                    }}
                                    className="w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200"
                                >
                                    <option value="">-- Pilih Alasan --</option>
                                    <option value="Koreksi nilai siswa">Koreksi nilai siswa yang keliru</option>
                                    <option value="Input nilai belum selesai">Input nilai belum selesai</option>
                                    <option value="Pindah ke semester baru">Pindah ke semester baru</option>
                                    <option value="Revisi rapor">Revisi rapor sebelum dibagikan</option>
                                    <option value="lainnya">Lainnya (isi manual)</option>
                                </select>

                                {showAlasanLainnya && (
                                    <input
                                        type="text"
                                        value={alasanCustom}
                                        onChange={(e) => setAlasanCustom(e.target.value)}
                                        placeholder="Tulis alasan Anda..."
                                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all focus:ring-2 focus:ring-orange-400 bg-orange-50/40 border-orange-200 mt-2"
                                        maxLength={200}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmGantiSemester(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmGantiSemester(false);
                                    executeGantiSemester();
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                Ganti Semester
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}