/**
 * Nama File: data_admin_client.tsx
 * Fungsi: Komponen klien untuk mengelola data admin,
 *         mencakup fitur tambah, edit, detail, pencarian, dan pagination.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 */

"use client";

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import { Eye, Pencil, X, Plus, Search, CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

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
    confirmData: boolean;
}

// ─── NOTIF MODAL ──────────────────────────────────────────────────────────────

type ModalType = 'success' | 'error' | 'warning' | 'network';
interface ModalConfig { type: ModalType; title: string; message: string; }

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes da-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes da-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes da-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .da-fadeIn  { animation: da-fadeIn  0.2s ease; }
        .da-scaleIn { animation: da-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .da-pulse   { animation: da-pulse   0.6s ease 0.15s; }
    `}</style>
);

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string; }> = {
    success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
    error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 da-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 da-scaleIn">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} da-pulse`}>{s.icon}</div>
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

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG     = { background: '#fdf6f0' };
const CARD_STYLE  = { border: '1px solid #fde0c8', boxShadow: '0 2px 16px rgba(200,80,10,0.07)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base: "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
    style: { background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 12px rgba(232,105,10,0.3)' } as React.CSSProperties,
    hover: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#c95b08,#e8690a)'; },
    leave: (e: React.MouseEvent<HTMLButtonElement>) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg,#e8690a,#f5a623)'; },
};

const labelCls   = "block text-sm font-semibold mb-1.5";
const labelColor = { color: '#7a3a0a' };

const BtnSecondary = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
        style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >{children}</button>
);

