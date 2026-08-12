/**
 * Nama File: data_admin_client.tsx
 * Fungsi: Komponen klien untuk mengelola data admin,
 *         mencakup fitur tambah, edit, detail, pencarian, dan pagination.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * UPDATE: Disamakan penuh dengan tampilan Data Guru — token desain, warna
 *         tombol (sistem variant primary/info/warning/neutral), background
 *         halaman, tabel berbasis grid dengan kolom sejajar, ukuran elemen
 *         konsisten, dan letak toolbar (Tambah Admin di kiri, pencarian +
 *         baris per halaman di kanan). Logic tidak diubah sama sekali.
 * UPDATE 2: Halaman detail disamakan dengan Data Guru (kartu ikon per
 *           field + avatar), header halaman disederhanakan tanpa kotak
 *           ikon, dan kolom Nama pada tabel tidak lagi memakai bulatan
 *           inisial — konsisten dengan Data Guru.
 */

"use client";

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Eye, Pencil, X, Plus, Search, CheckCircle2, AlertCircle,
    WifiOff, ShieldAlert, ChevronLeft, ChevronRight, Users, RotateCcw,
    Phone, MapPin, Calendar, IdCard, Mail, User,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

// ✅ PERUBAHAN 1: Tambahkan konstanta API_BASE_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ==========================================================================
   INTERFACES  (tidak diubah)
   ========================================================================== */

