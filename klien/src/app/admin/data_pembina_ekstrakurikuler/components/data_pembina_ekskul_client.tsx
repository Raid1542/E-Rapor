/**
 * Nama File: data_pembina_ekskul_client.tsx
 * Fungsi: Komponen klien untuk mengelola data pembina ekstrakurikuler,
 *         mencakup fitur tambah, edit, detail, import Excel, filter,
 *         pencarian, dan pagination.
 * Update: Konsisten dengan data_admin_client.tsx — tanpa avatar inisial di kolom nama
 * UPDATE: ✅ Menambahkan fitur filter berdasarkan Jenis Kelamin dan Status
 * UPDATE 2: Animasi disamakan dengan data_admin_client.tsx (fadeInUp, section-card, item-hover, btn-primary)
 */

'use client';

import { useState, useEffect, ChangeEvent, ReactNode, useCallback } from 'react';
import {
    Eye, Pencil, Upload, X, Plus, Search, Filter, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, ChevronLeft, Users, Award,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

/* ==========================================================================
   INTERFACES
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';
interface ModalConfig {
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
}

interface PembinaEkskul {
    id: number;
    nama: string;
    niy?: string;
    nuptk?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenisKelamin?: string;
    alamat?: string;
    no_telepon?: string;
    statusPembina?: string;
}

interface FormDataType {
    nama: string;
    niy: string;
    nuptk: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    jenisKelamin: string;
    alamat: string;
    no_telepon: string;
    statusPembina: string;
}

/* ==========================================================================
   GLOBAL STYLES
   ========================================================================== */

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes pe-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pe-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pe-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes pe-cardIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pe-fadeIn  { animation: pe-fadeIn  0.2s ease; }
        .pe-scaleIn { animation: pe-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .pe-pulse   { animation: pe-pulse   0.6s ease 0.15s; }
        .pe-cardIn  { animation: pe-cardIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }

        /* ── Animasi "muncul dari bawah" ala Dashboard / Data Admin ── */
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0);    }
        }
        .anim-in { animation: fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) forwards; opacity: 0; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.10s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.20s; }
        .d5 { animation-delay: 0.25s; }
        .d6 { animation-delay: 0.30s; }

        /* ── Hover lift untuk card & row, konsisten dengan Dashboard ── */
        .section-card {
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1),
                        box-shadow 0.25s ease;
        }
        .section-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 28px rgba(180,70,10,0.13) !important;
        }
        .item-hover {
            transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                        box-shadow 0.18s ease;
        }
        .item-hover:hover {
            transform: translateY(-1px) scale(1.002);
            box-shadow: inset 0 0 0 9999px rgba(232,105,10,0.03);
        }
        .btn-primary {
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .btn-primary:hover  { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(232,105,10,0.34); }
        .btn-primary:active { transform: translateY(0); }
    `}</style>
);

/* ==========================================================================
   NOTIFICATION MODAL
   ========================================================================== */

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pe-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 pe-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} pe-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">Lanjutkan</button>
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
const TH_GRAD = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

const BtnReset = ({ onClick, children = 'Reset' }: { onClick: () => void; children?: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
    >
        {children}
    </button>
);

/* ==========================================================================
   HELPERS
   ========================================================================== */

const formatGender = (g?: string | null): string => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l' || s.includes('laki')) return 'Laki-laki';
    if (s === 'perempuan' || s === 'p' || s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

const formatDateInput = (dateString?: string): string => {
    if (!dateString) return '';
    try {
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch { return ''; }
};

const formatTanggalIndo = (dateString?: string | null): string => {
    if (!dateString) return '-';
    if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DataPembinaEkskulClient() {
    const { showSessionExpired, handleLogout } = useSession();

    /* ------------------------------------------------------------------
       STATE
    ------------------------------------------------------------------ */

    const [pembinaList, setPembinaList] = useState<PembinaEkskul[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedPembina, setSelectedPembina] = useState<PembinaEkskul | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);
    const [importClosing, setImportClosing] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [filterValues, setFilterValues] = useState({ jenisKelamin: '', status: '' });
    const [tempFilterValues, setTempFilterValues] = useState({ jenisKelamin: '', status: '' });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'add' | 'edit' | null>(null);

    const [modal, setModal] = useState<ModalConfig | null>(null);
    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [formData, setFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', statusPembina: 'aktif',
    });

    const [originalFormData, setOriginalFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', statusPembina: 'aktif',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ------------------------------------------------------------------
       FETCH
    ------------------------------------------------------------------ */

    const fetchPembina = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
                return;
            }
            const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setPembinaList(Array.isArray(data.data) ? data.data.map((p: any) => {
                    let s = 'aktif';
                    if (typeof p.status === 'string') {
                        s = p.status.trim().toLowerCase();
                        if (s !== 'aktif') s = 'nonaktif';
                    }
                    return {
                        id: p.id_user || p.id,
                        nama: p.nama_lengkap || p.nama,
                        niy: p.niy,
                        nuptk: p.nuptk,
                        tempat_lahir: p.tempat_lahir || '',
                        tanggal_lahir: p.tanggal_lahir || '',
                        jenisKelamin: p.jenis_kelamin || '',
                        alamat: p.alamat || '',
                        no_telepon: p.no_telepon || '',
                        statusPembina: s,
                    };
                }) : []);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data pembina.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchPembina(); }, [fetchPembina]);

    /* ------------------------------------------------------------------
       FORM HANDLERS
    ------------------------------------------------------------------ */

    const handleDetail = (pembina: PembinaEkskul) => {
        setSelectedPembina(pembina);
        setShowDetail(true);
    };

    const handleEdit = (pembina: PembinaEkskul) => {
        setEditId(pembina.id);
        const data: FormDataType = {
            nama: pembina.nama || '',
            niy: pembina.niy || '',
            nuptk: pembina.nuptk || '',
            tempat_lahir: pembina.tempat_lahir || '',
            tanggal_lahir: formatDateInput(pembina.tanggal_lahir),
            jenisKelamin: pembina.jenisKelamin || 'Laki-laki',
            alamat: pembina.alamat || '',
            no_telepon: pembina.no_telepon || '',
            statusPembina: pembina.statusPembina === 'aktif' ? 'aktif' : 'nonaktif',
        };
        setFormData(data);
        setOriginalFormData(data);
        setShowEdit(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nama?.trim()) ne.nama = 'Nama wajib diisi';
        if (!formData.tempat_lahir?.trim()) ne.tempat_lahir = 'Tempat lahir wajib diisi';
        if (!formData.jenisKelamin) ne.jenisKelamin = 'Pilih jenis kelamin';
        if (!formData.tanggal_lahir) {
            ne.tanggal_lahir = 'Tanggal lahir wajib diisi';
        } else {
            const dob = new Date(formData.tanggal_lahir);
            if (isNaN(dob.getTime())) {
                ne.tanggal_lahir = 'Tanggal lahir tidak valid';
            } else {
                const today = new Date();
                const dobMid = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
                const todMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                if (dobMid > todMid) {
                    ne.tanggal_lahir = 'Tanggal lahir tidak boleh di masa depan';
                } else {
                    let age = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                    if (age < 18) ne.tanggal_lahir = 'Usia minimal 18 tahun';
                }
            }
        }
        if (showEdit && (!formData.statusPembina || formData.statusPembina === '')) {
            ne.statusPembina = 'Status wajib dipilih';
        }

        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            const firstKey = Object.keys(ne)[0];
            setTimeout(() => {
                const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
                if (el && typeof el.focus === 'function') el.focus();
            }, 10);
            return false;
        }
        return true;
    };

    const hasChanges = (): boolean => (
        formData.nama !== originalFormData.nama ||
        formData.niy !== originalFormData.niy ||
        formData.nuptk !== originalFormData.nuptk ||
        formData.tempat_lahir !== originalFormData.tempat_lahir ||
        formData.tanggal_lahir !== originalFormData.tanggal_lahir ||
        formData.jenisKelamin !== originalFormData.jenisKelamin ||
        formData.alamat !== originalFormData.alamat ||
        formData.no_telepon !== originalFormData.no_telepon ||
        formData.statusPembina !== originalFormData.statusPembina
    );

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (!validate()) return;
        if (action === 'edit' && !hasChanges()) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang berubah. Tidak perlu menyimpan.' });
            return;
        }
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nama_lengkap: formData.nama,
                    niy: formData.niy,
                    nuptk: formData.nuptk,
                    tempat_lahir: formData.tempat_lahir,
                    tanggal_lahir: formData.tanggal_lahir,
                    jenis_kelamin: formData.jenisKelamin,
                    alamat: formData.alamat,
                    no_telepon: formData.no_telepon,
                }),
            });
            if (res.ok) {
                setShowTambah(false);
                handleReset();
                await fetchPembina();
                showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data pembina ${formData.nama} berhasil ditambahkan.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data pembina.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const executeEdit = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/pembina-ekskul/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nama_lengkap: formData.nama,
                    niy: formData.niy,
                    nuptk: formData.nuptk,
                    tempat_lahir: formData.tempat_lahir,
                    tanggal_lahir: formData.tanggal_lahir,
                    jenis_kelamin: formData.jenisKelamin,
                    alamat: formData.alamat,
                    no_telepon: formData.no_telepon,
                    status: formData.statusPembina,
                }),
            });
            if (res.ok) {
                setShowEdit(false);
                setEditId(null);
                handleReset();
                await fetchPembina();
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data pembina ${formData.nama} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data pembina.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const handleReset = () => {
        setFormData({
            nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
            jenisKelamin: '', alamat: '', no_telepon: '', statusPembina: 'aktif',
        });
        setErrors({});
    };

    // ✅ FUNGSI DOWNLOAD ERROR REPORT
    const downloadErrorReport = (skipped: any[]) => {
        const csvContent = [
            ['No', 'Baris', 'Nama', 'Alasan Error'].join(','),
            ...skipped.map((d, index) => [
                index + 1,
                d.row,
                `"${d.nama}"`,
                `"${d.reason}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `error_import_pembina_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ✅ PERBAIKAN: Notifikasi import lebih clean dan simpel
    const handleImportExcel = async () => {
        if (!importFile) {
            showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' });
            return;
        }

        const fd = new FormData();
        fd.append('file', importFile);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/pembina-ekskul/import', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });

            const result = await res.json();

            if (res.ok && result.success) {
                setShowImport(false);
                setImportFile(null);
                await fetchPembina();

                if (result.skipped && result.skipped.length > 0) {
                    const skippedCount = result.skipped.length;

                    // ✅ FORMAT NOTIFIKASI - SIMPLE & CLEAR (tanpa emoji berlebihan)
                    const summaryLines = [
                        `Berhasil: ${result.total} pembina`,
                        `Dilewati: ${skippedCount} pembina`,
                        '',
                        skippedCount <= 5
                            ? 'Data yang dilewati:'
                            : `Contoh error (3 dari ${skippedCount}):`,
                        ...result.skipped.slice(0, skippedCount <= 5 ? skippedCount : 3).map((d: any, i: number) =>
                            `${i + 1}. Baris ${d.row}: ${d.nama} - ${d.reason}`
                        ),
                        ...(skippedCount > 5 ? [`\n... dan ${skippedCount - 3} data lainnya`] : []),
                    ];

                    showModal({
                        type: 'warning',
                        title: 'Import Selesai',
                        message: summaryLines.join('\n')
                    });

                    // ✅ AUTO-DOWNLOAD CSV jika error > 5
                    if (skippedCount > 5) {
                        downloadErrorReport(result.skipped);
                    }
                } else {
                    showModal({
                        type: 'success',
                        title: 'Import Berhasil',
                        message: `Berhasil mengimport ${result.total} data pembina.`
                    });
                }
            } else {
                showModal({
                    type: 'error',
                    title: 'Import Gagal',
                    message: result.message || 'Terjadi kesalahan saat mengimpor data.'
                });
            }
        } catch {
            showModal({
                type: 'network',
                title: 'Koneksi Gagal',
                message: 'Tidak dapat terhubung ke server.'
            });
        }
    };

    /* ------------------------------------------------------------------
       FILTER & PAGINATION
    ------------------------------------------------------------------ */

    const filteredPembina = pembinaList.filter(p => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || p.nama?.toLowerCase().includes(q) || p.niy?.includes(q) ||
            p.nuptk?.includes(q) || p.tempat_lahir?.toLowerCase().includes(q) || p.no_telepon?.includes(q);

        const matchesGender = !filterValues.jenisKelamin ||
            p.jenisKelamin?.toLowerCase() === filterValues.jenisKelamin.toLowerCase();

        const matchesStatus = !filterValues.status ||
            p.statusPembina?.toLowerCase() === filterValues.status.toLowerCase();

        return matchesSearch && matchesGender && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredPembina.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPembina = filteredPembina.slice(startIndex, endIndex);

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200);
    };

    const closeImport = () => {
        setImportClosing(true);
        setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200);
    };

    const resetFilter = () => {
        const e = { jenisKelamin: '', status: '' };
        setFilterValues(e);
        setTempFilterValues(e);
    };

    const openFilterModal = () => {
        setTempFilterValues(filterValues);
        setShowFilter(true);
    };

    const applyFilter = () => {
        setFilterValues(tempFilterValues);
        setFilterClosing(true);
        setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200);
    };

    const closeFilterModal = () => {
        setFilterClosing(true);
        setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200);
    };

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

    /* ------------------------------------------------------------------
       FORM RENDER — dengan back-button header
    ------------------------------------------------------------------ */

    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header dengan back-button */}
            <div className="mb-6 flex items-center gap-3 anim-in d1">
                <button
                    onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: '#fff', border: '1px solid #fde0c8', color: '#c95b08' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                    <ChevronLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEdit ? 'Edit Data Pembina' : 'Tambah Data Pembina'}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                        {isEdit ? 'Perbarui informasi data pembina ekstrakurikuler' : 'Isi formulir untuk menambahkan pembina baru'}
                    </p>
                </div>
            </div>

            {/* Form card */}
            <div className="section-card bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>

                {/* Card header gradient */}
                <div className="px-6 py-5 flex items-center gap-3" style={HEADER_GRAD}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Award size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                            {isEdit ? 'Formulir Edit' : 'Formulir Tambah'}
                        </p>
                        <h2 className="text-base font-bold text-white leading-tight">
                            {isEdit ? 'Ubah Data Pembina' : 'Data Pembina Baru'}
                        </h2>
                    </div>
                </div>

                {/* Form body */}
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Nama */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                            <input type="text" name="nama" value={formData.nama} onChange={handleInputChange}
                                placeholder="Ketik nama lengkap"
                                className={errors.nama ? inputErrCls : inputCls} />
                            {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
                        </div>

                        {/* NIY */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>NIY</label>
                            <input type="text" name="niy" value={formData.niy} onChange={handleInputChange}
                                placeholder="Nomor Induk Yayasan" className={inputCls} />
                        </div>

                        {/* NUPTK */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>NUPTK</label>
                            <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange}
                                placeholder="Nomor Unik PTK" className={inputCls} />
                        </div>

                        {/* Tempat Lahir */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Tempat Lahir <span className="text-red-500">*</span></label>
                            <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange}
                                placeholder="Kota/Kabupaten"
                                className={errors.tempat_lahir ? inputErrCls : inputCls} />
                            {errors.tempat_lahir && <p className="text-red-500 text-xs">{errors.tempat_lahir}</p>}
                        </div>

                        {/* Tanggal Lahir */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Tanggal Lahir <span className="text-red-500">*</span></label>
                            <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange}
                                className={errors.tanggal_lahir ? inputErrCls : inputCls} />
                            {errors.tanggal_lahir && <p className="text-red-500 text-xs">{errors.tanggal_lahir}</p>}
                        </div>

                        {/* Jenis Kelamin */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                            <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange}
                                className={errors.jenisKelamin ? inputErrCls : inputCls}>
                                <option value="">-- Pilih --</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                            {errors.jenisKelamin && <p className="text-red-500 text-xs">{errors.jenisKelamin}</p>}
                        </div>

                        {/* Telepon */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>No. Telepon</label>
                            <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange}
                                placeholder="08xxxxxxxxxx" className={inputCls} />
                        </div>

                        {/* Status — hanya saat edit */}
                        {isEdit && (
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls} style={labelColor}>Status Pembina <span className="text-red-500">*</span></label>
                                <select name="statusPembina" value={formData.statusPembina} onChange={handleInputChange}
                                    className={errors.statusPembina ? inputErrCls : inputCls}>
                                    <option value="">-- Pilih --</option>
                                    <option value="aktif">Aktif</option>
                                    <option value="nonaktif">Nonaktif</option>
                                </select>
                                {errors.statusPembina && <p className="text-red-500 text-xs">{errors.statusPembina}</p>}
                            </div>
                        )}

                        {/* Alamat — full width */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Alamat</label>
                            <textarea name="alamat" value={formData.alamat} onChange={handleInputChange}
                                placeholder="Jalan, Kelurahan, Kecamatan, Kota" rows={2} className={inputCls} />
                        </div>
                    </div>

                    {/* Form footer */}
                    <div className="flex justify-end gap-3 mt-7 pt-5" style={{ borderTop: '1px solid #fde0c8' }}>

                        {/* Batal — merah */}
                        <button
                            onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: '#fef2f2', border: '1.5px solid #f87171', color: '#b91c1c', boxShadow: '0 1px 4px rgba(239,68,68,0.18)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
                        >
                            Batal
                        </button>

                        {/* Reset — biru abu */}
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                        >
                            Reset
                        </button>

                        {/* Simpan — orange solid */}
                        <button
                            onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}
                            className={`btn-primary ${btnPrimary.base}`}
                            style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
                            onMouseEnter={btnPrimary.hover}
                            onMouseLeave={btnPrimary.leave}
                        >
                            {isEdit ? 'Simpan Perubahan' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 pe-fadeIn"
                    onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 pe-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'} Data
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                            {confirmAction === 'add'
                                ? 'Apakah Anda yakin ingin menambahkan data pembina ini?'
                                : 'Apakah Anda yakin ingin menyimpan perubahan data pembina ini?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                                style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>
                                Batal
                            </button>
                            <button
                                onClick={() => { setShowConfirmModal(false); confirmAction === 'add' ? executeTambah() : executeEdit(); }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}
                            >
                                {confirmAction === 'add' ? 'Tambahkan' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit) return renderForm(true);

    /* ------------------------------------------------------------------
       MAIN LIST VIEW
    ------------------------------------------------------------------ */

    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header */}
            <div className="mb-6 anim-in d1">
                <h1 className="text-2xl font-bold text-gray-900">Data Pembina Ekstrakurikuler</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data pembina kegiatan ekstrakurikuler</p>
            </div>

            {/* Toolbar */}
            <div
                className="section-card bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-3 anim-in d2"
                style={CARD_STYLE}
            >
                <button
                    onClick={() => setShowTambah(true)}
                    className={`btn-primary ${btnPrimary.base}`}
                    style={btnPrimary.style}
                    onMouseEnter={btnPrimary.hover}
                    onMouseLeave={btnPrimary.leave}
                >
                    <Plus size={16} /> Tambah Pembina
                </button>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Items per page */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                        <select
                            value={itemsPerPage}
                            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                    </div>

                    {/* Search */}
                    <div className="relative min-w-[200px] sm:min-w-[220px]">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                        </div>
                        <input
                            type="text" placeholder="Cari nama, NIY, NUPTK..." value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* ✅ Filter Button */}
                    <button
                        onClick={openFilterModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{ background: '#fff', border: '1.5px solid #d97706', color: '#b35a08', boxShadow: '0 1px 4px rgba(217,119,6,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                        <Filter size={15} /> Filter
                    </button>

                    {/* Import Excel */}
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{
                            background: '#eff6ff',
                            border: '1.5px solid #93c5fd',
                            color: '#1d4ed8',
                            boxShadow: '0 1px 4px rgba(59,130,246,0.15)'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                    >
                        <Upload size={14} /> Import
                    </button>
                </div>
            </div>

            {/* Table card */}
            <div className="section-card bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>

                {/* Info count */}
                <div className="px-5 py-2.5" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <p className="text-xs" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredPembina.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredPembina.length)} dari {filteredPembina.length} data
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'Jenis Kelamin', 'NIY', 'NUPTK', 'Status', 'Aksi'].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-7 h-7 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        <span className="text-sm text-gray-400">Memuat data...</span>
                                    </div>
                                </td></tr>
                            ) : currentPembina.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Award size={32} className="text-gray-300" />
                                        <p className="text-sm font-medium text-gray-500">Tidak ada data pembina ekstrakurikuler</p>
                                        {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                    </div>
                                </td></tr>
                            ) : (
                                currentPembina.map((pembina, index) => (
                                    <tr key={`${pembina.id}-${index}`}
                                        className="item-hover transition-colors anim-in"
                                        style={{
                                            borderBottom: '1px solid #fde0c8',
                                            background: index % 2 === 0 ? '#fff' : '#fffaf6',
                                            animationDelay: `${Math.min(index, 8) * 0.04}s`,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                    >
                                        <td className="px-5 py-3.5 text-center text-gray-400 text-xs font-medium">{startIndex + index + 1}</td>

                                        {/* ✅ Nama TANPA avatar inisial — hanya teks */}
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm font-bold text-gray-800">{pembina.nama}</p>
                                            {pembina.no_telepon && (
                                                <p className="text-xs text-gray-400">{pembina.no_telepon}</p>
                                            )}
                                        </td>

                                        <td className="px-5 py-3.5 text-center text-xs text-gray-600">{formatGender(pembina.jenisKelamin)}</td>
                                        <td className="px-5 py-3.5 text-center text-xs text-gray-500 font-mono">{pembina.niy || '-'}</td>
                                        <td className="px-5 py-3.5 text-center text-xs text-gray-500 font-mono">{pembina.nuptk || '-'}</td>

                                        <td className="px-5 py-3.5 text-center">
                                            {pembina.statusPembina === 'aktif' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                                    style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />AKTIF
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                                    style={{ background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />NONAKTIF
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleDetail(pembina)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: '#eaf7ef', border: '1.5px solid #5cb87a', color: '#1a7a3a', boxShadow: '0 1px 4px rgba(26,122,58,0.15)' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                    <Eye size={12} /> Detail
                                                </button>
                                                <button onClick={() => handleEdit(pembina)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: '#fff0e5', border: '1.5px solid #d97706', color: '#b35a08', boxShadow: '0 1px 4px rgba(217,119,6,0.18)' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
                                                    <Pencil size={12} /> Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                    <span className="text-xs font-medium" style={{ color: '#c95b08' }}>
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                </div>
            </div>

            {/* ================================================================
                MODAL DETAIL — layout dua kolom info
            ================================================================ */}
            {showDetail && selectedPembina && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        {/* Modal header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Award size={16} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Detail Pembina</h2>
                            </div>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Nama & status */}
                            <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid #fde0c8' }}>
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: formatGender(selectedPembina.jenisKelamin) === 'Perempuan'
                                            ? 'linear-gradient(135deg,#fce7f3,#f9a8d4)'
                                            : 'linear-gradient(135deg,#dbeafe,#93c5fd)',
                                        border: formatGender(selectedPembina.jenisKelamin) === 'Perempuan'
                                            ? '2px solid #f0abcb'
                                            : '2px solid #93c5fd'
                                    }}>
                                    <Award size={28}
                                        style={{ color: formatGender(selectedPembina.jenisKelamin) === 'Perempuan' ? '#9d174d' : '#1e40af' }} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-gray-800 break-words">{selectedPembina.nama}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{selectedPembina.no_telepon || '-'}</p>
                                    {/* Badge status */}
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1.5"
                                        style={selectedPembina.statusPembina === 'aktif'
                                            ? { background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }
                                            : { background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedPembina.statusPembina === 'aktif' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        {selectedPembina.statusPembina?.toUpperCase() || 'AKTIF'}
                                    </span>
                                </div>
                            </div>

                            {/* Info grid — dua kolom */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'NIY', value: selectedPembina.niy || '-' },
                                    { label: 'NUPTK', value: selectedPembina.nuptk || '-' },
                                    { label: 'Jenis Kelamin', value: formatGender(selectedPembina.jenisKelamin) },
                                    { label: 'No. Telepon', value: selectedPembina.no_telepon || '-' },
                                    { label: 'Tempat Lahir', value: selectedPembina.tempat_lahir || '-' },
                                    { label: 'Tanggal Lahir', value: formatTanggalIndo(selectedPembina.tanggal_lahir) },
                                ].map((item, i) => (
                                    <div key={i} className="rounded-xl px-4 py-3" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>{item.label}</p>
                                        <p className="text-sm font-semibold text-gray-700">{item.value}</p>
                                    </div>
                                ))}

                                {/* Alamat — full width */}
                                <div className="sm:col-span-2 rounded-xl px-4 py-3" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>Alamat</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedPembina.alamat || '-'}</p>
                                </div>
                            </div>

                            {/* Footer buttons */}
                            <div className="flex justify-end gap-3 mt-5 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                                <button
                                    onClick={() => { handleEdit(selectedPembina); closeDetail(); }}
                                    className={`btn-primary ${btnPrimary.base}`}
                                    style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
                                    onMouseEnter={btnPrimary.hover}
                                    onMouseLeave={btnPrimary.leave}
                                >
                                    <Pencil size={14} /> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================
                ✅ MODAL FILTER — TAMBAHAN BARU
            ================================================================ */}
            {showFilter && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeFilterModal(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Filter Pembina</h2>
                            </div>
                            <button onClick={closeFilterModal}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {[
                                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua Jenis Kelamin' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }] },
                            ].map(f => (
                                <div key={f.name} className="flex flex-col gap-1.5">
                                    <label className={labelCls} style={labelColor}>{f.label}</label>
                                    <select
                                        value={(tempFilterValues as any)[f.name]}
                                        onChange={e => setTempFilterValues(p => ({ ...p, [f.name]: e.target.value }))}
                                        className={inputCls}
                                    >
                                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                    </select>
                                </div>
                            ))}

                            <div className="pt-2 flex gap-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnReset onClick={resetFilter} />
                                <button
                                    onClick={applyFilter}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', border: '1.5px solid #c95b08', boxShadow: '0 3px 10px rgba(232,105,10,0.25)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#c95b08,#e8690a)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#e8690a,#f5a623)')}
                                >
                                    Terapkan Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================
                MODAL IMPORT
            ================================================================ */}
            {showImport && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeImport(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Upload size={16} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Import Data Pembina</h2>
                            </div>
                            <button onClick={closeImport}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm mb-3" style={{ color: '#7a3a0a' }}>
                                Format file: <strong>.xlsx</strong> atau <strong>.xls</strong>
                            </p>
                            <div className="mb-4">
                                <a href="http://localhost:5000/templates/template_import_pembina_ekskul.xlsx" download
                                    className="text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: '#e8690a' }}>
                                    📥 Unduh template Excel
                                </a>
                                <p className="text-xs text-gray-400 mt-1">
                                    Isi sesuai contoh, lalu simpan sebagai <strong>.xlsx</strong>
                                </p>
                            </div>
                            <label
                                className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors"
                                style={{ border: '2px dashed #fde0c8', background: '#fffaf6' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fffaf6')}
                            >
                                <Upload className="w-8 h-8 mb-2" style={{ color: '#e8690a' }} />
                                <p className="text-sm">
                                    {importFile
                                        ? <span className="font-semibold" style={{ color: '#c95b08' }}>{importFile.name}</span>
                                        : <span className="text-gray-400">Klik untuk pilih file</span>}
                                </p>
                                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                            </label>
                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={handleImportExcel}
                                    disabled={!importFile}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${!importFile ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    style={{
                                        background: 'linear-gradient(135deg,#e8690a,#f5a623)',
                                        boxShadow: importFile ? '0 3px 10px rgba(232,105,10,0.25)' : 'none'
                                    }}
                                >
                                    Import
                                </button>
                                <BtnSecondary onClick={closeImport}>Batal</BtnSecondary>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}