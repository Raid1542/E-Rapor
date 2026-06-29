/**
 * Nama File: data_guru_client.tsx
 * Fungsi: Komponen klien untuk mengelola data guru,
 *         mencakup fitur tambah, edit, detail, import Excel, filter,
 *         pencarian, dan pagination.
 * Pembuat: Raid Aqil Athallah - NIM: 3312401022 & Frima Rizky Lianda - NIM: 3312401016
 * Tanggal: 15 September 2025
 * Update: Konsistenkan UI dengan data_admin_client — back-button navigation,
 *         avatar warna gender, button footer berwarna, tabel modern
 */

'use client';

import { useState, useEffect, useCallback, ChangeEvent, ReactNode } from 'react';
import {
    Eye, Pencil, Upload, X, Plus, Search, Filter,
    CheckCircle2, AlertCircle, WifiOff, ShieldAlert,
    ChevronLeft, GraduationCap,
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
   NOTIFICATION MODAL
   ========================================================================== */

type ModalType = 'success' | 'error' | 'warning' | 'network' | 'confirm';
interface ModalConfig { type: ModalType; title: string; message: string; onConfirm?: () => void; }

const GlobalStyles = () => (
    <style jsx global>{`
        @keyframes dg-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dg-scaleIn { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dg-pulse   { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes dg-cardIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dg-fadeIn  { animation: dg-fadeIn  0.2s ease; }
        .dg-scaleIn { animation: dg-scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        .dg-pulse   { animation: dg-pulse   0.6s ease 0.15s; }
        .dg-cardIn  { animation: dg-cardIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
    `}</style>
);

const MODAL_STYLES: Record<ModalType, { iconBg: string; ring: string; icon: React.ReactNode; btn: string }> = {
    success: { iconBg: 'bg-green-50',  ring: 'ring-green-100',  icon: <CheckCircle2 size={40} className="text-green-500" />,  btn: 'bg-green-500 hover:bg-green-600' },
    error:   { iconBg: 'bg-red-50',    ring: 'ring-red-100',    icon: <AlertCircle  size={40} className="text-red-500" />,    btn: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
    network: { iconBg: 'bg-slate-100', ring: 'ring-slate-200',  icon: <WifiOff      size={40} className="text-slate-500" />,  btn: 'bg-slate-600 hover:bg-slate-700' },
    confirm: { iconBg: 'bg-orange-50', ring: 'ring-orange-100', icon: <ShieldAlert  size={40} className="text-orange-500" />, btn: 'bg-orange-500 hover:bg-orange-600' },
};

const NotifModal = ({ modal, onClose }: { modal: ModalConfig; onClose: () => void }) => {
    const s = MODAL_STYLES[modal.type];
    const isConfirm = modal.type === 'confirm';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dg-fadeIn">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isConfirm ? undefined : onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 dg-scaleIn">
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                )}
                <div className={`w-16 h-16 rounded-full ${s.iconBg} flex items-center justify-center ring-8 ${s.ring} dg-pulse`}>{s.icon}</div>
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

const inputCls    = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400";
const inputErrCls = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-red-500 placeholder:text-gray-400";

const PAGE_BG     = { background: '#ffffff' };
const CARD_STYLE  = { border: '1px solid #f0e0d0', boxShadow: '0 4px 20px rgba(180,70,10,0.10)' };
const HEADER_GRAD = { background: 'linear-gradient(135deg,#c95b08,#e8690a,#f5870a)' };
const TH_GRAD     = { background: 'linear-gradient(135deg,#c95b08 0%,#e8690a 60%,#f5870a 100%)' };

const btnPrimary = {
    base:  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
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

/* ==========================================================================
   HELPERS
   ========================================================================== */

const formatTanggalIndonesia = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][date.getMonth()];
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
};

const getInitials = (name: string): string =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

