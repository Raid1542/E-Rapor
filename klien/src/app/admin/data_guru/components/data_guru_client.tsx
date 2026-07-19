/**
 * Nama File: data_guru_client.tsx
 * Fungsi: Komponen klien untuk mengelola data guru (Responsive, Orange Theme, Modern UI)
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Update: Redesign UI/UX - Mobile Card View, Unified Orange Theme, Polished Modals
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Eye, Pencil, Upload, X, Plus, Search, Filter,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    ChevronLeft, GraduationCap, User, Mail, Phone, MapPin, Calendar,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import SessionExpiredModal from '@/components/SessionExpiredModal';

/* ==========================================================================
   INTERFACES
   ========================================================================== */
interface Guru {
    id: number;
    nama: string;
    email?: string;
    niy?: string;
    nuptk?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenisKelamin?: string;
    alamat?: string;
    no_telepon?: string;
    statusGuru?: string;
    profileImage?: string;
    roles?: string[];
}

interface FormDataType {
    nama: string;
    niy: string;
    nuptk: string;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: string;
    alamat: string;
    no_telepon: string;
    email: string;
    roles: string[];
    statusGuru: string;
}

/* ==========================================================================
   GLOBAL STYLES & ANIMATIONS
   ========================================================================== */
const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        
        .anim-fade-in { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .anim-scale-in { animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .anim-pulse { animation: pulse 2s infinite; }
        
        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.10s; }
        .delay-3 { animation-delay: 0.15s; }

        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(232, 105, 10, 0.15); }
    `}</style>
);

/* ==========================================================================
   MODAL COMPONENT
   ========================================================================== */
type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';
interface ModalConfig { type: ModalType; title: string; message: string; onConfirm?: () => void; }

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50', ring: 'ring-green-100', icon: <CheckCircle2 size={40} className="text-green-600" />, btn: 'bg-green-600 hover:bg-green-700' },
    error: { iconBg: 'bg-red-50', ring: 'ring-red-100', icon: <AlertCircle size={40} className="text-red-600" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-600" />, btn: 'bg-orange-600 hover:bg-orange-700' },
    network: { iconBg: 'bg-slate-50', ring: 'ring-slate-100', icon: <WifiOff size={40} className="text-slate-600" />, btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert size={40} className="text-orange-600" />, btn: 'bg-orange-600 hover:bg-orange-700' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 anim-scale-in">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} anim-pulse`}>{s.icon}</div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{modal.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line text-left mt-2">{modal.message}</p>
                </div>
                {isConfirm ? (
                    <div className="flex gap-3 w-full mt-2">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors border-orange-200 text-orange-700 bg-white hover:bg-orange-50">Batal</button>
                        <button onClick={() => { modal.onConfirm?.(); onClose(); }} className={`flex-1 ${s.btn} text-white font-semibold py-2.5 rounded-xl transition-colors text-sm`}>Lanjutkan</button>
                    </div>
                ) : (
                    <button onClick={onClose} className={`w-full ${s.btn} text-white font-semibold py-2.5 rounded-xl transition-colors mt-2`}>OK, Mengerti</button>
                )}
            </div>
        </div>
    );
};

/* ==========================================================================
   HELPERS & CONSTANTS
   ========================================================================== */
const PAGE_BG = { background: '#fafafa' };
const CARD_STYLE = { border: '1px solid #fde0c8', boxShadow: '0 4px 20px rgba(232, 105, 10, 0.08)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)' };
const TH_GRAD = { background: 'linear-gradient(135deg, #c95b08 0%, #e8690a 100%)' };

const inputCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400/50 focus:border-orange-500 bg-white border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-red-400/50 focus:border-red-500 bg-red-50/30 border-red-400 placeholder:text-gray-400";
const labelCls = "block text-sm font-semibold mb-1.5 text-orange-900";

const btnPrimary = {
    base: "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg",
    style: { background: 'linear-gradient(135deg, #e8690a, #f5a623)' } as React.CSSProperties,
};

const getInitials = (name: string): string => name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

const avatarStyle = (gender?: string | null) => {
    const g = (gender || '').trim().toLowerCase();
    const isPerempuan = g === 'perempuan' || g === 'p' || g.includes('peremp');
    return isPerempuan
        ? { background: 'linear-gradient(135deg, #fce7f3, #f9a8d4)', color: '#9d174d', border: '2px solid #fbcfe8' }
        : { background: 'linear-gradient(135deg, #ffedd5, #fdba74)', color: '#9a3412', border: '2px solid #fed7aa' };
};

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