interface Admin {
    id: number;
    nama: string;
    email?: string;
    statusAdmin?: string;
    niy?: string;
    nuptk?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenis_kelamin?: string;
    alamat?: string;
    no_telepon?: string;
    lp?: string;
    profileImage?: string | null;
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
    email: string;
    statusAdmin: string;
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
   DESIGN TOKENS — sama persis dengan Data Guru, supaya identitas brand
   (oranye hangat) dan bahasa visual konsisten di seluruh modul admin.
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                <div className="dg-scaleIn contents">
                {!isConfirm && (
                    <button onClick={onClose} aria-label="Tutup" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <X size={18} />
                    </button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
                <div className="text-center">
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
   SHARED STYLE CONSTANTS  (sama persis dengan Data Guru)
   ========================================================================== */

const inputCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-red-50/30 border-red-400 placeholder:text-gray-400";

const PAGE_BG = { background: '#f6f7f9' };
const CARD_STYLE = { border: '1px solid #ececec', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

/* Kolom grid tabel — sama persis strukturnya dengan Data Guru (7 kolom),
   dipakai identik oleh header dan setiap baris agar selalu sejajar. */
const GRID_COLS = 'minmax(56px,0.5fr) minmax(220px,3fr) minmax(110px,1.3fr) minmax(90px,1fr) minmax(90px,1fr) minmax(100px,1.1fr) minmax(180px,1.6fr)';

const labelCls = "block text-sm font-bold mb-1.5";
const labelColor = { color: '#7a3a0a' };

/* ==========================================================================
   SISTEM TOMBOL AKSI — identik dengan Data Guru:
     • primary → gradien oranye (aksi utama/menyimpan)
     • info    → biru lembut (Detail, Reset)
     • warning → kuning lembut (Edit)
     • neutral → putih/abu (Batal, Tutup)
   ========================================================================== */

type BtnVariant = 'primary' | 'info' | 'warning' | 'neutral';

const VARIANT_BASE: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: BRAND_GRADIENT, color: '#fff', border: `1.5px solid ${ACCENT_DARK}`, boxShadow: '0 2px 8px rgba(232,105,10,0.25)' },
    info:    { background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe' },
    warning: { background: '#facc15', color: '#78350f', border: '1.5px solid #eab308', boxShadow: '0 2px 8px rgba(234,179,8,0.35)' },
    neutral: { background: '#fff', color: '#4b5563', border: '1.5px solid #e5e7eb' },
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
   MAIN COMPONENT
   ========================================================================== */

export default function DataAdminClient() {
    const { showSessionExpired, handleLogout } = useSession();

    /* ------------------------------------------------------------------
       HELPERS  (tidak diubah)
    ------------------------------------------------------------------ */

    const formatGender = (g?: string | null) => {
        if (!g) return '-';
        const s = String(g).trim().toLowerCase();
        if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l' || s.includes('laki')) return 'Laki-laki';
        if (s === 'perempuan' || s === 'p' || s.includes('peremp')) return 'Perempuan';
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
    };

    const formatDateInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const year  = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day   = String(date.getDate()).padStart(2, '0');
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

    /* ------------------------------------------------------------------
       STATE  (tidak diubah)
    ------------------------------------------------------------------ */

    const [adminList,    setAdminList]    = useState<Admin[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [showDetail,   setShowDetail]   = useState(false);
    const [showTambah,   setShowTambah]   = useState(false);
    const [showEdit,     setShowEdit]     = useState(false);
    const [editId,       setEditId]       = useState<number | null>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [searchQuery,  setSearchQuery]  = useState('');
    const [detailClosing, setDetailClosing] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage,  setCurrentPage]  = useState(1);

    const [modal,    setModal]    = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction,    setConfirmAction]    = useState<'add' | 'edit' | null>(null);

    const [formData, setFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', email: '', statusAdmin: 'aktif',
    });

    const [originalFormData, setOriginalFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', email: '', statusAdmin: 'aktif',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ------------------------------------------------------------------
       FETCH  (tidak diubah)
    ------------------------------------------------------------------ */

    const fetchAdmin = useCallback(async (): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
                return;
            }
            // ✅ PERUBAHAN 2: URL sekarang pakai API_BASE_URL
            const res  = await fetch(`${API_BASE_URL}/api/admin/admin`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) {
                const normalizedAdmins = (data.data || []).map((admin: any) => ({
                    id:           admin.id,
                    nama:         admin.nama,
                    email:        admin.email,
                    statusAdmin:  admin.statusAdmin,
                    niy:          admin.niy,
                    nuptk:        admin.nuptk,
                    tempat_lahir: admin.tempat_lahir  || admin.tempatLahir  || '',
                    tanggal_lahir: admin.tanggal_lahir || admin.tanggalLahir || '',
                    jenis_kelamin: admin.jenis_kelamin || admin.jenisKelamin  || '',
                    alamat:       admin.alamat,
                    no_telepon:   admin.no_telepon    || admin.noTelepon     || '',
                    profileImage: admin.profileImage  || null,
                }));
                setAdminList(normalizedAdmins);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data admin.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchAdmin(); }, [fetchAdmin]);

    /* ------------------------------------------------------------------
       FORM HANDLERS  (tidak diubah)
    ------------------------------------------------------------------ */

    const handleDetail = (admin: Admin): void => { setSelectedAdmin(admin); setShowDetail(true); };

    const handleEdit = (admin: Admin): void => {
        setEditId(admin.id);
        const data: FormDataType = {
            nama:         admin.nama           || '',
            niy:          admin.niy            || '',
            nuptk:        admin.nuptk          || '',
            tempat_lahir: admin.tempat_lahir   || '',
            tanggal_lahir: formatDateInput(admin.tanggal_lahir) || '',
            jenisKelamin: (admin.jenis_kelamin as string) || 'Laki-laki',
            alamat:       admin.alamat         || '',
            no_telepon:   admin.no_telepon     || '',
            email:        admin.email          || '',
            statusAdmin:  admin.statusAdmin?.toLowerCase() === 'aktif' ? 'aktif' : 'nonaktif',
        };
        setFormData(data);
        setOriginalFormData(data);
        setShowEdit(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.nama?.trim())          newErrors.nama         = 'Nama wajib diisi';
        if (!formData.email?.trim())         newErrors.email        = 'Email wajib diisi';
        if (!formData.tempat_lahir?.trim())  newErrors.tempat_lahir = 'Tempat lahir wajib diisi';
        if (!formData.jenisKelamin)          newErrors.jenisKelamin = 'Pilih jenis kelamin';
        if (!formData.tanggal_lahir) {
            newErrors.tanggal_lahir = 'Tanggal lahir wajib diisi';
        } else {
            const dob = new Date(formData.tanggal_lahir);
            if (isNaN(dob.getTime())) {
                newErrors.tanggal_lahir = 'Tanggal lahir tidak valid';
            } else {
                const today  = new Date();
                const dobMid = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
                const todMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                if (dobMid > todMid) {
                    newErrors.tanggal_lahir = 'Tanggal lahir tidak boleh di masa depan';
                } else {
                    let age = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                    if (age < 18) newErrors.tanggal_lahir = 'Usia minimal 18 tahun';
                }
            }
        }
        if (showEdit && (!formData.statusAdmin || formData.statusAdmin === ''))
            newErrors.statusAdmin = 'Status wajib dipilih';

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            const firstKey = Object.keys(newErrors)[0];
            setTimeout(() => {
                const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
                if (el && typeof el.focus === 'function') el.focus();
            }, 10);
            return false;
        }
        return true;
    };

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (!validate()) return;
        if (action === 'edit' && !hasChanges()) {
            showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang berubah. Tidak perlu menyimpan.' });
            return;
        }
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeAdd = async (): Promise<void> => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
        try {
            const payload = {
                nama_lengkap: formData.nama,      email_sekolah: formData.email,
                niy: formData.niy,                nuptk: formData.nuptk,
                tempat_lahir: formData.tempat_lahir, tanggal_lahir: formData.tanggal_lahir,
                jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat,
                no_telepon: formData.no_telepon,
            };
            // ✅ PERUBAHAN 3: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowTambah(false); handleReset(); await fetchAdmin();
                showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data admin ${formData.nama} berhasil ditambahkan.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data admin.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const executeEdit = async (): Promise<void> => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' }); return; }
        try {
            const payload = {
                nama_lengkap:  formData.nama,           email_sekolah: formData.email,
                status:        formData.statusAdmin,    niy: formData.niy,
                nuptk:         formData.nuptk,          tempat_lahir:  formData.tempat_lahir,
                tanggal_lahir: formData.tanggal_lahir,  jenis_kelamin: formData.jenisKelamin,
                alamat:        formData.alamat,         no_telepon:    formData.no_telepon,
            };
            // ✅ PERUBAHAN 4: URL sekarang pakai API_BASE_URL
            const res = await fetch(`${API_BASE_URL}/api/admin/admin/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    const currentUser = JSON.parse(storedUser);
                    if (currentUser.id === editId) {
                        const updatedUser = { ...currentUser, nama_lengkap: formData.nama, email_sekolah: formData.email, niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempat_lahir, tanggal_lahir: formData.tanggal_lahir, jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat, no_telepon: formData.no_telepon };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        window.dispatchEvent(new Event('profileDataUpdated'));
                    }
                }
                setShowEdit(false); setEditId(null); handleReset(); await fetchAdmin();
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data admin ${formData.nama} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                const isDuplicate = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDuplicate ? 'Data Sudah Ada' : 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data admin.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        }
    };

    const handleReset = (): void => {
        setFormData({ nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '', jenisKelamin: '', alamat: '', no_telepon: '', email: '', statusAdmin: 'aktif' });
        setErrors({});
    };

    const hasChanges = (): boolean => (
        formData.nama         !== originalFormData.nama         ||
        formData.niy          !== originalFormData.niy          ||
        formData.nuptk        !== originalFormData.nuptk        ||
        formData.tempat_lahir !== originalFormData.tempat_lahir ||
        formData.tanggal_lahir !== originalFormData.tanggal_lahir ||
        formData.jenisKelamin !== originalFormData.jenisKelamin ||
        formData.alamat       !== originalFormData.alamat       ||
        formData.no_telepon   !== originalFormData.no_telepon   ||
        formData.email        !== originalFormData.email        ||
        formData.statusAdmin  !== originalFormData.statusAdmin
    );

    /* ------------------------------------------------------------------
       FILTER & PAGINATION  (tidak diubah)
    ------------------------------------------------------------------ */

    const filteredAdmin = adminList.filter((admin) => {
        const query = searchQuery.toLowerCase();
        return (
            (admin.nama?.toLowerCase()  || '').includes(query) ||
            (admin.email?.toLowerCase() || '').includes(query) ||
            (admin.niy?.toLowerCase()   || '').includes(query) ||
            (admin.nuptk?.toLowerCase() || '').includes(query)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filteredAdmin.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex   = startIndex + itemsPerPage;
    const currentAdmin = filteredAdmin.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "min-w-[30px] h-8 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold border-2 transition-colors btn-action";
        const btnActive = "text-white border-transparent";
        const btnInactive = "text-gray-600 border-transparent hover:bg-orange-50 bg-transparent";
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
            if (p < 0) { pages.push(<span key={p} className="px-1 text-gray-400 text-xs">…</span>); }
            else { pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: BRAND_GRADIENT, boxShadow: '0 2px 6px rgba(232,105,10,0.30)' } : {}}>{p}</button>); }
        });
        return pages;
    };

    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 300);
    };

    /* ------------------------------------------------------------------
       FORM RENDER
    ------------------------------------------------------------------ */

    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-4 sm:p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-3xl mx-auto">
                <div className="mb-5 flex items-center gap-3 anim-in d1">
                    <button
                        onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                        aria-label="Kembali"
                        className="btn-action w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2"
                        style={{ background: '#fff', borderColor: '#f0e0d0', color: ACCENT_DARK }}
                    >
                        <ChevronLeft size={19} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isEdit ? 'Edit Data Admin' : 'Tambah Data Admin'}
                        </h1>
                        <p className="text-sm mt-0.5 text-gray-500">
                            {isEdit ? 'Perbarui informasi data admin' : 'Isi formulir untuk menambahkan admin baru'}
                        </p>
                    </div>
                </div>

                <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d2" style={CARD_STYLE}>
                    <div className="px-6 sm:px-7 py-4" style={{ background: BRAND_GRADIENT }}>
                        <h2 className="text-sm sm:text-base font-bold text-white">{isEdit ? 'Ubah Data Admin' : 'Data Admin Baru'}</h2>
                    </div>

                    <div className="p-6 sm:p-7">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className={labelCls} style={labelColor}>Nama Lengkap <span className="text-red-500">*</span></label>
                                <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className={errors.nama ? inputErrCls : inputCls} />
                                {errors.nama && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.nama}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Email Akun <span className="text-red-500">*</span></label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="contoh@sekolah.sch.id" className={errors.email ? inputErrCls : inputCls} />
                                {errors.email && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.email}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Tempat Lahir <span className="text-red-500">*</span></label>
                                <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange} placeholder="Kota/Kabupaten" className={errors.tempat_lahir ? inputErrCls : inputCls} />
                                {errors.tempat_lahir && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.tempat_lahir}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Tanggal Lahir <span className="text-red-500">*</span></label>
                                <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange} className={errors.tanggal_lahir ? inputErrCls : inputCls} />
                                {errors.tanggal_lahir && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.tanggal_lahir}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange} className={errors.jenisKelamin ? inputErrCls : inputCls}>
                                    <option value="">-- Pilih --</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                                {errors.jenisKelamin && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.jenisKelamin}</p>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>NIY</label>
                                <input type="text" name="niy" value={formData.niy} onChange={handleInputChange} placeholder="Nomor Induk Yayasan" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>NUPTK</label>
                                <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange} placeholder="Nomor Unik PTK" className={inputCls} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>No. Telepon</label>
                                <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange} placeholder="08xxxxxxxxxx" className={inputCls} />
                            </div>

                            {isEdit && (
                                <div className="flex flex-col gap-1">
                                    <label className={labelCls} style={labelColor}>Status Admin <span className="text-red-500">*</span></label>
                                    <select name="statusAdmin" value={formData.statusAdmin} onChange={handleInputChange} className={errors.statusAdmin ? inputErrCls : inputCls}>
                                        <option value="">-- Pilih --</option>
                                        <option value="aktif">Aktif</option>
                                        <option value="nonaktif">Nonaktif</option>
                                    </select>
                                    {errors.statusAdmin && <p className="text-red-600 text-xs font-semibold mt-0.5">{errors.statusAdmin}</p>}
                                </div>
                            )}

                            <div className="md:col-span-2 flex flex-col gap-1">
                                <label className={labelCls} style={labelColor}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Jalan, Kelurahan, Kecamatan, Kota" rows={3} className={inputCls} />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t" style={{ borderColor: '#f0e0d0' }}>
                            <ActionButton variant="neutral" onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>
                                Batal
                            </ActionButton>
                            <ActionButton variant="info" onClick={handleReset}>
                                <RotateCcw size={15} /> Reset
                            </ActionButton>
                            <ActionButton variant="primary" onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}>
                                {isEdit ? 'Simpan Perubahan' : 'Simpan Data'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn" onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 dg-scaleIn" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={22} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-5">
                            {confirmAction === 'add' ? 'Apakah Anda yakin ingin menambahkan data admin ini?' : 'Apakah Anda yakin ingin menyimpan perubahan data admin ini?'}
                        </p>
                        <div className="flex gap-2.5">
                            <ActionButton variant="neutral" fullWidth onClick={() => setShowConfirmModal(false)}>Batal</ActionButton>
                            <ActionButton variant="primary" fullWidth onClick={() => { setShowConfirmModal(false); confirmAction === 'add' ? executeAdd() : executeEdit(); }}>
                                {confirmAction === 'add' ? 'Tambahkan' : 'Simpan'}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit)   return renderForm(true);

    /* ------------------------------------------------------------------
       MAIN LIST VIEW
    ------------------------------------------------------------------ */

    return (
        <div className="flex-1 min-h-screen p-3 sm:p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="mb-4 sm:mb-5 anim-in d1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Admin</h1>
                <p className="text-xs sm:text-sm mt-1 text-gray-500">Kelola data admin dan hak akses</p>
            </div>

            {/* Toolbar — paling kiri sendiri: tombol Tambah Admin.
                Kanan (urut): search kecil, baris per halaman. */}
            <div className="card-flat bg-white rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 mb-4 anim-in d2" style={CARD_STYLE}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

                    <div className="flex-shrink-0">
                        <ActionButton variant="primary" onClick={() => setShowTambah(true)}>
                            <Plus size={16} /> <span className="hidden sm:inline">Tambah Admin</span><span className="sm:hidden">Tambah</span>
                        </ActionButton>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
                        <div className="relative w-full xs:w-auto sm:w-56 flex-shrink-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                            </div>
                            <input type="text" placeholder="Cari nama, email, NIY..." value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full border rounded-lg pl-8 pr-8 py-2 text-xs outline-none transition-all focus:ring-4 focus:ring-orange-100 focus:border-orange-400 bg-white border-gray-200 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button type="button" aria-label="Bersihkan pencarian" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2.5 flex items-center" style={{ color: ACCENT }}>
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#fff5eb', border: '1px solid #fde0c8' }}>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>Tampilkan</span>
                            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white border-orange-200">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                            </select>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: ACCENT_DARK }}>data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table card — grid-based, sama persis strukturnya dengan Data Guru */}
            <div className="card-flat bg-white rounded-2xl overflow-hidden anim-in d3" style={CARD_STYLE}>

                <div className="overflow-x-auto">
                    <div style={{ width: '100%', minWidth: '850px' }}>
                        {/* Header — grid kolom sama persis dengan setiap baris di bawahnya */}
                        <div
                            className="grid"
                            style={{ gridTemplateColumns: GRID_COLS, background: BRAND_GRADIENT }}
                        >
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">No.</div>
                            <div className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center">Nama</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Kelamin</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NIY</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">NUPTK</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Status</div>
                            <div className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap flex items-center justify-center">Aksi</div>
                        </div>

                        {/* Body */}
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="grid border-b" style={{ gridTemplateColumns: GRID_COLS, borderColor: '#f0f0f0' }}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <div key={j} className="px-4 py-4 flex items-center justify-center">
                                            <div className="dg-shimmer h-4 rounded w-full" style={{ maxWidth: j === 1 ? '85%' : '55%' }} />
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : currentAdmin.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Users size={32} className="text-gray-300" />
                                    <p className="text-sm font-semibold text-gray-500">Tidak ada data admin</p>
                                    {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                </div>
                            </div>
                        ) : currentAdmin.map((admin, index) => (
                            <div key={admin.id} className="grid row-in row-hover border-b transition-colors"
                                style={{
                                    gridTemplateColumns: GRID_COLS,
                                    borderColor: '#f0f0f0',
                                    background: '#fff',
                                    animationDelay: `${Math.min(index, 8) * 0.03}s`,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fff8f2')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-400">{startIndex + index + 1}</div>

                                <div className="px-4 py-4 flex items-center overflow-hidden">
                                    <p className="font-bold text-gray-900 truncate" title={admin.nama}>{admin.nama}</p>
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-600 whitespace-nowrap">{formatGender(admin.jenis_kelamin || admin.lp)}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{admin.niy || '-'}</div>
                                <div className="px-4 py-4 flex items-center justify-center text-center text-gray-500 font-mono text-xs truncate">{admin.nuptk || '-'}</div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    {admin.statusAdmin?.toLowerCase() === 'aktif' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Aktif
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />Nonaktif
                                        </span>
                                    )}
                                </div>

                                <div className="px-4 py-4 flex items-center justify-center">
                                    <div className="flex justify-center gap-1.5">
                                        <ActionButton size="sm" variant="info" onClick={() => handleDetail(admin)} title="Lihat detail">
                                            <Eye size={13} /> Detail
                                        </ActionButton>
                                        <ActionButton size="sm" variant="warning" onClick={() => handleEdit(admin)} title="Edit data">
                                            <Pencil size={13} /> Edit
                                        </ActionButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer: info + pagination — sama persis dengan Data Guru */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-gray-200" style={{ background: '#fafafa' }}>
                    <span className="text-xs font-medium text-gray-500">
                        {filteredAdmin.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredAdmin.length)} dari {filteredAdmin.length} data
                    </span>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors" style={{ color: ACCENT_DARK }}>
                            <ChevronLeft size={14} /> Sebelumnya
                        </button>
                        <div className="flex items-center gap-1 mx-1">{renderPagination()}</div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="h-8 px-3 flex items-center gap-1 rounded-lg text-xs font-bold hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors" style={{ color: ACCENT_DARK }}>
                            Berikutnya <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ================================================================
                MODAL DETAIL — struktur & gaya identik dengan Data Guru
                (avatar, badge status, kartu ikon per field). Tidak ada
                badge Role karena data Admin memang tidak memilikinya.
            ================================================================ */}
            {showDetail && selectedAdmin && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${detailClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${detailClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeDetail} />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 overflow-hidden ${detailClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ background: BRAND_GRADIENT }}>
                            <h2 className="text-lg sm:text-xl font-bold text-white">Detail Data Admin</h2>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-4 overflow-hidden" style={{ background: selectedAdmin.profileImage ? '#fff' : 'linear-gradient(135deg, #fed7aa, #fde0c8)', borderColor: '#fde0c8' }}>
                                        {selectedAdmin.profileImage ? (
                                            <img src={selectedAdmin.profileImage} alt={selectedAdmin.nama} className="w-full h-full rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <User size={48} style={{ color: '#c2410c' }} />
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2" style={{ background: selectedAdmin.statusAdmin?.toLowerCase() === 'aktif' ? '#22c55e' : '#6b7280', borderColor: '#fff' }}>
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: '#fde0c8' }}>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: selectedAdmin.statusAdmin?.toLowerCase() === 'aktif' ? '#dcfce7' : '#f3f4f6', color: selectedAdmin.statusAdmin?.toLowerCase() === 'aktif' ? '#166534' : '#4b5563', border: `1px solid ${selectedAdmin.statusAdmin?.toLowerCase() === 'aktif' ? '#86efac' : '#d1d5db'}` }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: selectedAdmin.statusAdmin?.toLowerCase() === 'aktif' ? '#22c55e' : '#6b7280' }} />
                                    {selectedAdmin.statusAdmin?.toLowerCase() === 'aktif' ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><User size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Nama Lengkap</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedAdmin.nama}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Mail size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Email Akun</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 break-all">{selectedAdmin.email || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><IdCard size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NIY</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedAdmin.niy || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><IdCard size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>NUPTK</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11 font-mono">{selectedAdmin.nuptk || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Users size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Jenis Kelamin</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{formatGender(selectedAdmin.jenis_kelamin || selectedAdmin.lp)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Phone size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>No. Telepon</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedAdmin.no_telepon || '-'}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><Calendar size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Tempat, Tanggal Lahir</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedAdmin.tempat_lahir || '-'}, {formatTanggalIndo(selectedAdmin.tanggal_lahir)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fed7aa' }}><MapPin size={16} style={{ color: '#c2410c' }} /></div><p className="text-xs sm:text-sm font-bold" style={{ color: '#c2410c' }}>Alamat</p></div>
                                    <p className="text-sm sm:text-base font-bold text-gray-900 ml-10 sm:ml-11">{selectedAdmin.alamat || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: '#fde0c8', background: '#fffaf6' }}>
                            <ActionButton variant="neutral" onClick={closeDetail}>Tutup</ActionButton>
                            <ActionButton variant="warning" onClick={() => { handleEdit(selectedAdmin); closeDetail(); }}>
                                <Pencil size={16} /> Edit Data
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}