const avatarStyle = (gender?: string | null) => {
    const g = (gender || '').trim().toLowerCase();
    const isPerempuan = g === 'perempuan' || g === 'p' || g.includes('peremp');
    return isPerempuan
        ? { background: 'linear-gradient(135deg,#fce7f3,#f9a8d4)', color: '#9d174d', border: '1.5px solid #f0abcb' }
        : { background: 'linear-gradient(135deg,#dbeafe,#93c5fd)', color: '#1e40af', border: '1.5px solid #93c5fd' };
};

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function DataGuruClient() {
    const { showSessionExpired, handleLogout } = useSession();

    const formatGender = (g?: string | null) => {
        if (!g) return '-';
        const s = String(g).trim().toLowerCase();
        if (s === 'laki-laki' || s === 'laki laki' || s === 'laki' || s === 'l' || s.includes('laki')) return 'Laki-laki';
        if (s === 'perempuan' || s === 'p' || s.includes('peremp')) return 'Perempuan';
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
    };

    /* ------------------------------------------------------------------
       STATE
    ------------------------------------------------------------------ */

    const [guruList,      setGuruList]      = useState<Guru[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showDetail,    setShowDetail]    = useState(false);
    const [showTambah,    setShowTambah]    = useState(false);
    const [showEdit,      setShowEdit]      = useState(false);
    const [editId,        setEditId]        = useState<number | null>(null);
    const [selectedGuru,  setSelectedGuru]  = useState<Guru | null>(null);
    const [searchQuery,   setSearchQuery]   = useState('');
    const [itemsPerPage,  setItemsPerPage]  = useState(10);
    const [currentPage,   setCurrentPage]   = useState(1);
    const [showImport,    setShowImport]    = useState(false);
    const [importFile,    setImportFile]    = useState<File | null>(null);
    const [detailClosing, setDetailClosing] = useState(false);
    const [importClosing, setImportClosing] = useState(false);
    const [filterClosing, setFilterClosing] = useState(false);
    const [showFilter,    setShowFilter]    = useState(false);
    const [filterValues,     setFilterValues]     = useState({ role: '', jenisKelamin: '', status: '' });
    const [tempFilterValues, setTempFilterValues] = useState({ role: '', jenisKelamin: '', status: '' });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction,    setConfirmAction]    = useState<'add' | 'edit' | null>(null);

    const [modal,    setModal]    = useState<ModalConfig | null>(null);
    const showModal  = useCallback((cfg: ModalConfig) => setModal(cfg), []);
    const closeModal = useCallback(() => setModal(null), []);

    const [formData, setFormData] = useState<FormDataType>({
        nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '',
        jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ------------------------------------------------------------------
       FETCH
    ------------------------------------------------------------------ */

    const fetchGuru = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { showModal({ type: 'warning', title: 'Sesi Tidak Valid', message: 'Silakan login terlebih dahulu.' }); return; }
            const res  = await fetch('http://localhost:5000/api/admin/guru', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) {
                const validRoles = ['guru_kelas', 'guru_bidang_studi'];
                setGuruList(Array.isArray(data.data) ? data.data.map((g: any) => {
                    let s = 'aktif';
                    if (typeof g.status === 'string') { s = g.status.trim().toLowerCase(); if (s !== 'aktif') s = 'nonaktif'; }
                    let roles: string[] = [];
                    if (g.roles) { const r = Array.isArray(g.roles) ? g.roles : [g.roles]; roles = r.map((x: any) => String(x).toLowerCase().trim()).filter((x: string) => validRoles.includes(x)); }
                    return {
                        id: g.id_user || g.id, nama: g.nama_lengkap || g.nama, email: g.email_sekolah || g.email,
                        niy: g.niy, nuptk: g.nuptk, tempat_lahir: g.tempat_lahir || '', tanggal_lahir: g.tanggal_lahir || '',
                        jenisKelamin: g.jenis_kelamin || '', alamat: g.alamat, no_telepon: g.no_telepon || '',
                        statusGuru: s, roles, profileImage: g.profileImage || null,
                    };
                }) : []);
            } else {
                showModal({ type: 'error', title: 'Gagal Memuat Data', message: data.message || 'Terjadi kesalahan saat memuat data guru.' });
            }
        } catch {
            showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' });
        } finally {
            setLoading(false);
        }
    }, [showModal]);

    useEffect(() => { fetchGuru(); }, [fetchGuru]);

    /* ------------------------------------------------------------------
       FORM HANDLERS
    ------------------------------------------------------------------ */

    const handleDetail = (guru: Guru) => { setSelectedGuru(guru); setShowDetail(true); };

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

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = (isEdit: boolean): boolean => {
        const ne: Record<string, string> = {};
        if (!formData.nama?.trim())        ne.nama        = 'Nama wajib diisi';
        if (!formData.email?.trim())       ne.email       = 'Email sekolah wajib diisi';
        if (!formData.tempatLahir?.trim()) ne.tempatLahir = 'Tempat lahir wajib diisi';
        if (!formData.jenisKelamin)        ne.jenisKelamin = 'Pilih jenis kelamin';
        if (!formData.roles || formData.roles.length === 0) ne.roles = 'Pilih minimal satu role';
        if (!formData.tanggalLahir) {
            ne.tanggalLahir = 'Tanggal lahir wajib diisi';
        } else {
            const dob = new Date(formData.tanggalLahir);
            if (isNaN(dob.getTime())) { ne.tanggalLahir = 'Tanggal lahir tidak valid'; }
            else if (dob > new Date()) { ne.tanggalLahir = 'Tanggal lahir tidak boleh di masa depan'; }
            else {
                let age = new Date().getFullYear() - dob.getFullYear();
                const m = new Date().getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && new Date().getDate() < dob.getDate())) age--;
                if (age < 18) ne.tanggalLahir = 'Usia minimal 18 tahun';
            }
        }
        if (isEdit && (!formData.statusGuru || formData.statusGuru === '')) ne.statusGuru = 'Status wajib dipilih';
        setErrors(ne);
        if (Object.keys(ne).length > 0) {
            showModal({ type: 'warning', title: 'Form Belum Lengkap', message: 'Harap perbaiki kolom yang ditandai merah sebelum melanjutkan.' });
            return false;
        }
        return true;
    };

    const openConfirmModal = (action: 'add' | 'edit') => {
        if (action === 'edit') {
            const ori = guruList.find(g => g.id === editId);
            if (!ori) return;
            const norm = (s?: string | null) => (s || '').trim().toLowerCase();
            const changed =
                formData.nama !== (ori.nama || '') || formData.email !== (ori.email || '') ||
                formData.niy  !== (ori.niy  || '') || formData.nuptk !== (ori.nuptk || '') ||
                formData.tempatLahir  !== (ori.tempat_lahir  || '') ||
                formData.tanggalLahir !== (ori.tanggal_lahir || '') ||
                norm(formData.jenisKelamin) !== norm(ori.jenisKelamin) ||
                formData.alamat     !== (ori.alamat     || '') ||
                formData.no_telepon !== (ori.no_telepon || '') ||
                formData.statusGuru !== (ori.statusGuru || 'aktif') ||
                JSON.stringify(formData.roles.sort()) !== JSON.stringify((ori.roles || []).sort());
            if (!changed) { showModal({ type: 'warning', title: 'Tidak Ada Perubahan', message: 'Tidak ada data yang diubah.' }); return; }
        }
        if (!validate(action === 'edit')) return;
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeTambah = async () => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }
        try {
            const res = await fetch('http://localhost:5000/api/admin/guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles, niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat, no_telepon: formData.no_telepon }),
            });
            if (res.ok) {
                setShowTambah(false); handleReset(); await fetchGuru();
                showModal({ type: 'success', title: 'Data Ditambahkan!', message: `Data guru ${formData.nama} berhasil ditambahkan.` });
            } else {
                const err = await res.json();
                const isDup = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDup ? 'Data Sudah Ada' : 'Gagal Menambahkan', message: err.message || 'Terjadi kesalahan saat menambahkan data guru.' });
            }
        } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
    };

    const executeEdit = async () => {
        const token = localStorage.getItem('token');
        if (!token) { showModal({ type: 'warning', title: 'Sesi Habis', message: 'Silakan login ulang.' }); return; }
        try {
            const res = await fetch(`http://localhost:5000/api/admin/guru/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nama_lengkap: formData.nama, email_sekolah: formData.email, roles: formData.roles, niy: formData.niy, nuptk: formData.nuptk, tempat_lahir: formData.tempatLahir, tanggal_lahir: formData.tanggalLahir, jenis_kelamin: formData.jenisKelamin, alamat: formData.alamat, no_telepon: formData.no_telepon, status: formData.statusGuru }),
            });
            if (res.ok) {
                setShowEdit(false); setEditId(null); handleReset(); await fetchGuru();
                showModal({ type: 'success', title: 'Data Diperbarui!', message: `Data guru ${formData.nama} berhasil diperbarui.` });
            } else {
                const err = await res.json();
                const isDup = err.message && (err.message.includes('sudah terdaftar') || err.message.includes('sudah ada'));
                showModal({ type: 'error', title: isDup ? 'Data Sudah Ada' : 'Gagal Memperbarui', message: err.message || 'Terjadi kesalahan saat memperbarui data guru.' });
            }
        } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
    };

    const handleReset = () => {
        setFormData({ nama: '', niy: '', nuptk: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '', alamat: '', no_telepon: '', email: '', roles: [], statusGuru: 'aktif' });
        setErrors({});
    };

    const handleImportExcel = async () => {
        if (!importFile) { showModal({ type: 'warning', title: 'File Belum Dipilih', message: 'Pilih file Excel terlebih dahulu.' }); return; }
        const fd = new FormData();
        fd.append('file', importFile);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/guru/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
            const result = await res.json();
            if (res.ok) {
                setShowImport(false); setImportFile(null); await fetchGuru();
                if (result.skipped && result.skipped.length > 0) {
                    showModal({ type: 'warning', title: 'Import Selesai dengan Peringatan', message: `${result.success} data berhasil diimport.\n\n${result.skipped.length} data dilewati:\n` + result.skipped.map((d: any) => `• Baris ${d.row} (${d.nama}) - ${d.reason}`).join('\n') });
                } else {
                    showModal({ type: 'success', title: 'Import Berhasil!', message: result.message || `Berhasil mengimport ${result.total} data guru.` });
                }
            } else { showModal({ type: 'error', title: 'Import Gagal', message: result.message || 'Terjadi kesalahan saat mengimpor data guru.' }); }
        } catch { showModal({ type: 'network', title: 'Koneksi Gagal', message: 'Tidak dapat terhubung ke server.' }); }
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

    const totalPages  = Math.max(1, Math.ceil(filteredGuru.length / itemsPerPage));
    const startIndex  = (currentPage - 1) * itemsPerPage;
    const endIndex    = startIndex + itemsPerPage;
    const currentGuru = filteredGuru.slice(startIndex, endIndex);

    const renderPagination = () => {
        const pages: ReactNode[] = [];
        const btnBase     = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors";
        const btnActive   = "text-white border-orange-500";
        const btnInactive = "text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 bg-white";
        pages.push(<button key="prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`${btnBase} ${btnInactive} disabled:opacity-40`}>«</button>);
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
            else { pages.push(<button key={p} onClick={() => setCurrentPage(p)} className={`${btnBase} ${currentPage === p ? btnActive : btnInactive}`} style={currentPage === p ? { background: 'linear-gradient(135deg,#e8690a,#f5a623)' } : {}}>{p}</button>); }
        });
        pages.push(<button key="next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${btnBase} ${btnInactive} disabled:opacity-40`}>»</button>);
        return pages;
    };

    const resetFilter      = () => { const e = { role: '', jenisKelamin: '', status: '' }; setFilterValues(e); setTempFilterValues(e); };
    const openFilterModal  = () => { setTempFilterValues(filterValues); setShowFilter(true); };
    const applyFilter      = () => { setFilterValues(tempFilterValues); setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };
    const closeFilterModal = () => { setFilterClosing(true); setTimeout(() => { setShowFilter(false); setFilterClosing(false); }, 200); };
    const closeDetail      = () => { setDetailClosing(true); setTimeout(() => { setShowDetail(false); setDetailClosing(false); }, 200); };
    const closeImport      = () => { setImportClosing(true); setTimeout(() => { setShowImport(false); setImportClosing(false); }, 200); };

    /* ------------------------------------------------------------------
       FORM RENDER — konsisten dengan data_admin: back-button + gradient header
    ------------------------------------------------------------------ */

    const renderForm = (isEdit: boolean) => (
        <div className="flex-1 p-6 min-h-screen" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header dengan back-button */}
            <div className="mb-6 flex items-center gap-3">
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
                        {isEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>
                        {isEdit ? 'Perbarui informasi data guru' : 'Isi formulir untuk menambahkan guru baru'}
                    </p>
                </div>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Card header gradient */}
                <div className="px-6 py-5 flex items-center gap-3" style={HEADER_GRAD}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                            {isEdit ? 'Formulir Edit' : 'Formulir Tambah'}
                        </p>
                        <h2 className="text-base font-bold text-white leading-tight">
                            {isEdit ? 'Ubah Data Guru' : 'Data Guru Baru'}
                        </h2>
                    </div>
                </div>

                {/* Form body */}
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Nama */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Nama <span className="text-red-500">*</span></label>
                            <input type="text" name="nama" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama lengkap" className={errors.nama ? inputErrCls : inputCls} />
                            {errors.nama && <p className="text-red-500 text-xs">{errors.nama}</p>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Email Akun <span className="text-red-500">*</span></label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="contoh@sekolah.sch.id" className={errors.email ? inputErrCls : inputCls} />
                            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                        </div>

                        {/* NIY */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>NIY</label>
                            <input type="text" name="niy" value={formData.niy} onChange={handleInputChange} placeholder="Nomor Induk Yayasan" className={inputCls} />
                        </div>

                        {/* NUPTK */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>NUPTK</label>
                            <input type="text" name="nuptk" value={formData.nuptk} onChange={handleInputChange} placeholder="Nomor Unik PTK" className={inputCls} />
                        </div>

                        {/* Tempat Lahir */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Tempat Lahir <span className="text-red-500">*</span></label>
                            <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} placeholder="Kota/Kabupaten" className={errors.tempatLahir ? inputErrCls : inputCls} />
                            {errors.tempatLahir && <p className="text-red-500 text-xs">{errors.tempatLahir}</p>}
                        </div>

                        {/* Tanggal Lahir */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Tanggal Lahir <span className="text-red-500">*</span></label>
                            <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} className={errors.tanggalLahir ? inputErrCls : inputCls} />
                            {errors.tanggalLahir && <p className="text-red-500 text-xs">{errors.tanggalLahir}</p>}
                        </div>

                        {/* Jenis Kelamin */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Jenis Kelamin <span className="text-red-500">*</span></label>
                            <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleInputChange} className={errors.jenisKelamin ? inputErrCls : inputCls}>
                                <option value="">-- Pilih --</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                            {errors.jenisKelamin && <p className="text-red-500 text-xs">{errors.jenisKelamin}</p>}
                        </div>

                        {/* Telepon */}
                        <div className="flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>No. Telepon</label>
                            <input type="tel" name="no_telepon" value={formData.no_telepon} onChange={handleInputChange} placeholder="08xxxxxxxxxx" className={inputCls} />
                        </div>

                        {/* Alamat */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className={labelCls} style={labelColor}>Alamat</label>
                            <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} placeholder="Jalan, Kelurahan, Kecamatan, Kota" rows={2} className={inputCls} />
                        </div>

                        {/* Role + Status dalam satu baris */}
                        <div className="md:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Role */}
                                <div className="flex flex-col gap-1.5">
                                    <label className={labelCls} style={labelColor}>Role (Hak Akses) <span className="text-red-500">*</span></label>
                                    <div className="flex flex-wrap gap-2 pt-0.5">
                                        {[{ key: 'guru_kelas', label: 'Guru Kelas' }, { key: 'guru_bidang_studi', label: 'Guru Bidang Studi' }].map(role => {
                                            const active = formData.roles.includes(role.key);
                                            return (
                                                <button key={role.key} type="button"
                                                    onClick={() => { setFormData(p => ({ ...p, roles: p.roles.includes(role.key) ? p.roles.filter(r => r !== role.key) : [...p.roles, role.key] })); setErrors(p => ({ ...p, roles: '' })); }}
                                                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border"
                                                    style={active
                                                        ? { background: 'linear-gradient(135deg,#c95b08,#e8690a)', color: '#fff', borderColor: 'transparent', boxShadow: '0 2px 8px rgba(232,105,10,0.3)' }
                                                        : { background: '#fff', color: '#7a3a0a', borderColor: '#fde0c8' }}
                                                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fff0e5'; }}
                                                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#fff'; }}
                                                >
                                                    {role.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.roles && <p className="text-red-500 text-xs">{errors.roles}</p>}
                                </div>

                                {/* Status — hanya edit */}
                                {isEdit && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className={labelCls} style={labelColor}>Status Guru <span className="text-red-500">*</span></label>
                                        <select name="statusGuru" value={formData.statusGuru} onChange={handleInputChange} className={errors.statusGuru ? inputErrCls : inputCls}>
                                            <option value="">-- Pilih --</option>
                                            <option value="aktif">Aktif</option>
                                            <option value="nonaktif">Nonaktif</option>
                                        </select>
                                        {errors.statusGuru && <p className="text-red-500 text-xs">{errors.statusGuru}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form footer — 3 button berwarna berbeda */}
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

                        {/* Reset — biru */}
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                        >
                            Reset
                        </button>

                        {/* Simpan — orange */}
                        <button
                            onClick={() => openConfirmModal(isEdit ? 'edit' : 'add')}
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

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dg-fadeIn" onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 dg-scaleIn">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={24} className="text-orange-500" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">
                                Konfirmasi {confirmAction === 'add' ? 'Penambahan' : 'Perubahan'} Data
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                            {confirmAction === 'add' ? 'Apakah Anda yakin ingin menambahkan data guru ini?' : 'Apakah Anda yakin ingin menyimpan perubahan data guru ini?'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors" style={{ borderColor: '#fde0c8', color: '#7a3a0a', background: '#fff' }}>Batal</button>
                            <button onClick={() => { setShowConfirmModal(false); confirmAction === 'add' ? executeTambah() : executeEdit(); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', boxShadow: '0 3px 10px rgba(232,105,10,0.3)' }}>
                                {confirmAction === 'add' ? 'Tambahkan' : 'Simpan'}
                            </button>
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
        <div className="flex-1 min-h-screen p-6" style={PAGE_BG}>
            <GlobalStyles />
            {modal && <NotifModal modal={modal} onClose={closeModal} />}
            {showSessionExpired && <SessionExpiredModal onConfirm={handleLogout} />}

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Data Guru</h1>
                <p className="text-sm mt-0.5" style={{ color: '#c95b08' }}>Kelola data guru dan hak akses</p>
            </div>

            {/* Toolbar card */}
            <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-wrap items-center justify-between gap-3" style={CARD_STYLE}>
                <button onClick={() => setShowTambah(true)} className={btnPrimary.base} style={btnPrimary.style} onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                    <Plus size={16} /> Tambah Guru
                </button>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Items per page */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>Tampilkan</span>
                        <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="border rounded-xl px-3 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200">
                            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                        </select>
                        <span className="text-sm font-medium" style={{ color: '#7a3a0a' }}>data</span>
                    </div>

                    {/* Search */}
                    <div className="relative min-w-[200px] sm:min-w-[220px]">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4" style={{ color: '#c95b08' }} />
                        </div>
                        <input type="text" placeholder="Cari nama, email, NIY..." value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full border rounded-xl pl-9 pr-9 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/40 border-orange-200 placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute inset-y-0 right-2 flex items-center" style={{ color: '#c95b08' }}>
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter */}
                    <button onClick={openFilterModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{ background: '#fff', border: '1.5px solid #d97706', color: '#b35a08', boxShadow: '0 1px 4px rgba(217,119,6,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                        <Filter size={14} /> Filter
                    </button>

                    {/* Import */}
                    <button onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                        style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                    >
                        <Upload size={14} /> Import
                    </button>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={CARD_STYLE}>

                {/* Info count */}
                <div className="px-5 py-2.5" style={{ borderBottom: '1px solid #fde0c8', background: '#fffaf6' }}>
                    <p className="text-xs" style={{ color: '#c95b08' }}>
                        Menampilkan {filteredGuru.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredGuru.length)} dari {filteredGuru.length} data
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
                            ) : currentGuru.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <GraduationCap size={32} className="text-gray-300" />
                                        <p className="text-sm font-medium text-gray-500">Tidak ada data guru</p>
                                        {searchQuery && <p className="text-xs text-gray-400">Coba kata kunci lain</p>}
                                    </div>
                                </td></tr>
                            ) : currentGuru.map((guru, index) => (
                                <tr key={guru.id} className="transition-colors"
                                    style={{ borderBottom: '1px solid #fde0c8', background: index % 2 === 0 ? '#fff' : '#fffaf6' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0e5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fffaf6')}
                                >
                                    <td className="px-5 py-3.5 text-center text-gray-400 text-xs font-medium">{startIndex + index + 1}</td>

                                    {/* Nama + avatar warna gender */}
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                                style={avatarStyle(guru.jenisKelamin)}>
                                                {getInitials(guru.nama || '?')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{guru.nama}</p>
                                                <p className="text-xs text-gray-400">{guru.email || '-'}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-3.5 text-center text-xs text-gray-600">{formatGender(guru.jenisKelamin)}</td>
                                    <td className="px-5 py-3.5 text-center text-xs text-gray-500 font-mono">{guru.niy   || '-'}</td>
                                    <td className="px-5 py-3.5 text-center text-xs text-gray-500 font-mono">{guru.nuptk || '-'}</td>

                                    <td className="px-5 py-3.5 text-center">
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

                                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleDetail(guru)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#eaf7ef', border: '1.5px solid #5cb87a', color: '#1a7a3a', boxShadow: '0 1px 4px rgba(26,122,58,0.15)' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#d4f0de')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#eaf7ef')}>
                                                <Eye size={12} /> Detail
                                            </button>
                                            <button onClick={() => handleEdit(guru)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#fff0e5', border: '1.5px solid #d97706', color: '#b35a08', boxShadow: '0 1px 4px rgba(217,119,6,0.18)' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#ffe4c8')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '#fff0e5')}>
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
                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #fde0c8' }}>
                    <span className="text-xs font-medium" style={{ color: '#c95b08' }}>Halaman {currentPage} dari {totalPages}</span>
                    <div className="flex items-center gap-1">{renderPagination()}</div>
                </div>
            </div>

            {/* ================================================================
                MODAL DETAIL — grid 2 kolom tile, avatar warna gender
            ================================================================ */}
            {showDetail && selectedGuru && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${detailClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto transform transition-all duration-200 ${detailClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={CARD_STYLE}>

                        {/* Header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <GraduationCap size={16} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Detail Guru</h2>
                            </div>
                            <button onClick={closeDetail} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Avatar & nama */}
                            <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid #fde0c8' }}>
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
                                    <h3 className="text-base font-bold text-gray-800 break-words">{selectedGuru.nama}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{selectedGuru.email || '-'}</p>
                                    {/* Roles badge */}
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {selectedGuru.roles?.length ? selectedGuru.roles.map(r => (
                                            <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={{ background: '#fff0e5', color: '#c95b08', border: '1px solid #fde0c8' }}>
                                                {r === 'guru_kelas' ? 'Guru Kelas' : r === 'guru_bidang_studi' ? 'Guru Bid. Studi' : r}
                                            </span>
                                        )) : null}
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                            style={selectedGuru.statusGuru === 'aktif'
                                                ? { background: '#eaf7ef', color: '#1a7a3a', border: '1px solid #b6e8c8' }
                                                : { background: '#f5f5f5', color: '#888', border: '1px solid #ddd' }}>
                                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedGuru.statusGuru === 'aktif' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {selectedGuru.statusGuru?.toUpperCase() || 'AKTIF'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info grid 2 kolom */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'NIY',           value: selectedGuru.niy   || '-' },
                                    { label: 'NUPTK',         value: selectedGuru.nuptk || '-' },
                                    { label: 'Jenis Kelamin', value: formatGender(selectedGuru.jenisKelamin) },
                                    { label: 'No. Telepon',   value: selectedGuru.no_telepon || '-' },
                                    { label: 'Tempat Lahir',  value: selectedGuru.tempat_lahir || '-' },
                                    { label: 'Tanggal Lahir', value: formatTanggalIndonesia(selectedGuru.tanggal_lahir) },
                                ].map((item, i) => (
                                    <div key={i} className="rounded-xl px-4 py-3" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>{item.label}</p>
                                        <p className="text-sm font-semibold text-gray-700">{item.value}</p>
                                    </div>
                                ))}
                                {/* Alamat full width */}
                                <div className="sm:col-span-2 rounded-xl px-4 py-3" style={{ background: '#fffaf6', border: '1px solid #fde0c8' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#c95b08' }}>Alamat</p>
                                    <p className="text-sm font-semibold text-gray-700">{selectedGuru.alamat || '-'}</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 mt-5 pt-4" style={{ borderTop: '1px solid #fde0c8' }}>
                                <BtnSecondary onClick={closeDetail}>Tutup</BtnSecondary>
                                <button onClick={() => { handleEdit(selectedGuru); closeDetail(); }}
                                    className={btnPrimary.base}
                                    style={{ ...btnPrimary.style, border: '1.5px solid #c95b08' }}
                                    onMouseEnter={btnPrimary.hover} onMouseLeave={btnPrimary.leave}>
                                    <Pencil size={14} /> Edit
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
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${importClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeImport(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200 ${importClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={CARD_STYLE}>

                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Upload size={16} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Import Data Guru</h2>
                            </div>
                            <button onClick={closeImport} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm mb-2" style={{ color: '#7a3a0a' }}>Format file: <strong>.xlsx</strong> atau <strong>.xls</strong></p>
                            <div className="mb-4">
                                <a href="http://localhost:5000/templates/template_import_guru.xlsx" download
                                    className="text-sm font-semibold flex items-center gap-1.5 hover:underline" style={{ color: '#e8690a' }}>
                                    📥 Unduh template Excel
                                </a>
                                <p className="text-xs text-gray-400 mt-1">Isi sesuai contoh, lalu simpan sebagai <strong>.xlsx</strong></p>
                            </div>

                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-colors"
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
                                <button onClick={handleImportExcel} disabled={!importFile}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${!importFile ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    style={{ background: 'linear-gradient(135deg,#e8690a,#f5a623)', border: '1.5px solid #c95b08', boxShadow: importFile ? '0 3px 10px rgba(232,105,10,0.25)' : 'none' }}>
                                    Import
                                </button>
                                <BtnSecondary onClick={closeImport}>Batal</BtnSecondary>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================
                MODAL FILTER
            ================================================================ */}
            {showFilter && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${filterClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={e => { if (e.target === e.currentTarget) closeFilterModal(); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all duration-200 ${filterClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={CARD_STYLE}>

                        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={HEADER_GRAD}>
                            <div className="flex items-center gap-2">
                                <Filter size={15} className="text-white/80" />
                                <h2 className="text-sm font-bold text-white">Filter Guru</h2>
                            </div>
                            <button onClick={closeFilterModal} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <X size={15} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {[
                                { label: 'Role', name: 'role', options: [{ v: '', l: 'Semua Role' }, { v: 'guru kelas', l: 'Guru Kelas' }, { v: 'guru bidang studi', l: 'Guru Bidang Studi' }] },
                                { label: 'Jenis Kelamin', name: 'jenisKelamin', options: [{ v: '', l: 'Semua' }, { v: 'Laki-laki', l: 'Laki-laki' }, { v: 'Perempuan', l: 'Perempuan' }] },
                                { label: 'Status', name: 'status', options: [{ v: '', l: 'Semua Status' }, { v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }] },
                            ].map(f => (
                                <div key={f.name} className="flex flex-col gap-1.5">
                                    <label className={labelCls} style={labelColor}>{f.label}</label>
                                    <select value={(tempFilterValues as any)[f.name]}
                                        onChange={e => setTempFilterValues(p => ({ ...p, [f.name]: e.target.value }))}
                                        className={inputCls}>
                                        {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                    </select>
                                </div>
                            ))}

                            <div className="pt-2 flex gap-3" style={{ borderTop: '1px solid #fde0c8' }}>
                                <button onClick={resetFilter}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                                    style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(59,130,246,0.18)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                                >
                                    Reset
                                </button>
                                <button onClick={applyFilter}
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
        </div>
    );
}