const formatGender = (g?: string | null) => {
    if (!g) return '-';
    const s = String(g).trim().toLowerCase();
    if (s.includes('laki')) return 'Laki-laki';
    if (s.includes('peremp')) return 'Perempuan';
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */
export default function DataGuruClient() {
    const { showSessionExpired, handleLogout } = useSession();

    /* ------------------------------------------------------------------
       STATE
    ------------------------------------------------------------------ */
    const [guruList, setGuruList] = useState<Guru[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modals & Views
    const [showDetail, setShowDetail] = useState(false);
    const [showTambah, setShowTambah] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Data & Form
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [importFile, setImportFile] = useState<File | null>(null);
    
    const [filterValues, setFilterValues] = useState({ role: '', jenisKelamin: '', status: '' });
    const [tempFilterValues, setTempFilterValues] = useState({ role: '', jenisKelamin: '', status: '' });

    const [confirmAction, setConfirmAction] = useState<'add' | 'edit' | null>(null);
    const [modal, setModal] = useState<ModalConfig | null>(null);

    const [formData, setFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const showModal = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    /* ------------------------------------------------------------------
       FETCH
    ------------------------------------------------------------------ */
    const fetchGuru = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
            
            const res = await fetch('http://localhost:5000/api/admin/guru', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            
            if (res.ok) {
                const validRoles = ['guru_kelas', 'guru_bidang_studi'];
                setGuruList(Array.isArray(data.data) ? data.data.map((g: any) => {
                    let s = 'aktif';
                    if (typeof g.status === 'string') { s = g.status.trim().toLowerCase(); if (s !== 'aktif') s = 'nonaktif'; }
                    let roles: string[] = [];
                    if (g.roles) { 
                        const r = Array.isArray(g.roles) ? g.roles : [g.roles]; 
                        roles = r.map((x: any) => String(x).toLowerCase().trim()).filter((x: string) => validRoles.includes(x)); 
                    }
                    return {
                        id: g.id_user || g.id, nama: g.nama_lengkap || g.nama, email: g.email_sekolah || g.email,
                        niy: g.niy, nuptk: g.nuptk, tempat_lahir: g.tempat_lahir || '', tanggal_lahir: g.tanggal_lahir || '',
                        jenisKelamin: g.jenis_kelamin || '', alamat: g.alamat, no_telepon: g.no_telepon || '',
                        statusGuru: s, roles, profileImage: g.profileImage || null,
                    };
                }) : []);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchGuru(); }, [fetchGuru]);

    /* ------------------------------------------------------------------
       HANDLERS
    ------------------------------------------------------------------ */
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (isEdit: boolean): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nama?.trim()) ne.nama = 'Nama wajib diisi';
        if (!formData.email?.trim()) ne.email = 'Email sekolah wajib diisi';
        if (!formData.tempatLahir?.trim()) ne.tempatLahir = 'Tempat lahir wajib diisi';
        if (!formData.jenisKelamin) ne.jenisKelamin = 'Pilih jenis kelamin';
        if (!formData.roles || formData.roles.length === 0) ne.roles = 'Pilih minimal satu role';
        
        if (!formData.tanggalLahir) {
            ne.tanggalLahir = 'Tanggal lahir wajib diisi';
        } else {
            const dob = new Date(formData.tanggalLahir);
            if (isNaN(dob.getTime())) ne.tanggalLahir = 'Tanggal tidak valid';
            else if (dob > new Date()) ne.tanggalLahir = 'Tidak boleh di masa depan';
            else {
                let age = new Date().getFullYear() - dob.getFullYear();
                const m = new Date().getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && new Date().getDate() < dob.getDate())) age--;
                if (age < 18) ne.tanggalLahir = 'Usia minimal 18 tahun';
            }
        }
        if (isEdit && !formData.statusGuru) ne.statusGuru = 'Status wajib dipilih';
        
        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah.' });
            return false;
        }
        return true;
    };

    const handleEdit = (guru: Guru) => {
        setEditId(guru.id);
        setFormData({
            nama: guru.nama || '', email: guru.email || '', niy: guru.niy || '', nuptk: guru.nuptk || '',
            tempatLahir: guru.tempat_lahir || '', tanggalLahir: guru.tanggal_lahir || '',
            jenisKelamin: guru.jenisKelamin || '', alamat: guru.alamat || '', no_telepon: guru.no_telepon || '',
            roles: Array.isArray(guru.roles) ? guru.roles : [],
            statusGuru: guru.statusGuru === 'aktif' ? 'aktif' : 'nonaktif',
        });
        setShowEdit(true);
    };

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (action === 'edit') {
            const ori = guruList.find(g => g.id === editId);
            if (!ori) return;
            const hasChanged = JSON.stringify(formData) !== JSON.stringify({
                nama: ori.nama, email: ori.email, niy: ori.niy, nuptk: ori.nuptk,
                tempatLahir: ori.tempat_lahir, tanggalLahir: ori.tanggal_lahir,
                jenisKelamin: ori.jenisKelamin, alamat: ori.alamat, no_telepon: ori.no_telepon,
                roles: ori.roles, statusGuru: ori.statusGuru
            });
            if (!hasChanged) { 
                showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Data yang Anda masukkan sama dengan data sebelumnya.' }); 
                return; 
            }
        }
        if (!validate(action === 'edit')) return;
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const url = confirmAction === 'add' ? 'http://localhost:5000/api/admin/guru' : `http://localhost:5000/api/admin/guru/${editId}`;
            const method = confirmAction === 'add' ? 'POST' : 'PUT';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ 
                    nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles, 
                    niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir, 
                    tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin, 
                    alamat: formData.alamat, no_telepon: formData.no_telepon, 
                    ...(confirmAction === 'edit' && { status: formData.statusGuru })
                }),
            });
            
            const result = await res.json();
            if (res.ok) {
                setShowTambah(false); setShowEdit(false); setEditId(null);
                handleReset(); await fetchGuru();
                showModal({ type: 'success', title: 'Berhasil!', message: `Data guru ${formData.nama} berhasil ${confirmAction === 'add' ? 'ditambahkan' : 'diperbarui'}.` });
            } else {
                const isDup = result.message && (result.message.includes('sudah terdaftar') || result.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDup ? 'Data Sudah Ada' : 'Gagal', message: result.message });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const handleReset = () => {
        setFormData({ nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif' });
        setErrors({});
    };

    const handleImportExcel = async () => {
        if (!importFile) {
            showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' });
            return;
        }
        const fd = new FormData();
        fd.append('file', importFile);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/guru/import', {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
            });
            const result = await res.json();

            if (res.ok && result.success) {
                setShowImport(false); setImportFile(null); await fetchGuru();
                
                if (result.skipped && result.skipped.length > 0) {
                    const summary = [
                        `Berhasil: ${result.total} guru`,
                        `Dilewati: ${result.skipped.length} guru`,
                        '',
                        result.skipped.length <= 5 ? 'Data yang dilewati:' : `Contoh error (3 dari ${result.skipped.length}):`,
                        ...result.skipped.slice(0, result.skipped.length <= 5 ? result.skipped.length : 3).map((d: any, i: number) => `${i + 1}. Baris ${d.row}: ${d.nama} - ${d.reason}`),
                        ...(result.skipped.length > 5 ? [`\n... dan ${result.skipped.length - 3} data lainnya`] : []),
                    ];
                    showModal({ type: 'warning', title: 'Import Selesai', message: summary.join('\n') });
                    if (result.skipped.length > 5) downloadErrorReport(result.skipped);
                } else {
                    showModal({ type: 'success', title: 'Import Berhasil', message: `Berhasil mengimport ${result.total} data guru.` });
                }
            } else {
                showModal({ type: 'error', title: 'Import Gagal', message: result.message });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' });
        }
    };

    const downloadErrorReport = (skipped: any[]) => {
        const csvContent = [
            ['No', 'Baris', 'Nama', 'Alasan Error'].join(','),
            ...skipped.map((d: any, index: number) => [index + 1, d.row, `"${d.nama}"`, `"${d.reason}"`].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `error_import_guru_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /* ------------------------------------------------------------------
       FILTER & PAGINATION
    ------------------------------------------------------------------ */
    const filteredGuru = guruList.filter(guru => {
        const q = searchQuery.toLowerCase().trim();
        const ms = !q || guru.nama?.toLowerCase().includes(q) || guru.email?.toLowerCase().includes(q) || guru.niy?.includes(q) || guru.nuptk?.includes(q);
        const mr = !filterValues.role || (guru.roles && guru.roles.includes(filterValues.role));
        const mj = !filterValues.jenisKelamin || guru.jenisKelamin?.toLowerCase() === filterValues.jenisKelamin.toLowerCase();
        const ms2 = !filterValues.status || guru.statusGuru?.toLowerCase() === filterValues.status.toLowerCase();
        return ms && mr && mj && ms2;
    });

    const totalPages = Math.max(1, Math.ceil(filteredGuru.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentGuru = filteredGuru.slice(startIndex, startIndex + itemsPerPage);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        pages.push(<button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`${btnBase} border-orange-200 text-orange-700 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed`}>«</button>);
        
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
            if (p < 0) pages.push(<span key={p} className="px-1 text-gray-400 text-sm">…</span>);
            else pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? 'bg-orange-600 text-white border-orange-600' : 'border-orange-200 text-orange-700 hover:bg-orange-50'}`}>{p}</button>);
        });
        
        pages.push(<button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${btnBase} border-orange-200 text-orange-700 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed`}>»</button>);
        return pages;
    };

    /* ==========================================================================
       RENDER: FORM (TAMBAH / EDIT)
    ========================================================================== */
    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-4 md:p-8 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-4xl mx-auto anim-fade-in">
                <div className="mb-6 flex items-center gap-3">
                    <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors bg-white border border-orange-200 text-orange-700 hover:bg-orange-50">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}</h1>
                        <p className="text-sm text-orange-700 mt-0.5">{isEdit ? 'Perbarui informasi data guru' : 'Isi formulir untuk menambahkan guru baru'}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden hover-lift" style={CARD_STYLE}>
                    <div className="px-6 py-5 flex items-center gap-3" style={HEADER_GRAD}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">{isEdit ? 'Formulir Edit' : 'Formulir Tambah'}</p>
                            <h2 className="text-base font-bold text-white leading-tight">{isEdit ? 'Ubah Data Guru' : 'Data Guru Baru'}</h2>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Nama Lengkap <span className="text-red-500">*</span></label>
                                <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className={errors.nama ? inputErrCls : inputCls} />
                                {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Email Akun <span className="text-red-500">*</span></label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="contoh@sekolah.sch.id" className={errors.email ? inputErrCls : inputCls} />
                                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>NIY</label>
                                <input type="text" name="niy" value={formData.niy} onChange={handleInputChange} placeholder="Nomor Induk Yayasan" className={inputCls} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>NUPTK</label>
                                <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange} placeholder="Nomor Unik PTK" className={inputCls} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Tempat Lahir <span className="text-red-500">*</span></label>
                                <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Kota/Kabupaten" className={errors.tempatLahir ? inputErrCls : inputCls} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Tanggal Lahir <span className="text-red-500">*</span></label>
                                <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className={errors.tanggalLahir ? inputErrCls : inputCls} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>Jenis Kelamin <span className="text-red-500">*</span></label>
                                <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange} className={errors.jenisKelamin ? inputErrCls : inputCls}>
                                    <option value="">-- Pilih --</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={labelCls}>No. Telepon</label>
                                <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange} placeholder="08xxxxxxxxxx" className={inputCls} />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-1.5">
                                <label className={labelCls}>Alamat</label>
                                <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Jalan, Kelurahan, Kecamatan, Kota" rows={2} className={inputCls} />
                            </div>
                            
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls}>Role (Hak Akses) <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-2 pt-0.5">
                                        {[{ key: 'guru_kelas', label: 'Guru Kelas' }, { key: 'guru_bidang_studi', label: 'Guru Bidang Studi' }].map(role => {
                                            const active = formData.roles.includes(role.key);
                                            return (
                                                <button key={role.key} type="button"
                                                    onClick={() => { setFormData(p => ({ ...p, roles: p.roles.includes(role.key) ? p.roles.filter(r => r !== role.key) : [...p.roles, role.key] })); setErrors(p => ({ ...p, roles: '' })); }}
                                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${active ? 'text-white shadow-md' : 'bg-white text-orange-800 border-orange-200 hover:bg-orange-50'}`}
                                                    style={active ? { background: 'linear-gradient(135deg, #c95b08, #e8690a)', borderColor: 'transparent' } : {}}>
                                                    {role.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.roles && <p className="text-red-500 text-xs">{errors.roles}</p>}
                                </div>
                                {isEdit && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className={labelCls}>Status Guru <span className="text-red-500">*</span></label>
                                        <select name="statusGuru" value={formData.statusGuru} onChange={handleInputChange} className={errors.statusGuru ? inputErrCls : inputCls}>
                                            <option value="">-- Pilih --</option>
                                            <option value="aktif">Aktif</option>
                                            <option value="nonaktif">Nonaktif</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-orange-100">
                            <button onClick={() => { isEdit ? setShowEdit(false) : setShowTambah(false); handleReset(); }}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all bg-red-50 border border-red-200 text-red-700 hover:bg-red-100">
                                Batal
                            </button>
                            <button onClick={handleReset}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100">
                                Reset
                            </button>
                            <button onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}
                                className={`${btnPrimary.base} px-8`} style={btnPrimary.style}>
                                {isEdit ? 'Simpan Perubahan' : 'Simpan Data'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 anim-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 anim-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-600" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                            {confirmAction === 'add' ? 'Apakah Anda yakin ingin menambahkan data guru ini?' : 'Apakah Anda yakin ingin menyimpan perubahan data guru ini?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors border-orange-200 text-orange-700 bg-white hover:bg-orange-50">Batal</button>
                            <button onClick={() => { setShowConfirmModal(false); executeAction(); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={btnPrimary.style}>
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

    /* ==========================================================================
       RENDER: MAIN LIST VIEW
    ========================================================================== */
    return (
        <div className="flex-1 min-h-screen p-4 md:p-8" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-6 anim-fade-in">
                    <h1 className="text-2xl font-bold text-gray-900">Data Guru</h1>
                    <p className="text-sm text-orange-700 mt-0.5">Kelola data guru dan hak akses sistem</p>
                </div>

                {/* Toolbar Card */}
                <div className="bg-white rounded-2xl p-4 md:p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 anim-fade-in delay-1 hover-lift" style={CARD_STYLE}>
                    <button onClick={() => setShowTambah(true)} className={`${btnPrimary.base} w-full md:w-auto`} style={btnPrimary.style}>
                        <Plus size={16} /> Tambah Guru
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        {/* Items per page */}
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-600">Tampilkan</span>
                            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400/50 focus:border-orange-500 bg-white border-orange-200">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 sm:min-w-[220px]">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-orange-600" />
                            </div>
                            <input type="text" placeholder="Cari nama, email, NIY..." value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400/50 focus:border-orange-500 bg-white border-orange-200 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2 flex items-center text-orange-600 hover:text-orange-800">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter & Import */}
                        <div className="flex gap-2">
                            <button onClick={() => { setTempFilterValues(filterValues); setShowFilter(true); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all bg-white border-orange-200 text-orange-700 hover:bg-orange-50">
                                <Filter size={14} /> Filter
                            </button>
                            <button onClick={() => setShowImport(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                                <Upload size={14} /> Import
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Display: Desktop Table */}
                <div className="hidden md:block bg-white rounded-2xl overflow-hidden anim-fade-in delay-2 hover-lift" style={CARD_STYLE}>
                    <div className="px-6 py-3 border-b border-orange-100 bg-orange-50/50">
                        <p className="text-xs font-medium text-orange-800">
                            Menampilkan {filteredGuru.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredGuru.length)} dari {filteredGuru.length} data
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr style={TH_GRAD}>
                                    {['No.', 'Nama', 'Jenis Kelamin', 'NIY', 'NUPTK', 'Status', 'Aksi'].map(h => (
                                        <th key={h} className="px-6 py-3.5 text-center text-xs font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
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
                                ) : currentGuru.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <GraduationCap size={32} className="text-gray-300" />
                                            <p className="text-sm font-medium text-gray-500">Tidak ada data guru</p>
                                            {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                        </div>
                                    </td></tr>
                                ) : currentGuru.map((guru, index) => (
                                    <tr key={guru.id} className="transition-colors hover:bg-orange-50/60"
                                        style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}>
                                        <td className="px-6 py-4 text-center text-gray-400 text-xs font-medium">{startIndex + index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={avatarStyle(guru.jenisKelamin)}>
                                                    {getInitials(guru.nama || '?')}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{guru.nama}</p>
                                                    <p className="text-xs text-gray-400">{guru.email || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-600">{formatGender(guru.jenisKelamin)}</td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-500 font-mono">{guru.niy || '-'}</td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-500 font-mono">{guru.nuptk || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            {guru.statusGuru === 'aktif' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />AKTIF
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />NONAKTIF
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setSelectedGuru(guru); setShowDetail(true); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-green-50 border border-green-200 text-green-700 hover:bg-green-100">
                                                    <Eye size={12} /> Detail
                                                </button>
                                                <button onClick={() => handleEdit(guru)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100">
                                                    <Pencil size={12} /> Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-orange-100 bg-gray-50/50">
                        <span className="text-xs font-medium text-orange-800">Halaman {currentPage} dari {totalPages}</span>
                        <div className="flex items-center gap-1">{renderPagination()}</div>
                    </div>
                </div>

                {/* Data Display: Mobile Card View */}
                <div className="md:hidden space-y-3 anim-fade-in delay-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-7 h-7 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin mb-3" />
                            <span className="text-sm text-gray-400">Memuat data...</span>
                        </div>
                    ) : currentGuru.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center border border-orange-100">
                            <GraduationCap size={32} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-500">Tidak ada data guru</p>
                        </div>
                    ) : (
                        currentGuru.map((guru, index) => (
                            <div key={guru.id} className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm hover-lift">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={avatarStyle(guru.jenisKelamin)}>
                                        {getInitials(guru.nama || '?')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 truncate">{guru.nama}</h4>
                                        <p className="text-xs text-gray-500 truncate">{guru.email || 'Tidak ada email'}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {guru.roles?.map(r => (
                                                <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                                    {r === 'guru_kelas' ? 'Guru Kelas' : 'Guru Bid. Studi'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {guru.statusGuru === 'aktif' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />AKTIF
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />NONAKTIF
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4 bg-orange-50/50 p-3 rounded-xl">
                                    <div><span className="text-gray-400">NIY:</span> <span className="font-mono font-medium">{guru.niy || '-'}</span></div>
                                    <div><span className="text-gray-400">NUPTK:</span> <span className="font-mono font-medium">{guru.nuptk || '-'}</span></div>
                                    <div><span className="text-gray-400">No. HP:</span> <span className="font-medium">{guru.no_telepon || '-'}</span></div>
                                    <div><span className="text-gray-400">L/P:</span> <span className="font-medium">{formatGender(guru.jenisKelamin)}</span></div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedGuru(guru); setShowDetail(true); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all bg-green-50 border border-green-200 text-green-700 hover:bg-green-100">
                                        <Eye size={14} /> Detail
                                    </button>
                                    <button onClick={() => handleEdit(guru)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100">
                                        <Pencil size={14} /> Edit
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    
                    {/* Mobile Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 py-3">
                            <span className="text-xs font-medium text-orange-800">Hal. {currentPage} / {totalPages}</span>
                            <div className="flex items-center gap-1">{renderPagination()}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==========================================================================
               MODAL DETAIL
            ========================================================================== */}
            {showDetail && selectedGuru && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowDetail(false); }}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto anim-scale-in" style={CARD_STYLE}>
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl z-10" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Detail Profil Guru</h2>
                            </div>
                            <button onClick={() => setShowDetail(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors">
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-orange-100">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
                                    style={selectedGuru.profileImage ? { background: '#f3f4f6' } : avatarStyle(selectedGuru.jenisKelamin)}>
                                    {selectedGuru.profileImage ? (
                                        <img src={`http://localhost:5000${selectedGuru.profileImage.startsWith('/') ? selectedGuru.profileImage : '/' + selectedGuru.profileImage}`}
                                            alt="Foto" className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                        <span className="text-xl font-bold" style={{ color: avatarStyle(selectedGuru.jenisKelamin).color }}>
                                            {getInitials(selectedGuru.nama || '??')}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-gray-900 break-words">{selectedGuru.nama}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Mail size={12} /> {selectedGuru.email || '-'}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {selectedGuru.roles?.length ? selectedGuru.roles.map(r => (
                                            <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                                {r === 'guru_kelas' ? 'Guru Kelas' : 'Guru Bid. Studi'}
                                            </span>
                                        )) : null}
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedGuru.statusGuru === 'aktif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedGuru.statusGuru === 'aktif' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {selectedGuru.statusGuru?.toUpperCase() || 'AKTIF'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { icon: <User size={14} />, label: 'NIY', value: selectedGuru.niy || '-' },
                                    { icon: <User size={14} />, label: 'NUPTK', value: selectedGuru.nuptk || '-' },
                                    { icon: <User size={14} />, label: 'Jenis Kelamin', value: formatGender(selectedGuru.jenisKelamin) },
                                    { icon: <Phone size={14} />, label: 'No. Telepon', value: selectedGuru.no_telepon || '-' },
                                    { icon: <MapPin size={14} />, label: 'Tempat Lahir', value: selectedGuru.tempat_lahir || '-' },
                                    { icon: <Calendar size={14} />, label: 'Tanggal Lahir', value: formatTanggalIndonesia(selectedGuru.tanggal_lahir) },
                                ].map((item, i) => (
                                    <div key={i} className="rounded-xl px-4 py-3 bg-orange-50/50 border border-orange-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-orange-600">{item.icon}</span>
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">{item.label}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800 pl-6">{item.value}</p>
                                    </div>
                                ))}
                                <div className="sm:col-span-2 rounded-xl px-4 py-3 bg-orange-50/50 border border-orange-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <MapPin size={14} className="text-orange-600" />
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">Alamat Lengkap</p>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-800 pl-6">{selectedGuru.alamat || '-'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-orange-100">
                                <button onClick={() => setShowDetail(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white border border-orange-200 text-orange-700 hover:bg-orange-50">Tutup</button>
                                <button onClick={() => { handleEdit(selectedGuru); setShowDetail(false); }}
                                    className={`${btnPrimary.base} px-6`} style={btnPrimary.style}>
                                    <Pencil size={14} /> Edit Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================================
               MODAL IMPORT
            ========================================================================== */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowImport(false); }}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md anim-scale-in" style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Upload size={16} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Import Data Guru</h2>
                            </div>
                            <button onClick={() => setShowImport(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors">
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <p className="text-sm font-semibold text-blue-900 mb-1">Format file: .xlsx atau .xls</p>
                                <a href="http://localhost:5000/templates/template_import_guru.xlsx" download
                                    className="text-sm font-semibold flex items-center gap-1.5 text-blue-700 hover:text-blue-900 hover:underline">
                                    <Download size={14} /> Unduh template Excel
                                </a>
                                <p className="text-xs text-blue-600 mt-1">Isi sesuai contoh, lalu simpan sebagai .xlsx</p>
                            </div>

                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50"
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#fdba74')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#fde0c8')}
                            >
                                <Upload className="w-8 h-8 mb-2 text-orange-600" />
                                <p className="text-sm">
                                    {importFile ? <span className="font-semibold text-orange-800">{importFile.name}</span> : <span className="text-gray-500">Klik untuk pilih file</span>}
                                </p>
                                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="hidden" />
                            </label>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowImport(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white border border-orange-200 text-orange-700 hover:bg-orange-50">Batal</button>
                                <button onClick={handleImportExcel} disabled={!importFile}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${!importFile ? 'opacity-40 cursor-not-allowed' : 'shadow-md hover:shadow-lg'}`}
                                    style={btnPrimary.style}>
                                    Import Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================================================
               MODAL FILTER
            ========================================================================== */}
            {showFilter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowFilter(false); }}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm anim-scale-in" style={CARD_STYLE}>
                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Filter Guru</h2>
                            </div>
                            <button onClick={() => setShowFilter(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors">
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {[
                                { label: 'Role', name: 'role', options: [{ v: '', l: 'Semua Role' }, { v: 'guru_kelas', l: 'Guru Kelas' }, { v: 'guru_bidang_studi', l: 'Guru Bidang Studi' }] },
                                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }] },
                            ].map(f => (
                                <div key={f.name} className="flex flex-col gap-1.5">
                                    <label className={labelCls}>{f.label}</label>
                                    <select value={(tempFilterValues as any)[f.name]}
                                        onChange={e => setTempFilterValues(p => ({ ...p, [f.name]: e.target.value }))}
                                        className={inputCls}>
                                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                    </select>
                                </div>
                            ))}

                            <div className="pt-4 flex gap-3 border-t border-orange-100">
                                <button onClick={() => { setTempFilterValues({ role: '', jenisKelamin: '', status: '' }); }}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100">
                                    Reset
                                </button>
                                <button onClick={() => { setFilterValues(tempFilterValues); setShowFilter(false); }}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
                                    style={btnPrimary.style}>
                                    Terapkan Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}