export default function DataAdminClient() {
    const formatGender = (g?: string | null) => {
        if (!g) return '-';
        const s = String(g).trim().toLowerCase();
        if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l') return 'Laki-laki';
        if (s === 'perempuan' || s === 'p' || s === 'perempuan') return 'Perempuan';
        if (s.includes('laki')) return 'Laki-laki';
        if (s.includes('peremp')) return 'Perempuan';
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

    const getInitials = (name: string): string =>
        name.split(' ').slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('');

    // ── State ──────────────────────────────────────────────────────────────
    const [adminList,     setAdminList]     = useState<Admin[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showDetail,    setShowDetail]    = useState(false);
    const [showTambah,    setShowTambah]    = useState(false);
    const [showEdit,      setShowEdit]      = useState(false);
    const [editId,        setEditId]        = useState<number | null>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [searchQuery,   setSearchQuery]   = useState('');
    const [detailClosing, setDetailClosing] = useState(false);
    const [itemsPerPage,  setItemsPerPage]  = useState(10);
    const [currentPage,   setCurrentPage]   = useState(1);

    // ── Notif modal ────────────────────────────────────────────────────────
    const [modal,    setModal]    = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchAdmin = useCallback(async (): Promise<void> => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu untuk mengakses halaman ini.' });
                return;
            }
            const res  = await fetch('http://localhost:5000/api/admin/admin', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                const normalizedAdmins = (data.data || []).map((admin: any) => ({
                    id:           admin.id,
                    nama:         admin.nama,
                    email:        admin.email,
                    statusAdmin:  admin.statusAdmin,
                    niy:          admin.niy,
                    nuptk:        admin.nuptk,
                    tempat_lahir: admin.tempat_lahir || admin.tempatLahir || '',
                    tanggal_lahir:admin.tanggal_lahir || admin.tanggalLahir || '',
                    jenis_kelamin:admin.jenis_kelamin || admin.jenisKelamin || '',
                    alamat:       admin.alamat,
                    no_telepon:   admin.no_telepon || admin.noTelepon || '',
                    profileImage: admin.profileImage || null,
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

    // ── Form state ─────────────────────────────────────────────────────────
    const [formData, setFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', email: '',
        statusAdmin: 'aktif', confirmData: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleDetail = (admin: Admin): void => { setSelectedAdmin(admin); setShowDetail(true); };

    const handleEdit = (admin: Admin): void => {
        setEditId(admin.id);
        setFormData({
            nama:         admin.nama || '',
            niy:          admin.niy || '',
            nuptk:        admin.nuptk || '',
            tempat_lahir: admin.tempat_lahir || '',
            tanggal_lahir:formatDateInput(admin.tanggal_lahir) || '',
            jenisKelamin: (admin.jenis_kelamin as string) || 'Laki-laki',
            alamat:       admin.alamat || '',
            no_telepon:   admin.no_telepon || '',
            email:        admin.email || '',
            statusAdmin:  admin.statusAdmin?.toLowerCase() === 'aktif' ? 'aktif' : 'nonaktif',
            confirmData:  false,
        });
        setShowEdit(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.nama?.trim())         newErrors.nama         = 'Nama wajib diisi';
        if (!formData.email?.trim())        newErrors.email        = 'Email wajib diisi';
        if (!formData.tempat_lahir?.trim()) newErrors.tempat_lahir = 'Tempat lahir wajib diisi';
        if (!formData.jenisKelamin)         newErrors.jenisKelamin = 'Pilih jenis kelamin';
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
        if (!formData.confirmData)
            newErrors.confirmData = 'Harap konfirmasi data sebelum melanjutkan';

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

    const handleSubmitAdd = async (): Promise<void> => {
        if (!validate()) return;
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const payload = {
                nama_lengkap: formData.nama,   email_sekolah: formData.email,
                niy:          formData.niy,    nuptk:         formData.nuptk,
                tempat_lahir: formData.tempat_lahir, tanggal_lahir: formData.tanggal_lahir,
                jenis_kelamin:formData.jenisKelamin, alamat:        formData.alamat,
                no_telepon:   formData.no_telepon,
            };
            const res = await fetch('http://localhost:5000/api/admin/admin', {
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

    const handleSubmitEdit = async (): Promise<void> => {
        if (!validate()) return;
        const token = localStorage.getItem('token');
        if (!token) {
            showModal({ type: 'warning', title: 'Sesi Habis', message: 'Sesi login Anda telah berakhir. Silakan login ulang.' });
            return;
        }
        try {
            const payload = {
                nama_lengkap: formData.nama,   email_sekolah: formData.email,
                status:       formData.statusAdmin, niy:       formData.niy,
                nuptk:        formData.nuptk,  tempat_lahir:  formData.tempat_lahir,
                tanggal_lahir:formData.tanggal_lahir, jenis_kelamin: formData.jenisKelamin,
                alamat:       formData.alamat, no_telepon:    formData.no_telepon,
            };
            const res = await fetch(`http://localhost:5000/api/admin/admin/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
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
        setFormData({
            nama: '', niy: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '',
            jenisKelamin: '', alamat: '', no_telepon: '', email: '',
            statusAdmin: 'aktif', confirmData: false,
        });
        setErrors({});
    };

    // ── Filter & pagination ────────────────────────────────────────────────
    const filteredAdmin = adminList.filter((admin) => {
        const nama   = admin.nama?.toLowerCase() || '';
        const email  = admin.email?.toLowerCase() || '';
        const niy    = admin.niy?.toLowerCase() || '';
        const nuptk  = admin.nuptk?.toLowerCase() || '';
        const query  = searchQuery.toLowerCase();
        return nama.includes(query) || email.includes(query) || niy.includes(query) || nuptk.includes(query);
    });

    const totalPages  = Math.max(1, Math.ceil(filteredAdmin.length / itemsPerPage));
    const startIndex  = (currentPage - 1) * itemsPerPage;
    const endIndex    = startIndex + itemsPerPage;
    const currentAdmin = filteredAdmin.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive   = "text-white border-orange-500";
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

    // ── Close detail modal ─────────────────────────────────────────────────
    const closeDetail = () => {
        setDetailClosing(true);
        setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200);
    };

    // ── Render Form ────────────────────────────────────────────────────────
    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Admin</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data admin dan hak akses</p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4" style={HEADER_GRAD}>
                    <h2 className="text-base font-bold text-white">
                        {isEdit ? 'Edit Data Admin' : 'Tambah Data Admin'}
                    </h2>
                    <button
                        onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <X size={16} className="text-white" />
                    </button>
                </div>

                {/* Form body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Nama */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>
                            Nama <span className="text-red-500">*</span>
                        </label>
                        <input type="text" name="nama" value={formData.nama} onChange={handleInputChange}
                            placeholder="Ketik Nama"
                            className={errors.nama ? inputErrCls : inputCls} />
                        {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>
                            Email Akun <span className="text-red-500">*</span>
                        </label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                            placeholder="Ketik Email"
                            className={errors.email ? inputErrCls : inputCls} />
                        {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                    </div>

                    {/* NIY */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NIY</label>
                        <input type="text" name="niy" value={formData.niy} onChange={handleInputChange}
                            placeholder="Ketik NIY" className={inputCls} />
                    </div>

                    {/* NUPTK */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>NUPTK</label>
                        <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange}
                            placeholder="Ketik NUPTK" className={inputCls} />
                    </div>

                    {/* Tempat Lahir */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>
                            Tempat Lahir <span className="text-red-500">*</span>
                        </label>
                        <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange}
                            placeholder="Ketik Tempat Lahir"
                            className={errors.tempat_lahir ? inputErrCls : inputCls} />
                        {errors.tempat_lahir && <p className="text-red-500 text-xs">{errors.tempat_lahir}</p>}
                    </div>

                    {/* Telepon */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Telepon</label>
                        <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange}
                            placeholder="Ketik Telepon" className={inputCls} />
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>
                            Tanggal Lahir <span className="text-red-500">*</span>
                        </label>
                        <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleInputChange}
                            className={errors.tanggal_lahir ? inputErrCls : inputCls} />
                        {errors.tanggal_lahir && <p className="text-red-500 text-xs">{errors.tanggal_lahir}</p>}
                    </div>

                    {/* Jenis Kelamin */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>
                            Jenis Kelamin <span className="text-red-500">*</span>
                        </label>
                        <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange}
                            className={errors.jenisKelamin ? inputErrCls : inputCls}>
                            <option value="">-- Pilih --</option>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                        </select>
                        {errors.jenisKelamin && <p className="text-red-500 text-xs">{errors.jenisKelamin}</p>}
                    </div>

                    {/* Alamat */}
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className={labelCls} style={labelColor}>Alamat</label>
                        <textarea name="alamat" value={formData.alamat} onChange={handleInputChange}
                            placeholder="Ketik Alamat" rows={2} className={inputCls} />
                    </div>

                    {/* Status Admin — Hanya di Edit */}
                    {isEdit && (
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>
                                Status Admin <span className="text-red-500">*</span>
                            </label>
                            <select name="statusAdmin" value={formData.statusAdmin} onChange={handleInputChange}
                                className={errors.statusAdmin ? inputErrCls : inputCls}>
                                <option value="">-- Pilih --</option>
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                            {errors.statusAdmin && <p className="text-red-500 text-xs">{errors.statusAdmin}</p>}
                        </div>
                    )}
                </div>

                {/* Konfirmasi */}
                <div className="px-6 pb-4">
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" name="confirmData" checked={formData.confirmData}
                            onChange={e => setFormData(p => ({ ...p, confirmData: e.target.checked }))}
                            className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>
                            Saya yakin sudah mengisi dengan benar
                        </span>
                    </label>
                    {errors.confirmData && <p className="text-red-500 text-xs mt-1">{errors.confirmData}</p>}
                </div>

                {/* Form footer */}
                <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <BtnSecondary onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}>
                        Batal
                    </BtnSecondary>
                    <BtnSecondary onClick={handleReset}>Reset</BtnSecondary>
                    <button
                        onClick={isEdit ? handleSubmitEdit : handleSubmitAdd}
                        className={btnPrimary.base}
                        style={btnPrimary.style}
                        onMouseEnter={btnPrimary.hover}
                        onMouseLeave={btnPrimary.leave}
                    >
                        {isEdit ? 'Simpan Perubahan' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (showTambah) return renderForm(false);
    if (showEdit)   return renderForm(true);

    // ── Tampilan Utama ───────────────────────────────────────────────────────
    return (
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Admin</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data admin dan hak akses</p>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Toolbar */}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">

                        {/* Kiri: Tambah Admin */}
                        <button
                            onClick={() => setShowTambah(true)}
                            className={btnPrimary.base}
                            style={btnPrimary.style}
                            onMouseEnter={btnPrimary.hover}
                            onMouseLeave={btnPrimary.leave}
                        >
                            <Plus size={16} /> Tambah Admin
                        </button>

                        {/* Kanan: controls */}
                        <div className="flex flex-wrap items-center gap-2">

                            {/* Tampilkan N data */}
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

                            {/* Search */}
                            <div className="relative min-w-[200px] sm:min-w-[220px]">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                                </div>
                                <input
                                    type="text" placeholder="Pencarian" value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full border rounded-xl pl-9 pr-9 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button type="button"
                                        onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info count */}
                    <p className="text-xs mt-3" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredAdmin.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredAdmin.length)} dari {filteredAdmin.length} data
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm border-collapse">
                        <thead>
                            <tr style={TH_GRAD}>
                                {['No.', 'Nama', 'Jenis Kelamin', 'NIY', 'NUPTK', 'Status', 'Aksi'].map((h) => (
                                    <th key={h} className="px-5 py-3 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin" />
                                        Memuat data...
                                    </div>
                                </td></tr>
                            ) : currentAdmin.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Tidak ada data admin</td></tr>
                            ) : (
                                currentAdmin.map((admin, index) => (
                                    <tr key={admin.id}
                                        className="transition-colors"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                    >
                                        <td className="px-5 py-3.5 text-center text-gray-500 font-medium">{startIndex + index + 1}</td>
                                        <td className="px-5 py-3.5 font-bold text-gray-800">{admin.nama}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-700">{formatGender(admin.jenis_kelamin || admin.lp)}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-600">{admin.niy || '-'}</td>
                                        <td className="px-5 py-3.5 text-center text-gray-600">{admin.nuptk || '-'}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            {admin.statusAdmin === 'AKTIF' || admin.statusAdmin === 'aktif' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                    style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />AKTIF
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                                                    style={{ background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />NONAKTIF
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleDetail(admin)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: '#eaf7ef', border: '1px solid #b6e8c8', color: '#1a7a3a' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}
                                                >
                                                    <Eye size={13} /> Detail
                                                </button>
                                                <button onClick={() => handleEdit(admin)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    style={{ background: '#fff0e5', border: '1px solid #f5a623', color: '#b35a08' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}
                                                >
                                                    <Pencil size={13} /> Edit
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
                    <span className="text-sm font-medium" style={{ color: '#c95b08' }}>
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                </div>
            </div>

            {/* Modal Detail */}
            {showDetail && selectedAdmin && (
                <div
                    className={`fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        style={CARD_STYLE}
                    >
                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <h2 className="text-base font-bold text-white">Detail Admin</h2>
                            <button onClick={closeDetail}
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Avatar */}
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-24 h-24 rounded-full overflow-hidden mb-3 flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#fde0c8,#f5a623)' }}>
                                    {selectedAdmin.profileImage ? (
                                        <img src={`http://localhost:5000${selectedAdmin.profileImage}`} alt="Foto Profil"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="text-2xl font-bold" style={{ color: '#c95b08' }}>
                                            {getInitials(selectedAdmin.nama || '??')}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 text-center break-words">{selectedAdmin.nama}</h3>
                            </div>

                            {/* Info rows */}
                            <div className="space-y-2.5">
                                {[
                                    {
                                        label: 'Status', value: (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                                                style={selectedAdmin.statusAdmin === 'AKTIF' || selectedAdmin.statusAdmin === 'aktif'
                                                    ? { background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }
                                                    : { background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedAdmin.statusAdmin === 'AKTIF' || selectedAdmin.statusAdmin === 'aktif' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                {selectedAdmin.statusAdmin?.toUpperCase() || 'AKTIF'}
                                            </span>
                                        )
                                    },
                                    { label: 'NIY',           value: selectedAdmin.niy || '-' },
                                    { label: 'NUPTK',         value: selectedAdmin.nuptk || '-' },
                                    { label: 'Jenis Kelamin', value: formatGender(selectedAdmin.jenis_kelamin || selectedAdmin.lp) },
                                    { label: 'Tempat Lahir',  value: selectedAdmin.tempat_lahir || '-' },
                                    { label: 'Tanggal Lahir', value: formatTanggalIndo(selectedAdmin.tanggal_lahir) },
                                    { label: 'Telepon',       value: selectedAdmin.no_telepon || '-' },
                                    { label: 'Alamat',        value: selectedAdmin.alamat || '-' },
                                    { label: 'Email',         value: selectedAdmin.email || '-' },
                                ].map((item, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-2 pb-2.5" style={{ borderBottom: '1px solid #fde0c8' }}>
                                        <span className="text-xs font-semibold col-span-1" style={{ color: '#7a3a0a' }}>{item.label}</span>
                                        <span className="text-xs text-gray-400">:</span>
                                        <span className="text-xs text-gray-700 col-span-2 break-words">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Footer buttons */}
                            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                                <button
                                    onClick={() => { handleEdit(selectedAdmin); closeDetail(); }}
                                    className={btnPrimary.base}
                                    style={btnPrimary.style}
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
        </div>
    );
}