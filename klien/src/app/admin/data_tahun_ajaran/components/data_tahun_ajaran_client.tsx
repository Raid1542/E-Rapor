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

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
   NOTIFICATION MODAL
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';

interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

/* ==========================================================================
   DESIGN TOKENS
   ========================================================================== */

const BRAND_GRADIENT = 'linear-gradient(135deg,#c95b08 0%,#e8690a 55%,#f5a623 100%)';
const ACCENT = '#e8690a';
const ACCENT_DARK = '#c95b08';

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
        .d4 { animation-delay: 0.14s; }
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

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={38} className="text-green-500" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={38} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-amber-50', ring: 'ring-amber-100', icon: <ShieldAlert size={38} className="text-amber-500" />, btn: 'bg-amber-500 hover:bg-amber-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200', icon: <WifiOff size={38} className="text-slate-500" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={38} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents w-full">
                    {!isConfirm && (
                        <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                    <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{modal.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-1">{modal.message}</p>
                    </div>
                    {isConfirm ? (
                        <div className="flex gap-2.5 w-full mt-1">
                            <button onClick={onClose} className="btn-action flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors" style={{ borderColor: '#e5e7eb', color: '#4b5563', background: '#fff' }}>Batal</button>
                            <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="btn-action flex-1 text-white font-bold py-2.5 rounded-xl transition-colors text-sm" style={{ background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(232,105,10,0.30)' }}>Lanjutkan</button>
                        </div>
                    ) : (
                        <button onClick={onClose} className={`btn-action w-full ${s.btn} text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-1`}>OK, Mengerti</button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ==========================================================================
   SHARED STYLE CONSTANTS
   ========================================================================== */

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

const labelCls = "block text-xs font-bold mb-1.5 uppercase tracking-wide";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   SISTEM TOMBOL AKSI
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral' | 'success' | 'accent' | 'danger';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#f3f4f6', color: '#4b5563', border: '1.5px solid #d1d5db' },
    success: { background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac' },
    accent: { background: 'linear-gradient(135deg,#fff5eb 0%,#ffe3c2 55%,#fdd7a8 100%)', color: ACCENT_DARK, border: `1.5px solid #f0a94e`, boxShadow: '0 2px 8px rgba(232,105,10,0.18)' },
    danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
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
   SEMESTER BLOCK
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
        className="rounded-xl p-4 flex-1 min-w-[180px] border transition-all"
        style={{
            background: aktif ? accentBg : '#ffffff',
            borderColor: aktif ? accentColor + '40' : '#e5e7eb',
        }}
    >
        <div className="flex items-center justify-between mb-3">
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
                    Aktif
                </span>
            )}
        </div>
        <div className="space-y-2">
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

    const fetchTahunAjaran = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' });
                return;
            }

            // ✅ PERUBAHAN 2: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/tahun-ajaran`, {
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
            // ✅ PERUBAHAN 3: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/tahun-ajaran/${editId}`, {
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
            // ✅ PERUBAHAN 4: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/tahun-ajaran`, {
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
            // ✅ PERUBAHAN 5: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/tahun-ajaran/${item.id_induk}/semester`, {
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
        const btnBase = "min-w-[30px] h-8 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold border-2 transition-colors btn-action";
        const btnActive = "text-white border-transparent";
        const btnInactive = "text-gray-600 border-transparent hover:bg-orange-50 bg-transparent";

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
                pages.push(<span key={p} className="px-1 text-gray-400 text-xs">...</span>);
            } else {
                pages.push(
                    <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`}
                        style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}
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

    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-3xl mx-auto">
                <div className="mb-4 sm:mb-5 flex items-center gap-3 anim-in d1">
                    <button
                        onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); resetForm(); }}
                        aria-label="Kembali"
                        className="btn-action w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2"
                        style={{ background: '#fff', borderColor: '#f0e0d0', color: ACCENT_DARK }}
                    >
                        <ChevronLeft size={19} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                            {isEdit ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
                        </h1>
                        <p className="text-xs sm:text-sm mt-0.5 text-gray-500">
                            {isEdit ? 'Perbarui informasi periode akademik' : 'Isi formulir untuk menambahkan periode akademik baru'}
                        </p>
                    </div>
                </div>

                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>
                    <div className="px-4 sm:px-6 py-4 flex items-center gap-3" style={{ background: BRAND_GRADIENT }}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <CalendarRange size={19} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">
                                {isEdit ? 'Formulir Edit' : 'Formulir Tambah'}
                            </p>
                            <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                                {isEdit ? 'Ubah Data' : 'Tahun Ajaran Baru'}
                            </h2>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="mb-6">
                            <label className={labelCls} style={labelColor}>
                                Periode Tahun Ajaran <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    name="tahun1"
                                    value={formData.tahun1}
                                    onChange={handleInputChange}
                                    placeholder="2024"
                                    className={`w-28 sm:w-32 ${errors.tahun ? inputErrCls : inputCls}`}
                                    disabled={isEdit}
                                    maxLength={4}
                                />
                                <span className="text-2xl font-bold text-gray-300">/</span>
                                <input
                                    type="text"
                                    name="tahun2"
                                    value={formData.tahun2}
                                    onChange={handleInputChange}
                                    placeholder="2025"
                                    className={`w-28 sm:w-32 ${errors.tahun ? inputErrCls : inputCls}`}
                                    disabled={isEdit}
                                    maxLength={4}
                                />
                            </div>
                            {errors.tahun && <p className="text-red-600 text-xs font-semibold mt-1.5">{errors.tahun}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 sm:p-5 rounded-xl border" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fed7aa' }}>
                                        <CalendarRange size={16} style={{ color: '#c2410c' }} />
                                    </div>
                                    <h3 className="text-sm font-bold" style={{ color: '#c2410c' }}>
                                        Semester Ganjil
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1.5" style={labelColor}>
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
                                        <label className="block text-xs font-bold mb-1.5" style={labelColor}>
                                            Tanggal PAS
                                        </label>
                                        <input
                                            type="date"
                                            name="pas_ganjil"
                                            value={formData.pas_ganjil}
                                            onChange={handleInputChange}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-5 rounded-xl border" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#bbf7d0' }}>
                                        <CalendarDays size={16} style={{ color: '#15803d' }} />
                                    </div>
                                    <h3 className="text-sm font-bold" style={{ color: '#15803d' }}>
                                        Semester Genap
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1.5" style={labelColor}>
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
                                        <label className="block text-xs font-bold mb-1.5" style={labelColor}>
                                            Tanggal PAS
                                        </label>
                                        <input
                                            type="date"
                                            name="pas_genap"
                                            value={formData.pas_genap}
                                            onChange={handleInputChange}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="neutral" onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); resetForm(); }}>
                                Batal
                            </ActionButton>
                            <ActionButton variant="info" onClick={resetForm}>
                                Reset
                            </ActionButton>
                            <ActionButton variant="primary" onClick={isEdit ? openConfirmEdit : openConfirmTambah}>
                                {isEdit ? 'Simpan Perubahan' : 'Simpan'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </div>

            {showConfirmTambah && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmTambah(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi Penambahan
                            </h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-5">
                            Anda akan menambahkan tahun ajaran <strong>{formData.tahun1}/{formData.tahun2}</strong>.
                            Tahun ajaran ini akan otomatis aktif.
                        </p>

                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmTambah(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmTambah(false); handleTambah(); }}>
                                Tambah & Aktifkan
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmEdit && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmEdit(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi Perubahan
                            </h3>
                        </div>

                        <div className="text-sm text-gray-500 mb-5">
                            <p className="mb-2">Perubahan yang akan disimpan:</p>
                            <ul className="text-xs space-y-1 ml-4 list-disc">
                                <li>PTS Ganjil: {formData.pts_ganjil ? formatTanggalIndonesia(formData.pts_ganjil) : 'belum diatur'}</li>
                                <li>PAS Ganjil: {formData.pas_ganjil ? formatTanggalIndonesia(formData.pas_ganjil) : 'belum diatur'}</li>
                                <li>PTS Genap: {formData.pts_genap ? formatTanggalIndonesia(formData.pts_genap) : 'belum diatur'}</li>
                                <li>PAS Genap: {formData.pas_genap ? formatTanggalIndonesia(formData.pas_genap) : 'belum diatur'}</li>
                            </ul>
                        </div>

                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmEdit(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmEdit(false); executeEdit(); }}>
                                Simpan Perubahan
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Tahun Ajaran</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola tahun ajaran dan semester aktif</p>
            </div>

            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex-shrink-0">
                        <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                            <Plus size={16} /> <span className="hidden sm:inline">Tambah Tahun Ajaran</span><span className="sm:hidden">Tambah</span>
                        </ActionButton>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                        <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari tahun ajaran..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label="Bersihkan pencarian"
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    className="absolute inset-y-0 right-2.5 flex items-center"
                                    style={{ color: ACCENT }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="card-flat bg-white rounded-2xl py-16 flex flex-col items-center gap-3 anim-in d3" style={CARD_STYLE}>
                    <div className="w-7 h-7 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                    <span className="text-sm text-gray-400">Memuat data...</span>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="card-flat bg-white rounded-2xl py-16 flex flex-col items-center gap-2 anim-in d3" style={CARD_STYLE}>
                    <CalendarRange size={32} className="text-gray-300" />
                    <p className="text-sm font-semibold text-gray-500">Tidak ada data tahun ajaran</p>
                    <p className="text-xs text-gray-400">Coba kata kunci lain atau tambahkan tahun ajaran baru</p>
                </div>
            ) : (
                <>
                    {tahunAktif && (
                        <div
                            className="card-flat bg-white rounded-2xl overflow-hidden mb-4 anim-in d3"
                            style={{ border: '1.5px solid #f5a623', boxShadow: '0 4px 16px rgba(232,105,10,0.12)' }}
                        >
                            <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between" style={{ background: BRAND_GRADIENT }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <CalendarRange size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 leading-none mb-0.5">
                                            Tahun ajaran berjalan
                                        </p>
                                        <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                                            {tahunAktif.tahun_ajaran}
                                        </h3>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/20 text-white whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-white" />
                                    AKTIF
                                </span>
                            </div>

                            <div className="p-4 sm:p-6">
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

                                <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t" style={{ borderColor: '#fde0c8' }}>
                                    <ActionButton variant="warning" fullWidth onClick={() => openEdit(tahunAktif)}>
                                        <Pencil size={14} /> Edit Tanggal
                                    </ActionButton>
                                    <ActionButton variant="accent" fullWidth onClick={() => openConfirmGantiSemester(tahunAktif)}>
                                        <RotateCw size={14} /> Ganti ke Semester {tahunAktif.semester_aktif?.toLowerCase() === 'ganjil' ? 'Genap' : 'Ganjil'}
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {!tahunAktif && (
                        <div className="card-flat bg-white rounded-2xl py-10 flex flex-col items-center gap-2 mb-4 anim-in d3" style={CARD_STYLE}>
                            <AlertCircle size={28} className="text-gray-300" />
                            <p className="text-sm font-semibold text-gray-500">Tidak ada tahun ajaran yang aktif</p>
                            <p className="text-xs text-gray-400">Tambahkan tahun ajaran baru untuk mengaktifkannya</p>
                        </div>
                    )}

                    {riwayatNonaktif.length > 0 && (
                        <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d4" style={CARD_STYLE}>
                            <button
                                onClick={() => setShowRiwayat((v) => !v)}
                                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between transition-colors hover:bg-orange-50/40"
                            >
                                <div className="flex items-center gap-2.5">
                                    <History size={16} style={{ color: ACCENT_DARK }} />
                                    <span className="text-sm font-bold text-gray-700">
                                        Riwayat Tahun Ajaran
                                    </span>
                                    <span
                                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: '#fff0e5', color: ACCENT_DARK }}
                                    >
                                        {riwayatNonaktif.length}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={18}
                                    style={{
                                        color: ACCENT_DARK,
                                        transform: showRiwayat ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                    }}
                                />
                            </button>

                            {showRiwayat && (
                                <div style={{ borderTop: '1px solid #f0f0f0' }}>
                                    <div>
                                        {currentData.map((item, index) => (
                                            <div
                                                key={item.id_induk}
                                                className="row-in row-hover px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                                                style={{ borderBottom: '1px solid #f0f0f0', animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 flex-shrink-0 whitespace-nowrap">
                                                    NONAKTIF
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-4 sm:px-5 py-3" style={{ background: '#fafafa' }}>
                                            <span className="text-xs font-medium text-gray-500">
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

            {showConfirmGantiSemester && selectedItemForSemester && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmGantiSemester(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Ganti Semester
                            </h3>
                        </div>

                        <div className="text-sm text-gray-500 mb-4">
                            <div className="flex items-center justify-center gap-3 py-2 mb-3">
                                <span className="px-3 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-600">
                                    {selectedItemForSemester.semester_aktif}
                                </span>
                                <span style={{ color: ACCENT }}>→</span>
                                <span className="px-3 py-1 rounded-lg text-sm font-bold" style={{ background: '#fff0e5', color: ACCENT_DARK }}>
                                    {selectedItemForSemester.semester_aktif === 'Ganjil' ? 'Genap' : 'Ganjil'}
                                </span>
                            </div>

                            <div className="text-xs space-y-1.5 mb-3">
                                <p className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: ACCENT }}></span>
                                    <span>Data nilai siswa tetap tersimpan</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: ACCENT }}></span>
                                    <span>Dapat bolak-balik untuk koreksi nilai</span>
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className={labelCls} style={labelColor}>
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
                                    className={inputCls}
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
                                        className={`${inputCls} mt-2`}
                                        maxLength={200}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmGantiSemester(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmGantiSemester(false); executeGantiSemester(); }}>
                                Ganti Semester
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}